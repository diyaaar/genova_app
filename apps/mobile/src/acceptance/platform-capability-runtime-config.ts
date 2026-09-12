export interface PlatformCapabilityRuntimeConfig {
  baseUrl: string;
}

/** Refuses any hosted or unguarded endpoint before the 032 acceptance app starts. */
export function readPlatformCapabilityRuntimeConfig(
  environment: Record<string, string | undefined>,
): PlatformCapabilityRuntimeConfig {
  if (environment.EXPO_PUBLIC_GENOVA_032_ACCEPTANCE !== '1') {
    throw new Error('032 yerel kabul bayrağı etkin değil.');
  }
  const rawUrl = environment.EXPO_PUBLIC_GENOVA_032_BASE_URL;
  const url = rawUrl ? new URL(rawUrl) : null;
  if (
    !url
    || url.protocol !== 'http:'
    || url.hostname !== '127.0.0.1'
    || url.port !== '18032'
    || (url.pathname !== '/' && url.pathname !== '')
    || url.username
    || url.password
    || url.search
    || url.hash
  ) {
    throw new Error('032 yalnız http://127.0.0.1:18032 yerel kabul sunucusunu kabul eder.');
  }
  return { baseUrl: 'http://127.0.0.1:18032' };
}
