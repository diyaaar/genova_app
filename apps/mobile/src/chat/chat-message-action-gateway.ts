import {
  isChatReadScopeCurrent,
  type ChatReadMessage,
  type ChatReadScope,
} from '@shared/chat-read-contract';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export type NativeChatMessageActionErrorCode =
  | 'action-failed'
  | 'clipboard-failed'
  | 'invalid-acknowledgement'
  | 'invalid-action'
  | 'stale-scope';

export class NativeChatMessageActionError extends Error {
  constructor(readonly code: NativeChatMessageActionErrorCode) {
    super(code);
    this.name = 'NativeChatMessageActionError';
  }
}

export interface NativeChatMessageActionTransport {
  editMessage(messageId: string, content: string): Promise<unknown>;
  deleteForEveryone(messageId: string): Promise<unknown>;
  hideForSelf(messageId: string): Promise<unknown>;
}

export interface NativeChatMessageActionGateway {
  copy(scope: ChatReadScope, message: ChatReadMessage): Promise<void>;
  edit(scope: ChatReadScope, message: ChatReadMessage, content: string): Promise<{ messageId: string; content: string }>;
  deleteForEveryone(scope: ChatReadScope, message: ChatReadMessage): Promise<{ messageId: string }>;
  hideForSelf(scope: ChatReadScope, message: ChatReadMessage): Promise<{ messageId: string; hiddenId: string }>;
  clear(): Promise<void>;
}

function normalizedUuid(value: unknown): string | null {
  return typeof value === 'string' && UUID_PATTERN.test(value) ? value.toLowerCase() : null;
}

function scopeKey(scope: ChatReadScope): string {
  return `${scope.userId}:${scope.choirId}:${scope.memberId}`;
}

function assertUsableMessage(message: ChatReadMessage): void {
  if (!normalizedUuid(message.id) || !normalizedUuid(message.roomId) || !normalizedUuid(message.senderId)) {
    throw new NativeChatMessageActionError('invalid-action');
  }
}

export function createNativeChatMessageActionGateway(
  transport: NativeChatMessageActionTransport,
  writeClipboard: (text: string) => Promise<boolean>,
): NativeChatMessageActionGateway {
  let generation = 0;
  let currentScope: ChatReadScope | null = null;
  let operation: Promise<void> = Promise.resolve();
  const inFlight = new Map<string, Promise<unknown>>();

  const begin = (scope: ChatReadScope) => {
    if (currentScope && !isChatReadScopeCurrent(currentScope, scope)) generation += 1;
    currentScope = scope;
    return generation;
  };

  const assertCurrent = (scope: ChatReadScope, startedAt: number) => {
    if (startedAt !== generation || !currentScope || !isChatReadScopeCurrent(currentScope, scope)) {
      throw new NativeChatMessageActionError('stale-scope');
    }
  };

  const run = <T>(scope: ChatReadScope, key: string, work: (startedAt: number) => Promise<T>): Promise<T> => {
    const startedAt = begin(scope);
    const scopedKey = `${scopeKey(scope)}:${key}`;
    const existing = inFlight.get(scopedKey);
    if (existing) return existing as Promise<T>;
    const result = operation.catch(() => {}).then(async () => {
      assertCurrent(scope, startedAt);
      const value = await work(startedAt);
      assertCurrent(scope, startedAt);
      return value;
    });
    operation = result.then(() => {}, () => {});
    inFlight.set(scopedKey, result);
    void result.finally(() => {
      if (inFlight.get(scopedKey) === result) inFlight.delete(scopedKey);
    }).catch(() => {});
    return result;
  };

  const expectedMessageAck = (raw: unknown, messageId: string): string => {
    const acknowledged = normalizedUuid(raw);
    if (!acknowledged || acknowledged !== messageId) {
      throw new NativeChatMessageActionError('invalid-acknowledgement');
    }
    return acknowledged;
  };

  return {
    async copy(scope, message) {
      assertUsableMessage(message);
      const content = message.content;
      if (message.isDeleted || !content?.trim()) throw new NativeChatMessageActionError('invalid-action');
      return run(scope, `copy:${message.id}:${content}`, async () => {
        try {
          if (!await writeClipboard(content)) {
            throw new NativeChatMessageActionError('clipboard-failed');
          }
        } catch (error) {
          if (error instanceof NativeChatMessageActionError) throw error;
          throw new NativeChatMessageActionError('clipboard-failed');
        }
      });
    },

    async edit(scope, message, content) {
      assertUsableMessage(message);
      const cleanContent = content.trim();
      if (message.senderId !== scope.memberId || message.messageType !== 'text' || message.isDeleted
        || cleanContent.length === 0 || cleanContent.length > 20_000) {
        throw new NativeChatMessageActionError('invalid-action');
      }
      return run(scope, `edit:${message.id}:${cleanContent}`, async () => {
        let raw: unknown;
        try {
          raw = await transport.editMessage(message.id, cleanContent);
        } catch {
          throw new NativeChatMessageActionError('action-failed');
        }
        return { messageId: expectedMessageAck(raw, message.id), content: cleanContent };
      });
    },

    async deleteForEveryone(scope, message) {
      assertUsableMessage(message);
      if (message.senderId !== scope.memberId || message.isDeleted) {
        throw new NativeChatMessageActionError('invalid-action');
      }
      return run(scope, `delete-everyone:${message.id}`, async () => {
        let raw: unknown;
        try {
          raw = await transport.deleteForEveryone(message.id);
        } catch {
          throw new NativeChatMessageActionError('action-failed');
        }
        return { messageId: expectedMessageAck(raw, message.id) };
      });
    },

    async hideForSelf(scope, message) {
      assertUsableMessage(message);
      if (message.isDeleted) {
        throw new NativeChatMessageActionError('invalid-action');
      }
      return run(scope, `hide-self:${message.id}`, async () => {
        let raw: unknown;
        try {
          raw = await transport.hideForSelf(message.id);
        } catch {
          throw new NativeChatMessageActionError('action-failed');
        }
        const hiddenId = normalizedUuid(raw);
        if (!hiddenId) throw new NativeChatMessageActionError('invalid-acknowledgement');
        return { messageId: message.id, hiddenId };
      });
    },

    async clear() {
      generation += 1;
      currentScope = null;
      inFlight.clear();
    },
  };
}
