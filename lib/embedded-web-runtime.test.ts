import { describe, expect, it, vi } from 'vitest';
import {
  EMBEDDED_LEASE_SAFETY_SECONDS,
  EmbeddedLeaseVault,
  detectEmbeddedBootstrap,
  verifyEmbeddedContext,
  type EmbeddedContextCandidate,
} from './embedded-web-runtime';

const INSTANCE_ID = 'instance_1234567890';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const CHOIR_ID = '22222222-2222-4222-8222-222222222222';
const MEMBER_ID = '33333333-3333-4333-8333-333333333333';
const ACCESS_TOKEN = 'header.payload.signature';
const NOW_SECONDS = 2_000_000_000;

function candidate(overrides: Partial<EmbeddedContextCandidate> = {}): EmbeddedContextCandidate {
  return {
    accessToken: ACCESS_TOKEN,
    expiresAt: NOW_SECONDS + 600,
    userId: USER_ID,
    choirId: CHOIR_ID,
    memberId: MEMBER_ID,
    ...overrides,
  };
}

function validMemberships() {
  return [{
    choir_id: CHOIR_ID,
    member_id: MEMBER_ID,
    choir_name: 'Genova',
    choir_slug: 'genova',
    member_is_active: true,
    is_current: true,
  }];
}

describe('detectEmbeddedBootstrap', () => {
  it('keeps a regular browser in browser mode when no bridge surface exists', () => {
    const result = detectEmbeddedBootstrap({
      href: 'https://app.genesinovachoir.com/profil',
      isTopFrame: true,
      bridge: undefined,
    });

    expect(result).toEqual({ mode: 'browser' });
  });

  it('accepts only the exact non-secret bootstrap on an allowed top-frame route', () => {
    const result = detectEmbeddedBootstrap({
      href: 'https://app.genesinovachoir.com/announcements',
      isTopFrame: true,
      bridge: {
        injectedObjectJson: () => JSON.stringify({
          channel: 'genova.mobile.webview',
          instanceId: INSTANCE_ID,
          tenantEpoch: 7,
        }),
        postMessage: vi.fn(),
      },
    });

    expect(result).toEqual({
      mode: 'embedded',
      bootstrap: {
        channel: 'genova.mobile.webview',
        instanceId: INSTANCE_ID,
        tenantEpoch: 7,
      },
      routeFamily: 'announcements',
    });
  });

  it.each([
    ['iframe', { isTopFrame: false }],
    ['bad-json', { injected: '{' }],
    ['extra-secret', { bootstrap: { accessToken: ACCESS_TOKEN } }],
    ['bad-instance', { bootstrap: { instanceId: 'short' } }],
    ['bad-epoch', { bootstrap: { tenantEpoch: -1 } }],
    ['native-route', { href: 'https://app.genesinovachoir.com/repertuvar' }],
    ['query', { href: 'https://app.genesinovachoir.com/profil?token=secret' }],
  ])('fails closed for a detected bridge with %s', (_label, override) => {
    const extra = 'bootstrap' in override ? override.bootstrap as Record<string, unknown> : {};
    const raw = 'injected' in override
      ? String(override.injected)
      : JSON.stringify({
          channel: 'genova.mobile.webview',
          instanceId: INSTANCE_ID,
          tenantEpoch: 7,
          ...extra,
        });
    const result = detectEmbeddedBootstrap({
      href: 'href' in override ? String(override.href) : 'https://app.genesinovachoir.com/profil',
      isTopFrame: 'isTopFrame' in override ? Boolean(override.isTopFrame) : true,
      bridge: { injectedObjectJson: () => raw, postMessage: vi.fn() },
    });

    expect(result).toEqual({ mode: 'invalid', reasonCode: expect.any(String) });
    expect(JSON.stringify(result)).not.toContain(ACCESS_TOKEN);
  });
});

describe('verifyEmbeddedContext', () => {
  it('verifies the token user and exact one active server-current membership', async () => {
    const verifyUser = vi.fn().mockResolvedValue({ id: USER_ID });
    const loadMemberships = vi.fn().mockResolvedValue(validMemberships());

    const result = await verifyEmbeddedContext(candidate(), {
      nowSeconds: () => NOW_SECONDS,
      verifyUser,
      loadMemberships,
    });

    expect(result).toEqual({ ok: true, value: candidate() });
    expect(verifyUser).toHaveBeenCalledWith(ACCESS_TOKEN);
    expect(loadMemberships).toHaveBeenCalledWith(ACCESS_TOKEN);
  });

  it.each([
    ['near expiry', candidate({ expiresAt: NOW_SECONDS + EMBEDDED_LEASE_SAFETY_SECONDS }), { user: { id: USER_ID }, memberships: validMemberships() }, 'lease-expiring'],
    ['user mismatch', candidate(), { user: { id: CHOIR_ID }, memberships: validMemberships() }, 'user-mismatch'],
    ['no user', candidate(), { user: null, memberships: validMemberships() }, 'user-not-verified'],
    ['two current choirs', candidate(), { user: { id: USER_ID }, memberships: [...validMemberships(), { ...validMemberships()[0], choir_id: USER_ID }] }, 'choir-mismatch'],
    ['inactive member', candidate(), { user: { id: USER_ID }, memberships: [{ ...validMemberships()[0], member_is_active: false }] }, 'choir-mismatch'],
    ['member mismatch', candidate(), { user: { id: USER_ID }, memberships: [{ ...validMemberships()[0], member_id: USER_ID }] }, 'choir-mismatch'],
  ])('rejects %s without returning the credential', async (_label, value, proof, reasonCode) => {
    const result = await verifyEmbeddedContext(value, {
      nowSeconds: () => NOW_SECONDS,
      verifyUser: vi.fn().mockResolvedValue(proof.user),
      loadMemberships: vi.fn().mockResolvedValue(proof.memberships),
    });

    expect(result).toEqual({ ok: false, reasonCode });
    expect(JSON.stringify(result)).not.toContain(ACCESS_TOKEN);
  });

  it('normalizes provider failures to a stable redacted code', async () => {
    const result = await verifyEmbeddedContext(candidate(), {
      nowSeconds: () => NOW_SECONDS,
      verifyUser: vi.fn().mockRejectedValue(new Error(`provider ${ACCESS_TOKEN}`)),
      loadMemberships: vi.fn(),
    });

    expect(result).toEqual({ ok: false, reasonCode: 'proof-failed' });
    expect(JSON.stringify(result)).not.toContain(ACCESS_TOKEN);
  });
});

describe('EmbeddedLeaseVault', () => {
  it('keeps the credential private, freezes mutations during renewal and clears synchronously', () => {
    const vault = new EmbeddedLeaseVault(() => NOW_SECONDS);
    vault.enterEmbeddedMode();
    expect(() => vault.requireAccess('read')).toThrow('embedded-context-locked');

    vault.install(candidate());
    expect(vault.requireAccess('read')).toEqual({ accessToken: ACCESS_TOKEN, userId: USER_ID });
    expect(vault.snapshot()).toEqual({
      mode: 'embedded',
      phase: 'ready',
      expiresAt: NOW_SECONDS + 600,
      userId: USER_ID,
      choirId: CHOIR_ID,
      memberId: MEMBER_ID,
    });
    expect(JSON.stringify(vault.snapshot())).not.toContain(ACCESS_TOKEN);

    expect(vault.beginRenewal()).toBe(true);
    expect(vault.beginRenewal()).toBe(false);
    expect(vault.requireAccess('read').accessToken).toBe(ACCESS_TOKEN);
    expect(() => vault.requireAccess('mutation')).toThrow('embedded-context-renewing');

    vault.clear();
    expect(vault.snapshot()).toEqual({ mode: 'embedded', phase: 'locked' });
    expect(() => vault.requireAccess('read')).toThrow('embedded-context-locked');
  });

  it('rejects expired access and older renewal leases', () => {
    let now = NOW_SECONDS;
    const vault = new EmbeddedLeaseVault(() => now);
    vault.enterEmbeddedMode();
    vault.install(candidate());
    expect(() => vault.install(candidate({ expiresAt: NOW_SECONDS + 599 }))).toThrow('embedded-lease-not-newer');

    now = NOW_SECONDS + 600;
    expect(() => vault.requireAccess('read')).toThrow('embedded-context-expired');
  });

  it('never leaves embedded mode on clear and does not expose a token through subscriptions', () => {
    const vault = new EmbeddedLeaseVault(() => NOW_SECONDS);
    const states: string[] = [];
    vault.subscribe((state) => states.push(JSON.stringify(state)));
    vault.enterEmbeddedMode();
    vault.install(candidate());
    vault.clear();

    expect(states).toHaveLength(3);
    expect(states.join(' ')).not.toContain(ACCESS_TOKEN);
    expect(vault.snapshot().mode).toBe('embedded');
  });
});
