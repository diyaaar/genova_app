import { describe, expect, it } from 'vitest';
import {
  RECOVERY_PASSWORD_MAX_BYTES,
  RECOVERY_PASSWORD_MAX_LENGTH,
  validateRecoveryPassword,
} from './auth-recovery';

describe('validateRecoveryPassword', () => {
  it('accepts a matching password inside the supported bounds', () => {
    expect(validateRecoveryPassword('guvenli-123', 'guvenli-123')).toEqual({ ok: true });
  });

  it('requires both fields', () => {
    expect(validateRecoveryPassword('', '')).toEqual({
      ok: false,
      message: 'Lütfen iki şifre alanını da doldurun.',
    });
  });

  it('rejects short, oversized and mismatched values', () => {
    expect(validateRecoveryPassword('kisa', 'kisa').ok).toBe(false);
    expect(validateRecoveryPassword(
      'a'.repeat(RECOVERY_PASSWORD_MAX_LENGTH + 1),
      'a'.repeat(RECOVERY_PASSWORD_MAX_LENGTH + 1),
    ).ok).toBe(false);
    expect(validateRecoveryPassword(
      'ğ'.repeat((RECOVERY_PASSWORD_MAX_BYTES / 2) + 1),
      'ğ'.repeat((RECOVERY_PASSWORD_MAX_BYTES / 2) + 1),
    ).ok).toBe(false);
    expect(validateRecoveryPassword('guvenli-123', 'baska-123').ok).toBe(false);
  });
});
