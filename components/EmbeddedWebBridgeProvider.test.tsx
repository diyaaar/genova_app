import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BRIDGE_CHANNEL, BRIDGE_VERSION } from '@/lib/mobile-webview-bridge';
import type { EmbeddedBootstrapEnvironment } from '@/lib/embedded-web-runtime';

const mocks = vi.hoisted(() => ({
  enter: vi.fn(),
  install: vi.fn().mockResolvedValue(undefined),
  beginRenewal: vi.fn().mockReturnValue(true),
  clear: vi.fn().mockResolvedValue(undefined),
  unauthorizedHandler: null as null | (() => void),
  setTheme: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  enterEmbeddedSupabaseMode: mocks.enter,
  installEmbeddedLease: mocks.install,
  beginEmbeddedLeaseRenewal: mocks.beginRenewal,
  clearEmbeddedSupabaseContext: mocks.clear,
  setEmbeddedUnauthorizedHandler: vi.fn((handler: () => void) => {
    mocks.unauthorizedHandler = handler;
    return () => { mocks.unauthorizedHandler = null; };
  }),
  verifyEmbeddedSupabaseContext: vi.fn(),
}));
vi.mock('next-themes', () => ({ useTheme: () => ({ setTheme: mocks.setTheme }) }));
vi.mock('@/lib/assignment-cache', () => ({ clearAssignmentCaches: vi.fn() }));
vi.mock('@/lib/chat-cache', () => ({ clearChatCaches: vi.fn() }));
vi.mock('@/lib/notification-cache', () => ({ clearMainNotificationCaches: vi.fn() }));
vi.mock('@/lib/repertuvar/cache', () => ({ clearRepertoireMetadataCaches: vi.fn() }));
vi.mock('@/lib/repertuvar/offline', () => ({ clearProtectedDriveFileCaches: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/drive-file-url', () => ({ clearProtectedDriveFileUrlCache: vi.fn() }));
vi.mock('@/lib/repertuvar/annotation-save-runtime', () => ({ annotationSaveQueue: { discardAll: vi.fn() } }));

import { EmbeddedWebBridgeProvider, useEmbeddedWebBridge } from './EmbeddedWebBridgeProvider';
import { useChatStore } from '@/store/useChatStore';

const INSTANCE_ID = 'instance_1234567890';
const NONCE = 'nonce_1234567890123456';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const CHOIR_ID = '22222222-2222-4222-8222-222222222222';
const MEMBER_ID = '33333333-3333-4333-8333-333333333333';
const ACCESS_TOKEN = 'header.payload.signature';

function embeddedEnvironment(postMessage = vi.fn()): EmbeddedBootstrapEnvironment {
  return {
    href: 'https://app.genesinovachoir.com/profil',
    isTopFrame: true,
    bridge: {
      injectedObjectJson: () => JSON.stringify({
        channel: BRIDGE_CHANNEL,
        instanceId: INSTANCE_ID,
        tenantEpoch: 4,
      }),
      postMessage,
    },
  };
}

function incoming(type: string, payload: unknown, id = `message_${Math.random().toString(36).slice(2).padEnd(16, 'x')}`) {
  return JSON.stringify({
    channel: BRIDGE_CHANNEL,
    version: BRIDGE_VERSION,
    id,
    instanceId: INSTANCE_ID,
    tenantEpoch: 4,
    type,
    payload,
  });
}

function dispatchNative(raw: string) {
  window.dispatchEvent(new MessageEvent('message', { data: raw }));
}

function seedStaleChatState() {
  useChatStore.setState({
    activeRoomId: 'prior-room',
    rooms: [{
      id: 'prior-room',
      name: 'Prior choir room',
      slug: 'prior-choir-room',
      description: null,
      type: 'custom',
      created_by: null,
      avatar_url: null,
      is_archived: false,
      created_at: '2026-09-19T00:00:00.000Z',
      updated_at: '2026-09-19T00:00:00.000Z',
    }],
    messagesByRoom: { 'prior-room': [] },
  });
}

function Actions() {
  const bridge = useEmbeddedWebBridge();
  return (
    <div>
      <span data-testid="phase">{bridge.phase}</span>
      <button onClick={() => bridge.navigateBack()}>back</button>
      <button onClick={() => bridge.requestSignOut()}>signout</button>
      <button onClick={() => bridge.requestPasswordChange()}>password</button>
      <button onClick={() => bridge.requestTheme('system')}>theme</button>
      <button onClick={() => bridge.requestClipboardWrite(`https://app.genesinovachoir.com/invite#invite=${'a'.repeat(64)}`)}>copy</button>
    </div>
  );
}

function mount(options: {
  environment: EmbeddedBootstrapEnvironment;
  verifyContext?: (candidate: any) => Promise<any>;
  children?: React.ReactNode;
  navigateWithinWeb?: (path: string) => void;
}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <EmbeddedWebBridgeProvider
        environment={options.environment}
        verifyContext={options.verifyContext as any}
        navigateWithinWeb={options.navigateWithinWeb}
      >
        {options.children ?? <><p>tenant child</p><Actions /></>}
      </EmbeddedWebBridgeProvider>
    </QueryClientProvider>,
  );
}

async function hydrate(postMessage: ReturnType<typeof vi.fn>, verifyContext = vi.fn(async (value) => ({ ok: true, value }))) {
  await waitFor(() => expect(postMessage).toHaveBeenCalled());
  expect(JSON.parse(postMessage.mock.calls[0][0]).type).toBe('bridge.ready');
  act(() => dispatchNative(incoming('bridge.challenge', { nonce: NONCE }, 'challenge_1234567890')));
  await waitFor(() => expect(postMessage.mock.calls.some(([raw]) => JSON.parse(raw).type === 'bridge.challenge.ack')).toBe(true));
  const context = {
    accessToken: ACCESS_TOKEN,
    expiresAt: Math.floor(Date.now() / 1000) + 600,
    userId: USER_ID,
    choirId: CHOIR_ID,
    memberId: MEMBER_ID,
  };
  act(() => dispatchNative(incoming('context.apply', context, 'context_123456789012')));
  await screen.findByText('tenant child');
  return { context, verifyContext };
}

describe('EmbeddedWebBridgeProvider', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    useChatStore.getState().reset();
    mocks.beginRenewal.mockReturnValue(true);
    mocks.install.mockResolvedValue(undefined);
    mocks.clear.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
    delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
    delete (window as unknown as { caches?: unknown }).caches;
  });

  it('leaves a regular browser untouched and does not enter embedded Supabase mode', () => {
    mount({
      environment: { href: 'https://app.genesinovachoir.com/profil', isTopFrame: true },
    });

    expect(screen.getByText('tenant child')).toBeInTheDocument();
    expect(mocks.enter).not.toHaveBeenCalled();
  });

  it('locks content, completes the challenge and renders only after proof/install', async () => {
    const postMessage = vi.fn();
    const verifyContext = vi.fn(async (value) => ({ ok: true, value }));
    mount({ environment: embeddedEnvironment(postMessage), verifyContext });

    expect(screen.getByRole('status')).toHaveTextContent('Koro bilgilerin doğrulanana kadar içerik kapalı tutuluyor.');
    expect(screen.queryByText('tenant child')).not.toBeInTheDocument();
    const { context } = await hydrate(postMessage, verifyContext);

    expect(verifyContext).toHaveBeenCalledWith(context);
    expect(mocks.install).toHaveBeenCalledWith(context);
    const outbound = postMessage.mock.calls.map(([raw]) => JSON.parse(raw));
    expect(outbound.map((message) => message.type)).toEqual(expect.arrayContaining(['bridge.ready', 'bridge.challenge.ack', 'navigation.state']));
    expect(new Set(outbound.map((message) => message.id)).size).toBe(outbound.length);
    expect(JSON.stringify(outbound)).not.toContain(ACCESS_TOKEN);
  });

  it('uses an explicitly supplied development origin for every handshake validation step', async () => {
    const postMessage = vi.fn();
    const environment = embeddedEnvironment(postMessage);
    environment.href = 'http://127.0.0.1:3000/profil';
    environment.routePolicy = { appOrigin: 'http://127.0.0.1:3000' };
    mount({ environment, verifyContext: vi.fn(async (value) => ({ ok: true, value })) });

    await hydrate(postMessage);

    expect(screen.getByText('tenant child')).toBeInTheDocument();
  });

  it('removes embedded service workers and Genova caches before announcing bridge readiness', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }]);
    const cacheDelete = vi.fn().mockResolvedValue(true);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations },
    });
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: { keys: vi.fn().mockResolvedValue(['genova-old', 'unrelated']), delete: cacheDelete },
    });
    window.localStorage.setItem('sb-test-auth-token', 'stale-session');
    window.localStorage.setItem('sb-test-auth-token-code-verifier', 'stale-verifier');
    window.localStorage.setItem('theme', 'light');
    const postMessage = vi.fn();

    mount({ environment: embeddedEnvironment(postMessage), verifyContext: vi.fn() });

    await waitFor(() => expect(postMessage).toHaveBeenCalled());
    expect(getRegistrations).toHaveBeenCalledOnce();
    expect(unregister).toHaveBeenCalledOnce();
    expect(cacheDelete).toHaveBeenCalledWith('genova-old');
    expect(cacheDelete).not.toHaveBeenCalledWith('unrelated');
    expect(window.localStorage.getItem('sb-test-auth-token')).toBeNull();
    expect(window.localStorage.getItem('sb-test-auth-token-code-verifier')).toBeNull();
    expect(window.localStorage.getItem('theme')).toBeNull();
    delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
    delete (window as unknown as { caches?: unknown }).caches;
  });

  it('blanks synchronously on context.clear and never falls back to tenant children', async () => {
    const postMessage = vi.fn();
    mount({ environment: embeddedEnvironment(postMessage), verifyContext: vi.fn(async (value) => ({ ok: true, value })) });
    await hydrate(postMessage);
    seedStaleChatState();

    act(() => dispatchNative(incoming('context.clear', { reason: 'choir-switch' }, 'clear_123456789012345')));

    expect(screen.queryByText('tenant child')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('içerik kapalı');
    expect(useChatStore.getState().rooms).toEqual([]);
    expect(useChatStore.getState().activeRoomId).toBeNull();
    expect(useChatStore.getState().messagesByRoom).toEqual({});
    expect(mocks.clear).toHaveBeenCalled();
  });

  it('fails closed with redacted accessible recovery after a proof mismatch', async () => {
    const postMessage = vi.fn();
    const verifyContext = vi.fn().mockResolvedValue({ ok: false, reasonCode: 'choir-mismatch' });
    mount({ environment: embeddedEnvironment(postMessage), verifyContext });
    await waitFor(() => expect(postMessage).toHaveBeenCalled());
    act(() => dispatchNative(incoming('bridge.challenge', { nonce: NONCE }, 'challenge_mismatch1')));
    act(() => dispatchNative(incoming('context.apply', {
      accessToken: ACCESS_TOKEN,
      expiresAt: Math.floor(Date.now() / 1000) + 600,
      userId: USER_ID,
      choirId: CHOIR_ID,
      memberId: MEMBER_ID,
    }, 'context_mismatch12')));

    expect(await screen.findByRole('alert')).toHaveTextContent('Koro oturumu doğrulanamadı.');
    expect(screen.getByRole('button', { name: 'Yeniden dene' })).toHaveClass('focus-visible:ring-2');
    expect(screen.getByRole('button', { name: 'Kapat' })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(ACCESS_TOKEN);
  });

  it('normalizes platform message events and tears down after three invalid messages', async () => {
    const postMessage = vi.fn();
    mount({ environment: embeddedEnvironment(postMessage), verifyContext: vi.fn() });
    await waitFor(() => expect(postMessage).toHaveBeenCalled());

    act(() => {
      document.dispatchEvent(new MessageEvent('message', { data: '{' }));
      window.dispatchEvent(new MessageEvent('message', { data: '{' }));
      window.dispatchEvent(new MessageEvent('message', { data: '{' }));
    });

    expect(screen.getByRole('alert')).toHaveTextContent('güvenlik nedeniyle kapatıldı');
    expect(screen.queryByText('tenant child')).not.toBeInTheDocument();
  });

  it('accepts a bridge message id once and ignores its replay before any second side effect', async () => {
    const postMessage = vi.fn();
    mount({ environment: embeddedEnvironment(postMessage), verifyContext: vi.fn() });
    await waitFor(() => expect(postMessage).toHaveBeenCalled());
    postMessage.mockClear();
    const challenge = incoming('bridge.challenge', { nonce: NONCE }, 'challenge_replay_123');

    act(() => {
      dispatchNative(challenge);
      dispatchNative(challenge);
    });

    expect(postMessage.mock.calls.map(([raw]) => JSON.parse(raw).type)).toEqual(['bridge.challenge.ack']);
  });

  it('cannot install a proof that resolves after its context was cleared', async () => {
    const postMessage = vi.fn();
    let resolveProof: ((result: unknown) => void) | undefined;
    const verifyContext = vi.fn(() => new Promise((resolve) => { resolveProof = resolve; }));
    mount({ environment: embeddedEnvironment(postMessage), verifyContext });
    await waitFor(() => expect(postMessage).toHaveBeenCalled());
    act(() => dispatchNative(incoming('bridge.challenge', { nonce: NONCE }, 'challenge_stale_1234')));
    const context = {
      accessToken: ACCESS_TOKEN,
      expiresAt: Math.floor(Date.now() / 1000) + 600,
      userId: USER_ID,
      choirId: CHOIR_ID,
      memberId: MEMBER_ID,
    };
    act(() => dispatchNative(incoming('context.apply', context, 'context_stale_12345')));
    await waitFor(() => expect(verifyContext).toHaveBeenCalledOnce());

    act(() => dispatchNative(incoming('context.clear', { reason: 'identity-change' }, 'clear_stale_1234567')));
    await act(async () => resolveProof?.({ ok: true, value: context }));

    expect(mocks.install).not.toHaveBeenCalled();
    expect(screen.queryByText('tenant child')).not.toBeInTheDocument();
  });

  it('emits exact native-owned capability requests without secrets', async () => {
    const postMessage = vi.fn();
    mount({ environment: embeddedEnvironment(postMessage), verifyContext: vi.fn(async (value) => ({ ok: true, value })) });
    await hydrate(postMessage);
    postMessage.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'back' }));
    fireEvent.click(screen.getByRole('button', { name: 'password' }));
    fireEvent.click(screen.getByRole('button', { name: 'theme' }));
    fireEvent.click(screen.getByRole('button', { name: 'copy' }));
    fireEvent.click(screen.getByRole('button', { name: 'signout' }));

    const messages = postMessage.mock.calls.map(([raw]) => JSON.parse(raw));
    expect(messages.map((message) => message.type)).toEqual([
      'navigation.exit.request', 'auth.password.open', 'theme.set.request',
      'clipboard.write.request', 'auth.sign-out.request',
    ]);
    expect(messages.find((message) => message.type === 'auth.password.open').payload).toEqual({});
    expect(screen.getByText('tenant child')).toBeInTheDocument();
    act(() => dispatchNative(incoming('context.clear', { reason: 'sign-out' }, 'signout_clear_12345')));
    expect(screen.queryByText('tenant child')).not.toBeInTheDocument();
  });

  it('maps native clipboard and file results to safe user feedback', async () => {
    const postMessage = vi.fn();
    mount({ environment: embeddedEnvironment(postMessage), verifyContext: vi.fn(async (value) => ({ ok: true, value })) });
    await hydrate(postMessage);

    act(() => dispatchNative(incoming('command.result', {
      requestId: 'request_1234567890abcdef', ok: false, code: 'clipboard-write-failed',
    }, 'result_clipboard_12345')));
    expect(screen.getByRole('status')).toHaveTextContent('Bağlantıyı seçip elle kopyalayabilirsiniz.');

    act(() => dispatchNative(incoming('command.result', {
      requestId: 'request_1234567890abcdef', ok: false, code: 'file-action-failed',
    }, 'result_file_123456789')));
    expect(screen.getByRole('status')).toHaveTextContent('Dosya güvenle açılamadı.');
    expect(screen.getByRole('status')).not.toHaveTextContent('request_1234567890abcdef');
  });

  it('intercepts native, external and denied links while preserving permanent web links', async () => {
    const postMessage = vi.fn();
    const navigateWithinWeb = vi.fn();
    mount({
      environment: embeddedEnvironment(postMessage),
      verifyContext: vi.fn(async (value) => ({ ok: true, value })),
      navigateWithinWeb,
      children: (
        <>
          <p>tenant child</p>
          <a href="https://app.genesinovachoir.com/announcements">web link</a>
          <a href="https://app.genesinovachoir.com/profil" target="_blank">popup web link</a>
          <a href="https://app.genesinovachoir.com/repertuvar">native link</a>
          <a href="https://example.com/resource?q=1" target="_blank">external link</a>
          <a
            href="https://app.genesinovachoir.com/api/drive-file/file_1?token=signed"
            data-genova-file-name="Tenor.pdf"
            data-genova-mime-type="application/pdf"
          >protected file</a>
          <a href="http://bad.example/path">bad link</a>
        </>
      ),
    });
    await hydrate(postMessage);
    postMessage.mockClear();

    const webLink = screen.getByRole('link', { name: 'web link' });
    webLink.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(webLink);
    expect(postMessage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('link', { name: 'popup web link' }), { ctrlKey: true });
    expect(navigateWithinWeb).toHaveBeenCalledWith('/profil');
    fireEvent.click(screen.getByRole('link', { name: 'native link' }));
    fireEvent.click(screen.getByRole('link', { name: 'external link' }), { metaKey: true });
    fireEvent.click(screen.getByRole('link', { name: 'protected file' }));
    fireEvent.click(screen.getByRole('link', { name: 'bad link' }));

    const messages = postMessage.mock.calls.map(([raw]) => JSON.parse(raw));
    expect(messages.map((message) => message.type)).toEqual([
      'navigation.native.request', 'navigation.external.request', 'file.open.request',
    ]);
    expect(messages[1].payload.url).toBe('https://example.com/resource?q=1');
    expect(messages[2].payload).toEqual({
      url: 'https://app.genesinovachoir.com/api/drive-file/file_1?token=signed',
      disposition: 'view',
      fileName: 'Tenor.pdf',
      mimeType: 'application/pdf',
    });
    expect(screen.getByRole('status')).toHaveTextContent('güvenli olmadığı için');
    expect(screen.getByRole('status').textContent).not.toContain('bad.example');
  });

  it('blocks programmatic history escapes and delegates native-owned paths', async () => {
    const postMessage = vi.fn();
    mount({ environment: embeddedEnvironment(postMessage), verifyContext: vi.fn(async (value) => ({ ok: true, value })) });
    await hydrate(postMessage);
    postMessage.mockClear();
    const initialPath = window.location.pathname;

    act(() => window.history.pushState({}, '', '/unknown'));
    expect(window.location.pathname).toBe(initialPath);
    expect(screen.getByRole('status')).toHaveTextContent('Bu uygulama bağlantısı açılamadı.');

    act(() => window.history.pushState({}, '', '/repertuvar'));
    expect(window.location.pathname).toBe(initialPath);
    expect(postMessage.mock.calls.map(([raw]) => JSON.parse(raw).type)).toContain('navigation.native.request');
  });

  it('makes a second authenticated 401 terminal even after the first renewal succeeds', async () => {
    const postMessage = vi.fn();
    mount({ environment: embeddedEnvironment(postMessage), verifyContext: vi.fn(async (value) => ({ ok: true, value })) });
    const { context } = await hydrate(postMessage);
    postMessage.mockClear();

    act(() => mocks.unauthorizedHandler?.());
    expect(postMessage.mock.calls.map(([raw]) => JSON.parse(raw).type)).toContain('context.renew.request');
    expect(mocks.beginRenewal).toHaveBeenCalledOnce();

    act(() => dispatchNative(incoming('context.apply', {
      ...context,
      accessToken: 'renewed-header.payload.signature',
      expiresAt: context.expiresAt + 300,
    }, 'context_renewed_401')));
    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('ready'));

    act(() => mocks.unauthorizedHandler?.());
    expect(screen.getByRole('alert')).toHaveTextContent('Uygulama bağlantısı kurulamadı.');
    expect(screen.queryByText('tenant child')).not.toBeInTheDocument();
    expect(postMessage.mock.calls.map(([raw]) => JSON.parse(raw))).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'bridge.error', payload: { code: 'second-unauthorized' } }),
    ]));
  });

  it('keeps reads visible during renewal and resumes only after a newer proved lease', async () => {
    const postMessage = vi.fn();
    const verifyContext = vi.fn(async (value) => ({ ok: true, value }));
    mount({ environment: embeddedEnvironment(postMessage), verifyContext });
    const { context } = await hydrate(postMessage, verifyContext);
    postMessage.mockClear();

    act(() => mocks.unauthorizedHandler?.());
    expect(screen.getByText('tenant child')).toBeInTheDocument();
    expect(screen.getByTestId('phase')).toHaveTextContent('renewing');
    act(() => dispatchNative(incoming('context.apply', {
      ...context,
      accessToken: 'new-header.payload.signature',
      expiresAt: context.expiresAt + 300,
    }, 'context_renew_12345')));

    await waitFor(() => expect(screen.getByTestId('phase')).toHaveTextContent('ready'));
    expect(mocks.install).toHaveBeenCalledTimes(2);
    expect(postMessage.mock.calls.filter(([raw]) => JSON.parse(raw).type === 'context.renew.request')).toHaveLength(1);
  });

  it('makes a renewal timeout terminal instead of looping', async () => {
    const postMessage = vi.fn();
    mount({ environment: embeddedEnvironment(postMessage), verifyContext: vi.fn(async (value) => ({ ok: true, value })) });
    await hydrate(postMessage);
    vi.useFakeTimers();

    act(() => mocks.unauthorizedHandler?.());
    act(() => vi.advanceTimersByTime(15_000));

    expect(screen.getByRole('alert')).toHaveTextContent('Güvenli oturum zamanında doğrulanamadı.');
    expect(screen.queryByText('tenant child')).not.toBeInTheDocument();
  });

  it('applies only the native-resolved theme without retaining a WebView preference', async () => {
    const postMessage = vi.fn();
    mount({ environment: embeddedEnvironment(postMessage), verifyContext: vi.fn(async (value) => ({ ok: true, value })) });
    await hydrate(postMessage);
    window.localStorage.setItem('theme', 'system');

    act(() => dispatchNative(incoming('theme.apply', { preference: 'system', resolved: 'dark' }, 'theme_apply_123456')));

    expect(mocks.setTheme).toHaveBeenCalledWith('dark');
    expect(window.localStorage.getItem('theme')).toBeNull();
  });
});
