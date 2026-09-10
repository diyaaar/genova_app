import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  snapshot: vi.fn(),
  requireEmbedded: vi.fn(),
  getSession: vi.fn(),
  notifyUnauthorized: vi.fn(),
}));

vi.mock('./supabase', () => ({
  getEmbeddedLeaseSnapshot: mocks.snapshot,
  requireEmbeddedAccess: mocks.requireEmbedded,
  browserSupabase: { auth: { getSession: mocks.getSession } },
  notifyEmbeddedUnauthorized: mocks.notifyUnauthorized,
}));

import { authenticatedWebFetch, isEmbeddedWebAuth, requireCurrentWebAccess } from './web-auth-capability';

describe('web auth capability', () => {
  beforeEach(() => {
    mocks.snapshot.mockReset();
    mocks.requireEmbedded.mockReset();
    mocks.getSession.mockReset();
    mocks.notifyUnauthorized.mockReset();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('uses the memory lease without consulting browser Auth in embedded mode', async () => {
    mocks.snapshot.mockReturnValue({ mode: 'embedded', phase: 'ready' });
    mocks.requireEmbedded.mockReturnValue({ accessToken: 'embedded-token', userId: 'user-a' });

    await expect(requireCurrentWebAccess()).resolves.toEqual({ accessToken: 'embedded-token', userId: 'user-a' });
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(isEmbeddedWebAuth()).toBe(true);
  });

  it('preserves browser getSession behavior outside embedded mode', async () => {
    mocks.snapshot.mockReturnValue({ mode: 'browser', phase: 'browser' });
    mocks.getSession.mockResolvedValue({
      data: { session: { access_token: 'browser-token', user: { id: 'user-b' } } },
      error: null,
    });

    await expect(requireCurrentWebAccess()).resolves.toEqual({ accessToken: 'browser-token', userId: 'user-b' });
    expect(mocks.requireEmbedded).not.toHaveBeenCalled();
  });

  it('fails closed without a complete browser session', async () => {
    mocks.snapshot.mockReturnValue({ mode: 'browser', phase: 'browser' });
    mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(requireCurrentWebAccess()).rejects.toThrow('Oturum bulunamadı.');
  });

  it('adds the embedded bearer and freezes non-read requests through the mutation capability', async () => {
    mocks.snapshot.mockReturnValue({ mode: 'embedded', phase: 'ready' });
    mocks.requireEmbedded.mockReturnValue({ accessToken: 'embedded-token', userId: 'user-a' });
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetcher);

    await authenticatedWebFetch('/api/write', {
      method: 'POST',
      headers: { 'X-Request': 'kept' },
      body: '{}',
    });

    expect(mocks.requireEmbedded).toHaveBeenCalledWith('mutation');
    const headers = fetcher.mock.calls[0][1]?.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer embedded-token');
    expect(headers.get('X-Request')).toBe('kept');
  });

  it('reports an authenticated 401 to the embedded lifecycle handler', async () => {
    mocks.snapshot.mockReturnValue({ mode: 'embedded', phase: 'ready' });
    mocks.requireEmbedded.mockReturnValue({ accessToken: 'embedded-token', userId: 'user-a' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await authenticatedWebFetch('/api/read');

    expect(mocks.requireEmbedded).toHaveBeenCalledWith('read');
    expect(mocks.notifyUnauthorized).toHaveBeenCalledOnce();
  });

  it('rechecks an existing access snapshot against the current embedded lease before a write', async () => {
    mocks.snapshot.mockReturnValue({ mode: 'embedded', phase: 'renewing' });
    mocks.requireEmbedded.mockReturnValue({ accessToken: 'current-token', userId: 'user-a' });
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetcher);

    await authenticatedWebFetch('/api/write', { method: 'POST' }, {
      accessToken: 'older-token',
      userId: 'user-a',
    });

    expect(mocks.requireEmbedded).toHaveBeenCalledWith('mutation');
    expect((fetcher.mock.calls[0][1]?.headers as Headers).get('Authorization')).toBe('Bearer current-token');
  });
});
