'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChatMessage } from '@/lib/chat';
import { markChatMessageStatus } from '@/lib/chat';
import {
  DurableChatStatusCoordinator,
  eligibleInboundChatMessageIds,
  type ChatStatusWriter,
  type DurableChatMessageStatus,
} from '@/lib/chat-status-runtime';

function documentIsReadable(): boolean {
  if (typeof document === 'undefined') return false;
  return document.visibilityState === 'visible'
    && (typeof document.hasFocus !== 'function' || document.hasFocus());
}

export function useDurableChatStatus(
  memberId: string | null,
  roomId: string | null,
  messages: ChatMessage[],
  writer: ChatStatusWriter = markChatMessageStatus,
): void {
  const [coordinator] = useState(() => new DurableChatStatusCoordinator());
  const [activityVersion, setActivityVersion] = useState(0);
  const scopeKey = memberId && roomId ? `${memberId}:${roomId}` : null;
  const eligibleIds = useMemo(
    () => memberId ? eligibleInboundChatMessageIds(messages, memberId) : [],
    [memberId, messages],
  );

  useEffect(() => {
    const refresh = () => setActivityVersion((version) => version + 1);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('blur', refresh);
    window.addEventListener('online', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('blur', refresh);
      window.removeEventListener('online', refresh);
    };
  }, []);

  useEffect(() => {
    coordinator.setScope(scopeKey);
    return () => coordinator.setScope(null);
  }, [coordinator, scopeKey]);

  useEffect(() => {
    if (!scopeKey || eligibleIds.length === 0) return;
    const status: DurableChatMessageStatus = documentIsReadable() ? 'read' : 'delivered';
    coordinator.enqueue(eligibleIds, status);
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    let cancelled = false;
    void coordinator.flush(writer).then((result) => {
      if (!cancelled && result.failed > 0) {
        console.error('Failed to persist durable chat message status.');
      }
    });
    return () => { cancelled = true; };
  }, [activityVersion, coordinator, eligibleIds, scopeKey, writer]);
}
