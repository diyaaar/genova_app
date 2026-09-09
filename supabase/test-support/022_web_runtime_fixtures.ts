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
  pdfFileId: string;
  audioFileId: string;
  assignmentId: string;
  annotationIds: string[];
  bucket: string;
  pdfObjectPath: string;
  audioObjectPath: string;
  pdfSize: number;
  pdfSha256: string;
  audioSize: number;
  audioSha256: string;
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

function makeSyntheticWav(): Uint8Array {
  const sampleRate = 8_000;
  const sampleCount = sampleRate * 10;
  const dataSize = sampleCount * 2;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, value: string) => {
    [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, dataSize, true);
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.round(Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 8_000);
    view.setInt16(44 + index * 2, sample, true);
  }
  return bytes;
}

function assertLocalRuntime(urlValue: string, serviceRoleKey: string): void {
  const url = new URL(urlValue);
  assert.equal(url.protocol, 'http:');
  assert.ok(['127.0.0.1', 'localhost'].includes(url.hostname));
  assert.equal(url.port, '54321');
  assert.equal(process.env.GENOVA_022_PROJECT_ID, 'genova-022-runtime');
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
  const runtimeDir = resolve(required('GENOVA_022_WORKDIR'));
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
  webEnvPath: string,
): Promise<void> {
  const baseline = await snapshot(admin);
  assert.equal((await admin.auth.admin.listUsers()).data.users.filter(
    (user) => user.email?.startsWith('022-web-'),
  ).length, 0, 'stale 022 Auth fixture exists');

  const pdfPath = resolve(required('GENOVA_022_PDF_PATH'));
  const annotationPath = resolve(required('GENOVA_022_ANNOTATION_PATH'));
  const pdfBytes = new Uint8Array(await readFile(pdfPath));
  const audioBytes = makeSyntheticWav();
  const annotations = JSON.parse(await readFile(annotationPath, 'utf8')) as Array<{
    page_number: number;
    layer_type: 'personal' | 'shared_all';
    annotations_json: unknown;
  }>;
  assert.equal(pdfBytes.byteLength, 65_905, 'unexpected synthetic PDF size');
  assert.equal(sha256(pdfBytes), '39fcafaec0263d8c2429a66d4ea941180692a99749be398a1d48c8fd5397d6a3');

  const runId = randomUUID();
  const email = `022-web-${runId}@example.invalid`;
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
  const pdfFileId = randomUUID();
  const audioFileId = randomUUID();
  const assignmentId = randomUUID();
  const annotationIds = annotations.map(() => randomUUID());
  const bucket = `genova-022-${runId}`;
  const pdfObjectPath = 'score-40-pages.pdf';
  const audioObjectPath = 'tone-440hz.wav';

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
      { id: choirA, slug: `022-a-${runId}`, name: '022 Sentetik Koro A' },
      { id: choirB, slug: `022-b-${runId}`, name: '022 Sentetik Koro B' },
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
        first_name: '022',
        last_name: 'Member A',
        voice_group: 'Alto',
        join_date: '2026-09-09',
      },
      {
        id: memberB,
        auth_user_id: userId,
        choir_id: choirB,
        first_name: '022',
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
      title: '022 Korunan Sentetik Eser',
      composer: 'Yerel Kabul',
      drive_folder_id: '022-synthetic-folder',
      is_visible: true,
    })).error, 'insert repertoire');
    await noError((await admin.from('repertoire_files').insert([
      {
        id: pdfFileId,
        choir_id: choirA,
        song_id: songId,
        file_name: '022-korunan-40-sayfa.pdf',
        file_type: 'sheet',
        partition_label: 'Alto',
        drive_file_id: `022-${pdfFileId}`,
        drive_download_link: `storage://${bucket}/${pdfObjectPath}`,
        mime_type: 'application/pdf',
        file_size_bytes: pdfBytes.byteLength,
        uploaded_by: memberA,
      },
      {
        id: audioFileId,
        choir_id: choirA,
        song_id: songId,
        file_name: '022-korunan-440hz.wav',
        file_type: 'audio',
        partition_label: 'Alto',
        drive_file_id: `022-${audioFileId}`,
        drive_download_link: `storage://${bucket}/${audioObjectPath}`,
        mime_type: 'audio/wav',
        file_size_bytes: audioBytes.byteLength,
        uploaded_by: memberA,
      },
    ])).error, 'insert repertoire files');
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
        repertoire_file_id: pdfFileId,
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
    await noError((await admin.storage.from(bucket).upload(pdfObjectPath, pdfBytes, {
      contentType: 'application/pdf',
      upsert: false,
    })).error, 'upload score');
    await noError((await admin.storage.from(bucket).upload(audioObjectPath, audioBytes, {
      contentType: 'audio/wav',
      upsert: false,
    })).error, 'upload audio');

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
      pdfFileId,
      audioFileId,
      assignmentId,
      annotationIds,
      bucket,
      pdfObjectPath,
      audioObjectPath,
      pdfSize: pdfBytes.byteLength,
      pdfSha256: sha256(pdfBytes),
      audioSize: audioBytes.byteLength,
      audioSha256: sha256(audioBytes),
      baseline,
    };
    await writeFile(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
    await writeFile(webEnvPath, [
      `NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`,
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
      `GENOVA_022_EMAIL=${email}`,
      `GENOVA_022_PASSWORD=${password}`,
      `GENOVA_022_CHOIR_A=${choirA}`,
      `GENOVA_022_CHOIR_B=${choirB}`,
      `GENOVA_022_SONG_ID=${songId}`,
      `GENOVA_022_PDF_FILE_ID=${pdfFileId}`,
      `GENOVA_022_AUDIO_FILE_ID=${audioFileId}`,
      '',
    ].join('\n'), { mode: 0o600, flag: 'wx' });
    await chmod(fixturePath, 0o600);
    await chmod(webEnvPath, 0o600);
    console.log(`PASS fixture_prepared user=synthetic choirs=2 files=2 song=${songId}`);
    console.log(`PASS fixture_pdf bytes=${pdfBytes.byteLength} sha256=${sha256(pdfBytes)}`);
    console.log(`PASS fixture_audio bytes=${audioBytes.byteLength} sha256=${sha256(audioBytes)}`);
  } catch (error) {
    if (bucketCreated) {
      await admin.storage.from(bucket).remove([pdfObjectPath, audioObjectPath]);
      await admin.storage.deleteBucket(bucket);
    }
    for (const [table, ids] of [
      ['repertoire_pdf_annotations', annotationIds],
      ['song_assignments', [assignmentId]],
      ['repertoire_files', [pdfFileId, audioFileId]],
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
  const { data: pdfObjectData, error: pdfObjectError } = await admin.storage
    .from(fixture.bucket)
    .download(fixture.pdfObjectPath);
  await noError(pdfObjectError, 'download fixture PDF');
  assert.ok(pdfObjectData);
  const pdfBytes = new Uint8Array(await pdfObjectData.arrayBuffer());
  assert.equal(pdfBytes.byteLength, fixture.pdfSize);
  assert.equal(sha256(pdfBytes), fixture.pdfSha256);
  const { data: audioObjectData, error: audioObjectError } = await admin.storage
    .from(fixture.bucket)
    .download(fixture.audioObjectPath);
  await noError(audioObjectError, 'download fixture audio');
  assert.ok(audioObjectData);
  const audioBytes = new Uint8Array(await audioObjectData.arrayBuffer());
  assert.equal(audioBytes.byteLength, fixture.audioSize);
  assert.equal(sha256(audioBytes), fixture.audioSha256);

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
    .in('id', [fixture.pdfFileId, fixture.audioFileId]);
  await noError(fileError, 'read fixture files through RLS');
  assert.deepEqual(
    (files ?? []).sort((left, right) => left.id.localeCompare(right.id)),
    [
      { id: fixture.pdfFileId, file_size_bytes: fixture.pdfSize, mime_type: 'application/pdf' },
      { id: fixture.audioFileId, file_size_bytes: fixture.audioSize, mime_type: 'audio/wav' },
    ].sort((left, right) => left.id.localeCompare(right.id)),
  );
  const { data: annotationRows, error: annotationError } = await client
    .from('repertoire_pdf_annotations')
    .select('id,page_number')
    .eq('repertoire_file_id', fixture.pdfFileId);
  await noError(annotationError, 'read annotations through RLS');
  assert.equal(annotationRows?.length, fixture.annotationIds.length);
  await client.auth.signOut({ scope: 'local' });
  console.log(`PASS fixture_verified memberships=2 annotations=${fixture.annotationIds.length}`);
  console.log(`PASS fixture_pdf bytes=${pdfBytes.byteLength} sha256=${sha256(pdfBytes)}`);
  console.log(`PASS fixture_audio bytes=${audioBytes.byteLength} sha256=${sha256(audioBytes)}`);
}

async function enableFailure(admin: SupabaseClient, fixture: FixtureRecord): Promise<void> {
  const { data, error } = await admin.from('repertoire_files')
    .update({ drive_download_link: `storage://${fixture.bucket}/missing.wav` })
    .eq('id', fixture.audioFileId)
    .eq('drive_download_link', `storage://${fixture.bucket}/${fixture.audioObjectPath}`)
    .select('id');
  await noError(error, 'enable missing audio object');
  assert.deepEqual(data, [{ id: fixture.audioFileId }], 'failure fixture was not restored before enable');
  console.log(`PASS failure_fixture_enabled file=${fixture.audioFileId}`);
}

async function disableFailure(admin: SupabaseClient, fixture: FixtureRecord): Promise<void> {
  await noError((await admin.from('repertoire_files')
    .update({ drive_download_link: `storage://${fixture.bucket}/${fixture.audioObjectPath}` })
    .eq('id', fixture.audioFileId)).error, 'restore audio object link');
  console.log('PASS failure_fixture_disabled');
}

async function cleanup(admin: SupabaseClient, fixture: FixtureRecord): Promise<void> {
  const deletions: Array<[string, string[]]> = [
    ['repertoire_pdf_annotations', fixture.annotationIds],
    ['song_assignments', [fixture.assignmentId]],
    ['repertoire_files', [fixture.pdfFileId, fixture.audioFileId]],
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
  await noError((await admin.storage.from(fixture.bucket)
    .remove([fixture.pdfObjectPath, fixture.audioObjectPath])).error, 'cleanup objects');
  await noError((await admin.storage.deleteBucket(fixture.bucket)).error, 'cleanup bucket');
  await noError((await admin.auth.admin.deleteUser(fixture.userId)).error, 'cleanup user');
  assert.deepEqual(await snapshot(admin), fixture.baseline, 'tracked target baseline changed');
  console.log('PASS fixture_cleanup target_baseline=restored');
}

async function main(): Promise<void> {
  const action = process.argv[2];
  assert.ok(
    ['prepare', 'status', 'enable-failure', 'disable-failure', 'cleanup'].includes(action ?? ''),
    'expected prepare, status, enable-failure, disable-failure or cleanup',
  );
  const apiUrl = required('SUPABASE_URL');
  const anonKey = required('SUPABASE_ANON_KEY');
  const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
  assertLocalRuntime(apiUrl, serviceRoleKey);
  const fixturePath = assertOwnedPath(required('GENOVA_022_FIXTURE_PATH'), '.022-fixture.json');
  const webEnvPath = assertOwnedPath(required('GENOVA_022_WEB_ENV_PATH'), '.022-web.env');
  const admin = createClient(apiUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (action === 'prepare') {
    await prepare(admin, apiUrl, anonKey, fixturePath, webEnvPath);
    return;
  }
  const fixture = await loadFixture(fixturePath);
  if (action === 'status') {
    await verify(admin, apiUrl, anonKey, fixture);
    return;
  }
  if (action === 'enable-failure') {
    await enableFailure(admin, fixture);
    return;
  }
  if (action === 'disable-failure') {
    await disableFailure(admin, fixture);
    return;
  }
  await cleanup(admin, fixture);
  await unlink(fixturePath);
  await unlink(webEnvPath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== 'ENOENT') throw error;
  });
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
