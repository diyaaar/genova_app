import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseChatReadTransport } from '../supabase-chat-read-transport';

const scope = {
  userId: '11111111-1111-4111-8111-111111111111',
  choirId: '22222222-2222-4222-8222-222222222222',
  memberId: '33333333-3333-4333-8333-333333333333',
};
const roomId = '44444444-4444-4444-8444-444444444444';

function clientDouble() {
  type QueryDouble = Record<'select' | 'eq' | 'order' | 'limit' | 'or' | 'then', jest.Mock>;
  const query: QueryDouble = {
    select: jest.fn(),
    eq: jest.fn(),
    order: jest.fn(),
    limit: jest.fn(),
    or: jest.fn(),
    then: jest.fn((resolve: (value: unknown) => void) => Promise.resolve(resolve({ data: [], error: null }))),
  };
  for (const name of ['select', 'eq', 'order', 'limit', 'or'] as const) query[name].mockReturnValue(query);

  const eventHandlers: Array<{ config: Record<string, unknown>; callback: () => void }> = [];
  let statusHandler: ((status: string) => void) | null = null;
  type ChannelDouble = { on: jest.Mock; subscribe: jest.Mock };
  let channel: ChannelDouble;
  channel = {
    on: jest.fn((_kind: string, config: Record<string, unknown>, callback: () => void) => {
      eventHandlers.push({ config, callback });
      return channel;
    }),
    subscribe: jest.fn((callback: (status: string) => void) => {
      statusHandler = callback;
      return channel;
    }),
  };
  const rpc = jest.fn(async (name: string) => ({
    data: name === 'mark_chat_room_read' ? '2026-09-20T09:00:00Z' : [],
    error: null,
  }));
  const removeChannel = jest.fn(async () => 'ok');
  const client = {
    rpc,
    from: jest.fn(() => query),
    channel: jest.fn(() => channel),
    removeChannel,
  } as unknown as SupabaseClient;
  return { client, query, rpc, channel, eventHandlers, removeChannel, emitStatus: (status: string) => statusHandler?.(status) };
}

describe('Supabase native chat read transport', () => {
  it('uses the accepted room RPC, stable two-column cursor and server-time read RPC', async () => {
    const fake = clientDouble();
    const transport = createSupabaseChatReadTransport(fake.client);
    await transport.loadRoomRows(scope.memberId);
    await transport.loadMessageRows({
      roomId,
      before: { createdAt: '2026-09-20T09:00:00.123456Z', id: '55555555-5555-4555-8555-555555555555' },
      limit: 40,
    });
    await transport.markRoomRead(roomId, scope.memberId);

    expect(fake.rpc).toHaveBeenNthCalledWith(1, 'get_chat_rooms_for_member', { p_member_id: scope.memberId });
    expect(fake.query.eq).toHaveBeenCalledWith('room_id', roomId);
    expect(fake.query.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false });
    expect(fake.query.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
    expect(fake.query.or).toHaveBeenCalledWith(
      'created_at.lt.2026-09-20T09:00:00.123456Z,and(created_at.eq.2026-09-20T09:00:00.123456Z,id.lt.55555555-5555-4555-8555-555555555555)',
    );
    expect(fake.rpc).toHaveBeenNthCalledWith(2, 'mark_chat_room_read', { p_room_id: roomId });
  });

  it('subscribes only to INSERT/UPDATE and converts payloads and reconnects into invalidation', () => {
    const fake = clientDouble();
    const transport = createSupabaseChatReadTransport(fake.client);
    const invalidate = jest.fn();
    const connection = jest.fn();
    const stop = transport.watchRoomList(scope, { invalidate, connection });

    expect(fake.eventHandlers.map((entry) => entry.config)).toEqual([
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `choir_id=eq.${scope.choirId}` },
      { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `choir_id=eq.${scope.choirId}` },
    ]);
    fake.eventHandlers[0]?.callback();
    fake.emitStatus('SUBSCRIBED');
    fake.emitStatus('CHANNEL_ERROR');
    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(connection).toHaveBeenNthCalledWith(1, 'connected');
    expect(connection).toHaveBeenNthCalledWith(2, 'disconnected');
    stop();
    expect(fake.removeChannel).toHaveBeenCalledTimes(1);
  });
});
