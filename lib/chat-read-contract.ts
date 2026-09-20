/**
 * Framework-free chat read boundary shared by web and React Native.
 *
 * The caller still owns authorization and transport. This module validates untrusted result rows,
 * binds asynchronous work to the current account/choir/member scope and provides deterministic
 * cursor/order helpers. It performs no network, storage or logging side effects.
 */

export const CHAT_ROOM_TYPES = ['general', 'voice_group', 'custom', 'dm'] as const;
export const CHAT_MESSAGE_TYPES = ['text', 'image', 'sticker', 'poll', 'system', 'file'] as const;

export type ChatReadRoomType = typeof CHAT_ROOM_TYPES[number];
export type ChatReadKnownMessageType = typeof CHAT_MESSAGE_TYPES[number];
export type ChatReadMessageType = ChatReadKnownMessageType | 'unsupported';

export interface ChatReadScope {
  userId: string;
  choirId: string;
  memberId: string;
}

export interface ChatReadMessageCursor {
  createdAt: string;
  id: string;
}

export type ChatReadRejectReason =
  | 'duplicate-id'
  | 'invalid-boolean'
  | 'invalid-count'
  | 'invalid-json'
  | 'invalid-message-type'
  | 'invalid-payload'
  | 'invalid-room-type'
  | 'invalid-string'
  | 'invalid-timestamp'
  | 'invalid-uuid'
  | 'relation-mismatch'
  | 'room-mismatch';

export type ChatReadDecision<T> =
  | { kind: 'accepted'; value: T }
  | { kind: 'rejected'; reasonCode: ChatReadRejectReason; field: string };

export type ChatReadJson =
  | null
  | boolean
  | number
  | string
  | ChatReadJson[]
  | { [key: string]: ChatReadJson };

export interface ChatReadMemberPreview {
  memberId: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

export interface ChatReadMembershipSummary {
  id: string;
  memberId: string;
  role: 'admin' | 'member';
  nickname: string | null;
  lastReadAt: string | null;
  notificationsEnabled: boolean;
  hiddenAt: string | null;
}

export interface ChatReadSender {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
}

export interface ChatReadReplyPreview {
  id: string;
  senderId: string;
  content: string | null;
  senderName: string | null;
}

export interface ChatReadMessage {
  id: string;
  clientMutationId: string | null;
  roomId: string;
  senderId: string;
  content: string | null;
  messageType: ChatReadMessageType;
  sourceMessageType: string;
  isMessageTypeSupported: boolean;
  replyToId: string | null;
  metadata: { [key: string]: ChatReadJson };
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  sender: ChatReadSender | null;
  replyTo: ChatReadReplyPreview | null;
}

export interface ChatReadRoomSummary {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  type: ChatReadRoomType;
  createdBy: string | null;
  avatarUrl: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  unreadCount: number;
  membersPreview: ChatReadMemberPreview[];
  membership: ChatReadMembershipSummary;
  lastMessage: ChatReadMessage | null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const MESSAGE_TYPE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/u;
const TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/u;
const UNSAFE_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const own = (value: Record<string, unknown>, key: string) => Object.prototype.hasOwnProperty.call(value, key);

function accepted<T>(value: T): ChatReadDecision<T> {
  return { kind: 'accepted', value };
}

function rejected<T>(reasonCode: ChatReadRejectReason, field: string): ChatReadDecision<T> {
  return { kind: 'rejected', reasonCode, field };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function stringValue(value: unknown, maxLength: number, allowEmpty = false): string | null {
  if (typeof value !== 'string' || value.length > maxLength) return null;
  if (!allowEmpty && value.trim().length === 0) return null;
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value)) return null;
  return value;
}

function nullableString(value: unknown, maxLength: number): string | null | undefined {
  if (value === null) return null;
  return stringValue(value, maxLength, true) ?? undefined;
}

function uuid(value: unknown): string | null {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) return null;
  return value.toLowerCase();
}

function nonNegativeInteger(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) return null;
  return value;
}

function timestampParts(value: unknown): {
  value: string;
  epochMicros: bigint;
} | null {
  if (typeof value !== 'string') return null;
  const match = TIMESTAMP_PATTERN.exec(value);
  if (!match) return null;

  const yearRaw = match[1];
  const monthRaw = match[2];
  const dayRaw = match[3];
  const hourRaw = match[4];
  const minuteRaw = match[5];
  const secondRaw = match[6];
  const fractionRaw = match[7] ?? '';
  const zoneRaw = match[8];
  if (!yearRaw || !monthRaw || !dayRaw || !hourRaw || !minuteRaw || !secondRaw || !zoneRaw) return null;

  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw);
  if (year < 1970 || month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) return null;

  const calendar = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1
    || calendar.getUTCDate() !== day) return null;

  let offsetMinutes = 0;
  if (zoneRaw !== 'Z') {
    const zoneHour = Number(zoneRaw.slice(1, 3));
    const zoneMinute = Number(zoneRaw.slice(4, 6));
    if (zoneHour > 23 || zoneMinute > 59) return null;
    const direction = zoneRaw[0] === '+' ? 1 : -1;
    offsetMinutes = direction * ((zoneHour * 60) + zoneMinute);
  }

  const utcSeconds = Math.trunc(calendar.getTime() / 1000) - (offsetMinutes * 60);
  const micros = Number(fractionRaw.padEnd(6, '0'));
  return {
    value,
    epochMicros: (BigInt(utcSeconds) * BigInt(1_000_000)) + BigInt(micros),
  };
}

function jsonValue(value: unknown, depth = 0): ChatReadJson | undefined {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    if (typeof value === 'string' && value.length > 16_384) return undefined;
    return value;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (depth >= 6) return undefined;
  if (Array.isArray(value)) {
    if (value.length > 128) return undefined;
    const items: ChatReadJson[] = [];
    for (const item of value) {
      const parsed = jsonValue(item, depth + 1);
      if (parsed === undefined) return undefined;
      items.push(parsed);
    }
    return items;
  }
  if (!isRecord(value)) return undefined;
  const entries = Object.entries(value);
  if (entries.length > 128) return undefined;
  const result: { [key: string]: ChatReadJson } = {};
  for (const [key, item] of entries) {
    if (!key || key.length > 128 || UNSAFE_JSON_KEYS.has(key)) return undefined;
    const parsed = jsonValue(item, depth + 1);
    if (parsed === undefined) return undefined;
    result[key] = parsed;
  }
  return result;
}

function relationRecord(value: unknown): Record<string, unknown> | null | undefined {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value) && value.length === 0) return null;
  if (Array.isArray(value) && value.length !== 1) return undefined;
  const relation = Array.isArray(value) ? value[0] : value;
  return isRecord(relation) ? relation : undefined;
}

function parseSender(value: unknown): ChatReadDecision<ChatReadSender | null> {
  const input = relationRecord(value);
  if (input === null) return accepted(null);
  if (!input) return rejected('invalid-payload', 'sender');
  const id = uuid(input.id);
  const firstName = stringValue(input.first_name, 200, true);
  const lastName = stringValue(input.last_name, 200, true);
  const photoUrl = nullableString(input.photo_url, 4_096);
  if (!id) return rejected('invalid-uuid', 'sender.id');
  if (firstName === null) return rejected('invalid-string', 'sender.first_name');
  if (lastName === null) return rejected('invalid-string', 'sender.last_name');
  if (photoUrl === undefined) return rejected('invalid-string', 'sender.photo_url');
  return accepted({ id, firstName, lastName, photoUrl });
}

function parseReply(value: unknown): ChatReadDecision<ChatReadReplyPreview | null> {
  const input = relationRecord(value);
  if (input === null) return accepted(null);
  if (!input) return rejected('invalid-payload', 'reply_to');
  const id = uuid(input.id);
  const senderId = uuid(input.sender_id);
  const content = nullableString(input.content, 20_000);
  if (!id) return rejected('invalid-uuid', 'reply_to.id');
  if (!senderId) return rejected('invalid-uuid', 'reply_to.sender_id');
  if (content === undefined) return rejected('invalid-string', 'reply_to.content');

  const member = relationRecord(input.choir_members);
  if (member === undefined) return rejected('invalid-payload', 'reply_to.choir_members');
  let senderName: string | null = null;
  if (member) {
    const firstName = stringValue(member.first_name, 200, true);
    const lastName = stringValue(member.last_name, 200, true);
    if (firstName === null || lastName === null) return rejected('invalid-string', 'reply_to.sender_name');
    senderName = `${firstName} ${lastName}`.trim() || null;
  }
  return accepted({ id, senderId, content, senderName });
}

function embeddedValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value.length > 262_144) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

export function createChatReadScope(input: {
  userId: unknown;
  choirId: unknown;
  memberId: unknown;
}): ChatReadScope | null {
  const userId = uuid(input.userId);
  const choirId = uuid(input.choirId);
  const memberId = uuid(input.memberId);
  return userId && choirId && memberId ? { userId, choirId, memberId } : null;
}

export function isChatReadScopeCurrent(candidate: ChatReadScope, current: ChatReadScope): boolean {
  return candidate.userId === current.userId
    && candidate.choirId === current.choirId
    && candidate.memberId === current.memberId;
}

export function parseChatReadMessage(input: unknown, expectedRoomId?: string): ChatReadDecision<ChatReadMessage> {
  if (!isRecord(input)) return rejected('invalid-payload', 'message');
  const id = uuid(input.id);
  const clientMutationId = input.client_mutation_id === null || input.client_mutation_id === undefined
    ? null
    : uuid(input.client_mutation_id);
  const roomId = uuid(input.room_id);
  const senderId = uuid(input.sender_id);
  if (!id) return rejected('invalid-uuid', 'message.id');
  if (clientMutationId === null
    && input.client_mutation_id !== null
    && input.client_mutation_id !== undefined) {
    return rejected('invalid-uuid', 'message.client_mutation_id');
  }
  if (!roomId) return rejected('invalid-uuid', 'message.room_id');
  if (!senderId) return rejected('invalid-uuid', 'message.sender_id');
  const normalizedExpectedRoomId = expectedRoomId === undefined ? undefined : uuid(expectedRoomId);
  if (expectedRoomId !== undefined && !normalizedExpectedRoomId) {
    return rejected('invalid-uuid', 'expectedRoomId');
  }
  if (normalizedExpectedRoomId && roomId !== normalizedExpectedRoomId) {
    return rejected('room-mismatch', 'message.room_id');
  }

  const content = nullableString(input.content, 20_000);
  const replyToId = input.reply_to_id === null ? null : uuid(input.reply_to_id);
  if (content === undefined) return rejected('invalid-string', 'message.content');
  if (replyToId === null && input.reply_to_id !== null) return rejected('invalid-uuid', 'message.reply_to_id');

  const sourceMessageType = stringValue(input.message_type, 64);
  if (!sourceMessageType || !MESSAGE_TYPE_PATTERN.test(sourceMessageType)) {
    return rejected('invalid-message-type', 'message.message_type');
  }
  const isMessageTypeSupported = (CHAT_MESSAGE_TYPES as readonly string[]).includes(sourceMessageType);
  const messageType: ChatReadMessageType = isMessageTypeSupported
    ? sourceMessageType as ChatReadKnownMessageType
    : 'unsupported';

  const metadataValue = jsonValue(input.metadata_json);
  if (!isRecord(metadataValue)) return rejected('invalid-json', 'message.metadata_json');
  if (typeof input.is_edited !== 'boolean') return rejected('invalid-boolean', 'message.is_edited');
  if (typeof input.is_deleted !== 'boolean') return rejected('invalid-boolean', 'message.is_deleted');
  const createdAt = timestampParts(input.created_at);
  const updatedAt = timestampParts(input.updated_at);
  if (!createdAt) return rejected('invalid-timestamp', 'message.created_at');
  if (!updatedAt) return rejected('invalid-timestamp', 'message.updated_at');

  const sender = parseSender(own(input, 'sender') ? input.sender : input.choir_members);
  if (sender.kind === 'rejected') return sender;
  const replyTo = parseReply(input.reply_to);
  if (replyTo.kind === 'rejected') return replyTo;
  if (sender.value && sender.value.id !== senderId) {
    return rejected('relation-mismatch', 'message.sender');
  }
  if (replyTo.value && replyTo.value.id !== replyToId) {
    return rejected('relation-mismatch', 'message.reply_to');
  }

  return accepted({
    id,
    clientMutationId,
    roomId,
    senderId,
    content,
    messageType,
    sourceMessageType,
    isMessageTypeSupported,
    replyToId,
    metadata: metadataValue,
    isEdited: input.is_edited,
    isDeleted: input.is_deleted,
    createdAt: createdAt.value,
    updatedAt: updatedAt.value,
    sender: sender.value,
    replyTo: replyTo.value,
  });
}

function parseMemberPreview(input: unknown): ChatReadDecision<ChatReadMemberPreview> {
  if (!isRecord(input)) return rejected('invalid-payload', 'room.members_preview');
  const memberId = uuid(input.member_id);
  const firstName = stringValue(input.first_name, 200, true);
  const lastName = stringValue(input.last_name, 200, true);
  const photoUrl = nullableString(input.photo_url, 4_096);
  if (!memberId) return rejected('invalid-uuid', 'room.members_preview.member_id');
  if (firstName === null || lastName === null) return rejected('invalid-string', 'room.members_preview.name');
  if (photoUrl === undefined) return rejected('invalid-string', 'room.members_preview.photo_url');
  return accepted({ memberId, firstName, lastName, photoUrl });
}

function parseMembersPreview(value: unknown): ChatReadDecision<ChatReadMemberPreview[]> {
  const input = embeddedValue(value);
  if (!Array.isArray(input) || input.length > 100) return rejected('invalid-payload', 'room.members_preview');
  const result: ChatReadMemberPreview[] = [];
  const ids = new Set<string>();
  for (const item of input) {
    const parsed = parseMemberPreview(item);
    if (parsed.kind === 'rejected') return parsed;
    if (ids.has(parsed.value.memberId)) return rejected('duplicate-id', 'room.members_preview.member_id');
    ids.add(parsed.value.memberId);
    result.push(parsed.value);
  }
  return accepted(result);
}

export function parseChatReadRoomSummary(
  input: unknown,
  expectedMemberId: string,
): ChatReadDecision<ChatReadRoomSummary> {
  if (!isRecord(input)) return rejected('invalid-payload', 'room');
  const id = uuid(input.room_id);
  const membershipId = uuid(input.membership_id);
  const memberId = uuid(expectedMemberId);
  const createdBy = input.room_created_by === null ? null : uuid(input.room_created_by);
  if (!id) return rejected('invalid-uuid', 'room.room_id');
  if (!membershipId) return rejected('invalid-uuid', 'room.membership_id');
  if (!memberId) return rejected('invalid-uuid', 'expectedMemberId');
  if (own(input, 'member_id') && uuid(input.member_id) !== memberId) {
    return rejected('invalid-uuid', 'room.member_id');
  }
  if (createdBy === null && input.room_created_by !== null) return rejected('invalid-uuid', 'room.room_created_by');

  const name = stringValue(input.room_name, 300);
  const slug = nullableString(input.room_slug, 160);
  const description = nullableString(input.room_description, 4_000);
  const avatarUrl = nullableString(input.room_avatar_url, 4_096);
  const nickname = nullableString(input.nickname, 300);
  if (!name) return rejected('invalid-string', 'room.room_name');
  if (slug === undefined) return rejected('invalid-string', 'room.room_slug');
  if (description === undefined) return rejected('invalid-string', 'room.room_description');
  if (avatarUrl === undefined) return rejected('invalid-string', 'room.room_avatar_url');
  if (nickname === undefined) return rejected('invalid-string', 'room.nickname');

  if (!(CHAT_ROOM_TYPES as readonly unknown[]).includes(input.room_type)) {
    return rejected('invalid-room-type', 'room.room_type');
  }
  if (input.membership_role !== 'admin' && input.membership_role !== 'member') {
    return rejected('invalid-string', 'room.membership_role');
  }
  if (typeof input.room_is_archived !== 'boolean') return rejected('invalid-boolean', 'room.room_is_archived');
  if (typeof input.notifications_enabled !== 'boolean') return rejected('invalid-boolean', 'room.notifications_enabled');

  const createdAt = timestampParts(input.room_created_at);
  const updatedAt = timestampParts(input.room_updated_at);
  const lastReadAt = input.last_read_at === null ? null : timestampParts(input.last_read_at);
  const hiddenAt = input.hidden_at === null ? null : timestampParts(input.hidden_at);
  if (!createdAt) return rejected('invalid-timestamp', 'room.room_created_at');
  if (!updatedAt) return rejected('invalid-timestamp', 'room.room_updated_at');
  if (!lastReadAt && input.last_read_at !== null) return rejected('invalid-timestamp', 'room.last_read_at');
  if (!hiddenAt && input.hidden_at !== null) return rejected('invalid-timestamp', 'room.hidden_at');

  const unreadCount = nonNegativeInteger(input.unread_count);
  const memberCount = nonNegativeInteger(input.member_count);
  if (unreadCount === null) return rejected('invalid-count', 'room.unread_count');
  if (memberCount === null) return rejected('invalid-count', 'room.member_count');
  const membersPreview = parseMembersPreview(input.members_preview);
  if (membersPreview.kind === 'rejected') return membersPreview;

  const rawLastMessage = embeddedValue(input.last_message);
  let lastMessage: ChatReadMessage | null = null;
  if (rawLastMessage !== null) {
    if (rawLastMessage === undefined) return rejected('invalid-json', 'room.last_message');
    const parsed = parseChatReadMessage(rawLastMessage, id);
    if (parsed.kind === 'rejected') return parsed;
    lastMessage = parsed.value;
  }

  return accepted({
    id,
    name,
    slug,
    description,
    type: input.room_type as ChatReadRoomType,
    createdBy,
    avatarUrl,
    isArchived: input.room_is_archived,
    createdAt: createdAt.value,
    updatedAt: updatedAt.value,
    memberCount,
    unreadCount,
    membersPreview: membersPreview.value,
    membership: {
      id: membershipId,
      memberId,
      role: input.membership_role,
      nickname,
      lastReadAt: lastReadAt?.value ?? null,
      notificationsEnabled: input.notifications_enabled,
      hiddenAt: hiddenAt?.value ?? null,
    },
    lastMessage,
  });
}

export function parseChatReadRoomSummaries(
  input: unknown,
  expectedMemberId: string,
): ChatReadDecision<ChatReadRoomSummary[]> {
  if (!Array.isArray(input) || input.length > 1_000) return rejected('invalid-payload', 'rooms');
  const result: ChatReadRoomSummary[] = [];
  const ids = new Set<string>();
  for (const item of input) {
    const parsed = parseChatReadRoomSummary(item, expectedMemberId);
    if (parsed.kind === 'rejected') return parsed;
    if (ids.has(parsed.value.id)) return rejected('duplicate-id', 'room.room_id');
    ids.add(parsed.value.id);
    result.push(parsed.value);
  }
  return accepted(result);
}

export function compareChatReadMessages(a: ChatReadMessage, b: ChatReadMessage): number {
  const aTime = timestampParts(a.createdAt);
  const bTime = timestampParts(b.createdAt);
  if (!aTime || !bTime) throw new Error('ChatReadMessage contains an invalid accepted timestamp');
  if (aTime.epochMicros < bTime.epochMicros) return -1;
  if (aTime.epochMicros > bTime.epochMicros) return 1;
  return a.id.localeCompare(b.id);
}

export function createChatReadMessageCursor(message: ChatReadMessage): ChatReadMessageCursor {
  return { createdAt: message.createdAt, id: message.id };
}

export function parseChatReadMessageCursor(input: unknown): ChatReadDecision<ChatReadMessageCursor> {
  if (!isRecord(input)) return rejected('invalid-payload', 'cursor');
  const id = uuid(input.id);
  const createdAt = timestampParts(input.createdAt);
  if (!id) return rejected('invalid-uuid', 'cursor.id');
  if (!createdAt) return rejected('invalid-timestamp', 'cursor.createdAt');
  return accepted({ createdAt: createdAt.value, id });
}

/** True when a message belongs on the next, older page of a descending `(created_at,id)` query. */
export function isChatReadMessageBeforeCursor(
  message: ChatReadMessage,
  cursor: ChatReadMessageCursor,
): boolean {
  const cursorMessage = { ...message, id: cursor.id, createdAt: cursor.createdAt };
  return compareChatReadMessages(message, cursorMessage) < 0;
}

/** Later groups replace an earlier copy of the same server ID; output is chronological. */
export function mergeChatReadMessagePages(
  ...groups: ReadonlyArray<ReadonlyArray<ChatReadMessage>>
): ChatReadMessage[] {
  const byId = new Map<string, ChatReadMessage>();
  for (const group of groups) {
    for (const message of group) byId.set(message.id, message);
  }
  return Array.from(byId.values()).sort(compareChatReadMessages);
}

export function parseChatReadMessagePage(
  input: unknown,
  expectedRoomId: string,
): ChatReadDecision<ChatReadMessage[]> {
  const roomId = uuid(expectedRoomId);
  if (!roomId) return rejected('invalid-uuid', 'expectedRoomId');
  if (!Array.isArray(input) || input.length > 200) return rejected('invalid-payload', 'messages');
  const parsed: ChatReadMessage[] = [];
  const ids = new Set<string>();
  for (const item of input) {
    const message = parseChatReadMessage(item, roomId);
    if (message.kind === 'rejected') return message;
    if (ids.has(message.value.id)) return rejected('duplicate-id', 'message.id');
    ids.add(message.value.id);
    parsed.push(message.value);
  }
  return accepted(parsed.sort(compareChatReadMessages));
}
