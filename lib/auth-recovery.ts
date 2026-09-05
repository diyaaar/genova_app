export const RECOVERY_PASSWORD_MIN_LENGTH = 8;
export const RECOVERY_PASSWORD_MAX_LENGTH = 72;
export const RECOVERY_PASSWORD_MAX_BYTES = 72;

export type RecoveryPasswordValidation =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Validates the password pair before Supabase receives a recovery update.
 * The upper bound avoids passwords whose trailing bytes may not be represented
 * consistently by password hash implementations.
 */
export function validateRecoveryPassword(
  password: string,
  confirmation: string,
): RecoveryPasswordValidation {
  if (!password || !confirmation) {
    return { ok: false, message: 'Lütfen iki şifre alanını da doldurun.' };
  }

  if (password.length < RECOVERY_PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `Yeni şifre en az ${RECOVERY_PASSWORD_MIN_LENGTH} karakter olmalıdır.`,
    };
  }

  if (new TextEncoder().encode(password).length > RECOVERY_PASSWORD_MAX_BYTES) {
    return {
      ok: false,
      message: 'Yeni şifre Türkçe karakterler dahil 72 baytı geçmemelidir.',
    };
  }

  if (password !== confirmation) {
    return { ok: false, message: 'Yeni şifre ve tekrar şifresi eşleşmiyor.' };
  }

  return { ok: true };
}
