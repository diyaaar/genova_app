// @vitest-environment node
import { createHmac } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { createHandler } from './handler';
import { INBOX, MAX_RAW_BYTES } from './provider';
import { mailbox, verifyWebhook } from './security';

const clock = 1800000000000;
const secret = `whsec_${Buffer.from('fixture-only-webhook-secret-32bytes').toString('base64')}`;
const id = '37e4414c-5e25-4dbc-a071-43552a4bd53b';
const config = { webhookSecret: secret, apiKey: 'test-only-key', forwardTo: 'operator@example.com' };
const event = { type: 'email.received', data: { email_id: id, to: [INBOX] } };
const rawMail = 'From: Person <person@example.org>\r\nSubject: Test\r\n\r\nOriginal MIME bytes';
function signed(body: unknown = event, timestamp = clock / 1000) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const signature = createHmac('sha256', Buffer.from(secret.slice(6), 'base64'))
    .update(`msg_test.${timestamp}.${raw}`).digest('base64');
  return new Request('https://edge.example.test', { method: 'POST', body: raw, headers: {
    'svix-id': 'msg_test', 'svix-timestamp': `${timestamp}`, 'svix-signature': `v1,${signature}`,
  } });
}
function fixture(overrides = {}) {
  return { id, to: [INBOX], from: 'Person <person@example.org>', subject: 'Test', text: 'Hello', headers: {},
    raw: { download_url: 'https://inbound-cdn.resend.com/test.eml?Signature=fixture' }, ...overrides };
}
function provider(overrides = {}, rawResponse = () => new Response(rawMail)) {
  return vi.fn<typeof fetch>(async (input) => {
    const url = String(input);
    if (url.startsWith('https://api.resend.com/emails/receiving/')) return Response.json(fixture(overrides));
    if (url.startsWith('https://inbound-cdn.resend.com/') || url.startsWith('https://cdn.resend.app/')) return rawResponse();
    if (url === 'https://api.resend.com/emails') return Response.json({ id: 'sent-fixture' });
    throw new Error('unexpected_network');
  });
}
const run = (transport: typeof fetch, custom = config) => createHandler(custom, transport, () => clock);
function sentBody(transport: ReturnType<typeof provider>) {
  const call = transport.mock.calls.find(([url]) => String(url) === 'https://api.resend.com/emails');
  return { body: JSON.parse(call?.[1]?.body as string), headers: call?.[1]?.headers as Record<string, string> };
}

describe('inbound authentication and boundaries', () => {
  it('rejects unsigned requests without network traffic', async () => {
    const transport = provider();
    expect((await run(transport)(new Request('https://edge.test', { method: 'POST', body: '{}' }))).status).toBe(401);
    expect(transport).not.toHaveBeenCalled();
  });
  it.each([-301, 301])('rejects timestamps outside replay window: %i', async skew => {
    const transport = provider();
    expect((await run(transport)(signed(event, clock / 1000 + skew))).status).toBe(401);
    expect(transport).not.toHaveBeenCalled();
  });
  it('rejects a modified body', async () => {
    const original = signed();
    const request = new Request(original.url, { method: 'POST', headers: original.headers, body: JSON.stringify({ ...event, extra: true }) });
    expect((await run(provider())(request)).status).toBe(401);
  });
  it('accepts a valid rotated signature even after malformed candidates', async () => {
    const request = signed();
    request.headers.set('svix-signature', `v1,invalid! v2,unsupported ${request.headers.get('svix-signature')}`);
    expect(await verifyWebhook(await request.text(), request.headers, secret, clock)).toBe(true);
  });
  it.each(['invalid', 'whsec_%%%'])('fails closed for malformed secret %s', async bad => {
    const request = signed();
    expect(await verifyWebhook(await request.text(), request.headers, bad, clock)).toBe(false);
  });
  it.each([
    { ...config, apiKey: '' }, { ...config, forwardTo: '' },
    { ...config, forwardTo: 'other@mail.genesinovachoir.com' }, { ...config, webhookSecret: '' },
  ])('fails closed on incomplete or looping configuration', async custom => {
    const transport = provider();
    expect((await run(transport, custom)(signed())).status).toBe(503);
    expect(transport).not.toHaveBeenCalled();
  });
  it('rejects oversized webhook bodies', async () => {
    const transport = provider();
    expect((await run(transport)(signed('x'.repeat(65537)))).status).toBe(413);
    expect(transport).not.toHaveBeenCalled();
  });
  it('rejects other methods, invalid JSON and invalid IDs', async () => {
    const handler = run(provider());
    expect((await handler(new Request('https://edge.test'))).status).toBe(405);
    expect((await handler(signed('{'))).status).toBe(400);
    const invalidId = await handler(signed({ ...event, data: { ...event.data, email_id: '../escape' } }));
    expect(invalidId.status).toBe(400);
  });
  it.each([
    { type: 'email.sent' }, { ...event, data: { ...event.data, to: ['wrong@example.org'] } },
  ])('ignores non-inbox events', async body => {
    const transport = provider();
    expect(await (await run(transport)(signed(body))).json()).toEqual({ state: 'ignored' });
    expect(transport).not.toHaveBeenCalled();
  });
  it('does not accept CRLF or multiple addresses', () => {
    expect(mailbox('x@example.org\r\nBcc: attacker@example.org')).toBeNull();
    expect(mailbox('x@example.org,y@example.org')).toBeNull();
    expect(mailbox('Person <PERSON@example.org>')).toBe('person@example.org');
  });
});

describe('inbound forwarding', () => {
  it('preserves MIME, fixes destination and sets original sender as reply-to', async () => {
    const transport = provider();
    expect(await (await run(transport)(signed({ ...event, forwardTo: 'attacker@example.org' }))).json()).toEqual({ state: 'forwarded' });
    const { body, headers } = sentBody(transport);
    expect(body.to).toEqual(['operator@example.com']);
    expect(body.from).toBe(`Genova Team <${INBOX}>`);
    expect(body.reply_to).toBe('person@example.org');
    expect(Buffer.from(body.attachments[0].content, 'base64').toString()).toBe(rawMail);
    expect(body.headers['Auto-Submitted']).toBe('auto-generated');
    expect(headers['Idempotency-Key']).toBe(`genova-inbound/${id}`);
    const cdn = transport.mock.calls[1][1];
    expect(cdn?.headers).toBeUndefined();
    expect(cdn?.redirect).toBe('error');
  });
  it('uses the same idempotency key on webhook retries', async () => {
    const transport = provider();
    await run(transport)(signed()); await run(transport)(signed());
    const sends = transport.mock.calls.filter(([url]) => String(url) === 'https://api.resend.com/emails');
    expect(sends.map(([, options]) => (options?.headers as Record<string,string>)['Idempotency-Key']))
      .toEqual([`genova-inbound/${id}`, `genova-inbound/${id}`]);
  });
  it('changes destination only through server config and honors one original reply-to', async () => {
    const transport = provider({ reply_to: ['Support <reply@example.org>'] });
    await run(transport, { ...config, forwardTo: 'new@example.com' })(signed());
    expect(sentBody(transport).body.to).toEqual(['new@example.com']);
    expect(sentBody(transport).body.reply_to).toBe('reply@example.org');
  });
  it.each([
    { to: ['wrong@example.org'] }, { id: 'wrong' }, { from: INBOX },
    { headers: { 'Auto-Submitted': 'auto-replied' } }, { headers: { 'X-Genova-Forwarded': '1' } },
    { headers: { 'Return-Path': '<>' } }, { headers: { Precedence: 'bulk' } },
  ])('does not forward loops, automated mail or mismatched fetched recipients', async overrides => {
    const transport = provider(overrides);
    expect(await (await run(transport)(signed())).json()).toEqual({ state: 'ignored' });
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it.each(['http://inbound-cdn.resend.com/x', 'https://127.0.0.1/x', 'https://evilresend.com/x', 'https://inbound-cdn.resend.com@evil.test/x'])('refuses untrusted raw URL %s', async url => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const transport = provider({ raw: { download_url: url } });
    expect((await run(transport)(signed())).status).toBe(502);
    expect(transport).toHaveBeenCalledTimes(1);
  });
  it('notifies explicitly when raw mail is unavailable', async () => {
    const transport = provider({ raw: null });
    expect(await (await run(transport)(signed())).json()).toEqual({ state: 'forwarded_notice' });
    expect(sentBody(transport).body.text).toContain('ekler AKTARILMADI');
    expect(sentBody(transport).body.attachments).toBeUndefined();
  });
  it('accepts the provider raw-mail hostname observed in production', async () => {
    const transport = provider({ raw: { download_url: 'https://cdn.resend.app/test.eml?Signature=fixture' } });
    expect(await (await run(transport)(signed())).json()).toEqual({ state: 'forwarded' });
  });
  it('bounds oversized declared raw attachments', async () => {
    const transport = provider({}, () => new Response('tiny', { headers: { 'content-length': `${MAX_RAW_BYTES + 1}` } }));
    expect(await (await run(transport)(signed())).json()).toEqual({ state: 'forwarded_notice' });
  });
  it('bounds raw streams even without content-length', async () => {
    const transport = provider({}, () => new Response(new Uint8Array(MAX_RAW_BYTES + 1)));
    expect(await (await run(transport)(signed())).json()).toEqual({ state: 'forwarded_notice' });
  });
  it('retries provider failure without disclosing provider body or credentials', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const transport = vi.fn<typeof fetch>(async () => new Response('private provider error', { status: 429 }));
    const response = await run(transport)(signed());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('private');
    expect(log).toHaveBeenCalledWith('resend_inbound_provider_failure');
  });
});
