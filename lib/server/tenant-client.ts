import { createClient } from '@supabase/supabase-js';
import { createSupabaseServiceClient, createSupabaseUserClient } from './supabase-auth';
import { createTenantFetch } from '@/supabase/functions/_shared/tenant-fetch';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Builds a privileged client only after resolving the caller's active choir
 * through their verified JWT session. Callers must pass the user and token
 * returned together by requireAuthenticatedUser().
 */
export async function createTenantServiceClient(authUserId: string, accessToken: string) {
  const userClient = createSupabaseUserClient(accessToken);
  const { data: activeChoirId, error: activeChoirError } = await userClient.rpc('current_choir_id');
  if (activeChoirError || typeof activeChoirId !== 'string' || !UUID_PATTERN.test(activeChoirId)) {
    throw new Error('Geçerli aktif koro seçimi bulunamadı.');
  }

  const admin = createSupabaseServiceClient();
  const { data: member, error } = await admin.from('choir_members')
    .select('choir_id')
    .eq('auth_user_id', authUserId)
    .eq('choir_id', activeChoirId)
    .maybeSingle();
  if (error || !member?.choir_id) throw new Error('Geçerli koro üyeliği bulunamadı.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: createTenantFetch(process.env.NEXT_PUBLIC_SUPABASE_URL!, activeChoirId) },
  });
}
