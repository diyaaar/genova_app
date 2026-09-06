/**
 * Platform-free part of the 005 active-choir contract.
 *
 * Both clients (Next.js web and the React Native product app) import this module so
 * the membership list, the server-side selection call and the fail-closed parsing
 * rules stay identical. It must never reference `window`, the DOM, Next.js or any
 * React Native API; each client supplies its own preference storage on top.
 *
 * Authorization stays in the database: the RPCs below re-validate `auth.uid()` and
 * the JWT session, and the stored preference is only a recall hint.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREFERENCE_KEY_PREFIX = 'genova:active-choir:';

/**
 * The only client capability this contract needs. Declaring it structurally keeps the
 * shared module independent of any single `@supabase/supabase-js` build, so the web and
 * native workspaces can resolve their own copy of the SDK without type conflicts.
 */
export interface ChoirContextClient {
  rpc(
    fn: string,
    args?: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
}

export interface ChoirMembershipOption {
  choir_id: string;
  member_id: string;
  choir_name: string;
  choir_slug: string | null;
  member_is_active: boolean;
  is_current: boolean;
}

/** True only for a syntactically valid choir identifier; never an authorization result. */
export function isChoirId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

/** Per-user storage key for the non-authoritative active-choir hint. */
export function choirPreferenceKey(userId: string): string {
  return `${PREFERENCE_KEY_PREFIX}${userId}`;
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
export async function loadMyChoirs(client: ChoirContextClient): Promise<ChoirMembershipOption[]> {
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
export async function activateChoir(client: ChoirContextClient, choirId: string): Promise<void> {
  if (!UUID_PATTERN.test(choirId)) throw new Error('Geçersiz koro kimliği.');
  const { data, error } = await client.rpc('set_active_choir', { p_choir_id: choirId });
  if (error) throw new Error(error.message);
  if (data !== choirId) throw new Error('Aktif koro seçimi doğrulanamadı.');
}

export function findCurrentChoir(memberships: ChoirMembershipOption[]) {
  const current = memberships.filter((membership) => membership.is_current);
  return current.length === 1 ? current[0] : null;
}

export function findPreferredMembership(memberships: ChoirMembershipOption[], preferredChoirId: string | null) {
  if (!preferredChoirId) return null;
  return memberships.find((membership) => membership.choir_id === preferredChoirId) ?? null;
}
