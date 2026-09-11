import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import type { ChoirContextClient } from '@shared/choir-context-core';
import { AuthStore } from './auth-store';
import { createChoirPreferenceStore } from './choir-preference';
import { getGenovaClient, secureKeyValueStore } from './supabase-client';
import type { AuthGateway, AuthState, ChoirPreferenceStore, NativeWebViewLease } from './types';

/**
 * Thin React binding around `AuthStore`. It owns no rules of its own: every decision
 * about sessions, memberships and cache clearing lives in the store, which is why the
 * required behaviors can be tested without rendering anything.
 */

/** The provider only needs the RPC surface plus the auth surface it forwards. */
type SupabaseClientLike = ChoirContextClient & { auth: AuthGateway & {
  startAutoRefresh?: () => Promise<unknown>;
  stopAutoRefresh?: () => Promise<unknown>;
} };

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  selectChoir: (choirId: string) => Promise<void>;
  refresh: () => Promise<void>;
  getWebViewLease: () => Promise<NativeWebViewLease>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
  /** Test seam: a prepared store replaces the device-backed default. */
  store?: AuthStore;
  client?: SupabaseClientLike;
  preferences?: ChoirPreferenceStore;
}

export function AuthProvider({ children, store, client, preferences }: AuthProviderProps) {
  const storeRef = useRef<AuthStore | null>(null);
  const clientRef = useRef<SupabaseClientLike | null>(null);
  if (!storeRef.current) {
    if (store) {
      storeRef.current = store;
      clientRef.current = client ?? null;
    } else {
      const supabase = client ?? (getGenovaClient() as unknown as SupabaseClientLike);
      clientRef.current = supabase;
      storeRef.current = new AuthStore({
        client: supabase,
        auth: supabase.auth,
        preferences: preferences ?? createChoirPreferenceStore(secureKeyValueStore),
      });
    }
  }
  const authStore = storeRef.current;
  const [state, setState] = useState<AuthState>(() => authStore.getState());

  useEffect(() => {
    const unsubscribe = authStore.subscribe(setState);
    void authStore.start();
    return () => {
      unsubscribe();
      authStore.stop();
    };
  }, [authStore]);

  // Supabase only refreshes tokens while the app is in the foreground.
  useEffect(() => {
    const handleChange = (status: AppStateStatus) => {
      const auth = clientRef.current?.auth;
      if (!auth?.startAutoRefresh || !auth.stopAutoRefresh) return;
      if (status === 'active') void auth.startAutoRefresh();
      else void auth.stopAutoRefresh();
    };
    const subscription = AppState.addEventListener('change', handleChange);
    return () => subscription.remove();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ...state,
    signIn: (email, password) => authStore.signIn(email, password),
    signOut: () => authStore.signOut(),
    selectChoir: (choirId) => authStore.selectChoir(choirId),
    refresh: () => authStore.refresh(),
    getWebViewLease: () => authStore.getWebViewLease(),
  }), [authStore, state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
