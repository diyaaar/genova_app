import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
  getActorMemberWithRoles: vi.fn(),
}));

vi.mock('@/lib/server/supabase-auth', () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

vi.mock('@/lib/server/reviewer-auth', () => ({
  getActorMemberWithRoles: mocks.getActorMemberWithRoles,
}));

vi.mock('@/lib/server/tenant-client', () => ({
  createTenantServiceClient: mocks.createSupabaseServiceClient,
}));

import { POST } from '@/app/api/rehearsals/attendance/finalize-past/route';

function makeServiceClient() {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    lt: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.lt.mockResolvedValue({ data: [], error: null });
  return { from: vi.fn().mockReturnValue(query) };
}

describe('POST /api/rehearsals/attendance/finalize-past', () => {
  beforeEach(() => {
    mocks.requireAuthenticatedUser.mockResolvedValue({ user: { id: 'auth-user-1' } });
    mocks.createSupabaseServiceClient.mockReturnValue(makeServiceClient());
    mocks.getActorMemberWithRoles.mockResolvedValue({ isChef: false, isSectionLeader: false });
  });

  it('requires a valid session', async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(new Error('Unauthorized'));

    const response = await POST(new Request('http://localhost/api/rehearsals/attendance/finalize-past', { method: 'POST' }));

    expect(response.status).toBe(401);
    expect(mocks.createSupabaseServiceClient).not.toHaveBeenCalled();
  });

  it('forbids an ordinary chorist from finalizing everyone’s attendance', async () => {
    const response = await POST(new Request('http://localhost/api/rehearsals/attendance/finalize-past', { method: 'POST' }));

    expect(response.status).toBe(403);
    expect(await response.text()).toMatch(/Şef|Partisyon Şefi/);
  });

  it('allows a chef or section leader to run the no-op finalization safely', async () => {
    mocks.getActorMemberWithRoles.mockResolvedValue({ isChef: true, isSectionLeader: true });

    const response = await POST(new Request('http://localhost/api/rehearsals/attendance/finalize-past', { method: 'POST' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, inserted: 0, updated: 0 });
  });

  it('returns 403 when the authenticated account has no choir member record', async () => {
    mocks.getActorMemberWithRoles.mockRejectedValue(new Error('Kullanıcı için korist kaydı bulunamadı.'));

    const response = await POST(new Request('http://localhost/api/rehearsals/attendance/finalize-past', { method: 'POST' }));

    expect(response.status).toBe(403);
  });
});
