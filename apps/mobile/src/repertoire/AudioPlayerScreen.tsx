import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  type GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  type AudioSource,
} from 'expo-audio';
import { registerTenantCache } from '../auth/tenant-cache';
import { theme } from '../ui/theme';
import {
  clampAudioPosition,
  formatAudioTime,
  getNextPlaybackRate,
  shouldRefreshAudioTicket,
  type NativeAudioTrack,
} from './audio-contract';
import type { NativeAudioSourceGateway } from './audio-source-gateway';
import { getDefaultAudioSourceGateway } from './default-audio-source-gateway';

interface AudioPlayerScreenProps {
  songTitle: string;
  tracks: NativeAudioTrack[];
  gateway?: NativeAudioSourceGateway;
  onBack: () => void;
}

interface PendingPlayback {
  requestVersion: number;
  autoplay: boolean;
  resumeAt: number;
}

export function AudioPlayerScreen({ songTitle, tracks, gateway: suppliedGateway, onBack }: AudioPlayerScreenProps) {
  const gateway = useMemo(
    () => suppliedGateway ?? getDefaultAudioSourceGateway(),
    [suppliedGateway],
  );
  const [audioSource, setAudioSource] = useState<AudioSource>(null);
  const player = useAudioPlayer(audioSource, { updateInterval: 250 });
  const status = useAudioPlayerStatus(player);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [ticketExpiresAt, setTicketExpiresAt] = useState<number | null>(null);
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const playbackRateRef = useRef(1);
  const playerRef = useRef(player);
  const requestVersion = useRef(0);
  const initialTrackId = useRef<string | null>(null);
  const progressWidth = useRef(0);
  const pendingPlayback = useRef<PendingPlayback | null>(null);
  const playbackLoadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectedTrack = tracks[selectedIndex] ?? null;
  playerRef.current = player;

  const clearPlaybackLoadTimer = useCallback(() => {
    if (playbackLoadTimer.current) clearTimeout(playbackLoadTimer.current);
    playbackLoadTimer.current = null;
  }, []);

  const startPlaybackLoadTimer = useCallback(() => {
    clearPlaybackLoadTimer();
    playbackLoadTimer.current = setTimeout(() => {
      playbackLoadTimer.current = null;
      playerRef.current.pause();
      setError('Ses dosyası oynatılamadı. Yeniden deneyin.');
    }, 8_000);
  }, [clearPlaybackLoadTimer]);

  const disposePrivatePlayback = useCallback(() => {
    requestVersion.current += 1;
    pendingPlayback.current = null;
    clearPlaybackLoadTimer();
    gateway.clear();
    playerRef.current.pause();
  }, [clearPlaybackLoadTimer, gateway]);

  const clearPrivatePlayback = useCallback(() => {
    disposePrivatePlayback();
    setAudioSource(null);
    setTicketExpiresAt(null);
    setLoadingTicket(false);
    setError(null);
  }, [disposePrivatePlayback]);

  const loadTrack = useCallback(async (
    index: number,
    { autoplay = false, resumeAt = 0 }: { autoplay?: boolean; resumeAt?: number } = {},
  ) => {
    const track = tracks[index];
    if (!track) return;
    setSelectedIndex(index);
    setTicketExpiresAt(null);
    setError(null);
    pendingPlayback.current = null;
    setAudioSource(null);
    if (!track.supported) {
      requestVersion.current += 1;
      gateway.clear();
      setLoadingTicket(false);
      setError('Bu ses biçimi mobil oynatıcıda desteklenmiyor.');
      return;
    }

    const version = ++requestVersion.current;
    setLoadingTicket(true);
    try {
      const ticket = await gateway.open(track.file.id);
      if (requestVersion.current !== version) return;
      pendingPlayback.current = { requestVersion: version, autoplay, resumeAt };
      setTicketExpiresAt(ticket.expiresAt);
      setAudioSource({ uri: ticket.url, name: track.label });
      if (autoplay) startPlaybackLoadTimer();
    } catch (loadError) {
      if (requestVersion.current !== version) return;
      setError(loadError instanceof Error ? loadError.message : 'Ses dosyası açılamadı.');
    } finally {
      if (requestVersion.current === version) setLoadingTicket(false);
    }
  }, [gateway, startPlaybackLoadTimer, tracks]);

  useEffect(() => {
    const firstTrackId = tracks[0]?.file.id ?? null;
    if (!firstTrackId || initialTrackId.current === firstTrackId) return;
    initialTrackId.current = firstTrackId;
    void loadTrack(0);
  }, [loadTrack, tracks]);

  useEffect(() => {
    const unregisterPlayer = registerTenantCache(clearPrivatePlayback);
    return () => {
      unregisterPlayer();
      disposePrivatePlayback();
    };
  }, [clearPrivatePlayback, disposePrivatePlayback]);

  useEffect(() => {
    if (ticketExpiresAt !== null) player.setPlaybackRate(playbackRateRef.current);
  }, [player, ticketExpiresAt]);

  useEffect(() => {
    const pending = pendingPlayback.current;
    if (!pending || !status.isLoaded || pending.requestVersion !== requestVersion.current) return;
    pendingPlayback.current = null;
    const resumeAt = clampAudioPosition(pending.resumeAt, status.duration);
    const resume = async () => {
      if (resumeAt > 0) await player.seekTo(resumeAt);
      if (pending.autoplay) player.play();
    };
    void resume().catch(() => setError('Ses kaldığı yerden başlatılamadı.'));
  }, [player, status.duration, status.isLoaded, ticketExpiresAt]);

  useEffect(() => {
    if (status.isLoaded || status.playing || status.error) clearPlaybackLoadTimer();
    if (status.error) setError('Ses dosyası oynatılamadı. Yeniden deneyin.');
  }, [clearPlaybackLoadTimer, status.error, status.isLoaded, status.playing]);

  const togglePlayback = useCallback(async () => {
    if (!selectedTrack || loadingTicket || error || ticketExpiresAt === null) return;
    if (status.playing) {
      player.pause();
      return;
    }
    if (shouldRefreshAudioTicket(ticketExpiresAt)) {
      await loadTrack(selectedIndex, { autoplay: true, resumeAt: status.currentTime });
      return;
    }
    if (!status.isLoaded) startPlaybackLoadTimer();
    player.play();
  }, [error, loadTrack, loadingTicket, player, selectedIndex, selectedTrack, startPlaybackLoadTimer, status.currentTime, status.isLoaded, status.playing, ticketExpiresAt]);

  const seekTo = useCallback(async (seconds: number) => {
    if (ticketExpiresAt === null || !status.isLoaded || status.duration <= 0) return;
    try {
      await player.seekTo(clampAudioPosition(seconds, status.duration));
    } catch {
      setError('Ses içinde istenen konuma gidilemedi.');
    }
  }, [player, status.duration, status.isLoaded, ticketExpiresAt]);

  const seekFromPress = useCallback((event: GestureResponderEvent) => {
    if (progressWidth.current <= 0) return;
    void seekTo((event.nativeEvent.locationX / progressWidth.current) * status.duration);
  }, [seekTo, status.duration]);

  const changeRate = useCallback(() => {
    const next = getNextPlaybackRate(playbackRate);
    playbackRateRef.current = next;
    setPlaybackRate(next);
    player.setPlaybackRate(next);
  }, [playbackRate, player]);

  const hasSource = ticketExpiresAt !== null;
  const canControl = hasSource && status.isLoaded;
  const currentTime = hasSource ? status.currentTime : 0;
  const duration = hasSource ? status.duration : 0;
  const progress = duration > 0
    ? clampAudioPosition(currentTime, duration) / duration
    : 0;
  const busy = !error && (loadingTicket || (hasSource && (status.isBuffering || !status.isLoaded)));

  return (
    <View style={styles.container} testID="audio-player-screen">
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Ses oynatıcıdan repertuvara dön"
          style={({ pressed }) => [styles.touchButton, pressed && styles.pressed]}
          testID="audio-player-back"
        >
          <Text style={styles.action}>Geri</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>Ses çalışması</Text>
          <Text style={styles.title}>{songTitle}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.trackList} accessibilityRole="radiogroup">
          {tracks.map((track, index) => (
            <Pressable
              key={track.file.id}
              onPress={() => void loadTrack(index)}
              accessibilityRole="radio"
              accessibilityState={{ checked: index === selectedIndex }}
              accessibilityLabel={`${track.label}${track.supported ? '' : ', desteklenmiyor'}`}
              style={({ pressed }) => [
                styles.track,
                index === selectedIndex && styles.trackSelected,
                !track.supported && styles.disabled,
                pressed && styles.pressed,
              ]}
              testID={`audio-track-${track.file.id}`}
            >
              <Text style={styles.trackLabel}>{track.label}</Text>
              <Text style={styles.trackMeta}>{track.supported ? 'Ses kaydı' : 'Desteklenmeyen biçim'}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.playerCard}>
          <Text style={styles.nowPlaying}>{selectedTrack?.label ?? 'Ses kaydı'}</Text>
          {busy ? (
            <View style={styles.statusRow} testID="audio-loading">
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.muted}>{loadingTicket ? 'Erişim bağlantısı hazırlanıyor…' : 'Ses yükleniyor…'}</Text>
            </View>
          ) : null}
          {error ? (
            <View style={styles.errorBox} testID="audio-error">
              <Text style={styles.error}>{error}</Text>
              {selectedTrack?.supported ? (
                <Pressable
                  onPress={() => void loadTrack(selectedIndex)}
                  accessibilityRole="button"
                  accessibilityLabel="Ses dosyasını yeniden yükle"
                  style={({ pressed }) => [styles.touchButton, pressed && styles.pressed]}
                  testID="audio-retry"
                >
                  <Text style={styles.action}>Tekrar dene</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <Pressable
            onPress={seekFromPress}
            onLayout={(event) => { progressWidth.current = event.nativeEvent.layout.width; }}
            accessibilityRole="adjustable"
            accessibilityLabel="Ses konumu"
            accessibilityValue={{
              min: 0,
              max: Math.max(0, Math.round(duration)),
              now: Math.max(0, Math.round(currentTime)),
              text: `${formatAudioTime(currentTime)} / ${formatAudioTime(duration)}`,
            }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(event) => {
              const delta = event.nativeEvent.actionName === 'increment' ? 10 : -10;
              void seekTo(currentTime + delta);
            }}
            disabled={!canControl || duration <= 0}
            style={styles.progressTouch}
            testID="audio-seek"
          >
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </Pressable>
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatAudioTime(currentTime)}</Text>
            <Text style={styles.time}>{formatAudioTime(duration)}</Text>
          </View>

          <View style={styles.controls}>
            <Pressable
              onPress={() => void seekTo(currentTime - 10)}
              disabled={!canControl}
              accessibilityRole="button"
              accessibilityLabel="10 saniye geri git"
              accessibilityState={{ disabled: !canControl }}
              style={({ pressed }) => [styles.control, !canControl && styles.disabled, pressed && styles.pressed]}
              testID="audio-back-10"
            >
              <Text style={styles.controlText}>−10</Text>
            </Pressable>
            <Pressable
              onPress={() => void togglePlayback()}
              disabled={ticketExpiresAt === null || loadingTicket || Boolean(error)}
              accessibilityRole="button"
              accessibilityLabel={status.playing ? 'Sesi duraklat' : 'Sesi oynat'}
              accessibilityState={{ disabled: ticketExpiresAt === null || loadingTicket || Boolean(error) }}
              style={({ pressed }) => [styles.primaryControl, (ticketExpiresAt === null || loadingTicket || Boolean(error)) && styles.disabled, pressed && styles.pressed]}
              testID="audio-play-pause"
            >
              <Text style={styles.primaryControlText}>{status.playing ? 'Duraklat' : 'Oynat'}</Text>
            </Pressable>
            <Pressable
              onPress={() => void seekTo(currentTime + 10)}
              disabled={!canControl}
              accessibilityRole="button"
              accessibilityLabel="10 saniye ileri git"
              accessibilityState={{ disabled: !canControl }}
              style={({ pressed }) => [styles.control, !canControl && styles.disabled, pressed && styles.pressed]}
              testID="audio-forward-10"
            >
              <Text style={styles.controlText}>+10</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={changeRate}
            disabled={!canControl}
            accessibilityRole="button"
            accessibilityLabel={`Oynatma hızı ${playbackRate} kat`}
            accessibilityState={{ disabled: !canControl }}
            style={({ pressed }) => [styles.speed, !canControl && styles.disabled, pressed && styles.pressed]}
            testID="audio-speed"
          >
            <Text style={styles.controlText}>{playbackRate}× hız</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing(3), paddingTop: theme.spacing(5), backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  headerText: { flex: 1 },
  kicker: { color: theme.colors.textMuted, fontSize: 12 },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '700' },
  content: { gap: theme.spacing(2), paddingVertical: theme.spacing(3) },
  touchButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  action: { color: theme.colors.accent, fontSize: 14, fontWeight: '600' },
  trackList: { gap: theme.spacing(1) },
  track: { minHeight: 48, paddingHorizontal: theme.spacing(2), paddingVertical: 10, borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  trackSelected: { borderColor: theme.colors.accent },
  trackLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
  trackMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  playerCard: { gap: theme.spacing(1.5), padding: theme.spacing(2), borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  nowPlaying: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
  statusRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1) },
  muted: { color: theme.colors.textMuted, fontSize: 14 },
  errorBox: { minHeight: 48, gap: theme.spacing(1), alignItems: 'flex-start' },
  error: { color: theme.colors.danger, fontSize: 14, lineHeight: 20 },
  progressTouch: { minHeight: 44, justifyContent: 'center' },
  progressTrack: { height: 8, overflow: 'hidden', borderRadius: 999, backgroundColor: theme.colors.border },
  progressFill: { height: '100%', borderRadius: 999, backgroundColor: theme.colors.accent },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: theme.colors.textMuted, fontSize: 12 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing(1) },
  control: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border },
  primaryControl: { minWidth: 104, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: theme.colors.accent },
  controlText: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  primaryControlText: { color: theme.colors.onAccent, fontSize: 14, fontWeight: '700' },
  speed: { minHeight: 48, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing(2), borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
