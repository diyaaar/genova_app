import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  browserSupabase: {
    auth: {
      getSession: mocks.getSession,
    },
  },
  getEmbeddedLeaseSnapshot: () => ({ mode: 'browser', phase: 'browser' }),
  notifyEmbeddedUnauthorized: vi.fn(),
  requireEmbeddedAccess: vi.fn(),
}));

import {
  clearProtectedDriveFileUrlCache,
  getProtectedAssignmentFileUrl,
  getProtectedAssignmentReviewFileUrl,
  getProtectedDriveFileUrl,
  getProtectedRepertoireCommentFileUrl,
  getProtectedRepertoireFileUrl,
} from '@/lib/drive-file-url';

const file = {
  id: '11111111-1111-4111-8111-111111111111',
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
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co');
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

  afterEach(() => vi.unstubAllEnvs());

  it('does not return a previous user’s cached signed URL', async () => {
    mocks.getSession.mockResolvedValueOnce(session('user-a', 'token-a')).mockResolvedValueOnce(session('user-b', 'token-b'));

    const first = await getProtectedDriveFileUrl(file);
    const second = await getProtectedDriveFileUrl(file);

    expect(first).toBe('/api/drive-file/drive-file-1?token=fresh');
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[0]?.[1]?.headers as Headers).get('Authorization')).toBe('Bearer token-a');
    expect((fetchMock.mock.calls[1]?.[1]?.headers as Headers).get('Authorization')).toBe('Bearer token-b');
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({
      driveFileId: file.drive_file_id,
      fileName: file.file_name,
      mimeType: file.mime_type,
    }));
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

  it('refreshes a ticket inside the thirty-second expiry margin', async () => {
    mocks.getSession.mockResolvedValue(session('user-a', 'token-a'));
    fetchMock.mockImplementation(() => Promise.resolve(Response.json({
      url: 'https://project.supabase.co/functions/v1/repertoire-file?fileId=11111111-1111-4111-8111-111111111111&ticket=short',
      expiresAt: Date.now() + 20_000,
    })));

    await getProtectedRepertoireFileUrl(file);
    await getProtectedRepertoireFileUrl(file);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toEqual(new URL(
      'https://project.supabase.co/functions/v1/repertoire-file',
    ));
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ fileId: file.id }));
  });

  it('keeps Edge repertoire tickets user-scoped and checks the session before cache use', async () => {
    fetchMock.mockImplementation((_input, init) => Promise.resolve(Response.json({
      url: `https://project.supabase.co/functions/v1/repertoire-file?fileId=${file.id}&ticket=${(init?.headers as Headers).get('Authorization')?.slice(-1)}`,
      expiresAt: Date.now() + 60_000,
    })));
    mocks.getSession
      .mockResolvedValueOnce(session('user-a', 'token-a'))
      .mockResolvedValueOnce(session('user-b', 'token-b'))
      .mockResolvedValueOnce({ data: { session: null } });

    const first = await getProtectedRepertoireFileUrl(file);
    const second = await getProtectedRepertoireFileUrl(file);
    await expect(getProtectedRepertoireFileUrl(file)).rejects.toThrow('Oturum bulunamadı');

    expect(first).toContain('ticket=a');
    expect(second).toContain('ticket=b');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('requests an assignment version ticket from the assignment-only Edge boundary', async () => {
    mocks.getSession.mockResolvedValue(session('user-a', 'token-a'));
    const versionId = '22222222-2222-4222-8222-222222222222';
    fetchMock.mockImplementation(() => Promise.resolve(Response.json({
      url: `https://project.supabase.co/functions/v1/assignment-file?fileId=${versionId}&ticket=private`,
      expiresAt: Date.now() + 60_000,
    })));

    const url = await getProtectedAssignmentFileUrl(versionId, file);

    expect(url).toContain('/functions/v1/assignment-file?');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toEqual(new URL(
      'https://project.supabase.co/functions/v1/assignment-file',
    ));
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ fileId: versionId }));
  });

  it('requests a review version ticket from the review-only Edge boundary', async () => {
    mocks.getSession.mockResolvedValue(session('user-a', 'token-a'));
    const versionId = '33333333-3333-4333-8333-333333333333';
    fetchMock.mockImplementation(() => Promise.resolve(Response.json({
      url: `https://project.supabase.co/functions/v1/assignment-review-file?fileId=${versionId}&ticket=private`,
      expiresAt: Date.now() + 60_000,
    })));

    const url = await getProtectedAssignmentReviewFileUrl(versionId, file);

    expect(url).toContain('/functions/v1/assignment-review-file?');
    expect(fetchMock.mock.calls[0]?.[0]).toEqual(new URL(
      'https://project.supabase.co/functions/v1/assignment-review-file',
    ));
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ fileId: versionId }));
  });

  it('requests a comment version ticket from the comment-only Edge boundary', async () => {
    mocks.getSession.mockResolvedValue(session('user-a', 'token-a'));
    const versionId = '44444444-4444-4444-8444-444444444444';
    fetchMock.mockImplementation(() => Promise.resolve(Response.json({
      url: `https://project.supabase.co/functions/v1/repertoire-comment-file?fileId=${versionId}&ticket=private`,
      expiresAt: Date.now() + 60_000,
    })));

    const url = await getProtectedRepertoireCommentFileUrl(versionId, file);

    expect(url).toContain('/functions/v1/repertoire-comment-file?');
    expect(fetchMock.mock.calls[0]?.[0]).toEqual(new URL(
      'https://project.supabase.co/functions/v1/repertoire-comment-file',
    ));
    expect(fetchMock.mock.calls[0]?.[1]?.body).toBe(JSON.stringify({ fileId: versionId }));
  });
});
