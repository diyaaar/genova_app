import type { ChatReadMessage, ChatReadScope } from '@shared/chat-read-contract';
import {
  createNativeChatMessageActionGateway,
  NativeChatMessageActionError,
  type NativeChatMessageActionTransport,
} from '../chat-message-action-gateway';

const scope: ChatReadScope = {
  userId: '11111111-1111-4111-8111-111111111111',
  choirId: '22222222-2222-4222-8222-222222222222',
  memberId: '33333333-3333-4333-8333-333333333333',
};
const messageId = '44444444-4444-4444-8444-444444444444';
const hiddenId = '55555555-5555-4555-8555-555555555555';

function message(overrides: Partial<ChatReadMessage> = {}): ChatReadMessage {
  return {
    id: messageId,
    clientMutationId: null,
    roomId: '66666666-6666-4666-8666-666666666666',
    senderId: scope.memberId,
    content: 'Prova notu',
    messageType: 'text',
    sourceMessageType: 'text',
    isMessageTypeSupported: true,
    replyToId: null,
    metadata: {},
    isEdited: false,
    isDeleted: false,
    createdAt: '2026-09-20T12:00:00Z',
    updatedAt: '2026-09-20T12:00:00Z',
    sender: null,
    replyTo: null,
    ...overrides,
  };
}

function transportDouble(): NativeChatMessageActionTransport {
  return {
    editMessage: jest.fn(async () => messageId),
    deleteForEveryone: jest.fn(async () => messageId),
    hideForSelf: jest.fn(async () => hiddenId),
  };
}

describe('native chat core message action gateway', () => {
  it('validates exact edit/delete/hide acknowledgements and copies selected visible content', async () => {
    const transport = transportDouble();
    const clipboard = jest.fn(async () => true);
    const gateway = createNativeChatMessageActionGateway(transport, clipboard);

    await expect(gateway.copy(scope, message())).resolves.toBeUndefined();
    await expect(gateway.edit(scope, message(), '  Yeni prova notu  ')).resolves.toEqual({
      messageId,
      content: 'Yeni prova notu',
    });
    await expect(gateway.deleteForEveryone(scope, message())).resolves.toEqual({ messageId });
    await expect(gateway.hideForSelf(scope, message({ senderId: hiddenId }))).resolves.toEqual({
      messageId,
      hiddenId,
    });
    expect(clipboard).toHaveBeenCalledWith('Prova notu');
    expect(transport.editMessage).toHaveBeenCalledWith(messageId, 'Yeni prova notu');
  });

  it('refuses invalid client actions before transport and fails closed on malformed acknowledgements', async () => {
    const transport = transportDouble();
    (transport.editMessage as jest.Mock).mockResolvedValueOnce(hiddenId);
    (transport.hideForSelf as jest.Mock).mockResolvedValueOnce('not-a-uuid');
    const gateway = createNativeChatMessageActionGateway(transport, async () => false);

    await expect(gateway.edit(scope, message({ senderId: hiddenId }), 'Başka üye'))
      .rejects.toMatchObject<Partial<NativeChatMessageActionError>>({ code: 'invalid-action' });
    await expect(gateway.edit(scope, message({ messageType: 'image', sourceMessageType: 'image' }), 'Görsel'))
      .rejects.toMatchObject<Partial<NativeChatMessageActionError>>({ code: 'invalid-action' });
    await expect(gateway.deleteForEveryone(scope, message({ isDeleted: true })))
      .rejects.toMatchObject<Partial<NativeChatMessageActionError>>({ code: 'invalid-action' });
    await expect(gateway.copy(scope, message()))
      .rejects.toMatchObject<Partial<NativeChatMessageActionError>>({ code: 'clipboard-failed' });
    await expect(gateway.edit(scope, message(), 'Yeni'))
      .rejects.toMatchObject<Partial<NativeChatMessageActionError>>({ code: 'invalid-acknowledgement' });
    await expect(gateway.hideForSelf(scope, message()))
      .rejects.toMatchObject<Partial<NativeChatMessageActionError>>({ code: 'invalid-acknowledgement' });
    expect(transport.deleteForEveryone).not.toHaveBeenCalled();

    (transport.deleteForEveryone as jest.Mock).mockRejectedValueOnce(new Error('044: delete window expired'));
    await expect(gateway.deleteForEveryone(scope, message()))
      .rejects.toMatchObject<Partial<NativeChatMessageActionError>>({ code: 'action-failed' });
  });

  it('deduplicates an identical in-flight destructive action and rejects its late result after clear', async () => {
    let release: ((value: string) => void) | undefined;
    const transport = transportDouble();
    (transport.deleteForEveryone as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const gateway = createNativeChatMessageActionGateway(transport, async () => true);

    const first = gateway.deleteForEveryone(scope, message());
    const repeated = gateway.deleteForEveryone(scope, message());
    await Promise.resolve();
    await Promise.resolve();
    expect(transport.deleteForEveryone).toHaveBeenCalledTimes(1);
    await gateway.clear();
    release?.(messageId);

    await expect(first).rejects.toMatchObject<Partial<NativeChatMessageActionError>>({ code: 'stale-scope' });
    await expect(repeated).rejects.toMatchObject<Partial<NativeChatMessageActionError>>({ code: 'stale-scope' });
  });
});
