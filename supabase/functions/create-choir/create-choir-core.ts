export interface CreateChoirCommand {
  choirName: string;
  choirSlug: string;
  founderAuthUserId: string;
  founderFirstName: string;
  founderLastName: string;
}

export interface CreatedChoir {
  choirId: string;
  memberId: string;
  choirSlug: string;
  choirName: string;
}

export interface PublicFunctionError {
  status: number;
  message: string;
}

interface RpcCreatedChoir {
  choir_id?: unknown;
  member_id?: unknown;
  choir_slug?: unknown;
  choir_name?: unknown;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function requiredText(
  candidate: Record<string, unknown>,
  key: string,
  minimum: number,
  maximum: number,
): string {
  const value = candidate[key];
  if (typeof value !== 'string') throw new Error('Geçersiz işlem gövdesi.');
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new Error('Geçersiz işlem gövdesi.');
  }
  return normalized;
}

/** Validates only the documented 007 request fields and discards extra input. */
export function parseCreateChoirCommand(value: unknown): CreateChoirCommand {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Geçersiz işlem gövdesi.');
  }

  const candidate = value as Record<string, unknown>;
  const choirSlug = requiredText(candidate, 'choirSlug', 3, 63).toLowerCase();
  const founderAuthUserId = requiredText(candidate, 'founderAuthUserId', 36, 36);
  if (!SLUG_PATTERN.test(choirSlug) || !UUID_PATTERN.test(founderAuthUserId)) {
    throw new Error('Geçersiz işlem gövdesi.');
  }

  return {
    choirName: requiredText(candidate, 'choirName', 2, 120),
    choirSlug,
    founderAuthUserId,
    founderFirstName: requiredText(candidate, 'founderFirstName', 1, 80),
    founderLastName: requiredText(candidate, 'founderLastName', 1, 80),
  };
}

/** Converts database error classes to stable responses without leaking internals. */
export function mapCreateChoirError(code: string | undefined): PublicFunctionError {
  switch (code) {
    case '42501':
      return { status: 403, message: 'Bu işlem için platform yetkisi gerekli.' };
    case '22023':
      return { status: 400, message: 'Koro bilgileri geçerli değil.' };
    case '23505':
      return { status: 409, message: 'Bu koro kısa adı kullanımda.' };
    default:
      return { status: 500, message: 'Koro oluşturulamadı.' };
  }
}

/** Accepts only the single-row RPC result expected from the atomic transaction. */
export function parseCreatedChoir(value: unknown): CreatedChoir {
  if (!Array.isArray(value) || value.length !== 1 || !value[0] || typeof value[0] !== 'object') {
    throw new Error('Koro oluşturma sonucu doğrulanamadı.');
  }

  const row = value[0] as RpcCreatedChoir;
  if (
    typeof row.choir_id !== 'string'
    || typeof row.member_id !== 'string'
    || typeof row.choir_slug !== 'string'
    || typeof row.choir_name !== 'string'
    || !UUID_PATTERN.test(row.choir_id)
    || !UUID_PATTERN.test(row.member_id)
  ) {
    throw new Error('Koro oluşturma sonucu doğrulanamadı.');
  }

  return {
    choirId: row.choir_id,
    memberId: row.member_id,
    choirSlug: row.choir_slug,
    choirName: row.choir_name,
  };
}
