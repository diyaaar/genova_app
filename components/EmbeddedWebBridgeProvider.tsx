'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AlertTriangle, Loader2, RefreshCw, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { clearAssignmentCaches } from '@/lib/assignment-cache';
import { clearChatCaches } from '@/lib/chat-cache';
import {
  detectEmbeddedBootstrap,
  EMBEDDED_LEASE_SAFETY_SECONDS,
  readComposedAcceptanceRoutePolicy,
  type EmbeddedBootstrapDetection,
  type EmbeddedBootstrapEnvironment,
  type EmbeddedContextCandidate,
} from '@/lib/embedded-web-runtime';
import {
  APP_WEB_ORIGIN,
  BRIDGE_CHANNEL,
  BRIDGE_VERSION,
  BridgeMessageGuard,
  classifyAppUrl,
  classifyExternalUrl,
  parseBridgeMessage,
  type BridgeEnvelope,
  type BridgeMessageType,
  type BridgePayloads,
  type WebRouteFamily,
} from '@/lib/mobile-webview-bridge';
import { clearMainNotificationCaches } from '@/lib/notification-cache';
import { annotationSaveQueue } from '@/lib/repertuvar/annotation-save-runtime';
import { clearRepertoireMetadataCaches } from '@/lib/repertuvar/cache';
import { clearProtectedDriveFileCaches } from '@/lib/repertuvar/offline';
import { clearProtectedDriveFileUrlCache } from '@/lib/drive-file-url';
import {
  beginEmbeddedLeaseRenewal,
  clearEmbeddedSupabaseContext,
  enterEmbeddedSupabaseMode,
  installEmbeddedLease,
  setEmbeddedUnauthorizedHandler,
  verifyEmbeddedSupabaseContext,
} from '@/lib/supabase';

type EmbeddedPhase =
  | 'browser'
  | 'invalid'
  | 'locked'
  | 'awaiting-challenge'
  | 'awaiting-context'
  | 'verifying'
  | 'verifying-renewal'
  | 'ready'
  | 'renewing'
  | 'clearing'
  | 'error';

type WebToNativeMessageType = Exclude<BridgeMessageType,
  'bridge.challenge' | 'context.apply' | 'context.clear' | 'theme.apply' | 'command.result'>;

export interface EmbeddedIdentityContext {
  expiresAt: number;
  userId: string;
  choirId: string;
  memberId: string;
}

interface EmbeddedWebBridgeValue {
  isEmbedded: boolean;
  phase: EmbeddedPhase;
  identity: EmbeddedIdentityContext | null;
  statusMessage: string | null;
  navigateBack: () => void;
  requestNativeNavigation: (path: string) => boolean;
  requestExternalNavigation: (url: string) => boolean;
  requestSignOut: () => void;
  requestPasswordChange: () => void;
  requestTheme: (scheme: 'light' | 'dark' | 'system') => void;
  requestClipboardWrite: (text: string) => boolean;
  requestFileOpen: (input: BridgePayloads['file.open.request']) => boolean;
  failContext: (code: 'choir-context-changed' | 'member-context-failed' | 'second-unauthorized') => void;
}

const EmbeddedWebBridgeContext = createContext<EmbeddedWebBridgeValue | null>(null);

interface EmbeddedWebBridgeProviderProps {
  children: React.ReactNode;
  environment?: EmbeddedBootstrapEnvironment;
  verifyContext?: typeof verifyEmbeddedSupabaseContext;
  navigateWithinWeb?: (path: string) => void;
}

function currentEnvironment(): EmbeddedBootstrapEnvironment {
  if (typeof window === 'undefined') {
    return { href: APP_WEB_ORIGIN, isTopFrame: true, bridge: undefined };
  }
  const bridge = (window as unknown as { ReactNativeWebView?: EmbeddedBootstrapEnvironment['bridge'] }).ReactNativeWebView;
  let isTopFrame = false;
  try {
    isTopFrame = window.self === window.top;
  } catch {
    isTopFrame = false;
  }
  const routePolicy = readComposedAcceptanceRoutePolicy({
    NEXT_PUBLIC_GENOVA_033_ACCEPTANCE: process.env.NEXT_PUBLIC_GENOVA_033_ACCEPTANCE,
    NEXT_PUBLIC_GENOVA_033_APP_ORIGIN: process.env.NEXT_PUBLIC_GENOVA_033_APP_ORIGIN,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });
  return { href: window.location.href, isTopFrame, bridge, routePolicy };
}

function createMessageId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const values = new Uint8Array(18);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => value.toString(16).padStart(2, '0')).join('');
}

function eventMessageData(event: Event): string | null {
  const data = (event as MessageEvent<unknown>).data;
  return typeof data === 'string' ? data : null;
}

function isProtectedFileAnchor(anchor: HTMLAnchorElement, url: URL): boolean {
  return anchor.hasAttribute('download')
    || url.pathname.startsWith('/api/drive-file')
    || url.pathname.includes('/functions/v1/repertoire-file');
}

function commandResultMessage(ok: boolean, code: string): string | null {
  if (code === 'clipboard-written') return 'Bağlantı panoya kopyalandı.';
  if (code === 'clipboard-write-failed') return 'Pano kullanılamadı. Bağlantıyı seçip elle kopyalayabilirsiniz.';
  if (code === 'file-action-failed' || code === 'file-not-supported') return 'Dosya güvenle açılamadı. Tekrar deneyin.';
  if (code === 'file-operation-busy') return 'Önce açık dosya işlemini tamamlayın.';
  if (ok || code === 'file-action-cancelled') return null;
  return `İşlem tamamlanamadı (${code}).`;
}

function errorCopy(code: string) {
  switch (code) {
    case 'context-timeout': return 'Güvenli oturum zamanında doğrulanamadı.';
    case 'lease-expiring': return 'Oturumun süresi yenilenemedi.';
    case 'user-mismatch':
    case 'user-not-verified':
    case 'choir-mismatch': return 'Koro oturumu doğrulanamadı.';
    case 'choir-context-changed': return 'Koro oturumu değişti. Sayfayı mobil uygulamadan yeniden açın.';
    case 'member-context-failed': return 'Koro bilgileri güvenli biçimde yüklenemedi.';
    case 'too-many-invalid-messages': return 'Uygulama bağlantısı güvenlik nedeniyle kapatıldı.';
    default: return 'Uygulama bağlantısı kurulamadı.';
  }
}

export function EmbeddedWebBridgeProvider({
  children,
  environment,
  verifyContext = verifyEmbeddedSupabaseContext,
  navigateWithinWeb,
}: EmbeddedWebBridgeProviderProps) {
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();
  const [detection, setDetection] = useState<EmbeddedBootstrapDetection | null>(() => (
    environment ? detectEmbeddedBootstrap(environment) : null
  ));
  const [phase, setPhase] = useState<EmbeddedPhase>(() => {
    if (!detection) return 'locked';
    if (detection.mode === 'browser') return 'browser';
    if (detection.mode === 'invalid') return 'invalid';
    return 'locked';
  });
  const [identity, setIdentity] = useState<EmbeddedIdentityContext | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(
    detection?.mode === 'invalid' ? detection.reasonCode : null,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const guardRef = useRef<BridgeMessageGuard | null>(
    detection?.mode === 'embedded' ? new BridgeMessageGuard(detection.bootstrap) : null,
  );
  const challengeRef = useRef<string | null>(null);
  const invalidCountRef = useRef(0);
  const unauthorizedCountRef = useRef(0);
  const proofGenerationRef = useRef(0);
  const renewalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renewalTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef(phase);
  const identityRef = useRef(identity);
  const webHistoryRef = useRef<string[]>([]);
  const runtimeEnvironment = useMemo(() => environment ?? currentEnvironment(), [environment]);
  const bridge = runtimeEnvironment.bridge;
  const routePolicy = runtimeEnvironment.routePolicy;
  const sourceUrl = useCallback(
    () => environment?.href ?? (typeof window !== 'undefined' ? window.location.href : APP_WEB_ORIGIN),
    [environment?.href],
  );
  const transitionPhase = useCallback((next: EmbeddedPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);
  const updateIdentity = useCallback((next: EmbeddedIdentityContext | null) => {
    identityRef.current = next;
    setIdentity(next);
  }, []);

  useEffect(() => {
    if (detection) {
      if (detection.mode !== 'browser') enterEmbeddedSupabaseMode();
      return;
    }
    const result = detectEmbeddedBootstrap(runtimeEnvironment);
    if (result.mode !== 'browser') enterEmbeddedSupabaseMode();
    if (result.mode === 'embedded') guardRef.current = new BridgeMessageGuard(result.bootstrap);
    setDetection(result);
    if (result.mode === 'browser') transitionPhase('browser');
    else if (result.mode === 'invalid') {
      setErrorCode(result.reasonCode);
      transitionPhase('invalid');
    } else transitionPhase('locked');
  }, [detection, runtimeEnvironment, transitionPhase]);

  const send = useCallback(<Type extends WebToNativeMessageType>(
    type: Type,
    payload: BridgePayloads[Type],
  ): boolean => {
    const guard = guardRef.current;
    if (detection?.mode !== 'embedded' || !guard || typeof bridge?.postMessage !== 'function') return false;
    const envelope = {
      channel: BRIDGE_CHANNEL,
      version: BRIDGE_VERSION,
      id: createMessageId(),
      instanceId: detection.bootstrap.instanceId,
      tenantEpoch: detection.bootstrap.tenantEpoch,
      type,
      payload,
    } as BridgeEnvelope;
    const raw = JSON.stringify(envelope);
    const checked = parseBridgeMessage(raw, {
      direction: 'web-to-native',
      expectedInstanceId: detection.bootstrap.instanceId,
      expectedTenantEpoch: detection.bootstrap.tenantEpoch,
      sourceUrl: sourceUrl(),
      routePolicy,
      hasSeenMessageId: (id) => guard.hasSeenMessageId(id),
    });
    if (!checked.ok) return false;
    if (!guard.acceptMessage(envelope.id).ok) return false;
    try {
      bridge.postMessage(raw);
      return true;
    } catch {
      return false;
    }
  }, [bridge, detection, routePolicy, sourceUrl]);

  const clearTimers = useCallback(() => {
    if (renewalTimerRef.current) clearTimeout(renewalTimerRef.current);
    if (renewalTimeoutRef.current) clearTimeout(renewalTimeoutRef.current);
    renewalTimerRef.current = null;
    renewalTimeoutRef.current = null;
  }, []);

  const clearCaches = useCallback(async () => {
    clearAssignmentCaches();
    clearChatCaches();
    clearRepertoireMetadataCaches();
    clearProtectedDriveFileUrlCache();
    clearMainNotificationCaches();
    annotationSaveQueue.discardAll();
    queryClient.clear();
    if (typeof window !== 'undefined') {
      try {
        const storageKeys = Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index));
        for (const key of storageKeys) {
          if (key === 'theme' || (key && /^sb-[A-Za-z0-9]+-auth-token(?:-[A-Za-z0-9_-]+)?$/u.test(key))) {
            window.localStorage.removeItem(key);
          }
        }
      } catch {
        // Isolation continues through the non-persisting client even when Web Storage is unavailable.
      }
    }
    await clearProtectedDriveFileCaches().catch(() => undefined);
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator
      && typeof navigator.serviceWorker.getRegistrations === 'function') {
      const registrations = await navigator.serviceWorker.getRegistrations().catch(() => []);
      await Promise.all(registrations.map((registration) => registration.unregister().catch(() => false)));
    }
    if (typeof window !== 'undefined' && 'caches' in window && typeof window.caches.keys === 'function') {
      const names = await window.caches.keys().catch(() => []);
      await Promise.all(names
        .filter((name) => name.startsWith('genova-'))
        .map((name) => window.caches.delete(name).catch(() => false)));
    }
  }, [queryClient]);

  const clearContext = useCallback((nextPhase: 'locked' | 'error', code?: string) => {
    proofGenerationRef.current += 1;
    clearTimers();
    updateIdentity(null);
    transitionPhase('clearing');
    void clearEmbeddedSupabaseContext().catch(() => undefined);
    void clearCaches().catch(() => undefined);
    setErrorCode(code ?? null);
    transitionPhase(nextPhase);
  }, [clearCaches, clearTimers, transitionPhase, updateIdentity]);

  const failContext = useCallback((code: 'choir-context-changed' | 'member-context-failed' | 'second-unauthorized') => {
    send('bridge.error', { code });
    clearContext('error', code);
  }, [clearContext, send]);

  const requestRenewal = useCallback((reason: 'expiring' | 'unauthorized') => {
    if (!beginEmbeddedLeaseRenewal()) return;
    transitionPhase('renewing');
    if (!send('context.renew.request', { reason })) {
      clearContext('error', 'bridge-send-failed');
      return;
    }
    renewalTimeoutRef.current = setTimeout(() => {
      clearContext('error', 'context-timeout');
    }, 15_000);
  }, [clearContext, send, transitionPhase]);

  const scheduleRenewal = useCallback((expiresAt: number) => {
    clearTimers();
    const renewIn = Math.max(0, (expiresAt - Math.floor(Date.now() / 1000) - EMBEDDED_LEASE_SAFETY_SECONDS) * 1000);
    renewalTimerRef.current = setTimeout(() => requestRenewal('expiring'), renewIn);
  }, [clearTimers, requestRenewal]);

  const announceNavigation = useCallback(() => {
    const decision = classifyAppUrl(sourceUrl(), routePolicy);
    if (decision.kind !== 'accepted' || decision.owner !== 'web') return;
    send('navigation.state', {
      routeFamily: decision.routeFamily as WebRouteFamily,
      canGoBackWithinWeb: webHistoryRef.current.length > 1,
    });
  }, [routePolicy, send, sourceUrl]);

  const beginHandshake = useCallback(() => {
    if (detection?.mode !== 'embedded') return;
    proofGenerationRef.current += 1;
    challengeRef.current = null;
    updateIdentity(null);
    setErrorCode(null);
    setStatusMessage(null);
    transitionPhase('awaiting-challenge');
    if (!send('bridge.ready', { supportedVersions: [1], routeFamily: detection.routeFamily })) {
      clearContext('error', 'bridge-send-failed');
      return;
    }
    renewalTimeoutRef.current = setTimeout(() => clearContext('error', 'context-timeout'), 15_000);
  }, [clearContext, detection, send, transitionPhase, updateIdentity]);

  useEffect(() => {
    if (detection?.mode !== 'embedded') return;
    let active = true;
    void clearCaches().then(() => {
      if (active) beginHandshake();
    }).catch(() => {
      if (!active) return;
      setErrorCode('cache-isolation-failed');
      transitionPhase('error');
    });
    return () => {
      active = false;
      clearTimers();
    };
  }, [beginHandshake, clearCaches, clearTimers, detection?.mode, transitionPhase]);

  useEffect(() => {
    if (detection?.mode !== 'embedded') return;
    return setEmbeddedUnauthorizedHandler(() => {
      unauthorizedCountRef.current += 1;
      if (unauthorizedCountRef.current === 1) requestRenewal('unauthorized');
      else failContext('second-unauthorized');
    });
  }, [detection?.mode, failContext, requestRenewal]);

  useEffect(() => {
    if (detection?.mode !== 'embedded' || typeof window === 'undefined') return;

    const onMessage = (event: Event) => {
      const raw = eventMessageData(event);
      const guard = guardRef.current;
      if (!raw || !guard) return;
      const stamp = guard.createWorkStamp();
      const parsed = parseBridgeMessage(raw, {
        direction: 'native-to-web',
        expectedInstanceId: detection.bootstrap.instanceId,
        expectedTenantEpoch: detection.bootstrap.tenantEpoch,
        sourceUrl: sourceUrl(),
        routePolicy,
        hasSeenMessageId: (id) => guard.hasSeenMessageId(id),
      });
      if (!parsed.ok) {
        invalidCountRef.current += 1;
        if (invalidCountRef.current >= 3) clearContext('error', 'too-many-invalid-messages');
        return;
      }
      const accepted = guard.acceptMessage(parsed.value.id, stamp);
      if (!accepted.ok) return;
      invalidCountRef.current = 0;

      const message = parsed.value;
      if (message.type === 'context.clear') {
        clearContext('locked');
        return;
      }
      if (message.type === 'bridge.challenge') {
        if (phaseRef.current !== 'awaiting-challenge' || challengeRef.current) return;
        challengeRef.current = message.payload.nonce;
        clearTimers();
        if (send('bridge.challenge.ack', { nonce: message.payload.nonce })) {
          transitionPhase('awaiting-context');
          renewalTimeoutRef.current = setTimeout(() => clearContext('error', 'context-timeout'), 15_000);
        }
        return;
      }
      if (message.type === 'context.apply') {
        if (phaseRef.current !== 'awaiting-context' && phaseRef.current !== 'renewing') return;
        const isRenewal = phaseRef.current === 'renewing';
        const previousExpiry = identityRef.current?.expiresAt ?? 0;
        if (previousExpiry && message.payload.expiresAt <= previousExpiry) return;
        transitionPhase(isRenewal ? 'verifying-renewal' : 'verifying');
        clearTimers();
        const proofGeneration = ++proofGenerationRef.current;
        const candidate: EmbeddedContextCandidate = { ...message.payload };
        void verifyContext(candidate).then(async (result) => {
          if (proofGenerationRef.current !== proofGeneration || !guard.isWorkCurrent(stamp)
            || !['verifying', 'verifying-renewal'].includes(phaseRef.current)) return;
          if (!result.ok) {
            clearContext('error', result.reasonCode);
            return;
          }
          try {
            await installEmbeddedLease(result.value);
          } catch {
            clearContext('error', 'lease-install-failed');
            return;
          }
          if (proofGenerationRef.current !== proofGeneration || !guard.isWorkCurrent(stamp)) return;
          const nextIdentity = {
            expiresAt: result.value.expiresAt,
            userId: result.value.userId,
            choirId: result.value.choirId,
            memberId: result.value.memberId,
          };
          updateIdentity(nextIdentity);
          setErrorCode(null);
          transitionPhase('ready');
          scheduleRenewal(nextIdentity.expiresAt);
          announceNavigation();
        });
        return;
      }
      if (message.type === 'theme.apply') {
        if (phaseRef.current === 'ready' || phaseRef.current === 'renewing') {
          setTheme(message.payload.resolved);
          try { window.localStorage.removeItem('theme'); } catch { /* Native remains the preference owner. */ }
        }
        return;
      }
      if (message.type === 'command.result') {
        setStatusMessage(commandResultMessage(message.payload.ok, message.payload.code));
        return;
      }
      if (message.type === 'bridge.error') clearContext('error', message.payload.code);
    };

    window.addEventListener('message', onMessage);
    document.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      document.removeEventListener('message', onMessage);
    };
  }, [announceNavigation, clearContext, clearTimers, detection, scheduleRenewal, send, setTheme,
    routePolicy, sourceUrl, transitionPhase, updateIdentity, verifyContext]);

  useEffect(() => {
    if (detection?.mode !== 'embedded' || typeof window === 'undefined') return;
    const initial = classifyAppUrl(sourceUrl(), routePolicy);
    if (initial.kind === 'accepted' && initial.owner === 'web') webHistoryRef.current = [initial.canonicalPath];

    const originalPushState = window.history.pushState.bind(window.history);
    const originalReplaceState = window.history.replaceState.bind(window.history);
    const allowHistoryChange = (url?: string | URL | null) => {
      if (url === undefined || url === null) return true;
      let value: string;
      try {
        value = new URL(String(url), sourceUrl()).href;
      } catch {
        setStatusMessage('Bu uygulama bağlantısı açılamadı.');
        return false;
      }
      const decision = classifyAppUrl(value, routePolicy);
      if (decision.kind === 'accepted' && decision.owner === 'web') return true;
      if (decision.kind === 'accepted' && decision.owner === 'native') {
        if (!send('navigation.native.request', { path: decision.canonicalPath })) {
          setStatusMessage('Bu uygulama bağlantısı açılamadı.');
        }
      } else {
        setStatusMessage('Bu uygulama bağlantısı açılamadı.');
      }
      return false;
    };
    const record = (replace: boolean, url?: string | URL | null) => {
      const value = url ? new URL(String(url), sourceUrl()).href : sourceUrl();
      const decision = classifyAppUrl(value, routePolicy);
      if (decision.kind !== 'accepted' || decision.owner !== 'web') return;
      if (replace && webHistoryRef.current.length) webHistoryRef.current[webHistoryRef.current.length - 1] = decision.canonicalPath;
      else if (webHistoryRef.current.at(-1) !== decision.canonicalPath) webHistoryRef.current.push(decision.canonicalPath);
      announceNavigation();
    };
    window.history.pushState = (data, unused, url) => {
      if (!allowHistoryChange(url)) return;
      originalPushState(data, unused, url);
      record(false, url);
    };
    window.history.replaceState = (data, unused, url) => {
      if (!allowHistoryChange(url)) return;
      originalReplaceState(data, unused, url);
      record(true, url);
    };
    const onPopState = () => {
      if (webHistoryRef.current.length > 1) webHistoryRef.current.pop();
      record(true);
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', onPopState);
    };
  }, [announceNavigation, detection?.mode, routePolicy, send, sourceUrl]);

  const requestNativeNavigation = useCallback((path: string) => {
    const sent = send('navigation.native.request', { path });
    if (!sent) setStatusMessage('Bu uygulama bağlantısı açılamadı.');
    return sent;
  }, [send]);
  const requestExternalNavigation = useCallback((url: string) => {
    const decision = classifyExternalUrl(url);
    if (decision.kind === 'rejected') {
      setStatusMessage('Bu bağlantı güvenli olmadığı için açılamadı.');
      return false;
    }
    const sent = send('navigation.external.request', { url: decision.canonicalUrl });
    if (!sent) setStatusMessage('Bu bağlantı şu anda açılamadı.');
    return sent;
  }, [send]);
  const requestFileOpen = useCallback((input: BridgePayloads['file.open.request']) => {
    const sent = send('file.open.request', input);
    if (!sent) setStatusMessage('Bu dosya bağlantısı açılamadı.');
    return sent;
  }, [send]);

  useEffect(() => {
    if (detection?.mode !== 'embedded' || typeof document === 'undefined') return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a');
      if (!(anchor instanceof HTMLAnchorElement) || !anchor.href) return;
      let url: URL;
      try { url = new URL(anchor.href, window.location.href); } catch { return; }

      if (isProtectedFileAnchor(anchor, url)) {
        event.preventDefault();
        requestFileOpen({
          url: url.href,
          disposition: anchor.hasAttribute('download') ? 'download' : 'view',
          ...(anchor.download || anchor.dataset.genovaFileName
            ? { fileName: anchor.download || anchor.dataset.genovaFileName }
            : {}),
          ...(anchor.dataset.genovaMimeType ? { mimeType: anchor.dataset.genovaMimeType } : {}),
        });
        return;
      }

      if (url.origin === new URL(sourceUrl()).origin) {
        const route = classifyAppUrl(url.href, routePolicy);
        if (route.kind === 'accepted' && route.owner === 'web') {
          if (anchor.target === '_blank' || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
            event.preventDefault();
            if (navigateWithinWeb) navigateWithinWeb(route.canonicalPath);
            else window.location.assign(route.canonicalPath);
          }
          return;
        }
        event.preventDefault();
        if (route.kind === 'accepted' && route.owner === 'native') requestNativeNavigation(route.canonicalPath);
        else setStatusMessage('Bu uygulama bağlantısı açılamadı.');
        return;
      }

      event.preventDefault();
      requestExternalNavigation(url.href);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [detection?.mode, navigateWithinWeb, requestExternalNavigation, requestFileOpen, requestNativeNavigation,
    routePolicy, sourceUrl]);

  const navigateBack = useCallback(() => {
    if (detection?.mode !== 'embedded') return;
    if (webHistoryRef.current.length > 1 && typeof window !== 'undefined') window.history.back();
    else if (!send('navigation.exit.request', { reason: 'back-root' })) clearContext('error', 'bridge-send-failed');
  }, [clearContext, detection?.mode, send]);

  const requestSignOut = useCallback(() => {
    if (!send('auth.sign-out.request', {})) {
      clearContext('error', 'bridge-send-failed');
    }
  }, [clearContext, send]);

  const requestPasswordChange = useCallback(() => {
    if (!send('auth.password.open', {})) setStatusMessage('Şifre ekranı şu anda açılamadı.');
  }, [send]);

  const requestTheme = useCallback((scheme: 'light' | 'dark' | 'system') => {
    if (!send('theme.set.request', { scheme })) setStatusMessage('Tema tercihi şu anda değiştirilemedi.');
  }, [send]);

  const value = useMemo<EmbeddedWebBridgeValue>(() => ({
    isEmbedded: detection?.mode !== 'browser',
    phase,
    identity,
    statusMessage,
    navigateBack,
    requestNativeNavigation,
    requestExternalNavigation,
    requestSignOut,
    requestPasswordChange,
    requestTheme,
    requestClipboardWrite: (text) => send('clipboard.write.request', { kind: 'invitation-link', text }),
    requestFileOpen,
    failContext,
  }), [detection?.mode, failContext, identity, navigateBack, phase, requestExternalNavigation,
    requestFileOpen, requestNativeNavigation, requestPasswordChange, requestSignOut, requestTheme, send, statusMessage]);

  if (detection?.mode === 'browser') {
    return <EmbeddedWebBridgeContext.Provider value={value}>{children}</EmbeddedWebBridgeContext.Provider>;
  }

  if (phase === 'ready' || phase === 'renewing' || phase === 'verifying-renewal') {
    return (
      <EmbeddedWebBridgeContext.Provider value={value}>
        {statusMessage ? (
          <div className="pointer-events-none fixed inset-x-4 top-4 z-[1200] flex justify-center" aria-live="polite">
            <p role="status" className="glass-panel max-w-md px-4 py-3 text-center text-sm text-[var(--color-text-high)] shadow-lg">
              {statusMessage}
            </p>
          </div>
        ) : null}
        {children}
      </EmbeddedWebBridgeContext.Provider>
    );
  }

  const isError = phase === 'invalid' || phase === 'error';
  return (
    <EmbeddedWebBridgeContext.Provider value={value}>
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-background)] px-5 py-10">
        <section className="glass-panel w-full max-w-md p-6 text-center" aria-labelledby="embedded-status-title">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            {isError
              ? <AlertTriangle size={24} aria-hidden="true" />
              : <Loader2 className="motion-safe:animate-spin" size={24} aria-hidden="true" />}
          </div>
          <p className="page-kicker mb-2">GENOVA APP</p>
          <h1 id="embedded-status-title" className="font-serif text-2xl text-[var(--color-text-high)]">
            {isError ? 'Bağlantı kurulamadı' : 'Güvenli oturum hazırlanıyor'}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--color-text-medium)]" role={isError ? 'alert' : 'status'}>
            {isError ? errorCopy(errorCode ?? 'unknown') : 'Koro bilgilerin doğrulanana kadar içerik kapalı tutuluyor.'}
          </p>
          {isError ? (
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              {detection?.mode === 'embedded' && retryCount < 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    setRetryCount((current) => current + 1);
                    beginHandshake();
                  }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-black outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
                >
                  <RefreshCw size={17} aria-hidden="true" /> Yeniden dene
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  if (detection?.mode === 'embedded') send('navigation.exit.request', { reason: 'close' });
                  else if (typeof window !== 'undefined') window.history.back();
                }}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-soft-bg)] px-5 py-3 text-sm font-semibold text-[var(--color-text-high)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                <X size={17} aria-hidden="true" /> Kapat
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </EmbeddedWebBridgeContext.Provider>
  );
}

export function useEmbeddedWebBridge(): EmbeddedWebBridgeValue {
  const value = useContext(EmbeddedWebBridgeContext);
  if (!value) throw new Error('useEmbeddedWebBridge must be used within EmbeddedWebBridgeProvider');
  return value;
}
