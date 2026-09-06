// @ts-nocheck — Deno entrypoint; request handler is typechecked and tested by web tooling.
import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import { resolveSupabasePublicKey } from '../create-choir/create-choir-core.ts';
import { createInvitationHandler } from './handler.ts';

Deno.serve(createInvitationHandler((authorization) => {
  const url = Deno.env.get('SUPABASE_URL');
  const key = resolveSupabasePublicKey(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'), Deno.env.get('SUPABASE_ANON_KEY'));
  if (!url || !key) throw new Error('Missing configuration');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
}));
