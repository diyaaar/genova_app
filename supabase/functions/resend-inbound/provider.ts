import { mailbox, readLimited, SizeLimitError } from './security.ts';

export const INBOX = 'team@mail.genesinovachoir.com';
export const MAX_RAW_BYTES = 8 * 1024 * 1024;
const API = 'https://api.resend.com';
export type Transport = typeof fetch;

interface ReceivedEmail {
  id: string;
  to: string[];
  from: string;
  reply_to?: string[];
  subject?: string;
  text?: string | null;
  headers?: Record<string, string>;
  raw?: { download_url: string } | null;
}

async function apiRequest(path: string, key: string, transport: Transport, init: RequestInit = {}) {
  const response = await transport(`${API}${path}`, {
    ...init, redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init.headers },
  });
  if (!response.ok) { await response.body?.cancel(); throw new Error('provider_request_failed'); }
  // CID mode excludes inline-image data URIs; original full mail is fetched separately.
  return JSON.parse(new TextDecoder().decode(await readLimited(response.body, 2 * 1024 * 1024)));
}

function automaticMail(email: ReceivedEmail) {
  const headers = Object.fromEntries(Object.entries(email.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
  return Boolean(headers['x-genova-forwarded']) ||
    Boolean(headers['auto-submitted'] && headers['auto-submitted'].toLowerCase() !== 'no') ||
    headers['return-path'] === '<>' || /^(bulk|list|junk)$/i.test(headers.precedence ?? '');
}

/** Only provider-returned HTTPS CDN URLs are eligible; no redirects or API credential forwarding. */
function rawUrl(value: string) {
  const url = new URL(value);
  const allowed = url.hostname.endsWith('.resend.com') ||
    url.hostname.endsWith('.resend.app') || url.hostname.endsWith('.cloudfront.net');
  if (url.protocol !== 'https:' || !allowed || url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('untrusted_download_url');
  }
  return url.href;
}

async function originalMessage(email: ReceivedEmail, transport: Transport) {
  if (!email.raw?.download_url) return null;
  const response = await transport(rawUrl(email.raw.download_url), {
    redirect: 'error', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) { await response.body?.cancel(); throw new Error('raw_download_failed'); }
  if (Number(response.headers.get('content-length')) > MAX_RAW_BYTES) {
    await response.body?.cancel(); return null;
  }
  try {
    const bytes = await readLimited(response.body, MAX_RAW_BYTES);
    let binary = '';
    for (let offset = 0; offset < bytes.length; offset += 8192) {
      binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
    }
    return btoa(binary);
  } catch (error) {
    if (error instanceof SizeLimitError) return null;
    throw error;
  }
}

/** Forward a signed event's mail only to the configured mailbox; no database or user mutations.
 * Provider idempotency (24h) protects its automatic retry window, not indefinite manual replays.
 * The .eml keeps original headers, HTML and attachments; oversized mail produces a visible notice.
 */
export async function forwardEmail(id: string, key: string, target: string, transport: Transport) {
  const email = await apiRequest(`/emails/receiving/${id}?html_format=cid`, key, transport) as ReceivedEmail;
  if (email.id !== id || !Array.isArray(email.to) || !email.to.some(value => mailbox(value) === INBOX)) return 'ignored';
  if (automaticMail(email) || mailbox(email.from) === INBOX) return 'ignored';
  const replyTo = (email.reply_to?.length === 1 ? mailbox(email.reply_to[0]) : null) ?? mailbox(email.from);
  const original = await originalMessage(email, transport);
  const subject = typeof email.subject === 'string' ? email.subject.replace(/[\r\n]/g, ' ').slice(0, 200) : '(Konu yok)';
  const preview = typeof email.text === 'string' ? email.text.slice(0, 16000) : 'İletinin HTML içeriği ekteki özgün e-postadadır.';
  const note = original
    ? 'Özgün e-posta ve varsa ekleri forwarded_message.eml dosyasındadır.'
    : `DİKKAT: Özgün dosya mevcut değil veya 8 MiB sınırını aşıyor; ekler AKTARILMADI. Resend → Emails → Receiving üzerinden iletiyi açın. İleti kimliği: ${id}`;
  const payload = {
    from: `Genova Team <${INBOX}>`, to: [target], subject: `[Genova yanıt] ${subject}`,
    ...(replyTo && replyTo !== INBOX ? { reply_to: replyTo } : {}),
    text: `Genova gelen e-posta\nGönderen (doğrulanmış kimlik değildir): ${email.from}\n${note}\n\n${preview}`,
    headers: { 'X-Genova-Forwarded': '1', 'Auto-Submitted': 'auto-generated', 'X-Auto-Response-Suppress': 'All' },
    ...(original ? { attachments: [{ filename: 'forwarded_message.eml', content: original, content_type: 'message/rfc822' }] } : {}),
  };
  const sent = await apiRequest('/emails', key, transport, {
    method: 'POST', headers: { 'Idempotency-Key': `genova-inbound/${id}` }, body: JSON.stringify(payload),
  });
  if (typeof sent.id !== 'string') throw new Error('provider_response_invalid');
  return original ? 'forwarded' : 'forwarded_notice';
}
