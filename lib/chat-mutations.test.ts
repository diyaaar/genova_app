import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('@/lib/supabase', () => ({
  supabase: { rpc },
}));

import { deleteMessage, deleteMessageForMe, editMessage } from '@/lib/chat';

describe('chat message mutation adapters', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: null });
  });

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
});
