// @ts-nocheck -- Supabase Edge Function runtime resolves Deno and npm imports.
import { createClient } from 'npm:@supabase/supabase-js@2.112.4';
import nodemailer from 'npm:nodemailer@7.0.13';
import {
  buildRecoveryEmail,
  countCompleted,
  formatRandomPassword,
  getRecoveryMarker,
  hasValidRecoveryCredentials,
  mergeRecoveryMarker,
  parseRecoveryCommand,
  selectAffectedUsers,
  validateRecoveryRedirect,
} from './recovery-core.ts';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

function json(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error('Kurtarma yapılandırması eksik.');
  return value;
}

async function authorize(request: Request): Promise<boolean> {
  const apiKey = request.headers.get('x-recovery-api-key') ?? '';
  const executionKey = request.headers.get('x-recovery-key') ?? '';
  const expectedApiKey = requiredEnv('RECOVERY_API_KEY_006');
  const expectedExecutionKey = requiredEnv('RECOVERY_EXECUTION_KEY_006');
  return hasValidRecoveryCredentials(
    apiKey,
    expectedApiKey,
    executionKey,
    expectedExecutionKey,
  );
}

async function listAllUsers(adminClient: ReturnType<typeof createClient>) {
  const users = [];
  const perPage = 1000;
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error('Auth kullanıcı envanteri okunamadı.');
    users.push(...data.users);
    if (data.users.length < perPage) return users;
  }
  throw new Error('Auth kullanıcı sayfalaması güvenli sınırı aştı.');
}

function createMailer() {
  const port = Number(requiredEnv('SMTP_PORT'));
  if (!Number.isInteger(port) || port <= 0) throw new Error('SMTP yapılandırması geçersiz.');
  return nodemailer.createTransport({
    host: requiredEnv('SMTP_HOST'),
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: {
      user: requiredEnv('SMTP_USER'),
      pass: requiredEnv('SMTP_PASS'),
    },
  });
}

function randomPassword(): string {
  return formatRandomPassword(crypto.getRandomValues(new Uint8Array(32)));
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'Yalnız POST kabul edilir.' });

  let completedCount = 0;
  let stage = 'configuration';
  try {
    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!(await authorize(request))) {
      return json(401, { error: 'Yetkisiz işlem.' });
    }

    stage = 'request-validation';
    const command = parseRecoveryCommand(await request.json().catch(() => null));
    const redirectUrl = validateRecoveryRedirect(requiredEnv('RECOVERY_REDIRECT_URL'));

    stage = 'cohort-audit';
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const affectedUsers = selectAffectedUsers(await listAllUsers(adminClient));
    completedCount = countCompleted(affectedUsers);

    stage = 'smtp-verification';
    const mailer = createMailer();
    await mailer.verify();

    if (command.mode === 'audit') {
      mailer.close();
      return json(200, {
        mode: 'audit',
        targetCount: affectedUsers.length,
        completedCount,
        pendingCount: affectedUsers.length - completedCount,
        smtp: 'ready',
        redirectHost: redirectUrl.hostname,
      });
    }

    for (const user of affectedUsers) {
      const marker = getRecoveryMarker(user.app_metadata);
      if (marker.email_sent_at) continue;

      let metadata = user.app_metadata ?? {};
      if (!marker.password_rotated_at) {
        stage = 'password-rotation';
        const rotatedAt = new Date().toISOString();
        metadata = mergeRecoveryMarker(metadata, { password_rotated_at: rotatedAt });
        const { error } = await adminClient.auth.admin.updateUserById(user.id, {
          password: randomPassword(),
          app_metadata: metadata,
        });
        if (error) throw new Error('Hesap parolası güvenli biçimde değiştirilemedi.');
      }

      stage = 'link-generation';
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: user.email,
        options: { redirectTo: redirectUrl.toString() },
      });
      const actionLink = linkData?.properties?.action_link;
      if (linkError || !actionLink) throw new Error('Kurtarma bağlantısı üretilemedi.');

      stage = 'email-delivery';
      const message = buildRecoveryEmail(actionLink);
      await mailer.sendMail({
        from: requiredEnv('SMTP_FROM'),
        to: user.email,
        ...message,
      });

      stage = 'delivery-marker';
      const sentAt = new Date().toISOString();
      const { error: markerError } = await adminClient.auth.admin.updateUserById(user.id, {
        app_metadata: mergeRecoveryMarker(metadata, { email_sent_at: sentAt }),
      });
      if (markerError) throw new Error('Kurtarma teslimat durumu kaydedilemedi.');
      completedCount += 1;
    }

    mailer.close();
    return json(200, {
      mode: 'execute',
      targetCount: affectedUsers.length,
      completedCount,
      pendingCount: affectedUsers.length - completedCount,
    });
  } catch {
    return json(500, {
      error: 'Kurtarma işlemi tamamlanamadı.',
      completedCount,
      stage,
    });
  }
});
