import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { resolveSupabasePublicKey } from '../create-choir/create-choir-core.ts';
import { UploadError } from '../repertoire-upload/stream.ts';
import type { AssignmentUploadActor } from './handler.ts';

export function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

/** Verifies the bearer and resolves only the server-confirmed active choir.
 * Assignment/member/target/lock authorization remains inside the commit RPC.
 */
export async function authorizeAssignmentActor(token: string): Promise<AssignmentUploadActor> {
  const key = resolveSupabasePublicKey(
    Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'), Deno.env.get('SUPABASE_ANON_KEY'),
  );
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
    const encoded = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(encoded ?? ''));
    if (typeof payload.session_id === 'string') sessionId = payload.session_id;
  } catch { throw new UploadError('unauthorized', 401); }
  return { userId: data.user.id, sessionId, choirId };
}
