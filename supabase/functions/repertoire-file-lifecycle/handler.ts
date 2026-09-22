import type { UploadActor } from '../repertoire-upload/handler.ts';
import { UploadError } from '../repertoire-upload/stream.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, idempotency-key',
  'Cache-Control': 'private, no-store',
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
};

export interface LifecycleTarget { fileId: string; bucket: string; objectKey: string }
export interface LifecycleResult {
  state: 'ready' | 'cleanup' | 'cleaned';
  targetType?: 'file' | 'song';
  targetId?: string;
  targets?: LifecycleTarget[];
}
export interface LifecycleDependencies {
  enabled: boolean;
  bucket: string;
  authorize(token: string): Promise<UploadActor>;
  transact(input: {
    action: 'check-replace' | 'reserve-delete' | 'cleaned'; actor: UploadActor;
    retryKey: string; targetType: 'file' | 'song'; targetId: string; mode: 'delete' | 'replacement';
  }): Promise<LifecycleResult>;
  remove(target: LifecycleTarget, signal: AbortSignal): Promise<Response>;
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: CORS });
}

async function parseRequest(request: Request) {
  const length = request.headers.get('content-length');
  if (length && (!/^\d+$/.test(length) || Number(length) > 1024)) throw new UploadError('invalid-request');
  let body: unknown;
  try { body = await request.json(); } catch { throw new UploadError('invalid-request'); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new UploadError('invalid-request');
  const value = body as Record<string, unknown>;
  if (Object.keys(value).length !== 3 || (value.targetType !== 'file' && value.targetType !== 'song') ||
    typeof value.targetId !== 'string' || !UUID.test(value.targetId) ||
    (value.mode !== 'delete' && value.mode !== 'replacement') ||
    (value.targetType === 'song' && value.mode !== 'delete')) throw new UploadError('invalid-request');
  return value as { targetType: 'file' | 'song'; targetId: string; mode: 'delete' | 'replacement' };
}

function assertTargets(result: LifecycleResult, actor: UploadActor, bucket: string) {
  if (result.state !== 'cleanup' || result.targetType === undefined || !UUID.test(result.targetId ?? '') ||
    !Array.isArray(result.targets) || result.targets.length > 100) throw new UploadError('invalid-lifecycle-result', 502);
  for (const target of result.targets) {
    if (!UUID.test(target.fileId) || target.bucket !== bucket ||
      !target.objectKey.startsWith(`choirs/${actor.choirId}/repertoire/${target.fileId}/`) ||
      /(^|\/)\.{1,2}(\/|$)/.test(target.objectKey) || target.objectKey.includes('//')) {
      throw new UploadError('invalid-lifecycle-result', 502);
    }
  }
}

/** Removes product references transactionally, then reconciles only DB-owned exact private keys. */
export function createRepertoireLifecycleHandler(deps: LifecycleDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'POST' && request.method !== 'DELETE') return json({ error: 'method-not-allowed' }, 405);
    if (!deps.enabled) return json({ error: 'lifecycle-unavailable' }, 503);
    let productDeleted = false;
    let input: Awaited<ReturnType<typeof parseRequest>> | undefined;
    let actor: UploadActor | undefined;
    let retryKey = '';
    try {
      retryKey = request.headers.get('idempotency-key') ?? '';
      if (!UUID.test(retryKey)) throw new UploadError('invalid-request');
      input = await parseRequest(request);
      if (request.method === 'POST' && input.mode !== 'replacement') throw new UploadError('invalid-request');
      const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
      if (!token) throw new UploadError('unauthorized', 401);
      actor = await deps.authorize(token);
      const transact = (action: 'check-replace' | 'reserve-delete' | 'cleaned') => deps.transact({
        action, actor: actor!, retryKey, ...input!,
      });
      if (request.method === 'POST') {
        const checked = await transact('check-replace');
        if (checked.state !== 'ready') throw new UploadError('invalid-lifecycle-result', 502);
        return json({ ready: true });
      }
      const reservation = await transact('reserve-delete');
      if (reservation.state === 'cleaned') return json({ deleted: true, cleanupPending: false, replayed: true });
      productDeleted = true;
      assertTargets(reservation, actor, deps.bucket);
      for (const target of reservation.targets!) {
        const response = await deps.remove(target, AbortSignal.timeout(15_000));
        await response.body?.cancel();
        if (!response.ok && response.status !== 404) {
          return json({ deleted: true, cleanupPending: true }, 202);
        }
      }
      const cleaned = await transact('cleaned');
      if (cleaned.state !== 'cleaned') throw new UploadError('invalid-lifecycle-result', 502);
      return json({ deleted: true, cleanupPending: false, replayed: false });
    } catch (error) {
      if (productDeleted) return json({ deleted: true, cleanupPending: true }, 202);
      return error instanceof UploadError
        ? json({ error: error.code }, error.status)
        : json({ error: 'lifecycle-failed' }, 502);
    }
  };
}
