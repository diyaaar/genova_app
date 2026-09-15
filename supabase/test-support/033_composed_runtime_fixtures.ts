import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { chmod, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createRepertoireFileTicket } from '../functions/repertoire-file/ticket';

type FixtureRecord = {
  version: 1;
  createdAt: string;
  adminEmail: string;
  adminPassword: string;
  adminUserId: string;
  choristEmail: string;
  choristPassword: string;
  choristUserId: string;
  choirA: string;
  choirB: string;
  memberA: string;
  memberB: string;
  targetMember: string;
  roleIds: string[];
  memberRoleIds: string[];
  announcementId: string;
  rehearsalId: string;
  inviteeId: string;
  attendanceId: string;
  profileRequestId: string;
  songId: string;
  repertoireFileId: string;
  assignmentId: string;
  assignmentTargetId: string;
  submissionId: string;
  protectedBucket: string;
  protectedObjectPath: string;
  profileBucketCreated: boolean;
  pdfSize: number;
  pdfSha256: string;
  baseline: Record<string, number>;
};

const TRACKED_TABLES = [
  'choirs', 'roles', 'choir_members', 'choir_member_roles', 'announcements', 'rehearsals',
  'rehearsal_invitees', 'attendance', 'profile_change_requests', 'repertoire', 'repertoire_files',
  'repertoire_cache_versions', 'assignments', 'assignment_targets', 'assignment_submissions',
] as const;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function assertOwnedPath(pathValue: string, expectedName: string): string {
  const runtimeDir = resolve(required('GENOVA_033_WORKDIR'));
  const path = resolve(pathValue);
  assert.equal(path, resolve(runtimeDir, expectedName));
  return path;
}

function assertLocalRuntime(urlValue: string, serviceRoleKey: string): void {
  const url = new URL(urlValue);
  assert.equal(url.protocol, 'http:');
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.port, '54321');
  assert.equal(process.env.GENOVA_033_PROJECT_ID, 'genova-033-runtime');
  const parts = serviceRoleKey.split('.');
  assert.equal(parts.length, 3);
  const claims = JSON.parse(Buffer.from(parts[1] ?? '', 'base64url').toString('utf8')) as { iss?: string; role?: string };
  assert.equal(claims.iss, 'supabase-demo');
  assert.equal(claims.role, 'service_role');
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function noError(error: { message: string } | null, label: string): Promise<void> {
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function countRows(admin: SupabaseClient, table: string): Promise<number> {
  const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
  await noError(error, `count ${table}`);
  assert.notEqual(count, null);
  return count as number;
}

async function snapshot(admin: SupabaseClient): Promise<Record<string, number>> {
  return Object.fromEntries(await Promise.all(TRACKED_TABLES.map(async (table) => [table, await countRows(admin, table)])));
}

async function loadFixture(path: string): Promise<FixtureRecord> {
  const fixture = JSON.parse(await readFile(path, 'utf8')) as FixtureRecord;
  assert.equal(fixture.version, 1);
  return fixture;
}

function clientFor(apiUrl: string, key: string) {
  return createClient(apiUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signInAndSelect(apiUrl: string, anonKey: string, fixture: FixtureRecord, choirId: string) {
  const client = clientFor(apiUrl, anonKey);
  const { data, error } = await client.auth.signInWithPassword({
    email: fixture.adminEmail,
    password: fixture.adminPassword,
  });
  await noError(error, 'sign in synthetic admin');
  assert.equal(data.user?.id, fixture.adminUserId);
  const { data: selected, error: selectedError } = await client.rpc('set_active_choir', { p_choir_id: choirId });
  await noError(selectedError, 'select synthetic choir');
  assert.equal(selected, choirId);
  return { client, accessToken: data.session?.access_token ?? '' };
}

async function refreshProtectedTicket(admin: SupabaseClient, apiUrl: string, anonKey: string, fixture: FixtureRecord) {
  const { client, accessToken } = await signInAndSelect(apiUrl, anonKey, fixture, fixture.choirA);
  assert.ok(accessToken);
  const response = await fetch(`${apiUrl}/functions/v1/repertoire-file`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId: fixture.repertoireFileId }),
  });
  const responseBody = await response.text();
  assert.equal(response.status, 200, `protected ticket failed: ${responseBody}`);
  const payload = JSON.parse(responseBody) as { url?: unknown; expiresAt?: unknown };
  assert.equal(typeof payload.url, 'string');
  assert.equal(typeof payload.expiresAt, 'number');
  const publicEndpoint = `${apiUrl}/functions/v1/repertoire-file`;
  const ticket = new URL(payload.url as string, publicEndpoint);
  assert.equal(ticket.origin, new URL(apiUrl).origin);
  assert.equal(ticket.pathname, '/functions/v1/repertoire-file');
  assert.equal(ticket.searchParams.get('fileId'), fixture.repertoireFileId);
  assert.ok(ticket.searchParams.get('ticket'));
  await noError((await admin.from('assignment_submissions').update({
    drive_web_view_link: ticket.toString(),
  }).eq('id', fixture.submissionId)).error, 'refresh submission ticket');
  await client.auth.signOut({ scope: 'local' });
  console.log(`PASS protected_ticket refreshed expires=${payload.expiresAt}`);
}

async function expireProtectedTicket(admin: SupabaseClient, apiUrl: string, serviceKey: string, fixture: FixtureRecord) {
  const expired = await createRepertoireFileTicket(
    { fileId: fixture.repertoireFileId, choirId: fixture.choirA },
    serviceKey,
    1_000,
    Date.now() - 2_000,
  );
  const ticket = new URL('/functions/v1/repertoire-file', apiUrl);
  ticket.searchParams.set('fileId', fixture.repertoireFileId);
  ticket.searchParams.set('ticket', expired.token);
  await noError((await admin.from('assignment_submissions').update({
    drive_web_view_link: ticket.toString(),
  }).eq('id', fixture.submissionId)).error, 'expire submission ticket');
  console.log('PASS protected_ticket expired=true');
}

async function deleteOwnedRows(admin: SupabaseClient, fixture: Pick<FixtureRecord,
  'choirA' | 'choirB' | 'memberA' | 'memberB' | 'targetMember' | 'roleIds' | 'memberRoleIds'
  | 'announcementId' | 'rehearsalId' | 'inviteeId' | 'attendanceId' | 'profileRequestId'
  | 'songId' | 'repertoireFileId' | 'assignmentId' | 'assignmentTargetId' | 'submissionId'>) {
  const deletions: Array<[string, string[]]> = [
    ['attendance', [fixture.attendanceId]],
    ['rehearsal_invitees', [fixture.inviteeId]],
    ['rehearsals', [fixture.rehearsalId]],
    ['profile_change_requests', [fixture.profileRequestId]],
    ['assignment_submissions', [fixture.submissionId]],
    ['assignment_targets', [fixture.assignmentTargetId]],
    ['assignments', [fixture.assignmentId]],
    ['repertoire_files', [fixture.repertoireFileId]],
    ['repertoire', [fixture.songId]],
    ['announcements', [fixture.announcementId]],
    ['choir_member_roles', fixture.memberRoleIds],
    ['choir_members', [fixture.memberA, fixture.memberB, fixture.targetMember]],
    ['roles', fixture.roleIds],
  ];
  for (const [table, ids] of deletions) {
    await noError((await admin.from(table).delete().in('id', ids)).error, `cleanup ${table}`);
  }
  await noError((await admin.from('repertoire_cache_versions').delete()
    .in('choir_id', [fixture.choirA, fixture.choirB])).error, 'cleanup repertoire_cache_versions');
  await noError((await admin.from('choirs').delete()
    .in('id', [fixture.choirA, fixture.choirB])).error, 'cleanup choirs');
}

async function prepare(admin: SupabaseClient, apiUrl: string, anonKey: string, fixturePath: string, envPath: string) {
  const baseline = await snapshot(admin);
  const pdfBytes = new Uint8Array(await readFile(resolve(required('GENOVA_033_PDF_PATH'))));
  assert.equal(pdfBytes.byteLength, 65_905);
  assert.equal(sha256(pdfBytes), '39fcafaec0263d8c2429a66d4ea941180692a99749be398a1d48c8fd5397d6a3');
  const runId = randomUUID();
  const adminEmail = `033-composed-${runId}@example.invalid`;
  const choristEmail = `033-chorist-${runId}@example.invalid`;
  const adminPassword = `Gx9${randomBytes(18).toString('base64url')}Aa1`;
  const choristPassword = `Cy8${randomBytes(18).toString('base64url')}Bb2`;
  const ids = Array.from({ length: 19 }, () => randomUUID());
  const [choirA, choirB, memberA, memberB, targetMember, chefRoleA, koristRoleA, chefRoleB,
    memberRoleA, memberRoleB, targetRole, announcementId, rehearsalId, inviteeId, attendanceId,
    profileRequestId, songId, repertoireFileId, assignmentId] = ids as string[];
  const assignmentTargetId = randomUUID();
  const submissionId = randomUUID();
  const protectedBucket = `genova-033-${runId}`;
  const protectedObjectPath = 'protected-score.pdf';
  let adminUserId: string | null = null;
  let choristUserId: string | null = null;
  let protectedBucketCreated = false;
  let profileBucketCreated = false;

  try {
    const adminCreate = await admin.auth.admin.createUser({ email: adminEmail, password: adminPassword, email_confirm: true });
    await noError(adminCreate.error, 'create admin user');
    adminUserId = adminCreate.data.user?.id ?? null;
    assert.ok(adminUserId);
    const choristCreate = await admin.auth.admin.createUser({ email: choristEmail, password: choristPassword, email_confirm: true });
    await noError(choristCreate.error, 'create chorist user');
    choristUserId = choristCreate.data.user?.id ?? null;
    assert.ok(choristUserId);

    await noError((await admin.from('choirs').insert([
      { id: choirA, slug: `033-a-${runId}`, name: '033 Sentetik Koro A' },
      { id: choirB, slug: `033-b-${runId}`, name: '033 Sentetik Koro B' },
    ])).error, 'insert choirs');
    await noError((await admin.from('roles').insert([
      { id: chefRoleA, choir_id: choirA, name: 'Şef' },
      { id: koristRoleA, choir_id: choirA, name: 'Korist' },
      { id: chefRoleB, choir_id: choirB, name: 'Şef' },
    ])).error, 'insert roles');
    await noError((await admin.from('choir_members').insert([
      { id: memberA, auth_user_id: adminUserId, choir_id: choirA, email: adminEmail, first_name: '033', last_name: 'Şef A', voice_group: 'Alto', join_date: '2026-09-01', linkedin_url: 'https://example.com/033-safe' },
      { id: memberB, auth_user_id: adminUserId, choir_id: choirB, email: adminEmail, first_name: '033', last_name: 'Şef B', voice_group: 'Bass', join_date: '2026-09-01' },
      { id: targetMember, auth_user_id: choristUserId, choir_id: choirA, email: choristEmail, first_name: '033', last_name: 'Korist Hedef', voice_group: 'Alto', join_date: '2026-09-02' },
    ])).error, 'insert members');
    await noError((await admin.from('choir_member_roles').insert([
      { id: memberRoleA, choir_id: choirA, member_id: memberA, role_id: chefRoleA },
      { id: memberRoleB, choir_id: choirB, member_id: memberB, role_id: chefRoleB },
      { id: targetRole, choir_id: choirA, member_id: targetMember, role_id: koristRoleA },
    ])).error, 'insert member roles');
    await noError((await admin.from('announcements').insert({
      id: announcementId, choir_id: choirA, title: '033 Bileşik Duyuru',
      description: [
        '<p>Yerel bileşik kabul.</p>',
        '<p><a href="/">Native ana sayfa</a> <a href="/repertuvar">Native repertuvar</a></p>',
        '<p><a href="/chat">Hazır olmayan chat</a> <a href="/odevler">Hazır olmayan ödevler</a></p>',
        '<p><a href="https://example.com/033-external">Güvenli dış bağlantı</a> <a href="http://example.com/033-http">Reddedilen HTTP</a></p>',
        '<p><a href="genova-033://denied">Reddedilen özel şema</a> <a href="/ayarlar">Reddedilen bilinmeyen rota</a></p>',
        '<p><a href="/profil" target="_blank" rel="noopener noreferrer">Reddedilen popup</a></p>',
      ].join(''),
      icon: 'megaphone', created_by: memberA, target_users: [], target_voice_groups: [], is_hidden: false,
    })).error, 'insert announcement');
    await noError((await admin.from('rehearsals').insert({
      id: rehearsalId, choir_id: choirA, date: '2026-09-12', start_time: '19:30:00', end_time: '21:30:00',
      title: '033 Bileşik Prova', location: 'Yerel Salon', notes: '<p>Sentetik prova.</p>',
      collect_attendance: true, created_by: memberA,
    })).error, 'insert rehearsal');
    await noError((await admin.from('rehearsal_invitees').insert({ id: inviteeId, choir_id: choirA, rehearsal_id: rehearsalId, member_id: targetMember })).error, 'insert invitee');
    await noError((await admin.from('attendance').insert({ id: attendanceId, choir_id: choirA, rehearsal_id: rehearsalId, member_id: targetMember, status: 'pending' })).error, 'insert attendance');
    await noError((await admin.from('profile_change_requests').insert({
      id: profileRequestId, choir_id: choirA, member_id: targetMember,
      changes_json: { about_text: '033 güncel sentetik açıklama' },
      previous_values_json: { about_text: null }, status: 'pending', note: '033 bileşik kabul',
    })).error, 'insert profile request');
    await noError((await admin.from('repertoire').insert({ id: songId, choir_id: choirA, title: '033 Sentetik Eser', composer: 'Yerel Kabul', drive_folder_id: '033-folder', is_visible: true })).error, 'insert repertoire');
    await noError((await admin.from('repertoire_files').insert({
      id: repertoireFileId, choir_id: choirA, song_id: songId, file_name: '033-protected-score.pdf',
      file_type: 'sheet', partition_label: 'Alto', drive_file_id: `033-${repertoireFileId}`,
      drive_download_link: `storage://${protectedBucket}/${protectedObjectPath}`, mime_type: 'application/pdf',
      file_size_bytes: pdfBytes.byteLength, uploaded_by: memberA,
    })).error, 'insert repertoire file');
    await noError((await admin.from('assignments').insert({ id: assignmentId, choir_id: choirA, title: '033 Sentetik Ödev', description: 'Bileşik dosya çıkışı', created_by: memberA, is_active: true })).error, 'insert assignment');
    await noError((await admin.from('assignment_targets').insert({ id: assignmentTargetId, choir_id: choirA, assignment_id: assignmentId, member_id: targetMember })).error, 'insert assignment target');
    await noError((await admin.from('assignment_submissions').insert({
      id: submissionId, choir_id: choirA, assignment_id: assignmentId, member_id: targetMember,
      drive_file_id: `033-${repertoireFileId}`, drive_web_view_link: null, drive_download_link: null,
      file_name: '033-protected-score.pdf', mime_type: 'application/pdf', file_size_bytes: pdfBytes.byteLength,
      status: 'pending', submission_note: '033 sentetik teslim',
    })).error, 'insert assignment submission');
    await noError((await admin.storage.createBucket(protectedBucket, { public: false })).error, 'create protected bucket');
    protectedBucketCreated = true;
    await noError((await admin.storage.from(protectedBucket).upload(protectedObjectPath, pdfBytes, { contentType: 'application/pdf', upsert: false })).error, 'upload protected PDF');
    const bucketList = await admin.storage.listBuckets();
    await noError(bucketList.error, 'list buckets');
    if (!bucketList.data?.some((bucket) => bucket.name === 'chorister-profiles')) {
      await noError((await admin.storage.createBucket('chorister-profiles', { public: true })).error, 'create profile bucket');
      profileBucketCreated = true;
    }

    const fixture: FixtureRecord = {
      version: 1, createdAt: new Date().toISOString(), adminEmail, adminPassword, adminUserId,
      choristEmail, choristPassword, choristUserId, choirA, choirB, memberA, memberB, targetMember,
      roleIds: [chefRoleA, koristRoleA, chefRoleB], memberRoleIds: [memberRoleA, memberRoleB, targetRole],
      announcementId, rehearsalId, inviteeId, attendanceId, profileRequestId, songId, repertoireFileId,
      assignmentId, assignmentTargetId, submissionId, protectedBucket, protectedObjectPath,
      profileBucketCreated, pdfSize: pdfBytes.byteLength, pdfSha256: sha256(pdfBytes), baseline,
    };
    await refreshProtectedTicket(admin, apiUrl, anonKey, fixture);
    await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    await writeFile(envPath, [
      `NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
      'NEXT_PUBLIC_GENOVA_033_ACCEPTANCE=1',
      'NEXT_PUBLIC_GENOVA_033_APP_ORIGIN=http://127.0.0.1:18033',
      'EXPO_PUBLIC_GENOVA_033_ACCEPTANCE=1',
      'EXPO_PUBLIC_GENOVA_033_APP_ORIGIN=http://127.0.0.1:18033',
      'EXPO_PUBLIC_GENOVA_033_CREDENTIAL_URL=http://127.0.0.1:18034/credentials',
      `EXPO_PUBLIC_SUPABASE_URL=${apiUrl}`,
      `EXPO_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
      `EXPO_PUBLIC_GENOVA_033_EMAIL=${adminEmail}`,
      `EXPO_PUBLIC_GENOVA_033_CHORIST_EMAIL=${choristEmail}`,
      `EXPO_PUBLIC_GENOVA_033_CHOIR_A=${choirA}`,
      `EXPO_PUBLIC_GENOVA_033_CHOIR_B=${choirB}`,
      `EXPO_PUBLIC_GENOVA_033_MEMBER_A=${memberA}`,
      `EXPO_PUBLIC_GENOVA_033_TARGET_MEMBER=${targetMember}`,
      `EXPO_PUBLIC_GENOVA_033_ANNOUNCEMENT_ID=${announcementId}`,
      `GENOVA_033_CHORIST_EMAIL=${choristEmail}`,
      `GENOVA_033_TARGET_MEMBER=${targetMember}`,
      `GENOVA_033_ANNOUNCEMENT_ID=${announcementId}`,
      `GENOVA_033_REHEARSAL_ID=${rehearsalId}`,
      `GENOVA_033_REPERTOIRE_FILE_ID=${repertoireFileId}`,
      `GENOVA_033_SUBMISSION_ID=${submissionId}`,
      '',
    ].join('\n'), { mode: 0o600, flag: 'wx' });
    await chmod(fixturePath, 0o600);
    await chmod(envPath, 0o600);
    console.log(`PASS fixture_prepared users=2 choirs=2 routes=9 pdf=${pdfBytes.byteLength}`);
    console.log(`PASS fixture_pdf bytes=${pdfBytes.byteLength} sha256=${sha256(pdfBytes)}`);
  } catch (error) {
    await Promise.all([unlink(fixturePath).catch(() => undefined), unlink(envPath).catch(() => undefined)]);
    if (protectedBucketCreated) {
      await admin.storage.from(protectedBucket).remove([protectedObjectPath]);
      await admin.storage.deleteBucket(protectedBucket);
    }
    if (profileBucketCreated) await admin.storage.deleteBucket('chorister-profiles');
    if (adminUserId && choristUserId) {
      await deleteOwnedRows(admin, {
        choirA, choirB, memberA, memberB, targetMember,
        roleIds: [chefRoleA, koristRoleA, chefRoleB],
        memberRoleIds: [memberRoleA, memberRoleB, targetRole],
        announcementId, rehearsalId, inviteeId, attendanceId, profileRequestId,
        songId, repertoireFileId, assignmentId, assignmentTargetId, submissionId,
      }).catch(() => undefined);
    }
    if (adminUserId) await admin.auth.admin.deleteUser(adminUserId);
    if (choristUserId) await admin.auth.admin.deleteUser(choristUserId);
    throw error;
  }
}

async function verify(admin: SupabaseClient, apiUrl: string, anonKey: string, fixture: FixtureRecord) {
  const { client } = await signInAndSelect(apiUrl, anonKey, fixture, fixture.choirA);
  const [announcements, members, rehearsals, requests] = await Promise.all([
    client.from('announcements').select('id,title').eq('id', fixture.announcementId),
    client.from('choir_members').select('id,first_name,last_name').in('id', [fixture.memberA, fixture.targetMember]),
    client.from('rehearsals').select('id,title').eq('id', fixture.rehearsalId),
    client.from('profile_change_requests').select('id,status').eq('id', fixture.profileRequestId),
  ]);
  for (const [label, result] of [['announcements', announcements], ['members', members], ['rehearsals', rehearsals], ['requests', requests]] as const) {
    await noError(result.error, `RLS read ${label}`);
    assert.ok((result.data?.length ?? 0) > 0, `missing ${label}`);
  }
  const { data: invitationList, error: invitationError } = await client.functions.invoke('choir-invitations', {
    body: { action: 'list', choirId: fixture.choirA },
  });
  await noError(invitationError, 'invitation Edge list');
  assert.ok(Array.isArray((invitationList as { invitations?: unknown[] })?.invitations));
  const protectedObject = await admin.storage.from(fixture.protectedBucket).download(fixture.protectedObjectPath);
  await noError(protectedObject.error, 'download protected fixture');
  assert.ok(protectedObject.data);
  const bytes = new Uint8Array(await protectedObject.data.arrayBuffer());
  assert.equal(bytes.byteLength, fixture.pdfSize);
  assert.equal(sha256(bytes), fixture.pdfSha256);
  await client.auth.signOut({ scope: 'local' });
  console.log('PASS fixture_verified rls=4 invitation_edge=list protected_bytes=exact');
}

async function cleanup(admin: SupabaseClient, fixture: FixtureRecord) {
  await admin.storage.from(fixture.protectedBucket).remove([fixture.protectedObjectPath]);
  await admin.storage.deleteBucket(fixture.protectedBucket);
  for (const userId of [fixture.adminUserId, fixture.choristUserId]) {
    const objects = await admin.storage.from('chorister-profiles').list(`public/${userId}`, { limit: 1000 });
    if (!objects.error && objects.data?.length) {
      await admin.storage.from('chorister-profiles').remove(objects.data.map((item) => `public/${userId}/${item.name}`));
    }
  }
  if (fixture.profileBucketCreated) await admin.storage.deleteBucket('chorister-profiles');
  await deleteOwnedRows(admin, fixture);
  await noError((await admin.auth.admin.deleteUser(fixture.adminUserId)).error, 'cleanup admin user');
  await noError((await admin.auth.admin.deleteUser(fixture.choristUserId)).error, 'cleanup chorist user');
  assert.deepEqual(await snapshot(admin), fixture.baseline, 'tracked target baseline changed');
  console.log('PASS fixture_cleanup target_baseline=restored');
}

async function main() {
  const action = process.argv[2];
  assert.ok(['prepare', 'status', 'refresh-ticket', 'expire-ticket', 'cleanup'].includes(action ?? ''));
  const apiUrl = required('SUPABASE_URL');
  const anonKey = required('SUPABASE_ANON_KEY');
  const serviceKey = required('SUPABASE_SERVICE_ROLE_KEY');
  assertLocalRuntime(apiUrl, serviceKey);
  const fixturePath = assertOwnedPath(required('GENOVA_033_FIXTURE_PATH'), '.033-fixture.json');
  const envPath = assertOwnedPath(required('GENOVA_033_ENV_PATH'), '.033-runtime.env');
  const admin = clientFor(apiUrl, serviceKey);
  if (action === 'prepare') return prepare(admin, apiUrl, anonKey, fixturePath, envPath);
  const fixture = await loadFixture(fixturePath);
  if (action === 'status') return verify(admin, apiUrl, anonKey, fixture);
  if (action === 'refresh-ticket') return refreshProtectedTicket(admin, apiUrl, anonKey, fixture);
  if (action === 'expire-ticket') return expireProtectedTicket(admin, apiUrl, serviceKey, fixture);
  await cleanup(admin, fixture);
  await unlink(fixturePath);
  await unlink(envPath);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
