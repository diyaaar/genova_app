import { describe, expect, it } from 'vitest';

import {
  createNotificationDeepLink,
  resolveNotificationDeepLink,
  type NotificationEvent,
} from './notification-deep-link';

const NOTIFICATION_ID = '123e4567-e89b-42d3-a456-426614174000';
const ENTITY_ID = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const SECOND_ENTITY_ID = '6ba7b811-9dad-41d1-80b4-00c04fd430c8';
const AT = '2026-09-19T08:00:00Z';

describe('notification deep-link contract', () => {
  const cases: Array<{
    event: NotificationEvent;
    path: string;
    owner: 'web' | 'native';
    availability: 'available' | 'unavailable';
    routeFamily: string;
  }> = [
    {
      event: { type: 'profile_change_request_reviewed', status: 'approved' },
      path: '/profil/degisiklikler',
      owner: 'web',
      availability: 'available',
      routeFamily: 'profile-change-requests',
    },
    {
      event: { type: 'announcement_published', announcementId: ENTITY_ID },
      path: `/announcements/${ENTITY_ID}`,
      owner: 'web',
      availability: 'available',
      routeFamily: 'announcement-detail',
    },
    {
      event: { type: 'rehearsal_created', rehearsalId: ENTITY_ID, rehearsalDate: '2026-09-20' },
      path: '/devamsizlik?date=2026-09-20',
      owner: 'web',
      availability: 'available',
      routeFamily: 'attendance',
    },
    {
      event: { type: 'assignment_created', assignmentId: ENTITY_ID },
      path: `/odevler/${ENTITY_ID}`,
      owner: 'native',
      availability: 'unavailable',
      routeFamily: 'assignments',
    },
    {
      event: { type: 'assignment_submitted', assignmentId: ENTITY_ID, isResubmission: false },
      path: `/odevler/${ENTITY_ID}`,
      owner: 'native',
      availability: 'unavailable',
      routeFamily: 'assignments',
    },
    {
      event: { type: 'repertoire_assignment_created', songId: ENTITY_ID, partName: 'Soprano' },
      path: `/repertuvar/${ENTITY_ID}`,
      owner: 'native',
      availability: 'available',
      routeFamily: 'repertoire',
    },
    {
      event: { type: 'assignment_reviewed', assignmentId: ENTITY_ID, status: 'rejected' },
      path: `/odevler/${ENTITY_ID}`,
      owner: 'native',
      availability: 'unavailable',
      routeFamily: 'assignments',
    },
  ];

  it.each(cases)('creates canonical routing for $event.type', ({ event, path, owner, availability, routeFamily }) => {
    const result = createNotificationDeepLink(event, { notificationId: NOTIFICATION_ID, at: AT });

    expect(result).toMatchObject({
      kind: 'accepted',
      notificationType: event.type,
      notificationId: NOTIFICATION_ID,
      dedupeKey: NOTIFICATION_ID,
      canonicalPath: path,
      owner,
      availability,
      routeFamily,
      requiresAuthorizationRecheck: true,
    });
    expect(result.data).toEqual({ ...event, notificationId: NOTIFICATION_ID, at: AT });
    expect(result.canonicalPath).not.toContain('aid=');
  });

  it('lets the current native availability policy change without changing the event contract', () => {
    const result = createNotificationDeepLink(
      { type: 'assignment_created', assignmentId: ENTITY_ID },
      { notificationId: NOTIFICATION_ID, at: AT },
      { availableNativeRoutes: ['home', 'repertoire', 'assignments'] },
    );

    expect(result).toMatchObject({ owner: 'native', availability: 'available', routeFamily: 'assignments' });
  });

  it('normalizes accepted UUIDs before deriving a route', () => {
    const result = resolveNotificationDeepLink({
      type: 'announcement_published',
      announcementId: ENTITY_ID.toUpperCase(),
      notificationId: NOTIFICATION_ID.toUpperCase(),
      at: AT,
    });

    expect(result).toMatchObject({
      kind: 'accepted',
      notificationId: NOTIFICATION_ID,
      canonicalPath: `/announcements/${ENTITY_ID}`,
    });
  });

  it.each([
    [{ ...baseData(), type: 'unknown' }, 'unsupported-type'],
    [{ ...baseData(), notificationId: 'delivery-1' }, 'invalid-delivery-id'],
    [{ ...baseData(), at: '2026-09-19T08:00:00.000Z' }, 'invalid-timestamp'],
    [{ ...baseData(), announcementId: 'not-a-uuid' }, 'invalid-identifier'],
    [{ ...baseData(), type: 'rehearsal_created', rehearsalId: ENTITY_ID, rehearsalDate: '2026-02-30' }, 'invalid-date'],
    [{ ...baseData(), type: 'profile_change_request_reviewed', status: 'pending' }, 'invalid-status'],
    [{ ...baseData(), url: 'https://evil.example/path' }, 'forbidden-routing-field'],
    [{ ...baseData(), accessToken: 'secret' }, 'forbidden-routing-field'],
    [null, 'invalid-payload'],
  ])('rejects malformed or override input %#', (input, reasonCode) => {
    expect(resolveNotificationDeepLink(input)).toEqual({ kind: 'rejected', reasonCode });
  });

  it('fails closed when the configured route policy is invalid', () => {
    expect(resolveNotificationDeepLink(baseData(), { appOrigin: 'not-an-origin' })).toEqual({
      kind: 'rejected',
      reasonCode: 'route-policy-rejected',
      routeReasonCode: 'origin-not-allowed',
    });
  });

  it('uses the server-owned notification identity as the exact duplicate key', () => {
    const first = createNotificationDeepLink(
      { type: 'announcement_published', announcementId: ENTITY_ID },
      { notificationId: NOTIFICATION_ID, at: AT },
    );
    const duplicate = resolveNotificationDeepLink(first.data);
    const distinct = createNotificationDeepLink(
      { type: 'announcement_published', announcementId: ENTITY_ID },
      { notificationId: SECOND_ENTITY_ID, at: AT },
    );

    expect(duplicate).toMatchObject({ kind: 'accepted', dedupeKey: first.dedupeKey });
    expect(distinct.dedupeKey).not.toBe(first.dedupeKey);
  });

  it('throws when a producer attempts to create invalid routing data', () => {
    expect(() => createNotificationDeepLink(
      { type: 'announcement_published', announcementId: 'bad-id' },
      { notificationId: NOTIFICATION_ID, at: AT },
    )).toThrow('Invalid notification deep link: invalid-identifier');
  });
});

function baseData() {
  return {
    type: 'announcement_published',
    announcementId: ENTITY_ID,
    notificationId: NOTIFICATION_ID,
    at: AT,
  };
}
