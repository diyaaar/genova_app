import type { ChatReadMessageCursor, ChatReadScope } from '@shared/chat-read-contract';
import {
  createNativeChatReadGateway,
  getNativeChatRoomTitle,
  NativeChatReadError,
  type NativeChatReadTransport,
} from '../chat-read-gateway';

const scope: ChatReadScope = {
  userId: '11111111-1111-4111-8111-111111111111',
  choirId: '22222222-2222-4222-8222-222222222222',
  memberId: '33333333-3333-4333-8333-333333333333',
};
const roomId = '44444444-4444-4444-8444-444444444444';
const peerId = '55555555-5555-4555-8555-555555555555';

function messageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '66666666-6666-4666-8666-666666666666',
    room_id: roomId,
    sender_id: peerId,
    content: 'Merhaba',
    message_type: 'text',
    reply_to_id: null,
    metadata_json: {},
    is_edited: false,
    is_deleted: false,
    created_at: '2026-09-20T09:00:00.000000Z',
    updated_at: '2026-09-20T09:00:00.000000Z',
    sender: { id: peerId, first_name: 'Ada', last_name: 'Lovelace', photo_url: null },
    reply_to: null,
    ...overrides,
  };
}

function roomRow(overrides: Record<string, unknown> = {}) {
  return {
    room_id: roomId,
    membership_id: '77777777-7777-4777-8777-777777777777',
    member_id: scope.memberId,
    nickname: null,
    membership_role: 'member',
    last_read_at: null,
    notifications_enabled: true,
    hidden_at: null,
    room_name: 'Özel sohbet',
    room_slug: 'ozel-sohbet',
    room_description: null,
    room_type: 'dm',
    room_created_by: peerId,
    room_avatar_url: null,
    room_is_archived: false,
    room_created_at: '2026-09-20T08:00:00.000000Z',
    room_updated_at: '2026-09-20T09:00:00.000000Z',
    unread_count: 1,
    member_count: 2,
    members_preview: [
      { member_id: scope.memberId, first_name: 'Grace', last_name: 'Hopper', photo_url: null },
      { member_id: peerId, first_name: 'Ada', last_name: 'Lovelace', photo_url: null },
    ],
    last_message: messageRow(),
    ...overrides,
  };
}

type TransportDouble = NativeChatReadTransport & {
  roomRows: unknown;
  messageRows: unknown;
  listListener: Parameters<NativeChatReadTransport['watchRoomList']>[1] | null;
  roomListener: Parameters<NativeChatReadTransport['watchRoom']>[2] | null;
  stopList: jest.Mock;
  stopRoom: jest.Mock;
};

function transportDouble(): TransportDouble {
  let result: TransportDouble;
  result = {
    roomRows: [roomRow()],
    messageRows: [messageRow()],
    listListener: null,
    roomListener: null,
    stopList: jest.fn(),
    stopRoom: jest.fn(),
    loadRoomRows: jest.fn(async () => result.roomRows),
    loadMessageRows: jest.fn(async (_input: {
      roomId: string; before: ChatReadMessageCursor | null; limit: number;
    }) => result.messageRows),
    markRoomRead: jest.fn(async () => {}),
    watchRoomList: jest.fn((_scope, listener) => {
      result.listListener = listener;
      return result.stopList;
    }),
    watchRoom: jest.fn((_scope, _roomId, listener) => {
      result.roomListener = listener;
      return result.stopRoom;
    }),
  };
  return result;
}

describe('native chat read gateway', () => {
  it('validates, hides stale hidden rooms, resurfaces newer activity and derives a DM title', async () => {
    const transport = transportDouble();
    transport.roomRows = [
      roomRow({ hidden_at: '2026-09-20T10:00:00.000000Z' }),
      roomRow({
        room_id: '88888888-8888-4888-8888-888888888888',
        membership_id: '99999999-9999-4999-8999-999999999999',
        room_name: 'Gizlenip dönen',
        room_type: 'custom',
        hidden_at: '2026-09-20T08:30:00.000000Z',
        last_message: messageRow({ room_id: '88888888-8888-4888-8888-888888888888' }),
      }),
    ];
    const gateway = createNativeChatReadGateway(transport);
    const rooms = await gateway.loadRooms(scope);

    expect(rooms).toHaveLength(1);
    expect(rooms[0]?.name).toBe('Gizlenip dönen');

    transport.roomRows = [roomRow()];
    const dm = await gateway.loadRooms(scope, { force: true });
    expect(getNativeChatRoomTitle(dm[0]!)).toBe('Ada Lovelace');
  });

  it('fails closed on malformed rows and on a room removed from the authoritative snapshot', async () => {
    const transport = transportDouble();
    const gateway = createNativeChatReadGateway(transport);
    transport.roomRows = [roomRow({ unread_count: -1 })];
    await expect(gateway.loadRooms(scope)).rejects.toMatchObject<Partial<NativeChatReadError>>({ code: 'invalid-data' });

    transport.roomRows = [roomRow()];
    await gateway.loadRooms(scope, { force: true });
    transport.roomRows = [];
    await expect(gateway.loadMessages(scope, roomId)).rejects.toMatchObject<Partial<NativeChatReadError>>({
      code: 'inaccessible-room',
    });
    expect(transport.loadMessageRows).not.toHaveBeenCalled();
  });

  it('uses the stable cursor, merges older pages without duplicate IDs and never trusts event payloads', async () => {
    const transport = transportDouble();
    const gateway = createNativeChatReadGateway(transport);
    await gateway.loadRooms(scope);
    const first = await gateway.loadMessages(scope, roomId);
    const olderId = '11111111-2222-4333-8444-555555555555';
    transport.messageRows = [messageRow({
      id: olderId,
      content: 'Daha eski',
      created_at: '2026-09-20T08:00:00.000000Z',
      updated_at: '2026-09-20T08:00:00.000000Z',
    })];
    const second = await gateway.loadMessages(scope, roomId, { before: first.nextCursor });

    expect(second.messages.map((message) => message.id)).toEqual([
      olderId,
      '66666666-6666-4666-8666-666666666666',
    ]);
    expect(transport.loadMessageRows).toHaveBeenLastCalledWith({
      roomId,
      before: first.nextCursor,
      limit: 40,
    });

    const invalidate = jest.fn();
    const connection = jest.fn();
    gateway.watchRoomList(scope, { invalidate, connection });
    transport.listListener?.invalidate();
    transport.listListener?.connection('disconnected');
    expect(invalidate).toHaveBeenCalledTimes(1);
    expect(connection).toHaveBeenCalledWith('disconnected');
  });

  it('ignores late callbacks after a same-scope watcher is stopped', async () => {
    const transport = transportDouble();
    const gateway = createNativeChatReadGateway(transport);
    const invalidate = jest.fn();
    const connection = jest.fn();
    const stop = gateway.watchRoomList(scope, { invalidate, connection });

    stop();
    transport.listListener?.invalidate();
    transport.listListener?.connection('disconnected');

    expect(transport.stopList).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
    expect(connection).not.toHaveBeenCalled();
  });

  it('invalidates late reads and stops every watcher synchronously on tenant clear', async () => {
    const transport = transportDouble();
    transport.loadRoomRows = jest.fn(async () => [roomRow()]);
    const gateway = createNativeChatReadGateway(transport);
    const pending = gateway.loadRooms(scope);
    const invalidate = jest.fn();
    gateway.watchRoomList(scope, { invalidate, connection: jest.fn() });
    gateway.clear();
    transport.listListener?.invalidate();

    await expect(pending).rejects.toMatchObject<Partial<NativeChatReadError>>({ code: 'stale-scope' });
    expect(transport.stopList).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
    expect(transport.loadMessageRows).not.toHaveBeenCalled();
  });

  it('serializes reconnect snapshots so an older response cannot overwrite newer memory', async () => {
    const transport = transportDouble();
    const releases: Array<() => void> = [];
    let inFlight = 0;
    let maxInFlight = 0;
    let call = 0;
    transport.loadRoomRows = jest.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      const current = ++call;
      await new Promise<void>((resolve) => releases.push(resolve));
      inFlight -= 1;
      return [roomRow({ room_name: current === 1 ? 'İlk snapshot' : 'Son snapshot' })];
    });
    const gateway = createNativeChatReadGateway(transport);
    const first = gateway.loadRooms(scope, { force: true });
    const second = gateway.loadRooms(scope, { force: true });
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(transport.loadRoomRows).toHaveBeenCalledTimes(1);
    releases.shift()?.();
    await first;
    await Promise.resolve();
    await Promise.resolve();
    expect(transport.loadRoomRows).toHaveBeenCalledTimes(2);
    releases.shift()?.();
    expect((await second)[0]?.name).toBe('Son snapshot');
    expect(maxInFlight).toBe(1);
    expect((await gateway.loadRooms(scope))[0]?.name).toBe('Son snapshot');
  });
});
