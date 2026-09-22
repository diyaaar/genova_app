// @vitest-environment node
import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createRepertoireUploadHandler, MAX_UPLOAD_BYTES, type UploadDependencies, type UploadMetadata, type UploadReservation } from './handler';
import { UploadError } from './stream';

const choirId = '20000000-0000-4000-8000-000000000054';
const fileId = '30000000-0000-4000-8000-000000000054';
const lease = '40000000-0000-4000-8000-000000000054';
const retryKey = '60000000-0000-4000-8000-000000000054';
const pdf = new TextEncoder().encode('%PDF-1.4\nsynthetic acceptance\n%%EOF');
const meta: UploadMetadata = {
  songId: '50000000-0000-4000-8000-000000000054', fileName: 'score.pdf', fileType: 'sheet',
  mimeType: 'application/pdf', size: pdf.length,
  partitionLabel: null,
};
function request(metadata = meta, bytes: Uint8Array = pdf) {
  return new Request('http://127.0.0.1/upload', {
    method: 'POST', headers: { authorization: 'Bearer synthetic', 'idempotency-key': retryKey,
      'x-upload-metadata': encodeURIComponent(JSON.stringify(metadata)), 'content-type': metadata.mimeType },
    body: Buffer.from(bytes),
  });
}
function fixture() {
  let state: UploadReservation['state'] = 'uploading';
  let object: Uint8Array | undefined;
  let reserved = false;
  const reservation: UploadReservation = { state, fileId, choirId, lease, bucket: 'genova-private',
    objectKey: `choirs/${choirId}/repertoire/${fileId}/content` };
  const file = { id: fileId, song_id: meta.songId, file_name: meta.fileName };
  const transact = vi.fn<UploadDependencies['transact']>(async ({ action }) => {
    if (action === 'reserve' && reserved && state === 'uploading') return { state: 'pending' };
    reserved = true;
    if (action === 'commit') state = 'committed';
    if (state === 'committed') return { state, file };
    if (action === 'cleanup') state = 'cleanup';
    if (action === 'failed') state = 'failed';
    if (action === 'reserve' && state === 'failed') state = 'uploading';
    return { ...reservation, state };
  });
  const provider = vi.fn<UploadDependencies['object']>(async ({ method, body, metadata }) => {
    if (method === 'PUT') { object = new Uint8Array(await new Response(body).arrayBuffer()); return new Response(null); }
    if (method === 'DELETE') { object = undefined; return new Response(null, { status: 204 }); }
    return new Response(object ? Buffer.from(object) : null, {
      status: object ? 200 : 404, headers: { 'content-type': metadata.mimeType, 'content-length': String(object?.length ?? 0) },
    });
  });
  const deps: UploadDependencies = {
    enabled: true, bucket: 'genova-private',
    authorize: vi.fn(async () => ({ userId: 'user', sessionId: null, choirId })), transact, object: provider,
  };
  return { deps, transact, provider, reservation, handler: createRepertoireUploadHandler(deps), getObject: () => object };
}

describe('054 private upload lifecycle', () => {
  it('streams exact PDF, verifies readback before commit and replays without another PUT', async () => {
    const f = fixture();
    const response = await f.handler(request());
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ file: { id: fileId, song_id: meta.songId, file_name: meta.fileName }, replayed: false });
    expect(f.provider.mock.calls.map(([v]) => v.method)).toEqual(['PUT','GET']);
    expect(f.transact.mock.calls.map(([v]) => v.action)).toEqual(['reserve','commit']);
    expect(f.transact.mock.calls[1]?.[0].sha256).toBe(createHash('sha256').update(pdf).digest('hex'));
    expect(f.getObject()).toEqual(pdf);
    expect((await f.handler(request())).status).toBe(200);
    expect(f.provider).toHaveBeenCalledTimes(2);
  });
  it.each([
    [{ ...meta, mimeType: 'text/html' }, 415], [{ ...meta, fileName: 'bad.svg' }, 415],
    [{ ...meta, fileName: '../score.pdf' }, 400], [{ ...meta, size: MAX_UPLOAD_BYTES + 1 }, 413],
    [{ ...meta, partitionLabel: 'x'.repeat(101) }, 400], [{ ...meta, choirId }, 400],
  ])('refuses unsafe metadata before authorization/provider access', async (metadata, status) => {
    const f = fixture();
    expect((await f.handler(request(metadata as UploadMetadata))).status).toBe(status);
    expect(f.provider).not.toHaveBeenCalled();
    expect(f.transact).not.toHaveBeenCalled();
  });
  it.each(['forbidden','unauthorized'])('refuses %s before reserving bytes', async (code) => {
    const f = fixture();
    f.deps.authorize = async () => { throw new UploadError(code, code === 'forbidden' ? 403 : 401); };
    expect((await f.handler(request())).status).toBe(code === 'forbidden' ? 403 : 401);
    expect(f.transact).not.toHaveBeenCalled();
  });
  it.each([
    { ...meta, size: pdf.length - 1 }, { ...meta, size: pdf.length + 1 },
  ])('never activates truncated, oversized or incorrect bytes', async (metadata) => {
    const f = fixture();
    expect((await f.handler(request(metadata))).ok).toBe(false);
    expect(f.transact.mock.calls.map(([v]) => v.action)).toEqual(['reserve','cleanup']);
    expect(f.getObject()).toBeUndefined();
  });
  it('rejects an HTML payload disguised as PDF', async () => {
    const f = fixture();
    const bytes = new TextEncoder().encode('<html>bad</html>');
    const metadata = { ...meta, size: bytes.length };
    expect((await f.handler(request(metadata, bytes))).status).toBe(503);
    expect(f.transact.mock.calls.some(([v]) => v.action === 'commit')).toBe(false);
  });
  it.each(['redirect','mime','length','hash'])('cleans only the owned uncommitted key on provider %s failure', async (failure) => {
    const f = fixture();
    const original = f.deps.object;
    f.deps.object = async (input) => {
      if (input.method !== 'GET') return original(input);
      if (failure === 'redirect') return new Response(null, { status: 302, headers: { Location: 'https://wrong.invalid' } });
      const bytes = failure === 'hash' ? new Uint8Array(pdf.map((v, i) => i === 15 ? v ^ 1 : v)) : pdf;
      return new Response(Buffer.from(bytes), { headers: {
        'content-type': failure === 'mime' ? 'text/html' : meta.mimeType,
        'content-length': String(failure === 'length' ? pdf.length + 1 : pdf.length),
      } });
    };
    expect((await f.handler(request())).ok).toBe(false);
    expect(f.transact.mock.calls.some(([v]) => v.action === 'commit')).toBe(false);
    expect(f.provider.mock.calls.at(-1)?.[0]).toMatchObject({ method: 'DELETE', reservation: f.reservation });
    expect(f.getObject()).toBeUndefined();
  });
  it('does not delete when commit succeeded but its response was lost', async () => {
    const f = fixture();
    const original = f.deps.transact;
    f.deps.transact = async (input) => {
      const result = await original(input);
      if (input.action === 'commit') throw new Error('Response lost');
      return result;
    };
    expect((await f.handler(request())).status).toBe(200);
    expect(f.provider.mock.calls.map(([v]) => v.method)).toEqual(['PUT','GET']);
    expect(f.getObject()).toEqual(pdf);
  });
  it('preserves an uncertain PUT for reconciliation so a late provider write cannot race a retry', async () => {
    const f = fixture();
    const original = f.deps.object;
    f.deps.object = async (input) => {
      const result = await original(input);
      if (input.method === 'PUT') throw new Error('PUT response lost');
      return result;
    };
    const response = await f.handler(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'upload-reconciliation-required', retryKey });
    expect(f.provider.mock.calls.map(([v]) => v.method)).toEqual(['PUT']);
    expect(f.getObject()).toEqual(pdf);
    expect(f.transact.mock.calls.map(([v]) => v.action)).toEqual(['reserve','cleanup']);
  });
  it('keeps a non-success PUT in reconciliation without issuing a racing delete', async () => {
    const f = fixture();
    f.deps.object = async ({ method }) => new Response(null, { status: method === 'PUT' ? 500 : 204 });
    const response = await f.handler(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'upload-reconciliation-required', retryKey });
    expect(f.transact.mock.calls.map(([v]) => v.action)).toEqual(['reserve','cleanup']);
  });
  it('cleans an explicitly failed commit', async () => {
    const f = fixture();
    const original = f.deps.transact;
    f.deps.transact = async (input) => {
      if (input.action === 'commit') throw new UploadError('forbidden', 403);
      return original(input);
    };
    expect((await f.handler(request())).status).toBe(403);
    expect(f.getObject()).toBeUndefined();
  });
  it.each(['database','delete'])('leaves explicit reconciliation on uncertain %s cleanup', async (failure) => {
    const f = fixture();
    const original = f.deps.transact;
    f.deps.transact = async (input) => {
      if (input.action === 'commit' || (input.action === 'cleanup' && failure === 'database')) throw new Error('Unreachable');
      return original(input);
    };
    const provider = f.deps.object;
    f.deps.object = async (input) => input.method === 'DELETE' ? new Response(null, { status: 500 }) : provider(input);
    const response = await f.handler(request());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'upload-reconciliation-required', retryKey });
    expect(f.getObject()).toEqual(pdf);
    expect(f.transact.mock.calls.some(([v]) => v.action === 'failed')).toBe(false);
  });
  it('rejects in-progress duplicate and forged provider target without any provider request', async () => {
    for (const result of [{ state: 'pending' }, { ...fixture().reservation, bucket: 'wrong-bucket' }] as UploadReservation[]) {
      const f = fixture();
      f.deps.transact = async () => result;
      expect((await f.handler(request())).ok).toBe(false);
      expect(f.provider).not.toHaveBeenCalled();
    }
  });
  it('requires explicitly enabled writes and supports CORS without auth', async () => {
    const f = fixture(); f.deps.enabled = false;
    expect((await f.handler(request())).status).toBe(503);
    expect((await f.handler(new Request('http://local', { method: 'OPTIONS' }))).status).toBe(204);
  });
});
