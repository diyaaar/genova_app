import { createNativeWebViewRuntimeConfig, type NativeWebViewRuntimeConfig } from '../webview/runtime-config';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export interface ComposedWebViewRuntimeConfig {
  appOrigin: string;
  supabaseUrl: string;
  credentialUrl: string;
  anonKey: string;
  email: string;
  choristEmail: string;
  choirA: string;
  choirB: string;
  memberA: string;
  targetMember: string;
  announcementId: string;
  webView: NativeWebViewRuntimeConfig;
}

function required(environment: Record<string, string | undefined>, name: string): string {
  const value = environment[name];
  if (!value) throw new Error(`033 yerel kabul değişkeni eksik: ${name}`);
  return value;
}

function exactOrigin(value: string, port: string): string {
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port !== port
    || url.username || url.password || !['', '/'].includes(url.pathname) || url.search || url.hash) {
    throw new Error('033 yalnız tam yerel kabul originlerini kullanır.');
  }
  return url.origin;
}

export function exactComposedCredentialUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port !== '18034'
    || url.username || url.password || url.pathname !== '/credentials' || url.search || url.hash) {
    throw new Error('033 parola kanalı yalnız tam yerel tek-kullanımlık URL olabilir.');
  }
  return url.toString();
}

function assertLocalAnonKey(value: string): string {
  const parts = value.split('.');
  if (parts.length !== 3) throw new Error('033 yerel anon anahtarı geçersiz.');
  let claims: { iss?: unknown; role?: unknown };
  try {
    const encoded = (parts[1] ?? '').replace(/-/gu, '+').replace(/_/gu, '/');
    const padded = encoded.padEnd(Math.ceil(encoded.length / 4) * 4, '=');
    claims = JSON.parse(globalThis.atob(padded)) as typeof claims;
  } catch {
    throw new Error('033 yerel anon anahtarı geçersiz.');
  }
  if (claims.iss !== 'supabase-demo' || claims.role !== 'anon') {
    throw new Error('033 yalnız yerel Supabase anon anahtarını kabul eder.');
  }
  return value;
}

/** Refuses any hosted endpoint, non-local JWT or non-synthetic identity before client creation. */
export function readComposedWebViewRuntimeConfig(
  environment: Record<string, string | undefined>,
): ComposedWebViewRuntimeConfig {
  if (environment.EXPO_PUBLIC_GENOVA_033_ACCEPTANCE !== '1') {
    throw new Error('033 yerel kabul bayrağı etkin değil.');
  }
  const appOrigin = exactOrigin(required(environment, 'EXPO_PUBLIC_GENOVA_033_APP_ORIGIN'), '18033');
  const supabaseUrl = exactOrigin(required(environment, 'EXPO_PUBLIC_SUPABASE_URL'), '54321');
  const credentialUrl = exactComposedCredentialUrl(required(environment, 'EXPO_PUBLIC_GENOVA_033_CREDENTIAL_URL'));
  const email = required(environment, 'EXPO_PUBLIC_GENOVA_033_EMAIL');
  if (!email.startsWith('033-composed-') || !email.endsWith('@example.invalid')) {
    throw new Error('033 yalnız sentetik example.invalid hesabını kabul eder.');
  }
  const choristEmail = required(environment, 'EXPO_PUBLIC_GENOVA_033_CHORIST_EMAIL');
  if (!choristEmail.startsWith('033-chorist-') || !choristEmail.endsWith('@example.invalid')) {
    throw new Error('033 yalnız sentetik korist example.invalid hesabını kabul eder.');
  }
  const choirA = required(environment, 'EXPO_PUBLIC_GENOVA_033_CHOIR_A');
  const choirB = required(environment, 'EXPO_PUBLIC_GENOVA_033_CHOIR_B');
  const memberA = required(environment, 'EXPO_PUBLIC_GENOVA_033_MEMBER_A');
  const targetMember = required(environment, 'EXPO_PUBLIC_GENOVA_033_TARGET_MEMBER');
  const announcementId = required(environment, 'EXPO_PUBLIC_GENOVA_033_ANNOUNCEMENT_ID');
  if (![choirA, choirB, memberA, targetMember, announcementId].every((value) => UUID_PATTERN.test(value))
    || choirA === choirB || memberA === targetMember) {
    throw new Error('033 sentetik fixture kimlikleri geçersiz.');
  }
  return Object.freeze({
    appOrigin,
    supabaseUrl,
    credentialUrl,
    anonKey: assertLocalAnonKey(required(environment, 'EXPO_PUBLIC_SUPABASE_ANON_KEY')),
    email,
    choristEmail,
    choirA,
    choirB,
    memberA,
    targetMember,
    announcementId,
    webView: createNativeWebViewRuntimeConfig({
      initialPath: '/announcements',
      isDevelopment: true,
      developmentOrigin: appOrigin,
      protectedFileOrigins: [supabaseUrl],
    }),
  });
}
