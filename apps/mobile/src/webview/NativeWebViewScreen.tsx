import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Appearance,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { BridgeDiagnostic, NativeRouteFamily } from '@shared/mobile-webview-bridge';
import type { NativeWebViewLease, NativeWebViewLeaseOptions, PasswordChangeResult, SecureKeyValueStore } from '../auth/types';
import { secureKeyValueStore } from '../auth/supabase-client';
import {
  NativeWebViewBridgeController,
  type NativeBridgeSnapshot,
  type PendingExternalRequest,
  type PendingProtectedFileRequest,
} from './native-bridge-controller';
import {
  ProtectedFileCapability,
  WEBVIEW_IMAGE_INPUT_POLICY,
  createExpoClipboardWriter,
  createExpoEphemeralFileStore,
  createExpoShareGateway,
  prepareProtectedFileRequest,
  type PreparedProtectedFileRequest,
} from './platform-capabilities';
import { allocateTenantEpoch, createBridgeChallenge, createBridgeCorrelationId } from './random';
import { readNativeWebViewRuntimeConfig, type NativeWebViewRuntimeConfig } from './runtime-config';
import {
  createNativeThemePreferenceStore,
  currentNativeTheme,
  type NativeThemePreference,
  type NativeThemeState,
} from './theme-preference';

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

function isOriginOnlySource(sourceUrl: string, appOrigin: string): boolean {
  try {
    const source = new URL(sourceUrl);
    return source.origin === appOrigin && source.pathname === '/' && !source.search && !source.hash;
  } catch {
    return false;
  }
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
    case 'file-not-supported': return 'Bu dosya türü mobil uygulamada güvenle açılamıyor.';
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
  getLease: (options?: NativeWebViewLeaseOptions) => Promise<NativeWebViewLease>;
  onNativeRoute: (route: Extract<NativeRouteFamily, 'home' | 'repertoire'>) => void;
  onExit: () => void;
  onSignOut: () => Promise<void> | void;
  changePassword: (oldPassword: string, newPassword: string, confirmation: string) => Promise<PasswordChangeResult>;
  runtimeConfig?: NativeWebViewRuntimeConfig;
  storage?: SecureKeyValueStore;
  openExternal?: (url: string) => Promise<unknown>;
  onDiagnostic?: (diagnostic: BridgeDiagnostic) => void;
  writeClipboard?: (text: string) => Promise<boolean>;
  protectedFileCapability?: ProtectedFileCapability;
  onBridgeSnapshot?: (snapshot: NativeBridgeSnapshot) => void;
}

export function NativeWebViewScreen({
  initialPath,
  getLease,
  onNativeRoute,
  onExit,
  onSignOut,
  changePassword,
  runtimeConfig,
  storage = secureKeyValueStore,
  openExternal = (url) => Linking.openURL(url),
  onDiagnostic,
  writeClipboard = createExpoClipboardWriter(),
  protectedFileCapability: suppliedProtectedFileCapability,
  onBridgeSnapshot,
}: NativeWebViewScreenProps) {
  const actionsRef = useRef({ getLease, onNativeRoute, onExit, onSignOut, onDiagnostic, changePassword, writeClipboard, onBridgeSnapshot });
  actionsRef.current = { getLease, onNativeRoute, onExit, onSignOut, onDiagnostic, changePassword, writeClipboard, onBridgeSnapshot };
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
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<'idle' | 'saving' | 'done'>('idle');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<PreparedProtectedFileRequest | null>(null);
  const [fileBusy, setFileBusy] = useState(false);
  const [themeState, setThemeState] = useState<NativeThemeState>(() => currentNativeTheme('system'));
  const webViewRef = useRef<WebView>(null);
  const trustedWebSourceRef = useRef(configResult.config?.initialUrl ?? '');
  const controllerRef = useRef<NativeWebViewBridgeController | null>(null);
  const themeRef = useRef(themeState);
  themeRef.current = themeState;
  const themeStore = useMemo(() => createNativeThemePreferenceStore(storage), [storage]);
  const protectedFileCapability = useMemo(() => suppliedProtectedFileCapability ?? new ProtectedFileCapability(
    createExpoEphemeralFileStore(),
    createExpoShareGateway(),
  ), [suppliedProtectedFileCapability]);
  const bootstrap = useMemo(() => ({
    channel: 'genova.mobile.webview' as const,
    instanceId: attempt.instanceId,
    tenantEpoch: attempt.tenantEpoch,
  }), [attempt.instanceId, attempt.tenantEpoch]);
  const bootstrapBeforeContent = useMemo(() => {
    const serialized = JSON.stringify(JSON.stringify(bootstrap));
    return `window.ReactNativeWebView = window.ReactNativeWebView || {}; window.ReactNativeWebView.injectedObjectJson = function () { return ${serialized}; }; true;`;
  }, [bootstrap]);
  const passwordVisibleRef = useRef(passwordVisible);
  const oldPasswordRef = useRef(oldPassword);
  const newPasswordRef = useRef(newPassword);
  const confirmPasswordRef = useRef(confirmPassword);
  const pendingFileRef = useRef(pendingFile);
  passwordVisibleRef.current = passwordVisible;
  pendingFileRef.current = pendingFile;

  useEffect(() => {
    trustedWebSourceRef.current = configResult.config?.initialUrl ?? '';
  }, [attempt.key, configResult.config?.initialUrl]);

  const resetPasswordSheet = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    oldPasswordRef.current = '';
    newPasswordRef.current = '';
    confirmPasswordRef.current = '';
    setPasswordError(null);
    setPasswordStatus('idle');
    setPasswordVisible(false);
    passwordVisibleRef.current = false;
  };
  const clearCapabilityUi = useCallback(async () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    oldPasswordRef.current = '';
    newPasswordRef.current = '';
    confirmPasswordRef.current = '';
    setPasswordError(null);
    setPasswordStatus('idle');
    setPasswordVisible(false);
    passwordVisibleRef.current = false;
    setPendingFile(null);
    pendingFileRef.current = null;
    setFileBusy(false);
    await protectedFileCapability.clear();
  }, [protectedFileCapability]);

  useEffect(() => {
    let current = true;
    void protectedFileCapability.clear().catch(() => undefined);
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
      getLease: (options) => actionsRef.current.getLease(options),
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
        actionsRef.current.onBridgeSnapshot?.(next);
      },
      onDiagnostic: (diagnostic) => actionsRef.current.onDiagnostic?.(diagnostic),
      onNativeRoute: (route) => {
        if (route === 'home' || route === 'repertoire') actionsRef.current.onNativeRoute(route);
      },
      onExternalRequest: setPendingExternal,
      onPasswordRequest: () => {
        if (passwordVisibleRef.current) return false;
        passwordVisibleRef.current = true;
        setPasswordError(null);
        setPasswordStatus('idle');
        setPasswordVisible(true);
        return true;
      },
      writeClipboard: (text) => actionsRef.current.writeClipboard(text),
      onProtectedFileRequest: (request: PendingProtectedFileRequest) => {
        if (pendingFileRef.current) return false;
        const prepared = prepareProtectedFileRequest(request, config.routePolicy);
        if (!prepared) return false;
        pendingFileRef.current = prepared;
        setPendingFile(prepared);
        return true;
      },
      onCapabilityClear: clearCapabilityUi,
      onExit: () => actionsRef.current.onExit(),
      onSignOut: () => actionsRef.current.onSignOut(),
      coverContent: () => setCovered(true),
      yieldAfterClear: () => new Promise((resolve) => setTimeout(resolve, 0)),
    });
    controllerRef.current = controller;
    return () => {
      controller.dispose();
      void protectedFileCapability.clear();
      if (controllerRef.current === controller) controllerRef.current = null;
    };
  }, [attempt, clearCapabilityUi, configResult.config, protectedFileCapability, themeStore]);

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
    void clearCapabilityUi();
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
  const submitPassword = async () => {
    if (passwordStatus === 'saving') return;
    setPasswordStatus('saving');
    setPasswordError(null);
    const result = await actionsRef.current.changePassword(
      oldPasswordRef.current,
      newPasswordRef.current,
      confirmPasswordRef.current,
    );
    if (!result.ok) {
      setPasswordStatus('idle');
      setPasswordError(result.message);
      return;
    }
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    oldPasswordRef.current = '';
    newPasswordRef.current = '';
    confirmPasswordRef.current = '';
    setPasswordStatus('done');
  };
  const cancelFile = () => {
    const request = pendingFileRef.current;
    if (!request || fileBusy) return;
    controllerRef.current?.resolveProtectedFile(request.requestId, 'cancelled');
    pendingFileRef.current = null;
    setPendingFile(null);
  };
  const runFileAction = async () => {
    const request = pendingFileRef.current;
    if (!request || fileBusy) return;
    setFileBusy(true);
    const opened = await protectedFileCapability.run(request);
    controllerRef.current?.resolveProtectedFile(request.requestId, opened ? 'opened' : 'failed');
    setFileBusy(false);
    pendingFileRef.current = null;
    setPendingFile(null);
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
          injectedJavaScriptObject={bootstrap}
          injectedJavaScriptBeforeContentLoaded={bootstrapBeforeContent}
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly
          injectedJavaScript={WEBVIEW_IMAGE_INPUT_POLICY}
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
            const config = configResult.config;
            const sourceUrl = config && isOriginOnlySource(event.nativeEvent.url, config.appOrigin)
              ? trustedWebSourceRef.current
              : event.nativeEvent.url;
            void controllerRef.current?.handleMessage(event.nativeEvent.data, sourceUrl);
          }}
          onShouldStartLoadWithRequest={(request) => {
            const decision = controllerRef.current?.handleNavigationUrl(request.url);
            if (decision === 'allow-web') trustedWebSourceRef.current = request.url;
            return decision === 'allow-web';
          }}
          onNavigationStateChange={(navigation) => {
            if (controllerRef.current?.handleNavigationUrl(navigation.url) === 'allow-web') {
              trustedWebSourceRef.current = navigation.url;
            } else {
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
          onFileDownload={() => controllerRef.current?.processFailed('file-not-supported')}
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

      <Modal
        visible={passwordVisible}
        transparent
        animationType="none"
        onRequestClose={() => {
          if (passwordStatus !== 'saving') resetPasswordSheet();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View accessibilityViewIsModal style={styles.modalCard} testID="password-sheet">
            <Text accessibilityRole="header" style={styles.statusTitle}>Şifreyi değiştir</Text>
            <Text style={styles.statusMessage}>Şifreniz yalnızca bu güvenli native ekranda işlenir.</Text>
            <Text style={styles.fieldLabel}>Mevcut şifre</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="current-password"
              editable={passwordStatus !== 'saving' && passwordStatus !== 'done'}
              onChangeText={(value) => { oldPasswordRef.current = value; setOldPassword(value); }}
              secureTextEntry
              style={styles.field}
              testID="password-current"
              value={oldPassword}
            />
            <Text style={styles.fieldLabel}>Yeni şifre</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="new-password"
              editable={passwordStatus !== 'saving' && passwordStatus !== 'done'}
              onChangeText={(value) => { newPasswordRef.current = value; setNewPassword(value); }}
              secureTextEntry
              style={styles.field}
              testID="password-new"
              value={newPassword}
            />
            <Text style={styles.fieldLabel}>Yeni şifreyi tekrar girin</Text>
            <TextInput
              autoCapitalize="none"
              autoComplete="new-password"
              editable={passwordStatus !== 'saving' && passwordStatus !== 'done'}
              onChangeText={(value) => { confirmPasswordRef.current = value; setConfirmPassword(value); }}
              onSubmitEditing={() => void submitPassword()}
              secureTextEntry
              style={styles.field}
              testID="password-confirm"
              value={confirmPassword}
            />
            {passwordError ? <Text accessibilityRole="alert" style={styles.errorText}>{passwordError}</Text> : null}
            {passwordStatus === 'done' ? (
              <Text accessibilityLiveRegion="polite" style={styles.successText} testID="password-success">
                Şifreniz güncellendi.
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={passwordStatus === 'saving'}
                onPress={resetPasswordSheet}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                testID="password-cancel"
              >
                <Text style={styles.secondaryButtonText}>{passwordStatus === 'done' ? 'Kapat' : 'Vazgeç'}</Text>
              </Pressable>
              {passwordStatus !== 'done' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ busy: passwordStatus === 'saving', disabled: passwordStatus === 'saving' }}
                  disabled={passwordStatus === 'saving'}
                  onPress={() => void submitPassword()}
                  style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                  testID="password-submit"
                >
                  <Text style={styles.primaryButtonText}>{passwordStatus === 'saving' ? 'Güncelleniyor…' : 'Şifreyi güncelle'}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={Boolean(pendingFile)}
        transparent
        animationType="none"
        onRequestClose={cancelFile}
      >
        <View style={styles.modalBackdrop}>
          <View accessibilityViewIsModal style={styles.modalCard} testID="protected-file-confirmation">
            <Text accessibilityRole="header" style={styles.statusTitle}>
              {pendingFile?.disposition === 'download' ? 'Dosyayı kaydet' : 'Dosyayı aç'}
            </Text>
            <Text numberOfLines={2} style={styles.fileName}>{pendingFile?.fileName}</Text>
            <Text style={styles.statusMessage}>{pendingFile?.mimeType}</Text>
            <Text style={styles.statusMessage}>Dosya geçici olarak indirilir ve işlem bitince cihazdan silinir.</Text>
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                disabled={fileBusy}
                onPress={cancelFile}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                testID="protected-file-cancel"
              >
                <Text style={styles.secondaryButtonText}>Vazgeç</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ busy: fileBusy, disabled: fileBusy }}
                disabled={fileBusy}
                onPress={() => void runFileAction()}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                testID="protected-file-open"
              >
                <Text style={styles.primaryButtonText}>{fileBusy ? 'Hazırlanıyor…' : 'Devam et'}</Text>
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
    successText: { color: colors.accent, fontSize: 15, fontWeight: '700', textAlign: 'center' },
    fieldLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' },
    field: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, color: colors.text, backgroundColor: colors.background },
    fileName: { color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
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
