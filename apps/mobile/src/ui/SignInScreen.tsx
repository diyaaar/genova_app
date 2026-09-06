import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { theme } from './theme';

/** Password sign-in. Errors are always shown; a failed attempt starts no session. */
export function SignInScreen({
  onSignIn,
}: {
  onSignIn: (email: string, password: string) => Promise<{ error: string | null }>;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !password) {
      setError('E-posta ve parola gerekli.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await onSignIn(email.trim(), password);
      if (result.error) setError(result.error);
      else setPassword('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Giriş yapılamadı.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      testID="sign-in-screen"
    >
      <View style={styles.card}>
        <Text style={styles.title}>Genova</Text>
        <Text style={styles.subtitle}>Koro hesabınızla giriş yapın.</Text>

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="E-posta"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          accessibilityLabel="E-posta"
          testID="sign-in-email"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Parola"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          secureTextEntry
          accessibilityLabel="Parola"
          testID="sign-in-password"
        />

        {error ? (
          <Text style={styles.error} testID="sign-in-error">{error}</Text>
        ) : null}

        <Pressable
          style={[styles.button, busy && styles.buttonBusy]}
          onPress={submit}
          disabled={busy}
          accessibilityRole="button"
          testID="sign-in-submit"
        >
          <Text style={styles.buttonLabel}>{busy ? 'Giriş yapılıyor…' : 'Giriş yap'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: theme.spacing(3), backgroundColor: theme.colors.background },
  card: { gap: theme.spacing(1.5) },
  title: { color: theme.colors.text, fontSize: 30, fontWeight: '700' },
  subtitle: { color: theme.colors.textMuted, fontSize: 15, marginBottom: theme.spacing(1) },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1.75),
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
    fontSize: 16,
  },
  error: { color: theme.colors.danger, fontSize: 14 },
  button: {
    marginTop: theme.spacing(1),
    paddingVertical: theme.spacing(2),
    borderRadius: theme.radius,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
  },
  buttonBusy: { opacity: 0.6 },
  buttonLabel: { color: theme.colors.onAccent, fontWeight: '700', fontSize: 16 },
});
