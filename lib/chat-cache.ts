import type { ChatMessage, ChatRoom, ChatRoomMember } from '@/lib/chat';

const CHAT_ROOMS_CACHE_PREFIX = 'genova.chat.rooms.v1';
const CHAT_ROOM_SNAPSHOT_CACHE_PREFIX = 'genova.chat.room-snapshot.v1';
const CHAT_PENDING_MESSAGES_CACHE_PREFIX = 'genova.chat.pending-messages.v2';
const LEGACY_CHAT_PENDING_MESSAGES_CACHE_PREFIX = 'genova.chat.pending-messages.v1';
const MAX_CACHED_MESSAGES = 120;
export const MAX_PENDING_CHAT_MESSAGES = 50;
export const PENDING_CHAT_MESSAGE_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

export interface ChatPendingScope {
  accountId: string;
  choirId: string;
  memberId: string;
  roomId: string;
}

interface StoredPendingChatMessage {
  version: 2;
  scope: ChatPendingScope;
  queuedAt: number;
  message: ChatMessage;
}

interface ChatRoomSnapshot {
  messages: ChatMessage[];
  roomMembers: ChatRoomMember[];
  starredMessageIds: string[];
  hasMore: boolean;
  cachedAt: number;
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readJson<T>(key: string): T | null {
  if (!canUseLocalStorage()) return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): boolean {
  if (!canUseLocalStorage()) return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function removeJson(key: string) {
  if (!canUseLocalStorage()) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Best-effort cleanup only.
  }
}

function getRoomsCacheKey(memberId: string) {
  return `${CHAT_ROOMS_CACHE_PREFIX}:${memberId}`;
}

function getRoomSnapshotCacheKey(memberId: string, roomId: string) {
  return `${CHAT_ROOM_SNAPSHOT_CACHE_PREFIX}:${memberId}:${roomId}`;
}

function getPendingMessagesCacheKey(scope: ChatPendingScope) {
  return [
    CHAT_PENDING_MESSAGES_CACHE_PREFIX,
    scope.accountId,
    scope.choirId,
    scope.memberId,
    scope.roomId,
  ].join(':');
}

function getLegacyPendingMessagesCacheKey(scope: ChatPendingScope) {
  return `${LEGACY_CHAT_PENDING_MESSAGES_CACHE_PREFIX}:${scope.memberId}:${scope.roomId}`;
}

function isChatRoomArray(value: unknown): value is ChatRoom[] {
  return Array.isArray(value) && value.every((room) => (
    room &&
    typeof room === 'object' &&
    typeof (room as Partial<ChatRoom>).id === 'string' &&
    typeof (room as Partial<ChatRoom>).name === 'string'
  ));
}

function isMessageArray(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.every((message) => (
    message &&
    typeof message === 'object' &&
    typeof (message as Partial<ChatMessage>).id === 'string' &&
    typeof (message as Partial<ChatMessage>).room_id === 'string'
  ));
}

function isRoomMemberArray(value: unknown): value is ChatRoomMember[] {
  return Array.isArray(value);
}

function normalizeSnapshot(value: unknown): ChatRoomSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<ChatRoomSnapshot>;
  if (!isMessageArray(candidate.messages)) return null;

  return {
    // Pending text belongs only to the bounded queue; snapshots must not outlive its TTL/cancel.
    messages: candidate.messages.filter((message) => !message.id.startsWith('temp-')),
    roomMembers: isRoomMemberArray(candidate.roomMembers) ? candidate.roomMembers : [],
    starredMessageIds: Array.isArray(candidate.starredMessageIds)
      ? candidate.starredMessageIds.filter((id): id is string => typeof id === 'string')
      : [],
    hasMore: Boolean(candidate.hasMore),
    cachedAt: typeof candidate.cachedAt === 'number' ? candidate.cachedAt : Date.now(),
  };
}

export function mergeChatMessages(...groups: Array<ChatMessage[] | null | undefined>): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();

  for (const group of groups) {
    for (const message of group ?? []) {
      byId.set(message.id, {
        ...byId.get(message.id),
        ...message,
      });
    }
  }

  return Array.from(byId.values()).sort((a, b) => {
    const aTime = Date.parse(a.created_at ?? '') || 0;
    const bTime = Date.parse(b.created_at ?? '') || 0;
    return aTime - bTime;
  });
}

export function readCachedChatRooms(memberId: string): ChatRoom[] | null {
  const value = readJson<unknown>(getRoomsCacheKey(memberId));
  return isChatRoomArray(value) ? value : null;
}

export function writeCachedChatRooms(memberId: string, rooms: ChatRoom[]) {
  writeJson(getRoomsCacheKey(memberId), rooms);
}

export function readCachedRoomSnapshot(memberId: string, roomId: string): ChatRoomSnapshot | null {
  return normalizeSnapshot(readJson<unknown>(getRoomSnapshotCacheKey(memberId, roomId)));
}

export function writeCachedRoomSnapshot(
  memberId: string,
  roomId: string,
  snapshot: Omit<ChatRoomSnapshot, 'cachedAt'>,
) {
  writeJson(getRoomSnapshotCacheKey(memberId, roomId), {
    ...snapshot,
    messages: snapshot.messages
      .filter((message) => !message.id.startsWith('temp-'))
      .slice(-MAX_CACHED_MESSAGES),
    cachedAt: Date.now(),
  });
}

function isSamePendingScope(left: ChatPendingScope, right: ChatPendingScope) {
  return left.accountId === right.accountId
    && left.choirId === right.choirId
    && left.memberId === right.memberId
    && left.roomId === right.roomId;
}

function isStoredPendingChatMessage(
  value: unknown,
  scope: ChatPendingScope,
  now: number,
): value is StoredPendingChatMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StoredPendingChatMessage>;
  const mutationId = candidate.message?.client_mutation_id;
  return candidate.version === 2
    && Boolean(candidate.scope && isSamePendingScope(candidate.scope, scope))
    && typeof candidate.queuedAt === 'number'
    && candidate.queuedAt <= now
    && candidate.queuedAt >= now - PENDING_CHAT_MESSAGE_TTL_MS
    && Boolean(candidate.message && isMessageArray([candidate.message]))
    && candidate.message?.message_type === 'text'
    && typeof candidate.message?.content === 'string'
    && typeof mutationId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mutationId);
}

export function createChatClientMutationId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function migrateLegacyPendingMessages(
  scope: ChatPendingScope,
  now: number,
): StoredPendingChatMessage[] {
  const legacyKey = getLegacyPendingMessagesCacheKey(scope);
  const legacy = readJson<unknown>(legacyKey);
  if (!isMessageArray(legacy)) return [];

  const migrated = legacy
    .filter((message) => message.message_type === 'text' && typeof message.content === 'string')
    .slice(-MAX_PENDING_CHAT_MESSAGES)
    .map((message): StoredPendingChatMessage | null => {
      const mutationId = createChatClientMutationId();
      return {
        version: 2,
        scope,
        queuedAt: now,
        message: {
          ...message,
          id: `temp-${mutationId}`,
          client_mutation_id: mutationId,
          metadata_json: {
            ...message.metadata_json,
            _status: 'failed',
            _failed: true,
            _legacy_unkeyed: true,
          },
        },
      };
    })
    .filter((record): record is StoredPendingChatMessage => Boolean(record));

  if (migrated.length > 0 && writeJson(getPendingMessagesCacheKey(scope), migrated)) {
    removeJson(legacyKey);
  }
  return migrated;
}

function readPendingRecords(scope: ChatPendingScope): StoredPendingChatMessage[] {
  const key = getPendingMessagesCacheKey(scope);
  const now = Date.now();
  const raw = readJson<unknown>(key);
  if (!Array.isArray(raw)) return migrateLegacyPendingMessages(scope, now);

  const valid = raw.filter((record) => isStoredPendingChatMessage(record, scope, now));
  if (valid.length !== raw.length) {
    if (valid.length === 0) removeJson(key);
    else writeJson(key, valid);
  }
  return valid;
}

export function readPendingRoomMessages(scope: ChatPendingScope): ChatMessage[] {
  return readPendingRecords(scope).map((record) => record.message);
}

export function reconcilePendingChatMessage(
  messages: ChatMessage[],
  pendingMessageId: string,
  acknowledgement: ChatMessage,
) {
  return mergeChatMessages(
    messages.filter((message) => (
      message.id !== pendingMessageId && message.id !== acknowledgement.id
    )),
    [acknowledgement],
  );
}

export function reconcilePendingChatSnapshot(
  serverMessages: ChatMessage[],
  pendingMessages: ChatMessage[],
) {
  const pendingByMutationId = new Map(
    pendingMessages
      .filter((message) => message.client_mutation_id)
      .map((message) => [message.client_mutation_id as string, message]),
  );
  const acknowledgedPendingIds: string[] = [];
  const acknowledgedMutationIds = new Set<string>();
  const reconciledServer = serverMessages.map((serverMessage) => {
    const mutationId = serverMessage.client_mutation_id;
    const pending = mutationId ? pendingByMutationId.get(mutationId) : undefined;
    if (!pending) return serverMessage;
    acknowledgedPendingIds.push(pending.id);
    acknowledgedMutationIds.add(mutationId as string);
    return {
      ...pending,
      ...serverMessage,
      id: serverMessage.id,
      client_mutation_id: mutationId,
      metadata_json: serverMessage.metadata_json,
      sender: serverMessage.sender ?? pending.sender,
      reply_to: serverMessage.reply_to ?? pending.reply_to,
    };
  });
  const remainingPending = pendingMessages.filter((message) => (
    !message.client_mutation_id || !acknowledgedMutationIds.has(message.client_mutation_id)
  ));
  return {
    messages: mergeChatMessages(reconciledServer, remainingPending),
    acknowledgedPendingIds,
  };
}

export function upsertPendingRoomMessage(
  scope: ChatPendingScope,
  message: ChatMessage,
): boolean {
  if (message.message_type !== 'text' || !message.client_mutation_id) return false;
  const records = readPendingRecords(scope);
  const existing = records.find((record) => record.message.id === message.id);
  if (!existing && records.length >= MAX_PENDING_CHAT_MESSAGES) return false;

  const nextRecord: StoredPendingChatMessage = {
    version: 2,
    scope,
    queuedAt: existing?.queuedAt ?? Date.now(),
    message,
  };
  const next = [
    ...records.filter((record) => record.message.id !== message.id),
    nextRecord,
  ].sort((left, right) => left.queuedAt - right.queuedAt);
  return writeJson(getPendingMessagesCacheKey(scope), next);
}

export function removePendingRoomMessage(scope: ChatPendingScope, messageId: string): boolean {
  const key = getPendingMessagesCacheKey(scope);
  const next = readPendingRecords(scope).filter((record) => record.message.id !== messageId);
  if (next.length === 0) {
    removeJson(key);
    return readJson<unknown>(key) === null;
  }
  return writeJson(key, next);
}

function updatePendingRoomMessage(
  scope: ChatPendingScope,
  messageId: string,
  update: (message: ChatMessage) => ChatMessage,
): boolean {
  const records = readPendingRecords(scope);
  let found = false;
  const next = records.map((record) => {
    if (record.message.id !== messageId) return record;
    found = true;
    return { ...record, message: update(record.message) };
  });
  return found && writeJson(getPendingMessagesCacheKey(scope), next);
}

export function markPendingRoomMessageFailed(scope: ChatPendingScope, messageId: string): boolean {
  return updatePendingRoomMessage(scope, messageId, (message) => ({
    ...message,
    metadata_json: { ...message.metadata_json, _status: 'failed', _failed: true },
  }));
}

export function clearChatCaches() {
  if (!canUseLocalStorage()) return;

  try {
    const prefixes = [
      CHAT_ROOMS_CACHE_PREFIX,
      CHAT_ROOM_SNAPSHOT_CACHE_PREFIX,
      CHAT_PENDING_MESSAGES_CACHE_PREFIX,
      LEGACY_CHAT_PENDING_MESSAGES_CACHE_PREFIX,
      'revealed-',
    ];
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Best-effort cleanup only.
  }
}
