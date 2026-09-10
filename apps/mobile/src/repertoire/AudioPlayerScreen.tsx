import { useCallback, useRef } from 'react';
import {
  ActivityIndicator,
  type GestureResponderEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { theme } from '../ui/theme';
import { clampAudioPosition, formatAudioTime } from './audio-contract';
import { useAudioPlayback } from './AudioPlaybackProvider';

export function AudioPlayerScreen({ onBack }: { onBack: () => void }) {
  const playback = useAudioPlayback();
  const progressWidth = useRef(0);
  const progress = playback.duration > 0
    ? clampAudioPosition(playback.currentTime, playback.duration) / playback.duration
    : 0;

  const seekFromPress = useCallback((event: GestureResponderEvent) => {
    if (progressWidth.current <= 0) return;
    void playback.seekTo((event.nativeEvent.locationX / progressWidth.current) * playback.duration);
  }, [playback]);

  if (!playback.session) return null;

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
          <Text style={styles.title}>{playback.session.songTitle}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.trackList} accessibilityRole="radiogroup">
          {playback.session.tracks.map((track, index) => (
            <Pressable
              key={track.file.id}
              onPress={() => void playback.loadTrack(index)}
              accessibilityRole="radio"
              accessibilityState={{ checked: index === playback.selectedIndex }}
              accessibilityLabel={`${track.label}${track.supported ? '' : ', desteklenmiyor'}`}
              style={({ pressed }) => [
                styles.track,
                index === playback.selectedIndex && styles.trackSelected,
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
          <Text style={styles.nowPlaying}>{playback.selectedTrack?.label ?? 'Ses kaydı'}</Text>
          {playback.busy ? (
            <View style={styles.statusRow} testID="audio-loading">
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.muted}>{playback.loadingTicket ? 'Erişim bağlantısı hazırlanıyor…' : 'Ses yükleniyor…'}</Text>
            </View>
          ) : null}
          {playback.error ? (
            <View style={styles.errorBox} testID="audio-error">
              <Text style={styles.error}>{playback.error}</Text>
              {playback.selectedTrack?.supported ? (
                <Pressable
                  onPress={() => void playback.retry()}
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
              max: Math.max(0, Math.round(playback.duration)),
              now: Math.max(0, Math.round(playback.currentTime)),
              text: `${formatAudioTime(playback.currentTime)} / ${formatAudioTime(playback.duration)}`,
            }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(event) => {
              const delta = event.nativeEvent.actionName === 'increment' ? 10 : -10;
              void playback.seekTo(playback.currentTime + delta);
            }}
            disabled={!playback.canControl || playback.duration <= 0}
            style={styles.progressTouch}
            testID="audio-seek"
          >
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </Pressable>
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatAudioTime(playback.currentTime)}</Text>
            <Text style={styles.time}>{formatAudioTime(playback.duration)}</Text>
          </View>

          <View style={styles.controls}>
            <Pressable
              onPress={() => void playback.seekTo(playback.currentTime - 10)}
              disabled={!playback.canControl}
              accessibilityRole="button"
              accessibilityLabel="10 saniye geri git"
              accessibilityState={{ disabled: !playback.canControl }}
              style={({ pressed }) => [styles.control, !playback.canControl && styles.disabled, pressed && styles.pressed]}
              testID="audio-back-10"
            >
              <Text style={styles.controlText}>−10</Text>
            </Pressable>
            <Pressable
              onPress={() => void playback.togglePlayback()}
              disabled={playback.ticketExpiresAt === null || playback.loadingTicket || Boolean(playback.error)}
              accessibilityRole="button"
              accessibilityLabel={playback.playing ? 'Sesi duraklat' : 'Sesi oynat'}
              accessibilityState={{ disabled: playback.ticketExpiresAt === null || playback.loadingTicket || Boolean(playback.error) }}
              style={({ pressed }) => [styles.primaryControl, (playback.ticketExpiresAt === null || playback.loadingTicket || Boolean(playback.error)) && styles.disabled, pressed && styles.pressed]}
              testID="audio-play-pause"
            >
              <Text style={styles.primaryControlText}>{playback.playing ? 'Duraklat' : 'Oynat'}</Text>
            </Pressable>
            <Pressable
              onPress={() => void playback.seekTo(playback.currentTime + 10)}
              disabled={!playback.canControl}
              accessibilityRole="button"
              accessibilityLabel="10 saniye ileri git"
              accessibilityState={{ disabled: !playback.canControl }}
              style={({ pressed }) => [styles.control, !playback.canControl && styles.disabled, pressed && styles.pressed]}
              testID="audio-forward-10"
            >
              <Text style={styles.controlText}>+10</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={playback.changeRate}
            disabled={!playback.canControl}
            accessibilityRole="button"
            accessibilityLabel={`Oynatma hızı ${playback.playbackRate} kat`}
            accessibilityState={{ disabled: !playback.canControl }}
            style={({ pressed }) => [styles.speed, !playback.canControl && styles.disabled, pressed && styles.pressed]}
            testID="audio-speed"
          >
            <Text style={styles.controlText}>{playback.playbackRate}× hız</Text>
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
