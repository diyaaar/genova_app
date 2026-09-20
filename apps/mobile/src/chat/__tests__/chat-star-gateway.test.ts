import type { ChatReadScope } from '@shared/chat-read-contract';
import {
  createNativeChatStarGateway,
  NativeChatStarError,
  type NativeChatStarTransport,
} from '../chat-star-gateway';

const scope: ChatReadScope = {
  userId: '11111111-1111-4111-8111-111111111111',
  choirId: '22222222-2222-4222-8222-222222222222',
  memberId: '33333333-3333-4333-8333-333333333333',
};
const roomId = '44444444-4444-4444-8444-444444444444';
const messageId = '55555555-5555-4555-8555-555555555555';
const peerId = '66666666-6666-4666-8666-666666666666';
const starId = '77777777-7777-4777-8777-777777777777';

function messageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: messageId,
    client_mutation_id: null,
    room_id: roomId,
    sender_id: peerId,
    content: 'Prova saat dokuzda.',
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

function starRow(overrides: Record<string, unknown> = {}) {
  return {
    id: starId,
    message_id: messageId,
    member_id: scope.memberId,
    choir_id: scope.choirId,
    created_at: '2026-09-20T10:00:00.000000Z',
    message: messageRow(),
    ...overrides,
  };
}

type TransportDouble = NativeChatStarTransport & {
  stateRows: unknown;
  addResult: unknown;
  removeResult: unknown;
  pageRows: unknown;
};

function transportDouble(): TransportDouble {
  let result: TransportDouble;
  result = {
    stateRows: [starRow({ message: { id: messageId, room_id: roomId, is_deleted: false } })],
    addResult: [starRow()],
    removeResult: [starRow()],
    pageRows: [starRow()],
    loadStateRows: jest.fn(async () => result.stateRows),
    addStar: jest.fn(async () => result.addResult),
    removeStar: jest.fn(async () => result.removeResult),
    loadPageRows: jest.fn(async () => result.pageRows),
  };
  return result;
}

describe('native chat star gateway', () => {
  it('loads only exact current-member state and chunks bounded message IDs', async () => {
    const transport = transportDouble();
    const gateway = createNativeChatStarGateway(transport);
    const ids = Array.from({ length: 41 }, (_, index) => (
      index === 0 ? messageId : `aaaaaaaa-aaaa-4aaa-8aaa-${String(index).padStart(12, '0')}`
    ));
    (transport.loadStateRows as jest.Mock)
      .mockResolvedValueOnce(transport.stateRows)
      .mockResolvedValueOnce([]);

    const state = await gateway.loadStates(scope, roomId, ids);

    expect(state.has(messageId)).toBe(true);
    expect(transport.loadStateRows).toHaveBeenCalledTimes(2);
    expect((transport.loadStateRows as jest.Mock).mock.calls[0][0].messageIds).toHaveLength(40);
    expect((transport.loadStateRows as jest.Mock).mock.calls[1][0].messageIds).toHaveLength(1);
  });

  it.each([
    { member_id: '88888888-8888-4888-8888-888888888888' },
    { choir_id: '99999999-9999-4999-8999-999999999999' },
    { message: { id: messageId, room_id: 'aaaaaaaa-1111-4111-8111-111111111111', is_deleted: false } },
    { message: { id: messageId, room_id: roomId, is_deleted: true } },
    { message: null },
  ])('fails closed on mismatched or inaccessible state row %#', async (override) => {
    const transport = transportDouble();
    transport.stateRows = [starRow(override)];
    const gateway = createNativeChatStarGateway(transport);

    await expect(gateway.loadStates(scope, roomId, [messageId]))
      .rejects.toMatchObject<Partial<NativeChatStarError>>({ code: 'invalid-data' });
  });

  it('changes state only after an exact add/remove acknowledgement and deduplicates a repeated tap', async () => {
    const transport = transportDouble();
    let release: ((value: unknown) => void) | undefined;
    let signalStarted!: () => void;
    const started = new Promise<void>((resolve) => { signalStarted = resolve; });
    transport.addStar = jest.fn(() => new Promise((resolve) => { release = resolve; signalStarted(); }));
    const gateway = createNativeChatStarGateway(transport);
    await gateway.loadStates(scope, roomId, [messageId]);
    transport.stateRows = [];

    const first = gateway.setStarred(scope, roomId, messageId, true);
    const repeated = gateway.setStarred(scope, roomId, messageId, true);
    expect(first).toBe(repeated);
    await started;
    expect(transport.addStar).toHaveBeenCalledTimes(1);
    release?.([starRow()]);
    expect((await first).has(messageId)).toBe(true);

    const removed = await gateway.setStarred(scope, roomId, messageId, false);
    expect(removed.has(messageId)).toBe(false);
    expect(transport.removeStar).toHaveBeenCalledWith({ scope, messageId });
  });

  it('keeps the last trusted state when transport fails or acknowledgement is wrong', async () => {
    const transport = transportDouble();
    const gateway = createNativeChatStarGateway(transport);
    await gateway.loadStates(scope, roomId, [messageId]);
    transport.removeStar = jest.fn(async () => { throw new Error('network detail'); });
    await expect(gateway.setStarred(scope, roomId, messageId, false))
      .rejects.toMatchObject<Partial<NativeChatStarError>>({ code: 'action-failed' });

    transport.removeStar = jest.fn(async () => [starRow({ message_id: 'aaaaaaaa-1111-4111-8111-111111111111' })]);
    await expect(gateway.setStarred(scope, roomId, messageId, false))
      .rejects.toMatchObject<Partial<NativeChatStarError>>({ code: 'invalid-acknowledgement' });
    expect((await gateway.loadStates(scope, roomId, [messageId])).has(messageId)).toBe(true);
  });

  it.each([
    null, [], [starRow(), starRow()],
    [starRow({ member_id: peerId })], [starRow({ choir_id: peerId })],
  ])('refuses missing, duplicate or foreign write acknowledgements %#', async (reply) => {
    const transport = transportDouble();
    transport.removeResult = reply;
    const gateway = createNativeChatStarGateway(transport);
    await gateway.loadStates(scope, roomId, [messageId]);
    await expect(gateway.setStarred(scope, roomId, messageId, false))
      .rejects.toMatchObject({ code: 'invalid-acknowledgement' });
    // No new query: a failed write must preserve the gateway's last accepted snapshot.
    expect((await gateway.loadStates(scope, roomId, [])).has(messageId)).toBe(true);
  });

  it('serializes an older state snapshot before a write so it cannot roll the acknowledgement back', async () => {
    const transport = transportDouble();
    let releaseState: ((value: unknown) => void) | undefined;
    let signalStarted!: () => void;
    const started = new Promise<void>((resolve) => { signalStarted = resolve; });
    transport.loadStateRows = jest.fn(() => new Promise((resolve) => { releaseState = resolve; signalStarted(); }));
    const gateway = createNativeChatStarGateway(transport);

    const snapshot = gateway.loadStates(scope, roomId, [messageId]);
    const write = gateway.setStarred(scope, roomId, messageId, true);
    await started;
    expect(transport.addStar).not.toHaveBeenCalled();
    releaseState?.([]);
    expect((await snapshot).has(messageId)).toBe(false);
    expect((await write).has(messageId)).toBe(true);
    expect(transport.addStar).toHaveBeenCalledTimes(1);
  });

  it('returns a stable 40-row page, exact cursor and no duplicate message IDs', async () => {
    const transport = transportDouble();
    transport.pageRows = Array.from({ length: 41 }, (_, index) => {
      const suffix = String(index + 1).padStart(12, '0');
      const id = `aaaaaaaa-aaaa-4aaa-8aaa-${suffix}`;
      const nestedMessageId = `bbbbbbbb-bbbb-4bbb-8bbb-${suffix}`;
      return starRow({
        id,
        message_id: nestedMessageId,
        created_at: `2026-09-20T10:${String(59 - index).padStart(2, '0')}:00.000000Z`,
        message: messageRow({ id: nestedMessageId }),
      });
    });
    const gateway = createNativeChatStarGateway(transport);
    const page = await gateway.loadPage(scope, roomId);

    expect(page.items).toHaveLength(40);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor).toEqual({
      createdAt: page.items[39]?.starredAt,
      id: page.items[39]?.starId,
    });
    expect(transport.loadPageRows).toHaveBeenCalledWith({ scope, roomId, before: null, limit: 41 });

    transport.pageRows = [starRow(), starRow({ id: 'aaaaaaaa-1111-4111-8111-111111111111' })];
    await expect(gateway.loadPage(scope, roomId))
      .rejects.toMatchObject<Partial<NativeChatStarError>>({ code: 'invalid-data' });
  });

  it('preserves microsecond ordering before using the UUID tie-breaker', async () => {
    const transport = transportDouble();
    const firstMessageId = 'aaaaaaaa-1111-4111-8111-111111111111';
    const secondMessageId = 'aaaaaaaa-2222-4222-8222-222222222222';
    transport.pageRows = [
      starRow({
        id: 'bbbbbbbb-1111-4111-8111-111111111111',
        message_id: firstMessageId,
        created_at: '2026-09-20T10:00:00.123455Z',
        message: messageRow({ id: firstMessageId }),
      }),
      starRow({
        id: 'bbbbbbbb-2222-4222-8222-222222222222',
        message_id: secondMessageId,
        created_at: '2026-09-20T10:00:00.123456Z',
        message: messageRow({ id: secondMessageId }),
      }),
    ];

    const page = await createNativeChatStarGateway(transport).loadPage(scope, roomId);
    expect(page.items.map((item) => item.message.id)).toEqual([secondMessageId, firstMessageId]);
  });

  it('rejects malformed/deleted nested messages and late room or tenant results', async () => {
    const transport = transportDouble();
    const gateway = createNativeChatStarGateway(transport);
    transport.pageRows = [starRow({ message: messageRow({ is_deleted: true }) })];
    await expect(gateway.loadPage(scope, roomId))
      .rejects.toMatchObject<Partial<NativeChatStarError>>({ code: 'invalid-data' });

    const releases: Array<(value: unknown) => void> = [];
    transport.loadPageRows = jest.fn(() => new Promise((resolve) => { releases.push(resolve); }));
    const pending = gateway.loadPage(scope, roomId);
    const otherRoom = 'aaaaaaaa-1111-4111-8111-111111111111';
    const second = gateway.loadPage(scope, otherRoom);
    releases[0]?.([starRow()]);
    await expect(pending).rejects.toMatchObject<Partial<NativeChatStarError>>({ code: 'stale-scope' });
    gateway.clear();
    releases[1]?.([]);
    await expect(second).rejects.toMatchObject<Partial<NativeChatStarError>>({ code: 'stale-scope' });
  });

  it('rejects normalized invalid dates and rows outside the requested older cursor', async () => {
    const transport = transportDouble();
    const gateway = createNativeChatStarGateway(transport);
    await expect(gateway.loadPage(scope, roomId, { before: {
      id: starId, createdAt: '2026-02-30T10:00:00Z',
    } })).rejects.toMatchObject({ code: 'invalid-target' });
    expect(transport.loadPageRows).not.toHaveBeenCalled();
    transport.pageRows = [starRow({ created_at: '2026-02-30T10:00:00Z' })];
    await expect(gateway.loadPage(scope, roomId)).rejects.toMatchObject({ code: 'invalid-data' });
    transport.pageRows = [starRow()];
    await expect(gateway.loadPage(scope, roomId, { before: {
      id: starId, createdAt: '2026-09-20T10:00:00.000000Z',
    } })).rejects.toMatchObject({ code: 'invalid-data' });
    const older = await gateway.loadPage(scope, roomId, { before: {
      id: starId, createdAt: '2026-09-20T10:00:00.000001Z',
    } });
    expect(older.items).toHaveLength(1);
  });

  it('does not let a stalled old room block a new room or commit after A-B-A', async () => {
    const transport = transportDouble();
    let release!: (value: unknown) => void;
    let signalStarted!: () => void;
    const started = new Promise<void>((resolve) => { signalStarted = resolve; });
    (transport.loadStateRows as jest.Mock).mockImplementationOnce(() => new Promise((resolve) => {
      release = resolve;
      signalStarted();
    })).mockResolvedValue([]);
    const gateway = createNativeChatStarGateway(transport);
    const pending = gateway.loadStates(scope, roomId, [messageId]);
    await started;
    await expect(gateway.loadStates(scope, peerId, [messageId])).resolves.toEqual(new Set());
    await expect(gateway.loadStates(scope, roomId, [messageId])).resolves.toEqual(new Set());
    const refusal = expect(pending).rejects.toMatchObject({ code: 'stale-scope' });
    release([starRow()]);
    await refusal;
  });
});
