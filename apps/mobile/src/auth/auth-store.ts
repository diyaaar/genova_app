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
import type {
  AuthGateway,
  AuthState,
  ChoirPreferenceStore,
  NativeWebViewLease,
  PasswordChangeResult,
} from './types';

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
  private bridgeLeaseInFlight: Promise<NativeWebViewLease> | null = null;
  private passwordChangeInFlight = false;

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
    const { data: listener } = this.deps.auth.onAuthStateChange((event, session) => {
      void this.applySession(session, {
        preserveReady: event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED',
      });
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
   * Returns the only credential shape allowed to cross the permanent-WebView bridge.
   * The native Supabase client remains the refresh-token owner and concurrent renewals
   * share one refresh operation.
   */
  getWebViewLease(options: { nowSeconds?: number; safetyWindowSeconds?: number } = {}): Promise<NativeWebViewLease> {
    if (this.bridgeLeaseInFlight) return this.bridgeLeaseInFlight;
    const task = this.resolveWebViewLease(options).finally(() => {
      if (this.bridgeLeaseInFlight === task) this.bridgeLeaseInFlight = null;
    });
    this.bridgeLeaseInFlight = task;
    return task;
  }

  private async resolveWebViewLease({
    nowSeconds = Math.floor(Date.now() / 1_000),
    safetyWindowSeconds = 60,
  }: { nowSeconds?: number; safetyWindowSeconds?: number }): Promise<NativeWebViewLease> {
    const state = this.state;
    const activeChoir = state.activeChoir;
    const userId = state.user?.id ?? null;
    if (state.phase !== 'ready' || !userId || userId !== this.currentUserId || !activeChoir
      || !activeChoir.is_current || !activeChoir.member_is_active) {
      throw new Error('Web görünümü için etkin koro oturumu hazır değil.');
    }

    let session = state.session;
    const expiry = session?.expires_at;
    if (!session?.access_token || !Number.isSafeInteger(expiry)
      || (expiry as number) <= nowSeconds + safetyWindowSeconds) {
      const refreshed = await this.deps.auth.refreshSession();
      if (refreshed.error || !refreshed.data.session) {
        throw new Error('Web görünümü oturumu yenilenemedi.');
      }
      session = refreshed.data.session;
    }

    if (this.currentUserId !== userId || this.state.activeChoir?.choir_id !== activeChoir.choir_id
      || this.state.activeChoir?.member_id !== activeChoir.member_id) {
      throw new Error('Web görünümü hazırlanırken koro oturumu değişti.');
    }
    if (session.user.id !== userId || !session.access_token || !Number.isSafeInteger(session.expires_at)
      || (session.expires_at as number) <= nowSeconds + safetyWindowSeconds) {
      throw new Error('Web görünümü için geçerli oturum bulunamadı.');
    }

    return Object.freeze({
      accessToken: session.access_token,
      expiresAt: session.expires_at as number,
      userId,
      choirId: activeChoir.choir_id,
      memberId: activeChoir.member_id,
    });
  }

  /**
   * A null session — including one produced by a refresh that failed — drops straight to
   * signed-out with the caches and the choir hint cleared.
   */
  private async applySession(session: Session | null, options: { preserveReady?: boolean } = {}): Promise<void> {
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

    if (options.preserveReady && previousUserId === nextUserId && this.state.phase === 'ready'
      && this.state.activeChoir?.is_current && this.state.activeChoir.member_is_active) {
      this.setState({ session, user: session!.user, errorMessage: null });
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

  /** Reauthenticates and changes the current password without moving any field through the WebView. */
  async changePassword(oldPassword: string, newPassword: string, confirmation: string): Promise<PasswordChangeResult> {
    if (!oldPassword || !newPassword || !confirmation) {
      return { ok: false, message: 'Lütfen tüm şifre alanlarını doldurun.' };
    }
    if (newPassword.length < 8) {
      return { ok: false, message: 'Yeni şifre en az 8 karakter olmalıdır.' };
    }
    if (newPassword !== confirmation) {
      return { ok: false, message: 'Yeni şifre ve tekrar şifresi eşleşmiyor.' };
    }
    if (oldPassword === newPassword) {
      return { ok: false, message: 'Yeni şifre eski şifre ile aynı olamaz.' };
    }
    if (this.passwordChangeInFlight) {
      return { ok: false, message: 'Şifre değişikliği zaten sürüyor.' };
    }

    const state = this.state;
    const userId = state.user?.id ?? null;
    const email = state.user?.email ?? null;
    const choirId = state.activeChoir?.choir_id ?? null;
    const memberId = state.activeChoir?.member_id ?? null;
    if (state.phase !== 'ready' || !userId || !email || !choirId || !memberId) {
      return { ok: false, message: 'Şifre değişikliği için oturum hazır değil.' };
    }

    this.passwordChangeInFlight = true;
    try {
      const { error: reauthError } = await this.deps.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      if (reauthError) return { ok: false, message: 'Mevcut şifre doğru değil.' };

      if (this.currentUserId !== userId || this.state.phase !== 'ready'
        || this.state.activeChoir?.choir_id !== choirId
        || this.state.activeChoir?.member_id !== memberId) {
        return { ok: false, message: 'Şifre değişikliği sırasında koro oturumu değişti.' };
      }

      const { error: updateError } = await this.deps.auth.updateUser({ password: newPassword });
      if (updateError) return { ok: false, message: 'Şifre şu anda güncellenemedi. Tekrar deneyin.' };
      return { ok: true };
    } catch {
      return { ok: false, message: 'Şifre şu anda güncellenemedi. Tekrar deneyin.' };
    } finally {
      this.passwordChangeInFlight = false;
    }
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
