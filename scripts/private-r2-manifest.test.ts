import { createHash } from 'node:crypto';
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseManifestEntry, type CopyFamily, type SourceMetadata } from './private-r2-copy-core';
import {
  parseInventoryRow,
  prepareManifest,
  validateInventory,
  type PrivateCopyInventoryRow,
} from './private-r2-manifest-core';
// @ts-expect-error Runtime test exercises the explicit source import used by the operator CLI.
import { publishPreparedFiles, runManifestCli } from './private-r2-manifest.ts';

const PROJECT = 'hievmwwctjjlhmssoxsu';
const CHOIR = '20000000-0000-4000-8000-000000000064';
const ASSIGNMENT = '30000000-0000-4000-8000-000000000064';
const SUBMISSION = '40000000-0000-4000-8000-000000000064';
const ROOM = '50000000-0000-4000-8000-000000000064';
const BATCH = '60000000-0000-4000-8000-000000000064';
const BUCKET = 'genova-private';
const createdDirectories: string[] = [];

const familyConfig: Record<CopyFamily, {
  owner: string;
  slot: string;
  objectKey(row: string, version: string): string;
  name: string;
  mime: string;
}> = {
  'repertoire-file': {
    owner: 'public.repertoire_files', slot: 'content', name: 'score.pdf', mime: 'application/pdf',
    objectKey: (row) => `choirs/${CHOIR}/repertoire/${row}/content`,
  },
  'assignment-submission': {
    owner: 'public.assignment_submission_history', slot: 'content', name: 'take.wav', mime: 'audio/wav',
    objectKey: (_row, version) => `choirs/${CHOIR}/assignments/${ASSIGNMENT}/submissions/${version}/content`,
  },
  'assignment-review': {
    owner: 'public.assignment_submission_private_history', slot: 'reviewer-audio', name: 'review.wav', mime: 'audio/wav',
    objectKey: (_row, version) => `choirs/${CHOIR}/assignments/${ASSIGNMENT}/submissions/${SUBMISSION}/reviews/${version}/content`,
  },
  'repertoire-comment': {
    owner: 'public.repertoire_song_comments', slot: 'comment-audio', name: 'comment.wav', mime: 'audio/wav',
    objectKey: (row, version) => `choirs/${CHOIR}/repertoire/${ASSIGNMENT}/comments/${row}/audio/${version}/content`,
  },
  'chat-message-image': {
    owner: 'public.chat_messages', slot: 'image:3', name: 'photo.jpg', mime: 'image/jpeg',
    objectKey: (_row, version) => `choirs/${CHOIR}/chat/${ROOM}/message-image/${BATCH}/3/${version}/content`,
  },
  'chat-room-avatar': {
    owner: 'public.chat_rooms', slot: 'avatar', name: 'avatar.png', mime: 'image/png',
    objectKey: (_row, version) => `choirs/${CHOIR}/chat/${ROOM}/room-avatar/${BATCH}/0/${version}/content`,
  },
};

function uuid(prefix: number, suffix: number) {
  return `${String(prefix).padStart(8, '0')}-0000-4000-8000-${String(suffix).padStart(12, '0')}`;
}

function inventoryRow(
  family: CopyFamily = 'repertoire-file',
  index = 1,
  overrides: Partial<PrivateCopyInventoryRow> = {},
): PrivateCopyInventoryRow {
  const config = familyConfig[family];
  const row = uuid(70 + index, 64 + index);
  const version = uuid(80 + index, 64 + index);
  const chat = family.startsWith('chat-');
  return {
    item_id: uuid(10 + index, 64 + index),
    choir_id: CHOIR,
    family,
    source_owner: config.owner,
    source_row_id: row,
    source_slot: config.slot,
    source_version: 'legacy-current',
    legacy_reference: `DriveManifest064_${index}`,
    legacy_file_id: `DriveManifest064_${index}`,
    file_name: config.name,
    mime_type: config.mime,
    content_length: 64 + index,
    destination_version_id: version,
    destination_batch_id: chat ? BATCH : null,
    destination_bucket: BUCKET,
    destination_object_key: config.objectKey(row, version),
    inventory_status: 'ready-for-provider-metadata',
    status_detail: 'structurally ready; Google metadata and bytes remain unverified',
    ...overrides,
  };
}

function metadataFor(row: PrivateCopyInventoryRow, overrides: Partial<SourceMetadata> = {}): SourceMetadata {
  return {
    fileId: row.legacy_file_id!,
    name: row.file_name ?? familyConfig[row.family].name,
    contentLength: row.content_length ?? 64,
    mimeType: row.mime_type ?? familyConfig[row.family].mime,
    trashed: false,
    googleNative: false,
    ...overrides,
  };
}

function metadataPort(rows: PrivateCopyInventoryRow[], overrides: Record<string, Partial<SourceMetadata>> = {}) {
  const byId = new Map(rows.map((row) => [row.legacy_file_id, row]));
  return {
    getSourceMetadata: vi.fn(async (fileId: string) => {
      const row = byId.get(fileId);
      if (!row) throw new Error('unexpected-id');
      return metadataFor(row, overrides[fileId] ?? {});
    }),
  };
}

function privateDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'genova-064-'));
  chmodSync(directory, 0o700);
  createdDirectories.push(directory);
  return directory;
}

function repositoryPrivateDirectory() {
  const directory = mkdtempSync(join(resolve('spike'), '.genova-064-'));
  chmodSync(directory, 0o700);
  createdDirectories.push(directory);
  return directory;
}

function writeInventory(directory: string, rows: PrivateCopyInventoryRow[]) {
  const path = join(directory, 'inventory.jsonl');
  writeFileSync(path, `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, { mode: 0o600 });
  chmodSync(path, 0o600);
  return path;
}

afterEach(() => {
  for (const directory of createdDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('064 inventory contract', () => {
  it('parses only the exact 063 snake-case row shape', () => {
    const row = inventoryRow();
    expect(parseInventoryRow(row)).toEqual(row);
    expect(() => parseInventoryRow({ ...row, unexpected: true }))
      .toThrowError(expect.objectContaining({ code: 'invalid-inventory-row' }));
    expect(() => parseInventoryRow({ ...row, source_owner: 'public.chat_rooms' }))
      .toThrowError(expect.objectContaining({ code: 'invalid-inventory-owner-slot' }));
    expect(() => parseInventoryRow({ ...row, inventory_status: 'ready-for-provider-metadata', legacy_file_id: null }))
      .toThrowError(expect.objectContaining({ code: 'invalid-inventory-candidate' }));
  });

  it('sorts and fingerprints the same inventory independent of input order', () => {
    const first = inventoryRow('repertoire-file', 1);
    const second = inventoryRow('assignment-submission', 2);
    const a = validateInventory([first, second]);
    const b = validateInventory([second, first]);
    expect(a.inventoryFingerprint).toBe(b.inventoryFingerprint);
    expect(a.rows).toEqual(b.rows);
  });

  it.each([
    [[inventoryRow(), inventoryRow()], 'duplicate-inventory-item'],
    [[inventoryRow(), inventoryRow('repertoire-file', 2, {
      source_row_id: inventoryRow().source_row_id,
      source_slot: inventoryRow().source_slot,
      source_version: inventoryRow().source_version,
    })], 'duplicate-inventory-source'],
    [[inventoryRow(), inventoryRow('repertoire-file', 2, {
      destination_object_key: inventoryRow().destination_object_key,
    })], 'duplicate-inventory-destination'],
    [[inventoryRow(), inventoryRow('assignment-submission', 2, { choir_id: uuid(99, 99) })], 'mixed-inventory-choirs'],
    [[inventoryRow(), inventoryRow('assignment-submission', 2, { destination_bucket: 'other-private' })], 'mixed-inventory-buckets'],
  ] as const)('rejects ambiguous inventory identity: %s', (rows, code) => {
    expect(() => validateInventory([...rows])).toThrowError(expect.objectContaining({ code }));
  });
});

describe('064 metadata reconciliation and manifest composition', () => {
  it('creates exact accepted 062 entries for all six families and reports every excluded row', async () => {
    const candidates = (Object.keys(familyConfig) as CopyFamily[]).map((family, index) =>
      inventoryRow(family, index + 1, index === 5 ? {
        inventory_status: 'needs-provider-metadata', file_name: null, mime_type: null, content_length: null,
      } : {}));
    const excluded = [
      inventoryRow('repertoire-file', 20, {
        inventory_status: 'already-private', legacy_file_id: null,
        status_detail: 'active repertoire mapping exists',
      }),
      inventoryRow('assignment-submission', 21, {
        inventory_status: 'non-drive-storage', legacy_file_id: null,
        status_detail: 'Supabase Storage alias is not a Drive object',
      }),
      inventoryRow('chat-message-image', 22, {
        inventory_status: 'unsupported-reference', legacy_file_id: null,
        status_detail: 'reference is not a recognized first-party Drive ID or URL',
      }),
    ];
    const port = metadataPort(candidates);
    const result = await prepareManifest({
      values: [...excluded, ...candidates].reverse(), projectRef: PROJECT, maxItems: 6,
      maxTotalBytes: 10_000, metadata: port, now: () => new Date('2026-09-23T21:00:00.000Z'),
    });
    expect(result.entries).toHaveLength(6);
    for (const entry of result.entries) expect(parseManifestEntry(entry)).toEqual(entry);
    expect(port.getSourceMetadata).toHaveBeenCalledTimes(6);
    expect(result.report).toMatchObject({
      reportVersion: 1, projectRef: PROJECT, choirId: CHOIR, bucket: BUCKET,
      inventoryItemCount: 9, manifestItemCount: 6, excludedItemCount: 3, unresolvedItemCount: 1,
      preparedAt: '2026-09-23T21:00:00.000Z',
    });
    expect(result.report.excluded.map((row) => row.inventoryStatus)).toEqual([
      'non-drive-storage', 'unsupported-reference', 'already-private',
    ]);
    expect(result.report.manifestSha256Hex)
      .toBe(createHash('sha256').update(result.manifestText).digest('hex'));
    expect(result.entries.find((entry) => entry.family === 'chat-room-avatar')?.expected)
      .toEqual({ contentLength: 64, mimeType: 'image/png', fileName: 'avatar.png' });
  });

  it.each([
    [{ fileId: 'DifferentDrive064' }, 'source-id-mismatch'],
    [{ trashed: true }, 'source-trashed'],
    [{ googleNative: true }, 'source-google-native'],
    [{ name: 'other.pdf' }, 'source-file-name-drift'],
    [{ mimeType: 'image/png' }, 'source-mime-drift'],
    [{ contentLength: 999 }, 'source-size-drift'],
    [{ name: '../score.pdf' }, 'source-file-name-invalid'],
    [{ name: 'score.svg', mimeType: 'image/svg+xml' }, 'source-active-content'],
  ] as const)('refuses provider drift or unsafe metadata: %s', async (override, code) => {
    const row = inventoryRow();
    await expect(prepareManifest({
      values: [row], projectRef: PROJECT, maxItems: 1, maxTotalBytes: 1000,
      metadata: metadataPort([row], { [row.legacy_file_id!]: override }),
    })).rejects.toMatchObject({ code });
  });

  it('enforces family MIME and byte limits after provider metadata', async () => {
    const review = inventoryRow('assignment-review', 3);
    await expect(prepareManifest({
      values: [review], projectRef: PROJECT, maxItems: 1, maxTotalBytes: 1000,
      metadata: metadataPort([review], { [review.legacy_file_id!]: { mimeType: 'application/pdf' } }),
    })).rejects.toMatchObject({ code: 'source-family-mime-invalid' });
    const missingHints = inventoryRow('assignment-review', 3, {
      inventory_status: 'needs-provider-metadata', file_name: null, mime_type: null, content_length: null,
    });
    await expect(prepareManifest({
      values: [missingHints], projectRef: PROJECT, maxItems: 1, maxTotalBytes: 30 * 1024 * 1024,
      metadata: metadataPort([missingHints], { [missingHints.legacy_file_id!]: {
        mimeType: 'application/pdf', name: 'review.pdf', contentLength: 10,
      } }),
    })).rejects.toMatchObject({ code: 'source-family-mime-invalid' });
    await expect(prepareManifest({
      values: [missingHints], projectRef: PROJECT, maxItems: 1, maxTotalBytes: 30 * 1024 * 1024,
      metadata: metadataPort([missingHints], { [missingHints.legacy_file_id!]: {
        contentLength: 20 * 1024 * 1024 + 1,
      } }),
    })).rejects.toMatchObject({ code: 'source-size-invalid' });
  });

  it('refuses incomplete item/byte bounds without returning a partial manifest', async () => {
    const rows = [inventoryRow('repertoire-file', 1), inventoryRow('assignment-submission', 2)];
    const port = metadataPort(rows);
    await expect(prepareManifest({
      values: rows, projectRef: PROJECT, maxItems: 1, maxTotalBytes: 1000, metadata: port,
    })).rejects.toMatchObject({ code: 'manifest-item-limit-exceeded' });
    expect(port.getSourceMetadata).not.toHaveBeenCalled();
    await expect(prepareManifest({
      values: rows, projectRef: PROJECT, maxItems: 2, maxTotalBytes: 100, metadata: port,
    })).rejects.toMatchObject({ code: 'manifest-byte-limit-exceeded' });
  });
});

describe('064 private operator CLI and artifact publication', () => {
  it('audits without provider access and requires the exact snapshot approval before metadata', async () => {
    const directory = privateDirectory();
    const row = inventoryRow();
    const inventory = writeInventory(directory, [row]);
    const outputs: Record<string, unknown>[] = [];
    const port = metadataPort([row]);
    const args = ['--inventory', inventory, '--project-ref', PROJECT, '--choir', CHOIR, '--bucket', BUCKET];
    await runManifestCli(['audit', ...args], { metadata: port, print: (value) => outputs.push(value) });
    expect(outputs[0]).toMatchObject({ status: 'valid-inventory', itemCount: 1, candidateCount: 1 });
    expect(port.getSourceMetadata).not.toHaveBeenCalled();
    const manifest = join(directory, 'manifest.jsonl');
    const report = join(directory, 'report.json');
    await expect(runManifestCli(['prepare', ...args, '--manifest', manifest, '--report', report,
      '--max-items', '1', '--max-total-bytes', '1000', '--confirm-inventory', 'wrong'], {
      env: {}, metadata: port,
    })).rejects.toMatchObject({ code: 'inventory-confirmation-required' });
    expect(port.getSourceMetadata).not.toHaveBeenCalled();
    expect(() => readFileSync(manifest)).toThrow();
    expect(() => readFileSync(report)).toThrow();
  });

  it('publishes a private report first and a report-bound manifest last', async () => {
    const directory = privateDirectory();
    const rows = [inventoryRow(), inventoryRow('chat-room-avatar', 2, {
      inventory_status: 'needs-provider-metadata', file_name: null, mime_type: null, content_length: null,
    }), inventoryRow('assignment-submission', 3, {
      inventory_status: 'activation-parent-missing',
      status_detail: 'history has no live submission parent for 057 activation',
    })];
    const inventory = writeInventory(directory, rows);
    const fingerprint = validateInventory(rows).inventoryFingerprint;
    const approval = `${PROJECT}/${CHOIR}/${BUCKET}/${fingerprint}`;
    const manifest = join(directory, 'manifest.jsonl');
    const report = join(directory, 'report.json');
    const output: Record<string, unknown>[] = [];
    await runManifestCli([
      'prepare', '--inventory', inventory, '--project-ref', PROJECT, '--choir', CHOIR, '--bucket', BUCKET,
      '--manifest', manifest, '--report', report, '--max-items', '2', '--max-total-bytes', '1000',
      '--confirm-inventory', approval,
    ], {
      env: {
        GENOVA_PRIVATE_R2_MANIFEST_APPROVED: approval,
        DRIVE_CLIENT_SECRET: 'must-not-appear-in-064-artifacts',
      },
      metadata: metadataPort(rows.filter((row) => row.legacy_file_id !== null)),
      now: () => new Date('2026-09-23T21:30:00.000Z'),
      print: (value) => output.push(value),
    });
    expect(statSync(manifest).mode & 0o077).toBe(0);
    expect(statSync(report).mode & 0o077).toBe(0);
    const manifestText = readFileSync(manifest, 'utf8');
    const reportValue = JSON.parse(readFileSync(report, 'utf8')) as Record<string, unknown>;
    expect(reportValue.manifestSha256Hex)
      .toBe(createHash('sha256').update(manifestText).digest('hex'));
    expect(reportValue).toMatchObject({ manifestItemCount: 2, excludedItemCount: 1, unresolvedItemCount: 1 });
    expect(output[0]).toMatchObject({ status: 'manifest-prepared', manifestItemCount: 2, unresolvedItemCount: 1 });
    expect(`${manifestText}\n${JSON.stringify(reportValue)}\n${JSON.stringify(output)}`)
      .not.toContain('must-not-appear-in-064-artifacts');
    for (const line of manifestText.trim().split('\n')) expect(parseManifestEntry(JSON.parse(line))).toBeTruthy();
  });

  it('refuses permissive/repository inventory and conflicting output paths', async () => {
    const row = inventoryRow();
    const external = privateDirectory();
    const permissiveInventory = writeInventory(external, [row]);
    chmodSync(permissiveInventory, 0o644);
    const common = ['--inventory', permissiveInventory, '--project-ref', PROJECT,
      '--choir', CHOIR, '--bucket', BUCKET];
    await expect(runManifestCli(['audit', ...common]))
      .rejects.toMatchObject({ code: 'invalid-inventory-file' });

    const repositoryDirectory = repositoryPrivateDirectory();
    const repositoryInventory = writeInventory(repositoryDirectory, [row]);
    await expect(runManifestCli(['audit', '--inventory', repositoryInventory,
      '--project-ref', PROJECT, '--choir', CHOIR, '--bucket', BUCKET]))
      .rejects.toMatchObject({ code: 'repository-path-refused' });
    await expect(publishPreparedFiles({
      manifestPath: join(repositoryDirectory, 'manifest.jsonl'),
      reportPath: join(repositoryDirectory, 'report.json'),
      manifestText: '{}\n', reportText: '{}\n',
    })).rejects.toMatchObject({ code: 'repository-path-refused' });

    const sameOutput = join(external, 'same-output.json');
    await expect(publishPreparedFiles({
      manifestPath: sameOutput, reportPath: sameOutput, manifestText: '{}\n', reportText: '{}\n',
    })).rejects.toMatchObject({ code: 'output-path-conflict' });
    const otherDirectory = privateDirectory();
    await expect(publishPreparedFiles({
      manifestPath: join(external, 'manifest.jsonl'),
      reportPath: join(otherDirectory, 'report.json'),
      manifestText: '{}\n', reportText: '{}\n',
    })).rejects.toMatchObject({ code: 'output-path-conflict' });
  });

  it('does not overwrite outputs and removes final artifacts after a publication failure', async () => {
    const directory = privateDirectory();
    const manifest = join(directory, 'manifest.jsonl');
    const report = join(directory, 'report.json');
    writeFileSync(manifest, 'existing', { mode: 0o600 });
    await expect(publishPreparedFiles({ manifestPath: manifest, reportPath: report,
      manifestText: '{}\n', reportText: '{}\n' }))
      .rejects.toMatchObject({ code: 'invalid-output-path' });
    expect(readFileSync(manifest, 'utf8')).toBe('existing');
    expect(() => readFileSync(report)).toThrow();
  });

  it('leaves no final output when metadata preparation fails', async () => {
    const directory = privateDirectory();
    const row = inventoryRow();
    const inventory = writeInventory(directory, [row]);
    const approval = `${PROJECT}/${CHOIR}/${BUCKET}/${validateInventory([row]).inventoryFingerprint}`;
    const manifest = join(directory, 'manifest.jsonl');
    const report = join(directory, 'report.json');
    await expect(runManifestCli([
      'prepare', '--inventory', inventory, '--project-ref', PROJECT, '--choir', CHOIR, '--bucket', BUCKET,
      '--manifest', manifest, '--report', report, '--max-items', '1', '--max-total-bytes', '1000',
      '--confirm-inventory', approval,
    ], {
      env: { GENOVA_PRIVATE_R2_MANIFEST_APPROVED: approval },
      metadata: metadataPort([row], { [row.legacy_file_id!]: { trashed: true } }),
    })).rejects.toMatchObject({ code: 'source-trashed' });
    expect(() => readFileSync(manifest)).toThrow();
    expect(() => readFileSync(report)).toThrow();
  });

  it('exercises the real entrypoint pre-approval refusal without loading credentials', () => {
    const directory = privateDirectory();
    const row = inventoryRow();
    const inventory = writeInventory(directory, [row]);
    const result = spawnSync(process.execPath, [
      '--experimental-strip-types', '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
      resolve('scripts/private-r2-manifest.ts'), 'prepare', '--inventory', inventory,
      '--project-ref', PROJECT, '--choir', CHOIR, '--bucket', BUCKET,
      '--manifest', join(directory, 'manifest.jsonl'), '--report', join(directory, 'report.json'),
      '--max-items', '1', '--max-total-bytes', '1000', '--confirm-inventory', 'wrong',
    ], { encoding: 'utf8', env: { ...process.env, GENOVA_PRIVATE_R2_MANIFEST_APPROVED: '' } });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe('');
    expect(JSON.parse(result.stderr)).toEqual({ status: 'failed', errorCode: 'inventory-confirmation-required' });
  });
});
