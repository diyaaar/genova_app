import type { Session, User } from '@supabase/supabase-js';
import type { ChoirContextClient, ChoirMembershipOption } from '@shared/choir-context-core';
import type { AuthGateway, ChoirPreferenceStore, SecureKeyValueStore } from '../auth/types';

/**
 * Isolated doubles. No live Supabase project, no network and no device keychain is
 * touched by any test in this workspace.
 */

export const CHOIR_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const CHOIR_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const CHOIR_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
export const USER_ID = '11111111-1111-4111-8111-111111111111';
export const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';

export function membership(overrides: Partial<ChoirMembershipOption> = {}): ChoirMembershipOption {
  return {
    choir_id: CHOIR_A,
    member_id: '33333333-3333-4333-8333-333333333333',
    choir_name: 'Genova A',
    choir_slug: 'genova-a',
    member_is_active: true,
    is_current: false,
    ...overrides,
  };
}

export function sessionFor(userId: string = USER_ID): Session {
  return { access_token: 'test-token', user: { id: userId } as User } as Session;
}

export interface ClientDouble {
  client: ChoirContextClient;
  rpc: jest.Mock;
  calls: string[];
  setActiveChoirId: (choirId: string | null) => void;
}

/**
 * Stateful stand-in for the 005 database contract: `list_my_choirs` reports the choir the
 * server currently considers active, and `set_active_choir` echoes the id it accepted.
 */
export function createClientDouble(options: {
  memberships: ChoirMembershipOption[];
  activeChoirId?: string | null;
  listResponse?: () => { data: unknown; error: { message: string } | null };
  activateResponse?: (choirId: string) => { data: unknown; error: { message: string } | null };
  calls?: string[];
}): ClientDouble {
  const calls = options.calls ?? [];
  let activeChoirId = options.activeChoirId ?? null;

  const rpc = jest.fn(async (name: string, args?: { p_choir_id?: string }) => {
    calls.push(`rpc:${name}`);
    if (name === 'list_my_choirs') {
      if (options.listResponse) return options.listResponse();
      return {
        data: options.memberships.map((entry) => ({ ...entry, is_current: entry.choir_id === activeChoirId })),
        error: null,
      };
    }
    if (name === 'set_active_choir') {
      const requested = args?.p_choir_id as string;
      if (options.activateResponse) return options.activateResponse(requested);
      const owned = options.memberships.some((entry) => entry.choir_id === requested);
      if (!owned) return { data: null, error: { message: 'Koro üyeliği doğrulanamadı.' } };
      activeChoirId = requested;
      return { data: requested, error: null };
    }
    throw new Error(`unexpected rpc ${name}`);
  });

  return {
    client: { rpc } as unknown as ChoirContextClient,
    rpc,
    calls,
    setActiveChoirId: (choirId) => {
      activeChoirId = choirId;
    },
  };
}

export interface GatewayDouble {
  gateway: AuthGateway;
  emit: (session: Session | null) => void;
  unsubscribe: jest.Mock;
  signInWithPassword: jest.Mock;
  signOut: jest.Mock;
}

export function createGatewayDouble(options: {
  initialSession?: Session | null;
  signInError?: { message: string } | null;
  signOutRejects?: boolean;
} = {}): GatewayDouble {
  let callback: ((event: string, session: Session | null) => void) | null = null;
  const unsubscribe = jest.fn();
  const signInWithPassword = jest.fn(async () => ({ error: options.signInError ?? null }));
  const signOut = jest.fn(async () => {
    if (options.signOutRejects) throw new Error('network down');
    return { error: null };
  });

  return {
    gateway: {
      getSession: async () => ({ data: { session: options.initialSession ?? null } }),
      onAuthStateChange: (cb) => {
        callback = cb;
        return { data: { subscription: { unsubscribe } } };
      },
      signInWithPassword,
      signOut,
    } as AuthGateway,
    emit: (session) => callback?.(session ? 'TOKEN_REFRESHED' : 'SIGNED_OUT', session),
    unsubscribe,
    signInWithPassword,
    signOut,
  };
}

export function createPreferenceDouble(initial: Record<string, string> = {}): ChoirPreferenceStore & {
  values: Record<string, string>;
} {
  const values: Record<string, string> = { ...initial };
  return {
    values,
    async get(userId) {
      return values[userId] ?? null;
    },
    async set(userId, choirId) {
      values[userId] = choirId;
    },
    async clear(userId) {
      delete values[userId];
    },
  };
}

export function createMemoryKeyValueStore(options: { throwOnAccess?: boolean } = {}): SecureKeyValueStore & {
  entries: Map<string, string>;
} {
  const entries = new Map<string, string>();
  return {
    entries,
    async getItemAsync(key) {
      if (options.throwOnAccess) throw new Error('keychain unavailable');
      return entries.get(key) ?? null;
    },
    async setItemAsync(key, value) {
      if (options.throwOnAccess) throw new Error('keychain unavailable');
      entries.set(key, value);
    },
    async deleteItemAsync(key) {
      if (options.throwOnAccess) throw new Error('keychain unavailable');
      entries.delete(key);
    },
  };
}
