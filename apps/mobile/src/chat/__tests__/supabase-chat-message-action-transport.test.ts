import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseChatMessageActionTransport } from '../supabase-chat-message-action-transport';

describe('Supabase native chat message action transport', () => {
  it('uses only the three accepted 044 authenticated RPC shapes', async () => {
    const rpc = jest.fn(async () => ({ data: '11111111-1111-4111-8111-111111111111', error: null }));
    const transport = createSupabaseChatMessageActionTransport({ rpc } as unknown as SupabaseClient);

    await transport.editMessage('11111111-1111-4111-8111-111111111111', 'Düzenlendi');
    await transport.deleteForEveryone('22222222-2222-4222-8222-222222222222');
    await transport.hideForSelf('33333333-3333-4333-8333-333333333333');

    expect(rpc.mock.calls).toEqual([
      ['edit_chat_message', { p_message_id: '11111111-1111-4111-8111-111111111111', p_content: 'Düzenlendi' }],
      ['delete_chat_message_for_everyone', { p_message_id: '22222222-2222-4222-8222-222222222222' }],
      ['hide_chat_message_for_self', { p_message_id: '33333333-3333-4333-8333-333333333333' }],
    ]);
  });
});
