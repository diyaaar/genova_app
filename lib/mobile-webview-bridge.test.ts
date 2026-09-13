import { describe, expect, it } from 'vitest';

import {
  APP_WEB_ORIGIN,
  BRIDGE_CHANNEL,
  BRIDGE_VERSION,
  BridgeMessageGuard,
  canonicalizeBridgeFileRequestUrl,
  classifyAppUrl,
  classifyExternalUrl,
  createBridgeDiagnostic,
  parseBridgeMessage,
  validateInitialWebViewSource,
  type BridgeDirection,
  type BridgeMessageType,
} from '@/lib/mobile-webview-bridge';

const INSTANCE_ID = 'instance_1234567890abcdef';
const OTHER_INSTANCE_ID = 'instance_fedcba0987654321';
const MESSAGE_ID = 'message_1234567890abcdef';
const SOURCE_URL = `${APP_WEB_ORIGIN}/announcements`;
const UUID = '123e4567-e89b-42d3-a456-426614174000';
const JWT = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.signature';

function message(
  type: BridgeMessageType,
  payload: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
) {
  return JSON.stringify({
    channel: BRIDGE_CHANNEL,
    version: BRIDGE_VERSION,
    id: MESSAGE_ID,
    instanceId: INSTANCE_ID,
    tenantEpoch: 7,
    type,
    payload,
    ...overrides,
  });
}

function parse(type: BridgeMessageType, payload: Record<string, unknown>, direction: BridgeDirection) {
  return parseBridgeMessage(message(type, payload), {
    direction,
    expectedInstanceId: INSTANCE_ID,
    expectedTenantEpoch: 7,
    sourceUrl: SOURCE_URL,
  });
}

describe('permanent WebView route policy', () => {
  it.each([
    ['/announcements', 'announcements'],
    [`/announcements/${UUID}`, 'announcement-detail'],
    ['/koristler', 'choristers'],
    [`/koristler/${UUID}`, 'chorister-detail'],
    ['/koristler/davetler', 'invitations'],
    ['/profil', 'profile'],
    ['/profil/duzenle', 'profile-edit'],
    ['/profil/degisiklikler', 'profile-change-requests'],
    ['/devamsizlik', 'attendance'],
    ['/devamsizlik?date=2028-02-29', 'attendance'],
  ])('accepts canonical permanent route %s', (path, routeFamily) => {
    expect(classifyAppUrl(path)).toEqual({
      kind: 'accepted',
      owner: 'web',
      availability: 'available',
      routeFamily,
      canonicalPath: path,
    });
  });

  it.each([
    ['/', 'home', 'available'],
    ['/repertuvar', 'repertoire', 'available'],
    ['/repertuvar/bir-eser', 'repertoire', 'available'],
    ['/chat', 'chat', 'unavailable'],
    ['/chat/oda', 'chat', 'unavailable'],
    ['/odevler', 'assignments', 'unavailable'],
    ['/odevler/bir-odev', 'assignments', 'unavailable'],
  ])('classifies native ownership independently from availability for %s', (path, routeFamily, availability) => {
    expect(classifyAppUrl(path)).toMatchObject({
      kind: 'accepted',
      owner: 'native',
      routeFamily,
      availability,
      canonicalPath: path,
    });
  });

  it('lets a caller explicitly change native availability without changing ownership', () => {
    expect(classifyAppUrl('/chat/oda', { availableNativeRoutes: ['home', 'repertoire', 'chat'] })).toMatchObject({
      kind: 'accepted',
      owner: 'native',
      routeFamily: 'chat',
      availability: 'available',
    });
  });

  it.each(['/login', '/invite', '/reset-password', '/auth/callback'])('blocks auth route %s', (path) => {
    expect(classifyAppUrl(path)).toEqual({ kind: 'rejected', routeFamily: 'auth', reasonCode: 'route-not-allowed' });
  });

  it.each([
    [`https://evil.example/announcements`, 'origin-not-allowed'],
    [`https://app.genesinovachoir.com.evil.example/announcements`, 'origin-not-allowed'],
    [`https://user@app.genesinovachoir.com/announcements`, 'credentials-not-allowed'],
    [`https://app.genesinovachoir.com:443/announcements`, 'port-not-allowed'],
    [`http://app.genesinovachoir.com/announcements`, 'origin-not-allowed'],
    ['/announcements/%2fescape', 'encoded-path-not-allowed'],
    ['/announcements/%5Cescape', 'encoded-path-not-allowed'],
    ['/announcements\\escape', 'ambiguous-path'],
    ['/announcements/../profil', 'ambiguous-path'],
    ['/announcements/%2e%2e/profil', 'encoded-path-not-allowed'],
    ['/announcements?date=2026-09-10', 'query-not-allowed'],
    ['/devamsizlik?date=2026-09-10&date=2026-09-11', 'query-not-allowed'],
    ['/devamsizlik?other=2026-09-10', 'query-not-allowed'],
    ['/devamsizlik?date=2026-02-29', 'invalid-date'],
    ['/announcements#section', 'fragment-not-allowed'],
    ['/announcements#', 'fragment-not-allowed'],
    ['/announcements?', 'query-not-allowed'],
    ['/devamsizlik?', 'query-not-allowed'],
    ['/announcements/', 'non-canonical-path'],
    ['/Announcements', 'route-not-allowed'],
    ['/unknown', 'route-not-allowed'],
    ['//evil.example/announcements', 'ambiguous-path'],
    [`/${'a'.repeat(2_048)}`, 'input-too-long'],
  ])('rejects hostile or ambiguous app input %s', (input, reasonCode) => {
    expect(classifyAppUrl(input)).toMatchObject({ kind: 'rejected', reasonCode });
  });

  it('requires an absolute web-owned URL for an initial WebView source', () => {
    expect(validateInitialWebViewSource(SOURCE_URL)).toMatchObject({
      kind: 'accepted',
      owner: 'web',
      routeFamily: 'announcements',
    });
    expect(validateInitialWebViewSource('/announcements')).toEqual({
      kind: 'rejected',
      routeFamily: 'unknown',
      reasonCode: 'absolute-url-required',
    });
    expect(validateInitialWebViewSource(`${APP_WEB_ORIGIN}/repertuvar`)).toMatchObject({
      kind: 'rejected',
      reasonCode: 'initial-route-not-web',
    });
  });

  it('supports only an explicitly configured loopback origin for local acceptance', () => {
    const local = 'http://127.0.0.1:18029';
    expect(validateInitialWebViewSource(`${local}/profil`, { appOrigin: local })).toMatchObject({
      kind: 'accepted',
      routeFamily: 'profile',
    });
    expect(validateInitialWebViewSource(`${local}/profil`)).toMatchObject({
      kind: 'rejected',
      reasonCode: 'port-not-allowed',
    });
  });
});

describe('protected file capability URL', () => {
  it('canonicalizes only the same URL shapes accepted by the bridge parser', () => {
    expect(canonicalizeBridgeFileRequestUrl('/api/drive-file/file_1?token=signed')).toBe(
      `${APP_WEB_ORIGIN}/api/drive-file/file_1?token=signed`,
    );
    expect(canonicalizeBridgeFileRequestUrl('https://files.example.test/signed?ticket=one')).toBe(
      'https://files.example.test/signed?ticket=one',
    );
    expect(canonicalizeBridgeFileRequestUrl(
      'http://127.0.0.1:54321/functions/v1/repertoire-file?ticket=one',
      { protectedFileOrigins: ['http://127.0.0.1:54321'] },
    )).toBe('http://127.0.0.1:54321/functions/v1/repertoire-file?ticket=one');
    expect(canonicalizeBridgeFileRequestUrl(
      'http://127.0.0.1:54322/functions/v1/repertoire-file?ticket=one',
      { protectedFileOrigins: ['http://127.0.0.1:54321'] },
    )).toBeNull();
    expect(canonicalizeBridgeFileRequestUrl(
      'http://example.test/functions/v1/repertoire-file?ticket=one',
      { protectedFileOrigins: ['http://example.test'] },
    )).toBeNull();
    expect(canonicalizeBridgeFileRequestUrl('http://files.example.test/file')).toBeNull();
    expect(canonicalizeBridgeFileRequestUrl('//files.example.test/file')).toBeNull();
    expect(canonicalizeBridgeFileRequestUrl('https://user:pass@files.example.test/file')).toBeNull();
    expect(canonicalizeBridgeFileRequestUrl('/api/file#secret')).toBeNull();
  });
});

describe('external URL policy', () => {
  it('returns a canonical HTTPS URL and a query-free display host', () => {
    expect(classifyExternalUrl('https://EXAMPLE.com/a%20path?q=secret#part')).toEqual({
      kind: 'accepted',
      canonicalUrl: 'https://example.com/a%20path?q=secret#part',
      displayHost: 'example.com',
    });
  });

  it.each([
    ['http://example.com', 'scheme-not-allowed'],
    ['//example.com/path', 'absolute-url-required'],
    ['https://user:pass@example.com/path', 'credentials-not-allowed'],
    ['https://example.com:8443/path', 'port-not-allowed'],
    ['https://example.com:443/path', 'port-not-allowed'],
    ['javascript:alert(1)', 'scheme-not-allowed'],
    ['https://example.com\\@evil.test', 'ambiguous-path'],
    [`https://example.com/${'a'.repeat(2_048)}`, 'input-too-long'],
  ])('rejects unsafe external URL %s', (input, reasonCode) => {
    expect(classifyExternalUrl(input)).toEqual({ kind: 'rejected', reasonCode });
  });
});

describe('version 1 bridge message parser', () => {
  const cases: Array<[BridgeDirection, BridgeMessageType, Record<string, unknown>]> = [
    ['web-to-native', 'bridge.ready', { supportedVersions: [1], routeFamily: 'announcements' }],
    ['native-to-web', 'bridge.challenge', { nonce: 'nonce_1234567890abcdef' }],
    ['web-to-native', 'bridge.challenge.ack', { nonce: 'nonce_1234567890abcdef' }],
    ['native-to-web', 'context.apply', { accessToken: JWT, expiresAt: 1_800_000_000, userId: UUID, choirId: UUID, memberId: UUID }],
    ['native-to-web', 'context.clear', { reason: 'choir-switch' }],
    ['web-to-native', 'context.renew.request', { reason: 'expiring' }],
    ['web-to-native', 'navigation.state', { routeFamily: 'profile', canGoBackWithinWeb: true }],
    ['web-to-native', 'navigation.native.request', { path: '/repertuvar/bir-eser' }],
    ['web-to-native', 'navigation.external.request', { url: 'https://example.com/info?q=private' }],
    ['web-to-native', 'navigation.exit.request', { reason: 'back-root' }],
    ['web-to-native', 'auth.sign-out.request', {}],
    ['web-to-native', 'auth.password.open', {}],
    ['web-to-native', 'theme.set.request', { scheme: 'system' }],
    ['native-to-web', 'theme.apply', { resolved: 'dark', preference: 'system' }],
    ['web-to-native', 'clipboard.write.request', { kind: 'invitation-link', text: `${APP_WEB_ORIGIN}/invite#invite=${'a'.repeat(64)}` }],
    ['web-to-native', 'file.open.request', { url: '/api/drive-file/file_1?token=secret', disposition: 'view', fileName: 'Tenor nota.pdf', mimeType: 'application/pdf' }],
    ['native-to-web', 'command.result', { requestId: 'request_1234567890abcdef', ok: false, code: 'route-unavailable' }],
    ['web-to-native', 'bridge.error', { requestId: 'request_1234567890abcdef', code: 'invalid-payload' }],
    ['native-to-web', 'bridge.error', { code: 'stale-tenant' }],
  ];

  it.each(cases)('accepts %s %s', (direction, type, payload) => {
    expect(parse(type, payload, direction)).toMatchObject({ ok: true, value: { type, payload } });
  });

  it.each([
    ['null', 'invalid-envelope'],
    ['[]', 'invalid-envelope'],
    ['not-json', 'invalid-json'],
    [message('auth.sign-out.request', {}, { extra: true }), 'invalid-envelope'],
    [message('auth.sign-out.request', {}, { channel: 'other.channel' }), 'wrong-channel'],
    [message('auth.sign-out.request', {}, { version: 2 }), 'wrong-version'],
    [message('auth.sign-out.request', {}, { id: 'short' }), 'invalid-message-id'],
    [message('auth.sign-out.request', {}, { instanceId: 'short' }), 'wrong-instance'],
    [message('auth.sign-out.request', {}, { instanceId: OTHER_INSTANCE_ID }), 'wrong-instance'],
    [message('auth.sign-out.request', {}, { tenantEpoch: -1 }), 'stale-tenant'],
    [message('auth.sign-out.request', {}, { tenantEpoch: 6 }), 'stale-tenant'],
    [message('unknown.type' as BridgeMessageType, {}), 'unknown-message-type'],
  ])('rejects invalid envelope with %s', (raw, reasonCode) => {
    expect(parseBridgeMessage(raw, {
      direction: 'web-to-native',
      expectedInstanceId: INSTANCE_ID,
      expectedTenantEpoch: 7,
      sourceUrl: SOURCE_URL,
    })).toEqual({ ok: false, reasonCode });
  });

  it('enforces the UTF-8 byte limit before JSON parsing', () => {
    const raw = JSON.stringify({ value: 'ş'.repeat(8_200) });
    expect(parseBridgeMessage(raw, {
      direction: 'web-to-native',
      expectedInstanceId: INSTANCE_ID,
      expectedTenantEpoch: 7,
      sourceUrl: SOURCE_URL,
    })).toEqual({ ok: false, reasonCode: 'message-too-large' });
  });

  it('rejects source URLs outside a current permanent web route', () => {
    expect(parseBridgeMessage(message('auth.sign-out.request', {}), {
      direction: 'web-to-native',
      expectedInstanceId: INSTANCE_ID,
      expectedTenantEpoch: 7,
      sourceUrl: `${APP_WEB_ORIGIN}/repertuvar`,
    })).toEqual({ ok: false, reasonCode: 'source-not-allowed' });
  });

  it('rejects a known type in the wrong direction', () => {
    expect(parse('context.apply', { accessToken: JWT, expiresAt: 1_800_000_000, userId: UUID, choirId: UUID, memberId: UUID }, 'web-to-native'))
      .toEqual({ ok: false, reasonCode: 'wrong-direction' });
  });

  it('fails closed for an invalid runtime direction value', () => {
    expect(parseBridgeMessage(message('auth.sign-out.request', {}), {
      direction: 'sideways' as BridgeDirection,
      expectedInstanceId: INSTANCE_ID,
      expectedTenantEpoch: 7,
      sourceUrl: SOURCE_URL,
    })).toEqual({ ok: false, reasonCode: 'wrong-direction' });
  });

  it.each([
    ['bridge.ready', { supportedVersions: [1, 2], routeFamily: 'announcements' }],
    ['bridge.challenge', { nonce: 'short' }],
    ['context.apply', { accessToken: 'refresh-token', expiresAt: 0, userId: UUID, choirId: UUID, memberId: UUID }],
    ['context.clear', { reason: 'other' }],
    ['navigation.state', { routeFamily: 'profile', canGoBackWithinWeb: true, url: 'secret' }],
    ['navigation.native.request', { path: '/login' }],
    ['navigation.external.request', { url: 'http://example.com' }],
    ['clipboard.write.request', { kind: 'invitation-link', text: `${APP_WEB_ORIGIN}/invite?invite=${'a'.repeat(64)}` }],
    ['file.open.request', { url: 'javascript:alert(1)', disposition: 'view' }],
    ['theme.apply', { resolved: 'system', preference: 'system' }],
    ['command.result', { requestId: 'short', ok: true, code: 'ok' }],
    ['bridge.error', { code: 'provider error with spaces' }],
  ] as Array<[BridgeMessageType, Record<string, unknown>]>)('rejects invalid payload for %s', (type, payload) => {
    const direction: BridgeDirection = ['bridge.challenge', 'context.apply', 'context.clear', 'theme.apply', 'command.result'].includes(type)
      ? 'native-to-web'
      : 'web-to-native';
    expect(parse(type, payload, direction)).toEqual({ ok: false, reasonCode: 'invalid-payload' });
  });

  it('rejects a duplicate ID through a read-only replay lookup', () => {
    expect(parseBridgeMessage(message('auth.sign-out.request', {}), {
      direction: 'web-to-native',
      expectedInstanceId: INSTANCE_ID,
      expectedTenantEpoch: 7,
      sourceUrl: SOURCE_URL,
      hasSeenMessageId: (id) => id === MESSAGE_ID,
    })).toEqual({ ok: false, reasonCode: 'duplicate-message' });
  });
});

describe('replay, tenant epoch and redacted diagnostics', () => {
  it('bounds replay memory and fails closed when capacity is exhausted', () => {
    const guard = new BridgeMessageGuard({ instanceId: INSTANCE_ID, tenantEpoch: 7, capacity: 2 });
    expect(guard.acceptMessage('message_1234567890abcdef')).toEqual({ ok: true });
    expect(guard.acceptMessage('message_1234567890abcdef')).toEqual({ ok: false, reasonCode: 'duplicate-message' });
    expect(guard.acceptMessage('message_fedcba0987654321')).toEqual({ ok: true });
    expect(guard.acceptMessage('message_aaaaaaaaaaaaaaaa')).toEqual({ ok: false, reasonCode: 'replay-capacity' });
  });

  it('invalidates queued work on instance replacement and tenant-epoch advance', () => {
    const guard = new BridgeMessageGuard({ instanceId: INSTANCE_ID, tenantEpoch: 7 });
    const first = guard.createWorkStamp();
    expect(guard.isWorkCurrent(first)).toBe(true);
    expect(guard.advance({ instanceId: OTHER_INSTANCE_ID, tenantEpoch: 7 })).toBe(true);
    expect(guard.isWorkCurrent(first)).toBe(false);

    const rendererRestart = guard.createWorkStamp();
    expect(guard.advance({ instanceId: INSTANCE_ID, tenantEpoch: 8 })).toBe(true);
    expect(guard.isWorkCurrent(rendererRestart)).toBe(false);
    expect(guard.advance({ instanceId: OTHER_INSTANCE_ID, tenantEpoch: 7 })).toBe(false);
    expect(guard.acceptMessage('message_aaaaaaaaaaaaaaaa', rendererRestart)).toEqual({
      ok: false,
      reasonCode: 'stale-tenant',
    });
  });

  it('emits only bounded allowlisted diagnostic metadata', () => {
    const secrets = [
      JWT,
      'refresh-secret',
      UUID,
      `${APP_WEB_ORIGIN}/invite#invite=${'a'.repeat(64)}`,
      'old-password',
      '?token=query-secret',
      'provider exploded with private body',
    ];
    const diagnostic = createBridgeDiagnostic({
      direction: 'web-to-native',
      type: 'navigation.external.request',
      outcome: 'rejected',
      reasonCode: 'origin-not-allowed',
      routeFamily: 'unknown',
      accessToken: secrets[0],
      refreshToken: secrets[1],
      userId: secrets[2],
      url: `${secrets[3]}${secrets[5]}`,
      password: secrets[4],
      providerError: secrets[6],
    });
    const serialized = JSON.stringify(diagnostic);
    expect(diagnostic).toEqual({
      direction: 'web-to-native',
      type: 'navigation.external.request',
      outcome: 'rejected',
      reasonCode: 'origin-not-allowed',
      routeFamily: 'unknown',
    });
    for (const secret of secrets) expect(serialized).not.toContain(secret);

    expect(createBridgeDiagnostic({ reasonCode: secrets[6] })).toEqual({
      direction: 'unknown',
      type: 'unknown',
      outcome: 'rejected',
      reasonCode: 'invalid-diagnostic',
    });
  });
});
