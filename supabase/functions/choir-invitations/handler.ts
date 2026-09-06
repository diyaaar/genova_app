export interface InvitationClient {
  auth: { getUser(token: string): Promise<{ data: { user: { id: string } | null }; error: unknown }> };
  rpc(name: string, args: Record<string, unknown>): PromiseLike<{ data: unknown; error: { code?: string } | null }>;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Validate transport shape only; DB remains authoritative for session, choir and role. */
export function parseCommand(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid body');
  const body = value as Record<string, unknown>;
  const { action, ...payload } = body;
  const fields: Record<string, string[]> = {
    create: ['choirId', 'email', 'firstName', 'lastName', 'voiceGroup'],
    list: ['choirId'], revoke: ['choirId', 'invitationId'], accept: ['token'],
  };
  if (typeof action !== 'string' || !Object.hasOwn(fields, action)) throw new Error('Invalid action');
  const required = fields[action];
  if (Object.keys(payload).length !== required.length || required.some(key => typeof payload[key] !== 'string')) {
    throw new Error('Invalid fields');
  }
  if (action === 'accept') {
    if (!/^[a-f0-9]{64}$/.test(payload.token as string)) throw new Error('Invalid token');
  } else if (!uuid.test(payload.choirId as string)) throw new Error('Invalid choir');
  if (action === 'revoke' && !uuid.test(payload.invitationId as string)) throw new Error('Invalid id');
  if (action === 'create') {
    const email = (payload.email as string).trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email');
    payload.email = email;
    for (const key of ['firstName', 'lastName']) {
      payload[key] = (payload[key] as string).trim();
      if (!(payload[key] as string).length || (payload[key] as string).length > 80) throw new Error('Invalid name');
    }
    if (!['Soprano', 'Alto', 'Tenor', 'Bass'].includes(payload.voiceGroup as string)) throw new Error('Invalid voice');
  }
  return { action, payload };
}

/** Request-scoped JWT is preserved through RPC; never log body/token or expose DB errors. */
export function createInvitationHandler(makeClient: (authorization: string) => InvitationClient) {
  const response = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers: cors });
  return async (request: Request): Promise<Response> => {
    if (request.method === 'OPTIONS') return response(200, {});
    if (request.method !== 'POST') return response(405, { error: 'Yöntem desteklenmiyor.' });
    const authorization = request.headers.get('Authorization') ?? '';
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return response(401, { error: 'Giriş yapmalısınız.' });
    try {
      const client = makeClient(authorization);
      const user = await client.auth.getUser(token);
      if (user.error || !user.data.user) return response(401, { error: 'Oturum geçersiz.' });
      // Bound actual bytes, including chunked requests without Content-Length.
      const reader = request.body?.getReader();
      let size = 0;
      const chunks: Uint8Array[] = [];
      if (reader) while (true) {
        const next = await reader.read();
        if (next.done) break;
        size += next.value.length;
        if (size > 4096) { await reader.cancel(); return response(413, { error: 'İstek çok büyük.' }); }
        chunks.push(next.value);
      }
      let command;
      try {
        const bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        command = parseCommand(JSON.parse(new TextDecoder().decode(bytes)));
      } catch { return response(400, { error: 'Davet bilgileri geçersiz.' }); }
      const result = await client.rpc('choir_invitation_command', { p_action: command.action, p_payload: command.payload });
      if (result.error) {
        const code = result.error.code;
        if (code === '42501') return response(403, { error: 'Bu işlem için doğrulanmış hesap ve uygun yetki gerekiyor.' });
        if (code === '23505') return response(409, { error: 'Bu koroda üyelik zaten var.' });
        if (code === '54000') return response(429, { error: 'Davet sınırına ulaşıldı. Daha sonra tekrar deneyin.' });
        if (code === '22023' || code === '22P02') return response(400, { error: 'Davet geçersiz, kullanılmış, iptal edilmiş veya bu hesaba ait değil.' });
        return response(500, { error: 'Davet işlemi tamamlanamadı.' });
      }
      return response(command.action === 'create' ? 201 : 200, result.data);
    } catch { return response(500, { error: 'Davet servisine ulaşılamadı.' }); }
  };
}
