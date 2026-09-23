import { createHash } from 'node:crypto';

// Direct Node type-stripped execution follows this explicit source edge.
// @ts-expect-error TypeScript does not permit .ts imports without a global setting.
import { COPY_FAMILIES, CopyError, parseManifestEntry, validateManifest, type CopyFamily, type CopyManifestEntry, type SourceMetadata } from './private-r2-copy-core.ts';
// @ts-expect-error Direct Node execution needs the source extension.
import { isActiveDriveFileContent, normalizeMimeType } from '../lib/server/drive-file-content.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const DRIVE_ID = /^[A-Za-z0-9_-]{10,200}$/u;
const BUCKET = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/u;
const MIME = /^[a-z0-9][a-z0-9.+-]*\/[a-z0-9][a-z0-9.+-]*$/u;
const VERSION = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,127}$/u;
const MAX_INVENTORY_ITEMS = 100_000;

export const INVENTORY_STATUSES = [
  'ready-for-provider-metadata',
  'needs-provider-metadata',
  'already-private',
  'private-target-conflict',
  'private-alias-unresolved',
  'non-drive-storage',
  'unsupported-reference',
  'missing-reference',
  'activation-parent-missing',
  'activation-shape-unsupported',
  'stored-metadata-invalid',
] as const;

export type InventoryStatus = typeof INVENTORY_STATUSES[number];

const CANDIDATE_STATUSES = new Set<InventoryStatus>([
  'ready-for-provider-metadata', 'needs-provider-metadata',
]);
const NON_BLOCKING_EXCLUDED = new Set<InventoryStatus>(['already-private', 'non-drive-storage']);
const AUDIO = new Set([
  'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/aac', 'audio/ogg',
  'audio/webm', 'audio/flac',
]);
const CHAT_IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const FAMILY_OWNERS: Record<CopyFamily, ReadonlySet<string>> = {
  'repertoire-file': new Set(['public.repertoire_files']),
  'assignment-submission': new Set(['public.assignment_submissions', 'public.assignment_submission_history']),
  'assignment-review': new Set([
    'public.assignment_submissions', 'public.assignment_submission_private_notes',
    'public.assignment_submission_history', 'public.assignment_submission_private_history',
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
  'chat-message-image': /^image:[0-9]+$/u,
  'chat-room-avatar': /^avatar$/u,
};

const FAMILY_MAX_BYTES: Record<CopyFamily, number> = {
  'repertoire-file': 100 * 1024 * 1024,
  'assignment-submission': 50 * 1024 * 1024,
  'assignment-review': 20 * 1024 * 1024,
  'repertoire-comment': 20 * 1024 * 1024,
  'chat-message-image': 12 * 1024 * 1024,
  'chat-room-avatar': 12 * 1024 * 1024,
};

const INVENTORY_KEYS = [
  'item_id', 'choir_id', 'family', 'source_owner', 'source_row_id', 'source_slot',
  'source_version', 'legacy_reference', 'legacy_file_id', 'file_name', 'mime_type',
  'content_length', 'destination_version_id', 'destination_batch_id', 'destination_bucket',
  'destination_object_key', 'inventory_status', 'status_detail',
].sort();

export interface PrivateCopyInventoryRow {
  item_id: string;
  choir_id: string;
  family: CopyFamily;
  source_owner: string;
  source_row_id: string;
  source_slot: string;
  source_version: string;
  legacy_reference: string | null;
  legacy_file_id: string | null;
  file_name: string | null;
  mime_type: string | null;
  content_length: number | null;
  destination_version_id: string;
  destination_batch_id: string | null;
  destination_bucket: string;
  destination_object_key: string | null;
  inventory_status: InventoryStatus;
  status_detail: string;
}

export interface ManifestMetadataPort {
  getSourceMetadata(fileId: string, signal?: AbortSignal): Promise<SourceMetadata>;
}

export interface ManifestPreparationReport {
  reportVersion: 1;
  projectRef: string;
  choirId: string;
  bucket: string;
  inventoryFingerprint: string;
  manifestSha256Hex: string;
  inventoryItemCount: number;
  manifestItemCount: number;
  excludedItemCount: number;
  unresolvedItemCount: number;
  totalBytes: number;
  limits: { maxItems: number; maxTotalBytes: number };
  statusCounts: Record<string, number>;
  excluded: Array<{
    itemId: string;
    family: CopyFamily;
    sourceOwner: string;
    sourceRowId: string;
    sourceSlot: string;
    sourceVersion: string;
    inventoryStatus: InventoryStatus;
    statusDetail: string;
  }>;
  preparedAt: string;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new CopyError('invalid-inventory-row');
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>) {
  const keys = Object.keys(value).sort();
  if (keys.length !== INVENTORY_KEYS.length || keys.some((key, index) => key !== INVENTORY_KEYS[index])) {
    throw new CopyError('invalid-inventory-row');
  }
}

function nullableString(value: unknown, maximum: number, code = 'invalid-inventory-row') {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length < 1 || value.length > maximum) throw new CopyError(code);
  return value;
}

function nullableLength(value: unknown) {
  if (value === null) return null;
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > 100 * 1024 * 1024) {
    throw new CopyError('invalid-inventory-row');
  }
  return Number(value);
}

export function parseInventoryRow(value: unknown): PrivateCopyInventoryRow {
  const row = record(value);
  exactKeys(row);
  if (typeof row.item_id !== 'string' || !UUID.test(row.item_id)
    || typeof row.choir_id !== 'string' || !UUID.test(row.choir_id)
    || typeof row.family !== 'string' || !(COPY_FAMILIES as readonly string[]).includes(row.family)
    || typeof row.source_owner !== 'string'
    || typeof row.source_row_id !== 'string' || !UUID.test(row.source_row_id)
    || typeof row.source_slot !== 'string'
    || typeof row.source_version !== 'string' || !VERSION.test(row.source_version)
    || typeof row.destination_version_id !== 'string' || !UUID.test(row.destination_version_id)
    || typeof row.destination_bucket !== 'string' || !BUCKET.test(row.destination_bucket)
    || typeof row.inventory_status !== 'string'
      || !(INVENTORY_STATUSES as readonly string[]).includes(row.inventory_status)
    || typeof row.status_detail !== 'string' || row.status_detail.length < 1 || row.status_detail.length > 4096) {
    throw new CopyError('invalid-inventory-row');
  }
  const family = row.family as CopyFamily;
  const status = row.inventory_status as InventoryStatus;
  if (!FAMILY_OWNERS[family].has(row.source_owner) || !FAMILY_SLOTS[family].test(row.source_slot)) {
    throw new CopyError('invalid-inventory-owner-slot');
  }
  const batch = nullableString(row.destination_batch_id, 36);
  if ((family.startsWith('chat-') && (!batch || !UUID.test(batch)))
    || (!family.startsWith('chat-') && batch !== null)) throw new CopyError('invalid-inventory-batch');
  const legacyReference = nullableString(row.legacy_reference, 4096);
  const legacyFileId = nullableString(row.legacy_file_id, 200);
  if (legacyFileId !== null && !DRIVE_ID.test(legacyFileId)) throw new CopyError('invalid-inventory-drive-id');
  const fileName = nullableString(row.file_name, 4096);
  const mimeType = nullableString(row.mime_type, 512);
  const contentLength = nullableLength(row.content_length);
  const objectKey = nullableString(row.destination_object_key, 1024);
  if (CANDIDATE_STATUSES.has(status)) {
    if (!legacyFileId || !objectKey) throw new CopyError('invalid-inventory-candidate');
    if (family === 'chat-message-image' && !/^image:[0-4]$/u.test(row.source_slot)) {
      throw new CopyError('invalid-inventory-candidate');
    }
    if (status === 'ready-for-provider-metadata'
      && (fileName === null || mimeType === null || contentLength === null)) {
      throw new CopyError('invalid-inventory-classification');
    }
  }
  if (status === 'activation-shape-unsupported' && objectKey !== null) {
    throw new CopyError('invalid-inventory-classification');
  }
  return {
    item_id: row.item_id,
    choir_id: row.choir_id,
    family,
    source_owner: row.source_owner,
    source_row_id: row.source_row_id,
    source_slot: row.source_slot,
    source_version: row.source_version,
    legacy_reference: legacyReference,
    legacy_file_id: legacyFileId,
    file_name: fileName,
    mime_type: mimeType === null ? null : normalizeMimeType(mimeType),
    content_length: contentLength,
    destination_version_id: row.destination_version_id,
    destination_batch_id: batch,
    destination_bucket: row.destination_bucket,
    destination_object_key: objectKey,
    inventory_status: status,
    status_detail: row.status_detail,
  };
}

function compareRows(left: PrivateCopyInventoryRow, right: PrivateCopyInventoryRow) {
  const a = [left.family, left.source_owner, left.source_row_id, left.source_slot, left.source_version].join('|');
  const b = [right.family, right.source_owner, right.source_row_id, right.source_slot, right.source_version].join('|');
  return a.localeCompare(b, 'en');
}

export function validateInventory(values: unknown[]) {
  if (values.length < 1 || values.length > MAX_INVENTORY_ITEMS) throw new CopyError('invalid-inventory-count');
  const rows = values.map(parseInventoryRow).sort(compareRows);
  const choirs = new Set(rows.map((row) => row.choir_id));
  const buckets = new Set(rows.map((row) => row.destination_bucket));
  if (choirs.size !== 1) throw new CopyError('mixed-inventory-choirs');
  if (buckets.size !== 1) throw new CopyError('mixed-inventory-buckets');
  const items = new Set<string>();
  const sources = new Set<string>();
  const candidateDestinations = new Set<string>();
  for (const row of rows) {
    const source = [row.source_owner, row.source_row_id, row.source_slot, row.source_version].join('|');
    if (items.has(row.item_id)) throw new CopyError('duplicate-inventory-item');
    if (sources.has(source)) throw new CopyError('duplicate-inventory-source');
    items.add(row.item_id);
    sources.add(source);
    if (CANDIDATE_STATUSES.has(row.inventory_status)) {
      const destination = `${row.destination_bucket}/${row.destination_object_key}`;
      if (candidateDestinations.has(destination)) throw new CopyError('duplicate-inventory-destination');
      candidateDestinations.add(destination);
    }
  }
  const normalized = JSON.stringify(rows);
  const statusCounts: Record<string, number> = {};
  for (const status of INVENTORY_STATUSES) {
    const count = rows.filter((row) => row.inventory_status === status).length;
    if (count) statusCounts[status] = count;
  }
  return {
    rows,
    choirId: rows[0].choir_id,
    bucket: rows[0].destination_bucket,
    inventoryFingerprint: createHash('sha256').update(normalized).digest('hex'),
    statusCounts,
    candidates: rows.filter((row) => CANDIDATE_STATUSES.has(row.inventory_status)),
    excluded: rows.filter((row) => !CANDIDATE_STATUSES.has(row.inventory_status)),
  };
}

function assertProviderMetadata(row: PrivateCopyInventoryRow, metadata: SourceMetadata) {
  if (metadata.fileId !== row.legacy_file_id) throw new CopyError('source-id-mismatch');
  if (metadata.trashed) throw new CopyError('source-trashed');
  if (metadata.googleNative) throw new CopyError('source-google-native');
  const mimeType = normalizeMimeType(metadata.mimeType);
  if (!Number.isSafeInteger(metadata.contentLength) || metadata.contentLength < 1
    || metadata.contentLength > FAMILY_MAX_BYTES[row.family]) throw new CopyError('source-size-invalid');
  if (!mimeType || mimeType.length > 127 || !MIME.test(mimeType)) throw new CopyError('source-mime-invalid');
  if (typeof metadata.name !== 'string' || metadata.name !== metadata.name.trim()
    || metadata.name.length < 1 || metadata.name.length > 255
    || /[\u0000-\u001f\u007f/\\]/u.test(metadata.name)) throw new CopyError('source-file-name-invalid');
  if (isActiveDriveFileContent({ fileName: metadata.name, mimeType })) throw new CopyError('source-active-content');
  if ((row.family === 'assignment-review' || row.family === 'repertoire-comment') && !AUDIO.has(mimeType)) {
    throw new CopyError('source-family-mime-invalid');
  }
  if ((row.family === 'chat-message-image' || row.family === 'chat-room-avatar') && !CHAT_IMAGE.has(mimeType)) {
    throw new CopyError('source-family-mime-invalid');
  }
  if (row.file_name !== null && row.file_name !== metadata.name) throw new CopyError('source-file-name-drift');
  if (row.mime_type !== null && row.mime_type !== mimeType) throw new CopyError('source-mime-drift');
  if (row.content_length !== null && row.content_length !== metadata.contentLength) {
    throw new CopyError('source-size-drift');
  }
  return { fileName: metadata.name, mimeType, contentLength: metadata.contentLength };
}

export async function prepareManifest(input: {
  values: unknown[];
  projectRef: string;
  maxItems: number;
  maxTotalBytes: number;
  metadata: ManifestMetadataPort;
  now?: () => Date;
  signal?: AbortSignal;
}) {
  if (!/^[a-z]{20}$/u.test(input.projectRef)) throw new CopyError('invalid-project-ref');
  if (!Number.isSafeInteger(input.maxItems) || input.maxItems < 1
    || !Number.isSafeInteger(input.maxTotalBytes) || input.maxTotalBytes < 1) {
    throw new CopyError('invalid-preparation-limits');
  }
  const inventory = validateInventory(input.values);
  if (!inventory.candidates.length) throw new CopyError('no-copy-candidates');
  if (inventory.candidates.length > input.maxItems) throw new CopyError('manifest-item-limit-exceeded');
  const entries: CopyManifestEntry[] = [];
  let totalBytes = 0;
  for (const row of inventory.candidates) {
    const provider = assertProviderMetadata(
      row,
      await input.metadata.getSourceMetadata(row.legacy_file_id!, input.signal),
    );
    totalBytes += provider.contentLength;
    if (!Number.isSafeInteger(totalBytes) || totalBytes > input.maxTotalBytes) {
      throw new CopyError('manifest-byte-limit-exceeded');
    }
    entries.push(parseManifestEntry({
      manifestVersion: 1,
      itemId: row.item_id,
      projectRef: input.projectRef,
      choirId: row.choir_id,
      family: row.family,
      source: {
        owner: row.source_owner,
        rowId: row.source_row_id,
        slot: row.source_slot,
        version: row.source_version,
        legacyFileId: row.legacy_file_id,
      },
      destination: {
        provider: 'r2', bucket: row.destination_bucket, objectKey: row.destination_object_key,
      },
      expected: provider,
    }));
  }
  const summary = validateManifest(entries);
  if (summary.itemCount !== entries.length || summary.totalBytes !== totalBytes
    || summary.projectRef !== input.projectRef) throw new CopyError('manifest-summary-mismatch');
  const manifestText = `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`;
  const excluded = inventory.excluded.map((row) => ({
    itemId: row.item_id,
    family: row.family,
    sourceOwner: row.source_owner,
    sourceRowId: row.source_row_id,
    sourceSlot: row.source_slot,
    sourceVersion: row.source_version,
    inventoryStatus: row.inventory_status,
    statusDetail: row.status_detail,
  }));
  const report: ManifestPreparationReport = {
    reportVersion: 1,
    projectRef: input.projectRef,
    choirId: inventory.choirId,
    bucket: inventory.bucket,
    inventoryFingerprint: inventory.inventoryFingerprint,
    manifestSha256Hex: createHash('sha256').update(manifestText).digest('hex'),
    inventoryItemCount: inventory.rows.length,
    manifestItemCount: entries.length,
    excludedItemCount: excluded.length,
    unresolvedItemCount: inventory.excluded.filter(
      (row) => !NON_BLOCKING_EXCLUDED.has(row.inventory_status),
    ).length,
    totalBytes,
    limits: { maxItems: input.maxItems, maxTotalBytes: input.maxTotalBytes },
    statusCounts: inventory.statusCounts,
    excluded,
    preparedAt: (input.now?.() ?? new Date()).toISOString(),
  };
  return { entries, manifestText, report };
}
