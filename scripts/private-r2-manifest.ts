#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning --disable-warning=MODULE_TYPELESS_PACKAGE_JSON

import { existsSync, lstatSync, realpathSync, statSync } from 'node:fs';
import { link, open, readFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// @ts-expect-error Direct Node type-stripped execution needs the source extension.
import { CopyError } from './private-r2-copy-core.ts';
// @ts-expect-error Direct Node type-stripped execution needs the source extension.
import { GoogleDriveSource } from './private-r2-copy.ts';
// @ts-expect-error Direct Node type-stripped execution needs the source extension.
import { prepareManifest, validateInventory, type ManifestMetadataPort } from './private-r2-manifest-core.ts';

const MAX_INVENTORY_BYTES = 32 * 1024 * 1024;
const EXPECTED_PROJECT_REF = 'hievmwwctjjlhmssoxsu';
const REPOSITORY_ROOT = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), '..'));

type Command = 'audit' | 'prepare';

interface CliOptions {
  command: Command;
  inventory: string;
  projectRef: string;
  choir: string;
  bucket: string;
  manifest?: string;
  report?: string;
  maxItems?: number;
  maxTotalBytes?: number;
  confirmInventory?: string;
}

interface CliRuntime {
  env?: Readonly<Record<string, string | undefined>>;
  metadata?: ManifestMetadataPort;
  now?: () => Date;
  print?: (value: Record<string, unknown>) => void;
}

function required(value: string | undefined, name: string) {
  if (!value) throw new CopyError(`missing-${name.toLowerCase().replaceAll('_', '-')}`);
  return value;
}

function positiveInteger(value: string | undefined, name: string) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new CopyError(`invalid-${name}`);
  return number;
}

function parseArgs(argv: string[]): CliOptions {
  const [command, ...rest] = argv;
  if (command !== 'audit' && command !== 'prepare') throw new CopyError('usage');
  const values = new Map<string, string>();
  for (let index = 0; index < rest.length; index += 1) {
    const key = rest[index];
    if (!key.startsWith('--') || index + 1 >= rest.length || rest[index + 1].startsWith('--')
      || values.has(key)) throw new CopyError('usage');
    values.set(key, rest[index + 1]);
    index += 1;
  }
  const common = ['--inventory', '--project-ref', '--choir', '--bucket'];
  const allowed = new Set(command === 'audit' ? common : [
    ...common, '--manifest', '--report', '--max-items', '--max-total-bytes', '--confirm-inventory',
  ]);
  if ([...values.keys()].some((key) => !allowed.has(key))) throw new CopyError('usage');
  const options: CliOptions = {
    command,
    inventory: required(values.get('--inventory'), 'INVENTORY'),
    projectRef: required(values.get('--project-ref'), 'PROJECT_REF'),
    choir: required(values.get('--choir'), 'CHOIR'),
    bucket: required(values.get('--bucket'), 'BUCKET'),
  };
  if (command === 'prepare') {
    options.manifest = required(values.get('--manifest'), 'MANIFEST');
    options.report = required(values.get('--report'), 'REPORT');
    options.maxItems = positiveInteger(values.get('--max-items'), 'max-items');
    options.maxTotalBytes = positiveInteger(values.get('--max-total-bytes'), 'max-total-bytes');
    options.confirmInventory = required(values.get('--confirm-inventory'), 'CONFIRM_INVENTORY');
  }
  return options;
}

function outsideRepository(realPath: string) {
  const pathFromRoot = relative(REPOSITORY_ROOT, realPath);
  return pathFromRoot !== '' && (pathFromRoot.startsWith('..') || isAbsolute(pathFromRoot));
}

function assertPrivateInput(filePath: string) {
  if (!isAbsolute(filePath) || !existsSync(filePath)) throw new CopyError('invalid-inventory-path');
  const stat = lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 2 || stat.size > MAX_INVENTORY_BYTES
    || (stat.mode & 0o077) !== 0) throw new CopyError('invalid-inventory-file');
  const realPath = realpathSync(filePath);
  if (!outsideRepository(realPath)) throw new CopyError('repository-path-refused');
  return realPath;
}

function assertOutputPath(filePath: string) {
  if (!isAbsolute(filePath) || existsSync(filePath)) throw new CopyError('invalid-output-path');
  const parent = realpathSync(dirname(filePath));
  const resolved = join(parent, basename(filePath));
  if (!outsideRepository(resolved)) throw new CopyError('repository-path-refused');
  return resolved;
}

async function readInventory(filePath: string) {
  const content = await readFile(filePath, 'utf8');
  const lines = content.split(/\r?\n/u).filter((line) => line.trim().length > 0);
  if (!lines.length) throw new CopyError('empty-inventory');
  return lines.map((line) => {
    try { return JSON.parse(line) as unknown; }
    catch { throw new CopyError('invalid-inventory-json'); }
  });
}

async function writePrivateTemp(filePath: string, content: string) {
  const handle = await open(filePath, 'wx', 0o600);
  try {
    await handle.writeFile(content, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function publishPreparedFiles(input: {
  manifestPath: string;
  reportPath: string;
  manifestText: string;
  reportText: string;
}) {
  const manifestPath = assertOutputPath(input.manifestPath);
  const reportPath = assertOutputPath(input.reportPath);
  if (manifestPath === reportPath || dirname(manifestPath) !== dirname(reportPath)) {
    throw new CopyError('output-path-conflict');
  }
  const suffix = randomUUID();
  const manifestTemp = `${manifestPath}.tmp-${suffix}`;
  const reportTemp = `${reportPath}.tmp-${suffix}`;
  let reportPublished = false;
  try {
    await writePrivateTemp(manifestTemp, input.manifestText);
    await writePrivateTemp(reportTemp, input.reportText);
    await link(reportTemp, reportPath);
    reportPublished = true;
    await link(manifestTemp, manifestPath);
  } catch (error) {
    if (reportPublished) await unlink(reportPath).catch(() => undefined);
    throw new CopyError('output-publication-failed', { cause: error });
  } finally {
    await unlink(manifestTemp).catch(() => undefined);
    await unlink(reportTemp).catch(() => undefined);
  }
  if ((statSync(manifestPath).mode & 0o077) !== 0 || (statSync(reportPath).mode & 0o077) !== 0) {
    await unlink(manifestPath).catch(() => undefined);
    await unlink(reportPath).catch(() => undefined);
    throw new CopyError('private-output-permissions-failed');
  }
}

function productionMetadata(env: Readonly<Record<string, string | undefined>>): ManifestMetadataPort {
  const source = new GoogleDriveSource({
    clientId: required(env.DRIVE_CLIENT_ID, 'DRIVE_CLIENT_ID'),
    clientSecret: required(env.DRIVE_CLIENT_SECRET, 'DRIVE_CLIENT_SECRET'),
    refreshToken: required(env.DRIVE_REFRESH_TOKEN, 'DRIVE_REFRESH_TOKEN'),
  });
  return { getSourceMetadata: (fileId, signal) => source.getMetadata(fileId, signal) };
}

function defaultPrint(value: Record<string, unknown>) {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

export async function runManifestCli(argv: string[], runtime: CliRuntime = {}) {
  const options = parseArgs(argv);
  if (options.projectRef !== EXPECTED_PROJECT_REF) throw new CopyError('unexpected-project-ref');
  const inventoryPath = assertPrivateInput(options.inventory);
  const values = await readInventory(inventoryPath);
  const inventory = validateInventory(values);
  if (inventory.choirId !== options.choir) throw new CopyError('choir-mismatch');
  if (inventory.bucket !== options.bucket) throw new CopyError('bucket-mismatch');
  const print = runtime.print ?? defaultPrint;
  if (options.command === 'audit') {
    print({
      status: 'valid-inventory',
      itemCount: inventory.rows.length,
      candidateCount: inventory.candidates.length,
      excludedCount: inventory.excluded.length,
      statusCounts: inventory.statusCounts,
      inventoryFingerprint: inventory.inventoryFingerprint,
      choirId: inventory.choirId,
      bucket: inventory.bucket,
    });
    return;
  }
  const exactApproval = `${options.projectRef}/${inventory.choirId}/${inventory.bucket}/${inventory.inventoryFingerprint}`;
  const env = runtime.env ?? process.env;
  if (options.confirmInventory !== exactApproval
    || env.GENOVA_PRIVATE_R2_MANIFEST_APPROVED !== exactApproval) {
    throw new CopyError('inventory-confirmation-required');
  }
  const manifestPath = assertOutputPath(options.manifest!);
  const reportPath = assertOutputPath(options.report!);
  if (manifestPath === inventoryPath || reportPath === inventoryPath) throw new CopyError('output-path-conflict');
  const prepared = await prepareManifest({
    values,
    projectRef: options.projectRef,
    maxItems: options.maxItems!,
    maxTotalBytes: options.maxTotalBytes!,
    metadata: runtime.metadata ?? productionMetadata(env),
    now: runtime.now,
  });
  await publishPreparedFiles({
    manifestPath,
    reportPath,
    manifestText: prepared.manifestText,
    reportText: `${JSON.stringify(prepared.report, null, 2)}\n`,
  });
  print({
    status: 'manifest-prepared',
    inventoryFingerprint: prepared.report.inventoryFingerprint,
    manifestSha256Hex: prepared.report.manifestSha256Hex,
    manifestItemCount: prepared.report.manifestItemCount,
    excludedItemCount: prepared.report.excludedItemCount,
    unresolvedItemCount: prepared.report.unresolvedItemCount,
    totalBytes: prepared.report.totalBytes,
  });
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  runManifestCli(process.argv.slice(2)).catch((error) => {
    const code = error instanceof CopyError ? error.code : 'unexpected-manifest-failure';
    process.stderr.write(`${JSON.stringify({ status: 'failed', errorCode: code })}\n`);
    process.exitCode = 1;
  });
}
