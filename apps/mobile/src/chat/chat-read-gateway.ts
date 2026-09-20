import {
  createChatReadMessageCursor,
  isChatReadScopeCurrent,
  mergeChatReadMessagePages,
  parseChatReadMessagePage,
  parseChatReadRoomSummaries,
  type ChatReadMessage,
  type ChatReadMessageCursor,
  type ChatReadRoomSummary,
  type ChatReadScope,
} from '@shared/chat-read-contract';

const PAGE_SIZE = 40;

export type NativeChatConnectionState = 'connected' | 'disconnected';
export type NativeChatReadErrorCode = 'inaccessible-room' | 'invalid-data' | 'stale-scope';

export class NativeChatReadError extends Error {
  constructor(readonly code: NativeChatReadErrorCode) {
    super(code);
    this.name = 'NativeChatReadError';
  }
}

export interface NativeChatReadTransport {
  loadRoomRows(memberId: string): Promise<unknown>;
  loadMessageRows(input: {
    roomId: string;
    before: ChatReadMessageCursor | null;
    limit: number;
  }): Promise<unknown>;
  markRoomRead(roomId: string, memberId: string): Promise<void>;
  watchRoomList(
    scope: ChatReadScope,
    listener: { invalidate: () => void; connection: (state: NativeChatConnectionState) => void },
  ): () => void;
  watchRoom(
    scope: ChatReadScope,
    roomId: string,
    listener: { invalidate: () => void; connection: (state: NativeChatConnectionState) => void },
  ): () => void;
}

export interface NativeChatMessagePage {
  room: ChatReadRoomSummary;
  messages: ChatReadMessage[];
  nextCursor: ChatReadMessageCursor | null;
  hasMore: boolean;
}

export interface NativeChatReadGateway {
  loadRooms(scope: ChatReadScope, options?: { force?: boolean }): Promise<ChatReadRoomSummary[]>;
  loadMessages(
    scope: ChatReadScope,
    roomId: string,
    options?: { before?: ChatReadMessageCursor | null },
  ): Promise<NativeChatMessagePage>;
  markRoomRead(scope: ChatReadScope, roomId: string): Promise<void>;
  watchRoomList(
    scope: ChatReadScope,
    listener: { invalidate: () => void; connection: (state: NativeChatConnectionState) => void },
  ): () => void;
  watchRoom(
    scope: ChatReadScope,
    roomId: string,
    listener: { invalidate: () => void; connection: (state: NativeChatConnectionState) => void },
  ): () => void;
  clear(): void;
}

function scopeKey(scope: ChatReadScope): string {
  return `${scope.userId}:${scope.choirId}:${scope.memberId}`;
}

function activityTime(room: ChatReadRoomSummary): number {
  return Date.parse(room.lastMessage?.createdAt ?? room.createdAt);
}

export function isNativeChatRoomVisible(room: ChatReadRoomSummary): boolean {
  if (!room.membership.hiddenAt) return true;
  if (!room.lastMessage) return false;
  return Date.parse(room.lastMessage.createdAt) > Date.parse(room.membership.hiddenAt);
}

export function getNativeChatRoomTitle(room: ChatReadRoomSummary): string {
  if (room.type !== 'dm') return room.membership.nickname?.trim() || room.name;
  const otherMembers = room.membersPreview.filter((member) => member.memberId !== room.membership.memberId);
  const names = otherMembers.map((member) => `${member.firstName} ${member.lastName}`.trim()).filter(Boolean);
  return room.membership.nickname?.trim() || names.join(', ') || room.name;
}

function sortRooms(rooms: ChatReadRoomSummary[]): ChatReadRoomSummary[] {
  return rooms
    .filter((room) => !room.isArchived && isNativeChatRoomVisible(room))
    .sort((left, right) => activityTime(right) - activityTime(left) || left.id.localeCompare(right.id));
}

/**
 * Validates every transport row and keeps only process memory scoped to one account/choir/member.
 * Realtime listeners can invalidate snapshots, but they never supply trusted room or message data.
 */
export function createNativeChatReadGateway(transport: NativeChatReadTransport): NativeChatReadGateway {
  let generation = 0;
  let currentScope: ChatReadScope | null = null;
  let rooms: ChatReadRoomSummary[] | null = null;
  const messagesByRoom = new Map<string, ChatReadMessage[]>();
  const watchers = new Set<() => void>();
  let roomSnapshotQueue: Promise<void> = Promise.resolve();
  let messageSnapshotQueue: Promise<void> = Promise.resolve();

  const begin = (scope: ChatReadScope) => {
    if (currentScope && !isChatReadScopeCurrent(currentScope, scope)) {
      generation += 1;
      rooms = null;
      messagesByRoom.clear();
      for (const stop of Array.from(watchers)) stop();
      watchers.clear();
    }
    currentScope = scope;
    return generation;
  };

  const assertCurrent = (scope: ChatReadScope, startedAt: number) => {
    if (startedAt !== generation || !currentScope || !isChatReadScopeCurrent(currentScope, scope)) {
      throw new NativeChatReadError('stale-scope');
    }
  };

  const readRooms = (scope: ChatReadScope, force: boolean): Promise<ChatReadRoomSummary[]> => {
    const startedAt = begin(scope);
    if (!force && rooms) return Promise.resolve(rooms);
    const run = roomSnapshotQueue.catch(() => {}).then(async () => {
      assertCurrent(scope, startedAt);
      const raw = await transport.loadRoomRows(scope.memberId);
      assertCurrent(scope, startedAt);
      const parsed = parseChatReadRoomSummaries(raw, scope.memberId);
      if (parsed.kind === 'rejected') throw new NativeChatReadError('invalid-data');
      rooms = sortRooms(parsed.value);
      const allowed = new Set(rooms.map((room) => room.id));
      for (const roomId of messagesByRoom.keys()) {
        if (!allowed.has(roomId)) messagesByRoom.delete(roomId);
      }
      return rooms;
    });
    roomSnapshotQueue = run.then(() => {}, () => {});
    return run;
  };

  const track = (stop: () => void) => {
    let active = true;
    const wrapped = () => {
      if (!active) return;
      active = false;
      watchers.delete(wrapped);
      stop();
    };
    watchers.add(wrapped);
    return wrapped;
  };

  const guardedListener = (
    scope: ChatReadScope,
    startedAt: number,
    listener: { invalidate: () => void; connection: (state: NativeChatConnectionState) => void },
    isActive: () => boolean,
  ) => ({
    invalidate: () => {
      if (isActive() && startedAt === generation && currentScope && isChatReadScopeCurrent(currentScope, scope)) {
        listener.invalidate();
      }
    },
    connection: (state: NativeChatConnectionState) => {
      if (isActive() && startedAt === generation && currentScope && isChatReadScopeCurrent(currentScope, scope)) {
        listener.connection(state);
      }
    },
  });

  return {
    loadRooms(scope, options) {
      return readRooms(scope, options?.force ?? false);
    },

    loadMessages(scope, roomId, options) {
      const startedAt = begin(scope);
      const run = messageSnapshotQueue.catch(() => {}).then(async () => {
        assertCurrent(scope, startedAt);
        const authorizedRooms = await readRooms(scope, true);
        assertCurrent(scope, startedAt);
        const room = authorizedRooms.find((candidate) => candidate.id === roomId);
        if (!room) throw new NativeChatReadError('inaccessible-room');

        const before = options?.before ?? null;
        const raw = await transport.loadMessageRows({ roomId, before, limit: PAGE_SIZE });
        assertCurrent(scope, startedAt);
        const parsed = parseChatReadMessagePage(raw, roomId);
        if (parsed.kind === 'rejected') throw new NativeChatReadError('invalid-data');

        const prior = before ? messagesByRoom.get(roomId) ?? [] : [];
        const messages = mergeChatReadMessagePages(parsed.value, prior);
        messagesByRoom.set(roomId, messages);
        const oldest = messages[0] ?? null;
        return {
          room,
          messages,
          nextCursor: oldest ? createChatReadMessageCursor(oldest) : null,
          hasMore: Array.isArray(raw) && raw.length === PAGE_SIZE,
        };
      });
      messageSnapshotQueue = run.then(() => {}, () => {});
      return run;
    },

    async markRoomRead(scope, roomId) {
      const startedAt = begin(scope);
      const room = rooms?.find((candidate) => candidate.id === roomId);
      if (!room) throw new NativeChatReadError('inaccessible-room');
      await transport.markRoomRead(roomId, scope.memberId);
      assertCurrent(scope, startedAt);
    },

    watchRoomList(scope, listener) {
      const startedAt = begin(scope);
      let active = true;
      const stop = transport.watchRoomList(
        scope,
        guardedListener(scope, startedAt, listener, () => active),
      );
      return track(() => {
        active = false;
        stop();
      });
    },

    watchRoom(scope, roomId, listener) {
      const startedAt = begin(scope);
      if (!rooms?.some((room) => room.id === roomId)) throw new NativeChatReadError('inaccessible-room');
      let active = true;
      const stop = transport.watchRoom(
        scope,
        roomId,
        guardedListener(scope, startedAt, listener, () => active),
      );
      return track(() => {
        active = false;
        stop();
      });
    },

    clear() {
      generation += 1;
      currentScope = null;
      rooms = null;
      messagesByRoom.clear();
      for (const stop of Array.from(watchers)) stop();
      watchers.clear();
    },
  };
}
