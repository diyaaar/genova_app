import {
  APP_WEB_ORIGIN,
  BRIDGE_CHANNEL,
  type BridgeDiagnostic,
  type BridgeMessageType,
  type BridgePayloads,
} from '@shared/mobile-webview-bridge';
import type { NativeWebViewLease } from '../../auth/types';
import { NativeWebViewBridgeController, type NativeBridgeSnapshot } from '../native-bridge-controller';

const INSTANCE = 'instance_1234567890abcdef';
const SOURCE = `${APP_WEB_ORIGIN}/announcements`;
const LEASE: NativeWebViewLease = {
  accessToken: 'header.payload.signature',
  expiresAt: 2_000,
  userId: '11111111-1111-4111-8111-111111111111',
  choirId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  memberId: '33333333-3333-4333-8333-333333333333',
};

let incomingIndex = 0;
function incoming<Type extends BridgeMessageType>(type: Type, payload: BridgePayloads[Type], id?: string) {
  incomingIndex += 1;
  return JSON.stringify({
    channel: BRIDGE_CHANNEL,
    version: 1,
    id: id ?? `incoming_${String(incomingIndex).padStart(16, '0')}`,
    instanceId: INSTANCE,
    tenantEpoch: 7,
    type,
    payload,
  });
}

function sent(messages: string[]) {
  return messages.map((message) => JSON.parse(message) as {
    type: BridgeMessageType;
    payload: Record<string, unknown>;
  });
}

function setup(overrides: Partial<ConstructorParameters<typeof NativeWebViewBridgeController>[0]> = {}) {
  const messages: string[] = [];
  const snapshots: NativeBridgeSnapshot[] = [];
  const diagnostics: BridgeDiagnostic[] = [];
  const nativeRoutes = jest.fn();
  const external = jest.fn();
  const exit = jest.fn();
  const signOut = jest.fn();
  const password = jest.fn(() => true);
  const clipboard = jest.fn(async () => true);
  const protectedFile = jest.fn((_request: import('../native-bridge-controller').PendingProtectedFileRequest) => true);
  const cover = jest.fn();
  const timers: Array<() => void> = [];
  let messageIndex = 0;
  const controller = new NativeWebViewBridgeController({
    instanceId: INSTANCE,
    tenantEpoch: 7,
    initialUrl: SOURCE,
    routePolicy: { appOrigin: APP_WEB_ORIGIN },
    createMessageId: () => `outgoing_${String(++messageIndex).padStart(16, '0')}`,
    createChallenge: () => 'challenge_1234567890abcdef',
    getLease: jest.fn(async () => LEASE),
    postMessage: (message) => messages.push(message),
    getTheme: () => ({ preference: 'system', resolved: 'dark' }),
    setTheme: jest.fn(async (preference) => ({
      preference,
      resolved: preference === 'light' ? 'light' as const : 'dark' as const,
    })),
    onSnapshot: (snapshot) => snapshots.push(snapshot),
    onDiagnostic: (diagnostic) => diagnostics.push(diagnostic),
    onNativeRoute: nativeRoutes,
    onExternalRequest: external,
    onPasswordRequest: password,
    writeClipboard: clipboard,
    onProtectedFileRequest: protectedFile,
    onCapabilityClear: jest.fn(async () => {}),
    onExit: exit,
    onSignOut: signOut,
    coverContent: cover,
    yieldAfterClear: async () => {},
    setTimer: (callback) => {
      timers.push(callback);
      return timers.length as unknown as ReturnType<typeof setTimeout>;
    },
    clearTimer: () => {},
    ...overrides,
  });
  return {
    controller, messages, snapshots, diagnostics, nativeRoutes, external, exit, signOut, cover, timers,
    password, clipboard, protectedFile,
  };
}

async function makeRunning(runtime: ReturnType<typeof setup>) {
  await runtime.controller.handleMessage(incoming('bridge.ready', {
    supportedVersions: [1], routeFamily: 'announcements',
  }), SOURCE);
  await runtime.controller.handleMessage(incoming('bridge.challenge.ack', {
    nonce: 'challenge_1234567890abcdef',
  }), SOURCE);
  await runtime.controller.handleMessage(incoming('navigation.state', {
    routeFamily: 'announcements', canGoBackWithinWeb: false,
  }), SOURCE);
  expect(runtime.controller.snapshot().phase).toBe('running');
}

beforeEach(() => {
  incomingIndex = 0;
});

describe('native permanent-WebView bridge controller', () => {
  it('orders ready, challenge acknowledgement, exact lease and web proof', async () => {
    const runtime = setup({
      getLease: jest.fn(async () => ({ ...LEASE, refreshToken: 'must-not-cross' }) as NativeWebViewLease),
    });

    await runtime.controller.handleMessage(incoming('bridge.ready', {
      supportedVersions: [1], routeFamily: 'announcements',
    }), SOURCE);
    expect(sent(runtime.messages)).toEqual([
      expect.objectContaining({ type: 'bridge.challenge', payload: { nonce: 'challenge_1234567890abcdef' } }),
    ]);
    expect(runtime.controller.snapshot().phase).toBe('awaiting-ack');

    await runtime.controller.handleMessage(incoming('bridge.challenge.ack', { nonce: 'wrong_challenge_1234567890' }), SOURCE);
    expect(sent(runtime.messages).filter((message) => message.type === 'context.apply')).toHaveLength(0);

    await runtime.controller.handleMessage(incoming('bridge.challenge.ack', {
      nonce: 'challenge_1234567890abcdef',
    }), SOURCE);
    const context = sent(runtime.messages).find((message) => message.type === 'context.apply');
    expect(context?.payload).toEqual(LEASE);
    expect(JSON.stringify(context)).not.toContain('must-not-cross');
    expect(runtime.controller.snapshot().phase).toBe('awaiting-web-proof');

    await runtime.controller.handleMessage(incoming('navigation.state', {
      routeFamily: 'announcements', canGoBackWithinWeb: true,
    }), SOURCE);
    expect(runtime.controller.snapshot()).toMatchObject({ phase: 'running', canGoBackWithinWeb: true });
    expect(sent(runtime.messages).at(-1)).toMatchObject({ type: 'theme.apply', payload: { preference: 'system', resolved: 'dark' } });
  });

  it('rejects wrong source/family, replay and repeated malformed input with redacted diagnostics', async () => {
    const runtime = setup();
    const ready = incoming('bridge.ready', { supportedVersions: [1], routeFamily: 'profile' }, 'repeat_1234567890abcdef');
    await runtime.controller.handleMessage(ready, SOURCE);
    expect(runtime.messages).toHaveLength(0);
    await runtime.controller.handleMessage(ready, SOURCE);
    await runtime.controller.handleMessage('not-json token=secret user=raw', SOURCE);
    await runtime.controller.handleMessage('{}', SOURCE);
    expect(runtime.controller.snapshot()).toMatchObject({ phase: 'error', errorCode: 'too-many-invalid-messages' });
    expect(JSON.stringify(runtime.diagnostics)).not.toContain('secret');
    expect(runtime.diagnostics.every((item) => Object.keys(item).every((key) => (
      ['direction', 'type', 'outcome', 'reasonCode', 'routeFamily'].includes(key)
    )))).toBe(true);
  });

  it('coalesces renewal and refuses a lease that is not newer', async () => {
    let release!: (lease: NativeWebViewLease) => void;
    const pending = new Promise<NativeWebViewLease>((resolve) => { release = resolve; });
    const getLease = jest.fn()
      .mockResolvedValueOnce(LEASE)
      .mockImplementationOnce(() => pending);
    const runtime = setup({ getLease });
    await makeRunning(runtime);

    const first = runtime.controller.handleMessage(incoming('context.renew.request', { reason: 'expiring' }), SOURCE);
    const second = runtime.controller.handleMessage(incoming('context.renew.request', { reason: 'unauthorized' }), SOURCE);
    expect(getLease).toHaveBeenCalledTimes(2);
    release({ ...LEASE, expiresAt: LEASE.expiresAt });
    await Promise.all([first, second]);
    expect(runtime.controller.snapshot()).toMatchObject({ phase: 'error', errorCode: 'lease-renewal-failed' });
  });

  it('routes only current native destinations and clears before exit', async () => {
    const order: string[] = [];
    const runtime = setup({
      postMessage: (message) => order.push(`message:${JSON.parse(message).type as string}`),
      coverContent: () => order.push('cover'),
      onNativeRoute: (route) => { order.push(`route:${route}`); },
      yieldAfterClear: async () => { order.push('yield'); },
    });
    await makeRunning(runtime);
    order.length = 0;

    await runtime.controller.handleMessage(incoming('navigation.native.request', { path: '/chat' }), SOURCE);
    expect(order).toEqual(['message:command.result']);
    await runtime.controller.handleMessage(incoming('navigation.native.request', { path: '/repertuvar' }), SOURCE);
    expect(order).toEqual(['message:command.result', 'cover', 'message:context.clear', 'yield', 'route:repertoire']);
  });

  it('requires external confirmation and never echoes the full destination in diagnostics', async () => {
    const open = jest.fn();
    const runtime = setup({ onExternalRequest: open });
    await makeRunning(runtime);
    await runtime.controller.handleMessage(incoming('navigation.external.request', {
      url: 'https://example.test/private?token=sensitive',
    }), SOURCE);

    expect(open).toHaveBeenCalledWith(expect.objectContaining({ displayHost: 'example.test' }));
    expect(JSON.stringify(runtime.diagnostics)).not.toContain('sensitive');
    const request = open.mock.calls[0][0] as { requestId: string };
    runtime.controller.resolveExternal(request.requestId, 'cancelled');
    expect(sent(runtime.messages).at(-1)).toMatchObject({
      type: 'command.result', payload: { requestId: request.requestId, ok: false, code: 'external-cancelled' },
    });
  });

  it('does not route native or external targets before the web proof is running', () => {
    const runtime = setup();
    expect(runtime.controller.handleNavigationUrl(`${APP_WEB_ORIGIN}/repertuvar`)).toBe('rejected');
    expect(runtime.nativeRoutes).not.toHaveBeenCalled();
    expect(runtime.controller.snapshot()).toMatchObject({ phase: 'error', errorCode: 'route-not-allowed' });

    const external = setup();
    expect(external.controller.handleNavigationUrl('https://example.test')).toBe('rejected');
    expect(external.external).not.toHaveBeenCalled();
  });

  it('executes bounded 032 capabilities and applies a persisted theme only while running', async () => {
    const setTheme = jest.fn(async () => ({ preference: 'light' as const, resolved: 'light' as const }));
    const runtime = setup({ setTheme });
    await makeRunning(runtime);
    await runtime.controller.handleMessage(incoming('auth.password.open', {}), SOURCE);
    expect(runtime.password).toHaveBeenCalledTimes(1);
    expect(sent(runtime.messages).at(-1)).toMatchObject({
      type: 'command.result', payload: { ok: true, code: 'password-sheet-opened' },
    });

    const invitation = `${APP_WEB_ORIGIN}/invite#invite=${'a'.repeat(64)}`;
    await runtime.controller.handleMessage(incoming('clipboard.write.request', {
      kind: 'invitation-link', text: invitation,
    }), SOURCE);
    expect(runtime.clipboard).toHaveBeenCalledWith(invitation);
    expect(sent(runtime.messages).at(-1)).toMatchObject({
      type: 'command.result', payload: { ok: true, code: 'clipboard-written' },
    });

    const fileRequest = { url: `${APP_WEB_ORIGIN}/api/drive-file/file_1?token=secret`, disposition: 'view' as const };
    await runtime.controller.handleMessage(incoming('file.open.request', fileRequest), SOURCE);
    const pending = runtime.protectedFile.mock.calls[0]?.[0];
    if (!pending) throw new Error('expected protected file request');
    expect(pending).toMatchObject(fileRequest);
    runtime.controller.resolveProtectedFile(pending.requestId, 'cancelled');
    expect(sent(runtime.messages).at(-1)).toMatchObject({
      type: 'command.result', payload: { ok: false, code: 'file-action-cancelled' },
    });
    await runtime.controller.handleMessage(incoming('theme.set.request', { scheme: 'light' }), SOURCE);
    expect(setTheme).toHaveBeenCalledWith('light');
    expect(sent(runtime.messages).slice(-2)).toEqual([
      expect.objectContaining({ type: 'theme.apply', payload: { preference: 'light', resolved: 'light' } }),
      expect.objectContaining({ type: 'command.result', payload: expect.objectContaining({ ok: true, code: 'theme-applied' }) }),
    ]);
  });

  it('returns stable capability failures and drops late clipboard/file work after clear', async () => {
    let releaseClipboard!: (value: boolean) => void;
    const clipboardPending = new Promise<boolean>((resolve) => { releaseClipboard = resolve; });
    const runtime = setup({
      onPasswordRequest: () => false,
      writeClipboard: () => clipboardPending,
      onProtectedFileRequest: () => false,
    });
    await makeRunning(runtime);

    await runtime.controller.handleMessage(incoming('auth.password.open', {}), SOURCE);
    expect(sent(runtime.messages).at(-1)).toMatchObject({
      type: 'command.result', payload: { ok: false, code: 'password-sheet-unavailable' },
    });
    await runtime.controller.handleMessage(incoming('file.open.request', {
      url: `${APP_WEB_ORIGIN}/api/drive-file/file_1?token=secret`, disposition: 'view',
    }), SOURCE);
    expect(sent(runtime.messages).at(-1)).toMatchObject({
      type: 'command.result', payload: { ok: false, code: 'file-not-supported' },
    });

    const clipboard = runtime.controller.handleMessage(incoming('clipboard.write.request', {
      kind: 'invitation-link', text: `${APP_WEB_ORIGIN}/invite#invite=${'b'.repeat(64)}`,
    }), SOURCE);
    await runtime.controller.clearAndRun('native-stop', () => {});
    const countAfterClear = runtime.messages.length;
    releaseClipboard(true);
    await clipboard;
    expect(runtime.messages).toHaveLength(countAfterClear);
  });

  it('uses only current web history for back and ends visibly on timeout/process failure', async () => {
    const clearCapabilities = jest.fn(async () => {});
    const runtime = setup({ onCapabilityClear: clearCapabilities });
    await makeRunning(runtime);
    const goBack = jest.fn();
    await runtime.controller.handleMessage(incoming('navigation.state', {
      routeFamily: 'announcements', canGoBackWithinWeb: true,
    }), SOURCE);
    runtime.controller.goBack(goBack);
    expect(goBack).toHaveBeenCalledTimes(1);

    runtime.controller.processFailed('renderer-terminated');
    expect(runtime.cover).toHaveBeenCalled();
    expect(runtime.controller.snapshot()).toMatchObject({ phase: 'error', errorCode: 'renderer-terminated' });
    expect(clearCapabilities).toHaveBeenCalledTimes(1);

    const timeoutClear = jest.fn(async () => {});
    const timed = setup({ onCapabilityClear: timeoutClear });
    timed.timers[0]?.();
    expect(timed.controller.snapshot()).toMatchObject({ phase: 'error', errorCode: 'handshake-timeout' });
    expect(timeoutClear).toHaveBeenCalledTimes(1);
  });
});
