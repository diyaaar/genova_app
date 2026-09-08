import { getGenovaClient } from '../auth/supabase-client';
import { registerRepertoireGatewayCache } from './cache-registration';
import { createNativeRepertoireGateway, type NativeRepertoireGateway } from './catalog-gateway';
import { createSupabaseRepertoireSource } from './supabase-source';

let gateway: NativeRepertoireGateway | null = null;

/** Lazy so importing/rendering the signed-out app never requires environment values. */
export function getDefaultRepertoireGateway(): NativeRepertoireGateway {
  if (!gateway) {
    gateway = createNativeRepertoireGateway(createSupabaseRepertoireSource(getGenovaClient()));
    // The default gateway lives for the app process. Keep its cleaner registered even when
    // the catalogue screen is not mounted, so switching choir from the shell still clears it.
    registerRepertoireGatewayCache(gateway);
  }
  return gateway;
}
