import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  authorizeDriveFileAccess: vi.fn(),
  createDriveFileToken: vi.fn(),
}));

vi.mock('@/lib/server/supabase-auth', () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
}));

vi.mock('@/lib/server/drive-file-access', () => ({
  authorizeDriveFileAccess: mocks.authorizeDriveFileAccess,
}));

vi.mock('@/lib/server/drive-file-token', () => ({
  createDriveFileToken: mocks.createDriveFileToken,
}));

import { POST } from '@/app/api/drive-file-token/route';

function request(body: unknown, authorized = true) {
  return new Request('http://localhost/api/drive-file-token', {
    method: 'POST',
    headers: authorized ? { Authorization: 'Bearer token', 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/drive-file-token', () => {
  beforeEach(() => {
    mocks.requireAuthenticatedUser.mockResolvedValue({ user: { id: 'auth-user-1' } });
    mocks.authorizeDriveFileAccess.mockResolvedValue({
      driveFileId: 'safe_file-1',
      fileName: 'partisyon.pdf',
      mimeType: 'application/pdf',
      kind: 'repertoire',
    });
    mocks.createDriveFileToken.mockReturnValue({ token: 'signed-token', expiresAt: 1_900_000_000_000 });
  });

  it('requires authentication', async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(new Error('Unauthorized'));

    const response = await POST(request({ driveFileId: 'safe_file-1' }, false));

    expect(response.status).toBe(401);
    expect(mocks.authorizeDriveFileAccess).not.toHaveBeenCalled();
  });

  it('rejects malformed Drive IDs before authorization', async () => {
    const response = await POST(request({ driveFileId: '../../etc/passwd' }));

    expect(response.status).toBe(400);
    expect(mocks.authorizeDriveFileAccess).not.toHaveBeenCalled();
  });

  it('does not mint a URL for unauthorized files', async () => {
    mocks.authorizeDriveFileAccess.mockResolvedValue(null);

    const response = await POST(request({ driveFileId: 'safe_file-1' }));

    expect(response.status).toBe(403);
    expect(mocks.createDriveFileToken).not.toHaveBeenCalled();
  });

  it('blocks active content before issuing a signed URL', async () => {
    mocks.authorizeDriveFileAccess.mockResolvedValue({
      driveFileId: 'active_file-1',
      fileName: 'payload.svg',
      mimeType: 'image/svg+xml',
      kind: 'repertoire',
    });

    const response = await POST(request({ driveFileId: 'active_file-1' }));

    expect(response.status).toBe(415);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(mocks.createDriveFileToken).not.toHaveBeenCalled();
  });

  it('returns a URL only after authorization and policy checks', async () => {
    const response = await POST(request({ driveFileId: 'safe_file-1' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: '/api/drive-file/safe_file-1?token=signed-token',
      expiresAt: 1_900_000_000_000,
    });
    expect(mocks.authorizeDriveFileAccess).toHaveBeenCalledWith('auth-user-1', 'safe_file-1');
  });
});
