import { describe, expect, it } from 'vitest';
import {
  mapCreateChoirError,
  parseCreateChoirCommand,
  parseCreatedChoir,
  resolveSupabasePublicKey,
} from './create-choir-core';

const FOUNDER_ID = '10000000-0000-4000-8000-000000000007';
const CHOIR_ID = '20000000-0000-4000-8000-000000000007';
const MEMBER_ID = '30000000-0000-4000-8000-000000000007';

describe('create choir 007 core', () => {
  it('prefers a rotatable publishable key and safely falls back to legacy anon', () => {
    expect(resolveSupabasePublicKey('{"default":"sb_publishable_live"}', 'legacy-anon'))
      .toBe('sb_publishable_live');
    expect(resolveSupabasePublicKey('{broken', 'legacy-anon')).toBe('legacy-anon');
    expect(resolveSupabasePublicKey(undefined, undefined)).toBeUndefined();
  });

  it('normalizes the documented command and ignores extra fields', () => {
    expect(parseCreateChoirCommand({
      choirName: ' Yeni Koro ',
      choirSlug: ' YENI-KORO ',
      founderAuthUserId: FOUNDER_ID,
      founderFirstName: ' Ada ',
      founderLastName: ' Lovelace ',
      founderEmail: 'caller-controlled@example.invalid',
    })).toEqual({
      choirName: 'Yeni Koro',
      choirSlug: 'yeni-koro',
      founderAuthUserId: FOUNDER_ID,
      founderFirstName: 'Ada',
      founderLastName: 'Lovelace',
    });
  });

  it('rejects malformed or oversized input', () => {
    expect(() => parseCreateChoirCommand(null)).toThrow('Geçersiz');
    expect(() => parseCreateChoirCommand({})).toThrow('Geçersiz');
    expect(() => parseCreateChoirCommand({
      choirName: 'Yeni Koro',
      choirSlug: 'geçersiz kısa ad',
      founderAuthUserId: FOUNDER_ID,
      founderFirstName: 'Ada',
      founderLastName: 'Lovelace',
    })).toThrow('Geçersiz');
    expect(() => parseCreateChoirCommand({
      choirName: 'A'.repeat(121),
      choirSlug: 'yeni-koro',
      founderAuthUserId: FOUNDER_ID,
      founderFirstName: 'Ada',
      founderLastName: 'Lovelace',
    })).toThrow('Geçersiz');
  });

  it('maps database error classes without exposing database messages', () => {
    expect(mapCreateChoirError('42501')).toEqual({
      status: 403,
      message: 'Bu işlem için platform yetkisi gerekli.',
    });
    expect(mapCreateChoirError('22023').status).toBe(400);
    expect(mapCreateChoirError('23505').status).toBe(409);
    expect(mapCreateChoirError('XX000')).toEqual({
      status: 500,
      message: 'Koro oluşturulamadı.',
    });
  });

  it('accepts only one complete atomic RPC result', () => {
    expect(parseCreatedChoir([{
      choir_id: CHOIR_ID,
      member_id: MEMBER_ID,
      choir_slug: 'yeni-koro',
      choir_name: 'Yeni Koro',
    }])).toEqual({
      choirId: CHOIR_ID,
      memberId: MEMBER_ID,
      choirSlug: 'yeni-koro',
      choirName: 'Yeni Koro',
    });
    expect(() => parseCreatedChoir([])).toThrow('doğrulanamadı');
    expect(() => parseCreatedChoir([{ choir_id: 'not-a-uuid' }])).toThrow('doğrulanamadı');
  });
});
