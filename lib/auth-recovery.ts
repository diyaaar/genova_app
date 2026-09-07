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

/**
 * The single answer shown after a reset request, whatever the address was.
 * A different answer for a known and an unknown address would turn the form
 * into an account-existence oracle.
 */
export const RECOVERY_REQUEST_NOTICE =
  'Bu adres kayıtlıysa şifre sıfırlama bağlantısı gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.';

export type RecoveryEmailValidation =
  | { ok: true; email: string }
  | { ok: false; message: string };

/**
 * Checks the address before any network call. Deliberately shallow: the only
 * authority on whether an address exists is the auth provider, and this must
 * not become a way to probe it.
 */
export function validateRecoveryEmail(value: string): RecoveryEmailValidation {
  const email = value.trim();
  if (!email) {
    return { ok: false, message: 'Lütfen e-posta adresinizi yazın.' };
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) {
    return { ok: false, message: 'Geçerli bir e-posta adresi yazın.' };
  }
  return { ok: true, email };
}
