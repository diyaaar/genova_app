import { beforeEach, describe, expect, it } from 'vitest';

import { clearMainNotificationCaches } from '@/lib/notification-cache';

describe('main notification cache cleanup', () => {
  beforeEach(() => window.localStorage.clear());

  it('removes tenant notification data without deleting unrelated preferences', () => {
    window.localStorage.setItem('genova.main-notifications.v1:member-a:chef', '{}');
    window.localStorage.setItem('main_notifications_last_seen_at:member-a', '123');
    window.localStorage.setItem('unrelated-preference', 'keep');

    clearMainNotificationCaches();

    expect(window.localStorage.getItem('genova.main-notifications.v1:member-a:chef')).toBeNull();
    expect(window.localStorage.getItem('main_notifications_last_seen_at:member-a')).toBeNull();
    expect(window.localStorage.getItem('unrelated-preference')).toBe('keep');
  });
});
