import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type {
  ChatReadMessage,
  ChatReadMessageCursor,
  ChatReadRoomSummary,
  ChatReadScope,
} from '@shared/chat-read-contract';
import { mergeChatReadMessagePages } from '@shared/chat-read-contract';
import { theme } from '../ui/theme';
import {
  NativeChatSendError,
  type NativeChatSendGateway,
} from './chat-send-gateway';
import {
  getNativeChatRoomTitle,
  NativeChatReadError,
  type NativeChatReadGateway,
} from './chat-read-gateway';
import type { NativeChatQueuedText } from './native-chat-send-queue';
import { getDefaultNativeChatReadGateway } from './supabase-chat-read-transport';
import { getDefaultNativeChatSendGateway } from './supabase-chat-send-transport';
import {
  ChatMessageActionPanel,
  type NativeChatActionConfirmation,
} from './ChatMessageActionPanel';
import {
  NativeChatMessageActionError,
  type NativeChatMessageActionGateway,
} from './chat-message-action-gateway';
import { getDefaultNativeChatMessageActionGateway } from './supabase-chat-message-action-transport';
import type { NativeChatStarGateway } from './chat-star-gateway';
import { getDefaultNativeChatStarGateway } from './supabase-chat-star-transport';
import { useNativeChatStars } from './use-native-chat-stars';
import { ChatStarredMessagesPanel } from './ChatStarredMessagesPanel';

function safeReadError(error: unknown, fallback: string): string {
  if (error instanceof NativeChatReadError) {
    if (error.code === 'inaccessible-room') return 'Bu sohbet odasına artık erişiminiz yok.';
    if (error.code === 'invalid-data') return 'Sohbet verisi güvenli biçimde doğrulanamadı.';
    if (error.code === 'stale-scope') return 'Koro değiştiği için eski sohbet isteği iptal edildi.';
  }
  return fallback;
}

function senderName(message: ChatReadMessage): string {
  if (!message.sender) return 'Üye';
  return `${message.sender.firstName} ${message.sender.lastName}`.trim() || 'Üye';
}

function messageBody(message: ChatReadMessage): string {
  if (message.isDeleted) return 'Bu mesaj silindi.';
  if (message.messageType === 'unsupported') return 'Bu mesaj türü bu sürümde görüntülenemiyor.';
  if (message.messageType === 'image') return message.content?.trim() || 'Görsel mesaj';
  if (message.messageType === 'file') return message.content?.trim() || 'Dosya mesajı';
  if (message.messageType === 'poll') return message.content?.trim() || 'Anket';
  if (message.messageType === 'sticker') return message.content?.trim() || 'Çıkartma';
  if (message.messageType === 'system') return message.content?.trim() || 'Sistem mesajı';
  return message.content?.trim() || 'Boş mesaj';
}

function lastMessageText(room: ChatReadRoomSummary): string {
  return room.lastMessage ? messageBody(room.lastMessage) : 'Henüz mesaj yok';
}

function safeSendError(error: unknown): string {
  if (error instanceof NativeChatSendError) {
    if (error.code === 'queue-full') return 'Gönderme kuyruğu dolu. Bir öğeyi iptal edip tekrar deneyin.';
    if (error.code === 'queue-too-large') return 'Bekleyen mesajlar güvenli depolama sınırını aşıyor.';
    if (error.code === 'storage-failed') return 'Mesaj güvenli biçimde saklanamadığı için gönderilmedi.';
    if (error.code === 'invalid-draft') return 'Mesaj veya yanıt hedefi geçerli değil.';
    if (error.code === 'invalid-acknowledgement') return 'Sunucu yanıtı doğrulanamadı; mesaj kuyrukta tutuldu.';
    if (error.code === 'stale-scope') return 'Koro değiştiği için eski gönderme iptal edildi.';
  }
  return 'Mesaj gönderilemedi. Kuyrukta tutuldu; tekrar deneyebilirsiniz.';
}

function safeMessageActionError(error: unknown): string {
  if (error instanceof NativeChatMessageActionError) {
    if (error.code === 'clipboard-failed') return 'Mesaj panoya kopyalanamadı.';
    if (error.code === 'invalid-action') return 'Bu işlem bu mesaj için kullanılamıyor.';
    if (error.code === 'invalid-acknowledgement') return 'Sunucu yanıtı doğrulanamadı; mesaj değiştirilmedi.';
    if (error.code === 'stale-scope') return 'Oda veya koro değiştiği için eski işlem uygulanmadı.';
  }
  return 'Mesaj işlemi tamamlanamadı; mevcut içerik korundu.';
}

function withinOneHour(message: ChatReadMessage, now: number): boolean {
  const createdAt = Date.parse(message.createdAt);
  return Number.isFinite(createdAt) && now >= createdAt && now <= createdAt + 60 * 60 * 1_000;
}

interface ReplyDraft {
  id: string;
  sender: string;
  body: string;
}

export function ChatScreen({
  scope,
  choirName,
  gateway: suppliedGateway,
  sendGateway: suppliedSendGateway,
  actionGateway: suppliedActionGateway,
  starGateway: suppliedStarGateway,
  now = Date.now,
  onBack,
}: {
  scope: ChatReadScope;
  choirName: string;
  gateway?: NativeChatReadGateway;
  sendGateway?: NativeChatSendGateway;
  actionGateway?: NativeChatMessageActionGateway;
  starGateway?: NativeChatStarGateway;
  now?: () => number;
  onBack: () => void;
}) {
  const gateway = useMemo(
    () => suppliedGateway ?? getDefaultNativeChatReadGateway(),
    [suppliedGateway],
  );
  const sendGateway = useMemo(
    () => suppliedSendGateway ?? getDefaultNativeChatSendGateway(),
    [suppliedSendGateway],
  );
  const actionGateway = useMemo(
    () => suppliedActionGateway ?? getDefaultNativeChatMessageActionGateway(),
    [suppliedActionGateway],
  );
  const starGateway = useMemo(
    () => suppliedStarGateway ?? getDefaultNativeChatStarGateway(),
    [suppliedStarGateway],
  );
  const [rooms, setRooms] = useState<ChatReadRoomSummary[] | null>(null);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [refreshingRooms, setRefreshingRooms] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatReadMessage[] | null>(null);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<ChatReadMessageCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [queuedMessages, setQueuedMessages] = useState<NativeChatQueuedText[]>([]);
  const [composerText, setComposerText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ReplyDraft | null>(null);
  const [preparingSend, setPreparingSend] = useState(false);
  const [sendNotice, setSendNotice] = useState<string | null>(null);
  const [actionTarget, setActionTarget] = useState<ChatReadMessage | null>(null);
  const [actionConfirmation, setActionConfirmation] = useState<NativeChatActionConfirmation>(null);
  const [editingMessage, setEditingMessage] = useState<ChatReadMessage | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [listConnection, setListConnection] = useState<'connected' | 'disconnected'>('connected');
  const [roomConnection, setRoomConnection] = useState<'connected' | 'disconnected'>('connected');
  const roomRequest = useRef(0);
  const messageRequest = useRef(0);
  const selectedRoomIdRef = useRef<string | null>(null);
  const autoRetried = useRef(new Set<string>());
  const stars = useNativeChatStars({
    scope,
    roomId: selectedRoomId,
    messages,
    gateway: starGateway,
  });

  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
  }, [selectedRoomId]);

  const loadRooms = useCallback(async (force: boolean) => {
    const request = ++roomRequest.current;
    if (force) setRefreshingRooms(true);
    setRoomsError(null);
    try {
      const next = await gateway.loadRooms(scope, { force });
      if (request !== roomRequest.current) return;
      setRooms(next);
      const currentRoomId = selectedRoomIdRef.current;
      if (currentRoomId && !next.some((room) => room.id === currentRoomId)) {
        selectedRoomIdRef.current = null;
        setSelectedRoomId(null);
        setMessages(null);
        setRoomsError('Bu sohbet odasına erişiminiz sona erdi. Liste yenilendi.');
      }
    } catch (error) {
      if (request !== roomRequest.current) return;
      setRoomsError(safeReadError(error, 'Sohbet odaları yüklenemedi.'));
    } finally {
      if (request === roomRequest.current) setRefreshingRooms(false);
    }
  }, [gateway, scope]);

  const transmitQueued = useCallback(async (record: NativeChatQueuedText) => {
    try {
      const acknowledgement = await sendGateway.transmit(scope, record);
      const restored = await sendGateway.restore(scope, record.roomId);
      if (selectedRoomIdRef.current !== record.roomId) return;
      setMessages((current) => mergeChatReadMessagePages(current ?? [], [acknowledgement]));
      setQueuedMessages(restored);
      void loadRooms(true);
    } catch (error) {
      if (selectedRoomIdRef.current !== record.roomId) return;
      try {
        const restored = await sendGateway.restore(scope, record.roomId);
        if (selectedRoomIdRef.current !== record.roomId) return;
        setQueuedMessages(restored);
      } catch {
        // The visible error below remains authoritative when protected storage is unavailable.
      }
      if (selectedRoomIdRef.current !== record.roomId) return;
      setSendNotice(safeSendError(error));
    }
  }, [loadRooms, scope, sendGateway]);

  const reconcileQueue = useCallback(async (roomId: string, serverMessages: ChatReadMessage[]) => {
    try {
      const queued = await sendGateway.reconcile(scope, roomId, serverMessages);
      if (selectedRoomIdRef.current !== roomId) return;
      setQueuedMessages(queued);
      for (const record of queued) {
        if (record.status !== 'pending' || autoRetried.current.has(record.clientMutationId)) continue;
        autoRetried.current.add(record.clientMutationId);
        void transmitQueued(record);
      }
    } catch (error) {
      if (selectedRoomIdRef.current === roomId) setSendNotice(safeSendError(error));
    }
  }, [scope, sendGateway, transmitQueued]);

  const loadMessages = useCallback(async (before: ChatReadMessageCursor | null) => {
    if (!selectedRoomId) return;
    const request = ++messageRequest.current;
    if (before) setLoadingOlder(true);
    setMessagesError(null);
    try {
      const page = await gateway.loadMessages(scope, selectedRoomId, { before });
      if (request !== messageRequest.current) return;
      setMessages(page.messages);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
      void reconcileQueue(selectedRoomId, page.messages);
      if (!before) {
        void gateway.markRoomRead(scope, selectedRoomId).catch(() => {
          if (request === messageRequest.current) {
            setMessagesError('Mesajlar açıldı ancak okundu bilgisi güncellenemedi.');
          }
        });
      }
    } catch (error) {
      if (request !== messageRequest.current) return;
      const message = safeReadError(error, 'Mesajlar yüklenemedi.');
      if (error instanceof NativeChatReadError && error.code === 'inaccessible-room') {
        setSelectedRoomId(null);
        setMessages(null);
        setRoomsError(message);
        void loadRooms(true);
      } else {
        setMessagesError(message);
      }
    } finally {
      if (request === messageRequest.current) setLoadingOlder(false);
    }
  }, [gateway, loadRooms, reconcileQueue, scope, selectedRoomId]);

  useEffect(() => {
    void loadRooms(false);
    const stop = gateway.watchRoomList(scope, {
      invalidate: () => void loadRooms(true),
      connection: setListConnection,
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadRooms(true);
    });
    return () => {
      roomRequest.current += 1;
      messageRequest.current += 1;
      stop();
      appState.remove();
    };
  }, [gateway, loadRooms, scope]);

  useEffect(() => {
    if (!selectedRoomId) return;
    setMessages(null);
    setNextCursor(null);
    setHasMore(false);
    setQueuedMessages([]);
    setReplyingTo(null);
    setSendNotice(null);
    setPreparingSend(false);
    setActionTarget(null);
    setActionConfirmation(null);
    setEditingMessage(null);
    setActionBusy(false);
    setActionNotice(null);
    void loadMessages(null);
    const stop = gateway.watchRoom(scope, selectedRoomId, {
      invalidate: () => void loadMessages(null),
      connection: setRoomConnection,
    });
    return () => {
      messageRequest.current += 1;
      stop();
    };
  }, [gateway, loadMessages, scope, selectedRoomId]);

  const sendComposerMessage = useCallback(async () => {
    if (!selectedRoomId || preparingSend || composerText.trim().length === 0) return;
    setPreparingSend(true);
    setSendNotice(null);
    setActionNotice(null);
    if (editingMessage) {
      try {
        const result = await actionGateway.edit(scope, editingMessage, composerText);
        if (selectedRoomIdRef.current !== editingMessage.roomId) return;
        setMessages((current) => current?.map((item) => (
          item.id === result.messageId
            ? { ...item, content: result.content, isEdited: true }
            : item
        )) ?? null);
        setEditingMessage(null);
        setComposerText('');
        setActionNotice('Mesaj düzenlendi.');
      } catch (error) {
        if (selectedRoomIdRef.current === editingMessage.roomId) {
          setActionNotice(safeMessageActionError(error));
        }
      } finally {
        setPreparingSend(false);
      }
      return;
    }
    try {
      const prepared = await sendGateway.prepare(
        scope,
        selectedRoomId,
        composerText,
        replyingTo?.id ?? null,
      );
      if (selectedRoomIdRef.current !== selectedRoomId) return;
      setQueuedMessages((current) => [
        ...current.filter((item) => item.clientMutationId !== prepared.record.clientMutationId),
        prepared.record,
      ]);
      setComposerText('');
      setReplyingTo(null);
      if (prepared.previewWarning) {
        setSendNotice('Bağlantı önizlemesi alınamadı; mesaj metin olarak gönderiliyor.');
      }
      autoRetried.current.add(prepared.record.clientMutationId);
      void transmitQueued(prepared.record);
    } catch (error) {
      if (selectedRoomIdRef.current === selectedRoomId) setSendNotice(safeSendError(error));
    } finally {
      setPreparingSend(false);
    }
  }, [actionGateway, composerText, editingMessage, preparingSend, replyingTo?.id, scope, selectedRoomId, sendGateway, transmitQueued]);

  const copySelectedMessage = useCallback(async () => {
    if (!actionTarget || actionBusy) return;
    setActionBusy(true);
    setActionNotice(null);
    try {
      await actionGateway.copy(scope, actionTarget);
      if (selectedRoomIdRef.current !== actionTarget.roomId) return;
      setActionTarget(null);
      setActionNotice('Mesaj kopyalandı.');
    } catch (error) {
      if (selectedRoomIdRef.current === actionTarget.roomId) setActionNotice(safeMessageActionError(error));
    } finally {
      setActionBusy(false);
    }
  }, [actionBusy, actionGateway, actionTarget, scope]);

  const confirmSelectedAction = useCallback(async () => {
    if (!actionTarget || !actionConfirmation || actionBusy) return;
    setActionBusy(true);
    setActionNotice(null);
    try {
      if (actionConfirmation === 'delete-everyone') {
        const result = await actionGateway.deleteForEveryone(scope, actionTarget);
        if (selectedRoomIdRef.current !== actionTarget.roomId) return;
        setMessages((current) => current?.map((item) => (
          item.id === result.messageId
            ? { ...item, content: null, metadata: {}, isDeleted: true }
            : item
        )) ?? null);
        setActionNotice('Mesaj herkesten silindi.');
      } else {
        const result = await actionGateway.hideForSelf(scope, actionTarget);
        if (selectedRoomIdRef.current !== actionTarget.roomId) return;
        setMessages((current) => current?.filter((item) => item.id !== result.messageId) ?? null);
        setActionNotice('Mesaj yalnız sizden silindi.');
      }
      setActionTarget(null);
      setActionConfirmation(null);
    } catch (error) {
      if (selectedRoomIdRef.current === actionTarget.roomId) setActionNotice(safeMessageActionError(error));
    } finally {
      setActionBusy(false);
    }
  }, [actionBusy, actionConfirmation, actionGateway, actionTarget, scope]);

  const cancelQueued = useCallback(async (record: NativeChatQueuedText) => {
    try {
      const queued = await sendGateway.cancel(scope, record.roomId, record.clientMutationId);
      if (selectedRoomIdRef.current === record.roomId) setQueuedMessages(queued);
    } catch (error) {
      if (selectedRoomIdRef.current === record.roomId) setSendNotice(safeSendError(error));
    }
  }, [scope, sendGateway]);

  const retryQueued = useCallback((record: NativeChatQueuedText) => {
    const pending = { ...record, status: 'pending' as const };
    setSendNotice(null);
    setQueuedMessages((current) => current.map((item) => (
      item.clientMutationId === record.clientMutationId ? pending : item
    )));
    autoRetried.current.add(record.clientMutationId);
    void transmitQueued(pending);
  }, [transmitQueued]);

  const visibleRooms = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('tr-TR');
    if (!rooms || !query) return rooms ?? [];
    return rooms.filter((room) => {
      const haystack = `${getNativeChatRoomTitle(room)} ${room.description ?? ''}`.toLocaleLowerCase('tr-TR');
      return haystack.includes(query);
    });
  }, [rooms, search]);

  const selectedRoom = rooms?.find((room) => room.id === selectedRoomId) ?? null;

  if (selectedRoomId && selectedRoom) {
    return (
      <View style={styles.container} testID="chat-room-screen">
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              setSelectedRoomId(null);
              setReplyingTo(null);
              setSendNotice(null);
            }}
            accessibilityRole="button"
            testID="chat-room-back"
          >
            <Text style={styles.action}>Sohbetler</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>{choirName}</Text>
            <Text style={styles.title} numberOfLines={1}>{getNativeChatRoomTitle(selectedRoom)}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={stars.openPanel} accessibilityRole="button" testID="chat-open-starred">
              <Text style={styles.starAction}>★ Yıldızlılar</Text>
            </Pressable>
            <Pressable onPress={() => { void loadMessages(null); void stars.refreshStates(); }} accessibilityRole="button" testID="chat-room-refresh">
              <Text style={styles.action}>Yenile</Text>
            </Pressable>
          </View>
        </View>
        {roomConnection === 'disconnected' ? (
          <Text style={styles.connectionWarning} accessibilityRole="alert" testID="chat-offline-warning">
            Bağlantı kesildi. Son görünüm gösteriliyor; yeniden bağlanınca sohbet yenilenecek.
          </Text>
        ) : null}
        {stars.notice ? (
          <Text style={styles.starNotice} accessibilityRole="alert" testID="chat-star-notice">{stars.notice}</Text>
        ) : null}
        {stars.panelOpen ? (
          <ChatStarredMessagesPanel
            items={stars.panelItems}
            loading={stars.panelLoading}
            error={stars.panelError}
            hasMore={stars.panelHasMore}
            busyIds={stars.busyIds}
            onRefresh={stars.refreshPanel}
            onLoadOlder={stars.loadOlder}
            onToggle={(message) => void stars.toggle(message, true)}
            onClose={stars.closePanel}
          />
        ) : messages === null && !messagesError ? (
          <View style={styles.center} testID="chat-messages-loading">
            <ActivityIndicator color={theme.colors.accent} />
            <Text style={styles.muted}>Mesajlar yükleniyor…</Text>
          </View>
        ) : messagesError && messages === null ? (
          <View style={styles.center} testID="chat-messages-error">
            <Text style={styles.error}>{messagesError}</Text>
            <Pressable onPress={() => void loadMessages(null)} accessibilityRole="button" testID="chat-messages-retry">
              <Text style={styles.action}>Tekrar dene</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <ScrollView
              style={styles.messageScroll}
              contentContainerStyle={styles.messageList}
              testID="chat-message-list"
            >
            {hasMore ? (
              <Pressable
                onPress={() => nextCursor && void loadMessages(nextCursor)}
                disabled={loadingOlder || !nextCursor}
                accessibilityRole="button"
                testID="chat-load-older"
              >
                <Text style={styles.action}>{loadingOlder ? 'Yükleniyor…' : 'Daha eski mesajları yükle'}</Text>
              </Pressable>
            ) : null}
            {messages?.length === 0 && queuedMessages.length === 0 ? (
              <Text style={styles.muted} testID="chat-messages-empty">Bu odada henüz mesaj yok.</Text>
            ) : messages?.map((message) => {
              const body = messageBody(message);
              return (
                <View
                  key={message.id}
                  style={[styles.message, message.senderId === scope.memberId && styles.ownMessage]}
                  accessibilityLabel={`${senderName(message)}: ${body}${message.isEdited ? ', düzenlendi' : ''}`}
                  testID={`chat-message-${message.id}`}
                >
                  <Text style={styles.sender}>{senderName(message)}</Text>
                  {message.replyTo ? (
                    <Text style={styles.reply}>Yanıt: {message.replyTo.senderName ?? 'Üye'} — {message.replyTo.content ?? 'Mesaj'}</Text>
                  ) : null}
                  <Text style={message.isDeleted ? styles.deleted : styles.messageText}>{body}</Text>
                  {stars.starredIds.has(message.id) && !message.isDeleted ? (
                    <Text style={styles.starIndicator} testID={`chat-starred-indicator-${message.id}`}>★ Yıldızlı</Text>
                  ) : null}
                  {message.isEdited && !message.isDeleted ? <Text style={styles.meta}>düzenlendi</Text> : null}
                  {!message.isDeleted ? (
                    <View style={styles.messageActions}>
                      <Pressable
                        onPress={() => {
                          setEditingMessage(null);
                          setReplyingTo({ id: message.id, sender: senderName(message), body });
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${senderName(message)} mesajını yanıtla`}
                        testID={`chat-reply-${message.id}`}
                      >
                        <Text style={styles.inlineAction}>Yanıtla</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          setActionTarget(message);
                          setActionConfirmation(null);
                          setActionNotice(null);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`${senderName(message)} mesajının işlemlerini aç`}
                        testID={`chat-actions-${message.id}`}
                      >
                        <Text style={styles.inlineAction}>İşlemler</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              );
            })}
            {queuedMessages.map((record) => (
              <View
                key={record.clientMutationId}
                style={[styles.message, styles.ownMessage, styles.pendingMessage]}
                accessibilityLabel={`Siz: ${record.content}, ${record.status === 'failed' ? 'gönderilemedi' : 'gönderiliyor'}`}
                testID={`chat-pending-${record.clientMutationId}`}
              >
                <Text style={styles.sender}>Siz</Text>
                {record.replyToId ? <Text style={styles.reply}>Yanıtlanan mesaj</Text> : null}
                <Text style={styles.messageText}>{record.content}</Text>
                {record.linkPreview ? (
                  <Text style={styles.reply}>Bağlantı: {record.linkPreview.title ?? record.linkPreview.domain}</Text>
                ) : null}
                <Text style={record.status === 'failed' ? styles.warning : styles.meta}>
                  {record.status === 'failed' ? 'Gönderilemedi' : 'Gönderiliyor…'}
                </Text>
                {record.status === 'failed' ? (
                  <View style={styles.pendingActions}>
                    <Pressable
                      onPress={() => retryQueued(record)}
                      accessibilityRole="button"
                      testID={`chat-retry-${record.clientMutationId}`}
                    >
                      <Text style={styles.inlineAction}>Tekrar dene</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void cancelQueued(record)}
                      accessibilityRole="button"
                      testID={`chat-cancel-${record.clientMutationId}`}
                    >
                      <Text style={styles.inlineDanger}>İptal et</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
            {messagesError && messages !== null ? (
              <Text style={styles.warning} accessibilityRole="alert" testID="chat-read-warning">{messagesError}</Text>
            ) : null}
            </ScrollView>
            {actionTarget ? (
              <ChatMessageActionPanel
                message={actionTarget}
                canManageForEveryone={actionTarget.senderId === scope.memberId && withinOneHour(actionTarget, now())}
                busy={actionBusy}
                starBusy={stars.busyIds.has(actionTarget.id)}
                starred={stars.starredIds.has(actionTarget.id)}
                starKnown={stars.knownIds.has(actionTarget.id)}
                confirmation={actionConfirmation}
                onCopy={() => void copySelectedMessage()}
                onEdit={() => {
                  setEditingMessage(actionTarget);
                  setComposerText(actionTarget.content ?? '');
                  setReplyingTo(null);
                  setActionTarget(null);
                  setActionConfirmation(null);
                }}
                onRequestConfirmation={setActionConfirmation}
                onConfirm={() => void confirmSelectedAction()}
                onCancelConfirmation={() => setActionConfirmation(null)}
                onToggleStar={() => void stars.toggle(actionTarget)}
                onClose={() => {
                  setActionTarget(null);
                  setActionConfirmation(null);
                }}
              />
            ) : null}
            <View style={styles.composer} testID="chat-composer">
              {editingMessage ? (
                <View style={styles.replyDraft} testID="chat-edit-draft">
                  <Text style={styles.reply} numberOfLines={2}>Mesaj düzenleniyor: {editingMessage.content}</Text>
                  <Pressable
                    onPress={() => {
                      setEditingMessage(null);
                      setComposerText('');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Düzenlemeyi iptal et"
                    testID="chat-edit-cancel"
                  >
                    <Text style={styles.inlineDanger}>Kapat</Text>
                  </Pressable>
                </View>
              ) : null}
              {replyingTo ? (
                <View style={styles.replyDraft} testID="chat-reply-draft">
                  <Text style={styles.reply} numberOfLines={2}>
                    {replyingTo.sender}: {replyingTo.body}
                  </Text>
                  <Pressable
                    onPress={() => setReplyingTo(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Yanıtı iptal et"
                    testID="chat-reply-cancel"
                  >
                    <Text style={styles.inlineDanger}>Kapat</Text>
                  </Pressable>
                </View>
              ) : null}
              {sendNotice ? (
                <Text style={styles.warning} accessibilityRole="alert" testID="chat-send-notice">{sendNotice}</Text>
              ) : null}
              {actionNotice ? (
                <Text style={styles.warning} accessibilityRole="alert" testID="chat-action-notice">{actionNotice}</Text>
              ) : null}
              <View style={styles.composerRow}>
                <TextInput
                  value={composerText}
                  onChangeText={setComposerText}
                  placeholder="Mesaj yaz"
                  placeholderTextColor={theme.colors.textMuted}
                  accessibilityLabel="Mesaj"
                  multiline
                  maxLength={20_000}
                  editable={!preparingSend}
                  style={styles.composerInput}
                  testID="chat-composer-input"
                />
                <Pressable
                  onPress={() => void sendComposerMessage()}
                  accessibilityRole="button"
                  disabled={preparingSend || composerText.trim().length === 0}
                  style={styles.sendButton}
                  testID="chat-send"
                >
                  <Text style={styles.sendButtonText}>
                    {preparingSend ? 'Hazırlanıyor' : editingMessage ? 'Kaydet' : 'Gönder'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container} testID="chat-list-screen">
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" testID="chat-back">
          <Text style={styles.action}>Geri</Text>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.kicker}>{choirName}</Text>
          <Text style={styles.title}>Sohbetler</Text>
        </View>
        <Pressable onPress={() => void loadRooms(true)} accessibilityRole="button" disabled={refreshingRooms} testID="chat-refresh">
          <Text style={styles.action}>{refreshingRooms ? 'Yenileniyor' : 'Yenile'}</Text>
        </Pressable>
      </View>
      {listConnection === 'disconnected' ? (
        <Text style={styles.connectionWarning} accessibilityRole="alert" testID="chat-offline-warning">
          Bağlantı kesildi. Listeyi yenileyerek tekrar deneyin.
        </Text>
      ) : null}
      {rooms === null && !roomsError ? (
        <View style={styles.center} testID="chat-rooms-loading">
          <ActivityIndicator color={theme.colors.accent} />
          <Text style={styles.muted}>Sohbetler yükleniyor…</Text>
        </View>
      ) : roomsError && rooms === null ? (
        <View style={styles.center} testID="chat-rooms-error">
          <Text style={styles.error}>{roomsError}</Text>
          <Pressable onPress={() => void loadRooms(true)} accessibilityRole="button" testID="chat-rooms-retry">
            <Text style={styles.action}>Tekrar dene</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Sohbet ara"
            placeholderTextColor={theme.colors.textMuted}
            accessibilityLabel="Sohbetlerde ara"
            style={styles.search}
            testID="chat-search"
          />
          {roomsError ? <Text style={styles.warning} accessibilityRole="alert">{roomsError}</Text> : null}
          {rooms?.length === 0 ? (
            <View style={styles.center} testID="chat-rooms-empty">
              <Text style={styles.muted}>Bu koro için erişilebilir sohbet odası yok.</Text>
            </View>
          ) : visibleRooms.length === 0 ? (
            <View style={styles.center} testID="chat-rooms-no-results">
              <Text style={styles.muted}>Aramanızla eşleşen sohbet yok.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.roomList} testID="chat-room-list">
              {visibleRooms.map((room) => {
                const title = getNativeChatRoomTitle(room);
                return (
                  <Pressable
                    key={room.id}
                    onPress={() => setSelectedRoomId(room.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${title}, ${lastMessageText(room)}${room.unreadCount ? `, ${room.unreadCount} okunmamış` : ''}`}
                    style={styles.room}
                    testID={`chat-room-${room.id}`}
                  >
                    <View style={styles.roomText}>
                      <Text style={styles.roomTitle} numberOfLines={1}>{title}</Text>
                      <Text style={styles.muted} numberOfLines={2}>{lastMessageText(room)}</Text>
                    </View>
                    {room.unreadCount > 0 ? (
                      <Text style={styles.unread} testID={`chat-unread-${room.id}`}>{room.unreadCount}</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing(2), paddingTop: theme.spacing(5), backgroundColor: theme.colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.5), marginBottom: theme.spacing(2) },
  headerText: { flex: 1 },
  headerActions: { alignItems: 'flex-end', gap: 6 },
  kicker: { color: theme.colors.textMuted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8 },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: '700' },
  action: { color: theme.colors.accent, fontSize: 15, fontWeight: '700' },
  starAction: { color: '#F6C177', fontSize: 13, fontWeight: '700' },
  starNotice: { color: '#F6C177', fontSize: 13, lineHeight: 18, marginBottom: theme.spacing(1) },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: theme.spacing(1.5), padding: theme.spacing(2) },
  muted: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 20 },
  error: { color: theme.colors.danger, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  warning: { color: '#F6C177', fontSize: 13, lineHeight: 18, marginBottom: theme.spacing(1) },
  connectionWarning: { color: '#F6C177', backgroundColor: theme.colors.surface, padding: theme.spacing(1), borderRadius: 8, marginBottom: theme.spacing(1) },
  search: { minHeight: 48, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radius, paddingHorizontal: theme.spacing(1.5), marginBottom: theme.spacing(1.5) },
  roomList: { gap: theme.spacing(1), paddingBottom: theme.spacing(3) },
  room: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: theme.spacing(1.5), borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radius, padding: theme.spacing(1.5) },
  roomText: { flex: 1, gap: 4 },
  roomTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  unread: { minWidth: 28, height: 28, borderRadius: 14, overflow: 'hidden', textAlign: 'center', paddingTop: 4, color: theme.colors.onAccent, backgroundColor: theme.colors.accent, fontWeight: '800' },
  messageScroll: { flex: 1 },
  messageList: { gap: theme.spacing(1), paddingBottom: theme.spacing(3) },
  message: { alignSelf: 'flex-start', maxWidth: '88%', gap: 4, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radius, padding: theme.spacing(1.25) },
  ownMessage: { alignSelf: 'flex-end', borderColor: theme.colors.accent },
  pendingMessage: { opacity: 0.92 },
  sender: { color: theme.colors.accent, fontSize: 12, fontWeight: '700' },
  reply: { color: theme.colors.textMuted, fontSize: 12, borderLeftWidth: 2, borderLeftColor: theme.colors.accent, paddingLeft: theme.spacing(0.75) },
  messageText: { color: theme.colors.text, fontSize: 15, lineHeight: 21 },
  deleted: { color: theme.colors.textMuted, fontSize: 15, fontStyle: 'italic' },
  meta: { color: theme.colors.textMuted, fontSize: 11 },
  starIndicator: { color: '#F6C177', fontSize: 11, fontWeight: '700' },
  inlineAction: { color: theme.colors.accent, fontSize: 12, fontWeight: '700' },
  inlineDanger: { color: theme.colors.danger, fontSize: 12, fontWeight: '700' },
  messageActions: { flexDirection: 'row', gap: theme.spacing(2), alignItems: 'center' },
  pendingActions: { flexDirection: 'row', gap: theme.spacing(2), alignItems: 'center' },
  composer: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing(1), gap: theme.spacing(1) },
  replyDraft: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing(1), backgroundColor: theme.colors.surface, borderRadius: 8, padding: theme.spacing(1) },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing(1) },
  composerInput: { flex: 1, maxHeight: 120, minHeight: 48, color: theme.colors.text, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radius, paddingHorizontal: theme.spacing(1.25), paddingVertical: theme.spacing(1) },
  sendButton: { minHeight: 48, justifyContent: 'center', borderRadius: theme.radius, backgroundColor: theme.colors.accent, paddingHorizontal: theme.spacing(1.5) },
  sendButtonText: { color: theme.colors.onAccent, fontWeight: '800' },
});
