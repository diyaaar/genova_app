import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

const EDGE_ORIGIN = 'http://127.0.0.1:8000';
const MOCK_ORIGIN = 'http://127.0.0.1:18054';
const SERVICE_KEY = '053-local-service-role-secret-not-a-hosted-key';
const ACCESS_KEY_ID = '053LOCALACCESSKEY';
const SECRET_ACCESS_KEY = '053-local-secret-access-key-for-loopback-only';
const ACCOUNT_ID = '0123456789abcdef0123456789abcdef';
const BUCKET = 'genova-private';
const choirA = '10000000-0000-4000-8000-000000000053';
const choirB = '10000000-0000-4000-8000-000000000054';
const pdfId = '20000000-0000-4000-8000-000000000053';
const wavId = '20000000-0000-4000-8000-000000000054';
const activeId = '20000000-0000-4000-8000-000000000055';
const corruptId = '20000000-0000-4000-8000-000000000056';
const unmappedId = '20000000-0000-4000-8000-000000000057';
const userId = '30000000-0000-4000-8000-000000000053';

const pdfBytes = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
const wavBytes = Buffer.concat([
  Buffer.from('RIFF'), Buffer.from([40, 0, 0, 0]), Buffer.from('WAVEfmt '),
  Buffer.from([16, 0, 0, 0, 1, 0, 1, 0, 64, 31, 0, 0, 128, 62, 0, 0, 2, 0, 16, 0]),
  Buffer.from('data'), Buffer.from([4, 0, 0, 0, 0, 0, 1, 0]),
]);

type FileFixture = {
  id: string;
  choir_id: string;
  drive_file_id: string;
  drive_download_link: null;
  file_name: string;
  mime_type: string;
};

type LocationFixture = {
  repertoire_file_id: string;
  choir_id: string;
  provider: 'r2';
  bucket: string;
  object_key: string;
  content_length: number;
  mime_type: string;
  sha256_hex: string;
  verified_at: string;
  is_active: true;
};

const files = new Map<string, FileFixture>([
  [pdfId, makeFile(pdfId, 'score.pdf', 'application/pdf')],
  [wavId, makeFile(wavId, 'rehearsal.wav', 'audio/wav')],
  [activeId, makeFile(activeId, 'active.pdf', 'application/pdf')],
  [corruptId, makeFile(corruptId, 'corrupt.pdf', 'application/pdf')],
  [unmappedId, makeFile(unmappedId, 'unmapped.pdf', 'application/pdf')],
]);

const locations = new Map<string, LocationFixture>([
  [pdfId, makeLocation(pdfId, 'score.pdf', pdfBytes, 'application/pdf')],
  [wavId, makeLocation(wavId, 'rehearsal.wav', wavBytes, 'audio/wav')],
  [activeId, makeLocation(activeId, 'active.pdf', pdfBytes, 'application/pdf')],
  [corruptId, makeLocation(corruptId, 'corrupt.pdf', pdfBytes, 'application/pdf')],
]);

const providerHits: Array<{ method: string; path: string; range?: string }> = [];

function sha256(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}

function makeFile(id: string, fileName: string, mimeType: string): FileFixture {
  return {
    id,
    choir_id: choirA,
    drive_file_id: `legacy-${id}`,
    drive_download_link: null,
    file_name: fileName,
    mime_type: mimeType,
  };
}

function makeLocation(id: string, name: string, bytes: Uint8Array, mimeType: string): LocationFixture {
  return {
    repertoire_file_id: id,
    choir_id: choirA,
    provider: 'r2',
    bucket: BUCKET,
    object_key: `choirs/${choirA}/repertoire/${id}/${name}`,
    content_length: bytes.byteLength,
    mime_type: mimeType,
    sha256_hex: sha256(bytes),
    verified_at: '2026-09-20T20:00:00.000Z',
    is_active: true,
  };
}

function json(response: ServerResponse, status: number, value: unknown) {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  response.end(body);
}

function bearer(request: IncomingMessage) {
  return request.headers.authorization?.replace(/^Bearer\s+/i, '') ?? '';
}

function equality(url: URL, key: string) {
  const value = url.searchParams.get(key);
  return value?.startsWith('eq.') ? value.slice(3) : null;
}

function postgrestRow(response: ServerResponse, request: IncomingMessage, row: unknown | null) {
  const objectResponse = request.headers.accept?.includes('vnd.pgrst.object') === true;
  if (!row && objectResponse) {
    json(response, 406, {
      code: 'PGRST116', details: 'The result contains 0 rows', hint: null,
      message: 'Cannot coerce the result to a single JSON object',
    });
    return;
  }
  json(response, 200, objectResponse ? row : row ? [row] : []);
}

function providerBytes(pathname: string) {
  if (pathname.endsWith('/score.pdf')) return { bytes: pdfBytes, type: 'application/pdf' };
  if (pathname.endsWith('/rehearsal.wav')) return { bytes: wavBytes, type: 'audio/wav' };
  if (pathname.endsWith('/active.pdf')) return { bytes: pdfBytes, type: 'text/html' };
  if (pathname.endsWith('/corrupt.pdf')) return { bytes: pdfBytes, type: 'application/pdf', corrupt: true };
  return null;
}

function serveProvider(request: IncomingMessage, response: ServerResponse, url: URL) {
  assert.match(request.headers.authorization ?? '', /^AWS4-HMAC-SHA256 /, 'R2 request is not signed');
  assert.ok((request.headers.authorization ?? '').includes(`Credential=${ACCESS_KEY_ID}/`));
  assert.equal((request.headers.authorization ?? '').includes(SECRET_ACCESS_KEY), false);
  assert.equal(url.search, '', 'credentials or query parameters reached provider URL');
  const object = providerBytes(url.pathname);
  providerHits.push({
    method: request.method ?? '', path: url.pathname,
    ...(request.headers.range ? { range: request.headers.range } : {}),
  });
  if (!object) {
    response.writeHead(404, { 'Content-Length': '0' });
    response.end();
    return;
  }
  const range = request.headers.range?.match(/^bytes=(\d+)-(\d+)$/);
  if (range && request.method !== 'HEAD') {
    const start = Number(range[1]);
    const end = Number(range[2]);
    const selected = object.bytes.subarray(start, end + 1);
    response.writeHead(206, {
      'Content-Type': object.type,
      'Content-Length': String(object.corrupt ? selected.byteLength + 1 : selected.byteLength),
      'Content-Range': `bytes ${start}-${end}/${object.bytes.byteLength}`,
    });
    response.end(selected);
    return;
  }
  response.writeHead(200, {
    'Content-Type': object.type,
    'Content-Length': String(object.corrupt ? object.bytes.byteLength + 1 : object.bytes.byteLength),
  });
  response.end(request.method === 'HEAD' ? undefined : object.bytes);
}

const mockServer = createServer((request, response) => {
  try {
    const url = new URL(request.url ?? '/', MOCK_ORIGIN);
    if (url.pathname.startsWith(`/${BUCKET}/`)) {
      serveProvider(request, response, url);
      return;
    }
    if (url.pathname === '/auth/v1/user') {
      const token = bearer(request);
      if (!['good-token', 'denied-token', 'wrong-choir-token'].includes(token)) {
        json(response, 401, { message: 'invalid local token' });
        return;
      }
      json(response, 200, {
        id: userId, aud: 'authenticated', role: 'authenticated', email: '053@example.invalid',
        app_metadata: {}, user_metadata: {}, identities: [],
        created_at: '2026-09-20T20:00:00.000Z', updated_at: '2026-09-20T20:00:00.000Z',
      });
      return;
    }
    if (url.pathname === '/rest/v1/rpc/current_choir_id') {
      json(response, 200, bearer(request) === 'wrong-choir-token' ? choirB : choirA);
      return;
    }
    if (url.pathname === '/rest/v1/repertoire_files') {
      const fileId = equality(url, 'id');
      const row = fileId ? files.get(fileId) ?? null : null;
      const userToken = bearer(request);
      const authorized = userToken === SERVICE_KEY
        ? row && (!equality(url, 'choir_id') || equality(url, 'choir_id') === row.choir_id)
        : userToken === 'good-token' && row?.choir_id === choirA;
      postgrestRow(response, request, authorized ? row : null);
      return;
    }
    if (url.pathname === '/rest/v1/repertoire_file_storage_locations') {
      const fileId = equality(url, 'repertoire_file_id');
      const row = fileId ? locations.get(fileId) ?? null : null;
      const authorized = bearer(request) === SERVICE_KEY
        && equality(url, 'choir_id') === row?.choir_id
        && equality(url, 'is_active') === 'true';
      postgrestRow(response, request, authorized ? row : null);
      return;
    }
    json(response, 404, { message: 'not found' });
  } catch (error) {
    json(response, 500, { message: error instanceof Error ? error.message : 'mock failure' });
  }
});

function issueExpiredTicket(fileId: string) {
  const payload = Buffer.from(JSON.stringify({
    version: 1, fileId, choirId: choirA, expiresAt: Date.now() - 1_000,
  })).toString('base64url');
  const signature = createHmac('sha256', SERVICE_KEY).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

async function issueTicket(fileId: string, token = 'good-token') {
  const response = await fetch(EDGE_ORIGIN, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId }),
  });
  const text = await response.text();
  if (response.status !== 200) return { response, text, url: null as URL | null };
  const body = JSON.parse(text) as { url: string };
  return { response, text, url: new URL(body.url, EDGE_ORIGIN) };
}

async function waitForEdge(child: { exitCode: number | null }) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Edge process exited early: ${child.exitCode}`);
    try {
      const response = await fetch(EDGE_ORIGIN, { method: 'OPTIONS' });
      if (response.status === 204) return;
    } catch {
      // Process is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Edge endpoint did not become ready');
}

async function verifyFile(fileId: string, expected: Buffer, rangeStart: number, rangeEnd: number) {
  const issued = await issueTicket(fileId);
  assert.equal(issued.response.status, 200, issued.text);
  assert.ok(issued.url);
  const full = await fetch(issued.url);
  assert.equal(full.status, 200);
  const fullBytes = Buffer.from(await full.arrayBuffer());
  assert.equal(sha256(fullBytes), sha256(expected));
  assert.equal(full.headers.get('cache-control'), 'private, no-store');
  const ranged = await fetch(issued.url, { headers: { Range: `bytes=${rangeStart}-${rangeEnd}` } });
  assert.equal(ranged.status, 206);
  assert.deepEqual(Buffer.from(await ranged.arrayBuffer()), expected.subarray(rangeStart, rangeEnd + 1));
  const head = await fetch(issued.url, { method: 'HEAD', headers: { Range: 'bytes=1-4' } });
  assert.equal(head.status, 206);
  assert.equal(head.headers.get('content-length'), '4');
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  console.log(`PASS runtime ${files.get(fileId)?.mime_type} bytes=${expected.byteLength} sha256=${sha256(expected)}`);
}

async function main() {
  await new Promise<void>((resolve, reject) => {
    mockServer.once('error', reject);
    mockServer.listen(18054, '127.0.0.1', () => resolve());
  });
  const edge = spawn('deno', [
    'run', '--allow-env', '--allow-net=0.0.0.0:8000,127.0.0.1:18054',
    'supabase/functions/repertoire-file/index.ts',
  ], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      SUPABASE_URL: MOCK_ORIGIN,
      SUPABASE_ANON_KEY: '053-local-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
      REPERTOIRE_STORAGE_MODE: 'r2-required',
      R2_ACCOUNT_ID: ACCOUNT_ID,
      R2_BUCKET: BUCKET,
      R2_ACCESS_KEY_ID: ACCESS_KEY_ID,
      R2_SECRET_ACCESS_KEY: SECRET_ACCESS_KEY,
      R2_TEST_ENDPOINT: `${MOCK_ORIGIN}/`,
      R2_ALLOW_INSECURE_LOOPBACK: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let edgeOutput = '';
  edge.stdout.on('data', (chunk) => { edgeOutput += String(chunk); });
  edge.stderr.on('data', (chunk) => { edgeOutput += String(chunk); });
  try {
    await waitForEdge(edge);
    await verifyFile(pdfId, pdfBytes, 5, 17);
    await verifyFile(wavId, wavBytes, 8, 23);

    const denied = await issueTicket(pdfId, 'denied-token');
    assert.equal(denied.response.status, 403);
    const wrongChoir = await issueTicket(pdfId, 'wrong-choir-token');
    assert.equal(wrongChoir.response.status, 403);
    console.log('PASS runtime RLS-shaped denial for unauthorized and wrong-choir tickets');

    const expired = new URL(EDGE_ORIGIN);
    expired.searchParams.set('fileId', pdfId);
    expired.searchParams.set('ticket', issueExpiredTicket(pdfId));
    assert.equal((await fetch(expired)).status, 401);

    const invalidRangeTicket = await issueTicket(pdfId);
    assert.ok(invalidRangeTicket.url);
    assert.equal((await fetch(invalidRangeTicket.url, { headers: { Range: 'bytes=999-' } })).status, 416);

    for (const [fileId, expectedStatus] of [
      [activeId, 415],
      [corruptId, 502],
      [unmappedId, 502],
    ] as const) {
      const ticket = await issueTicket(fileId);
      assert.ok(ticket.url);
      const response = await fetch(ticket.url);
      assert.equal(response.status, expectedStatus, `${fileId}: ${await response.text()}`);
    }
    assert.equal(providerHits.some((hit) => hit.path.includes(unmappedId)), false);
    assert.ok(providerHits.some((hit) => hit.method === 'HEAD'));
    assert.ok(providerHits.some((hit) => hit.range === 'bytes=5-17'));
    console.log(`PASS runtime refusal matrix provider_hits=${providerHits.length} drive_fallback=0`);
  } catch (error) {
    if (edgeOutput) process.stderr.write(edgeOutput.replaceAll(SERVICE_KEY, '[redacted]'));
    throw error;
  } finally {
    edge.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => edge.once('exit', resolve)),
      new Promise((resolve) => setTimeout(resolve, 2_000)),
    ]);
    await new Promise<void>((resolve) => mockServer.close(() => resolve()));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
