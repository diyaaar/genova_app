import { describe, expect, it } from 'vitest';
import {
  RECOVERY_PASSWORD_MAX_BYTES,
  RECOVERY_PASSWORD_MAX_LENGTH,
  RECOVERY_REQUEST_NOTICE,
  validateRecoveryEmail,
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

describe('validateRecoveryEmail', () => {
  it('accepts a plausible address and trims it', () => {
    expect(validateRecoveryEmail('  korist@example.com ')).toEqual({
      ok: true,
      email: 'korist@example.com',
    });
  });

  it('requires a value', () => {
    expect(validateRecoveryEmail('   ')).toEqual({
      ok: false,
      message: 'Lütfen e-posta adresinizi yazın.',
    });
  });

  it('rejects addresses that cannot be delivered to', () => {
    for (const value of ['korist', 'korist@', '@example.com', 'korist@example', 'a b@example.com']) {
      expect(validateRecoveryEmail(value).ok).toBe(false);
    }
    expect(validateRecoveryEmail(`${'a'.repeat(250)}@example.com`).ok).toBe(false);
  });

  it('answers the same way for every address, so it cannot probe accounts', () => {
    expect(RECOVERY_REQUEST_NOTICE).toContain('kayıtlıysa');
  });
});
