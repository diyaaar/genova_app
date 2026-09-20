import {
  isChatReadScopeCurrent,
  parseChatReadMessage,
  parseChatReadMessageCursor,
  isChatReadMessageBeforeCursor,
  type ChatReadMessage,
  type ChatReadScope,
} from '@shared/chat-read-contract';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const PAGE_SIZE = 40;
const STATE_CHUNK_SIZE = 40;

export type NativeChatStarErrorCode =
  | 'action-failed'
  | 'invalid-acknowledgement'
  | 'invalid-data'
  | 'invalid-target'
  | 'stale-scope';

export class NativeChatStarError extends Error {
  constructor(readonly code: NativeChatStarErrorCode) {
    super(code);
    this.name = 'NativeChatStarError';
  }
}

export interface NativeChatStarCursor {
  createdAt: string;
  id: string;
}

export interface NativeChatStarredMessage {
  starId: string;
  starredAt: string;
  message: ChatReadMessage;
}

export interface NativeChatStarredPage {
  items: NativeChatStarredMessage[];
  nextCursor: NativeChatStarCursor | null;
  hasMore: boolean;
}

export interface NativeChatStarTransport {
  loadStateRows(input: {
    scope: ChatReadScope;
    roomId: string;
    messageIds: string[];
  }): Promise<unknown>;
  addStar(input: { scope: ChatReadScope; messageId: string }): Promise<unknown>;
  removeStar(input: { scope: ChatReadScope; messageId: string }): Promise<unknown>;
  loadPageRows(input: {
    scope: ChatReadScope;
    roomId: string;
    before: NativeChatStarCursor | null;
    limit: number;
  }): Promise<unknown>;
}

export interface NativeChatStarGateway {
  loadStates(scope: ChatReadScope, roomId: string, messageIds: string[]): Promise<ReadonlySet<string>>;
  setStarred(
    scope: ChatReadScope,
    roomId: string,
    messageId: string,
    starred: boolean,
  ): Promise<ReadonlySet<string>>;
  loadPage(
    scope: ChatReadScope,
    roomId: string,
    options?: { before?: NativeChatStarCursor | null },
  ): Promise<NativeChatStarredPage>;
  clear(): void;
}

interface ParsedStarRow {
  id: string;
  messageId: string;
  memberId: string;
  choirId: string;
  createdAt: string;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function uuid(value: unknown): string | null {
  return typeof value === 'string' && UUID_PATTERN.test(value) ? value.toLowerCase() : null;
}

function timestamp(value: unknown): string | null {
  const parsed = parseChatReadMessageCursor({ id: '00000000-0000-4000-8000-000000000000', createdAt: value });
  return parsed.kind === 'rejected' ? null : parsed.value.createdAt;
}

function timestampMicros(value: unknown): bigint | null {
  if (typeof value !== 'string' || value.length > 64) return null;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/u.exec(value);
  if (!match?.[1] || !match[3]) return null;
  const epochMillis = Date.parse(`${match[1]}${match[3]}`);
  if (!Number.isFinite(epochMillis)) return null;
  const micros = BigInt((match[2] ?? '').padEnd(6, '0'));
  return BigInt(epochMillis) * 1_000n + micros;
}

function requireUuid(value: unknown): string {
  const parsed = uuid(value);
  if (!parsed) throw new NativeChatStarError('invalid-target');
  return parsed;
}

function parseStarRow(value: unknown, scope: ChatReadScope): ParsedStarRow {
  const row = record(value);
  if (!row) throw new NativeChatStarError('invalid-data');
  const parsed: ParsedStarRow = {
    id: uuid(row.id) ?? '',
    messageId: uuid(row.message_id) ?? '',
    memberId: uuid(row.member_id) ?? '',
    choirId: uuid(row.choir_id) ?? '',
    createdAt: timestamp(row.created_at) ?? '',
  };
  if (!parsed.id || !parsed.messageId || !parsed.memberId || !parsed.choirId || !parsed.createdAt
    || parsed.memberId !== scope.memberId || parsed.choirId !== scope.choirId) {
    throw new NativeChatStarError('invalid-data');
  }
  return parsed;
}

function embeddedMessage(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) return value.length === 1 ? record(value[0]) : null;
  return record(value);
}

function parseStateRows(
  value: unknown,
  scope: ChatReadScope,
  roomId: string,
  expectedMessageIds: ReadonlySet<string>,
): Set<string> {
  if (!Array.isArray(value) || value.length > expectedMessageIds.size) {
    throw new NativeChatStarError('invalid-data');
  }
  const result = new Set<string>();
  const starIds = new Set<string>();
  for (const item of value) {
    const star = parseStarRow(item, scope);
    const row = record(item);
    const message = embeddedMessage(row?.message);
    if (!message || uuid(message.id) !== star.messageId || uuid(message.room_id) !== roomId
      || message.is_deleted !== false || !expectedMessageIds.has(star.messageId)
      || result.has(star.messageId) || starIds.has(star.id)) {
      throw new NativeChatStarError('invalid-data');
    }
    starIds.add(star.id);
    result.add(star.messageId);
  }
  return result;
}

function parseAcknowledgement(
  value: unknown,
  scope: ChatReadScope,
  messageId: string,
): ParsedStarRow {
  if (!Array.isArray(value) || value.length !== 1) {
    throw new NativeChatStarError('invalid-acknowledgement');
  }
  let parsed: ParsedStarRow;
  try {
    parsed = parseStarRow(value[0], scope);
  } catch {
    throw new NativeChatStarError('invalid-acknowledgement');
  }
  if (parsed.messageId !== messageId) throw new NativeChatStarError('invalid-acknowledgement');
  return parsed;
}

function compareStarsDescending(left: NativeChatStarredMessage, right: NativeChatStarredMessage): number {
  const leftTime = timestampMicros(left.starredAt);
  const rightTime = timestampMicros(right.starredAt);
  if (leftTime === null || rightTime === null) throw new NativeChatStarError('invalid-data');
  if (leftTime < rightTime) return 1;
  if (leftTime > rightTime) return -1;
  return right.starId.localeCompare(left.starId);
}

function scopeKey(scope: ChatReadScope): string {
  return `${scope.userId}:${scope.choirId}:${scope.memberId}`;
}

/**
 * Accepts only current-member rows and keeps star state in memory for one active room.
 * There is deliberately no optimistic write or Realtime promise: snapshots and exact write rows
 * are the authority, and tenant/room changes invalidate late work.
 */
export function createNativeChatStarGateway(transport: NativeChatStarTransport): NativeChatStarGateway {
  let generation = 0;
  let currentScope: ChatReadScope | null = null;
  let currentRoomId: string | null = null;
  let starredIds = new Set<string>();
  const inFlight = new Map<string, Promise<ReadonlySet<string>>>();
  let stateQueue: Promise<void> = Promise.resolve();

  const begin = (scope: ChatReadScope, roomIdValue: string) => {
    const roomId = requireUuid(roomIdValue);
    if ((currentScope && !isChatReadScopeCurrent(currentScope, scope))
      || (currentRoomId && currentRoomId !== roomId)) {
      generation += 1;
      starredIds = new Set();
      inFlight.clear();
      stateQueue = Promise.resolve();
    }
    currentScope = scope;
    currentRoomId = roomId;
    return { generation, roomId };
  };

  const assertCurrent = (scope: ChatReadScope, roomId: string, startedAt: number) => {
    if (startedAt !== generation || !currentScope || !isChatReadScopeCurrent(currentScope, scope)
      || currentRoomId !== roomId) {
      throw new NativeChatStarError('stale-scope');
    }
  };

  const enqueueState = <T>(work: () => Promise<T>): Promise<T> => {
    const result = stateQueue.catch(() => {}).then(work);
    stateQueue = result.then(() => {}, () => {});
    return result;
  };

  return {
    loadStates(scope, roomIdValue, rawMessageIds) {
      const started = begin(scope, roomIdValue);
      const messageIds = Array.from(new Set(rawMessageIds.map(requireUuid)));
      const queried = new Set(messageIds);
      return enqueueState(async () => {
        assertCurrent(scope, started.roomId, started.generation);
        const accepted = new Set<string>();
        try {
          for (let offset = 0; offset < messageIds.length; offset += STATE_CHUNK_SIZE) {
            const chunk = messageIds.slice(offset, offset + STATE_CHUNK_SIZE);
            const raw = await transport.loadStateRows({ scope, roomId: started.roomId, messageIds: chunk });
            assertCurrent(scope, started.roomId, started.generation);
            const parsed = parseStateRows(raw, scope, started.roomId, new Set(chunk));
            for (const messageId of parsed) accepted.add(messageId);
          }
        } catch (error) {
          if (error instanceof NativeChatStarError) throw error;
          throw new NativeChatStarError('action-failed');
        }
        assertCurrent(scope, started.roomId, started.generation);
        const next = new Set(starredIds);
        for (const messageId of queried) next.delete(messageId);
        for (const messageId of accepted) next.add(messageId);
        starredIds = next;
        return new Set(starredIds);
      });
    },

    setStarred(scope, roomIdValue, messageIdValue, desired) {
      const started = begin(scope, roomIdValue);
      const messageId = requireUuid(messageIdValue);
      const key = `${scopeKey(scope)}:${started.roomId}:${messageId}`;
      const existing = inFlight.get(key);
      if (existing) return existing;
      const operation = enqueueState(async () => {
        assertCurrent(scope, started.roomId, started.generation);
        let raw: unknown;
        try {
          raw = desired
            ? await transport.addStar({ scope, messageId })
            : await transport.removeStar({ scope, messageId });
        } catch {
          throw new NativeChatStarError('action-failed');
        }
        assertCurrent(scope, started.roomId, started.generation);
        parseAcknowledgement(raw, scope, messageId);
        const next = new Set(starredIds);
        if (desired) next.add(messageId);
        else next.delete(messageId);
        starredIds = next;
        return new Set(starredIds);
      });
      inFlight.set(key, operation);
      void operation.finally(() => {
        if (inFlight.get(key) === operation) inFlight.delete(key);
      }).catch(() => {});
      return operation;
    },

    async loadPage(scope, roomIdValue, options) {
      const started = begin(scope, roomIdValue);
      const cursor = options?.before ? parseChatReadMessageCursor(options.before) : null;
      if (cursor?.kind === 'rejected') {
        throw new NativeChatStarError('invalid-target');
      }
      const before = cursor?.value ?? null;
      let raw: unknown;
      try {
        raw = await transport.loadPageRows({
          scope,
          roomId: started.roomId,
          before,
          limit: PAGE_SIZE + 1,
        });
      } catch {
        throw new NativeChatStarError('action-failed');
      }
      assertCurrent(scope, started.roomId, started.generation);
      if (!Array.isArray(raw) || raw.length > PAGE_SIZE + 1) {
        throw new NativeChatStarError('invalid-data');
      }
      const messageIds = new Set<string>();
      const starIds = new Set<string>();
      const parsed = raw.map((item) => {
        const star = parseStarRow(item, scope);
        const row = record(item);
        const messageRow = embeddedMessage(row?.message);
        const message = parseChatReadMessage(messageRow, started.roomId);
        if (message.kind === 'rejected' || message.value.id !== star.messageId || message.value.isDeleted
          || messageIds.has(star.messageId) || starIds.has(star.id)
          || (before && !isChatReadMessageBeforeCursor(
            { ...message.value, id: star.id, createdAt: star.createdAt }, before,
          ))) {
          throw new NativeChatStarError('invalid-data');
        }
        messageIds.add(star.messageId);
        starIds.add(star.id);
        return { starId: star.id, starredAt: star.createdAt, message: message.value };
      }).sort(compareStarsDescending);
      const hasMore = parsed.length > PAGE_SIZE;
      const items = parsed.slice(0, PAGE_SIZE);
      const oldest = items.at(-1) ?? null;
      return {
        items,
        nextCursor: oldest ? { createdAt: oldest.starredAt, id: oldest.starId } : null,
        hasMore,
      };
    },

    clear() {
      generation += 1;
      currentScope = null;
      currentRoomId = null;
      starredIds = new Set();
      inFlight.clear();
      stateQueue = Promise.resolve();
    },
  };
}
