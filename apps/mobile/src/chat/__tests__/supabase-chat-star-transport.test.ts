import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseChatStarTransport } from '../supabase-chat-star-transport';

const scope = {
  userId: '11111111-1111-4111-8111-111111111111',
  choirId: '22222222-2222-4222-8222-222222222222',
  memberId: '33333333-3333-4333-8333-333333333333',
};
const roomId = '44444444-4444-4444-8444-444444444444';
const messageId = '55555555-5555-4555-8555-555555555555';

function clientDouble() {
  type QueryDouble = Record<
    'select' | 'eq' | 'in' | 'insert' | 'delete' | 'order' | 'limit' | 'or' | 'then',
    jest.Mock
  >;
  const query = {} as QueryDouble;
  for (const name of ['select', 'eq', 'in', 'insert', 'delete', 'order', 'limit', 'or'] as const) {
    query[name] = jest.fn(() => query);
  }
  query.then = jest.fn((resolve: (value: unknown) => void) => Promise.resolve(resolve({ data: [], error: null })));
  const client = { from: jest.fn(() => query) } as unknown as SupabaseClient;
  return { client, query, from: client.from as jest.Mock };
}

describe('Supabase native chat star transport', () => {
  it('binds state and mutations to exact current member, choir, room and message identities', async () => {
    const fake = clientDouble();
    const transport = createSupabaseChatStarTransport(fake.client);

    await transport.loadStateRows({ scope, roomId, messageIds: [messageId] });
    expect(fake.from).toHaveBeenCalledWith('chat_starred_messages');
    expect(fake.query.in).toHaveBeenCalledWith('message_id', [messageId]);
    expect(fake.query.eq).toHaveBeenCalledWith('member_id', scope.memberId);
    expect(fake.query.eq).toHaveBeenCalledWith('choir_id', scope.choirId);
    expect(fake.query.eq).toHaveBeenCalledWith('message.room_id', roomId);
    expect(fake.query.eq).toHaveBeenCalledWith('message.is_deleted', false);

    await transport.addStar({ scope, messageId });
    expect(fake.query.insert).toHaveBeenCalledWith({
      message_id: messageId,
      member_id: scope.memberId,
      choir_id: scope.choirId,
    });

    await transport.removeStar({ scope, messageId });
    expect(fake.query.delete).toHaveBeenCalledTimes(1);
    expect(fake.query.eq).toHaveBeenCalledWith('message_id', messageId);
  });

  it('uses the stable star cursor, 41-row probe and full inner message relation', async () => {
    const fake = clientDouble();
    const transport = createSupabaseChatStarTransport(fake.client);
    const before = {
      createdAt: '2026-09-20T10:00:00.123456Z',
      id: '77777777-7777-4777-8777-777777777777',
    };

    await transport.loadPageRows({ scope, roomId, before, limit: 41 });

    expect(fake.query.select.mock.calls.at(-1)?.[0]).toContain('message:chat_messages!inner');
    expect(fake.query.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false });
    expect(fake.query.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
    expect(fake.query.limit).toHaveBeenCalledWith(41);
    expect(fake.query.or).toHaveBeenCalledWith(
      `created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})`,
    );
  });
});
