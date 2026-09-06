/** Bounded streams prevent webhook and attachment payloads exhausting Edge memory. */
export class SizeLimitError extends Error {}

export async function readLimited(body: ReadableStream<Uint8Array> | null, limit: number) {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new SizeLimitError('payload_limit');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}

/** Svix v1: authenticate exact bytes, accept rotation signatures, reject >5m skew.
 * WebCrypto performs the MAC comparison; never compare signature strings ourselves.
 */
export async function verifyWebhook(raw: string, headers: Headers, secret: string, now: number) {
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp') ?? '';
  const signatures = headers.get('svix-signature') ?? '';
  if (!id || id.length > 256 || !/^\d{1,12}$/.test(timestamp) || signatures.length > 4096) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > 300 || !secret.startsWith('whsec_')) return false;
  try {
    const key = await crypto.subtle.importKey('raw', decode64(secret.slice(6)),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const payload = new TextEncoder().encode(`${id}.${timestamp}.${raw}`);
    for (const part of signatures.split(' ')) {
      const [version, signature] = part.split(',');
      if (version !== 'v1' || !signature) continue;
      try {
        if (await crypto.subtle.verify('HMAC', key, decode64(signature), payload)) return true;
      } catch { /* A malformed rotation candidate must not hide a valid signature. */ }
    }
  } catch { return false; }
  return false;
}

function decode64(value: string) {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0));
}

/** Accept one simple mailbox, optionally display-name wrapped; reject header injection. */
export function mailbox(value: unknown): string | null {
  if (typeof value !== 'string' || /[\r\n,;]/.test(value)) return null;
  const address = (value.match(/^[^<>]*<([^<>]+)>$/)?.[1] ?? value).trim().toLowerCase();
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(address)
    ? address : null;
}
