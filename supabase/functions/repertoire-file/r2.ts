const ACCOUNT_ID_PATTERN = /^[0-9a-f]{32}$/;
const BUCKET_PATTERN = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;
const OBJECT_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

export type R2Jurisdiction = '' | 'eu' | 'fedramp';

export interface R2ObjectFetchInput {
  accountId: string;
  jurisdiction: R2Jurisdiction;
  bucket: string;
  objectKey: string;
  method: 'GET' | 'HEAD';
  range?: string;
  signedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  testEndpoint?: string;
  allowInsecureLoopback?: boolean;
}

export function parseR2Jurisdiction(value: string | undefined): R2Jurisdiction | null {
  if (!value) return '';
  return value === 'eu' || value === 'fedramp' ? value : null;
}

export function isSafeR2ObjectKey(value: string) {
  if (!value || value.length > 1024 || !OBJECT_KEY_PATTERN.test(value)) return false;
  if (value.includes('//')) return false;
  return !value.split('/').some((segment) => segment === '.' || segment === '..' || !segment);
}

function makeLoopbackEndpoint(value: string, allow: boolean): URL | null {
  if (!allow) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' || (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost')) {
    return null;
  }
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
  return url;
}

export function makeR2ObjectUrl(input: {
  accountId: string;
  jurisdiction: R2Jurisdiction;
  bucket: string;
  objectKey: string;
  testEndpoint?: string;
  allowInsecureLoopback?: boolean;
}): URL | null {
  if (!ACCOUNT_ID_PATTERN.test(input.accountId) || !BUCKET_PATTERN.test(input.bucket)) return null;
  if (!isSafeR2ObjectKey(input.objectKey)) return null;

  const endpoint = input.testEndpoint
    ? makeLoopbackEndpoint(input.testEndpoint, input.allowInsecureLoopback === true)
    : new URL(
      `https://${input.accountId}${input.jurisdiction ? `.${input.jurisdiction}` : ''}.r2.cloudflarestorage.com/`,
    );
  if (!endpoint) return null;
  endpoint.pathname = `/${[input.bucket, ...input.objectKey.split('/')]
    .map(encodeURIComponent)
    .join('/')}`;
  return endpoint;
}

export async function fetchR2Object(input: R2ObjectFetchInput): Promise<Response> {
  const url = makeR2ObjectUrl(input);
  if (!url) throw new Error('Invalid R2 target');
  const headers = new Headers();
  if (input.range) headers.set('Range', input.range);
  return input.signedFetch(url, {
    method: input.method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
  });
}
