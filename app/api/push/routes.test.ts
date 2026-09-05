import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  rpc: vi.fn(),
  createSupabaseUserClient: vi.fn(),
}));

vi.mock('@/lib/server/supabase-auth', () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
  createSupabaseUserClient: mocks.createSupabaseUserClient,
}));

import { POST as subscribe } from '@/app/api/push/subscribe/route';
import { POST as unsubscribe } from '@/app/api/push/unsubscribe/route';

function request(path: string, body: unknown) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer verified-token',
      'Content-Type': 'application/json',
      'User-Agent': 'Genova Test',
    },
    body: JSON.stringify(body),
  });
}

describe('active-choir push subscription routes', () => {
  beforeEach(() => {
    mocks.requireAuthenticatedUser.mockResolvedValue({
      user: { id: 'user-1' },
      accessToken: 'verified-token',
    });
    mocks.rpc.mockResolvedValue({ data: 'subscription-id', error: null });
    mocks.createSupabaseUserClient.mockReturnValue({ rpc: mocks.rpc });
  });

  it('registers the endpoint through the authenticated active-choir RPC', async () => {
    const response = await subscribe(request('/api/push/subscribe', {
      endpoint: 'https://push.example/subscription',
      keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
    }));

    expect(response.status).toBe(200);
    expect(mocks.createSupabaseUserClient).toHaveBeenCalledWith('verified-token');
    expect(mocks.rpc).toHaveBeenCalledWith('upsert_my_active_push_subscription', {
      p_endpoint: 'https://push.example/subscription',
      p_p256dh: 'p256dh-value',
      p_auth: 'auth-value',
      p_user_agent: 'Genova Test',
    });
  });

  it('rejects an incomplete subscription before calling the database', async () => {
    const response = await subscribe(request('/api/push/subscribe', {
      endpoint: 'https://push.example/subscription',
      keys: {},
    }));

    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('removes the caller-owned endpoint without requiring an active choir', async () => {
    const response = await unsubscribe(request('/api/push/unsubscribe', {
      endpoint: 'https://push.example/subscription',
    }));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('delete_my_push_subscription', {
      p_endpoint: 'https://push.example/subscription',
    });
  });

  it('returns 401 when identity verification fails', async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(new Error('Unauthorized'));

    const response = await unsubscribe(request('/api/push/unsubscribe', {
      endpoint: 'https://push.example/subscription',
    }));

    expect(response.status).toBe(401);
    expect(mocks.createSupabaseUserClient).not.toHaveBeenCalled();
  });
});
