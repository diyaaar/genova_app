import { describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from './chat';
import {
  applyReadStatusToOwnMessages,
  DurableChatStatusCoordinator,
  eligibleInboundChatMessageIds,
} from './chat-status-runtime';

const MEMBER = '10000000-0000-4000-8000-000000000001';
const OTHER = '20000000-0000-4000-8000-000000000002';
const MESSAGE_A = '30000000-0000-4000-8000-000000000003';
const MESSAGE_B = '40000000-0000-4000-8000-000000000004';

function message(id: string, senderId = OTHER): ChatMessage {
  return {
    id,
    room_id: '50000000-0000-4000-8000-000000000005',
    sender_id: senderId,
    content: 'message',
    message_type: 'text',
    reply_to_id: null,
    metadata_json: {},
    is_edited: false,
    is_deleted: false,
    created_at: '2026-09-19T12:00:00.000Z',
    updated_at: '2026-09-19T12:00:00.000Z',
  };
}

describe('durable chat status runtime', () => {
  it('selects unique inbound server messages and excludes own or temporary rows', () => {
    expect(eligibleInboundChatMessageIds([
      message(MESSAGE_A),
      message(MESSAGE_A),
      message(MESSAGE_B, MEMBER),
      message('temp-30000000-0000-4000-8000-000000000003'),
    ], MEMBER)).toEqual([MESSAGE_A]);
  });

  it('hydrates only own persisted read bubbles without mutating the input', () => {
    const original = [message(MESSAGE_A, MEMBER), message(MESSAGE_B)];
    const hydrated = applyReadStatusToOwnMessages(original, new Set([MESSAGE_A, MESSAGE_B]), MEMBER);
    expect(hydrated[0].metadata_json).toMatchObject({ _status: 'read' });
    expect(hydrated[1].metadata_json).toEqual({});
    expect(original[0].metadata_json).toEqual({});
  });

  it('serializes writes, deduplicates and upgrades delivered to read without regression', async () => {
    const coordinator = new DurableChatStatusCoordinator();
    const calls: string[] = [];
    let inFlight = 0;
    let maxInFlight = 0;
    const writer = vi.fn(async (messageId: string, status: string) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      calls.push(`${messageId}:${status}`);
      inFlight -= 1;
    });
    coordinator.setScope('member:room');
    coordinator.enqueue([MESSAGE_A, MESSAGE_A, MESSAGE_B], 'delivered');
    await coordinator.flush(writer);
    coordinator.enqueue([MESSAGE_A], 'read');
    coordinator.enqueue([MESSAGE_A], 'delivered');
    await coordinator.flush(writer);

    expect(calls).toEqual([
      `${MESSAGE_A}:delivered`,
      `${MESSAGE_B}:delivered`,
      `${MESSAGE_A}:read`,
    ]);
    expect(maxInFlight).toBe(1);
  });

  it('does not busy-loop a failure and retries on a later flush', async () => {
    const coordinator = new DurableChatStatusCoordinator();
    const writer = vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(undefined);
    coordinator.setScope('member:room');
    coordinator.enqueue([MESSAGE_A], 'read');

    expect(await coordinator.flush(writer)).toEqual({ attempted: 1, failed: 1 });
    expect(writer).toHaveBeenCalledTimes(1);
    expect(await coordinator.flush(writer)).toEqual({ attempted: 1, failed: 0 });
    expect(writer).toHaveBeenCalledTimes(2);
  });

  it('drops prior desired and in-flight acknowledgement state on scope change', async () => {
    const coordinator = new DurableChatStatusCoordinator();
    let release: (() => void) | undefined;
    let inFlight = 0;
    let maxInFlight = 0;
    const writer = vi.fn(() => new Promise<void>((resolve) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      release = () => {
        inFlight -= 1;
        resolve();
      };
    }));
    coordinator.setScope('member-a:room-a');
    coordinator.enqueue([MESSAGE_A], 'read');
    const first = coordinator.flush(writer);
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    coordinator.setScope('member-b:room-b');
    const secondWriter = vi.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      inFlight -= 1;
    });
    coordinator.enqueue([MESSAGE_B], 'delivered');
    const second = coordinator.flush(secondWriter);
    expect(secondWriter).not.toHaveBeenCalled();
    release?.();
    await Promise.all([first, second]);

    expect(secondWriter).toHaveBeenCalledWith(MESSAGE_B, 'delivered');
    expect(secondWriter).not.toHaveBeenCalledWith(MESSAGE_A, expect.anything());
    expect(maxInFlight).toBe(1);
  });
});
