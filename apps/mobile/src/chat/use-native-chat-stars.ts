import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { compareChatReadMessages, type ChatReadMessage, type ChatReadScope } from '@shared/chat-read-contract';
import {
  NativeChatStarError,
  type NativeChatStarCursor,
  type NativeChatStarGateway,
  type NativeChatStarredMessage,
} from './chat-star-gateway';

function safeStarError(error: unknown): string {
  if (error instanceof NativeChatStarError) {
    if (error.code === 'invalid-data' || error.code === 'invalid-acknowledgement') {
      return 'Yıldız bilgisi güvenli biçimde doğrulanamadı; mevcut görünüm korundu.';
    }
    if (error.code === 'stale-scope') return 'Oda veya koro değiştiği için eski yıldız işlemi uygulanmadı.';
    if (error.code === 'invalid-target') return 'Bu mesaj için yıldız işlemi kullanılamıyor.';
  }
  return 'Yıldız bilgisi güncellenemedi; son doğrulanmış görünüm gösteriliyor.';
}

function mergeStarred(
  current: NativeChatStarredMessage[],
  incoming: NativeChatStarredMessage[],
): NativeChatStarredMessage[] {
  const byId = new Map(current.map((item) => [item.message.id, item]));
  for (const item of incoming) byId.set(item.message.id, item);
  return Array.from(byId.values()).sort((a, b) => compareChatReadMessages(
    { ...b.message, id: b.starId, createdAt: b.starredAt },
    { ...a.message, id: a.starId, createdAt: a.starredAt },
  ));
}

export function useNativeChatStars({
  scope,
  roomId,
  messages,
  gateway,
}: {
  scope: ChatReadScope;
  roomId: string | null;
  messages: ChatReadMessage[] | null;
  gateway: NativeChatStarGateway;
}) {
  const [starredIds, setStarredIds] = useState<ReadonlySet<string>>(new Set());
  const [knownIds, setKnownIds] = useState<ReadonlySet<string>>(new Set());
  const [busyIds, setBusyIds] = useState<ReadonlySet<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelItems, setPanelItems] = useState<NativeChatStarredMessage[] | null>(null);
  const [panelCursor, setPanelCursor] = useState<NativeChatStarCursor | null>(null);
  const [panelHasMore, setPanelHasMore] = useState(false);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const stateRequest = useRef(0);
  const panelRequest = useRef(0);
  const roomRef = useRef(roomId);
  const lifecycle = useRef(0);
  const pendingToggles = useRef(new Set<string>());
  const messageKey = (messages ?? [])
    .filter((message) => message.roomId === roomId && !message.isDeleted)
    .map((message) => message.id).join(':');
  const messageIds = useMemo(() => messageKey ? messageKey.split(':') : [], [messageKey]);

  useEffect(() => {
    roomRef.current = roomId;
    stateRequest.current += 1;
    panelRequest.current += 1;
    setStarredIds(new Set());
    setKnownIds(new Set());
    setBusyIds(new Set());
    setNotice(null);
    setPanelOpen(false);
    setPanelItems(null);
    setPanelCursor(null);
    setPanelHasMore(false);
    setPanelLoading(false);
    setPanelError(null);
    return () => {
      lifecycle.current += 1;
      stateRequest.current += 1;
      panelRequest.current += 1;
      pendingToggles.current.clear();
      gateway.clear();
    };
  }, [gateway, roomId, scope.choirId, scope.memberId, scope.userId]);

  const refreshStates = useCallback(async () => {
    if (!roomId || messageIds.length === 0) return;
    const request = ++stateRequest.current;
    try {
      const next = await gateway.loadStates(scope, roomId, messageIds);
      if (request !== stateRequest.current || roomRef.current !== roomId) return;
      setStarredIds(next);
      setKnownIds(new Set(messageIds));
      setNotice(null);
    } catch (error) {
      if (request === stateRequest.current && roomRef.current === roomId) setNotice(safeStarError(error));
    }
  }, [gateway, messageIds, roomId, scope]);

  const loadPanel = useCallback(async (before: NativeChatStarCursor | null) => {
    if (!roomId) return;
    const request = ++panelRequest.current;
    setPanelLoading(true);
    setPanelError(null);
    try {
      const page = await gateway.loadPage(scope, roomId, { before });
      if (request !== panelRequest.current || roomRef.current !== roomId) return;
      setPanelItems((current) => before ? mergeStarred(current ?? [], page.items) : page.items);
      setPanelCursor(page.nextCursor);
      setPanelHasMore(page.hasMore);
    } catch (error) {
      if (request === panelRequest.current && roomRef.current === roomId) setPanelError(safeStarError(error));
    } finally {
      if (request === panelRequest.current && roomRef.current === roomId) setPanelLoading(false);
    }
  }, [gateway, roomId, scope]);

  useEffect(() => {
    if (roomId && messageKey) void refreshStates();
  }, [messageKey, refreshStates, roomId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !roomRef.current) return;
      void refreshStates();
      if (panelOpen) void loadPanel(null);
    });
    return () => subscription.remove();
  }, [loadPanel, panelOpen, refreshStates]);

  const toggle = useCallback(async (message: ChatReadMessage, removeFromPanel = false) => {
    if (!roomId || message.roomId !== roomId || message.isDeleted || pendingToggles.current.has(message.id)) return;
    // A panel row is affirmative star evidence even when its message is not in the loaded timeline.
    if (removeFromPanel && !panelItems?.some((item) => item.message.id === message.id)) return;
    if (!removeFromPanel && !knownIds.has(message.id)) {
      await refreshStates();
      return;
    }
    const desired = removeFromPanel ? false : !starredIds.has(message.id);
    const started = lifecycle.current;
    pendingToggles.current.add(message.id);
    setBusyIds((current) => new Set(current).add(message.id));
    setNotice(null);
    try {
      const next = await gateway.setStarred(scope, roomId, message.id, desired);
      if (started !== lifecycle.current || roomRef.current !== roomId) return;
      stateRequest.current += 1;
      panelRequest.current += 1;
      setPanelLoading(false);
      setStarredIds(next);
      setKnownIds((current) => new Set(current).add(message.id));
      setNotice(desired ? 'Mesaj yıldızlandı.' : 'Mesajın yıldızı kaldırıldı.');
      if (!desired) {
        setPanelItems((current) => current?.filter((item) => item.message.id !== message.id) ?? null);
      } else if (panelOpen) {
        void loadPanel(null);
      }
    } catch (error) {
      if (started === lifecycle.current && roomRef.current === roomId) {
        setNotice(safeStarError(error));
        // A lost acknowledgement may have committed: refresh before choosing the next direction.
        setKnownIds((current) => {
          const next = new Set(current);
          next.delete(message.id);
          return next;
        });
      }
    } finally {
      if (started === lifecycle.current && roomRef.current === roomId) {
        pendingToggles.current.delete(message.id);
        setBusyIds((current) => {
          const next = new Set(current);
          next.delete(message.id);
          return next;
        });
      }
    }
  }, [gateway, knownIds, loadPanel, panelItems, panelOpen, refreshStates, roomId, scope, starredIds]);

  const openPanel = useCallback(() => {
    setPanelOpen(true);
    void loadPanel(null);
  }, [loadPanel]);

  return {
    starredIds,
    knownIds,
    busyIds,
    notice,
    panelOpen,
    panelItems,
    panelCursor,
    panelHasMore,
    panelLoading,
    panelError,
    toggle,
    refreshStates,
    openPanel,
    closePanel: () => setPanelOpen(false),
    refreshPanel: () => void loadPanel(null),
    loadOlder: () => panelCursor && void loadPanel(panelCursor),
  };
}
