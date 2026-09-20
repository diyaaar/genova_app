-- 048: support stable native message pagination by the accepted (created_at,id) cursor.

begin;

do $preflight$
begin
  if to_regnamespace('genova_048') is not null
    or to_regclass('public.idx_chat_messages_room_created_id_048') is not null
    or to_regprocedure('public.mark_chat_room_read(uuid)') is not null then
    raise exception '048 refused: stable read index state already exists';
  end if;
  if to_regclass('public.chat_messages') is null
    or to_regnamespace('genova_046') is null
    or not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime'
        and schemaname='public'
        and tablename='chat_messages'
    ) then
    raise exception '048 refused: accepted chat/Realtime prerequisites are missing';
  end if;
end
$preflight$;

create schema genova_048;
revoke all on schema genova_048 from public, anon, authenticated;

create index idx_chat_messages_room_created_id_048
  on public.chat_messages (room_id, created_at desc, id desc);

create function public.mark_chat_room_read(p_room_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  actor_member_id uuid := public.current_chat_member_id();
  actor_choir_id uuid := public.current_choir_id();
  read_at timestamptz;
begin
  if auth.uid() is null or actor_member_id is null or actor_choir_id is null or p_room_id is null then
    raise exception '048: active room member required' using errcode = '42501';
  end if;

  update public.chat_room_members membership
  set last_read_at = clock_timestamp()
  where membership.room_id = p_room_id
    and membership.member_id = actor_member_id
    and membership.choir_id = actor_choir_id
  returning membership.last_read_at into read_at;

  if read_at is null then
    raise exception '048: room is outside member authority' using errcode = '42501';
  end if;
  return read_at;
end
$function$;

revoke all on function public.mark_chat_room_read(uuid) from public, anon;
grant execute on function public.mark_chat_room_read(uuid) to authenticated;

commit;
