import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn().mockResolvedValue(undefined),
  getChannels: vi.fn(() => []),
  channels: [] as any[],
}));

vi.mock('@/lib/supabase', () => ({
  authorizeCurrentRealtime: mocks.authorize,
  supabase: {
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
    getChannels: mocks.getChannels,
  },
}));

import { useChatRealtime } from './useChatRealtime';
import { useChatStore } from '@/store/useChatStore';

function createChannel() {
  const channel: any = {
    topic: 'realtime:chat:11111111-1111-4111-8111-111111111111',
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
    track: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
    presenceState: vi.fn(() => ({})),
  };
  mocks.channels.push(channel);
  return channel;
}

describe('useChatRealtime private room setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue(undefined);
    mocks.getChannels.mockReturnValue([]);
    mocks.channel.mockImplementation(() => createChannel());
    mocks.channels.length = 0;
    useChatStore.getState().reset();
  });

  it('authorizes before creating the stable private room channel', async () => {
    const order: string[] = [];
    mocks.authorize.mockImplementation(async () => { order.push('auth'); });
    mocks.channel.mockImplementation((topic, options) => {
      order.push('channel');
      return createChannel();
    });

    const roomId = '11111111-1111-4111-8111-111111111111';
    const memberId = '22222222-2222-4222-8222-222222222222';
    const mounted = renderHook(() => useChatRealtime(memberId, roomId));
    await waitFor(() => expect(mocks.channel).toHaveBeenCalledOnce());

    expect(order.slice(0, 2)).toEqual(['auth', 'channel']);
    expect(mocks.channel).toHaveBeenCalledWith(`chat:${roomId}`, {
      config: { private: true, presence: { key: memberId } },
    });
    mounted.unmount();
  });

  it('creates no channel when current Realtime authorization fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mocks.authorize.mockRejectedValue(new Error('chat-realtime-auth-required'));
    const mounted = renderHook(() => useChatRealtime(
      '22222222-2222-4222-8222-222222222222',
      '11111111-1111-4111-8111-111111111111',
    ));

    await waitFor(() => expect(consoleError).toHaveBeenCalledOnce());
    expect(mocks.channel).not.toHaveBeenCalled();
    mounted.unmount();
    consoleError.mockRestore();
  });

  it('creates no channel when the effect is cancelled during authorization', async () => {
    let release: (() => void) | undefined;
    mocks.authorize.mockImplementation(() => new Promise<void>((resolve) => { release = resolve; }));
    const mounted = renderHook(() => useChatRealtime(
      '22222222-2222-4222-8222-222222222222',
      '11111111-1111-4111-8111-111111111111',
    ));
    await waitFor(() => expect(release).toBeTypeOf('function'));
    mounted.unmount();
    await act(async () => { release?.(); });
    expect(mocks.channel).not.toHaveBeenCalled();
  });

  it('uses durable status changes for own bubbles and has no Broadcast read receipt', async () => {
    const roomId = '11111111-1111-4111-8111-111111111111';
    const memberId = '22222222-2222-4222-8222-222222222222';
    const messageId = '33333333-3333-4333-8333-333333333333';
    useChatStore.setState({
      messagesByRoom: {
        [roomId]: [{
          id: messageId,
          room_id: roomId,
          sender_id: memberId,
          content: 'own',
          message_type: 'text',
          reply_to_id: null,
          metadata_json: {},
          is_edited: false,
          is_deleted: false,
          created_at: '2026-09-19T12:00:00.000Z',
          updated_at: '2026-09-19T12:00:00.000Z',
        }],
      },
    });
    const mounted = renderHook(() => useChatRealtime(memberId, roomId));
    await waitFor(() => expect(mocks.channel).toHaveBeenCalledOnce());
    const channel = mocks.channels[0];
    const statusCall = channel.on.mock.calls.find((call: any[]) => (
      call[0] === 'postgres_changes'
      && call[1]?.table === 'chat_message_status'
      && call[1]?.event === 'INSERT'
    ));
    expect(statusCall).toBeDefined();
    expect(channel.on.mock.calls.some((call: any[]) => (
      call[0] === 'broadcast' && call[1]?.event === 'read_receipt'
    ))).toBe(false);

    act(() => statusCall?.[2]({ new: { message_id: messageId, read_at: '2026-09-19T12:01:00.000Z' } }));
    expect(useChatStore.getState().messagesByRoom[roomId][0].metadata_json).toMatchObject({ _status: 'read' });
    mounted.unmount();
  });
});
