import type { ChatMessage } from '@/lib/chat';

export type DurableChatMessageStatus = 'delivered' | 'read';
export type ChatStatusWriter = (messageId: string, status: DurableChatMessageStatus) => Promise<void>;

const SERVER_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_RANK: Record<DurableChatMessageStatus, number> = { delivered: 1, read: 2 };

export function eligibleInboundChatMessageIds(messages: ChatMessage[], memberId: string): string[] {
  return [...new Set(messages
    .filter((message) => message.sender_id !== memberId && SERVER_UUID.test(message.id))
    .map((message) => message.id))];
}

export function applyReadStatusToOwnMessages(
  messages: ChatMessage[],
  readMessageIds: ReadonlySet<string>,
  memberId: string,
): ChatMessage[] {
  return messages.map((message) => (
    message.sender_id === memberId && readMessageIds.has(message.id)
      ? { ...message, metadata_json: { ...message.metadata_json, _status: 'read' } }
      : message
  ));
}

export interface ChatStatusFlushResult {
  attempted: number;
  failed: number;
}

/** Process-memory queue: one writer, monotonic state and an exact member/room scope. */
export class DurableChatStatusCoordinator {
  private scopeKey: string | null = null;
  private generation = 0;
  private desired = new Map<string, DurableChatMessageStatus>();
  private confirmed = new Map<string, DurableChatMessageStatus>();
  private running: Promise<ChatStatusFlushResult> | null = null;

  setScope(scopeKey: string | null): void {
    if (scopeKey === this.scopeKey) return;
    this.scopeKey = scopeKey;
    this.generation += 1;
    this.desired.clear();
    this.confirmed.clear();
  }

  enqueue(messageIds: string[], status: DurableChatMessageStatus): void {
    if (!this.scopeKey) return;
    for (const messageId of messageIds) {
      const current = this.desired.get(messageId);
      if (!current || STATUS_RANK[status] > STATUS_RANK[current]) {
        this.desired.set(messageId, status);
      }
    }
  }

  flush(writer: ChatStatusWriter): Promise<ChatStatusFlushResult> {
    if (this.running) {
      const prior = this.running;
      return prior.then(() => this.flush(writer));
    }
    const generation = this.generation;

    const operation = async (): Promise<ChatStatusFlushResult> => {
      let attempted = 0;
      let failed = 0;
      const failedThisFlush = new Set<string>();

      while (generation === this.generation) {
        const next = [...this.desired.entries()].find(([messageId, desired]) => {
          const confirmed = this.confirmed.get(messageId);
          return !failedThisFlush.has(messageId)
            && (!confirmed || STATUS_RANK[desired] > STATUS_RANK[confirmed]);
        });
        if (!next) break;

        const [messageId, status] = next;
        attempted += 1;
        try {
          await writer(messageId, status);
          if (generation === this.generation) this.confirmed.set(messageId, status);
        } catch {
          failed += 1;
          failedThisFlush.add(messageId);
        }
      }

      return { attempted, failed };
    };

    let current: Promise<ChatStatusFlushResult>;
    current = operation().finally(() => {
      if (this.running === current) this.running = null;
    });
    this.running = current;
    return current;
  }
}
