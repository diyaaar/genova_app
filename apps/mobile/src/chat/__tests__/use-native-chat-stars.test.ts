import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ChatReadMessage, ChatReadScope } from '@shared/chat-read-contract';
import type { NativeChatStarGateway, NativeChatStarredPage } from '../chat-star-gateway';
import { useNativeChatStars } from '../use-native-chat-stars';

const scope: ChatReadScope = { userId: 'user', choirId: 'choir', memberId: 'member' };
const roomId = 'room-a';
const message: ChatReadMessage = {
  id: 'message', roomId, senderId: 'peer', clientMutationId: null, content: 'Prova',
  messageType: 'text', sourceMessageType: 'text', isMessageTypeSupported: true,
  replyToId: null, metadata: {}, isEdited: false, isDeleted: false,
  createdAt: '2026-09-20T09:00:00Z', updatedAt: '2026-09-20T09:00:00Z', sender: null, replyTo: null,
};
const page: NativeChatStarredPage = {
  items: [{ starId: 'star', starredAt: '2026-09-20T10:00:00Z', message }],
  nextCursor: null, hasMore: false,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function gatewayDouble(): NativeChatStarGateway {
  return {
    loadStates: jest.fn(async () => new Set<string>()),
    setStarred: jest.fn(async () => new Set<string>()),
    loadPage: jest.fn(async () => page),
    clear: jest.fn(),
  };
}

describe('native star lifecycle', () => {
  it('removes a panel-only star rather than adding it, and deduplicates immediate presses', async () => {
    const gateway = gatewayDouble();
    const pending = deferred<ReadonlySet<string>>();
    (gateway.setStarred as jest.Mock).mockReturnValue(pending.promise);
    const { result } = await renderHook(() => useNativeChatStars({ scope, roomId, messages: [], gateway }));
    await act(async () => { result.current.openPanel(); });
    await waitFor(() => expect(result.current.panelItems).toHaveLength(1));
    await act(async () => {
      void result.current.toggle(message, true);
      void result.current.toggle(message, true);
    });
    expect(gateway.setStarred).toHaveBeenCalledTimes(1);
    expect(gateway.setStarred).toHaveBeenCalledWith(scope, roomId, message.id, false);
    await act(async () => { pending.resolve(new Set()); });
    expect(result.current.panelItems).toEqual([]);
  });

  it('refreshes unknown state instead of guessing an add after a refused snapshot', async () => {
    const gateway = gatewayDouble();
    (gateway.loadStates as jest.Mock).mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(new Set([message.id]));
    const { result } = await renderHook(() => useNativeChatStars({ scope, roomId, messages: [message], gateway }));
    await waitFor(() => expect(result.current.notice).not.toBeNull());
    await act(async () => { await result.current.toggle(message); });
    expect(gateway.setStarred).not.toHaveBeenCalled();
    expect(result.current.knownIds.has(message.id)).toBe(true);
    await act(async () => { await result.current.toggle(message); });
    expect(gateway.setStarred).toHaveBeenCalledWith(scope, roomId, message.id, false);
  });

  it('requires a new snapshot after a lost write acknowledgement', async () => {
    const gateway = gatewayDouble();
    (gateway.setStarred as jest.Mock).mockRejectedValueOnce(new Error('lost response'));
    const { result } = await renderHook(() => useNativeChatStars({ scope, roomId, messages: [message], gateway }));
    await waitFor(() => expect(result.current.knownIds.has(message.id)).toBe(true));
    await act(async () => { await result.current.toggle(message); });
    expect(result.current.knownIds.has(message.id)).toBe(false);
    (gateway.loadStates as jest.Mock).mockResolvedValue(new Set([message.id]));
    await act(async () => { await result.current.toggle(message); });
    expect(gateway.setStarred).toHaveBeenCalledTimes(1);
    expect(result.current.starredIds.has(message.id)).toBe(true);
  });

  it.each(['room', 'tenant'])('discards a late write through an A-B-A %s transition', async (kind) => {
    const gateway = gatewayDouble();
    const pending = deferred<ReadonlySet<string>>();
    (gateway.setStarred as jest.Mock).mockReturnValue(pending.promise);
    const { result, rerender, unmount } = await renderHook(
      (props: { scope: ChatReadScope; roomId: string }) => useNativeChatStars({ ...props, messages: [message], gateway }),
      { initialProps: { scope, roomId } },
    );
    await waitFor(() => expect(result.current.knownIds.has(message.id)).toBe(true));
    await act(async () => { void result.current.toggle(message); });
    await rerender(kind === 'room' ? { scope, roomId: 'room-b' } : { scope: { ...scope, memberId: 'other' }, roomId });
    await rerender({ scope, roomId });
    await act(async () => { pending.resolve(new Set([message.id])); });
    expect(result.current.starredIds.has(message.id)).toBe(false);
    expect(result.current.notice).toBeNull();
    await unmount();
    expect(gateway.clear).toHaveBeenCalledTimes(3);
  });

  it('does not query old-room messages and discards late panel results on return', async () => {
    const gateway = gatewayDouble();
    const pending = deferred<NativeChatStarredPage>();
    (gateway.loadPage as jest.Mock).mockReturnValue(pending.promise);
    const { result, rerender } = await renderHook(
      ({ roomId: selected }: { roomId: string }) => useNativeChatStars({ scope, roomId: selected, messages: [message], gateway }),
      { initialProps: { roomId } },
    );
    await act(async () => { result.current.openPanel(); });
    await rerender({ roomId: 'room-b' });
    expect((gateway.loadStates as jest.Mock).mock.calls.every((call) => call[1] === roomId)).toBe(true);
    await rerender({ roomId });
    await act(async () => { pending.resolve(page); });
    expect(result.current.panelItems).toBeNull();
    expect(result.current.panelOpen).toBe(false);
  });

  it('merges older panel pages by message identity and keeps descending star order', async () => {
    const gateway = gatewayDouble();
    const cursor = { id: 'star', createdAt: page.items[0]!.starredAt };
    (gateway.loadPage as jest.Mock)
      .mockResolvedValueOnce({ ...page, nextCursor: cursor, hasMore: true })
      .mockResolvedValueOnce({
        items: [
          { ...page.items[0], starId: 'replacement', starredAt: '2026-09-20T09:30:00Z' },
          { ...page.items[0], starId: 'older', starredAt: '2026-09-20T09:00:00Z', message: { ...message, id: 'older-message' } },
        ],
        nextCursor: null, hasMore: false,
      });
    const { result } = await renderHook(() => useNativeChatStars({ scope, roomId, messages: [], gateway }));
    await act(async () => { result.current.openPanel(); });
    await act(async () => { result.current.loadOlder(); });
    expect(gateway.loadPage).toHaveBeenLastCalledWith(scope, roomId, { before: cursor });
    expect(result.current.panelItems?.map((item) => item.starId)).toEqual(['replacement', 'older']);
    expect(result.current.panelHasMore).toBe(false);
  });
});
