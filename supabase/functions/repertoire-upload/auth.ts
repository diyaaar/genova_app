import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { resolveSupabasePublicKey } from '../create-choir/create-choir-core.ts';
import { UploadError } from './stream.ts';
import type { UploadActor } from './handler.ts';

export function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

/** Verifies the exact bearer with Auth, then resolves its server-confirmed active choir. */
export async function authorizeRepertoireManager(token: string): Promise<UploadActor> {
  const key = resolveSupabasePublicKey(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'), Deno.env.get('SUPABASE_ANON_KEY'));
  if (!key) throw new Error('Missing public key');
  const client = createClient(requiredEnv('SUPABASE_URL'), key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new UploadError('unauthorized', 401);
  const { data: choirId, error: choirError } = await client.rpc('current_choir_id');
  if (choirError || typeof choirId !== 'string') throw new UploadError('forbidden', 403);
  let sessionId: string | null = null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.session_id === 'string') sessionId = payload.session_id;
  } catch { throw new UploadError('unauthorized', 401); }
  return { userId: data.user.id, sessionId, choirId };
}
