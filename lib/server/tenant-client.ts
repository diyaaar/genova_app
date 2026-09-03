import { createClient } from '@supabase/supabase-js';
import { createSupabaseServiceClient } from './supabase-auth';
import { createTenantFetch } from '@/supabase/functions/_shared/tenant-fetch';

/** Call only after requireAuthenticatedUser()/auth.getUser() verified authUserId. */
export async function createTenantServiceClient(authUserId: string) {
  const admin = createSupabaseServiceClient();
  const { data: member, error } = await admin.from('choir_members')
    .select('choir_id').eq('auth_user_id', authUserId).single();
  if (error || !member?.choir_id) throw new Error('Geçerli koro üyeliği bulunamadı.');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: createTenantFetch(process.env.NEXT_PUBLIC_SUPABASE_URL!, member.choir_id) },
  });
}
