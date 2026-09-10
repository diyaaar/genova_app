export interface AudioRuntimeAcceptanceConfig {
  baseUrl: string;
}

/** Refuses non-loopback input before the synthetic native acceptance screen starts. */
export function readAudioRuntimeAcceptanceConfig(environment: Record<string, string | undefined>): AudioRuntimeAcceptanceConfig {
  if (environment.EXPO_PUBLIC_GENOVA_026_ACCEPTANCE !== '1') {
    throw new Error('026 acceptance flag is required.');
  }
  const rawUrl = environment.EXPO_PUBLIC_GENOVA_026_AUDIO_URL;
  let url: URL;
  try {
    url = new URL(rawUrl ?? '');
  } catch {
    throw new Error('026 local audio URL is invalid.');
  }
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.port !== '18026' || url.pathname !== '/') {
    throw new Error('026 accepts only http://127.0.0.1:18026/.');
  }
  return { baseUrl: url.toString().replace(/\/$/u, '') };
}
