#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON

import { existsSync, openSync, closeSync, statSync } from 'node:fs';
import { open, readFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { AwsClient } from 'aws4fetch';

// Node executes this source directly with type stripping; the explicit extension is intentional.
// @ts-expect-error TypeScript does not permit .ts imports unless allowImportingTsExtensions is global.
import { CopyError, executeCopyBatch, journalMatchesManifest, parseJournalRecord, parseManifestEntry, validateManifest, type CopyJournalRecord, type CopyManifestEntry, type CopyPorts, type SourceMetadata } from './private-r2-copy-core.ts';
// @ts-expect-error Direct Node type-stripped execution needs the source extension.
import { makeR2ObjectUrl, parseR2Jurisdiction } from '../supabase/functions/repertoire-file/r2.ts';
// @ts-expect-error Direct Node type-stripped execution needs the source extension.
import { sendSignedUpload } from '../supabase/functions/repertoire-upload/transport.ts';

const MAX_MANIFEST_BYTES = 32 * 1024 * 1024;
const MAX_JOURNAL_BYTES = 32 * 1024 * 1024;
const EXPECTED_PROJECT_REF = 'hievmwwctjjlhmssoxsu';
const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

type Command = 'validate' | 'execute';

interface CliOptions {
  command: Command;
  manifest: string;
  journal?: string;
  projectRef?: string;
  bucket?: string;
  maxItems?: number;
  maxTotalBytes?: number;
  confirmTarget?: string;
}

interface DriveSourceOptions {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  tokenEndpoint?: string;
  driveEndpoint?: string;
  allowLoopback?: boolean;
  fetchImpl?: typeof fetch;
}

interface R2DestinationOptions {
  accountId: string;
  jurisdiction: '' | 'eu';
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  testEndpoint?: string;
  allowLoopback?: boolean;
  fetchImpl?: typeof fetch;
}

function required(value: string | undefined, name: string) {
  if (!value) throw new CopyError(`missing-${name.toLowerCase().replaceAll('_', '-')}`);
  return value;
}

function normalizedMime(value: string | null) {
  return value?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
}

function assertFixedHttpsOrLoopback(value: string, allowLoopback: boolean) {
  const url = new URL(value);
  const loopback = url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost');
  if (url.protocol !== 'https:' && !(allowLoopback && loopback)) throw new CopyError('invalid-test-endpoint');
  if (url.username || url.password || url.search || url.hash) throw new CopyError('invalid-test-endpoint');
  return url;
}

export class GoogleDriveSource {
  private readonly options: DriveSourceOptions;
  private readonly fetchImpl: typeof fetch;
  private readonly tokenEndpoint: URL;
  private readonly driveEndpoint: URL;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(options: DriveSourceOptions) {
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.tokenEndpoint = assertFixedHttpsOrLoopback(
      options.tokenEndpoint ?? 'https://oauth2.googleapis.com/token',
      options.allowLoopback === true,
    );
    this.driveEndpoint = assertFixedHttpsOrLoopback(
      options.driveEndpoint ?? 'https://www.googleapis.com/drive/v3/files/',
      options.allowLoopback === true,
    );
  }

  private async accessToken(signal?: AbortSignal) {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const response = await this.fetchImpl(this.tokenEndpoint, {
      method: 'POST',
      redirect: 'manual',
      signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.options.clientId,
        client_secret: this.options.clientSecret,
        refresh_token: this.options.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (response.status >= 300 && response.status < 400) throw new CopyError('drive-token-redirect-refused');
    if (!response.ok) throw new CopyError('drive-token-failed');
    const value = await response.json() as { access_token?: unknown; expires_in?: unknown };
    if (typeof value.access_token !== 'string' || value.access_token.length < 8
      || !Number.isFinite(Number(value.expires_in)) || Number(value.expires_in) < 60) {
      throw new CopyError('drive-token-invalid');
    }
    this.token = { value: value.access_token, expiresAt: Date.now() + Number(value.expires_in) * 1000 };
    return this.token.value;
  }

  private fileUrl(fileId: string) {
    const url = new URL(encodeURIComponent(fileId), this.driveEndpoint);
    return url;
  }

  async getMetadata(fileId: string, signal?: AbortSignal): Promise<SourceMetadata> {
    const token = await this.accessToken(signal);
    const url = this.fileUrl(fileId);
    url.searchParams.set('fields', 'id,name,mimeType,size,trashed');
    url.searchParams.set('supportsAllDrives', 'true');
    const response = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}` }, redirect: 'manual', signal,
    });
    if (response.status >= 300 && response.status < 400) throw new CopyError('drive-metadata-redirect-refused');
    if (response.status === 404) throw new CopyError('source-missing');
    if (!response.ok) throw new CopyError('drive-metadata-failed');
    const value = await response.json() as Record<string, unknown>;
    const contentLength = Number(value.size);
    if (value.id !== fileId || typeof value.name !== 'string' || typeof value.mimeType !== 'string'
      || !Number.isSafeInteger(contentLength) || contentLength < 1 || typeof value.trashed !== 'boolean') {
      throw new CopyError('drive-metadata-invalid');
    }
    return {
      fileId,
      name: value.name,
      contentLength,
      mimeType: value.mimeType.toLowerCase(),
      trashed: value.trashed,
      googleNative: value.mimeType.startsWith('application/vnd.google-apps.'),
    };
  }

  async getBytes(fileId: string, signal?: AbortSignal) {
    const token = await this.accessToken(signal);
    const url = this.fileUrl(fileId);
    url.searchParams.set('alt', 'media');
    url.searchParams.set('supportsAllDrives', 'true');
    const response = await this.fetchImpl(url, {
      headers: { Authorization: `Bearer ${token}` }, redirect: 'manual', signal,
    });
    if (response.status >= 300 && response.status < 400) throw new CopyError('drive-media-redirect-refused');
    return response;
  }
}

export class SignedR2Destination {
  private readonly options: R2DestinationOptions;
  private readonly fetchImpl: typeof fetch;
  private readonly client: AwsClient;

  constructor(options: R2DestinationOptions) {
    this.options = options;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.client = new AwsClient({
      service: 's3', region: 'auto', retries: 0,
      accessKeyId: options.accessKeyId, secretAccessKey: options.secretAccessKey,
    });
    if (options.testEndpoint) assertFixedHttpsOrLoopback(options.testEndpoint, options.allowLoopback === true);
  }

  private url(entry: CopyManifestEntry) {
    if (entry.destination.bucket !== this.options.bucket) throw new CopyError('bucket-mismatch');
    const url = makeR2ObjectUrl({
      accountId: this.options.accountId,
      jurisdiction: this.options.jurisdiction,
      bucket: entry.destination.bucket,
      objectKey: entry.destination.objectKey,
      testEndpoint: this.options.testEndpoint,
      allowInsecureLoopback: this.options.allowLoopback === true,
    });
    if (!url) throw new CopyError('invalid-r2-target');
    return url;
  }

  private async signedRead(entry: CopyManifestEntry, method: 'GET' | 'HEAD', signal?: AbortSignal) {
    const signed = await this.client.sign(this.url(entry), {
      method, redirect: 'manual', signal, headers: { 'Cache-Control': 'no-store' },
    });
    return this.fetchImpl(signed, { redirect: 'manual', signal });
  }

  head(entry: CopyManifestEntry, signal?: AbortSignal) {
    return this.signedRead(entry, 'HEAD', signal);
  }

  get(entry: CopyManifestEntry, signal?: AbortSignal) {
    return this.signedRead(entry, 'GET', signal);
  }

  async put(entry: CopyManifestEntry, body: ReadableStream<Uint8Array>, signal?: AbortSignal) {
    const headers = new Headers({
      'Content-Type': entry.expected.mimeType,
      'Content-Length': String(entry.expected.contentLength),
      'X-Amz-Content-Sha256': 'UNSIGNED-PAYLOAD',
    });
    const signed = await this.client.sign(this.url(entry), {
      method: 'PUT', headers, body, redirect: 'manual', signal,
    });
    return sendSignedUpload(signed);
  }
}

function parsePositiveInteger(value: string | undefined, name: string) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new CopyError(`invalid-${name}`);
  return number;
}

function parseArgs(argv: string[]): CliOptions {
  const [command, ...rest] = argv;
  if (command !== 'validate' && command !== 'execute') throw new CopyError('usage');
  const values = new Map<string, string>();
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (!key.startsWith('--') || index + 1 >= rest.length || rest[index + 1].startsWith('--')) {
      throw new CopyError('usage');
    }
    if (values.has(key)) throw new CopyError('duplicate-argument');
    values.set(key, rest[index + 1]);
    index += 1;
  }
  const allowed = command === 'validate'
    ? new Set(['--manifest', '--project-ref', '--bucket'])
    : new Set(['--manifest', '--journal', '--project-ref', '--bucket', '--max-items', '--max-total-bytes', '--confirm-target']);
  if ([...values.keys()].some((key) => !allowed.has(key))) throw new CopyError('usage');
  const options: CliOptions = {
    command,
    manifest: required(values.get('--manifest'), 'MANIFEST'),
    projectRef: values.get('--project-ref'),
    bucket: values.get('--bucket'),
  };
  if (command === 'execute') {
    options.journal = required(values.get('--journal'), 'JOURNAL');
    options.maxItems = parsePositiveInteger(values.get('--max-items'), 'max-items');
    options.maxTotalBytes = parsePositiveInteger(values.get('--max-total-bytes'), 'max-total-bytes');
    options.confirmTarget = required(values.get('--confirm-target'), 'CONFIRM_TARGET');
  }
  return options;
}

function assertPrivateExternalPath(filePath: string, exists: boolean) {
  if (!isAbsolute(filePath)) throw new CopyError('path-must-be-absolute');
  const relativePath = relative(REPOSITORY_ROOT, resolve(filePath));
  if (relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath))) {
    throw new CopyError('repository-path-refused');
  }
  if (exists && (statSync(filePath).mode & 0o077) !== 0) throw new CopyError('private-file-permissions-required');
}

async function readJsonLines(filePath: string, maximumBytes: number, kind: 'manifest' | 'journal') {
  const stat = statSync(filePath);
  if (!stat.isFile() || stat.size < 2 || stat.size > maximumBytes) throw new CopyError(`invalid-${kind}-file`);
  const content = await readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/u).filter((line) => line.trim().length > 0);
  if (!lines.length) throw new CopyError(`empty-${kind}`);
  return lines.map((line) => {
    try { return JSON.parse(line) as unknown; } catch { throw new CopyError(`invalid-${kind}-json`); }
  });
}

async function loadManifest(filePath: string) {
  const rows = await readJsonLines(filePath, MAX_MANIFEST_BYTES, 'manifest');
  const entries = rows.map(parseManifestEntry);
  return { entries, summary: validateManifest(entries) };
}

async function loadJournal(filePath: string, entries: CopyManifestEntry[]) {
  const latest = new Map<string, CopyJournalRecord>();
  const attempts = new Map<string, number>();
  if (!existsSync(filePath)) return { latest, attempts };
  if (statSync(filePath).size === 0) return { latest, attempts };
  const records = (await readJsonLines(filePath, MAX_JOURNAL_BYTES, 'journal')).map(parseJournalRecord);
  const byItem = new Map(entries.map((entry) => [entry.itemId, entry]));
  for (const record of records) {
    const entry = byItem.get(record.itemId);
    if (!entry || !journalMatchesManifest(record, entry)) throw new CopyError('journal-manifest-conflict');
    const previous = attempts.get(record.itemId) ?? 0;
    if (record.attempt !== previous + 1) throw new CopyError('journal-attempt-sequence-invalid');
    attempts.set(record.itemId, record.attempt);
    latest.set(record.itemId, record);
  }
  return { latest, attempts };
}

async function appendJournal(filePath: string, record: CopyJournalRecord) {
  const handle = await open(filePath, 'a', 0o600);
  try {
    await handle.appendFile(`${JSON.stringify(record)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function createPorts(source: GoogleDriveSource, destination: SignedR2Destination): CopyPorts {
  return {
    getSourceMetadata: (id, signal) => source.getMetadata(id, signal),
    getSource: (id, signal) => source.getBytes(id, signal),
    headDestination: (entry, signal) => destination.head(entry, signal),
    putDestination: (entry, body, signal) => destination.put(entry, body, signal),
    getDestination: (entry, signal) => destination.get(entry, signal),
    now: () => new Date(),
  };
}

function readProductionTarget(bucket: string) {
  const jurisdiction = parseR2Jurisdiction(process.env.R2_JURISDICTION);
  if (jurisdiction === null || jurisdiction === 'fedramp') throw new CopyError('invalid-r2-jurisdiction');
  const accountId = required(process.env.R2_ACCOUNT_ID, 'R2_ACCOUNT_ID');
  return { accountId, jurisdiction, bucket };
}

function createProductionPorts(target: ReturnType<typeof readProductionTarget>) {
  const source = new GoogleDriveSource({
    clientId: required(process.env.DRIVE_CLIENT_ID, 'DRIVE_CLIENT_ID'),
    clientSecret: required(process.env.DRIVE_CLIENT_SECRET, 'DRIVE_CLIENT_SECRET'),
    refreshToken: required(process.env.DRIVE_REFRESH_TOKEN, 'DRIVE_REFRESH_TOKEN'),
  });
  const destination = new SignedR2Destination({
    accountId: target.accountId,
    jurisdiction: target.jurisdiction,
    bucket: target.bucket,
    accessKeyId: required(process.env.R2_ACCESS_KEY_ID, 'R2_ACCESS_KEY_ID'),
    secretAccessKey: required(process.env.R2_SECRET_ACCESS_KEY, 'R2_SECRET_ACCESS_KEY'),
  });
  return createPorts(source, destination);
}

function print(value: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

export async function runCli(argv: string[]) {
  const options = parseArgs(argv);
  if (options.command === 'execute') assertPrivateExternalPath(options.manifest, true);
  const { entries, summary } = await loadManifest(options.manifest);
  if (options.projectRef && options.projectRef !== summary.projectRef) throw new CopyError('project-ref-mismatch');
  if (summary.projectRef !== EXPECTED_PROJECT_REF) throw new CopyError('unexpected-project-ref');
  const buckets = new Set(entries.map((entry) => entry.destination.bucket));
  if (buckets.size !== 1) throw new CopyError('mixed-buckets');
  const manifestBucket = entries[0].destination.bucket;
  if (options.bucket && options.bucket !== manifestBucket) throw new CopyError('bucket-mismatch');

  if (options.command === 'validate') {
    print({ status: 'valid', ...summary, bucket: manifestBucket });
    return;
  }

  const journalPath = options.journal!;
  assertPrivateExternalPath(journalPath, existsSync(journalPath));
  if (resolve(journalPath) === resolve(options.manifest)) throw new CopyError('journal-path-conflict');
  const target = readProductionTarget(manifestBucket);
  const jurisdictionLabel = target.jurisdiction || 'auto';
  const exactTarget = `${summary.projectRef}/${target.accountId}/${manifestBucket}/${jurisdictionLabel}`;
  if (options.confirmTarget !== exactTarget || process.env.GENOVA_PRIVATE_R2_COPY_APPROVED !== exactTarget) {
    throw new CopyError('target-confirmation-required');
  }
  if (!existsSync(journalPath)) {
    const descriptor = openSync(journalPath, 'wx', 0o600);
    closeSync(descriptor);
  }
  const { latest, attempts } = await loadJournal(journalPath, entries);
  const productionPorts = createProductionPorts(target);

  const result = await executeCopyBatch({
    entries,
    latest,
    attempts,
    maxItems: options.maxItems!,
    maxTotalBytes: options.maxTotalBytes!,
    ports: productionPorts,
    async append(record) {
      await appendJournal(journalPath, record);
      print(record.status === 'verified'
        ? { itemId: record.itemId, status: record.status, action: record.action, attempt: record.attempt }
        : { itemId: record.itemId, status: record.status, errorCode: record.errorCode, attempt: record.attempt });
    },
  });
  print({ status: 'batch-complete', ...result });
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  runCli(process.argv.slice(2)).catch((error) => {
    const code = error instanceof CopyError ? error.code : 'unexpected-copy-failure';
    process.stderr.write(`${JSON.stringify({ status: 'failed', errorCode: code })}\n`);
    process.exitCode = 1;
  });
}
