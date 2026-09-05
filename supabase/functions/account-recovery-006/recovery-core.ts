export const AFFECTED_CREATED_AT_START = '2026-04-16T07:40:00.000Z';
export const AFFECTED_CREATED_AT_END = '2026-04-16T07:41:00.000Z';
export const EXPECTED_AFFECTED_USERS = 27;
export const EXECUTE_CONFIRMATION = 'ROTATE_AND_NOTIFY_27_BOOTSTRAP_ACCOUNTS';
export const RECOVERY_STATE_KEY = 'security_recovery_006';

export type RecoveryMode = 'audit' | 'execute';

export interface RecoveryCandidate {
  id: string;
  email?: string | null;
  created_at: string;
  app_metadata?: Record<string, unknown> | null;
}

export interface RecoveryCommand {
  mode: RecoveryMode;
  confirmation?: string;
}

export async function secureEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = leftBytes.length ^ rightBytes.length;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

export async function hasValidRecoveryCredentials(
  apiKey: string,
  expectedApiKey: string,
  executionKey: string,
  expectedExecutionKey: string,
): Promise<boolean> {
  const [apiKeyMatches, executionKeyMatches] = await Promise.all([
    secureEqual(apiKey, expectedApiKey),
    secureEqual(executionKey, expectedExecutionKey),
  ]);
  return apiKeyMatches && executionKeyMatches;
}

export function validateRecoveryRedirect(value: string): URL {
  const redirectUrl = new URL(value);
  if (
    redirectUrl.protocol !== 'https:'
    || redirectUrl.hostname !== 'app.genesinovachoir.com'
    || redirectUrl.pathname !== '/auth/recovery'
    || redirectUrl.searchParams.get('recovery') !== '1'
  ) {
    throw new Error('Kurtarma yönlendirmesi doğrulanamadı.');
  }
  return redirectUrl;
}

export function formatRandomPassword(bytes: Uint8Array): string {
  if (bytes.length < 32) throw new Error('Yeterli parola entropisi üretilemedi.');
  return `${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}Aa1!`;
}

interface RecoveryMarker {
  password_rotated_at?: string;
  email_sent_at?: string;
}

export function parseRecoveryCommand(value: unknown): RecoveryCommand {
  if (!value || typeof value !== 'object') {
    throw new Error('Geçersiz işlem gövdesi.');
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.mode !== 'audit' && candidate.mode !== 'execute') {
    throw new Error('Geçersiz işlem modu.');
  }

  if (candidate.mode === 'execute' && candidate.confirmation !== EXECUTE_CONFIRMATION) {
    throw new Error('Canlı etki onayı eşleşmiyor.');
  }

  return {
    mode: candidate.mode,
    confirmation: typeof candidate.confirmation === 'string' ? candidate.confirmation : undefined,
  };
}

function isEmailIdentity(candidate: RecoveryCandidate): boolean {
  const provider = candidate.app_metadata?.provider;
  const providers = candidate.app_metadata?.providers;
  return provider === 'email' || (Array.isArray(providers) && providers.includes('email'));
}

/** Selects the immutable one-minute bootstrap cohort and fails closed on drift. */
export function selectAffectedUsers(users: RecoveryCandidate[]): RecoveryCandidate[] {
  const start = Date.parse(AFFECTED_CREATED_AT_START);
  const end = Date.parse(AFFECTED_CREATED_AT_END);
  const affected = users.filter((user) => {
    const createdAt = Date.parse(user.created_at);
    return Number.isFinite(createdAt) && createdAt >= start && createdAt < end;
  });

  if (affected.length !== EXPECTED_AFFECTED_USERS) {
    throw new Error('Beklenen hesap kümesi doğrulanamadı.');
  }

  const normalizedEmails = affected.map((user) => user.email?.trim().toLocaleLowerCase('en-US') ?? '');
  if (normalizedEmails.some((email) => !email) || new Set(normalizedEmails).size !== affected.length) {
    throw new Error('Hesap kümesinin e-posta bütünlüğü doğrulanamadı.');
  }

  if (affected.some((user) => !isEmailIdentity(user))) {
    throw new Error('Hesap kümesinde beklenmeyen kimlik sağlayıcısı bulundu.');
  }

  return affected;
}

export function getRecoveryMarker(metadata: Record<string, unknown> | null | undefined): RecoveryMarker {
  const marker = metadata?.[RECOVERY_STATE_KEY];
  if (!marker || typeof marker !== 'object' || Array.isArray(marker)) return {};
  const raw = marker as Record<string, unknown>;
  return {
    password_rotated_at: typeof raw.password_rotated_at === 'string' ? raw.password_rotated_at : undefined,
    email_sent_at: typeof raw.email_sent_at === 'string' ? raw.email_sent_at : undefined,
  };
}

export function mergeRecoveryMarker(
  metadata: Record<string, unknown> | null | undefined,
  update: RecoveryMarker,
): Record<string, unknown> {
  return {
    ...(metadata ?? {}),
    [RECOVERY_STATE_KEY]: {
      ...getRecoveryMarker(metadata),
      ...update,
    },
  };
}

export function countCompleted(users: RecoveryCandidate[]): number {
  return users.filter((user) => Boolean(getRecoveryMarker(user.app_metadata).email_sent_at)).length;
}

export function buildRecoveryEmail(actionLink: string): { subject: string; text: string; html: string } {
  const parsedLink = new URL(actionLink);
  if (parsedLink.protocol !== 'https:') {
    throw new Error('Güvenli kurtarma bağlantısı üretilemedi.');
  }

  const subject = 'Genova hesabınız için güvenlik güncellemesi';
  const escapedActionLink = actionLink
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  const text = [
    'Merhaba,',
    '',
    'Genova hesabınızın güvenliği için mevcut şifreniz geçersiz kılındı.',
    'Aşağıdaki tek kullanımlık bağlantıyı açarak yeni şifrenizi belirleyin:',
    actionLink,
    '',
    'Bu işlemi siz başlatmadıysanız da eski şifreniz artık kullanılamaz.',
  ].join('\n');
  const html = `
    <p>Merhaba,</p>
    <p>Genova hesabınızın güvenliği için mevcut şifreniz geçersiz kılındı.</p>
    <p><a href="${escapedActionLink}">Yeni şifrenizi belirleyin</a></p>
    <p>Bu işlemi siz başlatmadıysanız da eski şifreniz artık kullanılamaz.</p>
  `.trim();

  return { subject, text, html };
}
