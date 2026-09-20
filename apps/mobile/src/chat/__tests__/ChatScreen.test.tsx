import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ChatReadMessage, ChatReadRoomSummary, ChatReadScope } from '@shared/chat-read-contract';
import { ChatScreen } from '../ChatScreen';
import { NativeChatReadError, type NativeChatReadGateway } from '../chat-read-gateway';
import { NativeChatSendError, type NativeChatSendGateway } from '../chat-send-gateway';
import type { NativeChatQueuedText } from '../native-chat-send-queue';
import {
  NativeChatMessageActionError,
  type NativeChatMessageActionGateway,
} from '../chat-message-action-gateway';

const scope: ChatReadScope = {
  userId: '11111111-1111-4111-8111-111111111111',
  choirId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  memberId: '33333333-3333-4333-8333-333333333333',
};
const roomId = '44444444-4444-4444-8444-444444444444';
const peerId = '55555555-5555-4555-8555-555555555555';
const messageId = '66666666-6666-4666-8666-666666666666';

function message(overrides: Partial<ChatReadMessage> = {}): ChatReadMessage {
  return {
    id: messageId,
    clientMutationId: null,
    roomId,
    senderId: peerId,
    content: 'Prova saat dokuzda.',
    messageType: 'text',
    sourceMessageType: 'text',
    isMessageTypeSupported: true,
    replyToId: null,
    metadata: {},
    isEdited: false,
    isDeleted: false,
    createdAt: '2026-09-20T09:00:00.000000Z',
    updatedAt: '2026-09-20T09:00:00.000000Z',
    sender: { id: peerId, firstName: 'Ada', lastName: 'Lovelace', photoUrl: null },
    replyTo: null,
    ...overrides,
  };
}

function room(overrides: Partial<ChatReadRoomSummary> = {}): ChatReadRoomSummary {
  return {
    id: roomId,
    name: 'Özel sohbet',
    slug: 'ozel-sohbet',
    description: 'Alto çalışma grubu',
    type: 'dm',
    createdBy: peerId,
    avatarUrl: null,
    isArchived: false,
    createdAt: '2026-09-20T08:00:00.000000Z',
    updatedAt: '2026-09-20T09:00:00.000000Z',
    memberCount: 2,
    unreadCount: 2,
    membersPreview: [
      { memberId: scope.memberId, firstName: 'Grace', lastName: 'Hopper', photoUrl: null },
      { memberId: peerId, firstName: 'Ada', lastName: 'Lovelace', photoUrl: null },
    ],
    membership: {
      id: '77777777-7777-4777-8777-777777777777',
      memberId: scope.memberId,
      role: 'member',
      nickname: null,
      lastReadAt: null,
      notificationsEnabled: true,
      hiddenAt: null,
    },
    lastMessage: message(),
    ...overrides,
  };
}

type GatewayDouble = NativeChatReadGateway & {
  listListener: Parameters<NativeChatReadGateway['watchRoomList']>[1] | null;
  roomListener: Parameters<NativeChatReadGateway['watchRoom']>[2] | null;
};

function gatewayDouble(): GatewayDouble {
  let gateway: GatewayDouble;
  gateway = {
    listListener: null,
    roomListener: null,
    loadRooms: jest.fn(async () => [room()]),
    loadMessages: jest.fn(async () => ({
      room: room(),
      messages: [message()],
      nextCursor: { createdAt: message().createdAt, id: messageId },
      hasMore: false,
    })),
    markRoomRead: jest.fn(async () => {}),
    watchRoomList: jest.fn((_scope, listener) => {
      gateway.listListener = listener;
      return jest.fn();
    }),
    watchRoom: jest.fn((_scope, _roomId, listener) => {
      gateway.roomListener = listener;
      return jest.fn();
    }),
    clear: jest.fn(),
  };
  return gateway;
}

function queued(overrides: Partial<NativeChatQueuedText> = {}): NativeChatQueuedText {
  return {
    version: 1,
    scope,
    roomId,
    clientMutationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    content: 'https://example.invalid prova',
    replyToId: messageId,
    linkPreview: {
      url: 'https://example.invalid/',
      title: 'Prova',
      description: null,
      image: null,
      favicon: null,
      domain: 'example.invalid',
    },
    queuedAt: 100,
    status: 'pending',
    ...overrides,
  };
}

function sendGatewayDouble(): NativeChatSendGateway {
  return {
    prepare: jest.fn(async () => ({ record: queued(), previewWarning: false })),
    transmit: jest.fn(async () => message({
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      clientMutationId: queued().clientMutationId,
      content: queued().content,
      replyToId: queued().replyToId,
      metadata: { link_preview: queued().linkPreview },
    })),
    restore: jest.fn(async () => []),
    reconcile: jest.fn(async () => []),
    cancel: jest.fn(async () => []),
    clear: jest.fn(async () => {}),
  };
}

function actionGatewayDouble(): NativeChatMessageActionGateway {
  return {
    copy: jest.fn(async () => {}),
    edit: jest.fn(async (_scope, target, content) => ({ messageId: target.id, content: content.trim() })),
    deleteForEveryone: jest.fn(async (_scope, target) => ({ messageId: target.id })),
    hideForSelf: jest.fn(async (_scope, target) => ({
      messageId: target.id,
      hiddenId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    })),
    clear: jest.fn(async () => {}),
  };
}

describe('ChatScreen', () => {
  it('shows an authorized searchable room list and opens an accessible message history', async () => {
    const gateway = gatewayDouble();
    await render(<ChatScreen scope={scope} choirName="Genova A" gateway={gateway} sendGateway={sendGatewayDouble()} actionGateway={actionGatewayDouble()} onBack={jest.fn()} />);

    expect(await screen.findByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByTestId(`chat-unread-${roomId}`)).toHaveTextContent('2');

    await fireEvent.changeText(screen.getByTestId('chat-search'), 'bulunmaz');
    expect(screen.getByTestId('chat-rooms-no-results')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('chat-search'), 'alto');
    await fireEvent.press(screen.getByTestId(`chat-room-${roomId}`));

    expect(await screen.findByText('Prova saat dokuzda.')).toBeTruthy();
    expect(gateway.markRoomRead).toHaveBeenCalledWith(scope, roomId);
    await fireEvent.press(screen.getByTestId('chat-room-back'));
    expect(screen.getByTestId('chat-list-screen')).toBeTruthy();
  });

  it('renders deleted, reply and future-kind fallbacks and merges an older page', async () => {
    const gateway = gatewayDouble();
    const oldId = '88888888-8888-4888-8888-888888888888';
    gateway.loadMessages = jest
      .fn()
      .mockResolvedValueOnce({
        room: room(),
        messages: [
          message({ isDeleted: true, content: 'gizli' }),
          message({
            id: oldId,
            messageType: 'unsupported',
            sourceMessageType: 'future_kind',
            isMessageTypeSupported: false,
            replyToId: '99999999-9999-4999-8999-999999999999',
            replyTo: { id: '99999999-9999-4999-8999-999999999999', senderId: peerId, content: 'Önceki', senderName: 'Ada' },
          }),
        ],
        nextCursor: { createdAt: '2026-09-20T09:00:00.000000Z', id: messageId },
        hasMore: true,
      })
      .mockResolvedValueOnce({
        room: room(),
        messages: [message({ id: 'aaaaaaaa-1111-4111-8111-111111111111', content: 'Eski mesaj' })],
        nextCursor: null,
        hasMore: false,
      });
    await render(<ChatScreen scope={scope} choirName="Genova A" gateway={gateway} sendGateway={sendGatewayDouble()} actionGateway={actionGatewayDouble()} onBack={jest.fn()} />);
    await fireEvent.press(await screen.findByTestId(`chat-room-${roomId}`));

    expect(await screen.findByText('Bu mesaj silindi.')).toBeTruthy();
    expect(screen.getByText('Bu mesaj türü bu sürümde görüntülenemiyor.')).toBeTruthy();
    expect(screen.getByText(/Yanıt: Ada/u)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chat-load-older'));
    expect(await screen.findByText('Eski mesaj')).toBeTruthy();
    expect(gateway.loadMessages).toHaveBeenLastCalledWith(scope, roomId, {
      before: { createdAt: '2026-09-20T09:00:00.000000Z', id: messageId },
    });
  });

  it('keeps failures and disconnects visible, then reloads only through the gateway snapshot', async () => {
    const gateway = gatewayDouble();
    gateway.loadRooms = jest.fn()
      .mockRejectedValueOnce(new Error('secret transport detail'))
      .mockResolvedValue([room()]);
    await render(<ChatScreen scope={scope} choirName="Genova A" gateway={gateway} sendGateway={sendGatewayDouble()} actionGateway={actionGatewayDouble()} onBack={jest.fn()} />);

    expect(await screen.findByText('Sohbet odaları yüklenemedi.')).toBeTruthy();
    expect(screen.queryByText('secret transport detail')).toBeNull();
    await fireEvent.press(screen.getByTestId('chat-rooms-retry'));
    expect(await screen.findByTestId(`chat-room-${roomId}`)).toBeTruthy();

    await act(async () => gateway.listListener?.connection('disconnected'));
    expect(screen.getByTestId('chat-offline-warning')).toBeTruthy();
    await act(async () => gateway.listListener?.invalidate());
    await waitFor(() => expect(gateway.loadRooms).toHaveBeenCalledTimes(3));
  });

  it('keeps the last authorized room and message snapshots visible when refresh fails', async () => {
    const gateway = gatewayDouble();
    gateway.loadRooms = jest.fn()
      .mockResolvedValueOnce([room()])
      .mockRejectedValueOnce(new Error('offline list'));
    gateway.loadMessages = jest.fn()
      .mockResolvedValueOnce({
        room: room(),
        messages: [message()],
        nextCursor: null,
        hasMore: false,
      })
      .mockRejectedValueOnce(new Error('offline room'));
    await render(<ChatScreen scope={scope} choirName="Genova A" gateway={gateway} sendGateway={sendGatewayDouble()} actionGateway={actionGatewayDouble()} onBack={jest.fn()} />);

    await fireEvent.press(await screen.findByTestId(`chat-room-${roomId}`));
    expect(await screen.findByText('Prova saat dokuzda.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chat-room-refresh'));
    expect(await screen.findByTestId('chat-read-warning')).toHaveTextContent('Mesajlar yüklenemedi.');
    expect(screen.getByText('Prova saat dokuzda.')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('chat-room-back'));
    await fireEvent.press(screen.getByTestId('chat-refresh'));
    expect(await screen.findByText('Sohbet odaları yüklenemedi.')).toBeTruthy();
    expect(screen.getByTestId(`chat-room-${roomId}`)).toBeTruthy();
  });

  it('returns to the refreshed list when room membership is revoked', async () => {
    const gateway = gatewayDouble();
    let revoked = false;
    gateway.loadMessages = jest.fn(async () => {
      revoked = true;
      throw new NativeChatReadError('inaccessible-room');
    });
    gateway.loadRooms = jest.fn(async () => revoked ? [] : [room()]);
    await render(<ChatScreen scope={scope} choirName="Genova A" gateway={gateway} sendGateway={sendGatewayDouble()} actionGateway={actionGatewayDouble()} onBack={jest.fn()} />);
    await fireEvent.press(await screen.findByTestId(`chat-room-${roomId}`));

    expect(await screen.findByTestId('chat-list-screen')).toBeTruthy();
    expect(await screen.findByText(/erişiminiz sona erdi/u)).toBeTruthy();
  });

  it('persists a reply/link draft, exposes failed retry and replaces it with one acknowledgement', async () => {
    const gateway = gatewayDouble();
    const sendGateway = sendGatewayDouble();
    (sendGateway.transmit as jest.Mock)
      .mockRejectedValueOnce(new NativeChatSendError('transmit-failed'))
      .mockResolvedValueOnce(message({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        clientMutationId: queued().clientMutationId,
        content: queued().content,
        replyToId: queued().replyToId,
        metadata: { link_preview: queued().linkPreview },
      }));
    (sendGateway.restore as jest.Mock)
      .mockResolvedValueOnce([queued({ status: 'failed' })])
      .mockResolvedValueOnce([]);
    await render(
      <ChatScreen scope={scope} choirName="Genova A" gateway={gateway} sendGateway={sendGateway} actionGateway={actionGatewayDouble()} onBack={jest.fn()} />,
    );
    await fireEvent.press(await screen.findByTestId(`chat-room-${roomId}`));
    await screen.findByText('Prova saat dokuzda.');

    await fireEvent.press(screen.getByTestId(`chat-reply-${messageId}`));
    expect(screen.getByTestId('chat-reply-draft')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('chat-composer-input'), 'https://example.invalid prova');
    await fireEvent.press(screen.getByTestId('chat-send'));

    await waitFor(() => expect(sendGateway.prepare).toHaveBeenCalledWith(
      scope,
      roomId,
      'https://example.invalid prova',
      messageId,
    ));
    expect(await screen.findByText('Gönderilemedi')).toBeTruthy();
    expect(screen.getByText('Bağlantı: Prova')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(`chat-retry-${queued().clientMutationId}`));

    await waitFor(() => expect(sendGateway.transmit).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('chat-message-bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')).toBeTruthy();
    expect(screen.queryByTestId(`chat-pending-${queued().clientMutationId}`)).toBeNull();
  });

  it('restores a failed protected item and cancels it explicitly', async () => {
    const gateway = gatewayDouble();
    const sendGateway = sendGatewayDouble();
    (sendGateway.reconcile as jest.Mock).mockResolvedValueOnce([queued({ status: 'failed' })]);
    await render(
      <ChatScreen scope={scope} choirName="Genova A" gateway={gateway} sendGateway={sendGateway} actionGateway={actionGatewayDouble()} onBack={jest.fn()} />,
    );
    await fireEvent.press(await screen.findByTestId(`chat-room-${roomId}`));

    expect(await screen.findByTestId(`chat-cancel-${queued().clientMutationId}`)).toBeTruthy();
    await fireEvent.press(screen.getByTestId(`chat-cancel-${queued().clientMutationId}`));
    await waitFor(() => expect(sendGateway.cancel).toHaveBeenCalledWith(scope, roomId, queued().clientMutationId));
    expect(screen.queryByTestId(`chat-pending-${queued().clientMutationId}`)).toBeNull();
  });

  it('copies, edits and confirms global deletion only after accepted action acknowledgements', async () => {
    const gateway = gatewayDouble();
    gateway.loadMessages = jest.fn(async () => ({
      room: room(),
      messages: [message({ senderId: scope.memberId, sender: { id: scope.memberId, firstName: 'Grace', lastName: 'Hopper', photoUrl: null } })],
      nextCursor: null,
      hasMore: false,
    }));
    const actionGateway = actionGatewayDouble();
    await render(
      <ChatScreen
        scope={scope}
        choirName="Genova A"
        gateway={gateway}
        sendGateway={sendGatewayDouble()}
        actionGateway={actionGateway}
        now={() => Date.parse('2026-09-20T09:30:00Z')}
        onBack={jest.fn()}
      />,
    );
    await fireEvent.press(await screen.findByTestId(`chat-room-${roomId}`));
    await screen.findByText('Prova saat dokuzda.');

    await fireEvent.press(screen.getByTestId(`chat-actions-${messageId}`));
    expect(screen.getByTestId('chat-action-edit')).toBeTruthy();
    expect(screen.getByTestId('chat-action-delete-everyone')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chat-action-copy'));
    await waitFor(() => expect(actionGateway.copy).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('chat-action-notice')).toHaveTextContent('Mesaj kopyalandı.');

    await fireEvent.press(screen.getByTestId(`chat-actions-${messageId}`));
    await fireEvent.press(screen.getByTestId('chat-action-edit'));
    expect(screen.getByTestId('chat-edit-draft')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('chat-composer-input'), 'Yeni prova saati on.');
    await fireEvent.press(screen.getByTestId('chat-send'));
    await waitFor(() => expect(actionGateway.edit).toHaveBeenCalledWith(
      scope,
      expect.objectContaining({ id: messageId }),
      'Yeni prova saati on.',
    ));
    expect(await screen.findByText('Yeni prova saati on.')).toBeTruthy();
    expect(screen.getByText('düzenlendi')).toBeTruthy();

    await fireEvent.press(screen.getByTestId(`chat-actions-${messageId}`));
    await fireEvent.press(screen.getByTestId('chat-action-delete-everyone'));
    expect(screen.getByTestId('chat-action-confirmation')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chat-action-confirm-cancel'));
    expect(screen.getByTestId(`chat-action-panel-${messageId}`)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chat-action-delete-everyone'));
    await fireEvent.press(screen.getByTestId('chat-action-confirm'));
    await waitFor(() => expect(actionGateway.deleteForEveryone).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Bu mesaj silindi.')).toBeTruthy();
  });

  it('offers peer copy/hide but not sender-only controls, then hides only after confirmation', async () => {
    const gateway = gatewayDouble();
    const actionGateway = actionGatewayDouble();
    await render(
      <ChatScreen
        scope={scope}
        choirName="Genova A"
        gateway={gateway}
        sendGateway={sendGatewayDouble()}
        actionGateway={actionGateway}
        now={() => Date.parse('2026-09-20T09:30:00Z')}
        onBack={jest.fn()}
      />,
    );
    await fireEvent.press(await screen.findByTestId(`chat-room-${roomId}`));
    await screen.findByText('Prova saat dokuzda.');
    await fireEvent.press(screen.getByTestId(`chat-actions-${messageId}`));

    expect(screen.queryByTestId('chat-action-edit')).toBeNull();
    expect(screen.queryByTestId('chat-action-delete-everyone')).toBeNull();
    expect(screen.getByTestId('chat-action-copy')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('chat-action-hide-self'));
    await fireEvent.press(screen.getByTestId('chat-action-confirm'));

    await waitFor(() => expect(actionGateway.hideForSelf).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Prova saat dokuzda.')).toBeNull();
    expect(screen.getByTestId('chat-action-notice')).toHaveTextContent('Mesaj yalnız sizden silindi.');
  });

  it('keeps trusted content visible when clipboard or backend action fails', async () => {
    const gateway = gatewayDouble();
    gateway.loadMessages = jest.fn(async () => ({
      room: room(),
      messages: [message({ senderId: scope.memberId, sender: null })],
      nextCursor: null,
      hasMore: false,
    }));
    const actionGateway = actionGatewayDouble();
    (actionGateway.copy as jest.Mock).mockRejectedValueOnce(new NativeChatMessageActionError('clipboard-failed'));
    (actionGateway.deleteForEveryone as jest.Mock).mockRejectedValueOnce(new NativeChatMessageActionError('action-failed'));
    await render(
      <ChatScreen
        scope={scope}
        choirName="Genova A"
        gateway={gateway}
        sendGateway={sendGatewayDouble()}
        actionGateway={actionGateway}
        now={() => Date.parse('2026-09-20T09:30:00Z')}
        onBack={jest.fn()}
      />,
    );
    await fireEvent.press(await screen.findByTestId(`chat-room-${roomId}`));
    await screen.findByText('Prova saat dokuzda.');

    await fireEvent.press(screen.getByTestId(`chat-actions-${messageId}`));
    await fireEvent.press(screen.getByTestId('chat-action-copy'));
    expect(await screen.findByText('Mesaj panoya kopyalanamadı.')).toBeTruthy();
    expect(screen.getByTestId(`chat-message-${messageId}`)).toBeTruthy();
    expect(screen.getAllByText('Prova saat dokuzda.').length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByTestId('chat-action-delete-everyone'));
    await fireEvent.press(screen.getByTestId('chat-action-confirm'));
    expect(await screen.findByText('Mesaj işlemi tamamlanamadı; mevcut içerik korundu.')).toBeTruthy();
    expect(screen.getByTestId(`chat-message-${messageId}`)).toBeTruthy();
    expect(screen.getAllByText('Prova saat dokuzda.').length).toBeGreaterThan(0);
  });

  it('keeps expired sender actions server-gated and refuses a late room result in the list UI', async () => {
    const gateway = gatewayDouble();
    gateway.loadMessages = jest.fn(async () => ({
      room: room(),
      messages: [message({ senderId: scope.memberId, sender: null })],
      nextCursor: null,
      hasMore: false,
    }));
    const actionGateway = actionGatewayDouble();
    let releaseHide: ((value: { messageId: string; hiddenId: string }) => void) | undefined;
    (actionGateway.hideForSelf as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => {
      releaseHide = resolve;
    }));
    await render(
      <ChatScreen
        scope={scope}
        choirName="Genova A"
        gateway={gateway}
        sendGateway={sendGatewayDouble()}
        actionGateway={actionGateway}
        now={() => Date.parse('2026-09-20T10:00:01Z')}
        onBack={jest.fn()}
      />,
    );
    await fireEvent.press(await screen.findByTestId(`chat-room-${roomId}`));
    await fireEvent.press(await screen.findByTestId(`chat-actions-${messageId}`));
    expect(screen.queryByTestId('chat-action-edit')).toBeNull();
    expect(screen.queryByTestId('chat-action-delete-everyone')).toBeNull();

    await fireEvent.press(screen.getByTestId('chat-action-hide-self'));
    await fireEvent.press(screen.getByTestId('chat-action-confirm'));
    await waitFor(() => expect(actionGateway.hideForSelf).toHaveBeenCalledTimes(1));
    await fireEvent.press(screen.getByTestId('chat-room-back'));
    expect(await screen.findByTestId('chat-list-screen')).toBeTruthy();
    await act(async () => releaseHide?.({
      messageId,
      hiddenId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    }));

    expect(screen.getByTestId('chat-list-screen')).toBeTruthy();
    expect(screen.queryByTestId('chat-action-notice')).toBeNull();
  });
});
