import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { chmod, readFile, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type FixtureRecord = {
  version: 1;
  createdAt: string;
  email: string;
  password: string;
  userId: string;
  choirA: string;
  choirB: string;
  memberA: string;
  memberB: string;
  roleA: string;
  roleB: string;
  memberRoleA: string;
  memberRoleB: string;
  songId: string;
  fileId: string;
  assignmentId: string;
  annotationIds: string[];
  bucket: string;
  objectPath: string;
  pdfSize: number;
  pdfSha256: string;
  baseline: Record<string, number>;
};

const TRACKED_TABLES = [
  'choirs',
  'roles',
  'choir_members',
  'choir_member_roles',
  'repertoire',
  'repertoire_files',
  'repertoire_pdf_annotations',
  'repertoire_cache_versions',
  'song_assignments',
] as const;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function assertLocalRuntime(urlValue: string, serviceRoleKey: string): void {
  const url = new URL(urlValue);
  assert.equal(url.protocol, 'http:');
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
  assert.equal(url.port, '54321');
  assert.equal(process.env.GENOVA_021_PROJECT_ID, 'genova-021-runtime');
  const parts = serviceRoleKey.split('.');
  assert.equal(parts.length, 3);
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
    iss?: string;
    role?: string;
  };
  assert.equal(claims.iss, 'supabase-demo');
  assert.equal(claims.role, 'service_role');
}

function assertOwnedPath(pathValue: string, expectedName: string): string {
  const runtimeDir = resolve(required('GENOVA_021_WORKDIR'));
  const path = resolve(pathValue);
  assert.equal(path, resolve(runtimeDir, expectedName));
  return path;
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
  return Object.fromEntries(await Promise.all(
    TRACKED_TABLES.map(async (table) => [table, await countRows(admin, table)]),
  ));
}

async function loadFixture(path: string): Promise<FixtureRecord> {
  const fixture = JSON.parse(await readFile(path, 'utf8')) as FixtureRecord;
  assert.equal(fixture.version, 1);
  return fixture;
}

async function prepare(
  admin: SupabaseClient,
  apiUrl: string,
  anonKey: string,
  fixturePath: string,
  mobileEnvPath: string,
): Promise<void> {
  const baseline = await snapshot(admin);
  assert.equal((await admin.auth.admin.listUsers()).data.users.filter(
    (user) => user.email?.startsWith('021-mobile-'),
  ).length, 0, 'stale 021 Auth fixture exists');

  const pdfPath = resolve(required('GENOVA_021_PDF_PATH'));
  const annotationPath = resolve(required('GENOVA_021_ANNOTATION_PATH'));
  const pdfBytes = new Uint8Array(await readFile(pdfPath));
  const annotations = JSON.parse(await readFile(annotationPath, 'utf8')) as Array<{
    page_number: number;
    layer_type: 'personal' | 'shared_all';
    annotations_json: unknown;
  }>;
  assert.equal(pdfBytes.byteLength, 65_905, 'unexpected synthetic PDF size');
  assert.equal(sha256(pdfBytes), '39fcafaec0263d8c2429a66d4ea941180692a99749be398a1d48c8fd5397d6a3');

  const runId = randomUUID();
  const email = `021-mobile-${runId}@example.invalid`;
  const password = `Gx9${randomBytes(18).toString('base64url')}Aa1`;
  const choirA = randomUUID();
  const choirB = randomUUID();
  const memberA = randomUUID();
  const memberB = randomUUID();
  const roleA = randomUUID();
  const roleB = randomUUID();
  const memberRoleA = randomUUID();
  const memberRoleB = randomUUID();
  const songId = randomUUID();
  const fileId = randomUUID();
  const assignmentId = randomUUID();
  const annotationIds = annotations.map(() => randomUUID());
  const bucket = `genova-021-${runId}`;
  const objectPath = 'score-40-pages.pdf';

  let userId: string | null = null;
  let bucketCreated = false;
  try {
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    await noError(userError, 'create synthetic user');
    assert.ok(userData.user?.id);
    userId = userData.user.id;

    await noError((await admin.from('choirs').insert([
      { id: choirA, slug: `021-a-${runId}`, name: '021 Sentetik Koro A' },
      { id: choirB, slug: `021-b-${runId}`, name: '021 Sentetik Koro B' },
    ])).error, 'insert choirs');
    await noError((await admin.from('roles').insert([
      { id: roleA, choir_id: choirA, name: 'Korist' },
      { id: roleB, choir_id: choirB, name: 'Korist' },
    ])).error, 'insert roles');
    await noError((await admin.from('choir_members').insert([
      {
        id: memberA,
        auth_user_id: userId,
        choir_id: choirA,
        first_name: '021',
        last_name: 'Member A',
        voice_group: 'Alto',
        join_date: '2026-09-09',
      },
      {
        id: memberB,
        auth_user_id: userId,
        choir_id: choirB,
        first_name: '021',
        last_name: 'Member B',
        voice_group: 'Alto',
        join_date: '2026-09-09',
      },
    ])).error, 'insert members');
    await noError((await admin.from('choir_member_roles').insert([
      { id: memberRoleA, member_id: memberA, role_id: roleA, choir_id: choirA },
      { id: memberRoleB, member_id: memberB, role_id: roleB, choir_id: choirB },
    ])).error, 'insert member roles');
    await noError((await admin.from('repertoire').insert({
      id: songId,
      choir_id: choirA,
      title: '021 Korunan Sentetik Eser',
      composer: 'Yerel Kabul',
      drive_folder_id: '021-synthetic-folder',
      is_visible: true,
    })).error, 'insert repertoire');
    await noError((await admin.from('repertoire_files').insert({
      id: fileId,
      choir_id: choirA,
      song_id: songId,
      file_name: '021-korunan-40-sayfa.pdf',
      file_type: 'sheet',
      partition_label: 'Alto',
      drive_file_id: `021-${fileId}`,
      drive_download_link: `storage://${bucket}/${objectPath}`,
      mime_type: 'application/pdf',
      file_size_bytes: pdfBytes.byteLength,
      uploaded_by: memberA,
    })).error, 'insert repertoire file');
    await noError((await admin.from('song_assignments').insert({
      id: assignmentId,
      choir_id: choirA,
      song_id: songId,
      member_id: memberA,
      assigned_by: memberA,
      part_name: 'Alto',
    })).error, 'insert assignment');
    await noError((await admin.from('repertoire_pdf_annotations').insert(
      annotations.map((row, index) => ({
        id: annotationIds[index],
        choir_id: choirA,
        song_id: songId,
        repertoire_file_id: fileId,
        page_number: row.page_number,
        layer_type: row.layer_type,
        owner_member_id: row.layer_type === 'personal' ? memberA : null,
        target_voice_group: null,
        annotations_json: row.annotations_json,
        schema_version: 1,
        created_by: memberA,
        updated_by: memberA,
      })),
    )).error, 'insert annotations');
    await noError((await admin.from('repertoire_cache_versions').upsert([
      { choir_id: choirA, scope: 'catalog', version: 1 },
      { choir_id: choirB, scope: 'catalog', version: 1 },
    ], { onConflict: 'choir_id,scope' })).error, 'upsert cache versions');
    await noError((await admin.storage.createBucket(bucket, { public: false })).error, 'create bucket');
    bucketCreated = true;
    await noError((await admin.storage.from(bucket).upload(objectPath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: false,
    })).error, 'upload score');

    const fixture: FixtureRecord = {
      version: 1,
      createdAt: new Date().toISOString(),
      email,
      password,
      userId,
      choirA,
      choirB,
      memberA,
      memberB,
      roleA,
      roleB,
      memberRoleA,
      memberRoleB,
      songId,
      fileId,
      assignmentId,
      annotationIds,
      bucket,
      objectPath,
      pdfSize: pdfBytes.byteLength,
      pdfSha256: sha256(pdfBytes),
      baseline,
    };
    await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    await writeFile(mobileEnvPath, [
      `EXPO_PUBLIC_SUPABASE_URL=${apiUrl}`,
      `EXPO_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
      `EXPO_PUBLIC_GENOVA_021_EMAIL=${email}`,
      `EXPO_PUBLIC_GENOVA_021_PASSWORD=${password}`,
      `EXPO_PUBLIC_GENOVA_021_CHOIR_A=${choirA}`,
      `EXPO_PUBLIC_GENOVA_021_CHOIR_B=${choirB}`,
      `EXPO_PUBLIC_GENOVA_021_FILE_ID=${fileId}`,
      '',
    ].join('\n'), { mode: 0o600, flag: 'wx' });
    await chmod(fixturePath, 0o600);
    await chmod(mobileEnvPath, 0o600);
    console.log(`PASS fixture_prepared user=synthetic choirs=2 file=${fileId}`);
    console.log(`PASS fixture_pdf bytes=${pdfBytes.byteLength} sha256=${sha256(pdfBytes)}`);
  } catch (error) {
    if (bucketCreated) {
      await admin.storage.from(bucket).remove([objectPath]);
      await admin.storage.deleteBucket(bucket);
    }
    for (const [table, ids] of [
      ['repertoire_pdf_annotations', annotationIds],
      ['song_assignments', [assignmentId]],
      ['repertoire_files', [fileId]],
      ['repertoire', [songId]],
      ['choir_member_roles', [memberRoleA, memberRoleB]],
      ['choir_members', [memberA, memberB]],
      ['roles', [roleA, roleB]],
    ] as Array<[string, string[]]>) {
      await admin.from(table).delete().in('id', ids);
    }
    await admin.from('repertoire_cache_versions').delete().in('choir_id', [choirA, choirB]);
    await admin.from('choirs').delete().in('id', [choirA, choirB]);
    if (userId) await admin.auth.admin.deleteUser(userId);
    throw error;
  }
}

async function verify(admin: SupabaseClient, apiUrl: string, anonKey: string, fixture: FixtureRecord): Promise<void> {
  const { data: objectData, error: objectError } = await admin.storage
    .from(fixture.bucket)
    .download(fixture.objectPath);
  await noError(objectError, 'download fixture object');
  assert.ok(objectData);
  const bytes = new Uint8Array(await objectData.arrayBuffer());
  assert.equal(bytes.byteLength, fixture.pdfSize);
  assert.equal(sha256(bytes), fixture.pdfSha256);

  const client = createClient(apiUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: fixture.email,
    password: fixture.password,
  });
  await noError(authError, 'sign in fixture user');
  assert.equal(authData.user?.id, fixture.userId);
  const { data: memberships, error: membershipError } = await client.rpc('list_my_choirs');
  await noError(membershipError, 'list fixture memberships');
  assert.equal(Array.isArray(memberships) ? memberships.length : -1, 2);
  assert.equal((memberships as Array<{ is_current: boolean }>).filter((row) => row.is_current).length, 0);
  const { data: selected, error: selectError } = await client.rpc('set_active_choir', {
    p_choir_id: fixture.choirA,
  });
  await noError(selectError, 'select choir A');
  assert.equal(selected, fixture.choirA);
  const { data: files, error: fileError } = await client.from('repertoire_files')
    .select('id,file_size_bytes,mime_type')
    .eq('id', fixture.fileId);
  await noError(fileError, 'read fixture file through RLS');
  assert.deepEqual(files, [{
    id: fixture.fileId,
    file_size_bytes: fixture.pdfSize,
    mime_type: 'application/pdf',
  }]);
  const { data: annotationRows, error: annotationError } = await client
    .from('repertoire_pdf_annotations')
    .select('id,page_number')
    .eq('repertoire_file_id', fixture.fileId);
  await noError(annotationError, 'read annotations through RLS');
  assert.equal(annotationRows?.length, fixture.annotationIds.length);
  await client.auth.signOut({ scope: 'local' });
  console.log(`PASS fixture_verified memberships=2 annotations=${fixture.annotationIds.length}`);
  console.log(`PASS fixture_object bytes=${bytes.byteLength} sha256=${sha256(bytes)}`);
}

async function cleanup(admin: SupabaseClient, fixture: FixtureRecord): Promise<void> {
  const deletions: Array<[string, string[]]> = [
    ['repertoire_pdf_annotations', fixture.annotationIds],
    ['song_assignments', [fixture.assignmentId]],
    ['repertoire_files', [fixture.fileId]],
    ['repertoire', [fixture.songId]],
    ['choir_member_roles', [fixture.memberRoleA, fixture.memberRoleB]],
    ['choir_members', [fixture.memberA, fixture.memberB]],
    ['roles', [fixture.roleA, fixture.roleB]],
  ];
  for (const [table, ids] of deletions) {
    await noError((await admin.from(table).delete().in('id', ids)).error, `cleanup ${table}`);
  }
  await noError((await admin.from('repertoire_cache_versions')
    .delete()
    .in('choir_id', [fixture.choirA, fixture.choirB])).error, 'cleanup cache versions');
  await noError((await admin.from('choirs')
    .delete()
    .in('id', [fixture.choirA, fixture.choirB])).error, 'cleanup choirs');
  await noError((await admin.storage.from(fixture.bucket).remove([fixture.objectPath])).error, 'cleanup object');
  await noError((await admin.storage.deleteBucket(fixture.bucket)).error, 'cleanup bucket');
  await noError((await admin.auth.admin.deleteUser(fixture.userId)).error, 'cleanup user');
  assert.deepEqual(await snapshot(admin), fixture.baseline, 'tracked target baseline changed');
  console.log('PASS fixture_cleanup target_baseline=restored');
}

async function main(): Promise<void> {
  const action = process.argv[2];
  assert.ok(['prepare', 'status', 'cleanup'].includes(action ?? ''), 'expected prepare, status or cleanup');
  const apiUrl = required('SUPABASE_URL');
  const anonKey = required('SUPABASE_ANON_KEY');
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
  assertLocalRuntime(apiUrl, serviceRoleKey);
  const fixturePath = assertOwnedPath(required('GENOVA_021_FIXTURE_PATH'), '.021-fixture.json');
  const mobileEnvPath = assertOwnedPath(required('GENOVA_021_MOBILE_ENV_PATH'), '.021-mobile.env');
  const admin = createClient(apiUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (action === 'prepare') {
    await prepare(admin, apiUrl, anonKey, fixturePath, mobileEnvPath);
    return;
  }
  const fixture = await loadFixture(fixturePath);
  if (action === 'status') {
    await verify(admin, apiUrl, anonKey, fixture);
    return;
  }
  await cleanup(admin, fixture);
  await unlink(fixturePath);
  await unlink(mobileEnvPath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
