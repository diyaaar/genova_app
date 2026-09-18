import {
  BRIDGE_CHANNEL,
  BRIDGE_VERSION,
  BridgeMessageGuard,
  classifyAppUrl,
  classifyExternalUrl,
  createBridgeDiagnostic,
  parseBridgeMessage,
  validateInitialWebViewSource,
  type AppRoutePolicy,
  type BridgeDiagnostic,
  type BridgeEnvelope,
  type BridgeMessageType,
  type BridgePayloads,
  type NativeRouteFamily,
  type WebRouteFamily,
} from '@shared/mobile-webview-bridge';
import type { NativeWebViewLease, NativeWebViewLeaseOptions } from '../auth/types';
import type { NativeThemePreference, NativeThemeState } from './theme-preference';

export type NativeBridgePhase =
  | 'locked'
  | 'awaiting-ack'
  | 'loading-lease'
  | 'awaiting-web-proof'
  | 'running'
  | 'clearing'
  | 'error'
  | 'disposed';

export interface NativeBridgeSnapshot {
  phase: NativeBridgePhase;
  errorCode: string | null;
  canGoBackWithinWeb: boolean;
  routeFamily: WebRouteFamily;
}

export interface PendingExternalRequest {
  requestId: string;
  canonicalUrl: string;
  displayHost: string;
}

export type PendingProtectedFileRequest = BridgePayloads['file.open.request'] & { requestId: string };

export interface NativeBridgeControllerDependencies {
  instanceId: string;
  tenantEpoch: number;
  initialUrl: string;
  routePolicy: AppRoutePolicy;
  createMessageId: () => string;
  createChallenge: () => string;
  getLease: (options?: NativeWebViewLeaseOptions) => Promise<NativeWebViewLease>;
  postMessage: (message: string) => void;
  getTheme: () => NativeThemeState;
  setTheme: (preference: NativeThemePreference) => Promise<NativeThemeState>;
  onSnapshot: (snapshot: NativeBridgeSnapshot) => void;
  onDiagnostic?: (diagnostic: BridgeDiagnostic) => void;
  onNativeRoute: (route: NativeRouteFamily) => Promise<void> | void;
  onExternalRequest: (request: PendingExternalRequest) => void;
  onPasswordRequest: () => boolean;
  writeClipboard: (text: string) => Promise<boolean>;
  onProtectedFileRequest: (request: PendingProtectedFileRequest) => boolean;
  onCapabilityClear: () => Promise<void> | void;
  onExit: () => Promise<void> | void;
  onSignOut: () => Promise<void> | void;
  coverContent: () => void;
  yieldAfterClear?: () => Promise<void>;
  setTimer?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
}

const HANDSHAKE_TIMEOUT_MS = 15_000;
const MAX_INVALID_MESSAGES = 3;

export class NativeWebViewBridgeController {
  private phase: NativeBridgePhase = 'locked';
  private errorCode: string | null = null;
  private canGoBackWithinWeb = false;
  private routeFamily: WebRouteFamily;
  private readonly guard: BridgeMessageGuard;
  private challenge: string | null = null;
  private invalidMessages = 0;
  private lastLeaseExpiry = 0;
  private leaseRequest: Promise<void> | null = null;
  private pendingExternalId: string | null = null;
  private pendingProtectedFileId: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly deps: NativeBridgeControllerDependencies) {
    const initial = validateInitialWebViewSource(deps.initialUrl, deps.routePolicy);
    if (initial.kind === 'rejected' || initial.owner !== 'web') throw new Error('route-not-allowed');
    this.routeFamily = initial.routeFamily as WebRouteFamily;
    this.guard = new BridgeMessageGuard({ instanceId: deps.instanceId, tenantEpoch: deps.tenantEpoch });
    this.armTimeout();
  }

  snapshot(): NativeBridgeSnapshot {
    return Object.freeze({
      phase: this.phase,
      errorCode: this.errorCode,
      canGoBackWithinWeb: this.canGoBackWithinWeb,
      routeFamily: this.routeFamily,
    });
  }

  private publish() {
    this.deps.onSnapshot(this.snapshot());
  }

  private transition(phase: NativeBridgePhase, errorCode: string | null = null) {
    this.phase = phase;
    this.errorCode = errorCode;
    this.publish();
  }

  private armTimeout() {
    this.clearTimeout();
    const schedule = this.deps.setTimer ?? setTimeout;
    this.timer = schedule(() => this.fail('handshake-timeout'), HANDSHAKE_TIMEOUT_MS);
  }

  private clearTimeout() {
    if (!this.timer) return;
    (this.deps.clearTimer ?? clearTimeout)(this.timer);
    this.timer = null;
  }

  private diagnostic(input: Parameters<typeof createBridgeDiagnostic>[0]) {
    this.deps.onDiagnostic?.(createBridgeDiagnostic(input));
  }

  private send<Type extends BridgeMessageType>(type: Type, payload: BridgePayloads[Type]) {
    const message: BridgeEnvelope = {
      channel: BRIDGE_CHANNEL,
      version: BRIDGE_VERSION,
      id: this.deps.createMessageId(),
      instanceId: this.deps.instanceId,
      tenantEpoch: this.deps.tenantEpoch,
      type,
      payload,
    } as BridgeEnvelope;
    this.deps.postMessage(JSON.stringify(message));
  }

  private reject(type: BridgeMessageType | 'unknown', reasonCode: string, routeFamily?: WebRouteFamily) {
    this.diagnostic({
      direction: 'web-to-native',
      type,
      outcome: 'rejected',
      reasonCode,
      routeFamily,
    });
  }

  private fail(code: string) {
    if (this.phase === 'disposed' || this.phase === 'clearing' || this.phase === 'error') return;
    this.clearTimeout();
    this.pendingExternalId = null;
    this.pendingProtectedFileId = null;
    void Promise.resolve(this.deps.onCapabilityClear()).catch(() => undefined);
    this.deps.coverContent();
    this.transition('error', code);
  }

  private sourceFamily(sourceUrl: string): WebRouteFamily | null {
    const decision = validateInitialWebViewSource(sourceUrl, this.deps.routePolicy);
    return decision.kind === 'accepted' && decision.owner === 'web' ? decision.routeFamily as WebRouteFamily : null;
  }

  async handleMessage(raw: string, sourceUrl: string): Promise<void> {
    if (this.phase === 'disposed' || this.phase === 'clearing' || this.phase === 'error') return;
    const parsed = parseBridgeMessage(raw, {
      direction: 'web-to-native',
      expectedInstanceId: this.deps.instanceId,
      expectedTenantEpoch: this.deps.tenantEpoch,
      sourceUrl,
      routePolicy: this.deps.routePolicy,
      hasSeenMessageId: (id) => this.guard.hasSeenMessageId(id),
    });
    if (!parsed.ok) {
      this.invalidMessages += 1;
      this.reject('unknown', parsed.reasonCode);
      if (this.invalidMessages >= MAX_INVALID_MESSAGES) this.fail('too-many-invalid-messages');
      return;
    }
    const accepted = this.guard.acceptMessage(parsed.value.id);
    if (!accepted.ok) {
      this.reject(parsed.value.type, accepted.reasonCode);
      return;
    }
    this.invalidMessages = 0;
    const message = parsed.value;
    const sourceFamily = this.sourceFamily(sourceUrl);
    this.diagnostic({
      direction: 'web-to-native', type: message.type, outcome: 'accepted', reasonCode: 'accepted',
      ...(sourceFamily ? { routeFamily: sourceFamily } : {}),
    });

    switch (message.type) {
      case 'bridge.ready':
        if (this.phase !== 'locked' || sourceFamily !== message.payload.routeFamily) {
          this.reject(message.type, 'source-not-allowed');
          return;
        }
        this.challenge = this.deps.createChallenge();
        this.transition('awaiting-ack');
        this.armTimeout();
        this.send('bridge.challenge', { nonce: this.challenge });
        return;
      case 'bridge.challenge.ack':
        if (this.phase !== 'awaiting-ack' || message.payload.nonce !== this.challenge) {
          this.reject(message.type, 'invalid-payload', sourceFamily ?? undefined);
          return;
        }
        await this.requestLease(false);
        return;
      case 'context.renew.request':
        if (this.phase !== 'running' && this.phase !== 'loading-lease') {
          this.reject(message.type, 'invalid-envelope', sourceFamily ?? undefined);
          return;
        }
        await this.requestLease(true);
        return;
      case 'navigation.state':
        if ((this.phase !== 'awaiting-web-proof' && this.phase !== 'running')
          || sourceFamily !== message.payload.routeFamily) {
          this.reject(message.type, 'source-not-allowed', sourceFamily ?? undefined);
          return;
        }
        this.clearTimeout();
        this.routeFamily = message.payload.routeFamily;
        this.canGoBackWithinWeb = message.payload.canGoBackWithinWeb;
        this.transition('running');
        this.send('theme.apply', this.deps.getTheme());
        return;
      case 'navigation.native.request':
        if (!this.requireRunning(message.type)) return;
        await this.handleNativeRoute(message.id, message.payload.path);
        return;
      case 'navigation.external.request':
        if (!this.requireRunning(message.type)) return;
        this.handleExternalRequest(message.id, message.payload.url);
        return;
      case 'navigation.exit.request':
        if (!this.requireRunning(message.type)) return;
        await this.clearAndRun('native-stop', this.deps.onExit);
        return;
      case 'auth.sign-out.request':
        if (!this.requireRunning(message.type)) return;
        await this.clearAndRun('sign-out', this.deps.onSignOut);
        return;
      case 'theme.set.request':
        if (!this.requireRunning(message.type)) return;
        try {
          const next = await this.deps.setTheme(message.payload.scheme);
          if (this.phase !== 'running') return;
          this.send('theme.apply', next);
          this.send('command.result', { requestId: message.id, ok: true, code: 'theme-applied' });
        } catch {
          this.send('command.result', { requestId: message.id, ok: false, code: 'theme-save-failed' });
        }
        return;
      case 'auth.password.open':
        if (!this.requireRunning(message.type)) return;
        {
          const opened = this.deps.onPasswordRequest();
          this.send('command.result', {
            requestId: message.id,
            ok: opened,
            code: opened ? 'password-sheet-opened' : 'password-sheet-unavailable',
          });
        }
        return;
      case 'clipboard.write.request': {
        if (!this.requireRunning(message.type)) return;
        const stamp = this.guard.createWorkStamp();
        let written = false;
        try {
          written = await this.deps.writeClipboard(message.payload.text);
        } catch {
          written = false;
        }
        if (this.phase === 'running' && this.guard.isWorkCurrent(stamp)) {
          this.send('command.result', {
            requestId: message.id,
            ok: written,
            code: written ? 'clipboard-written' : 'clipboard-write-failed',
          });
        }
        return;
      }
      case 'file.open.request':
        if (!this.requireRunning(message.type)) return;
        if (this.pendingProtectedFileId) {
          this.send('command.result', { requestId: message.id, ok: false, code: 'file-operation-busy' });
          return;
        }
        if (!this.deps.onProtectedFileRequest({ requestId: message.id, ...message.payload })) {
          this.send('command.result', { requestId: message.id, ok: false, code: 'file-not-supported' });
          return;
        }
        this.pendingProtectedFileId = message.id;
        return;
      case 'bridge.error':
        this.fail('web-bridge-error');
        return;
      default:
        this.reject(message.type, 'wrong-direction', sourceFamily ?? undefined);
    }
  }

  private requireRunning(type: BridgeMessageType): boolean {
    if (this.phase === 'running') return true;
    this.reject(type, 'invalid-envelope');
    return false;
  }

  private requestLease(isRenewal: boolean): Promise<void> {
    if (this.leaseRequest) return this.leaseRequest;
    this.transition('loading-lease');
    this.armTimeout();
    const stamp = this.guard.createWorkStamp();
    const previousExpiry = this.lastLeaseExpiry;
    const task = this.deps.getLease({ forceRefresh: isRenewal }).then((lease) => {
      if (!this.guard.isWorkCurrent(stamp) || this.phase !== 'loading-lease') return;
      if (isRenewal && lease.expiresAt <= previousExpiry) throw new Error('lease-not-newer');
      this.lastLeaseExpiry = lease.expiresAt;
      this.send('context.apply', {
        accessToken: lease.accessToken,
        expiresAt: lease.expiresAt,
        userId: lease.userId,
        choirId: lease.choirId,
        memberId: lease.memberId,
      });
      this.transition('awaiting-web-proof');
      this.armTimeout();
    }).catch(() => {
      if (this.guard.isWorkCurrent(stamp)) this.fail(isRenewal ? 'lease-renewal-failed' : 'lease-unavailable');
    }).finally(() => {
      if (this.leaseRequest === task) this.leaseRequest = null;
    });
    this.leaseRequest = task;
    return task;
  }

  private async handleNativeRoute(requestId: string, path: string) {
    const decision = classifyAppUrl(path, this.deps.routePolicy);
    if (decision.kind === 'rejected' || decision.owner !== 'native') {
      this.send('command.result', { requestId, ok: false, code: 'route-not-allowed' });
      return;
    }
    if (decision.availability === 'unavailable') {
      this.send('command.result', { requestId, ok: false, code: 'route-unavailable' });
      return;
    }
    await this.clearAndRun('native-stop', () => this.deps.onNativeRoute(decision.routeFamily as NativeRouteFamily));
  }

  private handleExternalRequest(requestId: string, url: string) {
    const decision = classifyExternalUrl(url);
    if (decision.kind === 'rejected' || this.pendingExternalId) {
      this.send('command.result', { requestId, ok: false, code: 'external-not-allowed' });
      return;
    }
    this.pendingExternalId = requestId;
    this.deps.onExternalRequest({ requestId, ...decision });
  }

  resolveExternal(requestId: string, result: 'opened' | 'cancelled' | 'failed') {
    if (requestId !== this.pendingExternalId || this.phase !== 'running') return;
    this.pendingExternalId = null;
    this.send('command.result', {
      requestId,
      ok: result === 'opened',
      code: result === 'opened' ? 'external-opened' : result === 'cancelled' ? 'external-cancelled' : 'external-open-failed',
    });
  }

  resolveProtectedFile(requestId: string, result: 'opened' | 'cancelled' | 'failed') {
    if (requestId !== this.pendingProtectedFileId || this.phase !== 'running') return;
    this.pendingProtectedFileId = null;
    this.send('command.result', {
      requestId,
      ok: result === 'opened',
      code: result === 'opened' ? 'file-action-complete' : result === 'cancelled' ? 'file-action-cancelled' : 'file-action-failed',
    });
  }

  async clearAndRun(
    reason: BridgePayloads['context.clear']['reason'],
    action: () => Promise<void> | void,
  ): Promise<void> {
    if (this.phase === 'clearing' || this.phase === 'disposed') return;
    this.clearTimeout();
    this.deps.coverContent();
    this.transition('clearing');
    this.pendingProtectedFileId = null;
    this.pendingExternalId = null;
    const capabilityCleanup = Promise.resolve(this.deps.onCapabilityClear());
    this.send('context.clear', { reason });
    await (this.deps.yieldAfterClear?.() ?? Promise.resolve());
    await capabilityCleanup;
    await action();
  }

  goBack(goBackWithinWeb: () => void): void {
    if (this.phase !== 'running') return;
    if (this.canGoBackWithinWeb) goBackWithinWeb();
    else void this.clearAndRun('native-stop', this.deps.onExit);
  }

  exit(): Promise<void> {
    return this.clearAndRun('native-stop', this.deps.onExit);
  }

  handleNavigationUrl(url: string): 'allow-web' | 'handled' | 'rejected' {
    if (this.phase === 'disposed' || this.phase === 'clearing' || this.phase === 'error') return 'rejected';
    const app = classifyAppUrl(url, this.deps.routePolicy);
    if (app.kind === 'accepted' && app.owner === 'web') return 'allow-web';
    if (app.kind === 'accepted' && app.owner === 'native') {
      if (this.phase !== 'running') {
        this.fail('route-not-allowed');
        return 'rejected';
      }
      if (app.availability === 'available') void this.clearAndRun('native-stop', () => this.deps.onNativeRoute(app.routeFamily as NativeRouteFamily));
      else this.fail('route-unavailable');
      return 'handled';
    }
    const external = classifyExternalUrl(url);
    if (external.kind === 'accepted') {
      if (this.phase !== 'running') {
        this.fail('route-not-allowed');
        return 'rejected';
      }
      if (this.pendingExternalId) return 'handled';
      const requestId = this.deps.createMessageId();
      this.pendingExternalId = requestId;
      this.deps.onExternalRequest({ requestId, ...external });
      return 'handled';
    }
    this.fail('route-not-allowed');
    return 'rejected';
  }

  processFailed(code: 'load-failed' | 'http-failed' | 'renderer-terminated' | 'capability-unavailable' | 'file-not-supported') {
    this.fail(code);
  }

  applyTheme() {
    if (this.phase === 'running') this.send('theme.apply', this.deps.getTheme());
  }

  dispose() {
    this.clearTimeout();
    if (this.phase === 'running' || this.phase === 'awaiting-web-proof' || this.phase === 'loading-lease') {
      this.send('context.clear', { reason: 'native-stop' });
    }
    this.phase = 'disposed';
    this.pendingExternalId = null;
    this.pendingProtectedFileId = null;
  }
}
