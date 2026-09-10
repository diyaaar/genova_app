import { useMemo, useState } from 'react';
import { registerRootComponent } from 'expo';
import { Platform, Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View } from 'react-native';
import type { RepertoireFile } from '@shared/repertuvar/catalog-core';
import { clearTenantCaches } from '../auth/tenant-cache';
import { AudioPlayerScreen } from '../repertoire/AudioPlayerScreen';
import type { NativeAudioTrack } from '../repertoire/audio-contract';
import type { NativeAudioSourceGateway } from '../repertoire/audio-source-gateway';
import { readAudioRuntimeAcceptanceConfig } from './audio-runtime-config';

const config = readAudioRuntimeAcceptanceConfig({
  EXPO_PUBLIC_GENOVA_026_ACCEPTANCE: process.env.EXPO_PUBLIC_GENOVA_026_ACCEPTANCE,
  EXPO_PUBLIC_GENOVA_026_AUDIO_URL: process.env.EXPO_PUBLIC_GENOVA_026_AUDIO_URL,
});

function file(id: string, name: string, mimeType: string): RepertoireFile {
  return {
    id,
    song_id: '026-synthetic-song',
    file_name: name,
    file_type: 'audio',
    partition_label: name.startsWith('tone') ? '440 Hz çalışma' : name.startsWith('corrupt') ? 'Bozuk ses' : 'Desteklenmeyen ses',
    drive_file_id: `026-${id}`,
    drive_web_view_link: null,
    drive_download_link: null,
    mime_type: mimeType,
    file_size_bytes: name.startsWith('tone') ? 160_044 : 24,
    uploaded_by: null,
    created_at: '2026-09-10T00:00:00Z',
    updated_at: '2026-09-10T00:00:00Z',
  };
}

const tracks: NativeAudioTrack[] = [
  { file: file('11111111-1111-4111-8111-111111111111', 'tone-440hz.wav', 'audio/wav'), label: '440 Hz çalışma', supported: true },
  { file: file('22222222-2222-4222-8222-222222222222', 'corrupt.wav', 'audio/wav'), label: 'Bozuk ses', supported: true },
  { file: file('33333333-3333-4333-8333-333333333333', 'unsupported.ogg', 'audio/ogg'), label: 'Desteklenmeyen ses', supported: false },
];

export function AudioRuntimeAcceptanceApp() {
  const [event, setEvent] = useState('guard PASS loopback+synthetic');
  const gateway = useMemo<NativeAudioSourceGateway>(() => {
    let version = 0;
    return {
      async open(fileId) {
        version += 1;
        const path = fileId === tracks[1]!.file.id ? 'corrupt.wav' : 'tone.wav';
        setEvent(`ticket ${version} PASS ${path}`);
        return {
          url: `${config.baseUrl}/${Platform.OS}/${path}?fileId=${fileId}&ticket=synthetic-${version}`,
          expiresAt: version === 1 ? Date.now() + 1_000 : Date.now() + 60_000,
        };
      },
      clear() {
        version += 1;
        setEvent(`tenant clear PASS owner stopped ${version}`);
      },
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.banner}>
        <View style={styles.bannerRow}>
          <Text style={styles.bannerTitle}>026 · LOCAL SYNTHETIC AUDIO · {Platform.OS}</Text>
          <Pressable
            onPress={() => void clearTenantCaches()}
            accessibilityRole="button"
            accessibilityLabel="Tenant ses durumunu temizle"
            testID="runtime-026-clear"
          >
            <Text style={styles.bannerAction}>Temizle</Text>
          </Pressable>
        </View>
        <Text style={styles.event} testID="runtime-026-event">{event}</Text>
      </View>
      <View style={styles.app}>
        <AudioPlayerScreen songTitle="026 Sentetik Prova" tracks={tracks} gateway={gateway} onBack={() => setEvent('back PASS player closed')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#07111f' },
  banner: { minHeight: 58, paddingHorizontal: 12, paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 6 : 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#164e63' },
  bannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerTitle: { color: '#38bdf8', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  bannerAction: { color: '#7dd3fc', fontSize: 11, fontWeight: '700', padding: 12 },
  event: { color: '#cbd5e1', fontSize: 10, marginTop: 2 },
  app: { flex: 1 },
});

registerRootComponent(AudioRuntimeAcceptanceApp);
