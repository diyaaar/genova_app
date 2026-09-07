import { supabase } from '@/lib/supabase';
import { INVITE_TOKEN_PATTERN } from '@/lib/invite-token-store';

export interface ChoirInvitation {
  id: string; email: string; first_name: string; last_name: string; voice_group: string;
  expires_at: string; accepted_at: string | null; revoked_at: string | null;
}
/** User-token Edge API; token is returned once and must never be stored in analytics/cache. */
export async function invitationCommand<T>(body: Record<string, string>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('choir-invitations', { body });
  if (error) {
    let message = 'Davet işlemi tamamlanamadı. Yeniden deneyin.';
    if (error.context instanceof Response) {
      const result = await error.context.json().catch(() => null);
      if (typeof result?.error === 'string') message = result.error;
    }
    throw new Error(message);
  }
  if (!data || typeof data !== 'object') throw new Error('Davet yanıtı geçersiz.');
  return data as T;
}

export function invitationTokenFromHash(hash: string): string | null {
  if (!hash.startsWith('#')) return null;
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('invite');
  return token && INVITE_TOKEN_PATTERN.test(token) ? token : null;
}

export function invitationStatus(invitation: ChoirInvitation, now = Date.now()) {
  if (invitation.accepted_at) return 'Kabul edildi';
  if (invitation.revoked_at) return 'İptal edildi';
  if (Date.parse(invitation.expires_at) <= now) return 'Süresi doldu';
  return 'Bekliyor';
}
