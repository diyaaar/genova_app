import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearChatCaches,
  markPendingRoomMessageFailed,
  mergeChatMessages,
  readCachedChatRooms,
  readCachedRoomSnapshot,
  readPendingRoomMessages,
  removePendingRoomMessage,
  upsertPendingRoomMessage,
  writeCachedChatRooms,
  writeCachedRoomSnapshot,
} from '@/lib/chat-cache';
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

describe('chat cache', () => {
  beforeEach(() => {
    window.localStorage.clear();
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

  it('tracks and removes pending messages without leaking unrelated cache keys', () => {
    upsertPendingRoomMessage('member-1', 'room-1', message('pending-1', '2026-01-01T00:00:00.000Z'));
    markPendingRoomMessageFailed('member-1', 'room-1', 'pending-1');

    expect(readPendingRoomMessages('member-1', 'room-1')[0]?.metadata_json).toMatchObject({
      _status: 'failed',
      _failed: true,
    });
    removePendingRoomMessage('member-1', 'room-1', 'pending-1');
    expect(readPendingRoomMessages('member-1', 'room-1')).toEqual([]);

    window.localStorage.setItem('unrelated', 'keep');
    window.localStorage.setItem('revealed-message-1', 'true');
    clearChatCaches();
    expect(window.localStorage.getItem('unrelated')).toBe('keep');
    expect(window.localStorage.getItem('revealed-message-1')).toBeNull();
  });
});
