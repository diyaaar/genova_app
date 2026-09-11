import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChoirMembershipOption } from '@shared/choir-context-core';
import { theme } from './theme';

/**
 * Smallest shell that proves the flow: it names the server-confirmed active choir and
 * offers the implemented native repertoire plus permanent web-owned destinations.
 * Chat, assignments and push remain separate briefs; unavailable tabs are not added here.
 */
export function ShellScreen({
  activeChoir,
  canSwitchChoir,
  onOpenRepertoire,
  onOpenWeb,
  onSwitchChoir,
  onSignOut,
}: {
  activeChoir: ChoirMembershipOption;
  canSwitchChoir: boolean;
  onOpenRepertoire: () => void;
  onOpenWeb: (path: '/announcements' | '/koristler' | '/devamsizlik' | '/profil') => void;
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
        <Pressable
          onPress={onOpenRepertoire}
          accessibilityRole="button"
          style={styles.primaryAction}
          testID="shell-open-repertoire"
        >
          <Text style={styles.primaryActionText}>Repertuvarı aç</Text>
          <Text style={styles.note}>Eserlerinizi ve partisyon atamalarınızı görüntüleyin.</Text>
        </Pressable>
        <View style={styles.webActions}>
          {([
            ['/announcements', 'Duyurular', 'announcements'],
            ['/koristler', 'Koristler', 'choristers'],
            ['/devamsizlik', 'Devamsızlık', 'attendance'],
            ['/profil', 'Profil', 'profile'],
          ] as const).map(([path, label, testId]) => (
            <Pressable
              key={path}
              onPress={() => onOpenWeb(path)}
              accessibilityRole="button"
              style={styles.webAction}
              testID={`shell-open-web-${testId}`}
            >
              <Text style={styles.webActionText}>{label}</Text>
            </Pressable>
          ))}
        </View>
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
  body: { flex: 1, justifyContent: 'center', gap: theme.spacing(2) },
  note: { color: theme.colors.textMuted, fontSize: 15, lineHeight: 22 },
  primaryAction: { gap: theme.spacing(1), padding: theme.spacing(2), borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  primaryActionText: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
  webActions: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(1) },
  webAction: { minHeight: 48, minWidth: '47%', flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: theme.spacing(1.5), borderRadius: theme.radius, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  webActionText: { color: theme.colors.accent, fontSize: 15, fontWeight: '700' },
  actions: { gap: theme.spacing(2), paddingBottom: theme.spacing(2) },
  action: { color: theme.colors.accent, fontSize: 16, fontWeight: '600' },
});
