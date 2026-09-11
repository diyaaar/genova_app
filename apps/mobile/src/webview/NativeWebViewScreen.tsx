import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Appearance,
  BackHandler,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { BridgeDiagnostic, NativeRouteFamily } from '@shared/mobile-webview-bridge';
import type { NativeWebViewLease, SecureKeyValueStore } from '../auth/types';
import { secureKeyValueStore } from '../auth/supabase-client';
import {
  NativeWebViewBridgeController,
  type NativeBridgeSnapshot,
  type PendingExternalRequest,
} from './native-bridge-controller';
import { allocateTenantEpoch, createBridgeChallenge, createBridgeCorrelationId } from './random';
import { readNativeWebViewRuntimeConfig, type NativeWebViewRuntimeConfig } from './runtime-config';
import {
  createNativeThemePreferenceStore,
  currentNativeTheme,
  type NativeThemePreference,
  type NativeThemeState,
} from './theme-preference';

const FILE_INPUT_GUARD = `(() => {
  const deny = (input) => {
    input.disabled = true;
    input.setAttribute('aria-disabled', 'true');
    input.setAttribute('title', 'Dosya seçimi mobil uygulamada henüz kullanılamıyor.');
  };
  const scan = (root) => root.querySelectorAll?.('input[type="file"]').forEach(deny);
  scan(document);
  new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
    if (node instanceof Element) { if (node.matches('input[type="file"]')) deny(node); scan(node); }
  }))).observe(document.documentElement, { childList: true, subtree: true });
  true;
})();`;

const TITLE_BY_FAMILY: Record<NativeBridgeSnapshot['routeFamily'], string> = {
  announcements: 'Duyurular',
  'announcement-detail': 'Duyuru',
  choristers: 'Koristler',
  'chorister-detail': 'Korist',
  invitations: 'Davetler',
  profile: 'Profil',
  'profile-edit': 'Profili düzenle',
  'profile-change-requests': 'Değişiklik talepleri',
  attendance: 'Devamsızlık',
};

interface Attempt {
  instanceId: string;
  tenantEpoch: number;
  key: string;
}

function newAttempt(): Attempt {
  const instanceId = createBridgeCorrelationId();
  return { instanceId, tenantEpoch: allocateTenantEpoch(), key: instanceId };
}

function errorCopy(code: string | null): string {
  switch (code) {
    case 'route-not-allowed': return 'Bu bağlantı mobil uygulamada güvenle açılamadı.';
    case 'route-unavailable': return 'Bu mobil bölüm henüz kullanıma hazır değil.';
    case 'handshake-timeout': return 'Güvenli bağlantı zamanında kurulamadı.';
    case 'lease-unavailable':
    case 'lease-renewal-failed': return 'Oturum güvenle doğrulanamadı.';
    case 'too-many-invalid-messages': return 'Bağlantı güvenlik nedeniyle kapatıldı.';
    case 'renderer-terminated': return 'Web içeriği beklenmedik biçimde durdu.';
    case 'http-failed':
    case 'load-failed': return 'Web içeriği yüklenemedi.';
    case 'capability-unavailable': return 'Bu işlem mobil uygulamada henüz kullanılamıyor.';
    default: return 'Web görünümü hazırlanamadı.';
  }
}

function chromeColors(resolved: NativeThemeState['resolved']) {
  return resolved === 'light'
    ? { background: '#F7F8FB', surface: '#FFFFFF', border: '#D7DBE5', text: '#171A21', muted: '#5F6878', accent: '#315FD6', danger: '#B42318' }
    : { background: '#0F1115', surface: '#171A21', border: '#272B35', text: '#F5F6F8', muted: '#A2A9B8', accent: '#8EA5FF', danger: '#FF8A8A' };
}

export interface NativeWebViewScreenProps {
  initialPath: string;
  getLease: () => Promise<NativeWebViewLease>;
  onNativeRoute: (route: Extract<NativeRouteFamily, 'home' | 'repertoire'>) => void;
  onExit: () => void;
  onSignOut: () => Promise<void> | void;
  runtimeConfig?: NativeWebViewRuntimeConfig;
  storage?: SecureKeyValueStore;
  openExternal?: (url: string) => Promise<unknown>;
  onDiagnostic?: (diagnostic: BridgeDiagnostic) => void;
}

export function NativeWebViewScreen({
  initialPath,
  getLease,
  onNativeRoute,
  onExit,
  onSignOut,
  runtimeConfig,
  storage = secureKeyValueStore,
  openExternal = (url) => Linking.openURL(url),
  onDiagnostic,
}: NativeWebViewScreenProps) {
  const actionsRef = useRef({ getLease, onNativeRoute, onExit, onSignOut, onDiagnostic });
  actionsRef.current = { getLease, onNativeRoute, onExit, onSignOut, onDiagnostic };
  const configResult = useMemo(() => {
    try {
      return { config: runtimeConfig ?? readNativeWebViewRuntimeConfig(initialPath), error: null };
    } catch {
      return { config: null, error: 'route-not-allowed' };
    }
  }, [initialPath, runtimeConfig]);
  const [attempt, setAttempt] = useState<Attempt>(newAttempt);
  const [snapshot, setSnapshot] = useState<NativeBridgeSnapshot | null>(null);
  const [covered, setCovered] = useState(true);
  const [pendingExternal, setPendingExternal] = useState<PendingExternalRequest | null>(null);
  const [themeState, setThemeState] = useState<NativeThemeState>(() => currentNativeTheme('system'));
  const webViewRef = useRef<WebView>(null);
  const controllerRef = useRef<NativeWebViewBridgeController | null>(null);
  const themeRef = useRef(themeState);
  themeRef.current = themeState;
  const themeStore = useMemo(() => createNativeThemePreferenceStore(storage), [storage]);

  useEffect(() => {
    let current = true;
    void themeStore.load().then((preference) => {
      if (current) setThemeState(currentNativeTheme(preference));
    });
    const listener = Appearance.addChangeListener(({ colorScheme }) => {
      setThemeState((previous) => ({
        preference: previous.preference,
        resolved: previous.preference === 'system' ? (colorScheme === 'light' ? 'light' : 'dark') : previous.resolved,
      }));
    });
    return () => {
      current = false;
      listener.remove();
    };
  }, [themeStore]);

  useEffect(() => {
    const config = configResult.config;
    if (!config) return;
    const controller = new NativeWebViewBridgeController({
      instanceId: attempt.instanceId,
      tenantEpoch: attempt.tenantEpoch,
      initialUrl: config.initialUrl,
      routePolicy: config.routePolicy,
      createMessageId: createBridgeCorrelationId,
      createChallenge: createBridgeChallenge,
      getLease: () => actionsRef.current.getLease(),
      postMessage: (message) => webViewRef.current?.postMessage(message),
      getTheme: () => themeRef.current,
      setTheme: async (preference: NativeThemePreference) => {
        await themeStore.save(preference);
        const next = currentNativeTheme(preference);
        themeRef.current = next;
        setThemeState(next);
        return next;
      },
      onSnapshot: (next) => {
        setSnapshot(next);
        setCovered(next.phase !== 'running');
      },
      onDiagnostic: (diagnostic) => actionsRef.current.onDiagnostic?.(diagnostic),
      onNativeRoute: (route) => {
        if (route === 'home' || route === 'repertoire') actionsRef.current.onNativeRoute(route);
      },
      onExternalRequest: setPendingExternal,
      onExit: () => actionsRef.current.onExit(),
      onSignOut: () => actionsRef.current.onSignOut(),
      coverContent: () => setCovered(true),
      yieldAfterClear: () => new Promise((resolve) => setTimeout(resolve, 0)),
    });
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [attempt, configResult.config, themeStore]);

  useEffect(() => {
    controllerRef.current?.applyTheme();
  }, [themeState]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      const controller = controllerRef.current;
      if (!controller) return false;
      if (controller.snapshot().phase === 'running') controller.goBack(() => webViewRef.current?.goBack());
      else actionsRef.current.onExit();
      return true;
    });
    return () => subscription.remove();
  }, []);

  const colors = useMemo(() => chromeColors(themeState.resolved), [themeState.resolved]);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const retry = () => {
    setPendingExternal(null);
    setCovered(true);
    setSnapshot(null);
    setAttempt(newAttempt());
  };
  const handleBack = () => {
    const controller = controllerRef.current;
    if (controller?.snapshot().phase === 'running') controller.goBack(() => webViewRef.current?.goBack());
    else actionsRef.current.onExit();
  };
  const handleClose = () => {
    const controller = controllerRef.current;
    if (controller) void controller.exit();
    else actionsRef.current.onExit();
  };
  const resolveExternal = async (allow: boolean) => {
    const pending = pendingExternal;
    if (!pending) return;
    setPendingExternal(null);
    if (controllerRef.current?.snapshot().phase !== 'running') return;
    if (!allow) {
      controllerRef.current?.resolveExternal(pending.requestId, 'cancelled');
      return;
    }
    try {
      await openExternal(pending.canonicalUrl);
      controllerRef.current?.resolveExternal(pending.requestId, 'opened');
    } catch {
      controllerRef.current?.resolveExternal(pending.requestId, 'failed');
    }
  };

  if (!configResult.config) {
    return (
      <NativeStatus
        styles={styles}
        title="Bağlantı açılamadı"
        message={errorCopy(configResult.error)}
        onClose={onExit}
      />
    );
  }

  const phase = snapshot?.phase ?? 'locked';
  const failed = phase === 'error';
  return (
    <SafeAreaView style={styles.container} testID="native-webview-screen">
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={snapshot?.canGoBackWithinWeb ? 'Web sayfasında geri git' : 'Web görünümünü kapat'}
          onPress={handleBack}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          testID="webview-back"
        >
          <Text style={styles.headerButtonText}>Geri</Text>
        </Pressable>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title} testID="webview-title">
          {snapshot ? TITLE_BY_FAMILY[snapshot.routeFamily] : 'Genova'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Web görünümünü kapat"
          onPress={handleClose}
          style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          testID="webview-close"
        >
          <Text style={styles.headerButtonText}>Kapat</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <WebView
          key={attempt.key}
          ref={webViewRef}
          testID="permanent-webview"
          source={{ uri: configResult.config.initialUrl }}
          // RNCWebView opens targets outside this prop through Linking before our callback.
          // Let the callback see every scheme; the shared parser below is the actual allowlist.
          originWhitelist={['*']}
          injectedJavaScriptObject={{
            channel: 'genova.mobile.webview',
            instanceId: attempt.instanceId,
            tenantEpoch: attempt.tenantEpoch,
          }}
          injectedJavaScript={FILE_INPUT_GUARD}
          injectedJavaScriptForMainFrameOnly
          incognito
          cacheEnabled={false}
          domStorageEnabled={false}
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          javaScriptEnabled
          javaScriptCanOpenWindowsAutomatically={false}
          setSupportMultipleWindows={false}
          mixedContentMode="never"
          allowFileAccess={false}
          allowFileAccessFromFileURLs={false}
          allowUniversalAccessFromFileURLs={false}
          allowsBackForwardNavigationGestures={false}
          mediaCapturePermissionGrantType="deny"
          webviewDebuggingEnabled={__DEV__}
          onMessage={(event: WebViewMessageEvent) => {
            void controllerRef.current?.handleMessage(event.nativeEvent.data, event.nativeEvent.url);
          }}
          onShouldStartLoadWithRequest={(request) => (
            controllerRef.current?.handleNavigationUrl(request.url) === 'allow-web'
          )}
          onNavigationStateChange={(navigation) => {
            if (controllerRef.current?.handleNavigationUrl(navigation.url) !== 'allow-web') {
              webViewRef.current?.stopLoading();
            }
          }}
          onOpenWindow={(event) => {
            if (controllerRef.current?.handleNavigationUrl(event.nativeEvent.targetUrl) !== 'allow-web') {
              webViewRef.current?.stopLoading();
            }
          }}
          onError={() => controllerRef.current?.processFailed('load-failed')}
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode === 401 || event.nativeEvent.statusCode >= 500) {
              controllerRef.current?.processFailed('http-failed');
            }
          }}
          onRenderProcessGone={() => controllerRef.current?.processFailed('renderer-terminated')}
          onContentProcessDidTerminate={() => controllerRef.current?.processFailed('renderer-terminated')}
          onFileDownload={() => controllerRef.current?.processFailed('capability-unavailable')}
          style={styles.webview}
        />

        {covered ? (
          <View
            accessibilityLiveRegion="assertive"
            accessibilityRole={failed ? 'alert' : 'progressbar'}
            style={styles.cover}
            testID={failed ? 'webview-error' : 'webview-locked'}
          >
            {failed ? null : <ActivityIndicator color={colors.accent} size="large" />}
            <Text style={[styles.statusTitle, failed && styles.errorText]}>
              {failed ? 'Web görünümü açılamadı' : 'Güvenli bağlantı kuruluyor'}
            </Text>
            <Text style={styles.statusMessage}>
              {failed ? errorCopy(snapshot?.errorCode ?? null) : 'Koro oturumunuz doğrulanıyor…'}
            </Text>
            <View style={styles.statusActions}>
              {failed ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={retry}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                  testID="webview-retry"
                >
                  <Text style={styles.primaryButtonText}>Tekrar dene</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                onPress={handleClose}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                testID="webview-status-close"
              >
                <Text style={styles.secondaryButtonText}>Kapat</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      <Modal
        visible={Boolean(pendingExternal)}
        transparent
        animationType="none"
        onRequestClose={() => void resolveExternal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityRole="alert" style={styles.modalCard} testID="external-confirmation">
            <Text style={styles.statusTitle}>Uygulamadan ayrıl</Text>
            <Text style={styles.statusMessage}>
              {pendingExternal?.displayHost ?? 'Dış bağlantı'} sistem tarayıcısında açılsın mı?
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => void resolveExternal(false)}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                testID="external-cancel"
              >
                <Text style={styles.secondaryButtonText}>Vazgeç</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => void resolveExternal(true)}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                testID="external-open"
              >
                <Text style={styles.primaryButtonText}>Tarayıcıda aç</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function NativeStatus({
  styles,
  title,
  message,
  onClose,
}: {
  styles: ReturnType<typeof makeStyles>;
  title: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <SafeAreaView accessibilityRole="alert" style={styles.statusPage} testID="webview-initial-error">
      <Text style={[styles.statusTitle, styles.errorText]}>{title}</Text>
      <Text style={styles.statusMessage}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onClose}
        style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
      >
        <Text style={styles.primaryButtonText}>Kapat</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof chromeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { minHeight: 56, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, paddingHorizontal: 8 },
    headerButton: { minWidth: 56, minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
    headerButtonText: { color: colors.accent, fontSize: 15, fontWeight: '700' },
    title: { flex: 1, color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' },
    body: { flex: 1, position: 'relative' },
    webview: { flex: 1, backgroundColor: colors.background },
    cover: { position: 'absolute', inset: 0, zIndex: 2, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24, backgroundColor: colors.background },
    statusPage: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24, backgroundColor: colors.background },
    statusTitle: { color: colors.text, fontSize: 21, fontWeight: '700', textAlign: 'center' },
    statusMessage: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
    errorText: { color: colors.danger },
    statusActions: { width: '100%', maxWidth: 360, gap: 10, marginTop: 8 },
    primaryButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, borderRadius: 12, backgroundColor: colors.accent },
    primaryButtonText: { color: colors.background, fontSize: 16, fontWeight: '800' },
    secondaryButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface },
    secondaryButtonText: { color: colors.text, fontSize: 16, fontWeight: '700' },
    pressed: { opacity: 0.72 },
    modalBackdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.65)' },
    modalCard: { gap: 14, padding: 22, borderWidth: 1, borderColor: colors.border, borderRadius: 16, backgroundColor: colors.surface },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  });
}
