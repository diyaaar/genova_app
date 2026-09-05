// @ts-nocheck — Supabase Edge Functions run in Deno, outside the web tsconfig.
import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import {
  mapCreateChoirError,
  parseCreateChoirCommand,
  parseCreatedChoir,
  resolveSupabasePublicKey,
} from './create-choir-core.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse(405, { error: 'Yöntem desteklenmiyor.' });

  const authorization = request.headers.get('Authorization');
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!bearerMatch) return jsonResponse(401, { error: 'Yetkilendirme eksik.' });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabasePublicKey = resolveSupabasePublicKey(
    Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'),
    Deno.env.get('SUPABASE_ANON_KEY'),
  );
  if (!supabaseUrl || !supabasePublicKey) {
    return jsonResponse(500, { error: 'Koro oluşturma servisi hazır değil.' });
  }

  const supabase = createClient(supabaseUrl, supabasePublicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
  const { data: { user }, error: authError } = await supabase.auth.getUser(bearerMatch[1]);
  if (authError || !user) return jsonResponse(401, { error: 'Geçersiz oturum.' });

  let command;
  try {
    command = parseCreateChoirCommand(await request.json());
  } catch {
    return jsonResponse(400, { error: 'Geçersiz işlem gövdesi.' });
  }

  const { data, error } = await supabase.rpc('create_operator_choir', {
    p_choir_name: command.choirName,
    p_choir_slug: command.choirSlug,
    p_founder_auth_user_id: command.founderAuthUserId,
    p_founder_first_name: command.founderFirstName,
    p_founder_last_name: command.founderLastName,
  });

  if (error) {
    const publicError = mapCreateChoirError(error.code);
    return jsonResponse(publicError.status, { error: publicError.message });
  }

  try {
    return jsonResponse(201, { choir: parseCreatedChoir(data) });
  } catch {
    return jsonResponse(500, { error: 'Koro oluşturma sonucu doğrulanamadı.' });
  }
});
