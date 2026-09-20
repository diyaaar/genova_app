import {
  isChatReadScopeCurrent,
  parseChatReadMessage,
  type ChatReadMessage,
  type ChatReadScope,
} from '@shared/chat-read-contract';
import {
  NativeChatQueueError,
  parseNativeChatLinkPreview,
  type NativeChatLinkPreview,
  type NativeChatQueuedText,
  type NativeChatSendQueue,
} from './native-chat-send-queue';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/iu;

export type NativeChatSendErrorCode =
  | 'invalid-acknowledgement'
  | 'invalid-draft'
  | 'queue-full'
  | 'queue-too-large'
  | 'stale-scope'
  | 'storage-failed'
  | 'transmit-failed';

export class NativeChatSendError extends Error {
  constructor(readonly code: NativeChatSendErrorCode) {
    super(code);
    this.name = 'NativeChatSendError';
  }
}

export interface NativeChatSendTransport {
  loadLinkPreview(url: string): Promise<unknown>;
  sendText(input: {
    roomId: string;
    clientMutationId: string;
    content: string;
    replyToId: string | null;
    metadata: { link_preview?: NativeChatLinkPreview };
  }): Promise<unknown>;
}

export interface NativeChatSendGateway {
  prepare(
    scope: ChatReadScope,
    roomId: string,
    content: string,
    replyToId: string | null,
  ): Promise<{ record: NativeChatQueuedText; previewWarning: boolean }>;
  transmit(scope: ChatReadScope, record: NativeChatQueuedText): Promise<ChatReadMessage>;
  restore(scope: ChatReadScope, roomId: string): Promise<NativeChatQueuedText[]>;
  reconcile(
    scope: ChatReadScope,
    roomId: string,
    messages: ReadonlyArray<ChatReadMessage>,
  ): Promise<NativeChatQueuedText[]>;
  cancel(scope: ChatReadScope, roomId: string, clientMutationId: string): Promise<NativeChatQueuedText[]>;
  clear(): Promise<void>;
}

function normalizeFirstUrl(content: string): string | null {
  const match = URL_PATTERN.exec(content)?.[0];
  if (!match) return null;
  const candidate = match.replace(/[),.!?;:]+$/u, '');
  try {
    const url = new URL(candidate.startsWith('www.') ? `https://${candidate}` : candidate);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function samePreview(left: unknown, right: NativeChatLinkPreview | null): boolean {
  if (right === null) return left === undefined || left === null;
  const parsed = parseNativeChatLinkPreview(left);
  return JSON.stringify(parsed) === JSON.stringify(right);
}

function sendError(error: unknown): NativeChatSendError {
  if (error instanceof NativeChatSendError) return error;
  if (error instanceof NativeChatQueueError) {
    if (error.code === 'queue-full') return new NativeChatSendError('queue-full');
    if (error.code === 'queue-too-large') return new NativeChatSendError('queue-too-large');
    if (error.code === 'storage-failed') return new NativeChatSendError('storage-failed');
    return new NativeChatSendError('invalid-draft');
  }
  return new NativeChatSendError('transmit-failed');
}

export function createNativeChatSendGateway(
  transport: NativeChatSendTransport,
  queue: NativeChatSendQueue,
  createId: () => string,
  now: () => number = Date.now,
): NativeChatSendGateway {
  let generation = 0;
  let currentScope: ChatReadScope | null = null;
  let transmitQueue: Promise<void> = Promise.resolve();

  const begin = (scope: ChatReadScope) => {
    if (currentScope && !isChatReadScopeCurrent(currentScope, scope)) generation += 1;
    currentScope = scope;
    return generation;
  };

  const assertCurrent = (scope: ChatReadScope, startedAt: number) => {
    if (startedAt !== generation || !currentScope || !isChatReadScopeCurrent(currentScope, scope)) {
      throw new NativeChatSendError('stale-scope');
    }
  };

  const serializeTransmit = <T>(work: () => Promise<T>) => {
    const result = transmitQueue.catch(() => {}).then(work);
    transmitQueue = result.then(() => {}, () => {});
    return result;
  };

  return {
    async prepare(scope, roomId, content, replyToId) {
      const startedAt = begin(scope);
      const cleanContent = content.trim();
      if (!UUID_PATTERN.test(roomId) || (replyToId !== null && !UUID_PATTERN.test(replyToId))
        || cleanContent.length === 0 || cleanContent.length > 20_000) {
        throw new NativeChatSendError('invalid-draft');
      }

      let linkPreview: NativeChatLinkPreview | null = null;
      let previewWarning = false;
      const url = normalizeFirstUrl(cleanContent);
      if (url) {
        try {
          linkPreview = parseNativeChatLinkPreview(await transport.loadLinkPreview(url));
          if (!linkPreview) previewWarning = true;
        } catch {
          previewWarning = true;
        }
        assertCurrent(scope, startedAt);
      }

      const clientMutationId = createId();
      const record: NativeChatQueuedText = {
        version: 1,
        scope,
        roomId: roomId.toLowerCase(),
        clientMutationId,
        content: cleanContent,
        replyToId: replyToId?.toLowerCase() ?? null,
        linkPreview,
        queuedAt: now(),
        status: 'pending',
      };
      try {
        const stored = await queue.put(record);
        assertCurrent(scope, startedAt);
        return { record: stored, previewWarning };
      } catch (error) {
        throw sendError(error);
      }
    },

    transmit(scope, record) {
      const startedAt = begin(scope);
      return serializeTransmit(async () => {
        assertCurrent(scope, startedAt);
        if (!isChatReadScopeCurrent(scope, record.scope)) throw new NativeChatSendError('stale-scope');
        try {
          const pending = await queue.put({ ...record, status: 'pending' });
          assertCurrent(scope, startedAt);
          const raw = await transport.sendText({
            roomId: pending.roomId,
            clientMutationId: pending.clientMutationId,
            content: pending.content,
            replyToId: pending.replyToId,
            metadata: pending.linkPreview ? { link_preview: pending.linkPreview } : {},
          });
          assertCurrent(scope, startedAt);
          const row = Array.isArray(raw) ? raw[0] : raw;
          const parsed = parseChatReadMessage(row, pending.roomId);
          if (parsed.kind === 'rejected'
            || parsed.value.clientMutationId !== pending.clientMutationId
            || parsed.value.senderId !== scope.memberId
            || parsed.value.content !== pending.content
            || parsed.value.replyToId !== pending.replyToId
            || !samePreview(parsed.value.metadata.link_preview, pending.linkPreview)) {
            throw new NativeChatSendError('invalid-acknowledgement');
          }
          await queue.remove(scope, pending.roomId, pending.clientMutationId);
          assertCurrent(scope, startedAt);
          return parsed.value;
        } catch (error) {
          if (startedAt === generation && currentScope && isChatReadScopeCurrent(currentScope, scope)) {
            try {
              await queue.markFailed(scope, record.roomId, record.clientMutationId);
            } catch (storageError) {
              throw sendError(storageError);
            }
          }
          throw sendError(error);
        }
      });
    },

    async restore(scope, roomId) {
      const startedAt = begin(scope);
      try {
        const records = await queue.load(scope, roomId);
        assertCurrent(scope, startedAt);
        return records;
      } catch (error) {
        throw sendError(error);
      }
    },

    async reconcile(scope, roomId, messages) {
      const startedAt = begin(scope);
      try {
        const records = await queue.reconcile(scope, roomId, messages);
        assertCurrent(scope, startedAt);
        return records;
      } catch (error) {
        throw sendError(error);
      }
    },

    async cancel(scope, roomId, clientMutationId) {
      const startedAt = begin(scope);
      try {
        const records = await queue.remove(scope, roomId, clientMutationId);
        assertCurrent(scope, startedAt);
        return records;
      } catch (error) {
        throw sendError(error);
      }
    },

    async clear() {
      generation += 1;
      currentScope = null;
      await queue.clear();
    },
  };
}
