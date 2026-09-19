-- 046: authorize private chat room Broadcast/Presence and declare the existing chat event tables.
-- Supabase owns realtime.messages/realtime.topic(); this migration only manages policies.

begin;

do $preflight$
begin
  if to_regnamespace('genova_046') is not null then
    raise exception '046 refused: genova_046 already exists';
  end if;
  if to_regclass('realtime.messages') is null
    or to_regprocedure('realtime.topic()') is null then
    raise exception '046 refused: Supabase Realtime authorization surface is missing';
  end if;
  if not coalesce((select relrowsecurity from pg_class where oid='realtime.messages'::regclass), false) then
    raise exception '046 refused: realtime.messages RLS is not enabled';
  end if;
  if not exists (select 1 from pg_publication where pubname='supabase_realtime') then
    raise exception '046 refused: supabase_realtime publication is missing';
  end if;
  if to_regclass('public.chat_rooms') is null
    or to_regclass('public.chat_room_members') is null
    or to_regclass('public.chat_messages') is null
    or to_regclass('public.chat_reactions') is null
    or to_regclass('public.chat_message_status') is null
    or to_regprocedure('public.current_choir_id()') is null
    or to_regprocedure('public.current_chat_member_id()') is null then
    raise exception '046 refused: chat authority prerequisites are missing';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname='realtime' and tablename='messages'
      and policyname in ('046 room members receive chat signals','046 room members send chat signals')
  ) then
    raise exception '046 refused: expected policy name already exists';
  end if;
end
$preflight$;

create schema genova_046;
revoke all on schema genova_046 from public;
grant usage on schema genova_046 to authenticated;

create table genova_046.prior_publication_tables as
select schemaname, tablename
from pg_publication_tables
where pubname='supabase_realtime'
  and schemaname='public'
  and tablename in ('chat_messages','chat_reactions','chat_message_status')
order by tablename;

revoke all on table genova_046.prior_publication_tables from public, anon, authenticated;

create function genova_046.can_access_chat_room_topic(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  actor_choir_id uuid := public.current_choir_id();
  actor_member_id uuid := public.current_chat_member_id();
  requested_room_id uuid;
begin
  if p_topic is null
    or p_topic !~ '^chat:[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$'
    or actor_choir_id is null
    or actor_member_id is null then
    return false;
  end if;

  requested_room_id := substring(p_topic from 6)::uuid;
  return exists (
    select 1
    from public.chat_room_members membership
    join public.chat_rooms room
      on room.id = membership.room_id
     and room.choir_id = membership.choir_id
    join public.choir_members actor
      on actor.id = membership.member_id
     and actor.choir_id = membership.choir_id
    where membership.room_id = requested_room_id
      and membership.member_id = actor_member_id
      and membership.choir_id = actor_choir_id
      and actor.auth_user_id = auth.uid()
      and actor.is_active is true
  );
end
$function$;

revoke all on function genova_046.can_access_chat_room_topic(text) from public, anon;
grant execute on function genova_046.can_access_chat_room_topic(text) to authenticated;

create policy "046 room members receive chat signals"
on realtime.messages
for select
to authenticated
using (
  extension in ('broadcast','presence')
  and genova_046.can_access_chat_room_topic((select realtime.topic()))
);

create policy "046 room members send chat signals"
on realtime.messages
for insert
to authenticated
with check (
  extension in ('broadcast','presence')
  and genova_046.can_access_chat_room_topic((select realtime.topic()))
);

do $publication$
declare
  table_name text;
begin
  foreach table_name in array array['chat_messages','chat_reactions','chat_message_status'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname='supabase_realtime' and schemaname='public' and tablename=table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end
$publication$;

commit;
