import { readClientConfigFromEnv, getGenovaClient } from '../auth/supabase-client';
import { createNativeAudioSourceGateway, type NativeAudioSourceGateway } from './audio-source-gateway';

let gateway: NativeAudioSourceGateway | null = null;

export function getDefaultAudioSourceGateway(): NativeAudioSourceGateway {
  if (!gateway) {
    const client = getGenovaClient();
    const { url } = readClientConfigFromEnv(process.env);
    gateway = createNativeAudioSourceGateway({
      endpoint: new URL('/functions/v1/repertoire-file', url).toString(),
      session: {
        async getAccessToken() {
          const { data, error } = await client.auth.getSession();
          if (error) throw new Error(error.message);
          return data.session?.access_token ?? null;
        },
      },
    });
  }
  return gateway;
}
