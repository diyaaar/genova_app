import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

import {
  createSupabaseAnonClient,
  createSupabaseServiceClient,
  createSupabaseUserClient,
  getBearerToken,
  requireAuthenticatedUser,
} from '@/lib/server/supabase-auth';

const originalEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  service: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

function request(authorization?: string) {
  return new Request('http://localhost/api/test', {
    headers: authorization ? { Authorization: authorization } : undefined,
  });
}

describe('server Supabase authentication', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.url;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalEnv.anon;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv.service;
  });

  it('extracts only a valid bearer token', () => {
    expect(getBearerToken(request('Bearer access-token'))).toBe('access-token');
    expect(getBearerToken(request('bearer access-token'))).toBe('access-token');
    expect(getBearerToken(request('Basic value'))).toBeNull();
    expect(getBearerToken(request())).toBeNull();
  });

  it('creates anon, service, and caller-RLS clients from required environment values', () => {
    createSupabaseAnonClient();
    createSupabaseServiceClient();
    createSupabaseUserClient('verified-token');

    expect(mocks.createClient).toHaveBeenNthCalledWith(1, 'https://project.supabase.co', 'anon-key');
    expect(mocks.createClient).toHaveBeenNthCalledWith(2, 'https://project.supabase.co', 'service-key');
    expect(mocks.createClient).toHaveBeenNthCalledWith(3, 'https://project.supabase.co', 'anon-key', {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: 'Bearer verified-token' } },
    });
  });

  it('fails closed when a required environment value is absent', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(createSupabaseServiceClient).toThrow('SUPABASE_SERVICE_ROLE_KEY eksik');
  });

  it('requires a verified user for a bearer token', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mocks.createClient.mockReturnValue({ auth: { getUser } });

    await expect(requireAuthenticatedUser(request('Bearer access-token'))).resolves.toEqual({
      user: { id: 'user-1' },
      accessToken: 'access-token',
    });
    expect(getUser).toHaveBeenCalledWith('access-token');
  });

  it('rejects missing, invalid, or errored identities', async () => {
    await expect(requireAuthenticatedUser(request())).rejects.toThrow('Unauthorized');

    mocks.createClient.mockReturnValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) } });
    await expect(requireAuthenticatedUser(request('Bearer token'))).rejects.toThrow('Unauthorized');

    mocks.createClient.mockReturnValue({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } }) } });
    await expect(requireAuthenticatedUser(request('Bearer token'))).rejects.toThrow('Unauthorized');
  });
});
