import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ChatReadMessage, ChatReadRoomSummary, ChatReadScope } from '@shared/chat-read-contract';
import { ChatScreen } from '../ChatScreen';
import { NativeChatReadError, type NativeChatReadGateway } from '../chat-read-gateway';

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

describe('ChatScreen', () => {
  it('shows an authorized searchable room list and opens an accessible message history', async () => {
    const gateway = gatewayDouble();
    await render(<ChatScreen scope={scope} choirName="Genova A" gateway={gateway} onBack={jest.fn()} />);

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
    await render(<ChatScreen scope={scope} choirName="Genova A" gateway={gateway} onBack={jest.fn()} />);
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
    await render(<ChatScreen scope={scope} choirName="Genova A" gateway={gateway} onBack={jest.fn()} />);

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
    await render(<ChatScreen scope={scope} choirName="Genova A" gateway={gateway} onBack={jest.fn()} />);

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
    await render(<ChatScreen scope={scope} choirName="Genova A" gateway={gateway} onBack={jest.fn()} />);
    await fireEvent.press(await screen.findByTestId(`chat-room-${roomId}`));

    expect(await screen.findByTestId('chat-list-screen')).toBeTruthy();
    expect(await screen.findByText(/erişiminiz sona erdi/u)).toBeTruthy();
  });
});
