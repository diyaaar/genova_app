import type { ChatReadMessage, ChatReadScope } from '@shared/chat-read-contract';
import type { SessionStorage } from '../../auth/types';
import {
  createNativeChatSendQueue,
  MAX_NATIVE_CHAT_QUEUE_ITEMS,
  MAX_NATIVE_CHAT_QUEUE_SERIALIZED_BYTES,
  NativeChatQueueError,
  NATIVE_CHAT_QUEUE_TTL_MS,
  type NativeChatQueuedText,
} from '../native-chat-send-queue';

const scope: ChatReadScope = {
  userId: '11111111-1111-4111-8111-111111111111',
  choirId: '22222222-2222-4222-8222-222222222222',
  memberId: '33333333-3333-4333-8333-333333333333',
};
const roomId = '44444444-4444-4444-8444-444444444444';
const startedAt = Date.parse('2026-09-20T12:00:00Z');

function memoryStorage() {
  const values = new Map<string, string>();
  const storage: SessionStorage = {
    getItem: jest.fn(async (key) => values.get(key) ?? null),
    setItem: jest.fn(async (key, value) => { values.set(key, value); }),
    removeItem: jest.fn(async (key) => { values.delete(key); }),
  };
  return { storage, values };
}

function record(index = 1, overrides: Partial<NativeChatQueuedText> = {}): NativeChatQueuedText {
  return {
    version: 1,
    scope,
    roomId,
    clientMutationId: `50000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    content: `Mesaj ${index}`,
    replyToId: null,
    linkPreview: null,
    queuedAt: startedAt + index,
    status: 'pending',
    ...overrides,
  };
}

describe('protected native chat send queue', () => {
  it('round-trips only the exact account/choir/member/room scope and reconciles a server mutation id', async () => {
    const memory = memoryStorage();
    const queue = createNativeChatSendQueue(memory.storage, () => startedAt + 100);
    await queue.put(record());

    expect(await queue.load(scope, roomId)).toEqual([record()]);
    expect(await queue.load({ ...scope, choirId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }, roomId)).toEqual([]);

    const acknowledgement = {
      clientMutationId: record().clientMutationId,
      roomId,
    } as ChatReadMessage;
    expect(await queue.reconcile(scope, roomId, [acknowledgement])).toEqual([]);
    expect(memory.values.size).toBe(0);
  });

  it('expires stale records, drops corrupt storage and clears the whole private namespace', async () => {
    const memory = memoryStorage();
    const queue = createNativeChatSendQueue(memory.storage, () => startedAt + NATIVE_CHAT_QUEUE_TTL_MS + 10);
    await expect(queue.put(record(1, { queuedAt: startedAt }))).rejects.toMatchObject<Partial<NativeChatQueueError>>({
      code: 'invalid-record',
    });

    memory.values.set('genova.native-chat.send-queue.v1.pointer', 'a');
    memory.values.set('genova.native-chat.send-queue.v1.a', '{broken');
    expect(await queue.load(scope, roomId)).toEqual([]);
    expect(memory.values.size).toBe(0);

    const currentQueue = createNativeChatSendQueue(memory.storage, () => startedAt + 100);
    await currentQueue.put(record());
    await currentQueue.clear();
    expect(memory.values.size).toBe(0);
  });

  it('refuses conflicting keys, count overflow and storage failure without discarding valid rows', async () => {
    const memory = memoryStorage();
    const queue = createNativeChatSendQueue(memory.storage, () => startedAt + 100);
    await queue.put(record());
    await expect(queue.put(record(1, { content: 'Başka yük' }))).rejects.toMatchObject<Partial<NativeChatQueueError>>({
      code: 'conflicting-mutation',
    });

    for (let index = 2; index <= MAX_NATIVE_CHAT_QUEUE_ITEMS; index += 1) {
      await queue.put(record(index));
    }
    await expect(queue.put(record(MAX_NATIVE_CHAT_QUEUE_ITEMS + 1))).rejects.toMatchObject<Partial<NativeChatQueueError>>({
      code: 'queue-full',
    });
    expect(await queue.load(scope, roomId)).toHaveLength(MAX_NATIVE_CHAT_QUEUE_ITEMS);

    (memory.storage.setItem as jest.Mock).mockRejectedValueOnce(new Error('keychain unavailable'));
    await expect(queue.markFailed(scope, roomId, record().clientMutationId)).rejects.toMatchObject<Partial<NativeChatQueueError>>({
      code: 'storage-failed',
    });
    expect(await queue.load(scope, roomId)).toHaveLength(MAX_NATIVE_CHAT_QUEUE_ITEMS);
  });

  it('keeps the previous committed queue when an inactive-slot write fails', async () => {
    const memory = memoryStorage();
    const queue = createNativeChatSendQueue(memory.storage, () => startedAt + 100);
    await queue.put(record());
    const pointerBefore = memory.values.get('genova.native-chat.send-queue.v1.pointer');
    const activeBefore = memory.values.get(`genova.native-chat.send-queue.v1.${pointerBefore}`);
    (memory.storage.setItem as jest.Mock).mockRejectedValueOnce(new Error('partial keychain write'));

    await expect(queue.put(record(2))).rejects.toMatchObject<Partial<NativeChatQueueError>>({
      code: 'storage-failed',
    });

    expect(memory.values.get('genova.native-chat.send-queue.v1.pointer')).toBe(pointerBefore);
    expect(memory.values.get(`genova.native-chat.send-queue.v1.${pointerBefore}`)).toBe(activeBefore);
    expect(await queue.load(scope, roomId)).toEqual([record()]);
  });

  it('keeps the prior pointer authoritative when the pointer commit fails', async () => {
    const memory = memoryStorage();
    const queue = createNativeChatSendQueue(memory.storage, () => startedAt + 100);
    await queue.put(record());
    const pointerBefore = memory.values.get('genova.native-chat.send-queue.v1.pointer');
    (memory.storage.setItem as jest.Mock)
      .mockImplementationOnce(async (key: string, value: string) => { memory.values.set(key, value); })
      .mockRejectedValueOnce(new Error('pointer commit failed'));

    await expect(queue.put(record(2))).rejects.toMatchObject<Partial<NativeChatQueueError>>({
      code: 'storage-failed',
    });

    expect(memory.values.get('genova.native-chat.send-queue.v1.pointer')).toBe(pointerBefore);
    expect(await queue.load(scope, roomId)).toEqual([record()]);
  });

  it('fails closed when slot bytes exceed the bounded protected-storage budget', async () => {
    expect(MAX_NATIVE_CHAT_QUEUE_SERIALIZED_BYTES).toBe(131_072);
    const memory = memoryStorage();
    const queue = createNativeChatSendQueue(memory.storage, () => startedAt + 100);
    const multibyteContent = '🎵'.repeat(10_000);
    await queue.put(record(1, { content: multibyteContent }));
    await queue.put(record(2, { content: multibyteContent }));
    await queue.put(record(3, { content: multibyteContent }));

    await expect(queue.put(record(4, { content: multibyteContent }))).rejects.toMatchObject<Partial<NativeChatQueueError>>({
      code: 'queue-too-large',
    });
    expect(await queue.load(scope, roomId)).toHaveLength(3);
  });

  it('does not promote orphaned slots when the commit pointer is absent', async () => {
    const memory = memoryStorage();
    memory.values.set('genova.native-chat.send-queue.v1.a', JSON.stringify({
      version: 1,
      generation: 1,
      records: [record()],
    }));
    const queue = createNativeChatSendQueue(memory.storage, () => startedAt + 100);

    expect(await queue.load(scope, roomId)).toEqual([]);
    expect(memory.values.size).toBe(0);
  });
});
