-- 045: sender-scoped idempotency for text/reply/link-preview sends.

begin;

do $preflight$
begin
  if to_regnamespace('genova_045') is not null
    or to_regclass('public.chat_message_send_keys') is not null
    or to_regprocedure('public.send_chat_text_message(uuid,uuid,text,uuid,jsonb)') is not null
    or exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='chat_messages'
        and column_name='client_mutation_id'
    ) then
    raise exception '045 refused: text-send idempotency objects already exist';
  end if;
  if to_regnamespace('genova_044') is null
    or to_regprocedure('public.hide_chat_message_for_self(uuid)') is null then
    raise exception '045 refused: prerequisite 044 is missing';
  end if;
end
$preflight$;

create schema genova_045;
revoke all on schema genova_045 from public;

alter table public.chat_messages
  add column client_mutation_id uuid;

create table public.chat_message_send_keys (
  sender_id uuid not null references public.choir_members(id) on delete cascade,
  client_mutation_id uuid not null,
  choir_id uuid not null references public.choirs(id),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  message_id uuid unique references public.chat_messages(id) on delete cascade,
  created_at timestamptz not null default clock_timestamp(),
  primary key (sender_id, client_mutation_id)
);
create index idx_chat_message_send_keys_room_045
  on public.chat_message_send_keys (room_id, sender_id, created_at desc);
alter table public.chat_message_send_keys enable row level security;
revoke all on public.chat_message_send_keys from public, anon, authenticated;
grant all on public.chat_message_send_keys to service_role;

create function genova_045.text_payload_hash(
  p_room_id uuid,
  p_content text,
  p_reply_to_id uuid,
  p_metadata_json jsonb
)
returns text language sql immutable set search_path = pg_catalog, public, extensions
as $function$
  select encode(
    extensions.digest(
      convert_to(jsonb_build_object(
        'room_id', p_room_id,
        'content', p_content,
        'reply_to_id', p_reply_to_id,
        'metadata_json', p_metadata_json
      )::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$function$;
revoke all on function genova_045.text_payload_hash(uuid,text,uuid,jsonb) from public;

create function public.send_chat_text_message(
  p_room_id uuid,
  p_client_mutation_id uuid,
  p_content text,
  p_reply_to_id uuid default null,
  p_metadata_json jsonb default '{}'::jsonb
)
returns public.chat_messages
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $function$
declare
  actor_member_id uuid := public.current_chat_member_id();
  actor_choir_id uuid := public.current_choir_id();
  safe_metadata jsonb := coalesce(p_metadata_json, '{}'::jsonb);
  request_hash text;
  key_row public.chat_message_send_keys;
  message_row public.chat_messages;
  claimed boolean := false;
begin
  if auth.uid() is null or actor_member_id is null or actor_choir_id is null then
    raise exception '045: active member required' using errcode = '42501';
  end if;
  if p_room_id is null or p_client_mutation_id is null then
    raise exception '045: room and client mutation id are required' using errcode = '22023';
  end if;
  if p_content is null or btrim(p_content) = '' then
    raise exception '045: text content required' using errcode = '22023';
  end if;
  if jsonb_typeof(safe_metadata) <> 'object'
    or safe_metadata - 'link_preview' <> '{}'::jsonb then
    raise exception '045: text metadata may contain only link_preview' using errcode = '22023';
  end if;
  if not genova_044.current_member_can_access_room(p_room_id, actor_choir_id) then
    raise exception '045: room is outside member authority' using errcode = '42501';
  end if;
  if p_reply_to_id is not null
    and not genova_044.reply_is_in_room(p_reply_to_id, p_room_id, actor_choir_id) then
    raise exception '045: reply is outside room authority' using errcode = '42501';
  end if;

  request_hash := genova_045.text_payload_hash(
    p_room_id, p_content, p_reply_to_id, safe_metadata
  );

  insert into public.chat_message_send_keys (
    sender_id, client_mutation_id, choir_id, room_id, payload_hash
  ) values (
    actor_member_id, p_client_mutation_id, actor_choir_id, p_room_id, request_hash
  )
  on conflict (sender_id, client_mutation_id) do nothing
  returning * into key_row;
  claimed := found;

  if claimed then
    insert into public.chat_messages (
      choir_id, room_id, sender_id, content, message_type, reply_to_id,
      metadata_json, client_mutation_id
    ) values (
      actor_choir_id, p_room_id, actor_member_id, p_content, 'text',
      p_reply_to_id, safe_metadata, p_client_mutation_id
    ) returning * into message_row;

    update public.chat_message_send_keys
    set message_id = message_row.id
    where sender_id = actor_member_id
      and client_mutation_id = p_client_mutation_id;
    return message_row;
  end if;

  select * into key_row
  from public.chat_message_send_keys
  where sender_id = actor_member_id
    and client_mutation_id = p_client_mutation_id;

  if not found or key_row.payload_hash is distinct from request_hash
    or key_row.choir_id is distinct from actor_choir_id
    or key_row.room_id is distinct from p_room_id then
    raise exception '045: client mutation id was reused with a different payload'
      using errcode = '22023';
  end if;
  if key_row.message_id is null then
    raise exception '045: client mutation id has no completed message'
      using errcode = '40001';
  end if;

  select * into message_row
  from public.chat_messages
  where id = key_row.message_id
    and sender_id = actor_member_id
    and choir_id = actor_choir_id
    and room_id = p_room_id;
  if not found then
    raise exception '045: acknowledged message is unavailable' using errcode = '55000';
  end if;
  return message_row;
end
$function$;

revoke all on function public.send_chat_text_message(uuid,uuid,text,uuid,jsonb)
  from public, anon;
grant execute on function public.send_chat_text_message(uuid,uuid,text,uuid,jsonb)
  to authenticated;

commit;
