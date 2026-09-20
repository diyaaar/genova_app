import * as Crypto from 'expo-crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createChunkedSecureStorage } from '../auth/secure-storage';
import { registerTenantCache } from '../auth/tenant-cache';
import { getGenovaClient, secureKeyValueStore } from '../auth/supabase-client';
import { createNativeChatSendGateway, type NativeChatSendGateway, type NativeChatSendTransport } from './chat-send-gateway';
import { createNativeChatSendQueue } from './native-chat-send-queue';

export function createSupabaseChatSendTransport(client: SupabaseClient): NativeChatSendTransport {
  return {
    async loadLinkPreview(url) {
      const { data, error } = await client.functions.invoke('link-preview', { body: { url } });
      if (error) throw error;
      return data;
    },

    async sendText(input) {
      const { data, error } = await client.rpc('send_chat_text_message', {
        p_room_id: input.roomId,
        p_client_mutation_id: input.clientMutationId,
        p_content: input.content,
        p_reply_to_id: input.replyToId,
        p_metadata_json: input.metadata,
      });
      if (error) throw error;
      return data;
    },
  };
}

let defaultGateway: NativeChatSendGateway | null = null;

export function getDefaultNativeChatSendGateway(): NativeChatSendGateway {
  if (!defaultGateway) {
    const storage = createChunkedSecureStorage(secureKeyValueStore);
    defaultGateway = createNativeChatSendGateway(
      createSupabaseChatSendTransport(getGenovaClient()),
      createNativeChatSendQueue(storage),
      () => Crypto.randomUUID(),
    );
    registerTenantCache(defaultGateway.clear);
  }
  return defaultGateway;
}
