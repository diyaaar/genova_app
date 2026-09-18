import { AuthStore } from '../auth-store';
import {
  CHOIR_A,
  CHOIR_B,
  CHOIR_C,
  OTHER_USER_ID,
  USER_ID,
  createClientDouble,
  createGatewayDouble,
  createPreferenceDouble,
  membership,
  sessionFor,
} from '../../test/doubles';

function buildStore(options: {
  memberships?: ReturnType<typeof membership>[];
  activeChoirId?: string | null;
  initialSession?: ReturnType<typeof sessionFor> | null;
  preferences?: Record<string, string>;
  signInError?: { message: string } | null;
  signOutRejects?: boolean;
  listResponse?: () => { data: unknown; error: { message: string } | null };
  activateResponse?: (choirId: string) => { data: unknown; error: { message: string } | null };
  refreshResponse?: {
    data: { session: ReturnType<typeof sessionFor> | null };
    error: { message: string } | null;
  };
  updateError?: { message: string } | null;
} = {}) {
  const calls: string[] = [];
  const clientDouble = createClientDouble({
    memberships: options.memberships ?? [membership()],
    activeChoirId: options.activeChoirId ?? null,
    listResponse: options.listResponse,
    activateResponse: options.activateResponse,
    calls,
  });
  const gateway = createGatewayDouble({
    initialSession: options.initialSession === undefined ? sessionFor() : options.initialSession,
    signInError: options.signInError ?? null,
    signOutRejects: options.signOutRejects,
    refreshResponse: options.refreshResponse,
    updateError: options.updateError,
  });
  const preferences = createPreferenceDouble(options.preferences);
  const clearCaches = jest.fn(async () => {
    calls.push('clear-caches');
  });

  const store = new AuthStore({
    client: clientDouble.client,
    auth: gateway.gateway,
    preferences,
    clearCaches,
  });

  return { store, clientDouble, gateway, preferences, clearCaches, calls };
}

describe('session lifecycle', () => {
  it('contains a storage rejection, refuses leases and retries the real session gateway', async () => {
    const { store, gateway, clientDouble } = buildStore({ activeChoirId: CHOIR_A });
    const getSession = jest.spyOn(gateway.gateway, 'getSession')
      .mockRejectedValueOnce(new Error('ERR_KEY_CHAIN private diagnostic'));
    const listen = jest.spyOn(gateway.gateway, 'onAuthStateChange');

    await expect(store.start()).resolves.toBeUndefined();
    expect(store.getState()).toMatchObject({
      phase: 'error', session: null, user: null, activeChoir: null, choirs: [],
      errorMessage: 'Oturum bilgileri okunamadı. Lütfen tekrar deneyin.',
    });
    expect(clientDouble.rpc).not.toHaveBeenCalled();
    expect(listen).not.toHaveBeenCalled();
    await expect(store.getWebViewLease()).rejects.toThrow('hazır değil');

    await store.refresh();
    expect(getSession).toHaveBeenCalledTimes(2);
    expect(listen).toHaveBeenCalledTimes(1);
    expect(store.getState()).toMatchObject({ phase: 'ready', activeChoir: { choir_id: CHOIR_A } });
  });

  it('fails closed when getSession returns an error alongside session data', async () => {
    const { store, gateway, clientDouble } = buildStore();
    jest.spyOn(gateway.gateway, 'getSession').mockResolvedValueOnce({
      data: { session: sessionFor() }, error: { message: 'private diagnostic' },
    });
    await store.start();
    expect(store.getState()).toMatchObject({ phase: 'error', session: null, user: null });
    expect(clientDouble.rpc).not.toHaveBeenCalled();
  });

  it.each(['stop', 'signOut'] as const)('ignores a pending session read after %s', async (action) => {
    const { store, gateway, clientDouble } = buildStore();
    let resolveRead!: (value: { data: { session: ReturnType<typeof sessionFor> } }) => void;
    jest.spyOn(gateway.gateway, 'getSession').mockReturnValueOnce(new Promise((resolve) => {
      resolveRead = resolve;
    }));
    const listen = jest.spyOn(gateway.gateway, 'onAuthStateChange');
    const start = store.start();
    await store[action]();
    const stopped = store.getState();
    resolveRead({ data: { session: sessionFor() } });
    await start;
    expect(store.getState()).toEqual(stopped);
    expect(listen).not.toHaveBeenCalled();
    expect(clientDouble.rpc).not.toHaveBeenCalled();
  });

  it('stays signed out when no session is stored', async () => {
    const { store, clientDouble } = buildStore({ initialSession: null });

    await store.start();

    expect(store.getState().phase).toBe('signed-out');
    expect(clientDouble.rpc).not.toHaveBeenCalled();
  });

  it('reports wrong credentials without starting a session', async () => {
    const { store, gateway } = buildStore({
      initialSession: null,
      signInError: { message: 'Invalid login credentials' },
    });
    await store.start();

    await expect(store.signIn('a@b.test', 'wrong')).resolves.toEqual({ error: 'Invalid login credentials' });

    expect(gateway.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.test', password: 'wrong' });
    expect(store.getState().phase).toBe('signed-out');
    expect(store.getState().session).toBeNull();
  });

  it('restores a stored session on relaunch and resolves the choir context', async () => {
    const { store } = buildStore({ activeChoirId: CHOIR_A });

    await store.start();

    expect(store.getState().phase).toBe('ready');
    expect(store.getState().activeChoir?.choir_id).toBe(CHOIR_A);
  });

  it('signs out fail-closed when a token refresh yields no session', async () => {
    const { store, gateway, clearCaches, preferences } = buildStore({ activeChoirId: CHOIR_A });
    await store.start();
    expect(preferences.values[USER_ID]).toBe(CHOIR_A);
    clearCaches.mockClear();

    gateway.emit(null);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(store.getState().phase).toBe('signed-out');
    expect(store.getState().activeChoir).toBeNull();
    expect(clearCaches).toHaveBeenCalled();
    expect(preferences.values[USER_ID]).toBeUndefined();
  });

  it('clears the previous account when a different user signs in', async () => {
    const { store, gateway, preferences, clearCaches } = buildStore({ activeChoirId: CHOIR_A });
    await store.start();
    clearCaches.mockClear();

    gateway.emit(sessionFor(OTHER_USER_ID));
    for (let tick = 0; tick < 12; tick += 1) await Promise.resolve();

    expect(preferences.values[USER_ID]).toBeUndefined();
    expect(clearCaches).toHaveBeenCalled();
  });

  it('keeps the proved tenant ready when the same user receives a refreshed token', async () => {
    const { store, gateway, calls, clearCaches } = buildStore({ activeChoirId: CHOIR_A });
    await store.start();
    calls.length = 0;
    clearCaches.mockClear();

    gateway.emit(sessionFor(USER_ID, { access_token: 'refreshed-access-token' }), 'TOKEN_REFRESHED');
    await Promise.resolve();

    expect(store.getState()).toMatchObject({
      phase: 'ready',
      activeChoir: { choir_id: CHOIR_A },
      session: { access_token: 'refreshed-access-token' },
    });
    expect(calls).toEqual([]);
    expect(clearCaches).not.toHaveBeenCalled();
  });
});

describe('permanent WebView lease', () => {
  const jwt = 'header.payload.signature';

  it('returns only the current access lease when the ready native session is fresh', async () => {
    const { store, gateway } = buildStore({
      activeChoirId: CHOIR_A,
      initialSession: sessionFor(USER_ID, { access_token: jwt, expires_at: 2_000 }),
    });
    await store.start();

    await expect(store.getWebViewLease({ nowSeconds: 1_000 })).resolves.toEqual({
      accessToken: jwt,
      expiresAt: 2_000,
      userId: USER_ID,
      choirId: CHOIR_A,
      memberId: membership().member_id,
    });
    expect(gateway.refreshSession).not.toHaveBeenCalled();
  });

  it('coalesces a near-expiry refresh and never returns the refresh token', async () => {
    let release!: (value: {
      data: { session: ReturnType<typeof sessionFor> };
      error: null;
    }) => void;
    const pending = new Promise<{
      data: { session: ReturnType<typeof sessionFor> };
      error: null;
    }>((resolve) => { release = resolve; });
    const { store, gateway } = buildStore({
      activeChoirId: CHOIR_A,
      initialSession: sessionFor(USER_ID, { access_token: jwt, expires_at: 1_030 }),
    });
    await store.start();
    gateway.refreshSession.mockImplementation(() => pending);

    const first = store.getWebViewLease({ nowSeconds: 1_000 });
    const second = store.getWebViewLease({ nowSeconds: 1_000 });
    release({
      data: { session: sessionFor(USER_ID, {
        access_token: 'new.payload.signature',
        refresh_token: 'must-never-cross',
        expires_at: 2_000,
      }) },
      error: null,
    });

    const [one, two] = await Promise.all([first, second]);
    expect(gateway.refreshSession).toHaveBeenCalledTimes(1);
    expect(one).toEqual(two);
    expect(one.accessToken).toBe('new.payload.signature');
    expect(one).not.toHaveProperty('refreshToken');
    expect(JSON.stringify(one)).not.toContain('must-never-cross');
  });

  it('fails closed outside ready state and after a tenant changes during refresh', async () => {
    const signedOut = buildStore({ initialSession: null });
    await signedOut.store.start();
    await expect(signedOut.store.getWebViewLease()).rejects.toThrow(/hazır değil/u);

    let release!: (value: {
      data: { session: ReturnType<typeof sessionFor> };
      error: null;
    }) => void;
    const prepared = buildStore({
      memberships: [membership(), membership({ choir_id: CHOIR_B, choir_name: 'Genova B' })],
      activeChoirId: CHOIR_A,
      initialSession: sessionFor(USER_ID, { access_token: jwt, expires_at: 1_001 }),
    });
    await prepared.store.start();
    const pending = new Promise<{ data: { session: ReturnType<typeof sessionFor> }; error: null }>((resolve) => {
      release = resolve;
    });
    prepared.gateway.refreshSession.mockImplementation(() => pending);
    const lease = prepared.store.getWebViewLease({ nowSeconds: 1_000 });
    await prepared.store.selectChoir(CHOIR_B);
    release({
      data: { session: sessionFor(USER_ID, { access_token: 'new.payload.signature', expires_at: 2_000 }) },
      error: null,
    });
    await expect(lease).rejects.toThrow(/değişti/u);
  });
});

describe('native password change', () => {
  it('keeps an already proved tenant ready for same-user reauth and user-update events', async () => {
    const { store, gateway, calls, clearCaches } = buildStore({ activeChoirId: CHOIR_A });
    await store.start();
    calls.length = 0;
    clearCaches.mockClear();

    gateway.emit(sessionFor(USER_ID, { access_token: 'reauth-token' }), 'SIGNED_IN');
    gateway.emit(sessionFor(USER_ID, { access_token: 'updated-token' }), 'USER_UPDATED');
    await Promise.resolve();

    expect(store.getState()).toMatchObject({ phase: 'ready', activeChoir: { choir_id: CHOIR_A } });
    expect(store.getState().session?.access_token).toBe('updated-token');
    expect(calls).toEqual([]);
    expect(clearCaches).not.toHaveBeenCalled();
  });

  it('preserves the required validations before any auth call', async () => {
    const { store, gateway } = buildStore({ activeChoirId: CHOIR_A });
    await store.start();

    await expect(store.changePassword('', 'new-password', 'new-password')).resolves.toEqual({
      ok: false, message: 'Lütfen tüm şifre alanlarını doldurun.',
    });
    await expect(store.changePassword('old-password', 'short', 'short')).resolves.toEqual({
      ok: false, message: 'Yeni şifre en az 8 karakter olmalıdır.',
    });
    await expect(store.changePassword('old-password', 'new-password', 'different')).resolves.toEqual({
      ok: false, message: 'Yeni şifre ve tekrar şifresi eşleşmiyor.',
    });
    await expect(store.changePassword('same-password', 'same-password', 'same-password')).resolves.toEqual({
      ok: false, message: 'Yeni şifre eski şifre ile aynı olamaz.',
    });
    expect(gateway.signInWithPassword).not.toHaveBeenCalled();
    expect(gateway.updateUser).not.toHaveBeenCalled();
  });

  it('reauthenticates the current email before updating and keeps provider errors bounded', async () => {
    const prepared = buildStore({ activeChoirId: CHOIR_A });
    await prepared.store.start();

    await expect(prepared.store.changePassword('old-password', 'new-password', 'new-password')).resolves.toEqual({ ok: true });
    expect(prepared.gateway.signInWithPassword).toHaveBeenCalledWith({
      email: 'korist@example.test', password: 'old-password',
    });
    expect(prepared.gateway.updateUser).toHaveBeenCalledWith({ password: 'new-password' });

    const wrong = buildStore({ activeChoirId: CHOIR_A, signInError: { message: 'provider credential detail' } });
    await wrong.store.start();
    await expect(wrong.store.changePassword('wrong-password', 'new-password', 'new-password')).resolves.toEqual({
      ok: false, message: 'Mevcut şifre doğru değil.',
    });
    expect(wrong.gateway.updateUser).not.toHaveBeenCalled();

    const updateFailure = buildStore({ activeChoirId: CHOIR_A, updateError: { message: 'raw provider detail' } });
    await updateFailure.store.start();
    const result = await updateFailure.store.changePassword('old-password', 'new-password', 'new-password');
    expect(result).toEqual({ ok: false, message: 'Şifre şu anda güncellenemedi. Tekrar deneyin.' });
    expect(JSON.stringify(result)).not.toContain('raw provider detail');
  });

  it('refuses duplicate work and a tenant change before update', async () => {
    let release!: (value: { error: null }) => void;
    const pending = new Promise<{ error: null }>((resolve) => { release = resolve; });
    const prepared = buildStore({
      memberships: [membership(), membership({ choir_id: CHOIR_B, choir_name: 'Genova B' })],
      activeChoirId: CHOIR_A,
    });
    await prepared.store.start();
    prepared.gateway.signInWithPassword.mockImplementation(() => pending);

    const first = prepared.store.changePassword('old-password', 'new-password', 'new-password');
    await expect(prepared.store.changePassword('old-password', 'new-password', 'new-password')).resolves.toEqual({
      ok: false, message: 'Şifre değişikliği zaten sürüyor.',
    });
    await prepared.store.selectChoir(CHOIR_B);
    release({ error: null });
    await expect(first).resolves.toEqual({
      ok: false, message: 'Şifre değişikliği sırasında koro oturumu değişti.',
    });
    expect(prepared.gateway.updateUser).not.toHaveBeenCalled();
  });
});

describe('membership resolution', () => {
  it('shows an explicit state and opens no data screen without a membership', async () => {
    const { store, calls } = buildStore({ memberships: [] });

    await store.start();

    expect(store.getState().phase).toBe('no-membership');
    expect(store.getState().activeChoir).toBeNull();
    expect(calls).not.toContain('rpc:set_active_choir');
  });

  it('activates a single membership through the server', async () => {
    const { store, clientDouble, preferences } = buildStore({ memberships: [membership()] });

    await store.start();

    expect(clientDouble.rpc).toHaveBeenCalledWith('set_active_choir', { p_choir_id: CHOIR_A });
    expect(store.getState().phase).toBe('ready');
    expect(preferences.values[USER_ID]).toBe(CHOIR_A);
  });

  it('requires an explicit choice for multiple memberships and stays fail-closed', async () => {
    const { store, calls } = buildStore({
      memberships: [membership(), membership({ choir_id: CHOIR_B, choir_name: 'Genova B' })],
    });

    await store.start();

    expect(store.getState().phase).toBe('selection-required');
    expect(store.getState().activeChoir).toBeNull();
    expect(store.getState().choirs).toHaveLength(2);
    expect(calls).not.toContain('rpc:set_active_choir');
  });

  it('recovers the stored hint only when it names an owned membership', async () => {
    const { store, clientDouble } = buildStore({
      memberships: [membership(), membership({ choir_id: CHOIR_B, choir_name: 'Genova B' })],
      preferences: { [USER_ID]: CHOIR_B },
    });

    await store.start();

    expect(clientDouble.rpc).toHaveBeenCalledWith('set_active_choir', { p_choir_id: CHOIR_B });
    expect(store.getState().activeChoir?.choir_id).toBe(CHOIR_B);
  });

  it('ignores a hint that does not belong to the account', async () => {
    const { store, calls } = buildStore({
      memberships: [membership(), membership({ choir_id: CHOIR_B, choir_name: 'Genova B' })],
      preferences: { [USER_ID]: CHOIR_C },
    });

    await store.start();

    expect(store.getState().phase).toBe('selection-required');
    expect(calls).not.toContain('rpc:set_active_choir');
  });

  it('trusts the server-confirmed choir without asking again', async () => {
    const { store, calls } = buildStore({
      memberships: [membership(), membership({ choir_id: CHOIR_B, choir_name: 'Genova B' })],
      activeChoirId: CHOIR_B,
    });

    await store.start();

    expect(store.getState().phase).toBe('ready');
    expect(store.getState().activeChoir?.choir_id).toBe(CHOIR_B);
    expect(calls.filter((entry) => entry === 'rpc:set_active_choir')).toHaveLength(0);
  });

  it('fails closed on a malformed membership payload', async () => {
    const { store } = buildStore({
      listResponse: () => ({ data: [{ choir_id: CHOIR_A }], error: null }),
    });

    await store.start();

    expect(store.getState().phase).toBe('error');
    expect(store.getState().activeChoir).toBeNull();
    expect(store.getState().errorMessage).toMatch(/sözleşmeyle/);
  });

  it('rejects an activation the database did not confirm', async () => {
    const { store } = buildStore({
      memberships: [membership()],
      activateResponse: () => ({ data: CHOIR_B, error: null }),
    });

    await store.start();

    expect(store.getState().phase).toBe('error');
    expect(store.getState().activeChoir).toBeNull();
  });
});

describe('choir switching', () => {
  const twoChoirs = [membership(), membership({ choir_id: CHOIR_B, choir_name: 'Genova B' })];

  it('refuses a choir the account is not a member of, before any server call', async () => {
    const { store, calls } = buildStore({ memberships: twoChoirs, activeChoirId: CHOIR_A });
    await store.start();
    const before = calls.length;

    await store.selectChoir(CHOIR_C);

    expect(calls).toHaveLength(before);
    expect(store.getState().errorMessage).toBe('Bu hesap için seçilen koro üyeliği bulunamadı.');
    expect(store.getState().activeChoir?.choir_id).toBe(CHOIR_A);
  });

  it('clears the previous choir cache before requesting the switch', async () => {
    const { store, calls } = buildStore({ memberships: twoChoirs, activeChoirId: CHOIR_A });
    await store.start();
    calls.length = 0;

    await store.selectChoir(CHOIR_B);

    expect(calls[0]).toBe('clear-caches');
    expect(calls[1]).toBe('rpc:set_active_choir');
    expect(store.getState().phase).toBe('ready');
    expect(store.getState().activeChoir?.choir_id).toBe(CHOIR_B);
  });

  it('keeps no active choir when the switch is refused', async () => {
    const { store } = buildStore({
      memberships: twoChoirs,
      activeChoirId: CHOIR_A,
      activateResponse: () => ({ data: null, error: { message: 'Koro üyeliği doğrulanamadı.' } }),
    });
    await store.start();

    await store.selectChoir(CHOIR_B);

    expect(store.getState().phase).toBe('selection-required');
    expect(store.getState().activeChoir).toBeNull();
    expect(store.getState().errorMessage).toBe('Koro üyeliği doğrulanamadı.');
  });

  it('does nothing when the requested choir is already active', async () => {
    const { store, calls } = buildStore({ memberships: twoChoirs, activeChoirId: CHOIR_A });
    await store.start();
    calls.length = 0;

    await store.selectChoir(CHOIR_A);

    expect(calls).toHaveLength(0);
  });
});

describe('sign-out', () => {
  it('clears session, preference and tenant caches', async () => {
    const { store, gateway, preferences, clearCaches } = buildStore({ activeChoirId: CHOIR_A });
    await store.start();
    clearCaches.mockClear();

    await store.signOut();

    expect(gateway.signOut).toHaveBeenCalled();
    expect(clearCaches).toHaveBeenCalled();
    expect(preferences.values[USER_ID]).toBeUndefined();
    expect(store.getState()).toMatchObject({ phase: 'signed-out', session: null, activeChoir: null, choirs: [] });
  });

  it('still clears local state when the network sign-out fails', async () => {
    const { store, preferences } = buildStore({ activeChoirId: CHOIR_A, signOutRejects: true });
    await store.start();

    await expect(store.signOut()).rejects.toThrow('network down');

    expect(store.getState().phase).toBe('signed-out');
    expect(store.getState().activeChoir).toBeNull();
    expect(preferences.values[USER_ID]).toBeUndefined();
  });
});
