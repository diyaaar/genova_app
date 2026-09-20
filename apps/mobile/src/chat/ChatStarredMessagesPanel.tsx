import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ChatReadMessage } from '@shared/chat-read-contract';
import type { NativeChatStarredMessage } from './chat-star-gateway';
import { theme } from '../ui/theme';

function senderName(message: ChatReadMessage): string {
  if (!message.sender) return 'Üye';
  return `${message.sender.firstName} ${message.sender.lastName}`.trim() || 'Üye';
}

function messageText(message: ChatReadMessage): string {
  if (message.messageType === 'image') return message.content?.trim() || 'Görsel mesaj';
  if (message.messageType === 'file') return message.content?.trim() || 'Dosya mesajı';
  if (message.messageType === 'poll') return message.content?.trim() || 'Anket';
  if (message.messageType === 'sticker') return message.content?.trim() || 'Çıkartma';
  if (message.messageType === 'system') return message.content?.trim() || 'Sistem mesajı';
  if (message.messageType === 'unsupported') return 'Bu mesaj türü bu sürümde görüntülenemiyor.';
  return message.content?.trim() || 'Boş mesaj';
}

export function ChatStarredMessagesPanel({
  items,
  loading,
  error,
  hasMore,
  busyIds,
  onRefresh,
  onLoadOlder,
  onToggle,
  onClose,
}: {
  items: NativeChatStarredMessage[] | null;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  busyIds: ReadonlySet<string>;
  onRefresh: () => void;
  onLoadOlder: () => void;
  onToggle: (message: ChatReadMessage) => void;
  onClose: () => void;
}) {
  return (
    <View style={styles.container} accessibilityLabel="Yıldızlı mesajlar" testID="chat-starred-panel">
      <View style={styles.header}>
        <Text style={styles.title}>Yıldızlı mesajlar</Text>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onRefresh} disabled={loading} testID="chat-starred-refresh">
            <Text style={styles.action}>{loading ? 'Yükleniyor…' : 'Yenile'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} testID="chat-starred-close">
            <Text style={styles.close}>Kapat</Text>
          </Pressable>
        </View>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.warning} testID="chat-starred-error">{error}</Text> : null}
      {items === null && loading ? (
        <View style={styles.center} testID="chat-starred-loading">
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.muted}>Yıldızlı mesajlar yükleniyor…</Text>
        </View>
      ) : items?.length === 0 ? (
        <View style={styles.center} testID="chat-starred-empty">
          <Text style={styles.muted}>Bu odada yıldızladığınız mesaj yok.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list} testID="chat-starred-list">
          {items?.map((item) => (
            <View key={item.starId} style={styles.card} testID={`chat-starred-${item.message.id}`}>
              <Text style={styles.sender}>{senderName(item.message)}</Text>
              <Text style={styles.body} numberOfLines={3}>{messageText(item.message)}</Text>
              <Text style={styles.date}>{new Date(item.starredAt).toLocaleString('tr-TR')}</Text>
              <Pressable
                accessibilityRole="button"
                disabled={busyIds.has(item.message.id)}
                onPress={() => onToggle(item.message)}
                testID={`chat-starred-remove-${item.message.id}`}
              >
                <Text style={styles.remove}>
                  {busyIds.has(item.message.id) ? 'İşleniyor…' : 'Yıldızı kaldır'}
                </Text>
              </Pressable>
            </View>
          ))}
          {hasMore ? (
            <Pressable accessibilityRole="button" disabled={loading} onPress={onLoadOlder} testID="chat-starred-older">
              <Text style={styles.action}>{loading ? 'Yükleniyor…' : 'Daha eski yıldızları yükle'}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: theme.spacing(1) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing(1) },
  title: { color: theme.colors.text, fontSize: 20, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: theme.spacing(1.5) },
  action: { color: theme.colors.accent, fontSize: 14, fontWeight: '700' },
  close: { color: theme.colors.textMuted, fontSize: 14, fontWeight: '700' },
  warning: { color: '#F6C177', fontSize: 13, lineHeight: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: theme.spacing(1) },
  muted: { color: theme.colors.textMuted, fontSize: 14, textAlign: 'center' },
  list: { gap: theme.spacing(1), paddingBottom: theme.spacing(3) },
  card: { gap: 5, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radius, padding: theme.spacing(1.25) },
  sender: { color: theme.colors.accent, fontSize: 12, fontWeight: '700' },
  body: { color: theme.colors.text, fontSize: 15, lineHeight: 21 },
  date: { color: theme.colors.textMuted, fontSize: 11 },
  remove: { color: '#F6C177', fontSize: 13, fontWeight: '700' },
});
