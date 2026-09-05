import { describe, expect, it } from 'vitest';
import {
  AFFECTED_CREATED_AT_START,
  EXECUTE_CONFIRMATION,
  EXPECTED_AFFECTED_USERS,
  buildRecoveryEmail,
  countCompleted,
  formatRandomPassword,
  getRecoveryMarker,
  hasValidRecoveryCredentials,
  mergeRecoveryMarker,
  parseRecoveryCommand,
  selectAffectedUsers,
  validateRecoveryRedirect,
  type RecoveryCandidate,
} from './recovery-core';

function cohort(size = EXPECTED_AFFECTED_USERS): RecoveryCandidate[] {
  return Array.from({ length: size }, (_, index) => ({
    id: `user-${index}`,
    email: `user-${index}@example.test`,
    created_at: AFFECTED_CREATED_AT_START,
    app_metadata: { provider: 'email', providers: ['email'], existing: true },
  }));
}

describe('account recovery 006 core', () => {
  it('selects only the exact bootstrap cohort', () => {
    const users = [
      ...cohort(),
      { id: 'later', email: 'later@example.test', created_at: '2026-04-16T07:41:00.000Z', app_metadata: { provider: 'email' } },
    ];
    expect(selectAffectedUsers(users)).toHaveLength(EXPECTED_AFFECTED_USERS);
  });

  it('fails closed when count, email or provider drifts', () => {
    expect(() => selectAffectedUsers(cohort(26))).toThrow('Beklenen hesap kümesi');
    const duplicate = cohort();
    duplicate[1].email = duplicate[0].email;
    expect(() => selectAffectedUsers(duplicate)).toThrow('e-posta bütünlüğü');
    const oauth = cohort();
    oauth[0].app_metadata = { provider: 'google', providers: ['google'] };
    expect(() => selectAffectedUsers(oauth)).toThrow('kimlik sağlayıcısı');
  });

  it('requires an explicit execution confirmation', () => {
    expect(parseRecoveryCommand({ mode: 'audit' })).toEqual({ mode: 'audit', confirmation: undefined });
    expect(() => parseRecoveryCommand({ mode: 'execute' })).toThrow('Canlı etki onayı');
    expect(parseRecoveryCommand({ mode: 'execute', confirmation: EXECUTE_CONFIRMATION }).mode).toBe('execute');
  });

  it('requires both independent service credentials', async () => {
    await expect(hasValidRecoveryCredentials('api', 'api', 'run', 'run')).resolves.toBe(true);
    await expect(hasValidRecoveryCredentials('wrong', 'api', 'run', 'run')).resolves.toBe(false);
    await expect(hasValidRecoveryCredentials('api', 'api', 'wrong', 'run')).resolves.toBe(false);
  });

  it('accepts only the production recovery route and formats a strong random password', () => {
    expect(validateRecoveryRedirect(
      'https://app.genesinovachoir.com/auth/recovery?recovery=1',
    ).hostname).toBe('app.genesinovachoir.com');
    expect(() => validateRecoveryRedirect('https://example.test/auth/recovery?recovery=1')).toThrow();
    expect(() => validateRecoveryRedirect('https://app.genesinovachoir.com/?recovery=1')).toThrow();
    const password = formatRandomPassword(new Uint8Array(32).fill(15));
    expect(password).toHaveLength(68);
    expect(password.endsWith('Aa1!')).toBe(true);
    expect(() => formatRandomPassword(new Uint8Array(31))).toThrow('entropisi');
  });

  it('preserves metadata and tracks idempotent progress', () => {
    const users = cohort();
    users[0].app_metadata = mergeRecoveryMarker(users[0].app_metadata, {
      password_rotated_at: '2026-09-05T12:00:00.000Z',
      email_sent_at: '2026-09-05T12:01:00.000Z',
    });
    expect(getRecoveryMarker(users[0].app_metadata).email_sent_at).toBeTruthy();
    expect(users[0].app_metadata?.existing).toBe(true);
    expect(countCompleted(users)).toBe(1);
  });

  it('builds an HTTPS recovery message without a password', () => {
    const message = buildRecoveryEmail('https://example.test/recovery?token=opaque&next=1');
    expect(message.subject).toContain('güvenlik');
    expect(message.text).toContain('https://example.test/recovery?token=opaque&next=1');
    expect(message.html).toContain('token=opaque&amp;next=1');
    expect(message.text.toLocaleLowerCase('tr-TR')).not.toContain('geçici şifre');
    expect(() => buildRecoveryEmail('http://example.test/recovery')).toThrow('Güvenli');
  });
});
