import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authorize: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn().mockResolvedValue(undefined),
  getChannels: vi.fn(() => []),
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

function createChannel() {
  const channel: any = {
    topic: 'realtime:chat:11111111-1111-4111-8111-111111111111',
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
    track: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
    presenceState: vi.fn(() => ({})),
  };
  return channel;
}

describe('useChatRealtime private room setup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authorize.mockResolvedValue(undefined);
    mocks.getChannels.mockReturnValue([]);
    mocks.channel.mockImplementation(() => createChannel());
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
});
