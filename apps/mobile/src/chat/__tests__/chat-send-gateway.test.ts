import type { ChatReadScope } from '@shared/chat-read-contract';
import type { SessionStorage } from '../../auth/types';
import {
  createNativeChatSendGateway,
  NativeChatSendError,
  type NativeChatSendTransport,
} from '../chat-send-gateway';
import { createNativeChatSendQueue } from '../native-chat-send-queue';

const scope: ChatReadScope = {
  userId: '11111111-1111-4111-8111-111111111111',
  choirId: '22222222-2222-4222-8222-222222222222',
  memberId: '33333333-3333-4333-8333-333333333333',
};
const roomId = '44444444-4444-4444-8444-444444444444';
const replyId = '55555555-5555-4555-8555-555555555555';
const mutationId = '66666666-6666-4666-8666-666666666666';
const messageId = '77777777-7777-4777-8777-777777777777';

function memoryStorage() {
  const values = new Map<string, string>();
  const storage: SessionStorage = {
    getItem: jest.fn(async (key) => values.get(key) ?? null),
    setItem: jest.fn(async (key, value) => { values.set(key, value); }),
    removeItem: jest.fn(async (key) => { values.delete(key); }),
  };
  return { storage, values };
}

function acknowledgement(overrides: Record<string, unknown> = {}) {
  return {
    id: messageId,
    client_mutation_id: mutationId,
    room_id: roomId,
    sender_id: scope.memberId,
    content: 'https://example.invalid prova',
    message_type: 'text',
    reply_to_id: replyId,
    metadata_json: {
      link_preview: {
        url: 'https://example.invalid/',
        title: 'Prova',
        description: null,
        image: null,
        favicon: null,
        domain: 'example.invalid',
      },
    },
    is_edited: false,
    is_deleted: false,
    created_at: '2026-09-20T12:00:00.000000Z',
    updated_at: '2026-09-20T12:00:00.000000Z',
    sender: null,
    reply_to: null,
    ...overrides,
  };
}

function transportDouble(): NativeChatSendTransport {
  return {
    loadLinkPreview: jest.fn(async () => acknowledgement().metadata_json.link_preview),
    sendText: jest.fn(async () => acknowledgement()),
  };
}

describe('native chat send gateway', () => {
  it('persists the exact reply/link payload before network and removes it only after a valid acknowledgement', async () => {
    const memory = memoryStorage();
    const transport = transportDouble();
    (transport.sendText as jest.Mock).mockImplementationOnce(async () => {
      expect(memory.values.size).toBeGreaterThan(0);
      return acknowledgement();
    });
    const gateway = createNativeChatSendGateway(
      transport,
      createNativeChatSendQueue(memory.storage, () => 100),
      () => mutationId,
      () => 100,
    );

    const prepared = await gateway.prepare(scope, roomId, ' https://example.invalid prova ', replyId);
    expect(prepared.previewWarning).toBe(false);
    expect(prepared.record).toMatchObject({
      content: 'https://example.invalid prova',
      replyToId: replyId,
      clientMutationId: mutationId,
      linkPreview: { domain: 'example.invalid' },
    });
    const sent = await gateway.transmit(scope, prepared.record);

    expect(sent.id).toBe(messageId);
    expect(transport.sendText).toHaveBeenCalledWith({
      roomId,
      clientMutationId: mutationId,
      content: 'https://example.invalid prova',
      replyToId: replyId,
      metadata: { link_preview: prepared.record.linkPreview },
    });
    expect(await gateway.restore(scope, roomId)).toEqual([]);
  });

  it('keeps a lost acknowledgement failed and retries the identical mutation to one server id', async () => {
    const memory = memoryStorage();
    const transport = transportDouble();
    (transport.loadLinkPreview as jest.Mock).mockRejectedValueOnce(new Error('offline preview'));
    (transport.sendText as jest.Mock)
      .mockRejectedValueOnce(new Error('lost response'))
      .mockResolvedValueOnce(acknowledgement({ reply_to_id: null, metadata_json: {} }));
    const gateway = createNativeChatSendGateway(
      transport,
      createNativeChatSendQueue(memory.storage, () => 100),
      () => mutationId,
      () => 100,
    );
    const prepared = await gateway.prepare(scope, roomId, 'https://example.invalid prova', null);
    expect(prepared.previewWarning).toBe(true);

    await expect(gateway.transmit(scope, prepared.record)).rejects.toMatchObject<Partial<NativeChatSendError>>({
      code: 'transmit-failed',
    });
    expect(await gateway.restore(scope, roomId)).toMatchObject([{ status: 'failed', clientMutationId: mutationId }]);

    expect((await gateway.transmit(scope, prepared.record)).id).toBe(messageId);
    expect(transport.sendText).toHaveBeenCalledTimes(2);
    expect(await gateway.restore(scope, roomId)).toEqual([]);
  });

  it('fails closed on a mismatched acknowledgement and invalidates a late result on tenant clear', async () => {
    const memory = memoryStorage();
    const transport = transportDouble();
    (transport.sendText as jest.Mock).mockResolvedValueOnce(acknowledgement({
      client_mutation_id: '88888888-8888-4888-8888-888888888888',
    }));
    const gateway = createNativeChatSendGateway(
      transport,
      createNativeChatSendQueue(memory.storage, () => 100),
      () => mutationId,
      () => 100,
    );
    const prepared = await gateway.prepare(scope, roomId, 'https://example.invalid prova', replyId);
    await expect(gateway.transmit(scope, prepared.record)).rejects.toMatchObject<Partial<NativeChatSendError>>({
      code: 'invalid-acknowledgement',
    });

    let release: ((value: unknown) => void) | undefined;
    (transport.sendText as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const pending = gateway.transmit(scope, prepared.record);
    await Promise.resolve();
    await Promise.resolve();
    const clearing = gateway.clear();
    release?.(acknowledgement());
    await clearing;
    await expect(pending).rejects.toMatchObject<Partial<NativeChatSendError>>({ code: 'stale-scope' });
    expect(memory.values.size).toBe(0);
  });

  it('never starts the send RPC when protected queue persistence fails', async () => {
    const memory = memoryStorage();
    const transport = transportDouble();
    (memory.storage.setItem as jest.Mock).mockRejectedValueOnce(new Error('keychain unavailable'));
    const gateway = createNativeChatSendGateway(
      transport,
      createNativeChatSendQueue(memory.storage, () => 100),
      () => mutationId,
      () => 100,
    );

    await expect(gateway.prepare(scope, roomId, 'Çevrimdışı prova notu', null))
      .rejects.toMatchObject<Partial<NativeChatSendError>>({ code: 'storage-failed' });
    expect(transport.sendText).not.toHaveBeenCalled();
  });

  it('keeps the queued message when the server acknowledges a different room or preview payload', async () => {
    const memory = memoryStorage();
    const transport = transportDouble();
    (transport.loadLinkPreview as jest.Mock).mockRejectedValueOnce(new Error('preview unavailable'));
    (transport.sendText as jest.Mock)
      .mockResolvedValueOnce(acknowledgement({
        room_id: '99999999-9999-4999-8999-999999999999',
        reply_to_id: null,
        metadata_json: {},
      }))
      .mockResolvedValueOnce(acknowledgement({ reply_to_id: null }));
    const gateway = createNativeChatSendGateway(
      transport,
      createNativeChatSendQueue(memory.storage, () => 100),
      () => mutationId,
      () => 100,
    );
    const prepared = await gateway.prepare(scope, roomId, 'https://example.invalid prova', null);

    await expect(gateway.transmit(scope, prepared.record)).rejects.toMatchObject<Partial<NativeChatSendError>>({
      code: 'invalid-acknowledgement',
    });
    await expect(gateway.transmit(scope, prepared.record)).rejects.toMatchObject<Partial<NativeChatSendError>>({
      code: 'invalid-acknowledgement',
    });
    expect(await gateway.restore(scope, roomId)).toMatchObject([{ status: 'failed', clientMutationId: mutationId }]);
  });
});
