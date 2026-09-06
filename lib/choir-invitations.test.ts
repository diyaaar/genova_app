import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }));
import { invitationTokenFromHash, invitationStatus } from './choir-invitations';

describe('invitation link and status', () => {
  it('accepts only a full token from a fragment', () => {
    expect(invitationTokenFromHash('#invite='+'a'.repeat(64))).toBe('a'.repeat(64));
    expect(invitationTokenFromHash('#invite=short')).toBeNull();
    expect(invitationTokenFromHash('?invite='+'a'.repeat(64))).toBeNull();
    expect(invitationTokenFromHash('#access_token=secret')).toBeNull();
  });
  it('prioritizes terminal status and treats exact expiry as expired', () => {
    const base={id:'1',email:'a@b.com',first_name:'A',last_name:'B',voice_group:'Alto',expires_at:'2026-01-01T00:00:00Z',accepted_at:null,revoked_at:null};
    expect(invitationStatus(base,Date.parse(base.expires_at))).toBe('Süresi doldu');
    expect(invitationStatus({...base,accepted_at:'2025-01-01'},0)).toBe('Kabul edildi');
    expect(invitationStatus({...base,revoked_at:'2025-01-01'},0)).toBe('İptal edildi');
  });
});
