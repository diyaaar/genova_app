import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSupabaseServiceClient: vi.fn(),
}));

vi.mock('@/lib/server/supabase-auth', () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

import { collectRoleNames, getActorMemberWithRoles, normalizeRoleName } from '@/lib/server/reviewer-auth';

function serviceClientWith(params: {
  member?: unknown;
  memberError?: { message: string } | null;
  roles?: unknown;
  roleError?: { message: string } | null;
}) {
  return {
    from: vi.fn((table: string) => {
      if (table === 'choir_members') {
        const query = {
          select: vi.fn(),
          eq: vi.fn(),
          maybeSingle: vi.fn().mockResolvedValue({ data: params.member ?? null, error: params.memberError ?? null }),
        };
        query.select.mockReturnValue(query);
        query.eq.mockReturnValue(query);
        return query;
      }
      const query = {
        select: vi.fn(),
        eq: vi.fn().mockResolvedValue({ data: params.roles ?? [], error: params.roleError ?? null }),
      };
      query.select.mockReturnValue(query);
      return query;
    }),
  };
}

describe('reviewer role resolution', () => {
  it('normalizes Turkish role names consistently', () => {
    expect(normalizeRoleName('  ŞEF  ')).toBe('sef');
    expect(normalizeRoleName('Partisyon Şefi')).toBe('partisyon sefi');
  });

  it('collects role names from singular and array join shapes', () => {
    expect(Array.from(collectRoleNames([
      { roles: { name: 'Şef' } },
      { roles: [{ name: 'Partisyon Şefi' }, { name: 'Şef' }] },
      { roles: null },
    ]))).toEqual(['sef', 'partisyon sefi']);
  });

  it('returns member and privileged flags from server-side roles', async () => {
    const serviceClient = serviceClientWith({
      member: { id: 'member-1', voice_group: 'Alto' },
      roles: [{ roles: { name: 'Partisyon Şefi' } }],
    });

    await expect(getActorMemberWithRoles({ serviceClient: serviceClient as never, authUserId: 'auth-1' })).resolves.toMatchObject({
      actorMember: { id: 'member-1', voice_group: 'Alto' },
      isChef: false,
      isSectionLeader: true,
    });
  });

  it('fails closed for a missing member or database errors', async () => {
    await expect(getActorMemberWithRoles({
      serviceClient: serviceClientWith({ member: null }) as never,
      authUserId: 'auth-1',
    })).rejects.toThrow('korist kaydı bulunamadı');

    await expect(getActorMemberWithRoles({
      serviceClient: serviceClientWith({ member: null, memberError: { message: 'database down' } }) as never,
      authUserId: 'auth-1',
    })).rejects.toThrow('database down');

    await expect(getActorMemberWithRoles({
      serviceClient: serviceClientWith({
        member: { id: 'member-1', voice_group: null },
        roleError: { message: 'roles unavailable' },
      }) as never,
      authUserId: 'auth-1',
    })).rejects.toThrow('roles unavailable');
  });
});
