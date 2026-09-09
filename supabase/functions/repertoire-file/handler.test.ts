import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRepertoireFileHandler,
  makeContentDisposition,
  parseRangeHeader,
  type RepertoireFileHandlerDependencies,
  type RepertoireFileRecord,
} from './handler';

const fileId = '11111111-1111-4111-8111-111111111111';
const otherFileId = '33333333-3333-4333-8333-333333333333';
const choirId = '22222222-2222-4222-8222-222222222222';
const endpoint = 'https://project.supabase.co/functions/v1/repertoire-file';

const file: RepertoireFileRecord = {
  id: fileId,
  choir_id: choirId,
  drive_file_id: 'drive_file-1',
  drive_download_link: null,
  file_name: 'partisyon.pdf',
  mime_type: 'application/pdf',
};

function makeDependencies(overrides: Partial<RepertoireFileHandlerDependencies> = {}) {
  const dependencies: RepertoireFileHandlerDependencies = {
    authorize: vi.fn(async () => ({ choirId, file })),
    loadTicketFile: vi.fn(async () => file),
    createTicket: vi.fn(async () => ({ token: 'signed-ticket', expiresAt: 10_000 })),
    verifyTicket: vi.fn(async () => ({ version: 1, fileId, choirId, expiresAt: 10_000 })),
    fetchDrive: vi.fn(async () => new Response(Uint8Array.from([0, 1, 2, 3, 4]), {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    })),
    fetchStorage: vi.fn(async () => new Response(Uint8Array.from([5, 6, 7]), {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    })),
    ...overrides,
  };
  return { dependencies, handler: createRepertoireFileHandler(dependencies) };
}

function post(body: unknown, authorization = 'Bearer session-token') {
  return new Request(endpoint, {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function read(method: 'GET' | 'HEAD' = 'GET', id = fileId, ticket = 'signed-ticket', range?: string) {
  const url = `${endpoint}?fileId=${encodeURIComponent(id)}&ticket=${encodeURIComponent(ticket)}`;
  return new Request(url, { method, headers: range ? { Range: range } : undefined });
}

describe('repertoire-file handler', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates method, bearer auth, bounded JSON and repository UUID before authorization', async () => {
    const { handler, dependencies } = makeDependencies();
    expect((await handler(new Request(endpoint, { method: 'PUT' }))).status).toBe(405);
    expect((await handler(post({ fileId }, 'Basic nope'))).status).toBe(401);
    expect((await handler(post('{'))).status).toBe(400);
    expect((await handler(post({ fileId, driveFileId: 'untrusted' }))).status).toBe(400);
    expect((await handler(post({ fileId: 'drive_file-1' }))).status).toBe(400);
    expect((await handler(post({ padding: 'x'.repeat(1_100) }))).status).toBe(413);
    expect(dependencies.authorize).not.toHaveBeenCalled();
  });

  it('issues a ticket only for the exact RLS-authorized file and active choir', async () => {
    const { handler, dependencies } = makeDependencies();
    const response = await handler(post({ fileId }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: `?fileId=${fileId}&ticket=signed-ticket`,
      expiresAt: 10_000,
    });
    expect(dependencies.authorize).toHaveBeenCalledWith({
      authorization: 'Bearer session-token',
      accessToken: 'session-token',
      fileId,
    });
    expect(dependencies.createTicket).toHaveBeenCalledWith({ fileId, choirId });
  });

  it('uses one generic refusal for absent, unauthorized or mismatched authorization rows', async () => {
    for (const authorized of [
      null,
      { choirId, file: { ...file, id: otherFileId } },
      { choirId, file: { ...file, choir_id: '44444444-4444-4444-8444-444444444444' } },
    ]) {
      const { handler, dependencies } = makeDependencies({ authorize: vi.fn(async () => authorized) });
      const response = await handler(post({ fileId }));
      expect(response.status).toBe(403);
      expect(await response.text()).toBe('Bu dosyaya erişim yetkiniz yok.');
      expect(dependencies.createTicket).not.toHaveBeenCalled();
    }
  });

  it('maps invalid authentication and blocks active metadata before ticket creation', async () => {
    const unauthorized = makeDependencies({
      authorize: vi.fn(async () => { throw new Error('Unauthorized'); }),
    });
    expect((await unauthorized.handler(post({ fileId }))).status).toBe(401);

    const active = makeDependencies({
      authorize: vi.fn(async () => ({ choirId, file: { ...file, file_name: 'payload.svg' } })),
    });
    const response = await active.handler(post({ fileId }));
    expect(response.status).toBe(415);
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(active.dependencies.createTicket).not.toHaveBeenCalled();
  });

  it('rejects invalid or file-mismatched tickets before database and provider access', async () => {
    const invalid = makeDependencies({ verifyTicket: vi.fn(async () => null) });
    expect((await invalid.handler(read())).status).toBe(401);
    expect(invalid.dependencies.loadTicketFile).not.toHaveBeenCalled();

    const mismatch = makeDependencies();
    expect((await mismatch.handler(read('GET', otherFileId))).status).toBe(401);
    expect(mismatch.dependencies.loadTicketFile).not.toHaveBeenCalled();
    expect(mismatch.dependencies.fetchDrive).not.toHaveBeenCalled();
  });

  it('serves full passive content with private safe headers', async () => {
    const { handler, dependencies } = makeDependencies();
    const response = await handler(read());

    expect(response.status).toBe(200);
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([0, 1, 2, 3, 4]);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('accept-ranges')).toBe('bytes');
    expect(response.headers.get('content-length')).toBe('5');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(dependencies.fetchDrive).toHaveBeenCalledWith('drive_file-1');
  });

  it.each([
    ['bytes=1-3', 1, 3, [1, 2, 3]],
    ['bytes=2-', 2, 4, [2, 3, 4]],
    ['bytes=-2', 3, 4, [3, 4]],
  ])('serves one valid range %s', async (range, start, end, expected) => {
    const response = await makeDependencies().handler(read('GET', fileId, 'signed-ticket', range));
    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe(`bytes ${start}-${end}/5`);
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual(expected);
  });

  it.each(['bytes=9-', 'bytes=3-1', 'bytes=-0', 'bytes=0-1,3-4', 'items=0-1'])
  ('returns 416 for an unsupported or unsatisfiable range %s', async (range) => {
    const response = await makeDependencies().handler(read('GET', fileId, 'signed-ticket', range));
    expect(response.status).toBe(416);
    expect(response.headers.get('content-range')).toBe('bytes */5');
  });

  it('returns header-only HEAD responses, including ranges', async () => {
    const response = await makeDependencies().handler(read('HEAD', fileId, 'signed-ticket', 'bytes=1-2'));
    expect(response.status).toBe(206);
    expect(response.headers.get('content-length')).toBe('2');
    expect(await response.text()).toBe('');
  });

  it('uses Storage only for a valid server-side storage location', async () => {
    const storageFile = { ...file, drive_download_link: 'storage://private/scores/alto.pdf' };
    const { handler, dependencies } = makeDependencies({
      loadTicketFile: vi.fn(async () => storageFile),
    });
    expect((await handler(read())).status).toBe(200);
    expect(dependencies.fetchStorage).toHaveBeenCalledWith('private', 'scores/alto.pdf');
    expect(dependencies.fetchDrive).not.toHaveBeenCalled();

    const malformed = makeDependencies({
      loadTicketFile: vi.fn(async () => ({ ...file, drive_download_link: 'storage://missing-path' })),
    });
    expect((await malformed.handler(read())).status).toBe(502);
    expect(malformed.dependencies.fetchStorage).not.toHaveBeenCalled();
  });

  it('does not leak missing rows or provider errors and rechecks provider MIME', async () => {
    const missing = makeDependencies({ loadTicketFile: vi.fn(async () => null) });
    expect((await missing.handler(read())).status).toBe(404);
    expect(missing.dependencies.fetchDrive).not.toHaveBeenCalled();

    const upstreamFailure = makeDependencies({
      fetchDrive: vi.fn(async () => new Response('provider secret', { status: 503 })),
    });
    const failed = await upstreamFailure.handler(read());
    expect(failed.status).toBe(502);
    expect(await failed.text()).not.toContain('provider secret');

    const active = makeDependencies({
      fetchDrive: vi.fn(async () => new Response('<svg/>', {
        status: 200,
        headers: { 'Content-Type': 'image/svg+xml' },
      })),
    });
    expect((await active.handler(read())).status).toBe(415);
  });

  it('sanitizes the fallback filename, encodes UTF-8 and handles CORS preflight', async () => {
    const disposition = makeContentDisposition('şarkı"\r\n.pdf');
    expect(disposition).toContain('filename="_ark____.pdf"');
    expect(disposition).toContain("filename*=UTF-8''%C5%9Fark%C4%B1%22%0D%0A.pdf");

    const response = await makeDependencies().handler(new Request(endpoint, { method: 'OPTIONS' }));
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-methods')).toContain('HEAD');
  });
});

describe('range parser', () => {
  it('distinguishes no range from an invalid range', () => {
    expect(parseRangeHeader(null, 5)).toEqual({ kind: 'none' });
    expect(parseRangeHeader('bytes=0-0', 0)).toEqual({ kind: 'invalid' });
  });
});
