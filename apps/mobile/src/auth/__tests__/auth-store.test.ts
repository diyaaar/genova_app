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
