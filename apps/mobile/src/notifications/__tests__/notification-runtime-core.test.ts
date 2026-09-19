import { createNotificationTapResolver } from '../notification-runtime-core';

const NOTIFICATION_ID = '123e4567-e89b-42d3-a456-426614174000';
const ENTITY_ID = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';

function data(overrides: Record<string, unknown> = {}) {
  return {
    type: 'announcement_published',
    announcementId: ENTITY_ID,
    notificationId: NOTIFICATION_ID,
    at: '2026-09-19T08:00:00Z',
    ...overrides,
  };
}

describe('native notification tap resolver', () => {
  it('opens one canonical destination and suppresses the exact duplicate', () => {
    const resolve = createNotificationTapResolver();

    expect(resolve(data())).toEqual({
      kind: 'open',
      destination: expect.objectContaining({
        canonicalPath: `/announcements/${ENTITY_ID}`,
        owner: 'web',
        dedupeKey: NOTIFICATION_ID,
      }),
    });
    expect(resolve(data())).toEqual({ kind: 'duplicate' });
  });

  it('fails visibly for a currently unavailable native destination', () => {
    const resolve = createNotificationTapResolver();

    expect(resolve(data({
      type: 'assignment_created',
      assignmentId: ENTITY_ID,
      announcementId: undefined,
    }))).toEqual({
      kind: 'error',
      message: 'Bu bildirim hedefi mobil uygulamada henüz kullanılamıyor.',
    });
  });

  it('fails visibly for hostile routing fields without opening or reserving the identity', () => {
    const resolve = createNotificationTapResolver();
    expect(resolve({ ...data(), url: 'https://evil.example' })).toEqual({
      kind: 'error',
      message: 'Bildirim bağlantısı geçersiz veya artık desteklenmiyor.',
    });
    expect(resolve(data())).toMatchObject({ kind: 'open' });
  });
});
