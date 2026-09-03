import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
}));

vi.mock('@/lib/server/supabase-auth', () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));

import { POST } from '@/app/api/assignment-submissions/upload/route';

function uploadRequest(file: File) {
  const formData = new FormData();
  formData.set('assignmentId', 'assignment-1');
  formData.set('file', file);
  return {
    headers: new Headers({ Authorization: 'Bearer access-token' }),
    formData: vi.fn().mockResolvedValue(formData),
  } as unknown as Request;
}

describe('POST /api/assignment-submissions/upload active-content guard', () => {
  beforeEach(() => {
    mocks.requireAuthenticatedUser.mockResolvedValue({ user: { id: 'auth-user-1' }, accessToken: 'access-token' });
  });

  it('rejects an HTML upload before any database or storage access', async () => {
    const response = await POST(uploadRequest(new File(['<script>alert(1)</script>'], 'submission.html', {
      type: 'text/html',
    })));

    expect(response.status).toBe(415);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(mocks.createSupabaseServiceClient).not.toHaveBeenCalled();
  });

  it('still requires authentication before reading the uploaded body', async () => {
    mocks.requireAuthenticatedUser.mockRejectedValue(new Error('Unauthorized'));

    const response = await POST(uploadRequest(new File(['pdf'], 'partisyon.pdf', { type: 'application/pdf' })));

    expect(response.status).toBe(401);
    expect(mocks.createSupabaseServiceClient).not.toHaveBeenCalled();
  });
});
