import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREFERENCE_KEY_PREFIX = 'genova:active-choir:';

export interface ChoirMembershipOption {
  choir_id: string;
  member_id: string;
  choir_name: string;
  choir_slug: string | null;
  member_is_active: boolean;
  is_current: boolean;
}

function parseMembershipOption(value: unknown): ChoirMembershipOption | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (
    typeof row.choir_id !== 'string' ||
    !UUID_PATTERN.test(row.choir_id) ||
    typeof row.member_id !== 'string' ||
    !UUID_PATTERN.test(row.member_id) ||
    typeof row.choir_name !== 'string' ||
    (row.choir_slug !== null && typeof row.choir_slug !== 'string') ||
    typeof row.member_is_active !== 'boolean' ||
    typeof row.is_current !== 'boolean'
  ) {
    return null;
  }

  return {
    choir_id: row.choir_id,
    member_id: row.member_id,
    choir_name: row.choir_name,
    choir_slug: row.choir_slug,
    member_is_active: row.member_is_active,
    is_current: row.is_current,
  };
}

/** Lists only memberships returned by the authenticated, narrow database RPC. */
export async function loadMyChoirs(client: SupabaseClient): Promise<ChoirMembershipOption[]> {
  const { data, error } = await client.rpc('list_my_choirs');
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error('Koro üyelik listesi geçersiz.');

  const memberships = data.map(parseMembershipOption);
  if (memberships.some((membership) => membership === null)) {
    throw new Error('Koro üyelik listesi beklenen sözleşmeyle eşleşmiyor.');
  }
  return memberships as ChoirMembershipOption[];
}

/**
 * Requests a session-scoped switch. The database revalidates membership; the
 * client-side preference never grants access by itself.
 */
export async function activateChoir(client: SupabaseClient, choirId: string): Promise<void> {
  if (!UUID_PATTERN.test(choirId)) throw new Error('Geçersiz koro kimliği.');
  const { data, error } = await client.rpc('set_active_choir', { p_choir_id: choirId });
  if (error) throw new Error(error.message);
  if (data !== choirId) throw new Error('Aktif koro seçimi doğrulanamadı.');
}

export function getPreferredChoirId(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(`${PREFERENCE_KEY_PREFIX}${userId}`);
    return value && UUID_PATTERN.test(value) ? value : null;
  } catch {
    return null;
  }
}

export function setPreferredChoirId(userId: string, choirId: string) {
  if (typeof window === 'undefined' || !UUID_PATTERN.test(choirId)) return;
  try {
    window.localStorage.setItem(`${PREFERENCE_KEY_PREFIX}${userId}`, choirId);
  } catch {
    // Preference persistence is optional; the database remains authoritative.
  }
}

export function clearPreferredChoirId(userId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(`${PREFERENCE_KEY_PREFIX}${userId}`);
  } catch {
    // Sign-out and tenant cache cleanup must continue when Storage is blocked.
  }
}

export function findCurrentChoir(memberships: ChoirMembershipOption[]) {
  const current = memberships.filter((membership) => membership.is_current);
  return current.length === 1 ? current[0] : null;
}

export function findPreferredMembership(memberships: ChoirMembershipOption[], preferredChoirId: string | null) {
  if (!preferredChoirId) return null;
  return memberships.find((membership) => membership.choir_id === preferredChoirId) ?? null;
}
