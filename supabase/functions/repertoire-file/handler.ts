import { isActiveDriveFileContent } from '../../../lib/server/drive-file-content.ts';
import type { RepertoireFileTicketPayload } from './ticket.ts';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DRIVE_FILE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const MAX_BODY_BYTES = 1024;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, range, x-client-info',
  'Access-Control-Allow-Methods': 'POST, GET, HEAD, OPTIONS',
  'Access-Control-Expose-Headers': 'accept-ranges, content-length, content-range, content-type, content-disposition',
};

export interface RepertoireFileRecord {
  id: string;
  choir_id: string;
  drive_file_id: string;
  drive_download_link: string | null;
  file_name: string;
  mime_type: string | null;
}

export interface RepertoireFileAuthorization {
  choirId: string;
  file: RepertoireFileRecord;
}

export interface RepertoireFileHandlerDependencies {
  authorize(input: {
    authorization: string;
    accessToken: string;
    fileId: string;
  }): Promise<RepertoireFileAuthorization | null>;
  loadTicketFile(input: { fileId: string; choirId: string }): Promise<RepertoireFileRecord | null>;
  createTicket(input: { fileId: string; choirId: string }): Promise<{ token: string; expiresAt: number }>;
  verifyTicket(token: string): Promise<RepertoireFileTicketPayload | null>;
  fetchDrive(driveFileId: string): Promise<Response>;
  fetchStorage(bucket: string, path: string): Promise<Response>;
}

type ParsedRange = { kind: 'none' } | { kind: 'invalid' } | {
  kind: 'range';
  start: number;
  end: number;
};

function responseHeaders(contentType = 'text/plain; charset=utf-8') {
  return new Headers({
    ...CORS_HEADERS,
    'Cache-Control': 'private, no-store',
    'Content-Type': contentType,
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
  });
}

function textResponse(message: string, status: number) {
  return new Response(message, { status, headers: responseHeaders() });
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: responseHeaders('application/json; charset=utf-8'),
  });
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const declaredSize = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BODY_BYTES) {
    throw new Error('too-large');
  }

  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid-json');
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    size += next.value.length;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new Error('too-large');
    }
    chunks.push(next.value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error('invalid-json');
  }
}

function parseTicketRequest(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (Object.keys(body).length !== 1 || typeof body.fileId !== 'string') return null;
  return UUID_PATTERN.test(body.fileId) ? body.fileId : null;
}

export function parseRangeHeader(rangeHeader: string | null, totalSize: number): ParsedRange {
  if (!rangeHeader) return { kind: 'none' };
  if (!Number.isSafeInteger(totalSize) || totalSize < 1) return { kind: 'invalid' };
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || (match[1] === '' && match[2] === '')) return { kind: 'invalid' };

  let start: number;
  let end: number;
  if (match[1] === '') {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return { kind: 'invalid' };
    start = Math.max(0, totalSize - suffixLength);
    end = totalSize - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === '' ? totalSize - 1 : Number(match[2]);
  }

  if (
    !Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
    start < 0 || start >= totalSize || end < start
  ) return { kind: 'invalid' };
  return { kind: 'range', start, end: Math.min(end, totalSize - 1) };
}

export function makeContentDisposition(fileName: string) {
  const fallbackName = fileName
    .replace(/["\\\r\n]/g, '_')
    .replace(/[^\x20-\x7E]/g, '_');
  const encodedName = encodeURIComponent(fileName).replace(/['()]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `inline; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`;
}

function parseStorageLocation(value: string | null): { bucket: string; path: string } | null | 'invalid' {
  if (!value?.startsWith('storage://')) return null;
  const location = value.slice('storage://'.length);
  const slash = location.indexOf('/');
  if (slash <= 0 || slash === location.length - 1) return 'invalid';
  return { bucket: location.slice(0, slash), path: location.slice(slash + 1) };
}

async function issueTicket(request: Request, dependencies: RepertoireFileHandlerDependencies) {
  const authorization = request.headers.get('authorization') ?? '';
  const accessToken = authorization.match(/^Bearer\s+([^\s]+)$/i)?.[1];
  if (!accessToken || accessToken.length > 8192) return textResponse('Giriş yapmalısınız.', 401);

  let body: unknown;
  try {
    body = await readBoundedJson(request);
  } catch (error) {
    return textResponse(error instanceof Error && error.message === 'too-large'
      ? 'İstek çok büyük.'
      : 'Dosya isteği geçersiz.', error instanceof Error && error.message === 'too-large' ? 413 : 400);
  }
  const fileId = parseTicketRequest(body);
  if (!fileId) return textResponse('Dosya isteği geçersiz.', 400);

  try {
    const authorized = await dependencies.authorize({ authorization, accessToken, fileId });
    if (!authorized || authorized.file.id !== fileId || authorized.file.choir_id !== authorized.choirId) {
      return textResponse('Bu dosyaya erişim yetkiniz yok.', 403);
    }
    if (isActiveDriveFileContent({
      fileName: authorized.file.file_name,
      mimeType: authorized.file.mime_type,
    })) return textResponse('Bu dosya türü desteklenmiyor.', 415);

    const ticket = await dependencies.createTicket({ fileId, choirId: authorized.choirId });
    const url = new URL(request.url);
    url.search = '';
    url.searchParams.set('fileId', fileId);
    url.searchParams.set('ticket', ticket.token);
    return jsonResponse({ url: url.toString(), expiresAt: ticket.expiresAt });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return textResponse('Oturum geçersiz.', 401);
    }
    return textResponse('Dosya erişimi hazırlanamadı.', 500);
  }
}

async function serveFile(request: Request, dependencies: RepertoireFileHandlerDependencies) {
  const requestUrl = new URL(request.url);
  const fileId = requestUrl.searchParams.get('fileId') ?? '';
  const token = requestUrl.searchParams.get('ticket') ?? '';
  if (!UUID_PATTERN.test(fileId) || !token || token.length > 2048) {
    return textResponse('Dosya bağlantısı geçersiz.', 401);
  }

  try {
    const ticket = await dependencies.verifyTicket(token);
    if (!ticket || ticket.fileId !== fileId) return textResponse('Dosya bağlantısı geçersiz.', 401);
    const file = await dependencies.loadTicketFile({ fileId: ticket.fileId, choirId: ticket.choirId });
    if (!file || file.id !== ticket.fileId || file.choir_id !== ticket.choirId) {
      return textResponse('Dosya bulunamadı.', 404);
    }
    if (isActiveDriveFileContent({ fileName: file.file_name, mimeType: file.mime_type })) {
      return textResponse('Bu dosya türü desteklenmiyor.', 415);
    }

    const storage = parseStorageLocation(file.drive_download_link);
    if (storage === 'invalid') return textResponse('Dosya kaynağı kullanılamıyor.', 502);
    if (!storage && !DRIVE_FILE_ID_PATTERN.test(file.drive_file_id)) {
      return textResponse('Dosya kaynağı kullanılamıyor.', 502);
    }
    const upstream = storage
      ? await dependencies.fetchStorage(storage.bucket, storage.path)
      : await dependencies.fetchDrive(file.drive_file_id);
    if (!upstream.ok) return textResponse('Dosya kaynağına ulaşılamadı.', 502);

    const contentType = upstream.headers.get('content-type')?.split(';', 1)[0]?.trim()
      || file.mime_type
      || 'application/octet-stream';
    if (isActiveDriveFileContent({ fileName: file.file_name, mimeType: contentType })) {
      return textResponse('Bu dosya türü desteklenmiyor.', 415);
    }

    const bytes = await upstream.arrayBuffer();
    const totalSize = bytes.byteLength;
    const range = parseRangeHeader(request.headers.get('range'), totalSize);
    const headers = responseHeaders(contentType);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Content-Disposition', makeContentDisposition(file.file_name));

    if (range.kind === 'invalid') {
      headers.set('Content-Range', `bytes */${totalSize}`);
      return new Response(null, { status: 416, headers });
    }
    if (range.kind === 'range') {
      const content = bytes.slice(range.start, range.end + 1);
      headers.set('Content-Range', `bytes ${range.start}-${range.end}/${totalSize}`);
      headers.set('Content-Length', String(content.byteLength));
      return new Response(request.method === 'HEAD' ? null : content, { status: 206, headers });
    }

    headers.set('Content-Length', String(totalSize));
    return new Response(request.method === 'HEAD' ? null : bytes, { status: 200, headers });
  } catch {
    return textResponse('Dosya okunamadı.', 500);
  }
}

export function createRepertoireFileHandler(dependencies: RepertoireFileHandlerDependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method === 'POST') return issueTicket(request, dependencies);
    if (request.method === 'GET' || request.method === 'HEAD') return serveFile(request, dependencies);
    return textResponse('Yöntem desteklenmiyor.', 405);
  };
}
