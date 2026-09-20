import type { SupabaseClient } from '@supabase/supabase-js';
import { registerTenantCache } from '../auth/tenant-cache';
import { getGenovaClient } from '../auth/supabase-client';
import {
  createNativeChatStarGateway,
  type NativeChatStarGateway,
  type NativeChatStarTransport,
} from './chat-star-gateway';

const STAR_COLUMNS = 'id,message_id,member_id,choir_id,created_at';
const MESSAGE_COLUMNS = `
  id, client_mutation_id, room_id, sender_id, content, message_type, reply_to_id,
  metadata_json, is_edited, is_deleted, created_at, updated_at,
  sender:choir_members!chat_messages_sender_id_fkey (
    id, first_name, last_name, photo_url
  ),
  reply_to:chat_messages!reply_to_id (
    id, content, sender_id,
    choir_members!chat_messages_sender_id_fkey (first_name, last_name)
  )
`;

/** Uses 042's current-member RLS; every returned shape is still validated by the gateway. */
export function createSupabaseChatStarTransport(client: SupabaseClient): NativeChatStarTransport {
  return {
    async loadStateRows({ scope, roomId, messageIds }) {
      if (messageIds.length === 0) return [];
      const { data, error } = await client
        .from('chat_starred_messages')
        .select(`${STAR_COLUMNS},message:chat_messages!inner(id,room_id,is_deleted)`)
        .eq('member_id', scope.memberId)
        .eq('choir_id', scope.choirId)
        .in('message_id', messageIds)
        .eq('message.room_id', roomId)
        .eq('message.is_deleted', false);
      if (error) throw error;
      return data;
    },

    async addStar({ scope, messageId }) {
      const { data, error } = await client
        .from('chat_starred_messages')
        .insert({ message_id: messageId, member_id: scope.memberId, choir_id: scope.choirId })
        .select(STAR_COLUMNS);
      if (error) throw error;
      return data;
    },

    async removeStar({ scope, messageId }) {
      const { data, error } = await client
        .from('chat_starred_messages')
        .delete()
        .eq('message_id', messageId)
        .eq('member_id', scope.memberId)
        .eq('choir_id', scope.choirId)
        .select(STAR_COLUMNS);
      if (error) throw error;
      return data;
    },

    async loadPageRows({ scope, roomId, before, limit }) {
      let query = client
        .from('chat_starred_messages')
        .select(`${STAR_COLUMNS},message:chat_messages!inner(${MESSAGE_COLUMNS})`)
        .eq('member_id', scope.memberId)
        .eq('choir_id', scope.choirId)
        .eq('message.room_id', roomId)
        .eq('message.is_deleted', false)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(limit);
      if (before) {
        query = query.or(
          `created_at.lt.${before.createdAt},and(created_at.eq.${before.createdAt},id.lt.${before.id})`,
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  };
}

let defaultGateway: NativeChatStarGateway | null = null;

export function getDefaultNativeChatStarGateway(): NativeChatStarGateway {
  if (!defaultGateway) {
    defaultGateway = createNativeChatStarGateway(createSupabaseChatStarTransport(getGenovaClient()));
    registerTenantCache(defaultGateway.clear);
  }
  return defaultGateway;
}
