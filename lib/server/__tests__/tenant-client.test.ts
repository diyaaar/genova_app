import { describe, expect, it, vi, afterEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createTenantFetch, TENANT_TABLES } from '@/supabase/functions/_shared/tenant-fetch';
import { createTenantServiceClient } from '@/lib/server/tenant-client';

const url = 'https://tenant-test.supabase.co';
const a = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const b = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function setup() {
  const transport = vi.fn<typeof fetch>().mockResolvedValue(new Response('[]', { status: 200 }));
  const guarded = createTenantFetch(url, a, transport);
  const client = createClient(url, 'test-service', {
    auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: guarded },
  });
  return { transport, guarded, client };
}
describe('tenant-scoped service transport', () => {
  it('covers exactly the 34 migration tables, not public website forms', () => {
    expect(TENANT_TABLES.size).toBe(34);
    expect(TENANT_TABLES.has('contact_messages')).toBe(false);
  });
  it.each(['GET', 'HEAD', 'DELETE'])('AND-scopes %s without replacing caller filters', async (method) => {
    const { guarded, transport } = setup();
    await guarded(`${url}/rest/v1/repertoire?choir_id=eq.${b}&or=(id.eq.1,id.eq.2)`, { method });
    const req = transport.mock.calls[0][0] as Request;
    const parsed = new URL(req.url);
    expect(parsed.searchParams.getAll('choir_id')).toEqual([`eq.${b}`, `eq.${a}`]);
    expect(parsed.searchParams.get('or')).toBe('(id.eq.1,id.eq.2)');
  });
  it('injects explicit tenant into real SDK bulk insert including its columns whitelist', async () => {
    const { client, transport } = setup();
    await client.from('assignment_targets').insert([{ member_id: 'm1' }, { member_id: 'm2' }]);
    const req = transport.mock.calls[0][0] as Request;
    expect(await req.json()).toEqual([{ member_id: 'm1', choir_id: a }, { member_id: 'm2', choir_id: a }]);
    expect(new URL(req.url).searchParams.get('columns')).toContain('"choir_id"');
  });
  it.each(['POST', 'PATCH'])('rejects foreign tenant in %s before sending anything', async (method) => {
    const { guarded, transport } = setup();
    await expect(guarded(`${url}/rest/v1/choir_members`, {
      method, body: JSON.stringify({ choir_id: b }),
    })).rejects.toThrow('Koro kapsamı');
    expect(transport).not.toHaveBeenCalled();
  });
  it('rejects a mixed-tenant batch atomically', async () => {
    const { guarded, transport } = setup();
    await expect(guarded(`${url}/rest/v1/roles`, {
      method: 'POST', body: JSON.stringify([{ name: 'A' }, { choir_id: b, name: 'B' }]),
    })).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
  });
  it('guards actual SDK upsert payload and preserves on_conflict', async () => {
    const { client, transport } = setup();
    await client.from('assignment_submissions').upsert({ assignment_id: 'a', member_id: 'm' }, { onConflict: 'assignment_id,member_id' });
    const req = transport.mock.calls[0][0] as Request;
    expect((await req.json()).choir_id).toBe(a);
    expect(new URL(req.url).searchParams.get('on_conflict')).toBe('assignment_id,member_id');
  });
  it('guards actual SDK updates and keeps headers', async () => {
    const { client, transport } = setup();
    await client.from('announcements').update({ title: 'x' }).eq('id', 'row');
    const req = transport.mock.calls[0][0] as Request;
    expect(await req.json()).toEqual({ title: 'x', choir_id: a });
    expect(req.headers.get('authorization')).toBe('Bearer test-service');
    expect(new URL(req.url).searchParams.get('id')).toBe('eq.row');
  });
  it.each(['rpc/get_pending_approvals', 'contact_messages', 'choirs', 'unknown_table'])('fails closed on %s', async (path) => {
    const { guarded, transport } = setup();
    await expect(guarded(`${url}/rest/v1/${path}`)).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
  });
  it('rejects non-public schemas and foreign origins', async () => {
    const { guarded } = setup();
    await expect(guarded(`${url}/rest/v1/roles`, { headers: { 'Accept-Profile': 'private' } })).rejects.toThrow();
    await expect(guarded('https://example.com/rest/v1/roles')).rejects.toThrow();
  });
  it('leaves binary Storage requests intact', async () => {
    const { guarded, transport } = setup();
    await guarded(`${url}/storage/v1/object/test/file`, { method: 'POST', body: 'binary' });
    const req = transport.mock.calls[0][0] as Request;
    expect(await req.text()).toBe('binary');
    expect(new URL(req.url).searchParams.has('choir_id')).toBe(false);
  });
  it.each([null, 'text', 42])('rejects malformed payload %s', async (payload) => {
    const { guarded } = setup();
    await expect(guarded(`${url}/rest/v1/roles`, { method: 'POST', body: JSON.stringify(payload) })).rejects.toThrow();
  });
  it('requires a valid choir identifier', () => {
    expect(() => createTenantFetch(url, '')).toThrow();
  });
});

describe('verified membership bootstrap', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it('looks up a database membership then scopes the privileged client', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service');
    const transport = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ choir_id: a }), { status: 200 }))
      .mockResolvedValueOnce(new Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', transport);
    const client = await createTenantServiceClient('verified-user');
    await client.from('repertoire').select('id');
    const bootstrapUrl = new URL(String(transport.mock.calls[0][0]));
    expect(bootstrapUrl.searchParams.get('auth_user_id')).toBe('eq.verified-user');
    expect(new URL((transport.mock.calls[1][0] as Request).url).searchParams.get('choir_id')).toBe(`eq.${a}`);
  });
  it('rejects a user without a membership instead of falling back to the only choir', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', url);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 200 })));
    await expect(createTenantServiceClient('unregistered-user')).rejects.toThrow('üyeliği');
  });
});
