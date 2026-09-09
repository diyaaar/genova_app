import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { registerRootComponent } from 'expo';
import { File } from 'expo-file-system';
import { Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { requestProtectedRepertoireFileTicket } from '@shared/repertuvar/protected-file-client';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { nativeChoirPreferenceKey } from '../auth/choir-preference';
import { getGenovaClient, secureKeyValueStore } from '../auth/supabase-client';
import { createSupabaseAnnotationSource } from '../repertoire/annotation-source';
import { createExpoPrivateScoreFileStore } from '../repertoire/expo-private-file-store';
import { nativePdfRenderer } from '../repertoire/pdf-renderer';
import type { PrivateScoreFileStore } from '../repertoire/private-file-store';
import { createNativeScoreReaderGateway } from '../repertoire/reader-gateway';
import { AppRoot } from '../ui/AppRoot';
import { readRuntimeLifecycleConfig } from './runtime-lifecycle-config';

const config = readRuntimeLifecycleConfig({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_GENOVA_021_EMAIL: process.env.EXPO_PUBLIC_GENOVA_021_EMAIL,
  EXPO_PUBLIC_GENOVA_021_PASSWORD: process.env.EXPO_PUBLIC_GENOVA_021_PASSWORD,
  EXPO_PUBLIC_GENOVA_021_CHOIR_A: process.env.EXPO_PUBLIC_GENOVA_021_CHOIR_A,
  EXPO_PUBLIC_GENOVA_021_CHOIR_B: process.env.EXPO_PUBLIC_GENOVA_021_CHOIR_B,
  EXPO_PUBLIC_GENOVA_021_FILE_ID: process.env.EXPO_PUBLIC_GENOVA_021_FILE_ID,
});
const client = getGenovaClient();

type Trace = (event: string) => void;

function fileExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

function tracedFileStore(trace: Trace): PrivateScoreFileStore {
  const store = createExpoPrivateScoreFileStore();
  return {
    async download(input) {
      const result = await store.download(input);
      trace(`download PASS ${result.size}B`);
      return result;
    },
    async remove(uri) {
      await store.remove(uri);
      trace(fileExists(uri) ? 'reader close FAIL file retained' : 'reader close PASS file removed');
    },
    async clear() {
      await store.clear();
      trace('tenant cache clear PASS');
    },
  };
}

function AcceptanceAutomation({ trace, onIdentity }: {
  trace: Trace;
  onIdentity: (userId: string) => void;
}) {
  const auth = useAuth();
  const loginAttempted = useRef(false);
  const isolationChecked = useRef(false);

  useEffect(() => {
    if (auth.phase !== 'signed-out' || loginAttempted.current) return;
    loginAttempted.current = true;
    void auth.signIn(config.email, config.password).then(({ error }) => {
      trace(error ? `auth FAIL ${error}` : 'auth PASS synthetic session');
    });
  }, [auth, trace]);

  useEffect(() => {
    if (auth.user?.id) {
      onIdentity(auth.user.id);
      trace('session identity PASS captured');
    }
  }, [auth.user?.id, onIdentity, trace]);

  useEffect(() => {
    if (auth.phase !== 'ready' || auth.activeChoir?.choir_id !== config.choirB || isolationChecked.current) return;
    isolationChecked.current = true;
    void (async () => {
      const { data } = await client.auth.getSession();
      try {
        await requestProtectedRepertoireFileTicket({
          endpoint: new URL('/functions/v1/repertoire-file', config.supabaseUrl).toString(),
          accessToken: data.session?.access_token ?? '',
          fileId: config.fileId,
        });
        trace('choir B isolation FAIL ticket issued');
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        trace(message.includes('yetkiniz yok') ? 'choir B isolation PASS 403' : 'choir B isolation FAIL');
      }
    })();
  }, [auth.activeChoir?.choir_id, auth.phase, trace]);

  return null;
}

export function RuntimeLifecycleAcceptanceApp() {
  const [events, setEvents] = useState<string[]>(['guard PASS loopback+synthetic']);
  const [capturedUserId, setCapturedUserId] = useState<string | null>(null);
  const trace = useCallback<Trace>((event) => {
    console.info(`[021] ${event}`);
    setEvents((current) => [...current.slice(-4), event]);
  }, []);
  const firstTicketAttempt = useRef(true);
  const readerGateway = useMemo(() => createNativeScoreReaderGateway({
    endpoint: new URL('/functions/v1/repertoire-file', config.supabaseUrl).toString(),
    session: {
      async getAccessToken() {
        const { data, error } = await client.auth.getSession();
        if (error) throw new Error(error.message);
        return data.session?.access_token ?? null;
      },
    },
    annotations: createSupabaseAnnotationSource(client),
    files: tracedFileStore(trace),
    pdf: nativePdfRenderer,
    async requestTicket(input) {
      if (firstTicketAttempt.current) {
        firstTicketAttempt.current = false;
        try {
          await requestProtectedRepertoireFileTicket({ ...input, accessToken: 'invalid-021-local-jwt' });
        } catch (error) {
          trace('first open PASS actual service refusal');
          throw error;
        }
        throw new Error('021 ilk reddetme tetiklenemedi.');
      }
      const ticket = await requestProtectedRepertoireFileTicket(input);
      trace('retry PASS fresh service ticket');
      return ticket;
    },
  }), [trace]);

  const verifySignedOutState = async () => {
    trace('sign-out check RUNNING');
    if (!capturedUserId) {
      trace('sign-out check FAIL identity missing');
      return;
    }
    try {
      const within = <T,>(promise: Promise<T>, label: string) => Promise.race([
        promise,
        new Promise<never>((_resolve, reject) => {
          setTimeout(() => reject(new Error(label)), 3_000);
        }),
      ]);
      const preference = await within(
        secureKeyValueStore.getItemAsync(nativeChoirPreferenceKey(capturedUserId)),
        'preference',
      );
      trace(preference === null ? 'preference read PASS empty' : 'preference read FAIL retained');
      const { data } = await within(client.auth.getSession(), 'session');
      trace(!data.session && preference === null
        ? 'sign-out PASS session+preference cleared'
        : 'sign-out FAIL retained private auth state');
    } catch (error) {
      const label = error instanceof Error ? error.message : 'unknown';
      trace(`sign-out check FAIL ${label} timeout`);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.banner} testID="runtime-021-banner">
        <View style={styles.bannerTitleRow}>
          <Text style={styles.title}>021 · LOCAL SYNTHETIC SERVICE</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void verifySignedOutState()}
            testID="runtime-021-verify-sign-out"
          >
            <Text style={styles.verify}>Temizliği doğrula</Text>
          </Pressable>
        </View>
        <Text style={styles.events} numberOfLines={3} testID="runtime-021-events">
          {events.join(' · ')}
        </Text>
      </View>
      <View style={styles.app}>
        <AuthProvider client={client}>
          <AcceptanceAutomation trace={trace} onIdentity={setCapturedUserId} />
          <AppRoot readerGateway={readerGateway} />
        </AuthProvider>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#07111f',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  banner: { minHeight: 58, paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#164e63' },
  bannerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#38bdf8', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  verify: { color: '#7dd3fc', fontSize: 9, fontWeight: '700' },
  events: { color: '#cbd5e1', fontSize: 9, lineHeight: 12, marginTop: 3 },
  app: { flex: 1 },
});

registerRootComponent(RuntimeLifecycleAcceptanceApp);
