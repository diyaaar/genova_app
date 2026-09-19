import {
  resolveNotificationDeepLink,
  type AcceptedNotificationDeepLink,
} from '@shared/notification-deep-link';

export type NotificationTapDecision =
  | { kind: 'open'; destination: AcceptedNotificationDeepLink }
  | { kind: 'duplicate' }
  | { kind: 'error'; message: string };

/** Process-local tap resolver. Platform storage/eviction belongs to the later token channel. */
export function createNotificationTapResolver() {
  const openedIds = new Set<string>();

  return (data: unknown): NotificationTapDecision => {
    const decision = resolveNotificationDeepLink(data);
    if (decision.kind === 'rejected') {
      return { kind: 'error', message: 'Bildirim bağlantısı geçersiz veya artık desteklenmiyor.' };
    }
    if (openedIds.has(decision.dedupeKey)) return { kind: 'duplicate' };
    openedIds.add(decision.dedupeKey);
    if (decision.availability === 'unavailable') {
      return { kind: 'error', message: 'Bu bildirim hedefi mobil uygulamada henüz kullanılamıyor.' };
    }
    return { kind: 'open', destination: decision };
  };
}
