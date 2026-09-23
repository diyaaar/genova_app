import { createHash } from 'node:crypto';

const UUID_SHAPE = '[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const UUID = new RegExp(`^${UUID_SHAPE}$`, 'iu');
const PROJECT_REF = /^[a-z]{20}$/u;
const DRIVE_ID = /^[A-Za-z0-9_-]{10,200}$/u;
const BUCKET = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/u;
const MIME = /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const OWNER = /^public\.[a-z][a-z0-9_]{1,62}$/u;
const SLOT = /^[a-z0-9][a-z0-9:_-]{0,63}$/u;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/u;
const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/u;
const MAX_OBJECT_BYTES = 100 * 1024 * 1024;

export const COPY_FAMILIES = [
  'repertoire-file',
  'assignment-submission',
  'assignment-review',
  'repertoire-comment',
  'chat-message-image',
  'chat-room-avatar',
] as const;

export type CopyFamily = typeof COPY_FAMILIES[number];

const FAMILY_OWNERS: Record<CopyFamily, ReadonlySet<string>> = {
  'repertoire-file': new Set(['public.repertoire_files']),
  'assignment-submission': new Set(['public.assignment_submissions', 'public.assignment_submission_history']),
  'assignment-review': new Set([
    'public.assignment_submissions',
    'public.assignment_submission_private_notes',
    'public.assignment_submission_history',
    'public.assignment_submission_private_history',
  ]),
  'repertoire-comment': new Set(['public.repertoire_song_comments']),
  'chat-message-image': new Set(['public.chat_messages']),
  'chat-room-avatar': new Set(['public.chat_rooms']),
};

const FAMILY_SLOTS: Record<CopyFamily, RegExp> = {
  'repertoire-file': /^content$/u,
  'assignment-submission': /^content$/u,
  'assignment-review': /^reviewer-audio$/u,
  'repertoire-comment': /^comment-audio$/u,
  'chat-message-image': /^image:[0-4]$/u,
  'chat-room-avatar': /^avatar$/u,
};

export interface CopyManifestEntry {
  manifestVersion: 1;
  itemId: string;
  projectRef: string;
  choirId: string;
  family: CopyFamily;
  source: {
    owner: string;
    rowId: string;
    slot: string;
    version: string;
    legacyFileId: string;
  };
  destination: {
    provider: 'r2';
    bucket: string;
    objectKey: string;
  };
  expected: {
    contentLength: number;
    mimeType: string;
    fileName: string;
    sha256Hex?: string;
  };
}

export interface SourceMetadata {
  fileId: string;
  name: string;
  contentLength: number;
  mimeType: string;
  trashed: boolean;
  googleNative: boolean;
}

export interface CopyPorts {
  getSourceMetadata(fileId: string, signal?: AbortSignal): Promise<SourceMetadata>;
  getSource(fileId: string, signal?: AbortSignal): Promise<Response>;
  headDestination(entry: CopyManifestEntry, signal?: AbortSignal): Promise<Response>;
  putDestination(
    entry: CopyManifestEntry,
    body: ReadableStream<Uint8Array>,
    signal?: AbortSignal,
  ): Promise<Response>;
  getDestination(entry: CopyManifestEntry, signal?: AbortSignal): Promise<Response>;
  now(): Date;
}

export type CopyJournalRecord = {
  journalVersion: 1;
  itemId: string;
  fingerprint: string;
  projectRef: string;
  choirId: string;
  family: CopyFamily;
  sourceOwner: string;
  sourceRowId: string;
  sourceSlot: string;
  sourceVersion: string;
  legacyFileId: string;
  destinationBucket: string;
  destinationObjectKey: string;
  contentLength: number;
  mimeType: string;
  fileName: string;
  attempt: number;
  recordedAt: string;
  status: 'verified' | 'failed';
  action?: 'copied' | 'adopted' | 'resumed';
  sha256Hex?: string;
  verifiedAt?: string;
  errorCode?: string;
};

export class CopyError extends Error {
  readonly code: string;

  constructor(code: string, options?: ErrorOptions) {
    super(code, options);
    this.name = 'CopyError';
    this.code = code;
  }
}

function asRecord(value: unknown, code = 'invalid-manifest'): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CopyError(code);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, keys: string[], code = 'invalid-manifest') {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    throw new CopyError(code);
  }
}

function normalizedMime(value: unknown) {
  if (typeof value !== 'string') throw new CopyError('invalid-mime');
  const mime = value.trim().toLowerCase();
  if (!MIME.test(mime)) throw new CopyError('invalid-mime');
  return mime;
}

export function isSafeObjectKey(value: string) {
  return value.length <= 1024 && SAFE_KEY.test(value) && !value.includes('//')
    && !value.split('/').some((segment) => !segment || segment === '.' || segment === '..');
}

function validateDestinationShape(entry: CopyManifestEntry) {
  const prefix = `choirs/${entry.choirId}/`;
  if (!entry.destination.objectKey.startsWith(prefix) || !entry.destination.objectKey.endsWith('/content')) {
    throw new CopyError('invalid-destination-key');
  }
  const patterns: Record<CopyFamily, RegExp> = {
    'repertoire-file': new RegExp(`^choirs/${entry.choirId}/repertoire/${UUID_SHAPE}/content$`, 'iu'),
    'assignment-submission': new RegExp(`^choirs/${entry.choirId}/assignments/${UUID_SHAPE}/submissions/${UUID_SHAPE}/content$`, 'iu'),
    'assignment-review': new RegExp(`^choirs/${entry.choirId}/assignments/${UUID_SHAPE}/submissions/${UUID_SHAPE}/reviews/${UUID_SHAPE}/content$`, 'iu'),
    'repertoire-comment': new RegExp(`^choirs/${entry.choirId}/repertoire/${UUID_SHAPE}/comments/${UUID_SHAPE}/audio/${UUID_SHAPE}/content$`, 'iu'),
    'chat-message-image': new RegExp(`^choirs/${entry.choirId}/chat/${UUID_SHAPE}/message-image/${UUID_SHAPE}/[0-4]/${UUID_SHAPE}/content$`, 'iu'),
    'chat-room-avatar': new RegExp(`^choirs/${entry.choirId}/chat/${UUID_SHAPE}/room-avatar/${UUID_SHAPE}/0/${UUID_SHAPE}/content$`, 'iu'),
  };
  if (!patterns[entry.family].test(entry.destination.objectKey)) throw new CopyError('invalid-destination-key');
}

export function parseManifestEntry(value: unknown): CopyManifestEntry {
  const root = asRecord(value);
  exactKeys(root, ['manifestVersion', 'itemId', 'projectRef', 'choirId', 'family', 'source', 'destination', 'expected']);
  if (root.manifestVersion !== 1 || typeof root.itemId !== 'string' || !UUID.test(root.itemId)
    || typeof root.projectRef !== 'string' || !PROJECT_REF.test(root.projectRef)
    || typeof root.choirId !== 'string' || !UUID.test(root.choirId)
    || typeof root.family !== 'string' || !(COPY_FAMILIES as readonly string[]).includes(root.family)) {
    throw new CopyError('invalid-manifest');
  }
  const family = root.family as CopyFamily;
  const source = asRecord(root.source);
  exactKeys(source, ['owner', 'rowId', 'slot', 'version', 'legacyFileId']);
  if (typeof source.owner !== 'string' || !OWNER.test(source.owner) || !FAMILY_OWNERS[family].has(source.owner)
    || typeof source.rowId !== 'string' || !UUID.test(source.rowId)
    || typeof source.slot !== 'string' || !SLOT.test(source.slot) || !FAMILY_SLOTS[family].test(source.slot)
    || typeof source.version !== 'string' || !VERSION.test(source.version)
    || typeof source.legacyFileId !== 'string' || !DRIVE_ID.test(source.legacyFileId)) {
    throw new CopyError('invalid-source');
  }
  const destination = asRecord(root.destination);
  exactKeys(destination, ['provider', 'bucket', 'objectKey']);
  if (destination.provider !== 'r2' || typeof destination.bucket !== 'string' || !BUCKET.test(destination.bucket)
    || typeof destination.objectKey !== 'string' || !isSafeObjectKey(destination.objectKey)) {
    throw new CopyError('invalid-destination');
  }
  const expected = asRecord(root.expected);
  const expectedKeys = Object.keys(expected).sort();
  if (expectedKeys.some((key) => !['contentLength', 'mimeType', 'fileName', 'sha256Hex'].includes(key))
    || !expectedKeys.includes('contentLength') || !expectedKeys.includes('mimeType')
    || !expectedKeys.includes('fileName')) {
    throw new CopyError('invalid-expected');
  }
  if (!Number.isSafeInteger(expected.contentLength) || Number(expected.contentLength) < 1
    || Number(expected.contentLength) > MAX_OBJECT_BYTES) throw new CopyError('invalid-size');
  const mimeType = normalizedMime(expected.mimeType);
  if (typeof expected.fileName !== 'string' || expected.fileName !== expected.fileName.trim()
    || expected.fileName.length < 1 || expected.fileName.length > 255 || /[\u0000-\u001f\u007f]/u.test(expected.fileName)) {
    throw new CopyError('invalid-file-name');
  }
  if (expected.sha256Hex !== undefined
    && (typeof expected.sha256Hex !== 'string' || !SHA256.test(expected.sha256Hex))) {
    throw new CopyError('invalid-sha256');
  }
  const entry: CopyManifestEntry = {
    manifestVersion: 1,
    itemId: root.itemId,
    projectRef: root.projectRef,
    choirId: root.choirId,
    family,
    source: {
      owner: source.owner,
      rowId: source.rowId,
      slot: source.slot,
      version: source.version,
      legacyFileId: source.legacyFileId,
    },
    destination: {
      provider: 'r2',
      bucket: destination.bucket,
      objectKey: destination.objectKey,
    },
    expected: {
      contentLength: Number(expected.contentLength),
      mimeType,
      fileName: expected.fileName,
      ...(expected.sha256Hex === undefined ? {} : { sha256Hex: expected.sha256Hex }),
    },
  };
  validateDestinationShape(entry);
  return entry;
}

export function validateManifest(entries: CopyManifestEntry[]) {
  if (entries.length < 1 || entries.length > 100_000) throw new CopyError('invalid-manifest-count');
  const itemIds = new Set<string>();
  const destinations = new Set<string>();
  const sourceSlots = new Set<string>();
  const projectRefs = new Set<string>();
  for (const entry of entries) {
    const parsed = parseManifestEntry(entry);
    const destination = `${parsed.destination.bucket}/${parsed.destination.objectKey}`;
    const sourceSlot = [parsed.source.owner, parsed.source.rowId, parsed.source.slot, parsed.source.version].join('/');
    if (itemIds.has(parsed.itemId)) throw new CopyError('duplicate-item');
    if (destinations.has(destination)) throw new CopyError('duplicate-destination');
    if (sourceSlots.has(sourceSlot)) throw new CopyError('duplicate-source-slot');
    itemIds.add(parsed.itemId);
    destinations.add(destination);
    sourceSlots.add(sourceSlot);
    projectRefs.add(parsed.projectRef);
  }
  if (projectRefs.size !== 1) throw new CopyError('mixed-projects');
  return {
    itemCount: entries.length,
    totalBytes: entries.reduce((sum, entry) => sum + entry.expected.contentLength, 0),
    projectRef: entries[0].projectRef,
  };
}

export function manifestFingerprint(entry: CopyManifestEntry) {
  return createHash('sha256').update(JSON.stringify(entry)).digest('hex');
}

export function parseJournalRecord(value: unknown): CopyJournalRecord {
  const row = asRecord(value, 'invalid-journal');
  const required = [
    'journalVersion', 'itemId', 'fingerprint', 'projectRef', 'choirId', 'family', 'sourceOwner',
    'sourceRowId', 'sourceSlot', 'sourceVersion', 'legacyFileId', 'destinationBucket',
    'destinationObjectKey', 'contentLength', 'mimeType', 'fileName', 'attempt', 'recordedAt', 'status',
  ];
  if (required.some((key) => !(key in row)) || Object.keys(row).some((key) => ![
    ...required, 'action', 'sha256Hex', 'verifiedAt', 'errorCode',
  ].includes(key))) throw new CopyError('invalid-journal');
  if (row.journalVersion !== 1 || typeof row.itemId !== 'string' || !UUID.test(row.itemId)
    || typeof row.fingerprint !== 'string' || !SHA256.test(row.fingerprint)
    || typeof row.projectRef !== 'string' || !PROJECT_REF.test(row.projectRef)
    || typeof row.choirId !== 'string' || !UUID.test(row.choirId)
    || typeof row.family !== 'string' || !(COPY_FAMILIES as readonly string[]).includes(row.family)
    || typeof row.sourceOwner !== 'string' || typeof row.sourceRowId !== 'string'
    || typeof row.sourceSlot !== 'string' || typeof row.sourceVersion !== 'string'
    || typeof row.legacyFileId !== 'string' || typeof row.destinationBucket !== 'string'
    || typeof row.destinationObjectKey !== 'string' || !Number.isSafeInteger(row.contentLength)
    || typeof row.mimeType !== 'string' || typeof row.fileName !== 'string'
    || !Number.isSafeInteger(row.attempt) || Number(row.attempt) < 1
    || typeof row.recordedAt !== 'string' || !Number.isFinite(Date.parse(row.recordedAt))
    || (row.status !== 'verified' && row.status !== 'failed')) throw new CopyError('invalid-journal');
  if (row.status === 'verified') {
    if (!['copied', 'adopted', 'resumed'].includes(String(row.action))
      || typeof row.sha256Hex !== 'string' || !SHA256.test(row.sha256Hex)
      || typeof row.verifiedAt !== 'string' || !Number.isFinite(Date.parse(row.verifiedAt))
      || row.errorCode !== undefined) throw new CopyError('invalid-journal');
  } else if (typeof row.errorCode !== 'string' || !/^[a-z][a-z0-9-]{1,63}$/u.test(row.errorCode)
    || row.action !== undefined || row.sha256Hex !== undefined || row.verifiedAt !== undefined) {
    throw new CopyError('invalid-journal');
  }
  return row as unknown as CopyJournalRecord;
}

export function journalMatchesManifest(record: CopyJournalRecord, entry: CopyManifestEntry) {
  return record.itemId === entry.itemId
    && record.fingerprint === manifestFingerprint(entry)
    && record.projectRef === entry.projectRef
    && record.choirId === entry.choirId
    && record.family === entry.family
    && record.sourceOwner === entry.source.owner
    && record.sourceRowId === entry.source.rowId
    && record.sourceSlot === entry.source.slot
    && record.sourceVersion === entry.source.version
    && record.legacyFileId === entry.source.legacyFileId
    && record.destinationBucket === entry.destination.bucket
    && record.destinationObjectKey === entry.destination.objectKey
    && record.contentLength === entry.expected.contentLength
    && record.mimeType === entry.expected.mimeType
    && record.fileName === entry.expected.fileName;
}

function baseRecord(entry: CopyManifestEntry, fingerprint: string, attempt: number, recordedAt: string) {
  return {
    journalVersion: 1 as const,
    itemId: entry.itemId,
    fingerprint,
    projectRef: entry.projectRef,
    choirId: entry.choirId,
    family: entry.family,
    sourceOwner: entry.source.owner,
    sourceRowId: entry.source.rowId,
    sourceSlot: entry.source.slot,
    sourceVersion: entry.source.version,
    legacyFileId: entry.source.legacyFileId,
    destinationBucket: entry.destination.bucket,
    destinationObjectKey: entry.destination.objectKey,
    contentLength: entry.expected.contentLength,
    mimeType: entry.expected.mimeType,
    fileName: entry.expected.fileName,
    attempt,
    recordedAt,
  };
}

function responseMime(response: Response) {
  return response.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

async function cancelResponse(response: Response) {
  await response.body?.cancel().catch(() => undefined);
}

async function assertNoRedirect(response: Response) {
  if (response.status >= 300 && response.status < 400) {
    await cancelResponse(response);
    throw new CopyError('redirect-refused');
  }
}

function trackedBody(body: ReadableStream<Uint8Array>, expected: CopyManifestEntry['expected']) {
  const reader = body.getReader();
  const hash = createHash('sha256');
  let bytes = 0;
  let digest: string | null = null;
  let completed = false;
  let failure: unknown;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await reader.read();
        if (next.done) {
          if (bytes !== expected.contentLength) throw new CopyError('source-size-mismatch');
          digest = hash.digest('hex');
          if (expected.sha256Hex && digest !== expected.sha256Hex) throw new CopyError('source-hash-mismatch');
          completed = true;
          controller.close();
          return;
        }
        bytes += next.value.byteLength;
        if (bytes > expected.contentLength) throw new CopyError('source-size-mismatch');
        hash.update(next.value);
        controller.enqueue(next.value);
      } catch (error) {
        failure = error;
        await reader.cancel(error).catch(() => undefined);
        controller.error(error);
      }
    },
    async cancel(reason) { await reader.cancel(reason).catch(() => undefined); },
  });
  return {
    stream,
    async cancel(reason?: unknown) { await reader.cancel(reason).catch(() => undefined); },
    result() {
      if (failure) throw failure;
      if (!completed || !digest) throw new CopyError('source-stream-incomplete');
      return { bytes, sha256Hex: digest };
    },
  };
}

async function hashResponse(
  response: Response,
  expected: CopyManifestEntry['expected'],
  side: 'source' | 'destination',
) {
  await assertNoRedirect(response);
  if (!response.ok || !response.body) throw new CopyError(`${side}-read-failed`);
  const headerLength = response.headers.get('content-length');
  if (headerLength !== null && Number(headerLength) !== expected.contentLength) {
    await cancelResponse(response);
    throw new CopyError(`${side}-size-mismatch`);
  }
  const mime = responseMime(response);
  if (mime && mime !== expected.mimeType) {
    await cancelResponse(response);
    throw new CopyError(`${side}-mime-mismatch`);
  }
  const reader = response.body.getReader();
  const hash = createHash('sha256');
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > expected.contentLength) throw new CopyError(`${side}-size-mismatch`);
      hash.update(next.value);
    }
  } catch (error) {
    await reader.cancel(error).catch(() => undefined);
    if (error instanceof CopyError) throw error;
    throw new CopyError(`${side}-stream-failed`, { cause: error });
  }
  if (bytes !== expected.contentLength) throw new CopyError(`${side}-size-mismatch`);
  const sha256Hex = hash.digest('hex');
  if (expected.sha256Hex && sha256Hex !== expected.sha256Hex) {
    throw new CopyError(`${side}-hash-mismatch`);
  }
  return { bytes, sha256Hex };
}

async function readSource(entry: CopyManifestEntry, ports: CopyPorts, signal?: AbortSignal) {
  const response = await ports.getSource(entry.source.legacyFileId, signal);
  return hashResponse(response, entry.expected, 'source');
}

async function readDestination(entry: CopyManifestEntry, ports: CopyPorts, signal?: AbortSignal) {
  const response = await ports.getDestination(entry, signal);
  return hashResponse(response, entry.expected, 'destination');
}

function assertSourceMetadata(entry: CopyManifestEntry, metadata: SourceMetadata) {
  if (metadata.fileId !== entry.source.legacyFileId) throw new CopyError('source-id-mismatch');
  if (metadata.trashed) throw new CopyError('source-trashed');
  if (metadata.googleNative) throw new CopyError('source-google-native');
  if (metadata.contentLength !== entry.expected.contentLength) throw new CopyError('source-size-mismatch');
  if (normalizedMime(metadata.mimeType) !== entry.expected.mimeType) throw new CopyError('source-mime-mismatch');
}

export async function copyManifestEntry(input: {
  entry: CopyManifestEntry;
  prior?: CopyJournalRecord;
  ports: CopyPorts;
  attempt: number;
  signal?: AbortSignal;
}): Promise<CopyJournalRecord> {
  const entry = parseManifestEntry(input.entry);
  if (!Number.isSafeInteger(input.attempt) || input.attempt < 1) throw new CopyError('invalid-attempt');
  const fingerprint = manifestFingerprint(entry);
  if (input.prior && !journalMatchesManifest(input.prior, entry)) {
    throw new CopyError('journal-manifest-conflict');
  }
  const metadata = await input.ports.getSourceMetadata(entry.source.legacyFileId, input.signal);
  assertSourceMetadata(entry, metadata);
  const head = await input.ports.headDestination(entry, input.signal);
  await assertNoRedirect(head);
  await cancelResponse(head);

  let action: 'copied' | 'adopted' | 'resumed';
  let sha256Hex: string;
  if (head.status === 200) {
    const destination = await readDestination(entry, input.ports, input.signal);
    if (input.prior?.status === 'verified') {
      if (destination.sha256Hex !== input.prior.sha256Hex) throw new CopyError('destination-mismatch');
      sha256Hex = destination.sha256Hex;
      action = 'resumed';
    } else {
      const source = await readSource(entry, input.ports, input.signal);
      if (source.sha256Hex !== destination.sha256Hex) throw new CopyError('destination-mismatch');
      sha256Hex = destination.sha256Hex;
      action = 'adopted';
    }
  } else if (head.status === 404) {
    if (input.prior?.status === 'verified') throw new CopyError('verified-destination-missing');
    const source = await input.ports.getSource(entry.source.legacyFileId, input.signal);
    await assertNoRedirect(source);
    if (!source.ok || !source.body) throw new CopyError('source-read-failed');
    const sourceMime = responseMime(source);
    if (sourceMime && sourceMime !== entry.expected.mimeType) {
      await cancelResponse(source);
      throw new CopyError('source-mime-mismatch');
    }
    const stream = trackedBody(source.body, entry.expected);
    let uploaded: Response;
    try {
      uploaded = await input.ports.putDestination(entry, stream.stream, input.signal);
    } catch (error) {
      await stream.cancel(error);
      if (error instanceof CopyError) throw error;
      throw new CopyError('destination-write-failed', { cause: error });
    }
    try {
      await assertNoRedirect(uploaded);
    } catch (error) {
      await stream.cancel(error);
      throw error;
    }
    await cancelResponse(uploaded);
    if (!uploaded.ok) {
      await stream.cancel();
      throw new CopyError('destination-write-failed');
    }
    const sourceResult = stream.result();
    const destination = await readDestination(entry, input.ports, input.signal);
    if (sourceResult.sha256Hex !== destination.sha256Hex) throw new CopyError('destination-hash-mismatch');
    sha256Hex = destination.sha256Hex;
    action = 'copied';
  } else {
    throw new CopyError('destination-head-failed');
  }

  const now = input.ports.now();
  if (!Number.isFinite(now.getTime())) throw new CopyError('invalid-clock');
  const recordedAt = now.toISOString();
  return {
    ...baseRecord(entry, fingerprint, input.attempt, recordedAt),
    status: 'verified',
    action,
    sha256Hex,
    verifiedAt: recordedAt,
  };
}

export function failedJournalRecord(
  entry: CopyManifestEntry,
  attempt: number,
  error: unknown,
  now = new Date(),
): CopyJournalRecord {
  const parsed = parseManifestEntry(entry);
  if (!Number.isSafeInteger(attempt) || attempt < 1 || !Number.isFinite(now.getTime())) {
    throw new CopyError('invalid-journal-attempt');
  }
  const code = error instanceof CopyError ? error.code : 'unexpected-copy-failure';
  return {
    ...baseRecord(parsed, manifestFingerprint(parsed), attempt, now.toISOString()),
    status: 'failed',
    errorCode: code,
  };
}

export async function executeCopyBatch(input: {
  entries: CopyManifestEntry[];
  latest: Map<string, CopyJournalRecord>;
  attempts: Map<string, number>;
  maxItems: number;
  maxTotalBytes: number;
  ports: CopyPorts;
  append(record: CopyJournalRecord): Promise<void>;
}) {
  validateManifest(input.entries);
  if (!Number.isSafeInteger(input.maxItems) || input.maxItems < 1
    || !Number.isSafeInteger(input.maxTotalBytes) || input.maxTotalBytes < 1) {
    throw new CopyError('invalid-batch-limit');
  }
  const orderedEntries = [...input.entries].sort((left, right) => {
    const leftVerified = input.latest.get(left.itemId)?.status === 'verified' ? 1 : 0;
    const rightVerified = input.latest.get(right.itemId)?.status === 'verified' ? 1 : 0;
    return leftVerified - rightVerified;
  });
  let processed = 0;
  let bytes = 0;
  for (const entry of orderedEntries) {
    if (processed >= input.maxItems) break;
    if (bytes + entry.expected.contentLength > input.maxTotalBytes) {
      if (processed === 0) throw new CopyError('batch-byte-limit-too-small');
      break;
    }
    const attempt = (input.attempts.get(entry.itemId) ?? 0) + 1;
    let record: CopyJournalRecord;
    try {
      record = await copyManifestEntry({
        entry,
        prior: input.latest.get(entry.itemId),
        ports: input.ports,
        attempt,
      });
    } catch (error) {
      record = failedJournalRecord(entry, attempt, error);
      await input.append(record);
      input.latest.set(entry.itemId, record);
      input.attempts.set(entry.itemId, attempt);
      throw error;
    }
    await input.append(record);
    input.latest.set(entry.itemId, record);
    input.attempts.set(entry.itemId, attempt);
    processed += 1;
    bytes += entry.expected.contentLength;
  }
  const remaining = input.entries.filter((entry) => input.latest.get(entry.itemId)?.status !== 'verified').length;
  return { processed, bytes, remaining };
}
