import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { ChatReadScope } from '@shared/chat-read-contract';
import { registerTenantCache } from '../auth/tenant-cache';
import { getGenovaClient } from '../auth/supabase-client';
import {
  createNativeChatReadGateway,
  type NativeChatConnectionState,
  type NativeChatReadGateway,
  type NativeChatReadTransport,
} from './chat-read-gateway';

const MESSAGE_SELECT = `
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

let channelSequence = 0;

function connectionListener(
  listener: (state: NativeChatConnectionState) => void,
  invalidate: () => void,
) {
  return (status: string) => {
    if (status === 'SUBSCRIBED') {
      listener('connected');
      invalidate();
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
      listener('disconnected');
    }
  };
}

function removeChannel(client: SupabaseClient, channel: RealtimeChannel) {
  return () => {
    void client.removeChannel(channel);
  };
}

/** Supabase adapter. Change payloads are intentionally discarded; callers reload validated rows. */
export function createSupabaseChatReadTransport(client: SupabaseClient): NativeChatReadTransport {
  return {
    async loadRoomRows(memberId) {
      const { data, error } = await client.rpc('get_chat_rooms_for_member', { p_member_id: memberId });
      if (error) throw error;
      return data;
    },

    async loadMessageRows({ roomId, before, limit }) {
      let query = client
        .from('chat_messages')
        .select(MESSAGE_SELECT)
        .eq('room_id', roomId)
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

    async markRoomRead(roomId, _memberId) {
      const { data, error } = await client.rpc('mark_chat_room_read', { p_room_id: roomId });
      if (error) throw error;
      if (typeof data !== 'string') throw new Error('chat-room-read-acknowledgement-missing');
    },

    watchRoomList(scope, listener) {
      const channel = client
        .channel(`native-chat-list:${scope.choirId}:${++channelSequence}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `choir_id=eq.${scope.choirId}`,
        }, listener.invalidate)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `choir_id=eq.${scope.choirId}`,
        }, listener.invalidate);
      channel.subscribe(connectionListener(listener.connection, listener.invalidate));
      return removeChannel(client, channel);
    },

    watchRoom(_scope: ChatReadScope, roomId: string, listener) {
      const channel = client
        .channel(`native-chat-room:${roomId}:${++channelSequence}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}`,
        }, listener.invalidate)
        .on('postgres_changes', {
          event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}`,
        }, listener.invalidate);
      channel.subscribe(connectionListener(listener.connection, listener.invalidate));
      return removeChannel(client, channel);
    },
  };
}

let defaultGateway: NativeChatReadGateway | null = null;

export function getDefaultNativeChatReadGateway(): NativeChatReadGateway {
  if (!defaultGateway) {
    defaultGateway = createNativeChatReadGateway(createSupabaseChatReadTransport(getGenovaClient()));
    registerTenantCache(defaultGateway.clear);
  }
  return defaultGateway;
}
