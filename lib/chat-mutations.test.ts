import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc },
}));

import { deleteMessage, deleteMessageForMe, editMessage, markChatMessageStatus, sendMessage } from '@/lib/chat';

describe('chat message mutation adapters', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_CHAT_R2_MEDIA_ENABLED', 'false');
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: null });
  });
  afterEach(() => vi.unstubAllEnvs());

  it('delegates edit identity and content to the server RPC', async () => {
    await editMessage('00000000-0000-4000-8000-000000000001', 'Yeni içerik');
    expect(rpc).toHaveBeenCalledWith('edit_chat_message', {
      p_message_id: '00000000-0000-4000-8000-000000000001',
      p_content: 'Yeni içerik',
    });
  });

  it('delegates delete-for-everyone without client timestamps or fields', async () => {
    await deleteMessage('00000000-0000-4000-8000-000000000002');
    expect(rpc).toHaveBeenCalledWith('delete_chat_message_for_everyone', {
      p_message_id: '00000000-0000-4000-8000-000000000002',
    });
  });

  it('derives delete-for-me member identity on the server', async () => {
    await deleteMessageForMe('00000000-0000-4000-8000-000000000003');
    expect(rpc).toHaveBeenCalledWith('hide_chat_message_for_self', {
      p_message_id: '00000000-0000-4000-8000-000000000003',
    });
  });

  it('surfaces RPC refusal', async () => {
    const refusal = new Error('refused');
    rpc.mockResolvedValueOnce({ data: null, error: refusal });
    await expect(editMessage('bad', 'text')).rejects.toBe(refusal);
  });

  it('marks durable status without client identity or timestamps', async () => {
    await markChatMessageStatus('00000000-0000-4000-8000-000000000004', 'read');
    expect(rpc).toHaveBeenCalledWith('mark_chat_message_status', {
      p_message_id: '00000000-0000-4000-8000-000000000004',
      p_status: 'read',
    });
  });

  it('sends text through the idempotent RPC and returns its acknowledgement', async () => {
    rpc.mockResolvedValueOnce({
      data: {
        id: '00000000-0000-4000-8000-000000000099',
        room_id: '00000000-0000-4000-8000-000000000010',
        sender_id: '00000000-0000-4000-8000-000000000011',
        content: 'Merhaba',
        message_type: 'text',
        reply_to_id: null,
        metadata_json: {},
        is_edited: false,
        is_deleted: false,
        created_at: '2026-09-19T12:00:00.000Z',
        updated_at: '2026-09-19T12:00:00.000Z',
      },
      error: null,
    });

    const message = await sendMessage(
      '00000000-0000-4000-8000-000000000010',
      '00000000-0000-4000-8000-000000000011',
      'Merhaba',
      { clientMutationId: '00000000-0000-4000-8000-000000000012' },
    );

    expect(rpc).toHaveBeenCalledWith('send_chat_text_message', {
      p_room_id: '00000000-0000-4000-8000-000000000010',
      p_client_mutation_id: '00000000-0000-4000-8000-000000000012',
      p_content: 'Merhaba',
      p_reply_to_id: null,
      p_metadata_json: {},
    });
    expect(message).toMatchObject({
      id: '00000000-0000-4000-8000-000000000099',
      client_mutation_id: '00000000-0000-4000-8000-000000000012',
    });
  });

  it('refuses an unkeyed text send before network access', async () => {
    await expect(sendMessage('room', 'sender', 'message')).rejects.toThrow(
      'Text messages require a client mutation id.',
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});
