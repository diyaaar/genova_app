export const MAIN_NOTIFICATIONS_LAST_SEEN_PREFIX = 'main_notifications_last_seen_at:';
export const MAIN_NOTIFICATIONS_CACHE_PREFIX = 'genova.main-notifications.v1';

/** Removes tenant-derived notification payloads and read markers on switch/sign-out. */
export function clearMainNotificationCaches() {
  if (typeof window === 'undefined') return;

  try {
    const prefixes = [`${MAIN_NOTIFICATIONS_CACHE_PREFIX}:`, MAIN_NOTIFICATIONS_LAST_SEEN_PREFIX];
    for (let index = window.localStorage.length - 1; index >= 0; index -= 1) {
      const key = window.localStorage.key(index);
      if (key && prefixes.some((prefix) => key.startsWith(prefix))) {
        window.localStorage.removeItem(key);
      }
    }
  } catch {
    // Tenant authorization does not depend on optional browser cache cleanup.
  }
}
