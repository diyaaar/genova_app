import {
  classifyAppUrl,
  type AppRoutePolicy,
  type NativeRouteFamily,
  type RouteAvailability,
  type WebRouteFamily,
} from './mobile-webview-bridge';

export type NotificationEvent =
  | { type: 'profile_change_request_reviewed'; status: 'approved' | 'rejected' }
  | { type: 'announcement_published'; announcementId: string }
  | { type: 'rehearsal_created'; rehearsalId: string; rehearsalDate: string | null }
  | { type: 'assignment_created'; assignmentId: string }
  | { type: 'assignment_submitted'; assignmentId: string; isResubmission: boolean }
  | { type: 'repertoire_assignment_created'; songId: string; partName: string | null }
  | { type: 'assignment_reviewed'; assignmentId: string; status: 'approved' | 'rejected' };

export interface NotificationRoutingMetadata {
  notificationId: string;
  at: string;
}

export type NotificationRoutingData = NotificationEvent & NotificationRoutingMetadata;

export type NotificationDeepLinkReason =
  | 'forbidden-routing-field'
  | 'invalid-date'
  | 'invalid-delivery-id'
  | 'invalid-identifier'
  | 'invalid-payload'
  | 'invalid-status'
  | 'invalid-timestamp'
  | 'route-policy-rejected'
  | 'unsupported-type';

export interface AcceptedNotificationDeepLink {
  kind: 'accepted';
  notificationType: NotificationEvent['type'];
  notificationId: string;
  dedupeKey: string;
  canonicalPath: string;
  owner: 'web' | 'native';
  availability: RouteAvailability;
  routeFamily: WebRouteFamily | NativeRouteFamily;
  requiresAuthorizationRecheck: true;
}

export interface RejectedNotificationDeepLink {
  kind: 'rejected';
  reasonCode: NotificationDeepLinkReason;
  routeReasonCode?: string;
}

export type NotificationDeepLinkDecision =
  | AcceptedNotificationDeepLink
  | RejectedNotificationDeepLink;

export interface CreatedNotificationDeepLink extends AcceptedNotificationDeepLink {
  data: NotificationRoutingData;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const ISO_SECOND_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const FORBIDDEN_ROUTING_FIELDS = [
  'accessToken',
  'choirId',
  'memberId',
  'path',
  'refreshToken',
  'route',
  'url',
  'userId',
] as const;

function rejected(reasonCode: NotificationDeepLinkReason, routeReasonCode?: string): RejectedNotificationDeepLink {
  return routeReasonCode ? { kind: 'rejected', reasonCode, routeReasonCode } : { kind: 'rejected', reasonCode };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isExactSecondTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_SECOND_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().replace('.000Z', 'Z') === value;
}

function pathForEvent(
  value: Record<string, unknown>,
): { event: NotificationEvent; path: string } | RejectedNotificationDeepLink {
  switch (value.type) {
    case 'profile_change_request_reviewed': {
      if (value.status !== 'approved' && value.status !== 'rejected') return rejected('invalid-status');
      return {
        event: { type: value.type, status: value.status },
        path: '/profil/degisiklikler',
      };
    }
    case 'announcement_published': {
      const announcementId = normalizeUuid(value.announcementId);
      if (!announcementId) return rejected('invalid-identifier');
      return {
        event: { type: value.type, announcementId },
        path: `/announcements/${announcementId}`,
      };
    }
    case 'rehearsal_created': {
      const rehearsalId = normalizeUuid(value.rehearsalId);
      if (!rehearsalId) return rejected('invalid-identifier');
      if (value.rehearsalDate !== null && typeof value.rehearsalDate !== 'string') return rejected('invalid-date');
      if (typeof value.rehearsalDate === 'string' && !isRealDate(value.rehearsalDate)) return rejected('invalid-date');
      const rehearsalDate = value.rehearsalDate as string | null;
      return {
        event: { type: value.type, rehearsalId, rehearsalDate },
        path: rehearsalDate ? `/devamsizlik?date=${rehearsalDate}` : '/devamsizlik',
      };
    }
    case 'assignment_created': {
      const assignmentId = normalizeUuid(value.assignmentId);
      if (!assignmentId) return rejected('invalid-identifier');
      return {
        event: { type: value.type, assignmentId },
        path: `/odevler/${assignmentId}`,
      };
    }
    case 'assignment_submitted': {
      const assignmentId = normalizeUuid(value.assignmentId);
      if (!assignmentId) return rejected('invalid-identifier');
      if (typeof value.isResubmission !== 'boolean') return rejected('invalid-status');
      return {
        event: { type: value.type, assignmentId, isResubmission: value.isResubmission },
        path: `/odevler/${assignmentId}`,
      };
    }
    case 'repertoire_assignment_created': {
      const songId = normalizeUuid(value.songId);
      if (!songId) return rejected('invalid-identifier');
      if (value.partName !== null && typeof value.partName !== 'string') return rejected('invalid-payload');
      return {
        event: { type: value.type, songId, partName: value.partName as string | null },
        path: `/repertuvar/${songId}`,
      };
    }
    case 'assignment_reviewed': {
      const assignmentId = normalizeUuid(value.assignmentId);
      if (!assignmentId) return rejected('invalid-identifier');
      if (value.status !== 'approved' && value.status !== 'rejected') return rejected('invalid-status');
      return {
        event: { type: value.type, assignmentId, status: value.status },
        path: `/odevler/${assignmentId}`,
      };
    }
    default:
      return rejected('unsupported-type');
  }
}

/**
 * Resolves untrusted notification routing data without navigating or authorizing access.
 * Destinations must recheck the current session, active choir and role at tap time.
 */
export function resolveNotificationDeepLink(
  input: unknown,
  policy: AppRoutePolicy = {},
): NotificationDeepLinkDecision {
  if (!isRecord(input)) return rejected('invalid-payload');
  if (FORBIDDEN_ROUTING_FIELDS.some((field) => field in input)) return rejected('forbidden-routing-field');
  if (typeof input.type !== 'string') return rejected('unsupported-type');

  const notificationId = normalizeUuid(input.notificationId);
  if (!notificationId) return rejected('invalid-delivery-id');
  if (!isExactSecondTimestamp(input.at)) return rejected('invalid-timestamp');

  const eventPath = pathForEvent(input);
  if ('kind' in eventPath) return eventPath;

  const route = classifyAppUrl(eventPath.path, policy);
  if (route.kind === 'rejected') return rejected('route-policy-rejected', route.reasonCode);

  return {
    kind: 'accepted',
    notificationType: eventPath.event.type,
    notificationId,
    dedupeKey: notificationId,
    canonicalPath: route.canonicalPath,
    owner: route.owner,
    availability: route.availability,
    routeFamily: route.routeFamily,
    requiresAuthorizationRecheck: true,
  };
}

/** Creates server-owned routing data and verifies it against the same consumer contract. */
export function createNotificationDeepLink(
  event: NotificationEvent,
  metadata: NotificationRoutingMetadata,
  policy: AppRoutePolicy = {},
): CreatedNotificationDeepLink {
  const candidate = { ...event, ...metadata } as NotificationRoutingData;
  const decision = resolveNotificationDeepLink(candidate, policy);
  if (decision.kind === 'rejected') {
    throw new Error(`Invalid notification deep link: ${decision.reasonCode}`);
  }
  return { ...decision, data: candidate };
}
