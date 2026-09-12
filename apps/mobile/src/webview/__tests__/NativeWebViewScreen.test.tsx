import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { APP_WEB_ORIGIN, BRIDGE_CHANNEL, type BridgeMessageType, type BridgePayloads } from '@shared/mobile-webview-bridge';
import { createMemoryKeyValueStore, USER_ID, CHOIR_A, membership } from '../../test/doubles';
import { NativeWebViewScreen } from '../NativeWebViewScreen';
import { ProtectedFileCapability, type EphemeralFileStore, type NativeShareGateway } from '../platform-capabilities';
import { createNativeWebViewRuntimeConfig } from '../runtime-config';

interface MockWebViewProps {
  source: { uri: string };
  originWhitelist: string[];
  injectedJavaScriptObject: Record<string, unknown>;
  injectedJavaScript: string;
  incognito: boolean;
  cacheEnabled: boolean;
  domStorageEnabled: boolean;
  sharedCookiesEnabled: boolean;
  thirdPartyCookiesEnabled: boolean;
  javaScriptCanOpenWindowsAutomatically: boolean;
  setSupportMultipleWindows: boolean;
  mixedContentMode: string;
  allowFileAccess: boolean;
  allowsBackForwardNavigationGestures: boolean;
  mediaCapturePermissionGrantType: string;
  onMessage: (event: { nativeEvent: { data: string; url: string } }) => void;
  onShouldStartLoadWithRequest: (event: { url: string }) => boolean;
  onOpenWindow: (event: { nativeEvent: { targetUrl: string } }) => void;
  onError: () => void;
}

const webViewMock = jest.requireMock('react-native-webview') as {
  __mockMethods: { postMessage: jest.Mock; goBack: jest.Mock; stopLoading: jest.Mock };
  __getLatestProps: () => MockWebViewProps | null;
};

const SOURCE = `${APP_WEB_ORIGIN}/announcements`;
let index = 0;
function incoming<Type extends BridgeMessageType>(
  props: MockWebViewProps,
  type: Type,
  payload: BridgePayloads[Type],
) {
  index += 1;
  return JSON.stringify({
    channel: BRIDGE_CHANNEL,
    version: 1,
    id: `component_${String(index).padStart(16, '0')}`,
    instanceId: props.injectedJavaScriptObject.instanceId,
    tenantEpoch: props.injectedJavaScriptObject.tenantEpoch,
    type,
    payload,
  });
}

function outgoing() {
  return webViewMock.__mockMethods.postMessage.mock.calls.map(([message]) => JSON.parse(message as string) as {
    type: BridgeMessageType;
    payload: Record<string, unknown>;
  });
}

async function unlock(props: MockWebViewProps) {
  await act(async () => {
    props.onMessage({ nativeEvent: {
      data: incoming(props, 'bridge.ready', { supportedVersions: [1], routeFamily: 'announcements' }),
      url: SOURCE,
    } });
  });
  const challenge = outgoing().findLast((message) => message.type === 'bridge.challenge');
  await act(async () => {
    props.onMessage({ nativeEvent: {
      data: incoming(props, 'bridge.challenge.ack', { nonce: challenge?.payload.nonce as string }),
      url: SOURCE,
    } });
  });
  await act(async () => {
    props.onMessage({ nativeEvent: {
      data: incoming(props, 'navigation.state', { routeFamily: 'announcements', canGoBackWithinWeb: false }),
      url: SOURCE,
    } });
  });
  await waitFor(() => expect(screen.queryByTestId('webview-locked')).toBeNull());
}

async function renderScreen(overrides: Partial<React.ComponentProps<typeof NativeWebViewScreen>> = {}) {
  const props: React.ComponentProps<typeof NativeWebViewScreen> = {
    initialPath: '/announcements',
    getLease: jest.fn(async () => ({
      accessToken: 'header.payload.signature',
      expiresAt: 2_000,
      userId: USER_ID,
      choirId: CHOIR_A,
      memberId: membership().member_id,
    })),
    onNativeRoute: jest.fn(),
    onExit: jest.fn(),
    onSignOut: jest.fn(),
    changePassword: jest.fn(async () => ({ ok: true as const })),
    runtimeConfig: createNativeWebViewRuntimeConfig({ initialPath: '/announcements', isDevelopment: false }),
    storage: createMemoryKeyValueStore(),
    openExternal: jest.fn(async () => {}),
    ...overrides,
  };
  return { props, view: await render(<NativeWebViewScreen {...props} />) };
}

beforeEach(() => {
  index = 0;
  webViewMock.__mockMethods.postMessage.mockClear();
  webViewMock.__mockMethods.goBack.mockClear();
  webViewMock.__mockMethods.stopLoading.mockClear();
});

describe('NativeWebViewScreen', () => {
  it('never mounts a rejected initial route', async () => {
    await renderScreen({ initialPath: '/login', runtimeConfig: undefined });
    expect(screen.getByTestId('webview-initial-error')).toBeTruthy();
    expect(screen.queryByTestId('permanent-webview')).toBeNull();
  });

  it('mounts locked with exact secret-free and nonpersistent WebView settings', async () => {
    await renderScreen();
    expect(screen.getByTestId('webview-locked')).toBeTruthy();
    const props = webViewMock.__getLatestProps();
    expect(props).not.toBeNull();
    expect(props).toMatchObject({
      source: { uri: SOURCE },
      originWhitelist: ['*'],
      incognito: true,
      cacheEnabled: false,
      domStorageEnabled: false,
      sharedCookiesEnabled: false,
      thirdPartyCookiesEnabled: false,
      javaScriptCanOpenWindowsAutomatically: false,
      setSupportMultipleWindows: false,
      mixedContentMode: 'never',
      allowFileAccess: false,
      allowsBackForwardNavigationGestures: false,
      mediaCapturePermissionGrantType: 'deny',
    });
    expect(props?.injectedJavaScriptObject).toEqual({
      channel: BRIDGE_CHANNEL,
      instanceId: expect.any(String),
      tenantEpoch: expect.any(Number),
    });
    expect(JSON.stringify(props?.injectedJavaScriptObject)).not.toMatch(/token|user|choir|member/iu);
    expect(props?.injectedJavaScript).toContain('input[type="file"]');
  });

  it('removes the native cover only after challenge, lease and web proof', async () => {
    await renderScreen();
    const props = webViewMock.__getLatestProps() as MockWebViewProps;
    await act(async () => {
      props.onMessage({ nativeEvent: {
        data: incoming(props, 'bridge.ready', { supportedVersions: [1], routeFamily: 'announcements' }),
        url: SOURCE,
      } });
    });
    const challenge = outgoing().find((message) => message.type === 'bridge.challenge');
    expect(challenge).toBeTruthy();
    expect(screen.getByTestId('webview-locked')).toBeTruthy();

    await act(async () => {
      props.onMessage({ nativeEvent: {
        data: incoming(props, 'bridge.challenge.ack', { nonce: challenge?.payload.nonce as string }),
        url: SOURCE,
      } });
    });
    expect(outgoing().some((message) => message.type === 'context.apply')).toBe(true);
    expect(screen.getByTestId('webview-locked')).toBeTruthy();

    await act(async () => {
      props.onMessage({ nativeEvent: {
        data: incoming(props, 'navigation.state', { routeFamily: 'announcements', canGoBackWithinWeb: false }),
        url: SOURCE,
      } });
    });
    await waitFor(() => expect(screen.queryByTestId('webview-locked')).toBeNull());
    expect(outgoing().at(-1)).toMatchObject({ type: 'theme.apply' });
  });

  it('stops route escapes and opens a normalized external host only after confirmation', async () => {
    const openExternal = jest.fn(async () => {});
    await renderScreen({ openExternal });
    const props = webViewMock.__getLatestProps() as MockWebViewProps;
    expect(props.onShouldStartLoadWithRequest({ url: `${APP_WEB_ORIGIN}/profil` })).toBe(true);
    await act(async () => {
      expect(props.onShouldStartLoadWithRequest({ url: 'javascript:alert(1)' })).toBe(false);
    });
    expect(await screen.findByTestId('webview-error')).toBeTruthy();

    fireEvent.press(screen.getByTestId('webview-retry'));
    await waitFor(() => expect(screen.getByTestId('webview-locked')).toBeTruthy());
    const retried = webViewMock.__getLatestProps() as MockWebViewProps;
    const previousInstance = props.injectedJavaScriptObject.instanceId;
    expect(retried.injectedJavaScriptObject.instanceId).not.toBe(previousInstance);

    await act(async () => {
      const ready = incoming(retried, 'bridge.ready', { supportedVersions: [1], routeFamily: 'announcements' });
      retried.onMessage({ nativeEvent: { data: ready, url: SOURCE } });
    });
    const challenge = outgoing().at(-1);
    await act(async () => {
      retried.onMessage({ nativeEvent: {
        data: incoming(retried, 'bridge.challenge.ack', { nonce: challenge?.payload.nonce as string }), url: SOURCE,
      } });
    });
    await act(async () => {
      retried.onMessage({ nativeEvent: {
        data: incoming(retried, 'navigation.state', { routeFamily: 'announcements', canGoBackWithinWeb: false }), url: SOURCE,
      } });
    });
    await act(async () => {
      expect(retried.onShouldStartLoadWithRequest({ url: 'https://example.test/private?token=hidden' })).toBe(false);
    });
    expect(await screen.findByTestId('external-confirmation')).toHaveTextContent(/example\.test/u);
    expect(screen.getByTestId('external-confirmation')).not.toHaveTextContent('hidden');
    expect(openExternal).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('external-open'));
    await waitFor(() => expect(openExternal).toHaveBeenCalledWith('https://example.test/private?token=hidden'));
  });

  it('turns a load failure into an announced bounded retry/close state', async () => {
    await renderScreen();
    const props = webViewMock.__getLatestProps() as MockWebViewProps;
    await act(async () => props.onError());
    expect(screen.getByTestId('webview-error')).toHaveTextContent(/yüklenemedi/iu);
    expect(screen.getByTestId('webview-retry')).toBeTruthy();
    expect(screen.getByTestId('webview-status-close')).toBeTruthy();
  });

  it('keeps all password fields native, reports validation and clears them after success', async () => {
    const changePassword = jest.fn()
      .mockResolvedValueOnce({ ok: false, message: 'Mevcut şifre doğru değil.' })
      .mockResolvedValueOnce({ ok: true });
    await renderScreen({ changePassword });
    const props = webViewMock.__getLatestProps() as MockWebViewProps;
    await unlock(props);

    await act(async () => {
      props.onMessage({ nativeEvent: { data: incoming(props, 'auth.password.open', {}), url: SOURCE } });
    });
    expect(screen.getByTestId('password-sheet')).toHaveTextContent(/yalnızca bu güvenli native ekranda/u);
    expect(outgoing().at(-1)).toMatchObject({
      type: 'command.result', payload: { ok: true, code: 'password-sheet-opened' },
    });

    await fireEvent.changeText(screen.getByTestId('password-current'), 'old-password');
    await fireEvent.changeText(screen.getByTestId('password-new'), 'new-password');
    await fireEvent.changeText(screen.getByTestId('password-confirm'), 'new-password');
    await act(async () => {
      fireEvent.press(screen.getByTestId('password-submit'));
      await Promise.resolve();
    });
    await waitFor(() => expect(changePassword).toHaveBeenCalledWith('old-password', 'new-password', 'new-password'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Mevcut şifre doğru değil.');

    await act(async () => {
      fireEvent.press(screen.getByTestId('password-submit'));
      await Promise.resolve();
    });
    expect(await screen.findByTestId('password-success')).toHaveTextContent('Şifreniz güncellendi.');
    expect(screen.getByTestId('password-current').props.value).toBe('');
    expect(screen.getByTestId('password-new').props.value).toBe('');
    expect(screen.getByTestId('password-confirm').props.value).toBe('');
    await fireEvent.press(screen.getByTestId('password-cancel'));
    await waitFor(() => expect(screen.queryByTestId('password-sheet')).toBeNull());
  });

  it('confirms a protected file without showing its URL and removes the temporary copy', async () => {
    const files: EphemeralFileStore = {
      download: jest.fn(async () => ({ uri: 'file:///cache/voice.pdf', size: 128 })),
      remove: jest.fn(async () => {}),
      clear: jest.fn(async () => {}),
    };
    const sharing: NativeShareGateway = {
      isAvailable: jest.fn(async () => true),
      share: jest.fn(async () => {}),
    };
    await renderScreen({ protectedFileCapability: new ProtectedFileCapability(files, sharing) });
    await waitFor(() => expect(files.clear).toHaveBeenCalled());
    const props = webViewMock.__getLatestProps() as MockWebViewProps;
    await unlock(props);

    await act(async () => {
      props.onMessage({ nativeEvent: {
        data: incoming(props, 'file.open.request', {
          url: '/api/drive-file/file_1?token=must-stay-hidden',
          disposition: 'view',
          fileName: 'Tenor.pdf',
          mimeType: 'application/pdf',
        }),
        url: SOURCE,
      } });
    });
    expect(screen.getByTestId('protected-file-confirmation')).toHaveTextContent(/Tenor\.pdf/u);
    expect(screen.getByTestId('protected-file-confirmation')).not.toHaveTextContent('must-stay-hidden');
    await act(async () => {
      fireEvent.press(screen.getByTestId('protected-file-open'));
      await Promise.resolve();
    });
    await waitFor(() => expect(files.remove).toHaveBeenCalledWith('file:///cache/voice.pdf'));
    expect(sharing.share).toHaveBeenCalledWith('file:///cache/voice.pdf', expect.objectContaining({
      mimeType: 'application/pdf',
    }));
    expect(outgoing().at(-1)).toMatchObject({
      type: 'command.result', payload: { ok: true, code: 'file-action-complete' },
    });
    expect(JSON.stringify(outgoing().at(-1))).not.toContain('must-stay-hidden');
  });
});
