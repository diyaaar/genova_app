import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearChatCaches,
  MAX_PENDING_CHAT_MESSAGES,
  markPendingRoomMessageFailed,
  mergeChatMessages,
  PENDING_CHAT_MESSAGE_TTL_MS,
  readCachedChatRooms,
  readCachedRoomSnapshot,
  readPendingRoomMessages,
  reconcilePendingChatMessage,
  reconcilePendingChatSnapshot,
  removePendingRoomMessage,
  upsertPendingRoomMessage,
  writeCachedChatRooms,
  writeCachedRoomSnapshot,
} from '@/lib/chat-cache';
import type { ChatPendingScope } from '@/lib/chat-cache';
import type { ChatMessage, ChatRoom } from '@/lib/chat';

function message(id: string, createdAt: string, overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id,
    room_id: 'room-1',
    sender_id: 'member-1',
    content: id,
    message_type: 'text',
    reply_to_id: null,
    metadata_json: {},
    is_edited: false,
    is_deleted: false,
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

const room: ChatRoom = {
  id: 'room-1',
  name: 'Genel',
  slug: 'genel',
  description: null,
  type: 'general',
  created_by: null,
  avatar_url: null,
  is_archived: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const pendingScope: ChatPendingScope = {
  accountId: 'account-1',
  choirId: 'choir-1',
  memberId: 'member-1',
  roomId: 'room-1',
};

function mutationId(index: number) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`;
}

function pendingMessage(index: number, overrides: Partial<ChatMessage> = {}) {
  const id = mutationId(index);
  return message(`temp-${id}`, new Date().toISOString(), {
    client_mutation_id: id,
    metadata_json: { _status: 'pending' },
    ...overrides,
  });
}

describe('chat cache', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-19T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('deduplicates messages while preserving chronological order and fresh fields', () => {
    const result = mergeChatMessages(
      [message('m-2', '2026-01-02T00:00:00.000Z'), message('m-1', '2026-01-01T00:00:00.000Z')],
      [message('m-2', '2026-01-02T00:00:00.000Z', { content: 'updated' })],
    );

    expect(result.map((item) => item.id)).toEqual(['m-1', 'm-2']);
    expect(result[1]?.content).toBe('updated');
  });

  it('validates cached room records rather than trusting arbitrary storage data', () => {
    writeCachedChatRooms('member-1', [room]);
    expect(readCachedChatRooms('member-1')).toEqual([room]);

    window.localStorage.setItem('genova.chat.rooms.v1:member-2', JSON.stringify([{ id: 'room-2' }]));
    expect(readCachedChatRooms('member-2')).toBeNull();
  });

  it('limits an offline snapshot to the latest 120 messages', () => {
    const messages = Array.from({ length: 125 }, (_, index) => message(
      `m-${index}`,
      new Date(1_700_000_000_000 + index * 1_000).toISOString(),
    ));
    writeCachedRoomSnapshot('member-1', 'room-1', {
      messages,
      roomMembers: [],
      starredMessageIds: ['m-124'],
      hasMore: true,
    });

    const snapshot = readCachedRoomSnapshot('member-1', 'room-1');
    expect(snapshot?.messages).toHaveLength(120);
    expect(snapshot?.messages[0]?.id).toBe('m-5');
    expect(snapshot?.hasMore).toBe(true);
  });

  it('keeps pending text out of the snapshot and reconciles duplicate acknowledgements by server id', () => {
    const pending = pendingMessage(1);
    const acknowledged = message('server-1', '2026-09-19T12:00:01.000Z', {
      content: pending.content,
      client_mutation_id: pending.client_mutation_id,
    });
    writeCachedRoomSnapshot('member-1', 'room-1', {
      messages: [message('server-old', '2026-09-19T11:00:00.000Z'), pending],
      roomMembers: [],
      starredMessageIds: [],
      hasMore: false,
    });
    expect(readCachedRoomSnapshot('member-1', 'room-1')?.messages.map((item) => item.id))
      .toEqual(['server-old']);

    const reconciled = reconcilePendingChatMessage(
      [pending, acknowledged],
      pending.id,
      { ...acknowledged, metadata_json: { accepted: true } },
    );
    expect(reconciled).toHaveLength(1);
    expect(reconciled[0]).toMatchObject({ id: 'server-1', metadata_json: { accepted: true } });

    const snapshot = reconcilePendingChatSnapshot([acknowledged], [pending]);
    expect(snapshot.messages).toHaveLength(1);
    expect(snapshot.messages[0]).toMatchObject({
      id: 'server-1',
      client_mutation_id: pending.client_mutation_id,
      sender_id: pending.sender_id,
    });
    expect(snapshot.acknowledgedPendingIds).toEqual([pending.id]);
  });

  it('tracks and removes pending messages without leaking unrelated cache keys', () => {
    const pending = pendingMessage(1);
    expect(upsertPendingRoomMessage(pendingScope, pending)).toBe(true);
    expect(markPendingRoomMessageFailed(pendingScope, pending.id)).toBe(true);

    expect(readPendingRoomMessages(pendingScope)[0]?.metadata_json).toMatchObject({
      _status: 'failed',
      _failed: true,
    });
    expect(readPendingRoomMessages({ ...pendingScope, accountId: 'account-2' })).toEqual([]);
    expect(readPendingRoomMessages({ ...pendingScope, choirId: 'choir-2' })).toEqual([]);
    expect(removePendingRoomMessage(pendingScope, pending.id)).toBe(true);
    expect(readPendingRoomMessages(pendingScope)).toEqual([]);

    window.localStorage.setItem('unrelated', 'keep');
    window.localStorage.setItem('revealed-message-1', 'true');
    clearChatCaches();
    expect(window.localStorage.getItem('unrelated')).toBe('keep');
    expect(window.localStorage.getItem('revealed-message-1')).toBeNull();
  });

  it('expires pending text after seven days and caps a scope at 50 entries', () => {
    for (let index = 1; index <= MAX_PENDING_CHAT_MESSAGES; index += 1) {
      expect(upsertPendingRoomMessage(pendingScope, pendingMessage(index))).toBe(true);
    }
    expect(upsertPendingRoomMessage(pendingScope, pendingMessage(51))).toBe(false);
    expect(readPendingRoomMessages(pendingScope)).toHaveLength(MAX_PENDING_CHAT_MESSAGES);

    vi.advanceTimersByTime(PENDING_CHAT_MESSAGE_TTL_MS + 1);
    expect(readPendingRoomMessages(pendingScope)).toEqual([]);
  });

  it('refuses to report a durable queue write when localStorage rejects it', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError');
    });
    expect(upsertPendingRoomMessage(pendingScope, pendingMessage(1))).toBe(false);
  });

  it('migrates legacy unkeyed text as failed for explicit retry or cancel', () => {
    window.localStorage.setItem(
      'genova.chat.pending-messages.v1:member-1:room-1',
      JSON.stringify([message('temp-old', new Date().toISOString(), {
        content: 'legacy text',
        metadata_json: { link_preview: { url: 'https://example.invalid' } },
      })]),
    );

    const migrated = readPendingRoomMessages(pendingScope);
    expect(migrated).toHaveLength(1);
    expect(migrated[0]).toMatchObject({
      content: 'legacy text',
      message_type: 'text',
      metadata_json: { _failed: true, _legacy_unkeyed: true },
    });
    expect(migrated[0]?.client_mutation_id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(window.localStorage.getItem('genova.chat.pending-messages.v1:member-1:room-1')).toBeNull();
  });
});
