import { readClientConfigFromEnv, getGenovaClient } from '../auth/supabase-client';
import { registerTenantCache } from '../auth/tenant-cache';
import { createSupabaseAnnotationSource } from './annotation-source';
import { createExpoPrivateScoreFileStore } from './expo-private-file-store';
import { nativePdfRenderer } from './pdf-renderer';
import { createNativeScoreReaderGateway } from './reader-gateway';
import type { NativeScoreReaderGateway } from './reader-contract';

let gateway: NativeScoreReaderGateway | null = null;

export function getDefaultScoreReaderGateway(): NativeScoreReaderGateway {
  if (!gateway) {
    const client = getGenovaClient();
    const { url } = readClientConfigFromEnv(process.env);
    gateway = createNativeScoreReaderGateway({
      endpoint: new URL('/functions/v1/repertoire-file', url).toString(),
      session: {
        async getAccessToken() {
          const { data, error } = await client.auth.getSession();
          if (error) throw new Error(error.message);
          return data.session?.access_token ?? null;
        },
      },
      annotations: createSupabaseAnnotationSource(client),
      files: createExpoPrivateScoreFileStore(),
      pdf: nativePdfRenderer,
    });
    registerTenantCache(() => gateway?.clear());
  }
  return gateway;
}
