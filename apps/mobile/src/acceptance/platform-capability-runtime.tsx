import { useCallback, useMemo, useRef, useState } from 'react';
import { registerRootComponent } from 'expo';
import * as Clipboard from 'expo-clipboard';
import { CryptoDigestAlgorithm, digest } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import {
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { AppRoutePolicy } from '@shared/mobile-webview-bridge';
import {
  ProtectedFileCapability,
  WEBVIEW_IMAGE_INPUT_POLICY,
  createExpoClipboardWriter,
  createExpoEphemeralFileStore,
  createExpoShareGateway,
  prepareProtectedFileRequest,
  type EphemeralFileStore,
  type NativeShareGateway,
} from '../webview/platform-capabilities';
import { readPlatformCapabilityRuntimeConfig } from './platform-capability-runtime-config';

const config = readPlatformCapabilityRuntimeConfig({
  EXPO_PUBLIC_GENOVA_032_ACCEPTANCE: process.env.EXPO_PUBLIC_GENOVA_032_ACCEPTANCE,
  EXPO_PUBLIC_GENOVA_032_BASE_URL: process.env.EXPO_PUBLIC_GENOVA_032_BASE_URL,
});
const routePolicy: AppRoutePolicy = { appOrigin: config.baseUrl };
const inviteUrl = `https://app.genesinovachoir.com/invite#invite=${'032a'.repeat(16)}`;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function cacheIsEmpty(): boolean {
  try {
    return !new Directory(Paths.cache, 'genova-webview-files').exists;
  } catch {
    return true;
  }
}

function tracedFileStore(trace: (event: string) => void): EphemeralFileStore {
  const delegate = createExpoEphemeralFileStore();
  return {
    async download(input) {
      try {
        const result = await delegate.download(input);
        const file = new File(result.uri);
        const sha256 = toHex(await digest(CryptoDigestAlgorithm.SHA256, await file.bytes()));
        trace(`download PASS ${result.size}B sha=${sha256.slice(0, 12)}`);
        return result;
      } catch (error) {
        trace(`download FAIL ${acceptanceErrorCode(error)}`);
        throw error;
      }
    },
    async remove(uri) {
      await delegate.remove(uri);
      trace(new File(uri).exists ? 'cleanup FAIL retained' : 'cleanup PASS file removed');
    },
    async clear() {
      await delegate.clear();
    },
  };
}

function acceptanceErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'unknown';
  const candidate = error as { code?: unknown; message?: unknown; name?: unknown };
  const code = typeof candidate.code === 'string' && /^[A-Za-z0-9._-]{1,80}$/u.test(candidate.code)
    ? candidate.code
    : typeof candidate.name === 'string' && /^[A-Za-z0-9._-]{1,80}$/u.test(candidate.name)
      ? candidate.name
      : 'unknown';
  if (typeof candidate.message === 'string') {
    const detail = candidate.message
      .replace(/https?:\/\/\S+/giu, '<url>')
      .replace(/file:\/\/\S+/giu, '<file>')
      .replace(/\s+/gu, ' ')
      .slice(-100);
    if (detail) return `${code}:${detail}`;
  }
  if (code !== 'unknown') return code;
  return 'unknown';
}

function tracedShareGateway(trace: (event: string) => void): NativeShareGateway {
  const delegate = createExpoShareGateway();
  return {
    async isAvailable() {
      const available = await delegate.isAvailable();
      trace(`sharing ${available ? 'PASS available' : 'FAIL unavailable'}`);
      return available;
    },
    async share(uri, options) {
      try {
        await delegate.share(uri, options);
        trace('sharing PASS sheet dismissed');
      } catch (error) {
        trace(`sharing FAIL ${acceptanceErrorCode(error)}`);
        throw error;
      }
    },
  };
}

function request(path: string, fileName = '032-synthetic.pdf') {
  return prepareProtectedFileRequest({
    requestId: `032-request-${path.replace(/[^a-z]/gu, '')}`,
    url: `${config.baseUrl}${path}`,
    disposition: 'view',
    fileName,
    mimeType: 'application/pdf',
  }, routePolicy);
}

export function PlatformCapabilityRuntimeAcceptanceApp() {
  const [events, setEvents] = useState<string[]>([`guard PASS loopback · ${Platform.OS}`]);
  const [busy, setBusy] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const trace = useCallback((event: string) => {
    console.info(`[032] ${event}`);
    setEvents((current) => [...current.slice(-5), event]);
  }, []);
  const capability = useMemo(
    () => new ProtectedFileCapability(tracedFileStore(trace), tracedShareGateway(trace)),
    [trace],
  );

  const verifyClipboard = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const written = await createExpoClipboardWriter()(inviteUrl);
      const exact = written && await Clipboard.getStringAsync() === inviteUrl;
      trace(exact ? 'clipboard PASS exact write' : 'clipboard FAIL');
    } catch {
      trace('clipboard FAIL');
    } finally {
      setBusy(false);
    }
  };

  const runProtected = async (path: string, label: string, expected: boolean) => {
    if (busy) return;
    const prepared = request(path);
    if (!prepared) {
      trace(`${label} FAIL request refused early`);
      return;
    }
    setBusy(true);
    const opened = await capability.run(prepared);
    await capability.clear();
    trace(opened === expected && cacheIsEmpty()
      ? `${label} PASS cache empty`
      : `${label} FAIL result=${String(opened)} cache=${cacheIsEmpty() ? 'empty' : 'retained'}`);
    setBusy(false);
  };

  const runRefusals = async () => {
    if (busy) return;
    setBusy(true);
    const active = request('/protected.pdf?ticket=synthetic-032', '032-active.html');
    if (active) {
      trace('active class FAIL accepted');
      setBusy(false);
      return;
    }
    trace('active class PASS refused');
    for (const [path, label] of [
      ['/disguised.pdf', 'malformed content'],
      ['/forbidden.pdf', 'status 403'],
      ['/expired.pdf', 'status 401'],
      ['/oversize.pdf', 'oversize'],
    ] as const) {
      const prepared = request(path);
      const opened = prepared ? await capability.run(prepared) : true;
      await capability.clear();
      trace(!opened && cacheIsEmpty() ? `${label} PASS refused+clean` : `${label} FAIL`);
    }
    setBusy(false);
  };

  const runCancellation = async () => {
    if (busy) return;
    const prepared = request('/slow.pdf');
    if (!prepared) {
      trace('cancel FAIL request');
      return;
    }
    setBusy(true);
    const operation = capability.run(prepared);
    setTimeout(() => void capability.clear(), 120);
    const opened = await operation;
    await capability.clear();
    trace(!opened && cacheIsEmpty() ? 'cancel PASS abort+clean' : 'cancel FAIL');
    setBusy(false);
  };

  const handlePickerMessage = (event: WebViewMessageEvent) => {
    try {
      const value = JSON.parse(event.nativeEvent.data) as { kind?: unknown; status?: unknown };
      if (value.kind === '032-picker-status' && typeof value.status === 'string' && value.status.length <= 160) {
        trace(value.status);
      }
    } catch {
      trace('picker message FAIL');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.banner}>
        <Text accessibilityRole="header" style={styles.title}>032 · LOCAL PLATFORM CAPABILITIES · {Platform.OS}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.events} testID="runtime-032-events">
          {events.join(' · ')}
        </Text>
      </View>
      <View style={styles.actions}>
        <Action
          label="WebView görsel seçiciyi aç"
          onPress={() => webViewRef.current?.injectJavaScript("document.getElementById('accepted-image')?.click(); true;")}
          disabled={busy}
          testID="runtime-032-picker"
        />
        <Action label="Korumalı PDF aç" onPress={() => void runProtected('/protected.pdf?ticket=synthetic-032', 'protected share', true)} disabled={busy} testID="runtime-032-protected" />
        <Action label="Retleri doğrula" onPress={() => void runRefusals()} disabled={busy} testID="runtime-032-refusals" />
        <Action label="İndirmeyi iptal et" onPress={() => void runCancellation()} disabled={busy} testID="runtime-032-cancel" />
        <Action label="Panoya yaz + doğrula" onPress={() => void verifyClipboard()} disabled={busy} testID="runtime-032-clipboard" />
      </View>
      <WebView
        ref={webViewRef}
        testID="runtime-032-webview"
        source={{ uri: `${config.baseUrl}/picker` }}
        originWhitelist={[config.baseUrl]}
        injectedJavaScript={WEBVIEW_IMAGE_INPUT_POLICY}
        injectedJavaScriptForMainFrameOnly
        javaScriptEnabled
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows={false}
        mediaCapturePermissionGrantType="deny"
        mixedContentMode="never"
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        onError={(event) => trace(`picker load FAIL ${event.nativeEvent.code}`)}
        onHttpError={(event) => trace(`picker HTTP FAIL ${event.nativeEvent.statusCode}`)}
        onLoadEnd={() => trace('picker load END')}
        onMessage={handlePickerMessage}
        style={styles.webview}
      />
    </SafeAreaView>
  );
}

function Action({ label, onPress, disabled, testID }: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  testID: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: disabled, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      testID={testID}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#07111f', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  banner: { minHeight: 74, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#164e63' },
  title: { color: '#38bdf8', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  events: { color: '#e2e8f0', fontSize: 10, lineHeight: 14, marginTop: 4 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 8, paddingVertical: 7, backgroundColor: '#0f172a' },
  action: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: '#38bdf8', borderRadius: 10, backgroundColor: '#111827' },
  pressed: { opacity: 0.72 },
  actionText: { color: '#f8fafc', fontSize: 13, fontWeight: '700' },
  webview: { flex: 1, backgroundColor: '#f7f8fb' },
});

registerRootComponent(PlatformCapabilityRuntimeAcceptanceApp);
