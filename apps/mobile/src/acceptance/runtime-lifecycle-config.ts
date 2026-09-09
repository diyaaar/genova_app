const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface RuntimeLifecycleConfig {
  supabaseUrl: string;
  anonKey: string;
  email: string;
  password: string;
  choirA: string;
  choirB: string;
  fileId: string;
}

function required(env: Record<string, string | undefined>, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`021 yerel kabul değişkeni eksik: ${name}`);
  return value;
}

/** Refuses any hosted endpoint or non-synthetic identity before the acceptance app creates a client. */
export function readRuntimeLifecycleConfig(
  env: Record<string, string | undefined>,
): RuntimeLifecycleConfig {
  const supabaseUrl = required(env, 'EXPO_PUBLIC_SUPABASE_URL');
  const url = new URL(supabaseUrl);
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    url.port !== '54321'
  ) {
    throw new Error('021 yalnız 127.0.0.1:54321 yerel Supabase ortamında çalışır.');
  }
  const email = required(env, 'EXPO_PUBLIC_GENOVA_021_EMAIL');
  if (!email.startsWith('021-mobile-') || !email.endsWith('@example.invalid')) {
    throw new Error('021 yalnız sentetik example.invalid hesabını kabul eder.');
  }
  const choirA = required(env, 'EXPO_PUBLIC_GENOVA_021_CHOIR_A');
  const choirB = required(env, 'EXPO_PUBLIC_GENOVA_021_CHOIR_B');
  const fileId = required(env, 'EXPO_PUBLIC_GENOVA_021_FILE_ID');
  if (![choirA, choirB, fileId].every((value) => UUID_PATTERN.test(value))) {
    throw new Error('021 sentetik fixture kimlikleri geçersiz.');
  }
  if (choirA === choirB) throw new Error('021 iki farklı sentetik koro gerektirir.');

  return {
    supabaseUrl: url.toString().replace(/\/$/, ''),
    anonKey: required(env, 'EXPO_PUBLIC_SUPABASE_ANON_KEY'),
    email,
    password: required(env, 'EXPO_PUBLIC_GENOVA_021_PASSWORD'),
    choirA,
    choirB,
    fileId,
  };
}
