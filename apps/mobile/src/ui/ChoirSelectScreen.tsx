import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ChoirMembershipOption } from '@shared/choir-context-core';
import { theme } from './theme';

/**
 * Shown whenever the server has not confirmed exactly one active choir. Until a choice
 * succeeds no data screen is rendered, so an unresolved selection stays fail-closed.
 */
export function ChoirSelectScreen({
  options,
  errorMessage,
  busy,
  onSelect,
  onSignOut,
}: {
  options: ChoirMembershipOption[];
  errorMessage: string | null;
  busy: boolean;
  onSelect: (choirId: string) => void;
  onSignOut: () => void;
}) {
  return (
    <View style={styles.container} testID="choir-select-screen">
      <Text style={styles.title}>Koro seçin</Text>
      <Text style={styles.subtitle}>Bu hesap birden fazla koroda kayıtlı.</Text>

      {errorMessage ? (
        <Text style={styles.error} testID="choir-select-error">{errorMessage}</Text>
      ) : null}

      <ScrollView contentContainerStyle={styles.list}>
        {options.map((option) => (
          <Pressable
            key={option.choir_id}
            style={[styles.option, busy && styles.optionBusy]}
            disabled={busy}
            onPress={() => onSelect(option.choir_id)}
            accessibilityRole="button"
            testID={`choir-option-${option.choir_id}`}
          >
            <Text style={styles.optionName}>{option.choir_name}</Text>
            {option.member_is_active ? null : (
              <Text style={styles.optionNote}>Üyelik pasif</Text>
            )}
          </Pressable>
        ))}
      </ScrollView>

      <Pressable onPress={onSignOut} accessibilityRole="button" testID="choir-select-sign-out">
        <Text style={styles.signOut}>Çıkış yap</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing(3), gap: theme.spacing(1), backgroundColor: theme.colors.background },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '700', marginTop: theme.spacing(4) },
  subtitle: { color: theme.colors.textMuted, fontSize: 15 },
  error: { color: theme.colors.danger, fontSize: 14 },
  list: { gap: theme.spacing(1.5), paddingVertical: theme.spacing(2) },
  option: {
    padding: theme.spacing(2),
    borderRadius: theme.radius,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  optionBusy: { opacity: 0.5 },
  optionName: { color: theme.colors.text, fontSize: 17, fontWeight: '600' },
  optionNote: { color: theme.colors.textMuted, fontSize: 13, marginTop: theme.spacing(0.5) },
  signOut: { color: theme.colors.textMuted, textAlign: 'center', paddingVertical: theme.spacing(2) },
});
