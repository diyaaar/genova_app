import type { Session } from '@supabase/supabase-js';
import {
  activateChoir,
  findCurrentChoir,
  findPreferredMembership,
  loadMyChoirs,
  type ChoirContextClient,
  type ChoirMembershipOption,
} from '@shared/choir-context-core';
import { clearTenantCaches } from './tenant-cache';
import type { AuthGateway, AuthState, ChoirPreferenceStore } from './types';

/**
 * Framework-free session and active-choir state machine.
 *
 * All 004 rules live here so they can be tested without a renderer or a device:
 * a session is only usable while the server confirms exactly one active choir, an
 * unresolved multi-membership choice keeps data screens closed, and every identity or
 * choir change clears the previous tenant's private caches before anything is read.
 */

export interface AuthStoreDependencies {
  client: ChoirContextClient;
  auth: AuthGateway;
  preferences: ChoirPreferenceStore;
  clearCaches?: () => Promise<void>;
}

const SIGNED_OUT_STATE: AuthState = {
  phase: 'signed-out',
  session: null,
  user: null,
  choirs: [],
  activeChoir: null,
  errorMessage: null,
  isSwitchingChoir: false,
};

const GENERIC_CONTEXT_ERROR = 'Koro bilgileri yüklenemedi.';

export class AuthStore {
  private state: AuthState = { ...SIGNED_OUT_STATE, phase: 'loading' };
  private readonly listeners = new Set<(state: AuthState) => void>();
  private subscription: { unsubscribe: () => void } | null = null;
  private requestVersion = 0;
  private currentUserId: string | null = null;
  private switchInFlight = false;

  constructor(private readonly deps: AuthStoreDependencies) {}

  getState(): AuthState {
    return this.state;
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(patch: Partial<AuthState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of Array.from(this.listeners)) listener(this.state);
  }

  private clearCaches(): Promise<void> {
    return (this.deps.clearCaches ?? clearTenantCaches)();
  }

  /** Loads any stored session and follows every later sign-in, refresh and sign-out. */
  async start(): Promise<void> {
    const { data } = await this.deps.auth.getSession();
    const { data: listener } = this.deps.auth.onAuthStateChange((_event, session) => {
      void this.applySession(session);
    });
    this.subscription = listener.subscription;
    await this.applySession(data.session);
  }

  stop(): void {
    this.requestVersion += 1;
    this.subscription?.unsubscribe();
    this.subscription = null;
    this.listeners.clear();
  }

  /**
   * A null session — including one produced by a refresh that failed — drops straight to
   * signed-out with the caches and the choir hint cleared.
   */
  private async applySession(session: Session | null): Promise<void> {
    const nextUserId = session?.user?.id ?? null;
    const previousUserId = this.currentUserId;
    this.currentUserId = nextUserId;

    if (!nextUserId) {
      this.requestVersion += 1;
      if (previousUserId) await this.deps.preferences.clear(previousUserId);
      await this.clearCaches();
      this.setState({ ...SIGNED_OUT_STATE });
      return;
    }

    if (previousUserId && previousUserId !== nextUserId) {
      await this.deps.preferences.clear(previousUserId);
      await this.clearCaches();
    }

    this.setState({
      session,
      user: session?.user ?? null,
      phase: 'loading',
      errorMessage: null,
      ...(previousUserId !== nextUserId ? { choirs: [], activeChoir: null } : {}),
    });

    await this.resolveChoirContext(nextUserId);
  }

  /**
   * Resolves the server-confirmed active choir. Recovery from the stored hint or from a
   * lone membership is still a server call; the client never assumes the switch happened.
   */
  private async resolveChoirContext(userId: string, options: { usePreference?: boolean } = {}): Promise<void> {
    const version = ++this.requestVersion;

    try {
      let memberships = await loadMyChoirs(this.deps.client);
      let current = findCurrentChoir(memberships);

      if (!current) {
        const preferred = options.usePreference === false
          ? null
          : findPreferredMembership(memberships, await this.deps.preferences.get(userId));
        const recoverable = preferred ?? (memberships.length === 1 ? memberships[0] ?? null : null);

        if (recoverable) {
          await activateChoir(this.deps.client, recoverable.choir_id);
          memberships = memberships.map((membership) => ({
            ...membership,
            is_current: membership.choir_id === recoverable.choir_id,
          }));
          current = { ...recoverable, is_current: true };
        }
      }

      if (this.requestVersion !== version || this.currentUserId !== userId) return;

      if (memberships.length === 0) {
        this.setState({ phase: 'no-membership', choirs: [], activeChoir: null, errorMessage: null });
        return;
      }

      if (!current) {
        this.setState({ phase: 'selection-required', choirs: memberships, activeChoir: null, errorMessage: null });
        return;
      }

      await this.deps.preferences.set(userId, current.choir_id);
      if (this.requestVersion !== version || this.currentUserId !== userId) return;
      this.setState({ phase: 'ready', choirs: memberships, activeChoir: current, errorMessage: null });
    } catch (error) {
      if (this.requestVersion !== version || this.currentUserId !== userId) return;
      this.setState({
        phase: 'error',
        choirs: [],
        activeChoir: null,
        errorMessage: error instanceof Error ? error.message : GENERIC_CONTEXT_ERROR,
      });
    }
  }

  async refresh(): Promise<void> {
    if (!this.currentUserId) return;
    this.setState({ phase: 'loading', errorMessage: null });
    await this.resolveChoirContext(this.currentUserId);
  }

  async signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await this.deps.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  }

  /**
   * Switches the active choir. The previous tenant's caches are cleared before the switch
   * is requested, so no screen can read old-choir data while the new one is resolving.
   */
  async selectChoir(choirId: string): Promise<void> {
    const userId = this.currentUserId;
    if (!userId || this.switchInFlight) return;
    if (this.state.activeChoir?.choir_id === choirId) return;

    if (!this.state.choirs.some((membership) => membership.choir_id === choirId)) {
      this.setState({ errorMessage: 'Bu hesap için seçilen koro üyeliği bulunamadı.' });
      return;
    }

    this.switchInFlight = true;
    this.setState({ isSwitchingChoir: true, errorMessage: null, activeChoir: null, phase: 'loading' });

    try {
      await this.clearCaches();
      await activateChoir(this.deps.client, choirId);
      if (this.currentUserId !== userId) return;
      await this.deps.preferences.set(userId, choirId);
      await this.resolveChoirContext(userId, { usePreference: false });
    } catch (error) {
      if (this.currentUserId !== userId) return;
      this.setState({
        phase: 'selection-required',
        activeChoir: null,
        errorMessage: error instanceof Error ? error.message : 'Koro değiştirilemedi.',
      });
    } finally {
      this.switchInFlight = false;
      this.setState({ isSwitchingChoir: false });
    }
  }

  /** Local state is cleared even when the network sign-out call fails. */
  async signOut(): Promise<void> {
    const userId = this.currentUserId;
    this.requestVersion += 1;
    this.currentUserId = null;
    if (userId) await this.deps.preferences.clear(userId);
    await this.clearCaches();
    try {
      await this.deps.auth.signOut();
    } finally {
      this.setState({ ...SIGNED_OUT_STATE });
    }
  }
}

export type { ChoirMembershipOption };
