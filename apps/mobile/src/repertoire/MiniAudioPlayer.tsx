import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { theme } from '../ui/theme';
import { formatAudioTime } from './audio-contract';
import { useAudioPlayback } from './AudioPlaybackProvider';

export function MiniAudioPlayer({ onOpen }: { onOpen: () => void }) {
  const playback = useAudioPlayback();
  if (!playback.session) return null;

  const playDisabled = playback.ticketExpiresAt === null
    || playback.loadingTicket
    || Boolean(playback.error);
  const stateText = playback.error
    ?? (playback.busy
      ? playback.loadingTicket ? 'Erişim hazırlanıyor…' : 'Ses yükleniyor…'
      : `${formatAudioTime(playback.currentTime)} / ${formatAudioTime(playback.duration)}`);

  return (
    <SafeAreaView style={styles.safeDock} testID="audio-mini-player">
      <View style={styles.dock}>
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel={`${playback.session.songTitle}, tam ses oynatıcıyı aç`}
          style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
          testID="audio-mini-open"
        >
          <Text style={styles.song} numberOfLines={1} ellipsizeMode="tail">
            {playback.session.songTitle}
          </Text>
          <Text
            style={[styles.track, playback.error && styles.error]}
            numberOfLines={1}
            ellipsizeMode="tail"
            testID="audio-mini-state"
          >
            {playback.selectedTrack?.label ?? 'Ses kaydı'} · {stateText}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => void playback.togglePlayback()}
          disabled={playDisabled}
          accessibilityRole="button"
          accessibilityLabel={playback.playing ? 'Küçük oynatıcıda sesi duraklat' : 'Küçük oynatıcıda sesi oynat'}
          accessibilityState={{ disabled: playDisabled }}
          style={({ pressed }) => [styles.control, playDisabled && styles.disabled, pressed && styles.pressed]}
          testID="audio-mini-play-pause"
        >
          <Text style={styles.controlText}>{playback.playing ? 'Duraklat' : 'Oynat'}</Text>
        </Pressable>
        <Pressable
          onPress={playback.close}
          accessibilityRole="button"
          accessibilityLabel="Küçük ses oynatıcıyı kapat"
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          testID="audio-mini-close"
        >
          <Text style={styles.closeText}>Kapat</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeDock: { backgroundColor: theme.colors.surface },
  dock: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  summary: { minHeight: 48, flex: 1, justifyContent: 'center' },
  song: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  track: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
  error: { color: theme.colors.danger },
  control: {
    minWidth: 72,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: theme.colors.accent,
  },
  controlText: { color: theme.colors.onAccent, fontSize: 12, fontWeight: '700' },
  close: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
