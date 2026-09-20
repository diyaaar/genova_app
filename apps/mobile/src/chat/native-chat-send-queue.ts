import {
  createChatReadScope,
  isChatReadScopeCurrent,
  type ChatReadMessage,
  type ChatReadScope,
} from '@shared/chat-read-contract';
import type { SessionStorage } from '../auth/types';

const STORAGE_POINTER_KEY = 'genova.native-chat.send-queue.v1.pointer';
const STORAGE_SLOT_KEYS = {
  a: 'genova.native-chat.send-queue.v1.a',
  b: 'genova.native-chat.send-queue.v1.b',
} as const;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
export const NATIVE_CHAT_QUEUE_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
export const MAX_NATIVE_CHAT_QUEUE_ITEMS = 20;
export const MAX_NATIVE_CHAT_QUEUE_SERIALIZED_BYTES = 131_072;

type QueueSlot = keyof typeof STORAGE_SLOT_KEYS;

interface QueueEnvelope {
  version: 1;
  generation: number;
  records: NativeChatQueuedText[];
}

export interface NativeChatLinkPreview {
  [key: string]: string | null;
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  domain: string;
}

export interface NativeChatQueuedText {
  version: 1;
  scope: ChatReadScope;
  roomId: string;
  clientMutationId: string;
  content: string;
  replyToId: string | null;
  linkPreview: NativeChatLinkPreview | null;
  queuedAt: number;
  status: 'pending' | 'failed';
}

export type NativeChatQueueErrorCode =
  | 'conflicting-mutation'
  | 'invalid-record'
  | 'queue-full'
  | 'queue-too-large'
  | 'storage-failed';

export class NativeChatQueueError extends Error {
  constructor(readonly code: NativeChatQueueErrorCode) {
    super(code);
    this.name = 'NativeChatQueueError';
  }
}

export interface NativeChatSendQueue {
  load(scope: ChatReadScope, roomId: string): Promise<NativeChatQueuedText[]>;
  put(record: NativeChatQueuedText): Promise<NativeChatQueuedText>;
  markFailed(scope: ChatReadScope, roomId: string, clientMutationId: string): Promise<NativeChatQueuedText[]>;
  remove(scope: ChatReadScope, roomId: string, clientMutationId: string): Promise<NativeChatQueuedText[]>;
  reconcile(
    scope: ChatReadScope,
    roomId: string,
    messages: ReadonlyArray<ChatReadMessage>,
  ): Promise<NativeChatQueuedText[]>;
  clear(): Promise<void>;
}

function validUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (const character of value) {
    const point = character.codePointAt(0) ?? 0;
    if (point <= 0x7f) bytes += 1;
    else if (point <= 0x7ff) bytes += 2;
    else if (point <= 0xffff) bytes += 3;
    else bytes += 4;
  }
  return bytes;
}

function validOptionalString(value: unknown, maxLength: number): value is string | null {
  return value === null || (typeof value === 'string' && value.length <= maxLength);
}

function validHttpUrl(value: string): boolean {
  if (value.length > 4_096) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function parseNativeChatLinkPreview(value: unknown): NativeChatLinkPreview | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Partial<NativeChatLinkPreview>;
  if (typeof input.url !== 'string' || !validHttpUrl(input.url)) return null;
  if (typeof input.domain !== 'string' || input.domain.trim().length === 0 || input.domain.length > 255) return null;
  if (!validOptionalString(input.title, 1_000)
    || !validOptionalString(input.description, 4_000)
    || !validOptionalString(input.image, 4_096)
    || !validOptionalString(input.favicon, 4_096)) return null;
  if (input.image !== null && input.image !== undefined && !validHttpUrl(input.image)) return null;
  if (input.favicon !== null && input.favicon !== undefined && !validHttpUrl(input.favicon)) return null;
  return {
    url: input.url,
    title: input.title ?? null,
    description: input.description ?? null,
    image: input.image ?? null,
    favicon: input.favicon ?? null,
    domain: input.domain,
  };
}

function samePayload(left: NativeChatQueuedText, right: NativeChatQueuedText): boolean {
  return left.roomId === right.roomId
    && left.content === right.content
    && left.replyToId === right.replyToId
    && JSON.stringify(left.linkPreview) === JSON.stringify(right.linkPreview)
    && isChatReadScopeCurrent(left.scope, right.scope);
}

function parseRecord(value: unknown, now: number): NativeChatQueuedText | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Partial<NativeChatQueuedText>;
  const scope = input.scope ? createChatReadScope(input.scope) : null;
  const preview = input.linkPreview === null ? null : parseNativeChatLinkPreview(input.linkPreview);
  if (input.version !== 1 || !scope || !validUuid(input.roomId)
    || !validUuid(input.clientMutationId) || typeof input.content !== 'string'
    || input.content.trim().length === 0 || input.content.length > 20_000
    || (input.replyToId !== null && !validUuid(input.replyToId))
    || (input.linkPreview !== null && !preview)
    || typeof input.queuedAt !== 'number' || !Number.isFinite(input.queuedAt)
    || input.queuedAt > now || input.queuedAt < now - NATIVE_CHAT_QUEUE_TTL_MS
    || (input.status !== 'pending' && input.status !== 'failed')) return null;
  return {
    version: 1,
    scope,
    roomId: input.roomId.toLowerCase(),
    clientMutationId: input.clientMutationId.toLowerCase(),
    content: input.content,
    replyToId: input.replyToId?.toLowerCase() ?? null,
    linkPreview: preview,
    queuedAt: input.queuedAt,
    status: input.status,
  };
}

function inRoom(record: NativeChatQueuedText, scope: ChatReadScope, roomId: string): boolean {
  return record.roomId === roomId && isChatReadScopeCurrent(record.scope, scope);
}

export function createNativeChatSendQueue(
  storage: SessionStorage,
  now: () => number = Date.now,
): NativeChatSendQueue {
  let operation: Promise<void> = Promise.resolve();

  const serialize = <T>(work: () => Promise<T>): Promise<T> => {
    const result = operation.catch(() => {}).then(work);
    operation = result.then(() => {}, () => {});
    return result;
  };

  const removeAll = async () => {
    let failed = false;
    for (const key of [STORAGE_POINTER_KEY, STORAGE_SLOT_KEYS.a, STORAGE_SLOT_KEYS.b]) {
      try {
        await storage.removeItem(key);
      } catch {
        failed = true;
      }
    }
    if (failed) throw new NativeChatQueueError('storage-failed');
  };

  const parseEnvelope = (raw: string | null): (QueueEnvelope & { dirty: boolean }) | null => {
    if (raw === null) return null;
    let value: unknown;
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const input = value as Partial<QueueEnvelope>;
    if (input.version !== 1 || !Number.isSafeInteger(input.generation)
      || (input.generation ?? -1) < 0 || !Array.isArray(input.records)) return null;
    const currentTime = now();
    const records = input.records
      .map((item) => parseRecord(item, currentTime))
      .filter((item): item is NativeChatQueuedText => item !== null)
      .slice(-MAX_NATIVE_CHAT_QUEUE_ITEMS);
    return {
      version: 1,
      generation: input.generation as number,
      records,
      dirty: records.length !== input.records.length,
    };
  };

  const readState = async (): Promise<{
    slot: QueueSlot | null;
    generation: number;
    records: NativeChatQueuedText[];
    dirty: boolean;
  }> => {
    let pointer: string | null;
    let aRaw: string | null;
    let bRaw: string | null;
    try {
      [pointer, aRaw, bRaw] = await Promise.all([
        storage.getItem(STORAGE_POINTER_KEY),
        storage.getItem(STORAGE_SLOT_KEYS.a),
        storage.getItem(STORAGE_SLOT_KEYS.b),
      ]);
    } catch {
      throw new NativeChatQueueError('storage-failed');
    }
    const slots = { a: parseEnvelope(aRaw), b: parseEnvelope(bRaw) };
    const pointedSlot: QueueSlot | null = pointer === 'a' || pointer === 'b' ? pointer : null;
    let slot: QueueSlot | null = pointedSlot && slots[pointedSlot] ? pointedSlot : null;
    if (!slot && pointedSlot) {
      // The pointer is the commit record. If its selected copy is corrupt, only the opposite
      // complete slot can be the previously committed state. Without a valid pointer, neither
      // slot is authorized and the namespace is discarded rather than guessing.
      const fallback: QueueSlot = pointedSlot === 'a' ? 'b' : 'a';
      if (slots[fallback]) slot = fallback;
    }
    if (!slot) {
      if (pointer !== null || aRaw !== null || bRaw !== null) await removeAll();
      return { slot: null, generation: 0, records: [], dirty: false };
    }
    const selected = slots[slot] as QueueEnvelope & { dirty: boolean };
    return {
      slot,
      generation: selected.generation,
      records: selected.records,
      dirty: selected.dirty || pointer !== slot,
    };
  };

  const write = async (records: NativeChatQueuedText[]) => {
    if (records.length === 0) {
      await removeAll();
      return;
    }
    const state = await readState();
    const nextSlot: QueueSlot = state.slot === 'a' ? 'b' : 'a';
    const envelope: QueueEnvelope = {
      version: 1,
      generation: state.generation + 1,
      records,
    };
    const serialized = JSON.stringify(envelope);
    if (utf8ByteLength(serialized) > MAX_NATIVE_CHAT_QUEUE_SERIALIZED_BYTES) {
      throw new NativeChatQueueError('queue-too-large');
    }
    try {
      // The inactive slot is complete before the one-value pointer commit. A failed write leaves
      // the prior slot readable; a failed pointer never authorizes network in the current turn.
      await storage.setItem(STORAGE_SLOT_KEYS[nextSlot], serialized);
      await storage.setItem(STORAGE_POINTER_KEY, nextSlot);
    } catch {
      throw new NativeChatQueueError('storage-failed');
    }
  };

  const read = async (): Promise<NativeChatQueuedText[]> => {
    const state = await readState();
    if (state.dirty) await write(state.records);
    return state.records;
  };

  const roomRecords = (records: NativeChatQueuedText[], scope: ChatReadScope, roomId: string) => (
    records.filter((record) => inRoom(record, scope, roomId)).sort((a, b) => a.queuedAt - b.queuedAt)
  );

  return {
    load(scope, roomId) {
      return serialize(async () => roomRecords(await read(), scope, roomId));
    },

    put(record) {
      return serialize(async () => {
        const parsed = parseRecord(record, now());
        if (!parsed) throw new NativeChatQueueError('invalid-record');
        const records = await read();
        const existing = records.find((item) => item.clientMutationId === parsed.clientMutationId);
        if (existing && !samePayload(existing, parsed)) {
          throw new NativeChatQueueError('conflicting-mutation');
        }
        if (!existing && records.length >= MAX_NATIVE_CHAT_QUEUE_ITEMS) {
          throw new NativeChatQueueError('queue-full');
        }
        const next = [
          ...records.filter((item) => item.clientMutationId !== parsed.clientMutationId),
          { ...parsed, queuedAt: existing?.queuedAt ?? parsed.queuedAt },
        ].sort((a, b) => a.queuedAt - b.queuedAt);
        await write(next);
        return next.find((item) => item.clientMutationId === parsed.clientMutationId) as NativeChatQueuedText;
      });
    },

    markFailed(scope, roomId, clientMutationId) {
      return serialize(async () => {
        const records = await read();
        const next = records.map((record) => (
          inRoom(record, scope, roomId) && record.clientMutationId === clientMutationId
            ? { ...record, status: 'failed' as const }
            : record
        ));
        await write(next);
        return roomRecords(next, scope, roomId);
      });
    },

    remove(scope, roomId, clientMutationId) {
      return serialize(async () => {
        const records = await read();
        const next = records.filter((record) => (
          !inRoom(record, scope, roomId) || record.clientMutationId !== clientMutationId
        ));
        await write(next);
        return roomRecords(next, scope, roomId);
      });
    },

    reconcile(scope, roomId, messages) {
      return serialize(async () => {
        const acknowledgements = new Set(messages.flatMap((message) => (
          message.roomId === roomId && message.clientMutationId ? [message.clientMutationId] : []
        )));
        const records = await read();
        const next = records.filter((record) => (
          !inRoom(record, scope, roomId) || !acknowledgements.has(record.clientMutationId)
        ));
        if (next.length !== records.length) await write(next);
        return roomRecords(next, scope, roomId);
      });
    },

    clear() {
      return serialize(removeAll);
    },
  };
}
