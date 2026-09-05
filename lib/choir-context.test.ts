import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  activateChoir,
  clearPreferredChoirId,
  findCurrentChoir,
  findPreferredMembership,
  getPreferredChoirId,
  loadMyChoirs,
  setPreferredChoirId,
  type ChoirMembershipOption,
} from '@/lib/choir-context';

const choirA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const choirB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const memberA = '11111111-1111-4111-8111-111111111111';

function membership(overrides: Partial<ChoirMembershipOption> = {}): ChoirMembershipOption {
  return {
    choir_id: choirA,
    member_id: memberA,
    choir_name: 'Genova A',
    choir_slug: 'genova-a',
    member_is_active: true,
    is_current: false,
    ...overrides,
  };
}

describe('active choir client contract', () => {
  beforeEach(() => window.localStorage.clear());

  it('accepts the narrow membership-list RPC shape', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [membership()], error: null });
    await expect(loadMyChoirs({ rpc } as unknown as SupabaseClient)).resolves.toEqual([membership()]);
    expect(rpc).toHaveBeenCalledWith('list_my_choirs');
  });

  it('fails closed when the RPC response is malformed', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: [{ choir_id: choirA }], error: null });
    await expect(loadMyChoirs({ rpc } as unknown as SupabaseClient)).rejects.toThrow('sözleşmeyle');
  });

  it('accepts only the database-confirmed selection', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: choirB, error: null });
    await expect(activateChoir({ rpc } as unknown as SupabaseClient, choirB)).resolves.toBeUndefined();
    expect(rpc).toHaveBeenCalledWith('set_active_choir', { p_choir_id: choirB });
  });

  it('rejects a mismatched or invalid selection response', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: choirA, error: null });
    await expect(activateChoir({ rpc } as unknown as SupabaseClient, choirB)).rejects.toThrow('doğrulanamadı');
    await expect(activateChoir({ rpc } as unknown as SupabaseClient, 'not-a-uuid')).rejects.toThrow('Geçersiz');
  });

  it('stores only a validated per-user preference and can remove it', () => {
    setPreferredChoirId('user-1', choirA);
    expect(getPreferredChoirId('user-1')).toBe(choirA);
    setPreferredChoirId('user-2', 'invalid');
    expect(getPreferredChoirId('user-2')).toBeNull();
    clearPreferredChoirId('user-1');
    expect(getPreferredChoirId('user-1')).toBeNull();
  });

  it('requires exactly one server-current choir and limits preferences to owned memberships', () => {
    const memberships = [membership(), membership({ choir_id: choirB, is_current: true })];
    expect(findCurrentChoir(memberships)?.choir_id).toBe(choirB);
    expect(findPreferredMembership(memberships, choirA)?.choir_id).toBe(choirA);
    expect(findPreferredMembership(memberships, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc')).toBeNull();
    expect(findCurrentChoir(memberships.map((item) => ({ ...item, is_current: true })))).toBeNull();
  });
});
