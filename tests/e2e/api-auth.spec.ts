import { expect, test } from '@playwright/test';

const protectedPostEndpoints = [
  '/api/announcements/delete',
  '/api/announcements/publish',
  '/api/announcements/update',
  '/api/assignment-submissions/delete',
  '/api/assignment-submissions/hide-review',
  '/api/assignment-submissions/migrate-storage',
  '/api/assignment-submissions/review',
  '/api/assignment-submissions/update-note',
  '/api/assignment-submissions/upload',
  '/api/assignment-submissions/withdraw',
  '/api/assignments/create',
  '/api/assignments/delete',
  '/api/assignments/lock',
  '/api/assignments/update',
  '/api/drive-file-token',
  '/api/profile-change-requests/review',
  '/api/profile-change-requests/submit',
  '/api/profile-photo',
  '/api/push/subscribe',
  '/api/push/unsubscribe',
  '/api/rehearsals/attendance/finalize-past',
  '/api/rehearsals/attendance/update',
  '/api/rehearsals/create',
  '/api/rehearsals/delete',
  '/api/rehearsals/update',
  '/api/repertoire/assignments/update',
];

test('every mutation endpoint rejects an anonymous request before changing state', async ({ request }) => {
  for (const endpoint of protectedPostEndpoints) {
    const response = await request.post(endpoint, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status(), endpoint).toBe(401);
  }
});

test('the signed Drive proxy never serves a file without a valid token', async ({ request }) => {
  const missingToken = await request.get('/api/drive-file/file_123');
  const malformedId = await request.get('/api/drive-file/file%3Cbad%3E');
  const invalidToken = await request.get('/api/drive-file/file_123?token=not-a-token');

  expect(missingToken.status()).toBe(401);
  expect(malformedId.status()).toBe(400);
  expect(invalidToken.status()).toBe(401);
});
