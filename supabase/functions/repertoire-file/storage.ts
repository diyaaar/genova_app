import { isActiveContentMimeType } from '../../../lib/server/drive-file-content.ts';

export interface StorageObjectFetchInput {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucket: string;
  path: string;
  fetcher?: typeof fetch;
}

export function makeStorageObjectUrl(
  supabaseUrl: string,
  bucket: string,
  path: string,
  route: 'object' | 'object/info' = 'object',
): URL | null {
  const pathSegments = path.split('/');
  const allSegments = [bucket, ...pathSegments];
  if (allSegments.some((segment) => !segment || segment === '.' || segment === '..')) {
    return null;
  }

  const url = new URL(supabaseUrl);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  url.pathname = `/storage/v1/${route}/${allSegments.map(encodeURIComponent).join('/')}`;
  url.search = '';
  url.hash = '';
  return url;
}

export async function fetchStorageObject({
  supabaseUrl,
  serviceRoleKey,
  bucket,
  path,
  fetcher = fetch,
}: StorageObjectFetchInput): Promise<Response> {
  const objectUrl = makeStorageObjectUrl(supabaseUrl, bucket, path);
  const infoUrl = makeStorageObjectUrl(supabaseUrl, bucket, path, 'object/info');
  if (!objectUrl || !infoUrl) return new Response(null, { status: 404 });

  const requestInit: RequestInit = {
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    redirect: 'manual',
    cache: 'no-store',
  };

  const infoResponse = await fetcher(infoUrl, requestInit);
  if (!infoResponse.ok) return infoResponse;
  let info: unknown;
  try {
    info = await infoResponse.json();
  } catch {
    return new Response(null, { status: 502 });
  }
  const metadata = info && typeof info === 'object'
    ? info as { content_type?: unknown; metadata?: { mimetype?: unknown } }
    : null;
  const metadataContentType = typeof metadata?.content_type === 'string'
    ? metadata.content_type
    : typeof metadata?.metadata?.mimetype === 'string'
      ? metadata.metadata.mimetype
      : null;
  if (!metadataContentType) return new Response(null, { status: 502 });

  const objectResponse = await fetcher(objectUrl, requestInit);
  if (!objectResponse.ok) return objectResponse;

  // Storage's object route can answer with a transformed response type
  // (locally, text/plain) while its info route keeps the upload MIME. Use the
  // metadata type, except when either source reports active content: in that
  // case preserve the active type so the handler rejects it.
  const responseContentType = objectResponse.headers.get('content-type');
  const selectedContentType = isActiveContentMimeType(responseContentType)
    ? responseContentType as string
    : metadataContentType;
  const headers = new Headers(objectResponse.headers);
  headers.set('Content-Type', selectedContentType);
  return new Response(objectResponse.body, {
    status: objectResponse.status,
    statusText: objectResponse.statusText,
    headers,
  });
}
