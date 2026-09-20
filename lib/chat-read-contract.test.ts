import { describe, expect, it } from 'vitest';

import {
  compareChatReadMessages,
  createChatReadMessageCursor,
  createChatReadScope,
  isChatReadMessageBeforeCursor,
  isChatReadScopeCurrent,
  mergeChatReadMessagePages,
  parseChatReadMessage,
  parseChatReadMessageCursor,
  parseChatReadMessagePage,
  parseChatReadRoomSummaries,
  parseChatReadRoomSummary,
} from './chat-read-contract';

const USER_ID = '10000000-0000-4000-8000-000000000001';
const CHOIR_ID = '20000000-0000-4000-8000-000000000002';
const MEMBER_ID = '30000000-0000-4000-8000-000000000003';
const OTHER_MEMBER_ID = '30000000-0000-4000-8000-000000000004';
const ROOM_ID = '40000000-0000-4000-8000-000000000004';
const OTHER_ROOM_ID = '40000000-0000-4000-8000-000000000005';
const MEMBERSHIP_ID = '50000000-0000-4000-8000-000000000005';
const MESSAGE_A = '60000000-0000-4000-8000-000000000001';
const MESSAGE_B = '60000000-0000-4000-8000-000000000002';
const MESSAGE_C = '60000000-0000-4000-8000-000000000003';
const SENDER_ID = '70000000-0000-4000-8000-000000000007';
const CREATED_AT = '2026-09-19T12:00:00.123456+03:00';

function message(overrides: Record<string, unknown> = {}) {
  return {
    id: MESSAGE_A,
    room_id: ROOM_ID,
    sender_id: SENDER_ID,
    content: 'Merhaba',
    message_type: 'text',
    reply_to_id: null,
    metadata_json: { link_preview: null },
    is_edited: false,
    is_deleted: false,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    sender: {
      id: SENDER_ID,
      first_name: 'Ada',
      last_name: 'Lovelace',
      photo_url: null,
    },
    reply_to: null,
    ...overrides,
  };
}

function room(overrides: Record<string, unknown> = {}) {
  return {
    room_id: ROOM_ID,
    membership_id: MEMBERSHIP_ID,
    nickname: null,
    membership_role: 'member',
    last_read_at: null,
    notifications_enabled: true,
    hidden_at: null,
    room_name: 'Genel',
    room_slug: 'genel',
    room_description: null,
    room_type: 'general',
    room_created_by: SENDER_ID,
    room_avatar_url: null,
    room_is_archived: false,
    room_created_at: '2026-09-01T08:00:00Z',
    room_updated_at: CREATED_AT,
    last_message: JSON.stringify(message()),
    unread_count: 2,
    member_count: 2,
    members_preview: JSON.stringify([
      { member_id: MEMBER_ID, first_name: 'Ali', last_name: 'Yılmaz', photo_url: null },
      { member_id: OTHER_MEMBER_ID, first_name: 'Ada', last_name: 'Lovelace', photo_url: null },
    ]),
    ...overrides,
  };
}

function acceptedMessage(overrides: Record<string, unknown> = {}) {
  const parsed = parseChatReadMessage(message(overrides), (overrides.room_id as string | undefined) ?? ROOM_ID);
  if (parsed.kind !== 'accepted') throw new Error(`fixture rejected: ${parsed.reasonCode}`);
  return parsed.value;
}

describe('chat read scope', () => {
  it('normalizes the exact account, choir and member identity and refuses stale work', () => {
    const current = createChatReadScope({
      userId: USER_ID.toUpperCase(),
      choirId: CHOIR_ID.toUpperCase(),
      memberId: MEMBER_ID.toUpperCase(),
    });
    expect(current).toEqual({ userId: USER_ID, choirId: CHOIR_ID, memberId: MEMBER_ID });
    expect(current && isChatReadScopeCurrent({ ...current }, current)).toBe(true);
    expect(current && isChatReadScopeCurrent({ ...current, userId: SENDER_ID }, current)).toBe(false);
    expect(current && isChatReadScopeCurrent({ ...current, choirId: OTHER_ROOM_ID }, current)).toBe(false);
    expect(current && isChatReadScopeCurrent({ ...current, memberId: OTHER_MEMBER_ID }, current)).toBe(false);
  });

  it('refuses malformed scope identity', () => {
    expect(createChatReadScope({ userId: 'bad', choirId: CHOIR_ID, memberId: MEMBER_ID })).toBeNull();
    expect(createChatReadScope({ userId: USER_ID, choirId: null, memberId: MEMBER_ID })).toBeNull();
  });
});

describe('chat message parser', () => {
  it('accepts a known message and normalizes sender and reply relations', () => {
    const result = parseChatReadMessage(message({
      client_mutation_id: MESSAGE_C,
      reply_to_id: MESSAGE_B,
      reply_to: [{
        id: MESSAGE_B,
        content: 'Önceki',
        sender_id: OTHER_MEMBER_ID,
        choir_members: [{ first_name: 'Grace', last_name: 'Hopper' }],
      }],
    }), ROOM_ID);

    expect(result).toMatchObject({
      kind: 'accepted',
      value: {
        id: MESSAGE_A,
        clientMutationId: MESSAGE_C,
        roomId: ROOM_ID,
        messageType: 'text',
        sourceMessageType: 'text',
        isMessageTypeSupported: true,
        sender: { id: SENDER_ID, firstName: 'Ada', lastName: 'Lovelace' },
        replyTo: { id: MESSAGE_B, senderId: OTHER_MEMBER_ID, senderName: 'Grace Hopper' },
      },
    });
  });

  it('preserves multiline message content and treats empty optional relations as absent', () => {
    expect(parseChatReadMessage(message({
      content: 'Birinci satır\nİkinci satır',
      sender: [],
      reply_to: [],
    }), ROOM_ID)).toMatchObject({
      kind: 'accepted',
      value: { content: 'Birinci satır\nİkinci satır', sender: null, replyTo: null },
    });
  });

  it('keeps a compatible future kind visible without pretending to understand it', () => {
    expect(parseChatReadMessage(message({ message_type: 'voice_note_v2' }), ROOM_ID)).toMatchObject({
      kind: 'accepted',
      value: {
        messageType: 'unsupported',
        sourceMessageType: 'voice_note_v2',
        isMessageTypeSupported: false,
        content: 'Merhaba',
      },
    });
  });

  it.each([
    [null, 'invalid-payload', 'message'],
    [message({ id: 'not-a-uuid' }), 'invalid-uuid', 'message.id'],
    [message({ client_mutation_id: 'not-a-uuid' }), 'invalid-uuid', 'message.client_mutation_id'],
    [message({ room_id: OTHER_ROOM_ID }), 'room-mismatch', 'message.room_id'],
    [message({ message_type: 'Voice Note' }), 'invalid-message-type', 'message.message_type'],
    [message({ created_at: '2026-02-30T12:00:00Z' }), 'invalid-timestamp', 'message.created_at'],
    [message({ unread_count: -1, is_edited: 'false' }), 'invalid-boolean', 'message.is_edited'],
    [message({ metadata_json: { value: Number.NaN } }), 'invalid-json', 'message.metadata_json'],
  ])('rejects malformed message input %#', (input, reasonCode, field) => {
    expect(parseChatReadMessage(input, ROOM_ID)).toEqual({ kind: 'rejected', reasonCode, field });
  });

  it('rejects invalid expected identity and ambiguous to-one relations', () => {
    expect(parseChatReadMessage(message(), 'not-a-room')).toEqual({
      kind: 'rejected', reasonCode: 'invalid-uuid', field: 'expectedRoomId',
    });
    expect(parseChatReadMessage(message({ sender: [message().sender, message().sender] }), ROOM_ID)).toEqual({
      kind: 'rejected', reasonCode: 'invalid-payload', field: 'sender',
    });
  });

  it('rejects sender and reply relations that disagree with their server IDs', () => {
    expect(parseChatReadMessage(message({
      sender: { ...message().sender as Record<string, unknown>, id: OTHER_MEMBER_ID },
    }), ROOM_ID)).toEqual({
      kind: 'rejected', reasonCode: 'relation-mismatch', field: 'message.sender',
    });
    expect(parseChatReadMessage(message({
      reply_to_id: MESSAGE_B,
      reply_to: { id: MESSAGE_C, sender_id: OTHER_MEMBER_ID, content: null, choir_members: null },
    }), ROOM_ID)).toEqual({
      kind: 'rejected', reasonCode: 'relation-mismatch', field: 'message.reply_to',
    });
  });

  it('rejects unsafe metadata keys and inherited row fields', () => {
    const unsafeMetadata = JSON.parse('{"__proto__":{"polluted":true}}') as unknown;
    expect(parseChatReadMessage(message({ metadata_json: unsafeMetadata }), ROOM_ID)).toEqual({
      kind: 'rejected', reasonCode: 'invalid-json', field: 'message.metadata_json',
    });

    const inherited = Object.create(message()) as Record<string, unknown>;
    expect(parseChatReadMessage(inherited, ROOM_ID)).toEqual({
      kind: 'rejected', reasonCode: 'invalid-payload', field: 'message',
    });
  });
});

describe('chat room summary parser', () => {
  it('accepts current RPC JSON relations and binds membership to the expected current member', () => {
    const result = parseChatReadRoomSummary(room(), MEMBER_ID.toUpperCase());
    expect(result).toMatchObject({
      kind: 'accepted',
      value: {
        id: ROOM_ID,
        type: 'general',
        unreadCount: 2,
        memberCount: 2,
        membership: { id: MEMBERSHIP_ID, memberId: MEMBER_ID, role: 'member' },
        lastMessage: { id: MESSAGE_A, roomId: ROOM_ID },
      },
    });
    if (result.kind === 'accepted') expect(result.value.membersPreview).toHaveLength(2);
  });

  it('keeps a missing legacy slug nullable because canonical room identity is the server UUID', () => {
    expect(parseChatReadRoomSummary(room({ room_slug: null }), MEMBER_ID)).toMatchObject({
      kind: 'accepted', value: { id: ROOM_ID, slug: null },
    });
  });

  it.each([
    [room({ unread_count: -1 }), 'invalid-count', 'room.unread_count'],
    [room({ member_count: 1.5 }), 'invalid-count', 'room.member_count'],
    [room({ room_type: 'broadcast' }), 'invalid-room-type', 'room.room_type'],
    [room({ room_created_at: 'invalid' }), 'invalid-timestamp', 'room.room_created_at'],
    [room({ member_id: OTHER_MEMBER_ID }), 'invalid-uuid', 'room.member_id'],
    [room({ members_preview: '[invalid' }), 'invalid-payload', 'room.members_preview'],
    [room({ last_message: JSON.stringify(message({ room_id: OTHER_ROOM_ID })) }), 'room-mismatch', 'message.room_id'],
  ])('rejects malformed room summary %#', (input, reasonCode, field) => {
    expect(parseChatReadRoomSummary(input, MEMBER_ID)).toEqual({ kind: 'rejected', reasonCode, field });
  });

  it('rejects duplicate member and room IDs rather than silently merging authority rows', () => {
    const duplicatePreview = JSON.stringify([
      { member_id: MEMBER_ID, first_name: 'Ali', last_name: '', photo_url: null },
      { member_id: MEMBER_ID, first_name: 'Ali', last_name: '', photo_url: null },
    ]);
    expect(parseChatReadRoomSummary(room({ members_preview: duplicatePreview }), MEMBER_ID)).toEqual({
      kind: 'rejected', reasonCode: 'duplicate-id', field: 'room.members_preview.member_id',
    });
    expect(parseChatReadRoomSummaries([room(), room()], MEMBER_ID)).toEqual({
      kind: 'rejected', reasonCode: 'duplicate-id', field: 'room.room_id',
    });
  });
});

describe('stable message cursor, ordering and deduplication', () => {
  it('sorts equal timestamps by server ID and preserves microsecond ordering', () => {
    const sameTimeB = acceptedMessage({ id: MESSAGE_B });
    const sameTimeA = acceptedMessage({ id: MESSAGE_A });
    const laterMicros = acceptedMessage({
      id: MESSAGE_C,
      created_at: '2026-09-19T12:00:00.123457+03:00',
      updated_at: '2026-09-19T12:00:00.123457+03:00',
    });
    expect([sameTimeB, laterMicros, sameTimeA].sort(compareChatReadMessages).map((item) => item.id))
      .toEqual([MESSAGE_A, MESSAGE_B, MESSAGE_C]);
  });

  it('creates/parses a compound cursor and evaluates the older-page boundary', () => {
    const messageA = acceptedMessage({ id: MESSAGE_A });
    const cursor = createChatReadMessageCursor(acceptedMessage({ id: MESSAGE_B }));
    expect(parseChatReadMessageCursor(cursor)).toEqual({ kind: 'accepted', value: cursor });
    expect(isChatReadMessageBeforeCursor(messageA, cursor)).toBe(true);
    expect(isChatReadMessageBeforeCursor(acceptedMessage({ id: MESSAGE_C }), cursor)).toBe(false);
    expect(parseChatReadMessageCursor({ createdAt: 'bad', id: MESSAGE_A })).toEqual({
      kind: 'rejected', reasonCode: 'invalid-timestamp', field: 'cursor.createdAt',
    });
  });

  it('deduplicates by server ID with the later snapshot winning and returns chronological order', () => {
    const original = acceptedMessage({ id: MESSAGE_B, content: 'eski' });
    const replacement = { ...original, content: 'yeni', isEdited: true };
    const earlier = acceptedMessage({ id: MESSAGE_A });
    expect(mergeChatReadMessagePages([original], [replacement, earlier])).toEqual([earlier, replacement]);
  });

  it('rejects an entire page on duplicate IDs, malformed rows or another room', () => {
    expect(parseChatReadMessagePage([message(), message()], ROOM_ID)).toEqual({
      kind: 'rejected', reasonCode: 'duplicate-id', field: 'message.id',
    });
    expect(parseChatReadMessagePage([message({ room_id: OTHER_ROOM_ID })], ROOM_ID)).toEqual({
      kind: 'rejected', reasonCode: 'room-mismatch', field: 'message.room_id',
    });
    expect(parseChatReadMessagePage([message({ content: 42 })], ROOM_ID)).toEqual({
      kind: 'rejected', reasonCode: 'invalid-string', field: 'message.content',
    });
  });
});
