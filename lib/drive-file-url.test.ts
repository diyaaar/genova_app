import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mocks.getSession,
    },
  },
}));

import { clearProtectedDriveFileUrlCache, getProtectedDriveFileUrl } from '@/lib/drive-file-url';

const file = {
  drive_file_id: 'drive-file-1',
  file_name: 'partisyon.pdf',
  mime_type: 'application/pdf',
};

function session(userId: string, token: string) {
  return { data: { session: { access_token: token, user: { id: userId } } } };
}

describe('protected Drive URL cache', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    clearProtectedDriveFileUrlCache();
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
      url: '/api/drive-file/drive-file-1?token=fresh',
      expiresAt: Date.now() + 60_000,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })));
  });

  it('does not return a previous user’s cached signed URL', async () => {
    mocks.getSession.mockResolvedValueOnce(session('user-a', 'token-a')).mockResolvedValueOnce(session('user-b', 'token-b'));

    const first = await getProtectedDriveFileUrl(file);
    const second = await getProtectedDriveFileUrl(file);

    expect(first).toBe('/api/drive-file/drive-file-1?token=fresh');
    expect(second).toBe('/api/drive-file/drive-file-1?token=fresh');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer token-a' });
    expect(fetchMock.mock.calls[1]?.[1]?.headers).toMatchObject({ Authorization: 'Bearer token-b' });
  });

  it('checks for a current session before consulting the cache', async () => {
    mocks.getSession.mockResolvedValueOnce(session('user-a', 'token-a')).mockResolvedValueOnce({ data: { session: null } });

    await getProtectedDriveFileUrl(file);

    await expect(getProtectedDriveFileUrl(file)).rejects.toThrow('Oturum bulunamadı');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('can purge every cached signed URL on auth changes', async () => {
    mocks.getSession.mockResolvedValue(session('user-a', 'token-a'));
    await getProtectedDriveFileUrl(file);
    clearProtectedDriveFileUrlCache();
    await getProtectedDriveFileUrl(file);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
