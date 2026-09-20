import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChatReadMessage } from '@shared/chat-read-contract';
import { theme } from '../ui/theme';

export type NativeChatActionConfirmation = 'delete-everyone' | 'hide-self' | null;

export function ChatMessageActionPanel({
  message,
  canManageForEveryone,
  busy,
  starBusy,
  starred,
  starKnown,
  confirmation,
  onCopy,
  onEdit,
  onRequestConfirmation,
  onConfirm,
  onCancelConfirmation,
  onToggleStar,
  onClose,
}: {
  message: ChatReadMessage;
  canManageForEveryone: boolean;
  busy: boolean;
  starBusy: boolean;
  starred: boolean;
  starKnown: boolean;
  confirmation: NativeChatActionConfirmation;
  onCopy: () => void;
  onEdit: () => void;
  onRequestConfirmation: (kind: Exclude<NativeChatActionConfirmation, null>) => void;
  onConfirm: () => void;
  onCancelConfirmation: () => void;
  onToggleStar: () => void;
  onClose: () => void;
}) {
  if (confirmation) {
    const isGlobal = confirmation === 'delete-everyone';
    return (
      <View accessibilityRole="alert" style={styles.panel} testID="chat-action-confirmation">
        <Text style={styles.title}>{isGlobal ? 'Herkesten silinsin mi?' : 'Yalnız sizden gizlensin mi?'}</Text>
        <Text style={styles.body} numberOfLines={2}>{message.content}</Text>
        <View style={styles.row}>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onConfirm}
            style={styles.dangerButton}
            testID="chat-action-confirm"
          >
            <Text style={styles.dangerText}>{busy ? 'İşleniyor…' : 'Evet, onayla'}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={onCancelConfirmation}
            style={styles.secondaryButton}
            testID="chat-action-confirm-cancel"
          >
            <Text style={styles.secondaryText}>Vazgeç</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.panel} testID={`chat-action-panel-${message.id}`}>
      <View style={styles.headingRow}>
        <Text style={styles.title}>Mesaj işlemleri</Text>
        <Pressable accessibilityRole="button" onPress={onClose} testID="chat-action-close">
          <Text style={styles.closeText}>Kapat</Text>
        </Pressable>
      </View>
      <Text style={styles.body} numberOfLines={2}>{message.content}</Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          disabled={busy || starBusy}
          onPress={onToggleStar}
          style={styles.secondaryButton}
          testID="chat-action-toggle-star"
        >
          <Text style={styles.starText}>
            {starBusy ? 'İşleniyor…' : !starKnown ? 'Yıldız bilgisini yenile' : starred ? 'Yıldızı kaldır' : 'Yıldızla'}
          </Text>
        </Pressable>
        {message.content ? (
          <Pressable accessibilityRole="button" disabled={busy} onPress={onCopy} style={styles.secondaryButton} testID="chat-action-copy">
            <Text style={styles.secondaryText}>Kopyala</Text>
          </Pressable>
        ) : null}
        {canManageForEveryone && message.messageType === 'text' ? (
          <Pressable accessibilityRole="button" disabled={busy} onPress={onEdit} style={styles.secondaryButton} testID="chat-action-edit">
            <Text style={styles.secondaryText}>Düzenle</Text>
          </Pressable>
        ) : null}
        {canManageForEveryone ? (
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => onRequestConfirmation('delete-everyone')}
            style={styles.dangerButton}
            testID="chat-action-delete-everyone"
          >
            <Text style={styles.dangerText}>Herkesten sil</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => onRequestConfirmation('hide-self')}
          style={styles.dangerButton}
          testID="chat-action-hide-self"
        >
          <Text style={styles.dangerText}>Benden sil</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: theme.spacing(1), borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radius, padding: theme.spacing(1.25), marginBottom: theme.spacing(1) },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing(1) },
  title: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
  body: { color: theme.colors.textMuted, fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(1) },
  secondaryButton: { minHeight: 42, justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 8, paddingHorizontal: theme.spacing(1.25) },
  dangerButton: { minHeight: 42, justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.danger, borderRadius: 8, paddingHorizontal: theme.spacing(1.25) },
  secondaryText: { color: theme.colors.accent, fontWeight: '700' },
  starText: { color: '#F6C177', fontWeight: '700' },
  dangerText: { color: theme.colors.danger, fontWeight: '700' },
  closeText: { color: theme.colors.textMuted, fontWeight: '700' },
});
