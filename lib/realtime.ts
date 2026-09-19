export function createRealtimeTopic(baseTopic: string) {
  const cryptoApi = globalThis.crypto;
  const suffix =
    cryptoApi && typeof cryptoApi.randomUUID === 'function'
      ? cryptoApi.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${baseTopic}:${suffix}`;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createPrivateChatRoomTopic(roomId: string): string {
  if (!UUID_PATTERN.test(roomId)) throw new Error('chat-realtime-room-id-invalid');
  return `chat:${roomId}`;
}

export interface RealtimeAuthPort {
  getAccessToken(): Promise<string | null>;
  setAuth(accessToken: string): Promise<unknown> | unknown;
}

/** A private channel must never be created before the current guarded JWT reaches Realtime. */
export async function authorizeRealtimeBeforeJoin(port: RealtimeAuthPort): Promise<void> {
  const accessToken = await port.getAccessToken();
  if (!accessToken || accessToken.trim().length === 0) {
    throw new Error('chat-realtime-auth-required');
  }
  await port.setAuth(accessToken);
}
