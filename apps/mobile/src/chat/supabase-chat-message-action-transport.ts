import * as Clipboard from 'expo-clipboard';
import type { SupabaseClient } from '@supabase/supabase-js';
import { registerTenantCache } from '../auth/tenant-cache';
import { getGenovaClient } from '../auth/supabase-client';
import {
  createNativeChatMessageActionGateway,
  type NativeChatMessageActionGateway,
  type NativeChatMessageActionTransport,
} from './chat-message-action-gateway';

export function createSupabaseChatMessageActionTransport(client: SupabaseClient): NativeChatMessageActionTransport {
  const call = async (name: string, parameters: Record<string, unknown>) => {
    const { data, error } = await client.rpc(name, parameters);
    if (error) throw error;
    return data;
  };
  return {
    editMessage: (messageId, content) => call('edit_chat_message', {
      p_message_id: messageId,
      p_content: content,
    }),
    deleteForEveryone: (messageId) => call('delete_chat_message_for_everyone', {
      p_message_id: messageId,
    }),
    hideForSelf: (messageId) => call('hide_chat_message_for_self', {
      p_message_id: messageId,
    }),
  };
}

let defaultGateway: NativeChatMessageActionGateway | null = null;

export function getDefaultNativeChatMessageActionGateway(): NativeChatMessageActionGateway {
  if (!defaultGateway) {
    defaultGateway = createNativeChatMessageActionGateway(
      createSupabaseChatMessageActionTransport(getGenovaClient()),
      (text) => Clipboard.setStringAsync(text),
    );
    registerTenantCache(defaultGateway.clear);
  }
  return defaultGateway;
}
