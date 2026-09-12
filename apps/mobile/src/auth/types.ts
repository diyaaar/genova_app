import type { Session, User } from '@supabase/supabase-js';
import type { ChoirMembershipOption } from '@shared/choir-context-core';

/** Minimal async key/value surface. Implemented by SecureStore on device and by doubles in tests. */
export interface SecureKeyValueStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

/** Storage shape supabase-js expects for session persistence. */
export interface SessionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** The only auth operations this app performs. Keeps the store testable without a live client. */
export interface AuthGateway {
  getSession(): Promise<{ data: { session: Session | null } }>;
  refreshSession(): Promise<{
    data: { session: Session | null };
    error: { message: string } | null;
  }>;
  onAuthStateChange(
    callback: (event: string, session: Session | null) => void,
  ): { data: { subscription: { unsubscribe: () => void } } };
  signInWithPassword(credentials: { email: string; password: string }): Promise<{ error: { message: string } | null }>;
  updateUser(attributes: { password: string }): Promise<{ error: { message: string } | null }>;
  signOut(): Promise<{ error: { message: string } | null }>;
}

export type PasswordChangeResult =
  | { ok: true }
  | { ok: false; message: string };

/** Short-lived context that may cross to the challenged embedded web page. */
export interface NativeWebViewLease {
  accessToken: string;
  expiresAt: number;
  userId: string;
  choirId: string;
  memberId: string;
}

export interface ChoirPreferenceStore {
  get(userId: string): Promise<string | null>;
  set(userId: string, choirId: string): Promise<void>;
  clear(userId: string): Promise<void>;
}

/**
 * Phases are exclusive. Only `ready` may render tenant data; every other phase must
 * keep data screens closed, which is what makes an unresolved selection fail closed.
 */
export type AuthPhase =
  | 'loading'
  | 'signed-out'
  | 'no-membership'
  | 'selection-required'
  | 'ready'
  | 'error';

export interface AuthState {
  phase: AuthPhase;
  session: Session | null;
  user: User | null;
  choirs: ChoirMembershipOption[];
  activeChoir: ChoirMembershipOption | null;
  errorMessage: string | null;
  isSwitchingChoir: boolean;
}
