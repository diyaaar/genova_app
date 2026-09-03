import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  verifyDriveFileToken: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
}));

vi.mock('@/lib/server/drive-file-token', () => ({
  verifyDriveFileToken: mocks.verifyDriveFileToken,
}));

vi.mock('@/lib/server/supabase-auth', () => ({
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

import { GET, HEAD } from '@/app/api/drive-file/[id]/route';

function request(token = 'signed-token') {
  return new NextRequest(`http://localhost/api/drive-file/file_1?token=${token}`);
}

describe('protected Drive proxy active-content guard', () => {
  beforeEach(() => {
    mocks.verifyDriveFileToken.mockReturnValue({
      driveFileId: 'file_1',
      fileName: 'payload.svg',
      mimeType: 'image/svg+xml',
      kind: 'repertoire',
      exp: Date.now() + 60_000,
    });
  });

  it('rejects a previously issued active-content token before storage or Drive is contacted', async () => {
    const response = await GET(request(), { params: Promise.resolve({ id: 'file_1' }) });

    expect(response.status).toBe(415);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(mocks.createSupabaseServiceClient).not.toHaveBeenCalled();
  });

  it('preserves the same block for HEAD requests', async () => {
    const response = await HEAD(request(), { params: Promise.resolve({ id: 'file_1' }) });

    expect(response.status).toBe(415);
    expect(await response.text()).toBe('');
  });
});
