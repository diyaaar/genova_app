const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RepertoireFileTicketPayload {
  version: 1;
  fileId: string;
  choirId: string;
  expiresAt: number;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null;
  try {
    const padded = value.replaceAll('-', '+').replaceAll('_', '/')
      .padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function importHmacKey(secret: string) {
  if (!secret) throw new Error('Missing ticket secret');
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createRepertoireFileTicket(
  input: { fileId: string; choirId: string },
  secret: string,
  ttlMs = 60 * 60_000,
  now = Date.now(),
): Promise<{ token: string; expiresAt: number }> {
  if (!UUID_PATTERN.test(input.fileId) || !UUID_PATTERN.test(input.choirId) || ttlMs <= 0) {
    throw new Error('Invalid ticket input');
  }
  const payload: RepertoireFileTicketPayload = {
    version: 1,
    fileId: input.fileId,
    choirId: input.choirId,
    expiresAt: now + ttlMs,
  };
  const encodedPayload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload));
  return {
    token: `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`,
    expiresAt: payload.expiresAt,
  };
}

export async function verifyRepertoireFileTicket(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<RepertoireFileTicketPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, encodedSignature] = parts;
  const payloadBytes = base64UrlToBytes(encodedPayload);
  const signatureBytes = base64UrlToBytes(encodedSignature);
  if (!payloadBytes || !signatureBytes) return null;

  try {
    const key = await importHmacKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(encodedPayload),
    );
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Partial<RepertoireFileTicketPayload>;
    if (
      payload.version !== 1 ||
      typeof payload.fileId !== 'string' || !UUID_PATTERN.test(payload.fileId) ||
      typeof payload.choirId !== 'string' || !UUID_PATTERN.test(payload.choirId) ||
      typeof payload.expiresAt !== 'number' || !Number.isFinite(payload.expiresAt) ||
      payload.expiresAt <= now
    ) return null;
    return payload as RepertoireFileTicketPayload;
  } catch {
    return null;
  }
}
