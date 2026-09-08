import { registerTenantCache } from '../auth/tenant-cache';
import type { NativeRepertoireGateway } from './catalog-gateway';

/** Registers a catalogue cache for the lifetime of the gateway owner. */
export function registerRepertoireGatewayCache(gateway: NativeRepertoireGateway): () => void {
  return registerTenantCache(gateway.clear);
}
