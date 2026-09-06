import { describe, expect, it, vi } from 'vitest';
import { createInvitationHandler, parseCommand } from './handler';

const choirId = '11111111-1111-4111-8111-111111111111';
const token = 'a'.repeat(64);
function setup(code?: string) {
  const rpc = vi.fn().mockResolvedValue({ data: { memberId: choirId }, error: code ? { code } : null });
  const getUser = vi.fn().mockResolvedValue({ data: { user: { id: choirId } }, error: null });
  const make = vi.fn(() => ({ rpc, auth: { getUser } }));
  return { handler: createInvitationHandler(make), rpc, getUser, make };
}
const request = (body: unknown, headers = { Authorization: 'Bearer session-token' }) =>
  new Request('https://example.invalid', { method: 'POST', headers, body: JSON.stringify(body) });

describe('invitation transport', () => {
  it('rejects unexpected fields and elevated voice/role input', () => {
    expect(() => parseCommand({ action: 'accept', token, role: 'Şef' })).toThrow();
    expect(() => parseCommand({ action: 'list', choirId: 'invalid' })).toThrow();
    expect(() => parseCommand({ action: 'create', choirId, email: 'a@b.com', firstName: 'A', lastName: 'B', voiceGroup: 'Şef' })).toThrow();
    expect(() => parseCommand({ action: 'toString' })).toThrow();
  });
  it('normalizes recipient but preserves exact token', () => {
    expect(parseCommand({ action: 'create', choirId, email: ' A@B.COM ', firstName: ' A ', lastName: ' B ', voiceGroup: 'Alto' }).payload.email).toBe('a@b.com');
    expect(parseCommand({ action: 'accept', token }).payload.token).toBe(token);
  });
  it('rejects missing/invalid auth before RPC', async () => {
    const s = setup();
    expect((await s.handler(request({ action: 'accept', token }, {} as { Authorization: string }))).status).toBe(401);
    s.getUser.mockResolvedValue({ data: { user: null }, error: {} });
    expect((await s.handler(request({ action: 'accept', token }))).status).toBe(401);
    expect(s.rpc).not.toHaveBeenCalled();
  });
  it('preserves user authorization and disables caching', async () => {
    const s = setup(); const result = await s.handler(request({ action: 'accept', token }));
    expect(result.status).toBe(200); expect(result.headers.get('cache-control')).toBe('no-store');
    expect(s.make).toHaveBeenCalledWith('Bearer session-token');
    expect(s.rpc).toHaveBeenCalledWith('choir_invitation_command', { p_action: 'accept', p_payload: { token } });
  });
  it.each([['42501',403],['23505',409],['22023',400],['54000',429],['XX000',500]])('maps %s without leaking SQL', async (code,status) => {
    const result = await setup(code as string).handler(request({ action: 'accept', token }));
    expect(result.status).toBe(status); expect(await result.text()).not.toContain(token);
  });
  it('bounds actual request size and handles preflight', async () => {
    const s=setup(); expect((await s.handler(request({ huge:'a'.repeat(5000) }))).status).toBe(413);
    expect(s.rpc).not.toHaveBeenCalled();
    expect((await s.handler(new Request('https://example.invalid',{method:'OPTIONS'}))).status).toBe(200);
  });
});
