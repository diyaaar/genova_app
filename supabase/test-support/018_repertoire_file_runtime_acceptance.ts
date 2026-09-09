import assert from 'node:assert/strict';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requestProtectedRepertoireFileTicket } from '../../lib/repertuvar/protected-file-client';

const TRACKED_TABLES = [
  'choirs',
  'roles',
  'choir_members',
  'choir_member_roles',
  'repertoire',
  'repertoire_files',
  'repertoire_cache_versions',
  'song_assignments',
] as const;

type UserFixture = {
  id: string;
  accessToken: string;
  client: SupabaseClient;
};

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function assertLocalRuntime(urlValue: string, serviceRoleKey: string): URL {
  const url = new URL(urlValue);
  assert.equal(url.protocol, 'http:', '018 runtime must use local HTTP');
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname), '018 runtime must use loopback');
  assert.equal(process.env.GENOVA_018_PROJECT_ID, 'genova-018-runtime');

  const parts = serviceRoleKey.split('.');
  assert.equal(parts.length, 3, '018 expects the disposable local JWT service-role key');
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
    iss?: string;
    role?: string;
  };
  assert.equal(claims.iss, 'supabase-demo', 'refusing a non-local Supabase issuer');
  assert.equal(claims.role, 'service_role', 'refusing a non-service-role test key');
  return url;
}

function sha256(bytes: ArrayBuffer | Uint8Array): string {
  const input = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  return createHash('sha256').update(input).digest('hex');
}

function makeExpiredTicket(fileId: string, choirId: string, secret: string): string {
  const payload = Buffer.from(JSON.stringify({
    version: 1,
    fileId,
    choirId,
    expiresAt: Date.now() - 60_000,
  })).toString('base64url');
  const signature = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

async function expectNoError(error: { message: string } | null, label: string): Promise<void> {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function countRows(admin: SupabaseClient, table: string): Promise<number> {
  const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
  await expectNoError(error, `count ${table}`);
  assert.notEqual(count, null, `missing count for ${table}`);
  return count as number;
}

async function snapshot(admin: SupabaseClient): Promise<Record<string, number>> {
  return Object.fromEntries(await Promise.all(
    TRACKED_TABLES.map(async (table) => [table, await countRows(admin, table)]),
  ));
}

async function createUser(
  admin: SupabaseClient,
  apiUrl: string,
  anonKey: string,
  label: string,
  runId: string,
): Promise<UserFixture> {
  const email = `018-${label}-${runId}@example.invalid`;
  const password = `G!${randomUUID()}aA1`;
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  await expectNoError(createError, `create ${label}`);
  assert.ok(created.user?.id, `missing ${label} user id`);

  const client = createClient(apiUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signedIn, error: signInError } = await client.auth.signInWithPassword({ email, password });
  await expectNoError(signInError, `sign in ${label}`);
  assert.ok(signedIn.session?.access_token, `missing ${label} access token`);
  return { id: created.user.id, accessToken: signedIn.session.access_token, client };
}

async function rawTicketRequest(endpoint: string, accessToken: string | null, fileId: string): Promise<Response> {
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fileId }),
  });
}

async function assertSafeFailure(
  response: Response,
  expectedStatus: number,
  forbiddenValues: string[],
): Promise<string> {
  assert.equal(response.status, expectedStatus);
  const body = await response.text();
  for (const value of forbiddenValues) assert.ok(!body.includes(value), 'failure leaked a protected value');
  return body;
}

async function removeFixtures(
  admin: SupabaseClient,
  ids: {
    choirIds: string[];
    roleIds: string[];
    memberIds: string[];
    memberRoleIds: string[];
    songIds: string[];
    fileIds: string[];
    assignmentIds: string[];
    userIds: string[];
  },
  bucket: string,
  objectPaths: string[],
  bucketCreated: boolean,
): Promise<void> {
  const cleanupErrors: unknown[] = [];
  const removals: Array<[string, string[]]> = [
    ['song_assignments', ids.assignmentIds],
    ['repertoire_files', ids.fileIds],
    ['repertoire', ids.songIds],
    ['choir_member_roles', ids.memberRoleIds],
    ['choir_members', ids.memberIds],
    ['roles', ids.roleIds],
  ];
  for (const [table, rowIds] of removals) {
    const { error } = await admin.from(table).delete().in('id', rowIds);
    if (error) cleanupErrors.push(new Error(`cleanup ${table}: ${error.message}`));
  }
  const { error: cacheError } = await admin.from('repertoire_cache_versions')
    .delete()
    .in('choir_id', ids.choirIds);
  if (cacheError) cleanupErrors.push(new Error(`cleanup repertoire_cache_versions: ${cacheError.message}`));
  const { error: choirError } = await admin.from('choirs').delete().in('id', ids.choirIds);
  if (choirError) cleanupErrors.push(new Error(`cleanup choirs: ${choirError.message}`));
  if (bucketCreated) {
    const { error: objectError } = await admin.storage.from(bucket).remove(objectPaths);
    if (objectError) cleanupErrors.push(new Error(`cleanup storage objects: ${objectError.message}`));
    const { error: bucketError } = await admin.storage.deleteBucket(bucket);
    if (bucketError) cleanupErrors.push(new Error(`cleanup storage bucket: ${bucketError.message}`));
  }
  for (const userId of ids.userIds) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) cleanupErrors.push(new Error(`cleanup auth user: ${error.message}`));
  }
  if (cleanupErrors.length > 0) throw new AggregateError(cleanupErrors, 'fixture cleanup failed');
}

async function main(): Promise<void> {
  const apiUrl = requiredEnvironment('SUPABASE_URL');
  const anonKey = requiredEnvironment('SUPABASE_ANON_KEY');
  const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY');
  const parsedApiUrl = assertLocalRuntime(apiUrl, serviceRoleKey);
  const endpoint = new URL('/functions/v1/repertoire-file', parsedApiUrl).toString();
  const admin = createClient(apiUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const baseline = await snapshot(admin);
  const runId = randomUUID();
  const bucket = `genova-018-${runId}`;

  const choirA = randomUUID();
  const choirB = randomUUID();
  const roleChef = randomUUID();
  const roleLeader = randomUUID();
  const roleChoristA = randomUUID();
  const roleChoristB = randomUUID();
  const songAllowed = randomUUID();
  const songHidden = randomUUID();
  const songActiveMetadata = randomUUID();
  const songActiveUpstream = randomUUID();
  const songMissing = randomUUID();
  const songLarge = randomUUID();
  const fileAllowed = randomUUID();
  const fileHidden = randomUUID();
  const fileActiveMetadata = randomUUID();
  const fileActiveUpstream = randomUUID();
  const fileMissing = randomUUID();
  const fileLarge = randomUUID();
  const assignmentAllowed = randomUUID();

  const users: UserFixture[] = [];
  const memberIds = Array.from({ length: 8 }, () => randomUUID());
  const memberRoleIds = Array.from({ length: 8 }, () => randomUUID());
  const objectPaths = ['allowed.pdf', 'active.html', 'large.pdf'];
  const fixtureIds = {
    choirIds: [choirA, choirB],
    roleIds: [roleChef, roleLeader, roleChoristA, roleChoristB],
    memberIds,
    memberRoleIds,
    songIds: [songAllowed, songHidden, songActiveMetadata, songActiveUpstream, songMissing, songLarge],
    fileIds: [fileAllowed, fileHidden, fileActiveMetadata, fileActiveUpstream, fileMissing, fileLarge],
    assignmentIds: [assignmentAllowed],
    userIds: [] as string[],
  };

  let primaryError: unknown;
  let bucketCreated = false;
  try {
    for (const label of ['chef', 'leader', 'assigned', 'unassigned', 'no-active', 'wrong-choir']) {
      const user = await createUser(admin, apiUrl, anonKey, label, runId);
      users.push(user);
      fixtureIds.userIds.push(user.id);
    }
    const [chef, leader, assigned, unassigned, noActive, wrongChoir] = users;

    await expectNoError((await admin.from('choirs').insert([
      { id: choirA, slug: `018-a-${runId}`, name: '018 Choir A' },
      { id: choirB, slug: `018-b-${runId}`, name: '018 Choir B' },
    ])).error, 'insert choirs');
    await expectNoError((await admin.from('roles').insert([
      { id: roleChef, choir_id: choirA, name: 'Şef' },
      { id: roleLeader, choir_id: choirA, name: 'Partisyon Şefi' },
      { id: roleChoristA, choir_id: choirA, name: 'Korist' },
      { id: roleChoristB, choir_id: choirB, name: 'Korist' },
    ])).error, 'insert roles');

    const memberRows = [
      [memberIds[0], chef.id, choirA, 'Chef', 'Şef'],
      [memberIds[1], leader.id, choirA, 'Leader', 'Alto'],
      [memberIds[2], assigned.id, choirA, 'Assigned', 'Alto'],
      [memberIds[3], unassigned.id, choirA, 'Unassigned', 'Tenor'],
      [memberIds[4], noActive.id, choirA, 'NoActiveA', 'Bass'],
      [memberIds[5], noActive.id, choirB, 'NoActiveB', 'Bass'],
      [memberIds[6], wrongChoir.id, choirA, 'WrongA', 'Bass'],
      [memberIds[7], wrongChoir.id, choirB, 'WrongB', 'Bass'],
    ].map(([id, authUserId, choirId, lastName, voiceGroup]) => ({
      id,
      auth_user_id: authUserId,
      choir_id: choirId,
      first_name: '018',
      last_name: lastName,
      voice_group: voiceGroup,
      join_date: '2026-09-09',
    }));
    await expectNoError((await admin.from('choir_members').insert(memberRows)).error, 'insert members');

    const memberRoleRows = [
      [memberRoleIds[0], memberIds[0], roleChef, choirA],
      [memberRoleIds[1], memberIds[1], roleLeader, choirA],
      [memberRoleIds[2], memberIds[2], roleChoristA, choirA],
      [memberRoleIds[3], memberIds[3], roleChoristA, choirA],
      [memberRoleIds[4], memberIds[4], roleChoristA, choirA],
      [memberRoleIds[5], memberIds[5], roleChoristB, choirB],
      [memberRoleIds[6], memberIds[6], roleChoristA, choirA],
      [memberRoleIds[7], memberIds[7], roleChoristB, choirB],
    ].map(([id, memberId, roleId, choirId]) => ({ id, member_id: memberId, role_id: roleId, choir_id: choirId }));
    await expectNoError((await admin.from('choir_member_roles').insert(memberRoleRows)).error, 'insert member roles');

    await expectNoError((await admin.from('repertoire').insert([
      { id: songAllowed, choir_id: choirA, title: '018 Allowed', is_visible: true },
      { id: songHidden, choir_id: choirA, title: '018 Hidden', is_visible: false },
      { id: songActiveMetadata, choir_id: choirA, title: '018 Active metadata', is_visible: true },
      { id: songActiveUpstream, choir_id: choirA, title: '018 Active upstream', is_visible: true },
      { id: songMissing, choir_id: choirA, title: '018 Missing', is_visible: true },
      { id: songLarge, choir_id: choirA, title: '018 Large', is_visible: true },
    ])).error, 'insert repertoire');

    await expectNoError((await admin.from('repertoire_files').insert([
      { id: fileAllowed, choir_id: choirA, song_id: songAllowed, file_name: 'allowed.pdf', file_type: 'sheet', drive_file_id: '018-allowed', drive_download_link: `storage://${bucket}/allowed.pdf`, mime_type: 'application/pdf' },
      { id: fileHidden, choir_id: choirA, song_id: songHidden, file_name: 'hidden.pdf', file_type: 'sheet', drive_file_id: '018-hidden', drive_download_link: `storage://${bucket}/hidden.pdf`, mime_type: 'application/pdf' },
      { id: fileActiveMetadata, choir_id: choirA, song_id: songActiveMetadata, file_name: 'active.svg', file_type: 'sheet', drive_file_id: '018-active-metadata', drive_download_link: `storage://${bucket}/active.svg`, mime_type: 'image/svg+xml' },
      { id: fileActiveUpstream, choir_id: choirA, song_id: songActiveUpstream, file_name: 'active-upstream.pdf', file_type: 'sheet', drive_file_id: '018-active-upstream', drive_download_link: `storage://${bucket}/active.html`, mime_type: 'application/pdf' },
      { id: fileMissing, choir_id: choirA, song_id: songMissing, file_name: 'missing.pdf', file_type: 'sheet', drive_file_id: '018-missing', drive_download_link: `storage://${bucket}/missing.pdf`, mime_type: 'application/pdf' },
      { id: fileLarge, choir_id: choirA, song_id: songLarge, file_name: 'large.pdf', file_type: 'sheet', drive_file_id: '018-large', drive_download_link: `storage://${bucket}/large.pdf`, mime_type: 'application/pdf' },
    ])).error, 'insert repertoire files');
    await expectNoError((await admin.from('song_assignments').insert({
      id: assignmentAllowed,
      choir_id: choirA,
      song_id: songAllowed,
      member_id: memberIds[2],
      assigned_by: memberIds[0],
      part_name: 'Alto',
    })).error, 'insert assignment');

    const pdfBytes = new TextEncoder().encode('%PDF-1.7\n018 synthetic protected score\n%%EOF\n');
    const largeBytes = new Uint8Array(8 * 1024 * 1024);
    largeBytes.set(pdfBytes.subarray(0, Math.min(pdfBytes.length, largeBytes.length)));
    largeBytes.fill(65, pdfBytes.length);
    await expectNoError((await admin.storage.createBucket(bucket, { public: false })).error, 'create bucket');
    bucketCreated = true;
    await expectNoError((await admin.storage.from(bucket).upload('allowed.pdf', pdfBytes, { contentType: 'application/pdf' })).error, 'upload PDF');
    await expectNoError((await admin.storage.from(bucket).upload('active.html', '<script>blocked</script>', { contentType: 'text/html' })).error, 'upload active MIME');
    await expectNoError((await admin.storage.from(bucket).upload('large.pdf', largeBytes, { contentType: 'application/pdf' })).error, 'upload large PDF');

    const storageHeaders = {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    };
    const activeStoragePath = `${bucket}/active.html`;
    const activeInfoResponse = await fetch(
      new URL(`/storage/v1/object/info/${activeStoragePath}`, parsedApiUrl),
      { headers: storageHeaders, cache: 'no-store', redirect: 'manual' },
    );
    assert.equal(activeInfoResponse.status, 200, 'Storage info probe failed');
    const activeInfo = await activeInfoResponse.json() as {
      content_type?: unknown;
      metadata?: { mimetype?: unknown };
    };
    const activeObjectResponse = await fetch(
      new URL(`/storage/v1/object/${activeStoragePath}`, parsedApiUrl),
      { headers: storageHeaders, cache: 'no-store', redirect: 'manual' },
    );
    assert.equal(activeObjectResponse.status, 200, 'Storage object probe failed');
    console.log(
      'OBSERVE storage_active_mime' +
      ` info=${String(activeInfo.content_type ?? activeInfo.metadata?.mimetype ?? 'missing')}` +
      ` response=${activeObjectResponse.headers.get('content-type') ?? 'missing'}`,
    );
    await activeObjectResponse.body?.cancel();

    const { error: selectionError } = await wrongChoir.client.rpc('set_active_choir', { p_choir_id: choirB });
    await expectNoError(selectionError, 'select wrong choir');

    const { data: authProbe, error: authProbeError } = await chef.client.auth.getUser();
    await expectNoError(authProbeError, 'probe actual Auth session');
    assert.equal(authProbe.user?.id, chef.id);
    const { data: choirProbe, error: choirProbeError } = await chef.client.rpc('current_choir_id');
    await expectNoError(choirProbeError, 'probe current choir RPC');
    assert.equal(choirProbe, choirA);
    const { data: fileProbe, error: fileProbeError } = await chef.client
      .from('repertoire_files')
      .select('id,choir_id')
      .eq('id', fileAllowed)
      .maybeSingle();
    await expectNoError(fileProbeError, 'probe RLS file lookup');
    assert.deepEqual(fileProbe, { id: fileAllowed, choir_id: choirA });

    const ticket = await requestProtectedRepertoireFileTicket({
      endpoint,
      accessToken: chef.accessToken,
      fileId: fileAllowed,
      fetcher: async (input, init) => {
        const response = await fetch(input, init);
        if (response.ok) {
          const payload = await response.clone().json() as { url?: string };
          const returnedUrl = payload.url ? new URL(payload.url, endpoint) : null;
          if (returnedUrl) {
            console.log(`OBSERVE ticket_url origin=${returnedUrl.origin} path=${returnedUrl.pathname}`);
          }
        }
        return response;
      },
    });
    const allowed = await fetch(ticket.url);
    assert.equal(allowed.status, 200);
    const allowedBytes = await allowed.arrayBuffer();
    assert.equal(sha256(allowedBytes), sha256(pdfBytes));
    assert.equal(allowed.headers.get('cache-control'), 'private, no-store');
    assert.equal(allowed.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(allowed.headers.get('accept-ranges'), 'bytes');

    const leaderTicket = await requestProtectedRepertoireFileTicket({ endpoint, accessToken: leader.accessToken, fileId: fileHidden });
    assert.ok(leaderTicket.expiresAt > Date.now());
    const assignedTicket = await requestProtectedRepertoireFileTicket({ endpoint, accessToken: assigned.accessToken, fileId: fileAllowed });
    assert.ok(assignedTicket.expiresAt > Date.now());

    await assertSafeFailure(await rawTicketRequest(endpoint, null, fileAllowed), 401, [serviceRoleKey]);
    await assertSafeFailure(await rawTicketRequest(endpoint, 'invalid-local-jwt', fileAllowed), 401, [serviceRoleKey]);
    await assertSafeFailure(await rawTicketRequest(endpoint, unassigned.accessToken, fileAllowed), 403, [serviceRoleKey]);
    await assertSafeFailure(await rawTicketRequest(endpoint, assigned.accessToken, fileHidden), 403, [serviceRoleKey]);
    await assertSafeFailure(await rawTicketRequest(endpoint, noActive.accessToken, fileAllowed), 403, [serviceRoleKey]);
    await assertSafeFailure(await rawTicketRequest(endpoint, wrongChoir.accessToken, fileAllowed), 403, [serviceRoleKey]);
    await assertSafeFailure(await rawTicketRequest(endpoint, chef.accessToken, fileActiveMetadata), 415, [serviceRoleKey]);

    const ticketUrl = new URL(ticket.url);
    const token = ticketUrl.searchParams.get('ticket');
    assert.ok(token);
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
    const tamperedUrl = new URL(ticket.url);
    tamperedUrl.searchParams.set('ticket', tampered);
    await assertSafeFailure(await fetch(tamperedUrl), 401, [serviceRoleKey, sha256(pdfBytes)]);
    const mismatchUrl = new URL(ticket.url);
    mismatchUrl.searchParams.set('fileId', randomUUID());
    await assertSafeFailure(await fetch(mismatchUrl), 401, [serviceRoleKey, sha256(pdfBytes)]);
    const expiredUrl = new URL(endpoint);
    expiredUrl.searchParams.set('fileId', fileAllowed);
    expiredUrl.searchParams.set('ticket', makeExpiredTicket(fileAllowed, choirA, serviceRoleKey));
    await assertSafeFailure(await fetch(expiredUrl), 401, [serviceRoleKey, sha256(pdfBytes)]);

    const head = await fetch(ticket.url, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-length'), String(pdfBytes.byteLength));
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    for (const [range, expectedStart, expectedEnd] of [
      ['bytes=0-7', 0, 7],
      ['bytes=8-', 8, pdfBytes.byteLength - 1],
      ['bytes=-8', pdfBytes.byteLength - 8, pdfBytes.byteLength - 1],
    ] as const) {
      const response = await fetch(ticket.url, { headers: { Range: range } });
      assert.equal(response.status, 206);
      assert.equal(response.headers.get('content-range'), `bytes ${expectedStart}-${expectedEnd}/${pdfBytes.byteLength}`);
      const body = new Uint8Array(await response.arrayBuffer());
      assert.deepEqual(body, pdfBytes.slice(expectedStart, expectedEnd + 1));
    }
    for (const range of ['bytes=999999-', 'bytes=4-1', 'bytes=0-1,3-4']) {
      const response = await fetch(ticket.url, { headers: { Range: range } });
      assert.equal(response.status, 416);
      assert.equal(response.headers.get('content-range'), `bytes */${pdfBytes.byteLength}`);
    }

    const upstreamMimeTicket = await requestProtectedRepertoireFileTicket({ endpoint, accessToken: chef.accessToken, fileId: fileActiveUpstream });
    await assertSafeFailure(await fetch(upstreamMimeTicket.url), 415, [serviceRoleKey, '<script>']);
    const missingTicket = await requestProtectedRepertoireFileTicket({ endpoint, accessToken: chef.accessToken, fileId: fileMissing });
    await assertSafeFailure(await fetch(missingTicket.url), 502, [serviceRoleKey]);

    const largeTicket = await requestProtectedRepertoireFileTicket({ endpoint, accessToken: chef.accessToken, fileId: fileLarge });
    const startedAt = performance.now();
    const largeResponse = await fetch(largeTicket.url);
    const largeResponseBytes = await largeResponse.arrayBuffer();
    const elapsedMs = Math.round(performance.now() - startedAt);
    assert.equal(largeResponse.status, 200);
    assert.equal(largeResponseBytes.byteLength, largeBytes.byteLength);
    assert.equal(sha256(largeResponseBytes), sha256(largeBytes));

    console.log('PASS actual Auth sessions + current-choir RPC + repertoire-file RLS over HTTP');
    console.log('PASS ticket issue/verify, checksum, HEAD, open/fixed/suffix ranges and 416 cases');
    console.log('PASS missing/invalid session, no selection, wrong choir, unassigned and hidden-file refusals');
    console.log('PASS expired/tampered/mismatched tickets, active MIME and missing upstream fail closed');
    console.log(`PASS bounded buffered response bytes=${largeBytes.byteLength} elapsed_ms=${elapsedMs} production_claim=none`);
  } catch (error) {
    primaryError = error;
  } finally {
    try {
      if (fixtureIds.userIds.length > 0) {
        await removeFixtures(admin, fixtureIds, bucket, objectPaths, bucketCreated);
      }
      assert.deepEqual(await snapshot(admin), baseline, 'tracked public fixture baseline changed');
      console.log('PASS tracked public fixture baseline restored');
    } catch (cleanupError) {
      if (primaryError) throw new AggregateError([primaryError, cleanupError], 'acceptance and cleanup both failed');
      throw cleanupError;
    }
  }
  if (primaryError) throw primaryError;
}

void main().catch((error: unknown) => {
  const pending = [error];
  while (pending.length > 0) {
    const current = pending.shift();
    if (current instanceof AggregateError) {
      pending.unshift(...current.errors);
      continue;
    }
    console.error(current instanceof Error ? current.stack : String(current));
  }
  process.exitCode = 1;
});
