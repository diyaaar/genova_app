import { forwardEmail, INBOX, type Transport } from './provider.ts';
import { mailbox, readLimited, SizeLimitError, verifyWebhook } from './security.ts';

export interface InboundConfig { apiKey?: string; webhookSecret?: string; forwardTo?: string }
const result = (status: number, state: string) => Response.json({ state }, { status });

/** Public webhook boundary. No unauthenticated request may fetch/send mail; the destination
 * is always a server secret. Missing configuration fails closed and failed provider calls retry.
 */
export function createHandler(config: InboundConfig, transport: Transport = fetch, now = () => Date.now()) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return result(405, 'method_not_allowed');
    if (!config.webhookSecret) return result(503, 'not_configured');
    let raw: string;
    try {
      raw = new TextDecoder('utf-8', { fatal: true }).decode(await readLimited(request.body, 64 * 1024));
    } catch (error) { return result(error instanceof SizeLimitError ? 413 : 400, 'invalid_body'); }
    if (!await verifyWebhook(raw, request.headers, config.webhookSecret, now())) return result(401, 'invalid_signature');
    const target = mailbox(config.forwardTo);
    if (!config.apiKey || !target || target.endsWith('@mail.genesinovachoir.com')) return result(503, 'not_configured');
    let event;
    try { event = JSON.parse(raw); } catch { return result(400, 'invalid_event'); }
    if (event?.type !== 'email.received') return result(200, 'ignored');
    const id = event?.data?.email_id;
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) return result(400, 'invalid_event');
    if (!Array.isArray(event.data.to) || !event.data.to.some((value: unknown) => mailbox(value) === INBOX)) return result(200, 'ignored');
    try { return result(200, await forwardEmail(id, config.apiKey, target, transport)); }
    catch {
      // Never log body, sender, signed download URL, provider error body, or credentials.
      console.error('resend_inbound_provider_failure');
      return result(502, 'provider_failure');
    }
  };
}
