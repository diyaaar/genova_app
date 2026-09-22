import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuthenticatedUser: vi.fn(),
  createSupabaseServiceClient: vi.fn(),
  createTenantServiceClient: vi.fn(),
  sendAssignmentSubmittedPush: vi.fn(),
}));

vi.mock('@/lib/server/supabase-auth', () => ({
  requireAuthenticatedUser: mocks.requireAuthenticatedUser,
  createSupabaseServiceClient: mocks.createSupabaseServiceClient,
}));
vi.mock('@/lib/server/tenant-client', () => ({
  createTenantServiceClient: mocks.createTenantServiceClient,
}));
vi.mock('@/lib/server/push-notifications', () => ({
  sendAssignmentSubmittedPush: mocks.sendAssignmentSubmittedPush,
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
    vi.resetAllMocks();
    mocks.requireAuthenticatedUser.mockResolvedValue({ user: { id: 'auth-user-1' }, accessToken: 'access-token' });
  });

  it('verifies the committed owner/version before sending the compatibility push', async () => {
    const submissionId = '30000000-0000-4000-8000-000000000057';
    const fileVersionId = '70000000-0000-4000-8000-000000000057';
    const results: Record<string, unknown> = {
      choir_members: { data: { id: 'member-1', first_name: 'Ada', last_name: 'Singer', voice_group: 'Soprano', is_active: true }, error: null },
      assignment_submissions: { data: { id: submissionId, choir_id: 'choir-1', assignment_id: 'assignment-1', member_id: 'member-1', current_file_version_id: fileVersionId }, error: null },
      assignments: { data: { id: 'assignment-1', title: 'Take' }, error: null },
      assignment_submission_history: { data: null, error: null, count: 1 },
      choir_member_roles: { data: [], error: null },
    };
    mocks.createTenantServiceClient.mockResolvedValue({
      rpc: vi.fn(async () => ({ data: true, error: null })),
      from(table: string) {
        const result = results[table];
        const chain: Record<string, unknown> = {};
        for (const method of ['select','eq','in','limit','order']) chain[method] = vi.fn(() => chain);
        chain.maybeSingle = vi.fn(async () => result);
        chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
        return chain;
      },
    });
    const response = await POST(new Request('http://local/api/assignment-submissions/upload', {
      method: 'POST', headers: { Authorization: 'Bearer access-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'notify_private_upload', submissionId, fileVersionId }),
    }));
    expect(response.status).toBe(204);
    expect(mocks.sendAssignmentSubmittedPush).toHaveBeenCalledWith({
      assignmentId: 'assignment-1', assignmentTitle: 'Take', submitterName: 'Ada Singer',
      targetMemberIds: [], isResubmission: true,
    });
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
