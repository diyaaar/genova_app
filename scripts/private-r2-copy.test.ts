import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CopyError,
  copyManifestEntry,
  executeCopyBatch,
  failedJournalRecord,
  journalMatchesManifest,
  manifestFingerprint,
  parseJournalRecord,
  parseManifestEntry,
  validateManifest,
  type CopyJournalRecord,
  type CopyManifestEntry,
  type CopyPorts,
} from './private-r2-copy-core';
// @ts-expect-error Runtime Node test exercises the same explicit source import used by the CLI.
import { GoogleDriveSource, SignedR2Destination } from './private-r2-copy.ts';

const IDs = {
  item: '10000000-0000-4000-8000-000000000062',
  choir: '20000000-0000-4000-8000-000000000062',
  row: '30000000-0000-4000-8000-000000000062',
  assignment: '40000000-0000-4000-8000-000000000062',
  submission: '50000000-0000-4000-8000-000000000062',
  version: '60000000-0000-4000-8000-000000000062',
  room: '70000000-0000-4000-8000-000000000062',
  batch: '80000000-0000-4000-8000-000000000062',
};
const bytes = new TextEncoder().encode('private-r2-copy-062');
const digest = createHash('sha256').update(bytes).digest('hex');

function entry(overrides: Partial<CopyManifestEntry> = {}): CopyManifestEntry {
  return {
    manifestVersion: 1,
    itemId: IDs.item,
    projectRef: 'hievmwwctjjlhmssoxsu',
    choirId: IDs.choir,
    family: 'repertoire-file',
    source: {
      owner: 'public.repertoire_files', rowId: IDs.row, slot: 'content', version: 'current',
      legacyFileId: 'drive_file_062',
    },
    destination: {
      provider: 'r2', bucket: 'genova-private',
      objectKey: `choirs/${IDs.choir}/repertoire/${IDs.row}/content`,
    },
    expected: { contentLength: bytes.length, mimeType: 'application/pdf', fileName: 'score.pdf' },
    ...overrides,
  };
}

function response(body: Uint8Array = bytes, status = 200, mimeType = 'application/pdf') {
  return new Response(Buffer.from(body), {
    status,
    headers: { 'content-type': mimeType, 'content-length': String(body.length) },
  });
}

function ports(options: {
  exists?: boolean;
  source?: Uint8Array;
  destination?: Uint8Array;
  headStatus?: number;
  putStatus?: number;
  sourceStatus?: number;
  sourceMime?: string;
  metadata?: Partial<Awaited<ReturnType<CopyPorts['getSourceMetadata']>>>;
} = {}) {
  let stored = options.destination;
  const source = options.source ?? bytes;
  const put = vi.fn(async (_entry: CopyManifestEntry, body: ReadableStream<Uint8Array>) => {
    const chunks: Uint8Array[] = [];
    const reader = body.getReader();
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      chunks.push(next.value);
    }
    stored = Uint8Array.from(chunks.flatMap((chunk) => [...chunk]));
    return new Response(null, { status: options.putStatus ?? 200 });
  });
  const value: CopyPorts = {
    getSourceMetadata: vi.fn(async (fileId) => ({
      fileId, name: 'score.pdf', contentLength: source.length,
      mimeType: options.sourceMime ?? 'application/pdf', trashed: false, googleNative: false,
      ...options.metadata,
    })),
    getSource: vi.fn(async () => response(source, options.sourceStatus ?? 200, options.sourceMime)),
    headDestination: vi.fn(async () => new Response(null, {
      status: options.headStatus ?? (options.exists ? 200 : 404),
    })),
    putDestination: put,
    getDestination: vi.fn(async () => response(stored ?? bytes)),
    now: () => new Date('2026-09-23T20:00:00.000Z'),
  };
  return { value, put, stored: () => stored };
}

function prior(current = entry()): CopyJournalRecord {
  return {
    journalVersion: 1, itemId: current.itemId, fingerprint: manifestFingerprint(current),
    projectRef: current.projectRef, choirId: current.choirId, family: current.family,
    sourceOwner: current.source.owner, sourceRowId: current.source.rowId,
    sourceSlot: current.source.slot, sourceVersion: current.source.version,
    legacyFileId: current.source.legacyFileId, destinationBucket: current.destination.bucket,
    destinationObjectKey: current.destination.objectKey, contentLength: current.expected.contentLength,
    mimeType: current.expected.mimeType, fileName: current.expected.fileName, attempt: 1,
    recordedAt: '2026-09-23T19:00:00.000Z', status: 'verified', action: 'copied',
    sha256Hex: digest, verifiedAt: '2026-09-23T19:00:00.000Z',
  };
}

describe('062 manifest contract', () => {
  it.each([
    ['repertoire-file', 'public.repertoire_files', 'content', `choirs/${IDs.choir}/repertoire/${IDs.row}/content`],
    ['assignment-submission', 'public.assignment_submission_history', 'content', `choirs/${IDs.choir}/assignments/${IDs.assignment}/submissions/${IDs.version}/content`],
    ['assignment-review', 'public.assignment_submission_private_history', 'reviewer-audio', `choirs/${IDs.choir}/assignments/${IDs.assignment}/submissions/${IDs.submission}/reviews/${IDs.version}/content`],
    ['repertoire-comment', 'public.repertoire_song_comments', 'comment-audio', `choirs/${IDs.choir}/repertoire/${IDs.assignment}/comments/${IDs.submission}/audio/${IDs.version}/content`],
    ['chat-message-image', 'public.chat_messages', 'image:3', `choirs/${IDs.choir}/chat/${IDs.room}/message-image/${IDs.batch}/3/${IDs.version}/content`],
    ['chat-room-avatar', 'public.chat_rooms', 'avatar', `choirs/${IDs.choir}/chat/${IDs.room}/room-avatar/${IDs.batch}/0/${IDs.version}/content`],
  ] as const)('accepts the exact %s owner, slot and key family', (family, owner, slot, objectKey) => {
    const value = entry({ family, source: { ...entry().source, owner, slot }, destination: { ...entry().destination, objectKey } });
    expect(parseManifestEntry(value)).toEqual(value);
  });

  it.each([
    [entry({ projectRef: 'wrong' }), 'invalid-manifest'],
    [entry({ source: { ...entry().source, owner: 'public.chat_rooms' } }), 'invalid-source'],
    [entry({ destination: { ...entry().destination, objectKey: `choirs/${IDs.choir}/../secret/content` } }), 'invalid-destination'],
    [entry({ expected: { contentLength: 0, mimeType: 'application/pdf', fileName: 'score.pdf' } }), 'invalid-size'],
    [entry({ expected: { contentLength: bytes.length, mimeType: 'text/html; charset=utf-8', fileName: 'score.pdf' } }), 'invalid-mime'],
  ])('rejects invalid manifest input', (value, code) => {
    expect(() => parseManifestEntry(value)).toThrowError(expect.objectContaining({ code }));
  });

  it('rejects duplicate items, destinations, source slots and mixed projects', () => {
    const second = entry({ itemId: '11000000-0000-4000-8000-000000000062' });
    expect(() => validateManifest([entry(), second])).toThrowError(expect.objectContaining({ code: 'duplicate-destination' }));
    const destination = { ...second.destination, objectKey: second.destination.objectKey.replace(IDs.row, IDs.version) };
    expect(() => validateManifest([entry(), { ...second, destination }])).toThrowError(expect.objectContaining({ code: 'duplicate-source-slot' }));
    expect(() => validateManifest([entry(), { ...second, itemId: IDs.item, destination,
      source: { ...second.source, rowId: IDs.version } }])).toThrowError(expect.objectContaining({ code: 'duplicate-item' }));
    expect(() => validateManifest([entry(), { ...second, projectRef: 'abcdefghijklmnopqrst', destination,
      source: { ...second.source, rowId: IDs.version } }])).toThrowError(expect.objectContaining({ code: 'mixed-projects' }));
  });

  it('binds journal records to the exact immutable manifest fingerprint', () => {
    expect(parseJournalRecord(prior())).toEqual(prior());
    expect(journalMatchesManifest(prior(), entry())).toBe(true);
    expect(journalMatchesManifest({ ...prior(), sourceOwner: 'public.chat_rooms' }, entry())).toBe(false);
    expect(() => parseJournalRecord({ ...prior(), errorCode: 'leak' })).toThrowError(expect.objectContaining({ code: 'invalid-journal' }));
  });
});

describe('062 bounded copy behavior', () => {
  it('streams a missing object, then independently verifies destination bytes', async () => {
    const fake = ports();
    const result = await copyManifestEntry({ entry: entry(), ports: fake.value, attempt: 1 });
    expect(result).toMatchObject({ status: 'verified', action: 'copied', sha256Hex: digest });
    expect(fake.put).toHaveBeenCalledOnce();
    expect(Array.from(fake.stored() ?? [])).toEqual(Array.from(bytes));
    expect(fake.value.getDestination).toHaveBeenCalledOnce();
  });

  it('preserves a multi-chunk stream boundary without creating a file scratch path', async () => {
    const large = new Uint8Array(1_310_720);
    for (let index = 0; index < large.length; index += 1) large[index] = index % 251;
    const largeEntry = entry({ expected: { contentLength: large.length, mimeType: 'application/pdf', fileName: 'large.pdf' } });
    const fake = ports({ source: large });
    let offset = 0;
    let pulls = 0;
    vi.mocked(fake.value.getSource).mockImplementationOnce(async () => new Response(
      new ReadableStream<Uint8Array>({
        pull(controller) {
          if (offset === large.length) { controller.close(); return; }
          const end = Math.min(offset + 64 * 1024, large.length);
          controller.enqueue(large.subarray(offset, end));
          offset = end;
          pulls += 1;
        },
      }),
      { headers: { 'content-type': 'application/pdf', 'content-length': String(large.length) } },
    ));
    const result = await copyManifestEntry({ entry: largeEntry, ports: fake.value, attempt: 1 });
    expect(result).toMatchObject({ status: 'verified', action: 'copied' });
    expect(pulls).toBe(20);
    expect(fake.put).toHaveBeenCalledOnce();
  });

  it('re-reads and resumes a journaled matching destination without Drive byte read or PUT', async () => {
    const fake = ports({ exists: true, destination: bytes });
    const result = await copyManifestEntry({ entry: entry(), prior: prior(), ports: fake.value, attempt: 2 });
    expect(result.action).toBe('resumed');
    expect(fake.value.getSource).not.toHaveBeenCalled();
    expect(fake.put).not.toHaveBeenCalled();
  });

  it('stops when a previously verified destination is missing instead of silently recreating it', async () => {
    const fake = ports();
    await expect(copyManifestEntry({ entry: entry(), prior: prior(), ports: fake.value, attempt: 2 }))
      .rejects.toMatchObject({ code: 'verified-destination-missing' });
    expect(fake.value.getSource).not.toHaveBeenCalled();
    expect(fake.put).not.toHaveBeenCalled();
  });

  it('adopts an unjournaled existing object only after source and destination hashes match', async () => {
    const fake = ports({ exists: true, destination: bytes });
    const result = await copyManifestEntry({ entry: entry(), ports: fake.value, attempt: 1 });
    expect(result.action).toBe('adopted');
    expect(fake.value.getSource).toHaveBeenCalledOnce();
    expect(fake.put).not.toHaveBeenCalled();
  });

  it('never overwrites an existing mismatched object', async () => {
    const fake = ports({ exists: true, destination: Uint8Array.from(bytes, (value) => value ^ 1) });
    await expect(copyManifestEntry({ entry: entry(), ports: fake.value, attempt: 1 }))
      .rejects.toMatchObject({ code: 'destination-mismatch' });
    expect(fake.put).not.toHaveBeenCalled();
  });

  it.each([
    [{ metadata: { trashed: true } }, 'source-trashed'],
    [{ metadata: { googleNative: true } }, 'source-google-native'],
    [{ metadata: { contentLength: bytes.length + 1 } }, 'source-size-mismatch'],
    [{ metadata: { mimeType: 'image/png' } }, 'source-mime-mismatch'],
    [{ headStatus: 302 }, 'redirect-refused'],
    [{ headStatus: 500 }, 'destination-head-failed'],
    [{ sourceStatus: 302 }, 'redirect-refused'],
    [{ source: bytes.subarray(0, bytes.length - 1) }, 'source-size-mismatch'],
    [{ putStatus: 302 }, 'redirect-refused'],
    [{ putStatus: 503 }, 'destination-write-failed'],
  ])('fails closed for %s', async (options, code) => {
    const fake = ports(options);
    await expect(copyManifestEntry({ entry: entry(), ports: fake.value, attempt: 1 }))
      .rejects.toMatchObject({ code });
  });

  it('cancels the source when a destination transport rejects before consuming it', async () => {
    const fake = ports();
    const cancel = vi.fn();
    vi.mocked(fake.value.getSource).mockResolvedValueOnce(new Response(new ReadableStream<Uint8Array>({
      pull(controller) { controller.enqueue(bytes); },
      cancel,
    }), { headers: { 'content-type': 'application/pdf', 'content-length': String(bytes.length) } }));
    vi.mocked(fake.value.putDestination).mockRejectedValueOnce(new Error('network'));
    await expect(copyManifestEntry({ entry: entry(), ports: fake.value, attempt: 1 }))
      .rejects.toMatchObject({ code: 'destination-write-failed' });
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('refuses a missing source and an independently corrupted destination', async () => {
    const missing = ports();
    vi.mocked(missing.value.getSourceMetadata).mockRejectedValueOnce(new CopyError('source-missing'));
    await expect(copyManifestEntry({ entry: entry(), ports: missing.value, attempt: 1 }))
      .rejects.toMatchObject({ code: 'source-missing' });

    const corrupt = ports();
    vi.mocked(corrupt.value.getDestination).mockResolvedValueOnce(response(Uint8Array.from(bytes, (value) => value ^ 1)));
    await expect(copyManifestEntry({ entry: entry(), ports: corrupt.value, attempt: 1 }))
      .rejects.toMatchObject({ code: 'destination-hash-mismatch' });
  });

  it('refuses a supplied source digest mismatch before acceptance', async () => {
    const fake = ports();
    const withDigest = entry({ expected: { ...entry().expected, sha256Hex: '0'.repeat(64) } });
    await expect(copyManifestEntry({ entry: withDigest, ports: fake.value, attempt: 1 }))
      .rejects.toMatchObject({ code: 'source-hash-mismatch' });
  });

  it('records only a bounded error code and immutable identifiers on failure', () => {
    const result = failedJournalRecord(entry(), 3, new CopyError('destination-mismatch'));
    expect(result).toMatchObject({ status: 'failed', errorCode: 'destination-mismatch', attempt: 3 });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('prioritizes unfinished rows, enforces batch bytes and reports real remaining work', async () => {
    const first = entry();
    const second = entry({
      itemId: '11000000-0000-4000-8000-000000000062',
      source: { ...entry().source, rowId: IDs.version },
      destination: { ...entry().destination, objectKey: `choirs/${IDs.choir}/repertoire/${IDs.version}/content` },
    });
    const latest = new Map([[first.itemId, prior(first)]]);
    const attempts = new Map([[first.itemId, 1]]);
    const appended: CopyJournalRecord[] = [];
    const fake = ports();
    const result = await executeCopyBatch({
      entries: [first, second], latest, attempts, maxItems: 1, maxTotalBytes: bytes.length,
      ports: fake.value, append: async (record) => { appended.push(record); },
    });
    expect(result).toEqual({ processed: 1, bytes: bytes.length, remaining: 0 });
    expect(appended).toHaveLength(1);
    expect(appended[0].itemId).toBe(second.itemId);

    await expect(executeCopyBatch({
      entries: [first], latest: new Map(), attempts: new Map(), maxItems: 1,
      maxTotalBytes: bytes.length - 1, ports: fake.value, append: async () => undefined,
    })).rejects.toMatchObject({ code: 'batch-byte-limit-too-small' });
  });

  it('journals one failed item and stops the batch without touching later rows', async () => {
    const second = entry({
      itemId: '11000000-0000-4000-8000-000000000062',
      source: { ...entry().source, rowId: IDs.version },
      destination: { ...entry().destination, objectKey: `choirs/${IDs.choir}/repertoire/${IDs.version}/content` },
    });
    const fake = ports({ metadata: { trashed: true } });
    const appended: CopyJournalRecord[] = [];
    await expect(executeCopyBatch({
      entries: [entry(), second], latest: new Map(), attempts: new Map(), maxItems: 2,
      maxTotalBytes: bytes.length * 2, ports: fake.value,
      append: async (record) => { appended.push(record); },
    })).rejects.toMatchObject({ code: 'source-trashed' });
    expect(appended).toHaveLength(1);
    expect(appended[0]).toMatchObject({ itemId: IDs.item, status: 'failed', errorCode: 'source-trashed' });
    expect(fake.value.headDestination).not.toHaveBeenCalled();
  });

  it('refuses a prior journal record from a changed manifest', async () => {
    const changed = entry({ expected: { ...entry().expected, sha256Hex: digest } });
    const fake = ports();
    await expect(copyManifestEntry({ entry: changed, prior: prior(), ports: fake.value, attempt: 2 }))
      .rejects.toMatchObject({ code: 'journal-manifest-conflict' });
    expect(fake.value.getSourceMetadata).not.toHaveBeenCalled();
  });
});

describe('062 real HTTP transports and CLI boundary', () => {
  const servers: ReturnType<typeof createServer>[] = [];
  const temporaryPaths: string[] = [];

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
    for (const directory of temporaryPaths.splice(0)) rmSync(directory, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('copies through OAuth Drive GET and signed R2 HEAD/PUT/GET over bounded loopback', async () => {
    let stored: Uint8Array | undefined;
    let tokenCalls = 0;
    const server = createServer(async (request, reply) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1');
      if (url.pathname === '/token') {
        tokenCalls += 1;
        reply.setHeader('content-type', 'application/json');
        reply.end(JSON.stringify({ access_token: 'drive-test-token', expires_in: 3600 }));
        return;
      }
      if (url.pathname === '/drive/drive_file_062' && url.searchParams.get('alt') !== 'media') {
        expect(request.headers.authorization).toBe('Bearer drive-test-token');
        reply.setHeader('content-type', 'application/json');
        reply.end(JSON.stringify({ id: 'drive_file_062', name: 'score.pdf', mimeType: 'application/pdf', size: String(bytes.length), trashed: false }));
        return;
      }
      if (url.pathname === '/drive/drive_file_062') {
        expect(request.headers.authorization).toBe('Bearer drive-test-token');
        reply.setHeader('content-type', 'application/pdf');
        reply.setHeader('content-length', String(bytes.length));
        reply.end(bytes);
        return;
      }
      const expectedPath = `/genova-private/${entry().destination.objectKey}`;
      if (url.pathname === expectedPath && request.method === 'HEAD') {
        if (!stored) { reply.statusCode = 404; reply.end(); return; }
        reply.setHeader('content-type', 'application/pdf');
        reply.setHeader('content-length', String(stored.length));
        reply.end();
        return;
      }
      if (url.pathname === expectedPath && request.method === 'PUT') {
        expect(request.headers.authorization).toMatch(/^AWS4-HMAC-SHA256 /u);
        const chunks: Buffer[] = [];
        for await (const chunk of request) chunks.push(Buffer.from(chunk));
        stored = Uint8Array.from(Buffer.concat(chunks));
        reply.statusCode = 200;
        reply.end();
        return;
      }
      if (url.pathname === expectedPath && request.method === 'GET') {
        reply.setHeader('content-type', 'application/pdf');
        reply.setHeader('content-length', String(stored?.length ?? 0));
        reply.end(stored);
        return;
      }
      reply.statusCode = 404;
      reply.end();
    });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('missing address');
    const origin = `http://127.0.0.1:${address.port}`;
    const source = new GoogleDriveSource({
      clientId: 'client', clientSecret: 'secret', refreshToken: 'refresh',
      tokenEndpoint: `${origin}/token`, driveEndpoint: `${origin}/drive/`, allowLoopback: true,
    });
    const destination = new SignedR2Destination({
      accountId: '0123456789abcdef0123456789abcdef', jurisdiction: '', bucket: 'genova-private',
      accessKeyId: 'access-key', secretAccessKey: 'secret-key', testEndpoint: `${origin}/`, allowLoopback: true,
    });
    const livePorts: CopyPorts = {
      getSourceMetadata: (id, signal) => source.getMetadata(id, signal),
      getSource: (id, signal) => source.getBytes(id, signal),
      headDestination: (value, signal) => destination.head(value, signal),
      putDestination: (value, body, signal) => destination.put(value, body, signal),
      getDestination: (value, signal) => destination.get(value, signal),
      now: () => new Date('2026-09-23T20:30:00.000Z'),
    };
    const result = await copyManifestEntry({ entry: entry(), ports: livePorts, attempt: 1 });
    expect(result).toMatchObject({ status: 'verified', action: 'copied', sha256Hex: digest });
    expect(Array.from(stored ?? [])).toEqual(Array.from(bytes));
    expect(tokenCalls).toBe(1);
  });

  it('validates a JSONL manifest without credentials and refuses execute before target approval', () => {
    const directory = mkdtempSync(join(tmpdir(), 'genova-062-'));
    temporaryPaths.push(directory);
    const manifest = join(directory, 'manifest.jsonl');
    const journal = join(directory, 'journal.jsonl');
    writeFileSync(manifest, `${JSON.stringify(entry())}\n`, { mode: 0o600 });
    chmodSync(manifest, 0o600);
    const validate = spawnSync(process.execPath, [
      '--experimental-strip-types', '--disable-warning=ExperimentalWarning',
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      'scripts/private-r2-copy.ts', 'validate', '--manifest', manifest,
      '--project-ref', 'hievmwwctjjlhmssoxsu', '--bucket', 'genova-private',
    ], { cwd: process.cwd(), encoding: 'utf8' });
    expect(validate.status, validate.stderr).toBe(0);
    expect(JSON.parse(validate.stdout)).toMatchObject({ status: 'valid', itemCount: 1, totalBytes: bytes.length });

    const execute = spawnSync(process.execPath, [
      '--experimental-strip-types', '--disable-warning=ExperimentalWarning',
      '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      'scripts/private-r2-copy.ts', 'execute', '--manifest', manifest, '--journal', journal,
      '--project-ref', 'hievmwwctjjlhmssoxsu', '--bucket', 'genova-private', '--max-items', '1',
      '--max-total-bytes', String(bytes.length), '--confirm-target',
      'hievmwwctjjlhmssoxsu/0123456789abcdef0123456789abcdef/genova-private/auto',
    ], {
      cwd: process.cwd(), encoding: 'utf8',
      env: { ...process.env, R2_ACCOUNT_ID: '0123456789abcdef0123456789abcdef' },
    });
    expect(execute.status).toBe(1);
    expect(JSON.parse(execute.stderr)).toEqual({ status: 'failed', errorCode: 'target-confirmation-required' });
    expect(existsSync(journal)).toBe(false);
  });
});
