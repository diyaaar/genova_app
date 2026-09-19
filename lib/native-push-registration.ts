export const NATIVE_PUSH_PROTOCOL_VERSION = 1 as const;
export const GENOVA_MOBILE_APPLICATION_ID = 'com.genesinovachoir.genova' as const;

export type NativePushTransport = 'expo' | 'apns' | 'fcm';
export type NativePushPlatform = 'ios' | 'android';
export type NativePushEnvironment = 'development' | 'production';

export interface NativePushRegisterRequest {
  version: typeof NATIVE_PUSH_PROTOCOL_VERSION;
  action: 'register';
  installationId: string;
  generation: number;
  transport: NativePushTransport;
  platform: NativePushPlatform;
  applicationId: typeof GENOVA_MOBILE_APPLICATION_ID;
  environment: NativePushEnvironment;
  token: string;
}

export interface NativePushRevokeRequest {
  version: typeof NATIVE_PUSH_PROTOCOL_VERSION;
  action: 'revoke';
  registrationId: string;
  installationId: string;
  generation: number;
  revocationSecret: string;
}

export interface NativePushRegistrationReceipt {
  version: typeof NATIVE_PUSH_PROTOCOL_VERSION;
  action: 'registered';
  registrationId: string;
  installationId: string;
  generation: number;
  leaseExpiresAt: string;
  revocationSecret: string;
}

export type NativePushProtocolMessage =
  | NativePushRegisterRequest
  | NativePushRevokeRequest
  | NativePushRegistrationReceipt;

export type NativePushProtocolReason =
  | 'incompatible-transport'
  | 'invalid-action'
  | 'invalid-application'
  | 'invalid-environment'
  | 'invalid-generation'
  | 'invalid-payload'
  | 'invalid-platform'
  | 'invalid-secret'
  | 'invalid-timestamp'
  | 'invalid-token'
  | 'invalid-transport'
  | 'invalid-uuid'
  | 'invalid-version'
  | 'unexpected-field';

export type NativePushProtocolDecision<T extends NativePushProtocolMessage = NativePushProtocolMessage> =
  | { kind: 'accepted'; value: T }
  | { kind: 'rejected'; reasonCode: NativePushProtocolReason };

export interface NativePushScope {
  userId: string;
  choirId: string;
  installationId: string;
  generation: number;
}

export type NativePushDiagnostic =
  | { outcome: 'rejected'; reasonCode: NativePushProtocolReason }
  | {
      outcome: 'accepted';
      version: typeof NATIVE_PUSH_PROTOCOL_VERSION;
      action: NativePushProtocolMessage['action'];
      generation: number;
      transport?: NativePushTransport;
      platform?: NativePushPlatform;
      environment?: NativePushEnvironment;
      containsSensitiveMaterial: boolean;
    };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const ISO_SECOND_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const SECRET_PATTERN = /^[A-Za-z0-9_-]{32,256}$/u;
const TOKEN_MAX_LENGTH = 4096;

const REGISTER_KEYS = [
  'action',
  'applicationId',
  'environment',
  'generation',
  'installationId',
  'platform',
  'token',
  'transport',
  'version',
] as const;
const REVOKE_KEYS = [
  'action',
  'generation',
  'installationId',
  'registrationId',
  'revocationSecret',
  'version',
] as const;
const RECEIPT_KEYS = [
  'action',
  'generation',
  'installationId',
  'leaseExpiresAt',
  'registrationId',
  'revocationSecret',
  'version',
] as const;

function rejected<T extends NativePushProtocolMessage>(reasonCode: NativePushProtocolReason): NativePushProtocolDecision<T> {
  return { kind: 'rejected', reasonCode };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function keysAreExact(value: Record<string, unknown>, expected: readonly string[]): NativePushProtocolReason | null {
  const actual = Object.keys(value);
  if (actual.some((key) => !expected.includes(key))) return 'unexpected-field';
  return expected.some((key) => !Object.prototype.hasOwnProperty.call(value, key)) ? 'invalid-payload' : null;
}

function normalizeUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : null;
}

function normalizeGeneration(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 ? value : null;
}

function isExactSecondTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !ISO_SECOND_PATTERN.test(value)) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().replace('.000Z', 'Z') === value;
}

function isOpaqueToken(value: unknown): value is string {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= TOKEN_MAX_LENGTH
    && value.trim() === value
    && !/[\s\u0000-\u001f\u007f]/u.test(value);
}

function isRevocationSecret(value: unknown): value is string {
  return typeof value === 'string' && SECRET_PATTERN.test(value);
}

function compatible(transport: NativePushTransport, platform: NativePushPlatform): boolean {
  return transport === 'expo'
    || (transport === 'apns' && platform === 'ios')
    || (transport === 'fcm' && platform === 'android');
}

export function parseNativePushRegisterRequest(input: unknown): NativePushProtocolDecision<NativePushRegisterRequest> {
  if (!isRecord(input)) return rejected('invalid-payload');
  const keyError = keysAreExact(input, REGISTER_KEYS);
  if (keyError) return rejected(keyError);
  if (input.version !== NATIVE_PUSH_PROTOCOL_VERSION) return rejected('invalid-version');
  if (input.action !== 'register') return rejected('invalid-action');

  const installationId = normalizeUuid(input.installationId);
  if (!installationId) return rejected('invalid-uuid');
  const generation = normalizeGeneration(input.generation);
  if (!generation) return rejected('invalid-generation');
  if (input.transport !== 'expo' && input.transport !== 'apns' && input.transport !== 'fcm') {
    return rejected('invalid-transport');
  }
  if (input.platform !== 'ios' && input.platform !== 'android') return rejected('invalid-platform');
  if (!compatible(input.transport, input.platform)) return rejected('incompatible-transport');
  if (input.applicationId !== GENOVA_MOBILE_APPLICATION_ID) return rejected('invalid-application');
  if (input.environment !== 'development' && input.environment !== 'production') {
    return rejected('invalid-environment');
  }
  if (!isOpaqueToken(input.token)) return rejected('invalid-token');

  return {
    kind: 'accepted',
    value: {
      version: NATIVE_PUSH_PROTOCOL_VERSION,
      action: 'register',
      installationId,
      generation,
      transport: input.transport,
      platform: input.platform,
      applicationId: GENOVA_MOBILE_APPLICATION_ID,
      environment: input.environment,
      token: input.token,
    },
  };
}

export function parseNativePushRevokeRequest(input: unknown): NativePushProtocolDecision<NativePushRevokeRequest> {
  if (!isRecord(input)) return rejected('invalid-payload');
  const keyError = keysAreExact(input, REVOKE_KEYS);
  if (keyError) return rejected(keyError);
  if (input.version !== NATIVE_PUSH_PROTOCOL_VERSION) return rejected('invalid-version');
  if (input.action !== 'revoke') return rejected('invalid-action');

  const registrationId = normalizeUuid(input.registrationId);
  const installationId = normalizeUuid(input.installationId);
  if (!registrationId || !installationId) return rejected('invalid-uuid');
  const generation = normalizeGeneration(input.generation);
  if (!generation) return rejected('invalid-generation');
  if (!isRevocationSecret(input.revocationSecret)) return rejected('invalid-secret');

  return {
    kind: 'accepted',
    value: {
      version: NATIVE_PUSH_PROTOCOL_VERSION,
      action: 'revoke',
      registrationId,
      installationId,
      generation,
      revocationSecret: input.revocationSecret,
    },
  };
}

export function parseNativePushRegistrationReceipt(input: unknown): NativePushProtocolDecision<NativePushRegistrationReceipt> {
  if (!isRecord(input)) return rejected('invalid-payload');
  const keyError = keysAreExact(input, RECEIPT_KEYS);
  if (keyError) return rejected(keyError);
  if (input.version !== NATIVE_PUSH_PROTOCOL_VERSION) return rejected('invalid-version');
  if (input.action !== 'registered') return rejected('invalid-action');

  const registrationId = normalizeUuid(input.registrationId);
  const installationId = normalizeUuid(input.installationId);
  if (!registrationId || !installationId) return rejected('invalid-uuid');
  const generation = normalizeGeneration(input.generation);
  if (!generation) return rejected('invalid-generation');
  if (!isExactSecondTimestamp(input.leaseExpiresAt)) return rejected('invalid-timestamp');
  if (!isRevocationSecret(input.revocationSecret)) return rejected('invalid-secret');

  return {
    kind: 'accepted',
    value: {
      version: NATIVE_PUSH_PROTOCOL_VERSION,
      action: 'registered',
      registrationId,
      installationId,
      generation,
      leaseExpiresAt: input.leaseExpiresAt,
      revocationSecret: input.revocationSecret,
    },
  };
}

/** Parses only the three v1 messages. Unknown actions never fall through to a permissive shape. */
export function parseNativePushProtocolMessage(input: unknown): NativePushProtocolDecision {
  if (!isRecord(input)) return rejected('invalid-payload');
  if (input.action === 'register') return parseNativePushRegisterRequest(input);
  if (input.action === 'revoke') return parseNativePushRevokeRequest(input);
  if (input.action === 'registered') return parseNativePushRegistrationReceipt(input);
  return rejected('invalid-action');
}

/** Returns the next local generation, or null rather than crossing the safe-integer boundary. */
export function nextNativePushGeneration(current: number): number | null {
  if (!Number.isSafeInteger(current) || current < 0 || current >= Number.MAX_SAFE_INTEGER) return null;
  return current + 1;
}

export function createNativePushScope(input: {
  userId: unknown;
  choirId: unknown;
  installationId: unknown;
  generation: unknown;
}): NativePushScope | null {
  const userId = normalizeUuid(input.userId);
  const choirId = normalizeUuid(input.choirId);
  const installationId = normalizeUuid(input.installationId);
  const generation = normalizeGeneration(input.generation);
  return userId && choirId && installationId && generation
    ? { userId, choirId, installationId, generation }
    : null;
}

/** A queued result is usable only for the exact current account, choir, installation and generation. */
export function isNativePushScopeCurrent(work: NativePushScope, current: NativePushScope): boolean {
  return work.userId === current.userId
    && work.choirId === current.choirId
    && work.installationId === current.installationId
    && work.generation === current.generation;
}

/** Safe for ordinary diagnostics: no token, secret, account, tenant, registration or installation IDs. */
export function summarizeNativePushProtocolMessage(input: unknown): NativePushDiagnostic {
  const parsed = parseNativePushProtocolMessage(input);
  if (parsed.kind === 'rejected') return { outcome: 'rejected', reasonCode: parsed.reasonCode };
  const { value } = parsed;
  if (value.action === 'register') {
    return {
      outcome: 'accepted',
      version: value.version,
      action: value.action,
      generation: value.generation,
      transport: value.transport,
      platform: value.platform,
      environment: value.environment,
      containsSensitiveMaterial: true,
    };
  }
  return {
    outcome: 'accepted',
    version: value.version,
    action: value.action,
    generation: value.generation,
    containsSensitiveMaterial: true,
  };
}
