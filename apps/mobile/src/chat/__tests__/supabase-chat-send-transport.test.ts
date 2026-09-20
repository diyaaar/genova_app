import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseChatSendTransport } from '../supabase-chat-send-transport';

describe('Supabase native chat send transport', () => {
  it('uses only the accepted preview function and idempotent text RPC shape', async () => {
    const invoke = jest.fn(async () => ({ data: { url: 'https://example.invalid' }, error: null }));
    const rpc = jest.fn(async () => ({ data: { id: 'message' }, error: null }));
    const client = { functions: { invoke }, rpc } as unknown as SupabaseClient;
    const transport = createSupabaseChatSendTransport(client);

    await transport.loadLinkPreview('https://example.invalid');
    await transport.sendText({
      roomId: '11111111-1111-4111-8111-111111111111',
      clientMutationId: '22222222-2222-4222-8222-222222222222',
      content: 'Merhaba',
      replyToId: null,
      metadata: {},
    });

    expect(invoke).toHaveBeenCalledWith('link-preview', { body: { url: 'https://example.invalid' } });
    expect(rpc).toHaveBeenCalledWith('send_chat_text_message', {
      p_room_id: '11111111-1111-4111-8111-111111111111',
      p_client_mutation_id: '22222222-2222-4222-8222-222222222222',
      p_content: 'Merhaba',
      p_reply_to_id: null,
      p_metadata_json: {},
    });
  });
});
