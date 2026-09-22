import { isActiveDriveFileContent } from '../../../lib/server/drive-file-content.ts';
import { UploadError, verifiedStream } from '../repertoire-upload/stream.ts';

export const MAX_ASSIGNMENT_UPLOAD_BYTES = 50 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-upload-metadata, idempotency-key',
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
};

export interface AssignmentUploadMetadata {
  assignmentId: string; fileName: string; mimeType: string; size: number; note: string | null;
}
export interface AssignmentUploadActor { userId: string; sessionId: string | null; choirId: string }
export interface AssignmentUploadReservation {
  state: 'uploading' | 'pending' | 'committed' | 'cleanup' | 'failed';
  submissionId?: string; fileVersionId?: string; choirId?: string; bucket?: string;
  objectKey?: string; lease?: string; submission?: Record<string, unknown>;
}
export interface AssignmentUploadDependencies {
  enabled: boolean;
  bucket: string;
  authorize(token: string): Promise<AssignmentUploadActor>;
  transact(input: {
    action: 'reserve' | 'commit' | 'cleanup' | 'failed'; actor: AssignmentUploadActor;
    retryKey: string; metadata: AssignmentUploadMetadata; lease?: string; sha256?: string;
  }): Promise<AssignmentUploadReservation>;
  object(input: {
    reservation: AssignmentUploadReservation; method: 'PUT' | 'GET' | 'DELETE';
    metadata: AssignmentUploadMetadata; body?: ReadableStream<Uint8Array>; signal: AbortSignal;
  }): Promise<Response>;
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: CORS });
}

export function parseAssignmentUpload(request: Request): {
  retryKey: string; metadata: AssignmentUploadMetadata;
} {
  const retryKey = request.headers.get('idempotency-key') ?? '';
  const encoded = request.headers.get('x-upload-metadata') ?? '';
  if (!UUID.test(retryKey) || encoded.length > 4096) throw new UploadError('invalid-metadata');
  let metadata: AssignmentUploadMetadata;
  try { metadata = JSON.parse(decodeURIComponent(encoded)); }
  catch { throw new UploadError('invalid-metadata'); }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata) ||
    Object.keys(metadata).length !== 5 || !UUID.test(metadata.assignmentId) ||
    typeof metadata.fileName !== 'string' || !metadata.fileName.trim() || metadata.fileName.length > 255 ||
    /[\u0000-\u001f\u007f/\\]/.test(metadata.fileName) ||
    typeof metadata.mimeType !== 'string' || !metadata.mimeType || metadata.mimeType.length > 127 ||
    request.headers.get('content-type') !== metadata.mimeType ||
    !Number.isSafeInteger(metadata.size) || metadata.size < 1 ||
    (metadata.note !== null && (typeof metadata.note !== 'string' || metadata.note.length > 1200))
  ) throw new UploadError('invalid-metadata');
  if (metadata.size > MAX_ASSIGNMENT_UPLOAD_BYTES) throw new UploadError('size-exceeded', 413);
  if (isActiveDriveFileContent({ fileName: metadata.fileName, mimeType: metadata.mimeType })) {
    throw new UploadError('unsupported-media', 415);
  }
  const length = request.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || Number(length) !== metadata.size)) {
    throw new UploadError('size-mismatch');
  }
  if (!request.body) throw new UploadError('empty-body');
  return { retryKey, metadata };
}

function assertOwned(
  reservation: AssignmentUploadReservation,
  actor: AssignmentUploadActor,
  metadata: AssignmentUploadMetadata,
  bucket: string,
) {
  if (!reservation.submissionId || !UUID.test(reservation.submissionId) ||
    !reservation.fileVersionId || !UUID.test(reservation.fileVersionId) ||
    !reservation.lease || !UUID.test(reservation.lease) || reservation.choirId !== actor.choirId ||
    reservation.bucket !== bucket || reservation.objectKey !==
      `choirs/${actor.choirId}/assignments/${metadata.assignmentId}/submissions/${reservation.fileVersionId}/content`
  ) throw new UploadError('invalid-reservation', 502);
}

/** Auth -> exclusive reservation -> constant-memory PUT/readback -> atomic version/current commit. */
export function createAssignmentUploadHandler(deps: AssignmentUploadDependencies) {
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
      const { metadata, retryKey } = parseAssignmentUpload(request);
      const actor = await deps.authorize(token);
      const transact = (action: 'reserve' | 'commit' | 'cleanup' | 'failed', lease?: string, sha256?: string) =>
        deps.transact({ action, actor, retryKey, metadata, lease, sha256 });
      const reservation = await transact('reserve');
      if (reservation.state === 'committed') {
        return json({ submission: reservation.submission, fileVersionId: reservation.fileVersionId, replayed: true });
      }
      if (reservation.state !== 'uploading') throw new UploadError('upload-pending', 409);
      assertOwned(reservation, actor, metadata, deps.bucket);
      cleanup = async () => {
        try {
          const state = await transact('cleanup', reservation.lease);
          if (state.state === 'committed') {
            return json({ submission: state.submission, fileVersionId: state.fileVersionId, replayed: true });
          }
          if (state.state !== 'cleanup' || !putConfirmed) throw new Error('Cleanup not safe');
          const removed = await deps.object({
            reservation, method: 'DELETE', metadata, signal: AbortSignal.timeout(15_000),
          });
          await removed.body?.cancel();
          if (!removed.ok && removed.status !== 404) throw new Error('Cleanup failed');
          await transact('failed', reservation.lease);
          return null;
        } catch {
          return json({ error: 'upload-reconciliation-required', retryKey }, 503);
        }
      };
      tracked = verifiedStream(request.body!, { ...metadata, validateSignature: false });
      const uploaded = await deps.object({
        reservation, method: 'PUT', metadata, body: tracked.stream, signal: controller.signal,
      });
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
      const verified = verifiedStream(readback.body, {
        ...metadata, sha256: uploadSha256, validateSignature: false,
      });
      const reader = verified.stream.getReader();
      while (!(await reader.read()).done) { /* Hash and discard bounded chunks. */ }
      verified.assertFinished();
      const committed = await transact('commit', reservation.lease, uploadSha256);
      if (committed.state !== 'committed' || !committed.submission || !committed.fileVersionId) {
        throw new UploadError('commit-failed', 502);
      }
      return json({
        submission: committed.submission, fileVersionId: committed.fileVersionId, replayed: false,
      }, 201);
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
