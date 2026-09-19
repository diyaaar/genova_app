import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const clients: Array<Record<string, unknown>> = [];

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn((_url: string, _key: string, options?: Record<string, unknown>) => {
    const client = {
      options,
      auth: {
        getSession: vi.fn(),
        getUser: vi.fn(),
      },
      realtime: { setAuth: vi.fn().mockResolvedValue(undefined) },
      removeAllChannels: vi.fn().mockResolvedValue([]),
      rpc: vi.fn(),
      functions: { invoke: vi.fn() },
    };
    clients.push(client);
    return client;
  }),
}));

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CHOIR_ID = '22222222-2222-4222-8222-222222222222';
const MEMBER_ID = '33333333-3333-4333-8333-333333333333';
const candidate = {
  accessToken: 'header.payload.signature',
  expiresAt: Math.floor(Date.now() / 1000) + 600,
  userId: USER_ID,
  choirId: CHOIR_ID,
  memberId: MEMBER_ID,
};

describe('embedded Supabase capability', () => {
  beforeEach(() => {
    clients.length = 0;
    vi.resetModules();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('uses the ordinary persisted browser client until embedded mode is explicitly entered', async () => {
    const supabaseModule = await import('./supabase');

    expect(supabaseModule.supabase).toBe(supabaseModule.browserSupabase);
    expect(supabaseModule.getEmbeddedLeaseSnapshot()).toEqual({ mode: 'browser', phase: 'browser' });
    expect(clients).toHaveLength(0);

    void supabaseModule.browserSupabase.auth;
    expect(clients).toHaveLength(1);
  });

  it('sets the current browser session JWT before a private Realtime join', async () => {
    const supabaseModule = await import('./supabase');
    void supabaseModule.browserSupabase.auth;
    const browser = clients[0] as {
      auth: { getSession: ReturnType<typeof vi.fn> };
      realtime: { setAuth: ReturnType<typeof vi.fn> };
    };
    browser.auth.getSession.mockResolvedValue({
      data: { session: { access_token: candidate.accessToken } },
      error: null,
    });

    await supabaseModule.authorizeCurrentRealtime();
    expect(browser.auth.getSession).toHaveBeenCalledOnce();
    expect(browser.realtime.setAuth).toHaveBeenCalledWith(candidate.accessToken);
  });

  it('refuses browser Realtime authorization without a current session', async () => {
    const supabaseModule = await import('./supabase');
    void supabaseModule.browserSupabase.auth;
    const browser = clients[0] as {
      auth: { getSession: ReturnType<typeof vi.fn> };
      realtime: { setAuth: ReturnType<typeof vi.fn> };
    };
    browser.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(supabaseModule.authorizeCurrentRealtime()).rejects.toThrow('chat-realtime-auth-required');
    expect(browser.realtime.setAuth).not.toHaveBeenCalled();
  });

  it('switches the live binding before a lease and refuses bearer access while locked', async () => {
    const supabaseModule = await import('./supabase');

    expect(supabaseModule.enterEmbeddedSupabaseMode()).toEqual({ mode: 'embedded', phase: 'locked' });
    expect(supabaseModule.supabase).toBe(clients[0]);
    expect(() => supabaseModule.requireEmbeddedAccess()).toThrow('embedded-context-locked');
    expect(clients).toHaveLength(1);
    expect(clients[0]?.options).toMatchObject({
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      accessToken: expect.any(Function),
    });
  });

  it('commits only after Realtime auth, uses the current bearer, freezes renewal and clears before teardown', async () => {
    const supabaseModule = await import('./supabase');
    supabaseModule.enterEmbeddedSupabaseMode();
    const embedded = clients[0] as {
      options: { global: { fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> } };
      realtime: { setAuth: ReturnType<typeof vi.fn> };
      removeAllChannels: ReturnType<typeof vi.fn>;
    };
    let releaseRealtime: (() => void) | undefined;
    embedded.realtime.setAuth.mockImplementationOnce(() => new Promise<void>((resolve) => { releaseRealtime = resolve; }));
    const installing = supabaseModule.installEmbeddedLease(candidate);
    expect(() => supabaseModule.requireEmbeddedAccess()).toThrow('embedded-context-locked');
    await vi.waitFor(() => expect(releaseRealtime).toBeTypeOf('function'));
    releaseRealtime?.();
    await installing;

    expect(supabaseModule.requireEmbeddedAccess()).toEqual({ accessToken: candidate.accessToken, userId: USER_ID });
    expect(embedded.realtime.setAuth).toHaveBeenCalledWith(candidate.accessToken);
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetcher);
    await embedded.options.global.fetch('https://example.test/read');
    expect((fetcher.mock.calls[0][1]?.headers as Headers).get('Authorization')).toBe(`Bearer ${candidate.accessToken}`);
    expect(supabaseModule.beginEmbeddedLeaseRenewal()).toBe(true);
    await expect(embedded.options.global.fetch('https://example.test', { method: 'POST' }))
      .rejects.toThrow('embedded-context-renewing');

    const clearing = supabaseModule.clearEmbeddedSupabaseContext();
    expect(() => supabaseModule.requireEmbeddedAccess()).toThrow('embedded-context-locked');
    await clearing;
    expect(embedded.removeAllChannels).toHaveBeenCalledOnce();
    expect(embedded.realtime.setAuth).toHaveBeenLastCalledWith(null);
    expect(supabaseModule.supabase).toBe(embedded);
  });

  it('reuses only the installed embedded lease for private Realtime authorization', async () => {
    const supabaseModule = await import('./supabase');
    supabaseModule.enterEmbeddedSupabaseMode();
    const embedded = clients[0] as { realtime: { setAuth: ReturnType<typeof vi.fn> } };
    await supabaseModule.installEmbeddedLease(candidate);
    embedded.realtime.setAuth.mockClear();

    await supabaseModule.authorizeCurrentRealtime();
    expect(embedded.realtime.setAuth).toHaveBeenCalledOnce();
    expect(embedded.realtime.setAuth).toHaveBeenCalledWith(candidate.accessToken);
  });

  it('verifies with explicit-token seams without installing a failed candidate', async () => {
    const supabaseModule = await import('./supabase');
    supabaseModule.enterEmbeddedSupabaseMode();
    const result = await supabaseModule.verifyEmbeddedSupabaseContext(candidate, {
      nowSeconds: () => Math.floor(Date.now() / 1000),
      verifyUser: vi.fn().mockResolvedValue({ id: USER_ID }),
      loadMemberships: vi.fn().mockResolvedValue([{
        choir_id: CHOIR_ID,
        member_id: MEMBER_ID,
        choir_name: 'Genova',
        choir_slug: 'genova',
        member_is_active: false,
        is_current: true,
      }]),
    });

    expect(result).toEqual({ ok: false, reasonCode: 'choir-mismatch' });
    expect(() => supabaseModule.requireEmbeddedAccess()).toThrow('embedded-context-locked');
  });

  it('cannot restore a lease when clear wins during an asynchronous Realtime install', async () => {
    const supabaseModule = await import('./supabase');
    supabaseModule.enterEmbeddedSupabaseMode();
    const embedded = clients[0] as {
      realtime: { setAuth: ReturnType<typeof vi.fn> };
      removeAllChannels: ReturnType<typeof vi.fn>;
    };
    let releaseInstall: (() => void) | undefined;
    embedded.realtime.setAuth.mockImplementationOnce(() => new Promise<void>((resolve) => { releaseInstall = resolve; }));

    const installing = supabaseModule.installEmbeddedLease(candidate);
    await vi.waitFor(() => expect(releaseInstall).toBeTypeOf('function'));
    const clearing = supabaseModule.clearEmbeddedSupabaseContext();
    expect(() => supabaseModule.requireEmbeddedAccess()).toThrow('embedded-context-locked');
    releaseInstall?.();

    await expect(installing).rejects.toThrow('embedded-install-stale');
    await clearing;
    expect(() => supabaseModule.requireEmbeddedAccess()).toThrow('embedded-context-locked');
    expect(embedded.realtime.setAuth).toHaveBeenLastCalledWith(null);
  });
});
