import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { BridgeDiagnostic } from '@shared/mobile-webview-bridge';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { getGenovaClient } from '../auth/supabase-client';
import { NativeWebViewScreen } from '../webview/NativeWebViewScreen';
import { createNativeWebViewRuntimeConfig } from '../webview/runtime-config';
import type { NativeBridgeSnapshot } from '../webview/native-bridge-controller';
import { readComposedWebViewRuntimeConfig } from './composed-webview-runtime-config';

const config = readComposedWebViewRuntimeConfig({
  EXPO_PUBLIC_GENOVA_033_ACCEPTANCE: process.env.EXPO_PUBLIC_GENOVA_033_ACCEPTANCE,
  EXPO_PUBLIC_GENOVA_033_APP_ORIGIN: process.env.EXPO_PUBLIC_GENOVA_033_APP_ORIGIN,
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_GENOVA_033_EMAIL: process.env.EXPO_PUBLIC_GENOVA_033_EMAIL,
  EXPO_PUBLIC_GENOVA_033_PASSWORD: process.env.EXPO_PUBLIC_GENOVA_033_PASSWORD,
  EXPO_PUBLIC_GENOVA_033_CHORIST_EMAIL: process.env.EXPO_PUBLIC_GENOVA_033_CHORIST_EMAIL,
  EXPO_PUBLIC_GENOVA_033_CHORIST_PASSWORD: process.env.EXPO_PUBLIC_GENOVA_033_CHORIST_PASSWORD,
  EXPO_PUBLIC_GENOVA_033_CHOIR_A: process.env.EXPO_PUBLIC_GENOVA_033_CHOIR_A,
  EXPO_PUBLIC_GENOVA_033_CHOIR_B: process.env.EXPO_PUBLIC_GENOVA_033_CHOIR_B,
  EXPO_PUBLIC_GENOVA_033_MEMBER_A: process.env.EXPO_PUBLIC_GENOVA_033_MEMBER_A,
  EXPO_PUBLIC_GENOVA_033_TARGET_MEMBER: process.env.EXPO_PUBLIC_GENOVA_033_TARGET_MEMBER,
  EXPO_PUBLIC_GENOVA_033_ANNOUNCEMENT_ID: process.env.EXPO_PUBLIC_GENOVA_033_ANNOUNCEMENT_ID,
});
const client = getGenovaClient();

const ROUTES = [
  ['/announcements', 'Duyurular'],
  [`/announcements/${config.announcementId}`, 'Duyuru ayrıntı'],
  ['/koristler', 'Koristler'],
  [`/koristler/${config.targetMember}`, 'Korist ayrıntı'],
  ['/koristler/davetler', 'Davetler'],
  ['/profil', 'Profil'],
  ['/profil/duzenle', 'Profil düzenle'],
  ['/profil/degisiklikler', 'Talepler'],
  ['/devamsizlik?date=2026-09-12', 'Devamsızlık'],
] as const;

type Trace = (event: string) => void;

function redactedDiagnostic(diagnostic: BridgeDiagnostic): string {
  return [diagnostic.type, diagnostic.outcome, diagnostic.reasonCode, diagnostic.routeFamily]
    .filter(Boolean)
    .join(':');
}

function ComposedRuntime({ trace }: { trace: Trace }) {
  const auth = useAuth();
  const loginAttempted = useRef(false);
  const selectedAttempted = useRef(false);
  const identityTransition = useRef(false);
  const leaseRequests = useRef(0);
  const [path, setPath] = useState<string>('/announcements');
  const [exitState, setExitState] = useState<string | null>(null);
  const [instanceNonce, setInstanceNonce] = useState(0);

  useEffect(() => {
    if (auth.phase !== 'signed-out' || loginAttempted.current) return;
    loginAttempted.current = true;
    void auth.signIn(config.email, config.password).then(({ error }) => {
      trace(error ? `auth FAIL ${error}` : 'auth PASS synthetic session');
    });
  }, [auth, trace]);

  useEffect(() => {
    if (auth.phase !== 'selection-required' || selectedAttempted.current) return;
    selectedAttempted.current = true;
    void auth.selectChoir(config.choirA).then(() => trace('choir PASS selected A'));
  }, [auth, trace]);

  const runtimeConfig = useMemo(() => createNativeWebViewRuntimeConfig({
    initialPath: path,
    isDevelopment: true,
    developmentOrigin: config.appOrigin,
    protectedFileOrigins: [config.supabaseUrl],
  }), [path]);

  const onSnapshot = useCallback((snapshot: NativeBridgeSnapshot) => {
    trace(`snapshot ${snapshot.phase}:${snapshot.routeFamily}:${snapshot.canGoBackWithinWeb ? 'back' : 'root'}`);
  }, [trace]);

  const getLease = useCallback(async () => {
    const requestNumber = ++leaseRequests.current;
    try {
      const lease = await auth.getWebViewLease();
      trace(`lease PASS #${requestNumber} ttl=${Math.max(0, lease.expiresAt - Math.floor(Date.now() / 1000))}`);
      return lease;
    } catch (error) {
      trace(`lease FAIL #${requestNumber}`);
      throw error;
    }
  }, [auth, trace]);

  const switchIdentity = useCallback(async (kind: 'admin' | 'chorist') => {
    if (identityTransition.current) return;
    identityTransition.current = true;
    loginAttempted.current = true;
    selectedAttempted.current = kind === 'chorist';
    setExitState(null);
    trace(`identity RUNNING ${kind}`);
    try {
      await auth.signOut();
      const result = await auth.signIn(
        kind === 'admin' ? config.email : config.choristEmail,
        kind === 'admin' ? config.password : config.choristPassword,
      );
      trace(result.error ? `identity FAIL ${kind}` : `identity PASS ${kind}`);
    } finally {
      identityTransition.current = false;
    }
  }, [auth, trace]);

  if (auth.phase !== 'ready' || !auth.activeChoir) {
    return (
      <View style={styles.status}>
        <Text accessibilityRole="header" style={styles.statusTitle}>033 · oturum hazırlanıyor</Text>
        <Text style={styles.statusText}>{auth.phase}{auth.errorMessage ? ` · ${auth.errorMessage}` : ''}</Text>
      </View>
    );
  }

  return (
    <View style={styles.runtime}>
      <ScrollView
        horizontal
        contentContainerStyle={styles.routeControls}
        style={styles.routeScroller}
        testID="runtime-033-routes"
      >
        {ROUTES.map(([route, label]) => (
          <Pressable
            key={route}
            accessibilityRole="button"
            accessibilityState={{ selected: path === route }}
            onPress={() => { setExitState(null); setPath(route); }}
            style={[styles.routeButton, path === route && styles.routeButtonSelected]}
            testID={`runtime-033-route-${label}`}
          >
            <Text style={styles.routeButtonText}>{label}</Text>
          </Pressable>
        ))}
        <RuntimeAction label="Koro A" onPress={() => void auth.selectChoir(config.choirA)
          .then(() => trace('tenant PASS selected A'))} testID="runtime-033-tenant-a" />
        <RuntimeAction label="Koro B" onPress={() => void auth.selectChoir(config.choirB)
          .then(() => trace('tenant PASS selected B'))} testID="runtime-033-tenant-b" />
        <RuntimeAction label="Şef oturumu" onPress={() => void switchIdentity('admin')} testID="runtime-033-admin" />
        <RuntimeAction label="Korist oturumu" onPress={() => void switchIdentity('chorist')} testID="runtime-033-chorist" />
        <RuntimeAction label="WebView yenile" onPress={() => {
          trace('reload RUNNING new instance');
          setInstanceNonce((current) => current + 1);
        }} testID="runtime-033-reload" />
      </ScrollView>
      {exitState ? <Text accessibilityLiveRegion="polite" style={styles.exitState}>{exitState}</Text> : null}
      <View style={styles.webview}>
        <NativeWebViewScreen
          key={`${path}:${auth.activeChoir.member_id}:${instanceNonce}`}
          initialPath={path}
          runtimeConfig={runtimeConfig}
          getLease={getLease}
          changePassword={auth.changePassword}
          onBridgeSnapshot={onSnapshot}
          onDiagnostic={(diagnostic) => trace(`bridge ${redactedDiagnostic(diagnostic)}`)}
          onNativeRoute={(route) => {
            const value = `native route PASS ${route}`;
            trace(value);
            setExitState(value);
          }}
          onExit={() => {
            trace('native exit PASS');
            setExitState('native exit PASS');
          }}
          onSignOut={async () => {
            trace('sign-out RUNNING');
            await auth.signOut();
            trace('sign-out PASS native session cleared');
          }}
        />
      </View>
    </View>
  );
}

function RuntimeAction({ label, onPress, testID }: { label: string; onPress: () => void; testID: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.actionButton} testID={testID}>
      <Text style={styles.routeButtonText}>{label}</Text>
    </Pressable>
  );
}

export default function ComposedWebViewRuntimeAcceptanceApp() {
  const [events, setEvents] = useState<string[]>([`guard PASS exact local · ${Platform.OS}`]);
  const trace = useCallback<Trace>((event) => {
    console.info(`[033] ${event}`);
    setEvents((current) => [...current.slice(-5), event]);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.banner} testID="runtime-033-banner">
        <Text accessibilityRole="header" style={styles.title}>033 · COMPOSED WEBVIEW · RELEASE · {Platform.OS}</Text>
        <Text accessibilityLiveRegion="polite" numberOfLines={3} style={styles.events} testID="runtime-033-events">
          {events.join(' · ')}
        </Text>
      </View>
      <AuthProvider client={client}>
        <ComposedRuntime trace={trace} />
      </AuthProvider>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#07111f', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  banner: { minHeight: 58, paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#164e63' },
  title: { color: '#38bdf8', fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  events: { color: '#cbd5e1', fontSize: 9, lineHeight: 12, marginTop: 3 },
  runtime: { flex: 1 },
  routeScroller: { flexGrow: 0, maxHeight: 66 },
  routeControls: { alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 5 },
  routeButton: { minHeight: 48, justifyContent: 'center', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 10 },
  routeButtonSelected: { borderColor: '#38bdf8', backgroundColor: '#0f2538' },
  actionButton: { minHeight: 48, justifyContent: 'center', borderWidth: 1, borderColor: '#a78bfa', borderRadius: 10, paddingHorizontal: 10 },
  routeButtonText: { color: '#f8fafc', fontSize: 12, fontWeight: '700' },
  exitState: { color: '#86efac', paddingHorizontal: 10, paddingVertical: 4, fontSize: 11, fontWeight: '700' },
  webview: { flex: 1 },
  status: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  statusTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '700' },
  statusText: { color: '#cbd5e1', fontSize: 14 },
});
