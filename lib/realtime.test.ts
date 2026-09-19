import { describe, expect, it, vi } from 'vitest';
import { authorizeRealtimeBeforeJoin, createPrivateChatRoomTopic } from './realtime';

describe('private chat Realtime contract', () => {
  it('creates only the exact stable UUID room topic', () => {
    const roomId = '11111111-1111-4111-8111-111111111111';
    expect(createPrivateChatRoomTopic(roomId)).toBe(`chat:${roomId}`);
    expect(() => createPrivateChatRoomTopic('global')).toThrow('chat-realtime-room-id-invalid');
    expect(() => createPrivateChatRoomTopic(`${roomId}:extra`)).toThrow('chat-realtime-room-id-invalid');
  });

  it('sets the current token before resolving channel authorization', async () => {
    const order: string[] = [];
    await authorizeRealtimeBeforeJoin({
      getAccessToken: async () => {
        order.push('token');
        return 'header.payload.signature';
      },
      setAuth: async (token) => {
        order.push(`auth:${token}`);
      },
    });
    order.push('join');
    expect(order).toEqual(['token', 'auth:header.payload.signature', 'join']);
  });

  it('refuses a missing token without touching Realtime', async () => {
    const setAuth = vi.fn();
    await expect(authorizeRealtimeBeforeJoin({
      getAccessToken: async () => null,
      setAuth,
    })).rejects.toThrow('chat-realtime-auth-required');
    expect(setAuth).not.toHaveBeenCalled();
  });
});
