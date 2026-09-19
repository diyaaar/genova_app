import { describe, expect, it } from 'vitest';

import {
  GENOVA_MOBILE_APPLICATION_ID,
  createNativePushScope,
  isNativePushScopeCurrent,
  nextNativePushGeneration,
  parseNativePushProtocolMessage,
  parseNativePushRegisterRequest,
  parseNativePushRegistrationReceipt,
  parseNativePushRevokeRequest,
  summarizeNativePushProtocolMessage,
} from './native-push-registration';

const INSTALLATION_ID = '123e4567-e89b-42d3-a456-426614174000';
const REGISTRATION_ID = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const USER_ID = '6ba7b811-9dad-41d1-80b4-00c04fd430c8';
const CHOIR_ID = '6ba7b812-9dad-41d1-80b4-00c04fd430c8';
const SECRET = 'server_generated_revocation_secret_1234567890';
const TOKEN = 'ExpoPushToken[opaque-provider-token]';

function register(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    action: 'register',
    installationId: INSTALLATION_ID,
    generation: 3,
    transport: 'expo',
    platform: 'ios',
    applicationId: GENOVA_MOBILE_APPLICATION_ID,
    environment: 'production',
    token: TOKEN,
    ...overrides,
  };
}

function revoke(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    action: 'revoke',
    registrationId: REGISTRATION_ID,
    installationId: INSTALLATION_ID,
    generation: 3,
    revocationSecret: SECRET,
    ...overrides,
  };
}

function receipt(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    action: 'registered',
    registrationId: REGISTRATION_ID,
    installationId: INSTALLATION_ID,
    generation: 3,
    leaseExpiresAt: '2026-10-19T12:00:00Z',
    revocationSecret: SECRET,
    ...overrides,
  };
}

describe('native push registration protocol', () => {
  it.each([
    ['expo', 'ios'],
    ['expo', 'android'],
    ['apns', 'ios'],
    ['fcm', 'android'],
  ] as const)('accepts the explicit %s/%s transport pair without changing the opaque token', (transport, platform) => {
    const result = parseNativePushRegisterRequest(register({
      installationId: INSTALLATION_ID.toUpperCase(),
      transport,
      platform,
    }));

    expect(result).toEqual({
      kind: 'accepted',
      value: {
        ...register({ transport, platform }),
        installationId: INSTALLATION_ID,
      },
    });
    if (result.kind === 'accepted') expect(result.value.token).toBe(TOKEN);
  });

  it('accepts revoke and receipt messages, normalizes UUIDs and preserves server secret bytes', () => {
    expect(parseNativePushRevokeRequest(revoke({
      registrationId: REGISTRATION_ID.toUpperCase(),
      installationId: INSTALLATION_ID.toUpperCase(),
    }))).toEqual({
      kind: 'accepted',
      value: revoke(),
    });
    expect(parseNativePushRegistrationReceipt(receipt({
      registrationId: REGISTRATION_ID.toUpperCase(),
      installationId: INSTALLATION_ID.toUpperCase(),
    }))).toEqual({
      kind: 'accepted',
      value: receipt(),
    });
  });

  it.each([
    [null, 'invalid-payload'],
    [[], 'invalid-payload'],
    [{ ...register(), token: undefined }, 'invalid-token'],
    [register({ version: 2 }), 'invalid-version'],
    [register({ action: 'replace' }), 'invalid-action'],
    [register({ installationId: 'not-a-uuid' }), 'invalid-uuid'],
    [register({ generation: 0 }), 'invalid-generation'],
    [register({ generation: 1.5 }), 'invalid-generation'],
    [register({ generation: Number.MAX_SAFE_INTEGER + 1 }), 'invalid-generation'],
    [register({ transport: 'web_push' }), 'invalid-transport'],
    [register({ platform: 'web' }), 'invalid-platform'],
    [register({ transport: 'apns', platform: 'android' }), 'incompatible-transport'],
    [register({ transport: 'fcm', platform: 'ios' }), 'incompatible-transport'],
    [register({ applicationId: 'com.example.other' }), 'invalid-application'],
    [register({ environment: 'staging' }), 'invalid-environment'],
    [register({ token: '' }), 'invalid-token'],
    [register({ token: ` ${TOKEN}` }), 'invalid-token'],
    [register({ token: `${TOKEN} ` }), 'invalid-token'],
    [register({ token: 'token with spaces' }), 'invalid-token'],
    [register({ token: 'token\nvalue' }), 'invalid-token'],
    [register({ token: 'x'.repeat(4097) }), 'invalid-token'],
  ])('rejects malformed register input %# without fallback', (input, reasonCode) => {
    expect(parseNativePushRegisterRequest(input)).toEqual({ kind: 'rejected', reasonCode });
  });

  it.each(['userId', 'memberId', 'choirId', 'accessToken', 'refreshToken', 'url', 'extra'])
    ('refuses forbidden or arbitrary register field %s', (field) => {
      expect(parseNativePushRegisterRequest({ ...register(), [field]: 'must-not-cross' }))
        .toEqual({ kind: 'rejected', reasonCode: 'unexpected-field' });
    });

  it('distinguishes missing required fields from unexpected fields', () => {
    const { token: _token, ...missingToken } = register();
    expect(parseNativePushRegisterRequest(missingToken)).toEqual({
      kind: 'rejected',
      reasonCode: 'invalid-payload',
    });
    expect(parseNativePushRevokeRequest({ ...revoke(), choirId: CHOIR_ID })).toEqual({
      kind: 'rejected',
      reasonCode: 'unexpected-field',
    });
    expect(parseNativePushRegistrationReceipt({ ...receipt(), userId: USER_ID })).toEqual({
      kind: 'rejected',
      reasonCode: 'unexpected-field',
    });
  });

  it('does not satisfy required fields from an attacker-controlled prototype', () => {
    const inherited = Object.create(register()) as Record<string, unknown>;
    inherited.version = 1;
    inherited.action = 'register';
    expect(parseNativePushRegisterRequest(inherited)).toEqual({
      kind: 'rejected',
      reasonCode: 'invalid-payload',
    });
  });

  it.each([
    [revoke({ registrationId: 'bad' }), 'invalid-uuid'],
    [revoke({ installationId: 'bad' }), 'invalid-uuid'],
    [revoke({ generation: -1 }), 'invalid-generation'],
    [revoke({ revocationSecret: 'too-short' }), 'invalid-secret'],
    [revoke({ revocationSecret: `${SECRET}!` }), 'invalid-secret'],
  ])('rejects malformed revocation input %#', (input, reasonCode) => {
    expect(parseNativePushRevokeRequest(input)).toEqual({ kind: 'rejected', reasonCode });
  });

  it.each([
    [receipt({ leaseExpiresAt: '2026-10-19T12:00:00.000Z' }), 'invalid-timestamp'],
    [receipt({ leaseExpiresAt: '2026-02-30T12:00:00Z' }), 'invalid-timestamp'],
    [receipt({ revocationSecret: 'not valid because spaces' }), 'invalid-secret'],
    [receipt({ action: 'ok' }), 'invalid-action'],
  ])('rejects malformed receipt input %#', (input, reasonCode) => {
    expect(parseNativePushRegistrationReceipt(input)).toEqual({ kind: 'rejected', reasonCode });
  });

  it('dispatches only the three known v1 actions', () => {
    expect(parseNativePushProtocolMessage(register()).kind).toBe('accepted');
    expect(parseNativePushProtocolMessage(revoke()).kind).toBe('accepted');
    expect(parseNativePushProtocolMessage(receipt()).kind).toBe('accepted');
    expect(parseNativePushProtocolMessage({ action: 'delete', token: TOKEN })).toEqual({
      kind: 'rejected',
      reasonCode: 'invalid-action',
    });
  });
});

describe('native push generation and scope guards', () => {
  it('increments only non-negative safe generations without overflow', () => {
    expect(nextNativePushGeneration(0)).toBe(1);
    expect(nextNativePushGeneration(7)).toBe(8);
    expect(nextNativePushGeneration(-1)).toBeNull();
    expect(nextNativePushGeneration(1.5)).toBeNull();
    expect(nextNativePushGeneration(Number.MAX_SAFE_INTEGER)).toBeNull();
  });

  it('accepts work only for the exact normalized account, choir, installation and generation', () => {
    const current = createNativePushScope({
      userId: USER_ID.toUpperCase(),
      choirId: CHOIR_ID.toUpperCase(),
      installationId: INSTALLATION_ID.toUpperCase(),
      generation: 3,
    });
    expect(current).toEqual({
      userId: USER_ID,
      choirId: CHOIR_ID,
      installationId: INSTALLATION_ID,
      generation: 3,
    });
    expect(current && isNativePushScopeCurrent({ ...current }, current)).toBe(true);

    for (const stale of [
      { ...current!, userId: REGISTRATION_ID },
      { ...current!, choirId: REGISTRATION_ID },
      { ...current!, installationId: REGISTRATION_ID },
      { ...current!, generation: 2 },
      { ...current!, generation: 4 },
    ]) {
      expect(isNativePushScopeCurrent(stale, current!)).toBe(false);
    }
  });

  it('refuses malformed or unsafe scope identity', () => {
    expect(createNativePushScope({
      userId: 'bad', choirId: CHOIR_ID, installationId: INSTALLATION_ID, generation: 3,
    })).toBeNull();
    expect(createNativePushScope({
      userId: USER_ID, choirId: CHOIR_ID, installationId: INSTALLATION_ID,
      generation: Number.MAX_SAFE_INTEGER + 1,
    })).toBeNull();
  });
});

describe('native push diagnostic redaction', () => {
  it.each([register(), revoke(), receipt()])('summarizes accepted messages without sensitive values or identity keys', (message) => {
    const serialized = JSON.stringify(summarizeNativePushProtocolMessage(message));
    expect(serialized).not.toContain(TOKEN);
    expect(serialized).not.toContain(SECRET);
    expect(serialized).not.toContain(INSTALLATION_ID);
    expect(serialized).not.toContain(REGISTRATION_ID);
    expect(serialized).not.toMatch(/token|secret|user|choir|member|installation|registration/iu);
  });

  it('does not echo rejected attacker-controlled values', () => {
    const diagnostic = summarizeNativePushProtocolMessage({
      ...register(),
      token: 'attacker-controlled-token',
      accessToken: 'must-never-echo',
    });
    expect(diagnostic).toEqual({ outcome: 'rejected', reasonCode: 'unexpected-field' });
    expect(JSON.stringify(diagnostic)).not.toContain('attacker-controlled-token');
    expect(JSON.stringify(diagnostic)).not.toContain('must-never-echo');
  });
});
