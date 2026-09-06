import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChoirMembershipOption } from '@shared/choir-context-core';
import { theme } from './theme';

/**
 * Smallest shell that proves the flow: it names the server-confirmed active choir and
 * offers switch and sign-out. Repertoire, PDF, chat, assignments, push and the player
 * are separate briefs; no placeholder tabs are added here.
 */
export function ShellScreen({
  activeChoir,
  canSwitchChoir,
  onSwitchChoir,
  onSignOut,
}: {
  activeChoir: ChoirMembershipOption;
  canSwitchChoir: boolean;
  onSwitchChoir: () => void;
  onSignOut: () => void;
}) {
  return (
    <View style={styles.container} testID="shell-screen">
      <View style={styles.header}>
        <Text style={styles.label}>Aktif koro</Text>
        <Text style={styles.choir} testID="shell-active-choir">{activeChoir.choir_name}</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.note}>
          Repertuvar ve PDF okuma bir sonraki adımda eklenecek.
        </Text>
      </View>

      <View style={styles.actions}>
        {canSwitchChoir ? (
          <Pressable onPress={onSwitchChoir} accessibilityRole="button" testID="shell-switch-choir">
            <Text style={styles.action}>Koro değiştir</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={onSignOut} accessibilityRole="button" testID="shell-sign-out">
          <Text style={styles.action}>Çıkış yap</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing(3), backgroundColor: theme.colors.background },
  header: { marginTop: theme.spacing(4), gap: theme.spacing(0.5) },
  label: { color: theme.colors.textMuted, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  choir: { color: theme.colors.text, fontSize: 26, fontWeight: '700' },
  body: { flex: 1, justifyContent: 'center' },
  note: { color: theme.colors.textMuted, fontSize: 15, lineHeight: 22 },
  actions: { gap: theme.spacing(2), paddingBottom: theme.spacing(2) },
  action: { color: theme.colors.accent, fontSize: 16, fontWeight: '600' },
});
