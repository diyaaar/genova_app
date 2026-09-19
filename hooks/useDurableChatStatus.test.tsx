import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '@/lib/chat';
import { useDurableChatStatus } from './useDurableChatStatus';

const MEMBER = '10000000-0000-4000-8000-000000000001';
const OTHER = '20000000-0000-4000-8000-000000000002';
const ROOM = '30000000-0000-4000-8000-000000000003';
const MESSAGE = '40000000-0000-4000-8000-000000000004';

const inbound: ChatMessage = {
  id: MESSAGE,
  room_id: ROOM,
  sender_id: OTHER,
  content: 'Merhaba',
  message_type: 'text',
  reply_to_id: null,
  metadata_json: {},
  is_edited: false,
  is_deleted: false,
  created_at: '2026-09-19T12:00:00.000Z',
  updated_at: '2026-09-19T12:00:00.000Z',
};

describe('useDurableChatStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it('writes delivered while hidden and upgrades to read after visible focus', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    const mounted = renderHook(() => useDurableChatStatus(MEMBER, ROOM, [inbound], writer));
    await waitFor(() => expect(writer).toHaveBeenCalledWith(MESSAGE, 'delivered'));

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    vi.mocked(document.hasFocus).mockReturnValue(true);
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(writer).toHaveBeenCalledWith(MESSAGE, 'read'));
    expect(writer).toHaveBeenCalledTimes(2);
    mounted.unmount();
  });

  it('does not write own or temporary messages and waits while offline', async () => {
    const writer = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const own = { ...inbound, sender_id: MEMBER };
    const temporary = { ...inbound, id: `temp-${MESSAGE}` };
    const mounted = renderHook(() => useDurableChatStatus(MEMBER, ROOM, [own, temporary, inbound], writer));
    await act(async () => Promise.resolve());
    expect(writer).not.toHaveBeenCalled();

    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    act(() => window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(writer).toHaveBeenCalledWith(MESSAGE, 'delivered'));
    expect(writer).toHaveBeenCalledTimes(1);
    mounted.unmount();
  });
});
