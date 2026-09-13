import { INVITE_TOKEN_PATTERN } from './invite-token-store';

export const APP_WEB_ORIGIN = 'https://app.genesinovachoir.com';
export const BRIDGE_CHANNEL = 'genova.mobile.webview';
export const BRIDGE_VERSION = 1 as const;
export const MAX_APP_URL_CHARS = 2_048;
export const MAX_BRIDGE_MESSAGE_BYTES = 16 * 1_024;

export type WebRouteFamily =
  | 'announcements'
  | 'announcement-detail'
  | 'choristers'
  | 'chorister-detail'
  | 'invitations'
  | 'profile'
  | 'profile-edit'
  | 'profile-change-requests'
  | 'attendance';

export type NativeRouteFamily = 'home' | 'repertoire' | 'chat' | 'assignments';
export type BlockedRouteFamily = 'auth' | 'unknown';
export type AppRouteFamily = WebRouteFamily | NativeRouteFamily | BlockedRouteFamily;
export type RouteAvailability = 'available' | 'unavailable';

export type RouteReasonCode =
  | 'absolute-url-required'
  | 'ambiguous-path'
  | 'control-character'
  | 'credentials-not-allowed'
  | 'encoded-path-not-allowed'
  | 'fragment-not-allowed'
  | 'initial-route-not-web'
  | 'input-too-long'
  | 'invalid-date'
  | 'invalid-url'
  | 'non-canonical-path'
  | 'origin-not-allowed'
  | 'port-not-allowed'
  | 'query-not-allowed'
  | 'route-not-allowed'
  | 'scheme-not-allowed';

export interface AcceptedAppRoute {
  kind: 'accepted';
  owner: 'web' | 'native';
  availability: RouteAvailability;
  routeFamily: WebRouteFamily | NativeRouteFamily;
  canonicalPath: string;
}

export interface RejectedAppRoute {
  kind: 'rejected';
  routeFamily: AppRouteFamily;
  reasonCode: RouteReasonCode;
}

export type AppRouteDecision = AcceptedAppRoute | RejectedAppRoute;

export interface AppRoutePolicy {
  appOrigin?: string;
  availableNativeRoutes?: readonly NativeRouteFamily[];
  protectedFileOrigins?: readonly string[];
}

interface ParsedRouteInput {
  url: URL;
  hasQueryDelimiter: boolean;
}

const DEFAULT_NATIVE_AVAILABILITY: readonly NativeRouteFamily[] = ['home', 'repertoire'];
const WEB_ROUTE_FAMILIES: readonly WebRouteFamily[] = [
  'announcements',
  'announcement-detail',
  'choristers',
  'chorister-detail',
  'invitations',
  'profile',
  'profile-edit',
  'profile-change-requests',
  'attendance',
];
const NATIVE_ROUTE_FAMILIES: readonly NativeRouteFamily[] = ['home', 'repertoire', 'chat', 'assignments'];
const APP_ROUTE_FAMILIES: readonly AppRouteFamily[] = [...WEB_ROUTE_FAMILIES, ...NATIVE_ROUTE_FAMILIES, 'auth', 'unknown'];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;
const STABLE_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const ACCESS_TOKEN_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const MIME_PATTERN = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/i;
const WHITESPACE_OR_CONTROL_PATTERN = /[\u0000-\u0020\u007f]/u;
const CONTROL_PATTERN = /[\u0000-\u001f\u007f]/u;
const RAW_TRAVERSAL_PATTERN = /(?:^|\/)\.{1,2}(?:\/|$)/u;

function rejected(routeFamily: AppRouteFamily, reasonCode: RouteReasonCode): RejectedAppRoute {
  return { kind: 'rejected', routeFamily, reasonCode };
}

function configuredOrigin(policy: AppRoutePolicy): URL | null {
  try {
    const origin = new URL(policy.appOrigin ?? APP_WEB_ORIGIN);
    if (!['http:', 'https:'].includes(origin.protocol)) return null;
    if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) return null;
    return origin;
  } catch {
    return null;
  }
}

function configuredProtectedFileOrigins(policy: AppRoutePolicy): Set<string> {
  const origins = new Set<string>();
  for (const value of policy.protectedFileOrigins ?? []) {
    try {
      const url = new URL(value);
      const loopbackHttp = url.protocol === 'http:' && url.hostname === '127.0.0.1' && Boolean(url.port);
      if ((url.protocol === 'https:' || loopbackHttp) && !url.username && !url.password
        && url.pathname === '/' && !url.search && !url.hash) origins.add(url.origin);
    } catch {
      // Invalid optional origins never widen the accepted set.
    }
  }
  return origins;
}

function absoluteAuthority(input: string): string | null {
  return input.match(/^[A-Za-z][A-Za-z0-9+.-]*:\/\/([^/?#]*)/u)?.[1] ?? null;
}

function explicitPort(input: string): string | null {
  const authority = absoluteAuthority(input);
  if (authority === null) return null;
  const host = authority.slice(authority.lastIndexOf('@') + 1);
  if (host.startsWith('[')) {
    const closing = host.indexOf(']');
    return closing >= 0 && host[closing + 1] === ':' ? host.slice(closing + 2) : null;
  }
  const colon = host.lastIndexOf(':');
  return colon >= 0 ? host.slice(colon + 1) : null;
}

function rawPath(input: string): string {
  const authority = absoluteAuthority(input);
  const afterAuthority = authority === null ? input : input.slice(input.indexOf(authority) + authority.length);
  return (afterAuthority.split(/[?#]/u)[0] || '/');
}

function parseRouteInput(input: string, policy: AppRoutePolicy): ParsedRouteInput | RejectedAppRoute {
  if (typeof input !== 'string' || input.length === 0) return rejected('unknown', 'invalid-url');
  if (input.length > MAX_APP_URL_CHARS) return rejected('unknown', 'input-too-long');
  if (WHITESPACE_OR_CONTROL_PATTERN.test(input)) return rejected('unknown', 'control-character');
  if (input.includes('\\') || input.startsWith('//')) return rejected('unknown', 'ambiguous-path');
  if (input.includes('#')) return rejected('unknown', 'fragment-not-allowed');

  const appOrigin = configuredOrigin(policy);
  if (!appOrigin) return rejected('unknown', 'origin-not-allowed');
  const absolute = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(input);
  if (!absolute && !input.startsWith('/')) return rejected('unknown', 'absolute-url-required');

  const sourcePath = rawPath(input);
  if (/%/u.test(sourcePath)) return rejected('unknown', 'encoded-path-not-allowed');
  if (RAW_TRAVERSAL_PATTERN.test(sourcePath) || /\/{2,}/u.test(sourcePath)) {
    return rejected('unknown', 'ambiguous-path');
  }

  let url: URL;
  try {
    url = new URL(input, appOrigin);
  } catch {
    return rejected('unknown', 'invalid-url');
  }
  if (url.username || url.password) return rejected('unknown', 'credentials-not-allowed');

  const configuredPort = explicitPort(policy.appOrigin ?? APP_WEB_ORIGIN);
  const inputPort = explicitPort(input);
  if (absolute && inputPort !== configuredPort) return rejected('unknown', 'port-not-allowed');
  if (url.origin !== appOrigin.origin) return rejected('unknown', 'origin-not-allowed');
  if (url.pathname.length > 1 && url.pathname.endsWith('/')) return rejected('unknown', 'non-canonical-path');
  if (url.pathname !== sourcePath) return rejected('unknown', 'non-canonical-path');

  return { url, hasQueryDelimiter: input.includes('?') };
}

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year === undefined || month === undefined || day === undefined) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function routeFamilyForPath(pathname: string): AppRouteFamily {
  if (pathname === '/announcements') return 'announcements';
  if (/^\/announcements\/[0-9a-f-]+$/u.test(pathname)) return 'announcement-detail';
  if (pathname === '/koristler/davetler') return 'invitations';
  if (pathname === '/koristler') return 'choristers';
  if (/^\/koristler\/[0-9a-f-]+$/u.test(pathname)) return 'chorister-detail';
  if (pathname === '/profil') return 'profile';
  if (pathname === '/profil/duzenle') return 'profile-edit';
  if (pathname === '/profil/degisiklikler') return 'profile-change-requests';
  if (pathname === '/devamsizlik') return 'attendance';
  if (pathname === '/') return 'home';
  if (/^\/repertuvar(?:\/[a-z0-9_-]+)*$/u.test(pathname)) return 'repertoire';
  if (/^\/chat(?:\/[a-z0-9_-]+)*$/u.test(pathname)) return 'chat';
  if (/^\/odevler(?:\/[a-z0-9_-]+)*$/u.test(pathname)) return 'assignments';
  if (pathname === '/login' || pathname === '/invite' || pathname === '/reset-password' || /^\/auth(?:\/|$)/u.test(pathname)) {
    return 'auth';
  }
  return 'unknown';
}

function hasValidRouteShape(routeFamily: AppRouteFamily, pathname: string): boolean {
  if (routeFamily === 'announcement-detail' || routeFamily === 'chorister-detail') {
    const id = pathname.slice(pathname.lastIndexOf('/') + 1);
    return UUID_PATTERN.test(id);
  }
  return true;
}

function validateQuery(routeFamily: AppRouteFamily, url: URL, hasQueryDelimiter: boolean): RouteReasonCode | null {
  if (routeFamily !== 'attendance') return hasQueryDelimiter ? 'query-not-allowed' : null;
  if (!hasQueryDelimiter) return null;
  if (!url.search) return 'query-not-allowed';
  const entries = [...url.searchParams.entries()];
  if (entries.length !== 1 || entries[0]?.[0] !== 'date') return 'query-not-allowed';
  const date = entries[0][1];
  if (!isRealDate(date)) return 'invalid-date';
  return url.search === `?date=${date}` ? null : 'query-not-allowed';
}

/** Classifies an app URL without navigating, authorizing or invoking a capability. */
export function classifyAppUrl(input: string, policy: AppRoutePolicy = {}): AppRouteDecision {
  const parsed = parseRouteInput(input, policy);
  if ('kind' in parsed) return parsed;

  const routeFamily = routeFamilyForPath(parsed.url.pathname);
  if (!hasValidRouteShape(routeFamily, parsed.url.pathname)) return rejected(routeFamily, 'route-not-allowed');
  const queryError = validateQuery(routeFamily, parsed.url, parsed.hasQueryDelimiter);
  if (queryError) return rejected(routeFamily, queryError);
  if (routeFamily === 'auth' || routeFamily === 'unknown') return rejected(routeFamily, 'route-not-allowed');

  const canonicalPath = `${parsed.url.pathname}${parsed.url.search}`;
  if (WEB_ROUTE_FAMILIES.includes(routeFamily as WebRouteFamily)) {
    return {
      kind: 'accepted',
      owner: 'web',
      availability: 'available',
      routeFamily: routeFamily as WebRouteFamily,
      canonicalPath,
    };
  }
  const nativeFamily = routeFamily as NativeRouteFamily;
  const available = policy.availableNativeRoutes ?? DEFAULT_NATIVE_AVAILABILITY;
  return {
    kind: 'accepted',
    owner: 'native',
    availability: available.includes(nativeFamily) ? 'available' : 'unavailable',
    routeFamily: nativeFamily,
    canonicalPath,
  };
}

/** Applies the same route policy to an absolute initial source and additionally requires web ownership. */
export function validateInitialWebViewSource(input: string, policy: AppRoutePolicy = {}): AppRouteDecision {
  if (!/^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(input)) return rejected('unknown', 'absolute-url-required');
  const decision = classifyAppUrl(input, policy);
  if (decision.kind === 'rejected' || decision.owner === 'web') return decision;
  return rejected(decision.routeFamily, 'initial-route-not-web');
}

export type ExternalUrlDecision =
  | { kind: 'accepted'; canonicalUrl: string; displayHost: string }
  | { kind: 'rejected'; reasonCode: RouteReasonCode };

/** Parses an external destination without opening it; callers still own confirmation and launch. */
export function classifyExternalUrl(input: string): ExternalUrlDecision {
  if (typeof input !== 'string' || input.length === 0) return { kind: 'rejected', reasonCode: 'invalid-url' };
  if (input.length > MAX_APP_URL_CHARS) return { kind: 'rejected', reasonCode: 'input-too-long' };
  if (WHITESPACE_OR_CONTROL_PATTERN.test(input)) return { kind: 'rejected', reasonCode: 'control-character' };
  if (input.includes('\\')) return { kind: 'rejected', reasonCode: 'ambiguous-path' };
  if (!/^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(input)) {
    const scheme = input.match(/^([A-Za-z][A-Za-z0-9+.-]*):/u)?.[1];
    return { kind: 'rejected', reasonCode: scheme ? 'scheme-not-allowed' : 'absolute-url-required' };
  }
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { kind: 'rejected', reasonCode: 'invalid-url' };
  }
  if (url.protocol !== 'https:') return { kind: 'rejected', reasonCode: 'scheme-not-allowed' };
  if (url.username || url.password) return { kind: 'rejected', reasonCode: 'credentials-not-allowed' };
  if (explicitPort(input) !== null) return { kind: 'rejected', reasonCode: 'port-not-allowed' };
  return { kind: 'accepted', canonicalUrl: url.href, displayHost: url.hostname };
}

export type BridgeDirection = 'web-to-native' | 'native-to-web';

export interface BridgePayloads {
  'bridge.ready': { supportedVersions: [1]; routeFamily: WebRouteFamily };
  'bridge.challenge': { nonce: string };
  'bridge.challenge.ack': { nonce: string };
  'context.apply': { accessToken: string; expiresAt: number; userId: string; choirId: string; memberId: string };
  'context.clear': { reason: 'sign-out' | 'choir-switch' | 'identity-change' | 'expired' | 'process-restart' | 'native-stop' };
  'context.renew.request': { reason: 'expiring' | 'unauthorized' };
  'navigation.state': { routeFamily: WebRouteFamily; canGoBackWithinWeb: boolean };
  'navigation.native.request': { path: string };
  'navigation.external.request': { url: string };
  'navigation.exit.request': { reason: 'back-root' | 'close' | 'auth-required' };
  'auth.sign-out.request': Record<string, never>;
  'auth.password.open': Record<string, never>;
  'theme.set.request': { scheme: 'light' | 'dark' | 'system' };
  'theme.apply': { resolved: 'light' | 'dark'; preference: 'light' | 'dark' | 'system' };
  'clipboard.write.request': { kind: 'invitation-link'; text: string };
  'file.open.request': { url: string; disposition: 'view' | 'download'; fileName?: string; mimeType?: string };
  'command.result': { requestId: string; ok: boolean; code: string };
  'bridge.error': { requestId?: string; code: string };
}

export type BridgeMessageType = keyof BridgePayloads;
export type BridgeEnvelope = {
  [Type in BridgeMessageType]: {
    channel: typeof BRIDGE_CHANNEL;
    version: typeof BRIDGE_VERSION;
    id: string;
    instanceId: string;
    tenantEpoch: number;
    type: Type;
    payload: BridgePayloads[Type];
  }
}[BridgeMessageType];

export type BridgeReasonCode =
  | 'duplicate-message'
  | 'invalid-diagnostic'
  | 'invalid-envelope'
  | 'invalid-json'
  | 'invalid-message-id'
  | 'invalid-payload'
  | 'message-too-large'
  | 'replay-capacity'
  | 'source-not-allowed'
  | 'stale-tenant'
  | 'unknown-message-type'
  | 'wrong-channel'
  | 'wrong-direction'
  | 'wrong-instance'
  | 'wrong-version';

export type BridgeParseResult =
  | { ok: true; value: BridgeEnvelope }
  | { ok: false; reasonCode: BridgeReasonCode };

export interface BridgeParseContext {
  direction: BridgeDirection;
  expectedInstanceId: string;
  expectedTenantEpoch: number;
  sourceUrl: string;
  routePolicy?: AppRoutePolicy;
  hasSeenMessageId?: (id: string) => boolean;
}

const WEB_TO_NATIVE_TYPES: readonly BridgeMessageType[] = [
  'bridge.ready', 'bridge.challenge.ack', 'context.renew.request', 'navigation.state',
  'navigation.native.request', 'navigation.external.request', 'navigation.exit.request',
  'auth.sign-out.request', 'auth.password.open', 'theme.set.request', 'clipboard.write.request',
  'file.open.request', 'bridge.error',
];
const NATIVE_TO_WEB_TYPES: readonly BridgeMessageType[] = [
  'bridge.challenge', 'context.apply', 'context.clear', 'theme.apply', 'command.result', 'bridge.error',
];
const ALL_MESSAGE_TYPES: readonly BridgeMessageType[] = Array.from(new Set([...WEB_TO_NATIVE_TYPES, ...NATIVE_TO_WEB_TYPES]));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const keys = Object.keys(value);
  return required.every((key) => Object.hasOwn(value, key))
    && keys.every((key) => required.includes(key) || optional.includes(key))
    && keys.length >= required.length;
}

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function isCorrelationId(value: unknown): value is string {
  return typeof value === 'string' && CORRELATION_ID_PATTERN.test(value);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isStableCode(value: unknown): value is string {
  return typeof value === 'string' && STABLE_CODE_PATTERN.test(value);
}

function isWebRouteFamily(value: unknown): value is WebRouteFamily {
  return isOneOf(value, WEB_ROUTE_FAMILIES);
}

function isInviteLink(value: unknown, policy: AppRoutePolicy): value is string {
  if (typeof value !== 'string' || value.length > MAX_APP_URL_CHARS || WHITESPACE_OR_CONTROL_PATTERN.test(value)) return false;
  const origin = configuredOrigin(policy);
  if (!origin || explicitPort(value) !== explicitPort(policy.appOrigin ?? APP_WEB_ORIGIN)) return false;
  try {
    const url = new URL(value);
    return url.origin === origin.origin
      && !url.username && !url.password && url.pathname === '/invite' && !url.search
      && url.hash.startsWith('#invite=') && INVITE_TOKEN_PATTERN.test(url.hash.slice('#invite='.length));
  } catch {
    return false;
  }
}

/** Revalidates a protected-file capability URL and returns its absolute canonical form. */
export function canonicalizeBridgeFileRequestUrl(value: unknown, policy: AppRoutePolicy = {}): string | null {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_APP_URL_CHARS) return null;
  if (WHITESPACE_OR_CONTROL_PATTERN.test(value) || value.includes('\\') || value.startsWith('//')) return null;
  const origin = configuredOrigin(policy);
  if (!origin) return null;
  try {
    const url = new URL(value, origin);
    const isRelative = value.startsWith('/');
    const sameOrigin = url.origin === origin.origin;
    const explicitlyAllowedOrigin = configuredProtectedFileOrigins(policy).has(url.origin);
    if (url.username || url.password || url.hash) return null;
    if (isRelative && !sameOrigin) return null;
    if (sameOrigin && explicitPort(value) !== explicitPort(policy.appOrigin ?? APP_WEB_ORIGIN)) return null;
    if (!sameOrigin && !explicitlyAllowedOrigin && (url.protocol !== 'https:' || explicitPort(value) !== null)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function isSafeFileRequestUrl(value: unknown, policy: AppRoutePolicy): value is string {
  return canonicalizeBridgeFileRequestUrl(value, policy) !== null;
}

function validPayload(type: BridgeMessageType, payload: Record<string, unknown>, policy: AppRoutePolicy): boolean {
  switch (type) {
    case 'bridge.ready':
      return hasExactKeys(payload, ['supportedVersions', 'routeFamily'])
        && Array.isArray(payload.supportedVersions) && payload.supportedVersions.length === 1
        && payload.supportedVersions[0] === BRIDGE_VERSION && isWebRouteFamily(payload.routeFamily);
    case 'bridge.challenge':
    case 'bridge.challenge.ack':
      return hasExactKeys(payload, ['nonce']) && typeof payload.nonce === 'string' && NONCE_PATTERN.test(payload.nonce);
    case 'context.apply':
      return hasExactKeys(payload, ['accessToken', 'expiresAt', 'userId', 'choirId', 'memberId'])
        && typeof payload.accessToken === 'string' && payload.accessToken.length <= 12_000
        && ACCESS_TOKEN_PATTERN.test(payload.accessToken)
        && Number.isSafeInteger(payload.expiresAt) && (payload.expiresAt as number) > 0
        && isUuid(payload.userId) && isUuid(payload.choirId) && isUuid(payload.memberId);
    case 'context.clear':
      return hasExactKeys(payload, ['reason'])
        && isOneOf(payload.reason, ['sign-out', 'choir-switch', 'identity-change', 'expired', 'process-restart', 'native-stop']);
    case 'context.renew.request':
      return hasExactKeys(payload, ['reason']) && isOneOf(payload.reason, ['expiring', 'unauthorized']);
    case 'navigation.state':
      return hasExactKeys(payload, ['routeFamily', 'canGoBackWithinWeb'])
        && isWebRouteFamily(payload.routeFamily) && typeof payload.canGoBackWithinWeb === 'boolean';
    case 'navigation.native.request': {
      if (!hasExactKeys(payload, ['path']) || typeof payload.path !== 'string') return false;
      const route = classifyAppUrl(payload.path, policy);
      return route.kind === 'accepted' && route.owner === 'native';
    }
    case 'navigation.external.request':
      return hasExactKeys(payload, ['url']) && typeof payload.url === 'string'
        && classifyExternalUrl(payload.url).kind === 'accepted';
    case 'navigation.exit.request':
      return hasExactKeys(payload, ['reason']) && isOneOf(payload.reason, ['back-root', 'close', 'auth-required']);
    case 'auth.sign-out.request':
    case 'auth.password.open':
      return hasExactKeys(payload, []);
    case 'theme.set.request':
      return hasExactKeys(payload, ['scheme']) && isOneOf(payload.scheme, ['light', 'dark', 'system']);
    case 'theme.apply':
      return hasExactKeys(payload, ['resolved', 'preference'])
        && isOneOf(payload.resolved, ['light', 'dark'])
        && isOneOf(payload.preference, ['light', 'dark', 'system']);
    case 'clipboard.write.request':
      return hasExactKeys(payload, ['kind', 'text']) && payload.kind === 'invitation-link'
        && isInviteLink(payload.text, policy);
    case 'file.open.request':
      return hasExactKeys(payload, ['url', 'disposition'], ['fileName', 'mimeType'])
        && isSafeFileRequestUrl(payload.url, policy)
        && isOneOf(payload.disposition, ['view', 'download'])
        && (payload.fileName === undefined || (typeof payload.fileName === 'string' && payload.fileName.length > 0
          && payload.fileName.length <= 255 && payload.fileName.trim() === payload.fileName
          && !CONTROL_PATTERN.test(payload.fileName)
          && !/[\\/]/u.test(payload.fileName)))
        && (payload.mimeType === undefined || (typeof payload.mimeType === 'string' && MIME_PATTERN.test(payload.mimeType)));
    case 'command.result':
      return hasExactKeys(payload, ['requestId', 'ok', 'code']) && isCorrelationId(payload.requestId)
        && typeof payload.ok === 'boolean' && isStableCode(payload.code);
    case 'bridge.error':
      return hasExactKeys(payload, ['code'], ['requestId']) && isStableCode(payload.code)
        && (payload.requestId === undefined || isCorrelationId(payload.requestId));
  }
}

function utf8ByteLength(input: string): number {
  let bytes = 0;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    if (code <= 0x7f) bytes += 1;
    else if (code <= 0x7ff) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < input.length
      && input.charCodeAt(index + 1) >= 0xdc00 && input.charCodeAt(index + 1) <= 0xdfff) {
      bytes += 4;
      index += 1;
    } else bytes += 3;
    if (bytes > MAX_BRIDGE_MESSAGE_BYTES) return bytes;
  }
  return bytes;
}

/** Validates one message and returns data only; it does not mutate replay state or perform the request. */
export function parseBridgeMessage(raw: string, context: BridgeParseContext): BridgeParseResult {
  if (typeof raw !== 'string') return { ok: false, reasonCode: 'invalid-envelope' };
  if (utf8ByteLength(raw) > MAX_BRIDGE_MESSAGE_BYTES) return { ok: false, reasonCode: 'message-too-large' };
  if (!isOneOf(context.direction, ['web-to-native', 'native-to-web'])) {
    return { ok: false, reasonCode: 'wrong-direction' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, reasonCode: 'invalid-json' };
  }
  if (!isRecord(parsed) || !hasExactKeys(parsed, ['channel', 'version', 'id', 'instanceId', 'tenantEpoch', 'type', 'payload'])) {
    return { ok: false, reasonCode: 'invalid-envelope' };
  }
  if (parsed.channel !== BRIDGE_CHANNEL) return { ok: false, reasonCode: 'wrong-channel' };
  if (parsed.version !== BRIDGE_VERSION) return { ok: false, reasonCode: 'wrong-version' };
  const source = validateInitialWebViewSource(context.sourceUrl, context.routePolicy);
  if (source.kind === 'rejected') return { ok: false, reasonCode: 'source-not-allowed' };
  if (!isCorrelationId(parsed.instanceId) || !isCorrelationId(context.expectedInstanceId)
    || parsed.instanceId !== context.expectedInstanceId) return { ok: false, reasonCode: 'wrong-instance' };
  if (!Number.isSafeInteger(parsed.tenantEpoch) || (parsed.tenantEpoch as number) < 0
    || !Number.isSafeInteger(context.expectedTenantEpoch) || context.expectedTenantEpoch < 0
    || parsed.tenantEpoch !== context.expectedTenantEpoch) return { ok: false, reasonCode: 'stale-tenant' };
  if (!isCorrelationId(parsed.id)) return { ok: false, reasonCode: 'invalid-message-id' };
  if (context.hasSeenMessageId?.(parsed.id)) return { ok: false, reasonCode: 'duplicate-message' };
  if (!isOneOf(parsed.type, ALL_MESSAGE_TYPES)) return { ok: false, reasonCode: 'unknown-message-type' };
  const directionTypes = context.direction === 'web-to-native' ? WEB_TO_NATIVE_TYPES : NATIVE_TO_WEB_TYPES;
  if (!directionTypes.includes(parsed.type)) return { ok: false, reasonCode: 'wrong-direction' };
  if (!isRecord(parsed.payload) || !validPayload(parsed.type, parsed.payload, context.routePolicy ?? {})) {
    return { ok: false, reasonCode: 'invalid-payload' };
  }
  return { ok: true, value: parsed as unknown as BridgeEnvelope };
}

export interface BridgeWorkStamp {
  readonly instanceId: string;
  readonly tenantEpoch: number;
}

export interface BridgeGuardState extends BridgeWorkStamp {
  capacity?: number;
}

const DEFAULT_REPLAY_CAPACITY = 1_024;
const MAX_REPLAY_CAPACITY = 4_096;

/** Binds queued work and replay IDs to one instance/tenant epoch; acceptance only mutates this guard. */
export class BridgeMessageGuard {
  readonly #capacity: number;
  #instanceId: string;
  #tenantEpoch: number;
  #seen = new Set<string>();

  constructor(state: BridgeGuardState) {
    const capacity = state.capacity ?? DEFAULT_REPLAY_CAPACITY;
    if (!isCorrelationId(state.instanceId) || !Number.isSafeInteger(state.tenantEpoch) || state.tenantEpoch < 0
      || !Number.isSafeInteger(capacity) || capacity < 1 || capacity > MAX_REPLAY_CAPACITY) {
      throw new TypeError('Invalid bridge guard configuration');
    }
    this.#instanceId = state.instanceId;
    this.#tenantEpoch = state.tenantEpoch;
    this.#capacity = capacity;
  }

  createWorkStamp(): BridgeWorkStamp {
    return Object.freeze({ instanceId: this.#instanceId, tenantEpoch: this.#tenantEpoch });
  }

  isWorkCurrent(stamp: BridgeWorkStamp): boolean {
    return stamp.instanceId === this.#instanceId && stamp.tenantEpoch === this.#tenantEpoch;
  }

  hasSeenMessageId(id: string): boolean {
    return this.#seen.has(id);
  }

  acceptMessage(id: string, stamp: BridgeWorkStamp = this.createWorkStamp()): { ok: true } | { ok: false; reasonCode: BridgeReasonCode } {
    if (stamp.tenantEpoch !== this.#tenantEpoch) return { ok: false, reasonCode: 'stale-tenant' };
    if (stamp.instanceId !== this.#instanceId) return { ok: false, reasonCode: 'wrong-instance' };
    if (!isCorrelationId(id)) return { ok: false, reasonCode: 'invalid-message-id' };
    if (this.#seen.has(id)) return { ok: false, reasonCode: 'duplicate-message' };
    if (this.#seen.size >= this.#capacity) return { ok: false, reasonCode: 'replay-capacity' };
    this.#seen.add(id);
    return { ok: true };
  }

  advance(next: BridgeWorkStamp): boolean {
    if (!isCorrelationId(next.instanceId) || !Number.isSafeInteger(next.tenantEpoch) || next.tenantEpoch < this.#tenantEpoch) {
      return false;
    }
    if (next.instanceId === this.#instanceId) return false;
    this.#instanceId = next.instanceId;
    this.#tenantEpoch = next.tenantEpoch;
    this.#seen.clear();
    return true;
  }
}

const DIAGNOSTIC_REASON_CODES: readonly string[] = [
  'accepted', 'absolute-url-required', 'ambiguous-path', 'control-character', 'credentials-not-allowed',
  'duplicate-message', 'encoded-path-not-allowed', 'fragment-not-allowed', 'initial-route-not-web',
  'input-too-long', 'invalid-date', 'invalid-diagnostic', 'invalid-envelope', 'invalid-json',
  'invalid-message-id', 'invalid-payload', 'invalid-url', 'message-too-large', 'non-canonical-path',
  'origin-not-allowed', 'port-not-allowed', 'query-not-allowed', 'replay-capacity', 'route-not-allowed',
  'route-unavailable', 'scheme-not-allowed', 'source-not-allowed', 'stale-tenant',
  'unknown-message-type', 'wrong-channel', 'wrong-direction', 'wrong-instance', 'wrong-version',
];

export interface BridgeDiagnostic {
  direction: BridgeDirection | 'unknown';
  type: BridgeMessageType | 'unknown';
  outcome: 'accepted' | 'rejected';
  reasonCode: string;
  routeFamily?: AppRouteFamily;
}

/** Drops every non-allowlisted field/value so the result is safe to serialize as bridge metadata. */
export function createBridgeDiagnostic(input: unknown): BridgeDiagnostic {
  const value = isRecord(input) ? input : {};
  const diagnostic: BridgeDiagnostic = {
    direction: isOneOf(value.direction, ['web-to-native', 'native-to-web']) ? value.direction : 'unknown',
    type: isOneOf(value.type, ALL_MESSAGE_TYPES) ? value.type : 'unknown',
    outcome: isOneOf(value.outcome, ['accepted', 'rejected']) ? value.outcome : 'rejected',
    reasonCode: isOneOf(value.reasonCode, DIAGNOSTIC_REASON_CODES) ? value.reasonCode : 'invalid-diagnostic',
  };
  if (isOneOf(value.routeFamily, APP_ROUTE_FAMILIES)) diagnostic.routeFamily = value.routeFamily;
  return Object.freeze(diagnostic);
}
