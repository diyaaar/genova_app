import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from './theme';

/** Shared frame for the shell's non-data states, so no failure ends on a blank screen. */
export function StatusScreen({
  title,
  message,
  tone = 'neutral',
  busy = false,
  actionLabel,
  onAction,
  testID,
}: {
  title: string;
  message?: string;
  tone?: 'neutral' | 'error';
  busy?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}) {
  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      {busy ? <ActivityIndicator color={theme.colors.accent} /> : null}
      {message ? (
        <Text style={[styles.message, tone === 'error' && styles.error]}>{message}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable style={styles.button} onPress={onAction} accessibilityRole="button">
          <Text style={styles.buttonLabel}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1.5),
    padding: theme.spacing(3),
    backgroundColor: theme.colors.background,
  },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '600', textAlign: 'center' },
  message: { color: theme.colors.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  error: { color: theme.colors.danger },
  button: {
    marginTop: theme.spacing(1),
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(3),
    borderRadius: theme.radius,
    backgroundColor: theme.colors.accent,
  },
  buttonLabel: { color: theme.colors.onAccent, fontWeight: '700' },
});
