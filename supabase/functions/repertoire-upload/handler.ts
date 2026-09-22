import { isActiveDriveFileContent } from '../../../lib/server/drive-file-content.ts';
import { UploadError, verifiedStream } from './stream.ts';

export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AUDIO = new Set(['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/aac','audio/ogg','audio/webm','audio/flac']);
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-upload-metadata, idempotency-key',
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
};

export interface UploadMetadata {
  songId: string; fileName: string; fileType: 'sheet' | 'audio'; mimeType: string;
  size: number; partitionLabel: string | null;
}
export interface UploadActor { userId: string; sessionId: string | null; choirId: string }
export interface UploadReservation {
  state: 'uploading' | 'pending' | 'committed' | 'cleanup' | 'failed';
  fileId?: string; choirId?: string; bucket?: string; objectKey?: string; lease?: string;
  file?: Record<string, unknown>;
}
export interface UploadDependencies {
  enabled: boolean;
  bucket: string;
  authorize(token: string): Promise<UploadActor>;
  transact(input: {
    action: 'reserve' | 'commit' | 'cleanup' | 'failed'; actor: UploadActor;
    retryKey: string; metadata: UploadMetadata; lease?: string; sha256?: string;
  }): Promise<UploadReservation>;
  object(input: {
    reservation: UploadReservation; method: 'PUT' | 'GET' | 'DELETE';
    metadata: UploadMetadata; body?: ReadableStream<Uint8Array>; signal: AbortSignal;
  }): Promise<Response>;
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: CORS });
}

export function parseUpload(request: Request): { retryKey: string; metadata: UploadMetadata } {
  const retryKey = request.headers.get('idempotency-key') ?? '';
  const encoded = request.headers.get('x-upload-metadata') ?? '';
  if (!UUID.test(retryKey) || encoded.length > 4096) throw new UploadError('invalid-metadata');
  let m: UploadMetadata;
  try { m = JSON.parse(decodeURIComponent(encoded)); } catch { throw new UploadError('invalid-metadata'); }
  if (!m || typeof m !== 'object' || Array.isArray(m) || Object.keys(m).length !== 6 ||
    typeof m.songId !== 'string' || !UUID.test(m.songId) ||
    typeof m.fileName !== 'string' || !m.fileName.trim() || m.fileName.length > 255 || /[\u0000-\u001f\u007f/\\]/.test(m.fileName) ||
    !Number.isSafeInteger(m.size) || m.size < 1 ||
    (m.partitionLabel !== null && (typeof m.partitionLabel !== 'string' || m.partitionLabel.length > 100)) ||
    typeof m.mimeType !== 'string' || request.headers.get('content-type') !== m.mimeType
  ) throw new UploadError('invalid-metadata');
  if (m.size > MAX_UPLOAD_BYTES) throw new UploadError('size-exceeded', 413);
  if (isActiveDriveFileContent({ fileName: m.fileName, mimeType: m.mimeType }) ||
    !((m.fileType === 'sheet' && m.mimeType === 'application/pdf') || (m.fileType === 'audio' && AUDIO.has(m.mimeType)))
  ) throw new UploadError('unsupported-media', 415);
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) !== m.size)) throw new UploadError('size-mismatch');
  if (!request.body) throw new UploadError('empty-body');
  return { retryKey, metadata: m };
}

function assertOwned(r: UploadReservation, actor: UploadActor, bucket: string) {
  if (!r.fileId || !UUID.test(r.fileId) || !r.lease || !UUID.test(r.lease) ||
    r.choirId !== actor.choirId || r.bucket !== bucket ||
    r.objectKey !== `choirs/${actor.choirId}/repertoire/${r.fileId}/content`
  ) throw new UploadError('invalid-reservation', 502);
}

/** Auth -> exclusive reservation -> streamed PUT/readback -> atomic activation.
 * Cleanup first transitions the DB row under lock, so an uncertain successful commit is never deleted.
 */
export function createRepertoireUploadHandler(deps: UploadDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST') return json({ error: 'method-not-allowed' }, 405);
    if (!deps.enabled) return json({ error: 'upload-unavailable' }, 503);
    let cleanup: (() => Promise<Response | null>) | undefined;
    let tracked: ReturnType<typeof verifiedStream> | undefined;
    let putConfirmed = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);
    const abort = () => controller.abort();
    request.signal.addEventListener('abort', abort, { once: true });
    try {
      const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
      if (!token) throw new UploadError('unauthorized', 401);
      const { metadata, retryKey } = parseUpload(request);
      const actor = await deps.authorize(token);
      const transact = (action: 'reserve' | 'commit' | 'cleanup' | 'failed', lease?: string, sha256?: string) =>
        deps.transact({ action, actor, retryKey, metadata, lease, sha256 });
      const reservation = await transact('reserve');
      if (reservation.state === 'committed') return json({ file: reservation.file, replayed: true });
      if (reservation.state !== 'uploading') throw new UploadError('upload-pending', 409);
      assertOwned(reservation, actor, deps.bucket);
      cleanup = async () => {
        try {
          const state = await transact('cleanup', reservation.lease);
          if (state.state === 'committed') return json({ file: state.file, replayed: true });
          if (state.state !== 'cleanup') throw new Error('Cleanup not acquired');
          // A lost PUT response may still complete at the provider after an immediate DELETE.
          // Keep its reservation for reconciliation instead of claiming an orphan-free retry.
          if (!putConfirmed) throw new Error('Provider PUT outcome unknown');
          const removed = await deps.object({ reservation, method: 'DELETE', metadata, signal: AbortSignal.timeout(15_000) });
          await removed.body?.cancel();
          if (!removed.ok && removed.status !== 404) throw new Error('Cleanup failed');
          await transact('failed', reservation.lease);
          return null;
        } catch {
          return json({ error: 'upload-reconciliation-required', retryKey }, 503);
        }
      };
      tracked = verifiedStream(request.body!, metadata);
      const uploaded = await deps.object({ reservation, method: 'PUT', metadata, body: tracked.stream, signal: controller.signal });
      await uploaded.body?.cancel();
      if (!uploaded.ok) throw new UploadError('provider-upload-failed', 502);
      putConfirmed = true;
      const uploadSha256 = tracked.assertFinished();
      const readback = await deps.object({ reservation, method: 'GET', metadata, signal: controller.signal });
      if (readback.status !== 200 || readback.headers.get('content-type') !== metadata.mimeType ||
        readback.headers.get('content-length') !== String(metadata.size) || !readback.body) {
        await readback.body?.cancel();
        throw new UploadError('provider-verification-failed', 502);
      }
      const verified = verifiedStream(readback.body, { ...metadata, sha256: uploadSha256 });
      const reader = verified.stream.getReader();
      while (!(await reader.read()).done) { /* Hash and discard each bounded chunk. */ }
      verified.assertFinished();
      const committed = await transact('commit', reservation.lease, uploadSha256);
      if (committed.state !== 'committed' || !committed.file) throw new UploadError('commit-failed', 502);
      return json({ file: committed.file, replayed: false }, 201);
    } catch (error) {
      controller.abort();
      await tracked?.cancel();
      const recovered = await cleanup?.();
      if (recovered) return recovered;
      return error instanceof UploadError
        ? json({ error: error.code }, error.status)
        : json({ error: 'upload-failed' }, 502);
    } finally {
      clearTimeout(timer);
      request.signal.removeEventListener('abort', abort);
      if (!request.bodyUsed) await request.body?.cancel().catch(() => undefined);
    }
  };
}
