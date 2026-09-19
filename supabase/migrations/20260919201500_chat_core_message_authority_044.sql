-- 044: server-owned core message mutations and per-member hide state.

begin;

do $preflight$
declare actual_policies text[];
begin
  if to_regnamespace('genova_044') is not null
    or to_regclass('public.chat_message_hidden_members') is not null
    or to_regprocedure('public.edit_chat_message(uuid,text)') is not null
    or to_regprocedure('public.delete_chat_message_for_everyone(uuid)') is not null
    or to_regprocedure('public.hide_chat_message_for_self(uuid)') is not null then
    raise exception '044 refused: authority objects already exist';
  end if;
  if to_regnamespace('genova_043') is null then
    raise exception '044 refused: prerequisite 043 is missing';
  end if;
  select array_agg(policyname order by policyname) into actual_policies
  from pg_policies
  where schemaname='public' and tablename='chat_messages'
    and policyname <> 'tenant_isolation_003';
  if actual_policies is distinct from array[
    'Edit own messages', 'Send messages', 'View room messages'
  ] then
    raise exception '044 refused: prior message policy set differs';
  end if;
end
$preflight$;

create schema genova_044;
revoke all on schema genova_044 from public;

create table genova_044.prior_message_policies as
select policyname, permissive, roles::text[] roles, cmd, qual, with_check
from pg_policies
where schemaname='public' and tablename='chat_messages'
  and policyname <> 'tenant_isolation_003'
order by policyname;
revoke all on genova_044.prior_message_policies from public;

create table public.chat_message_hidden_members (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  member_id uuid not null references public.choir_members(id) on delete cascade,
  choir_id uuid not null references public.choirs(id),
  created_at timestamptz not null default clock_timestamp(),
  unique (message_id, member_id)
);
create index idx_chat_message_hidden_member_044
  on public.chat_message_hidden_members (member_id, message_id);
alter table public.chat_message_hidden_members enable row level security;
revoke all on public.chat_message_hidden_members from public, anon, authenticated;
grant select on public.chat_message_hidden_members to authenticated;
grant all on public.chat_message_hidden_members to service_role;

create policy tenant_isolation_003
on public.chat_message_hidden_members as restrictive
for all to authenticated
using (choir_id = public.current_choir_id())
with check (choir_id = public.current_choir_id());

create policy "Members view own hidden messages"
on public.chat_message_hidden_members for select to authenticated
using (
  member_id = public.current_chat_member_id()
  and choir_id = public.current_choir_id()
);

create function genova_044.current_member_can_access_room(p_room_id uuid, p_choir_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public
as $function$
  select auth.uid() is not null
    and p_choir_id = public.current_choir_id()
    and exists (
      select 1 from public.chat_room_members membership
      where membership.room_id = p_room_id
        and membership.choir_id = p_choir_id
        and membership.member_id = public.current_chat_member_id()
    );
$function$;

create function genova_044.current_member_hides_message(p_message_id uuid, p_choir_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public
as $function$
  select auth.uid() is not null
    and p_choir_id = public.current_choir_id()
    and exists (
      select 1 from public.chat_message_hidden_members hidden
      where hidden.message_id = p_message_id
        and hidden.member_id = public.current_chat_member_id()
        and hidden.choir_id = p_choir_id
    );
$function$;

create function genova_044.reply_is_in_room(p_reply_id uuid, p_room_id uuid, p_choir_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public
as $function$
  select auth.uid() is not null
    and exists (
      select 1 from public.chat_messages replied
      where replied.id=p_reply_id and replied.room_id=p_room_id and replied.choir_id=p_choir_id
    );
$function$;

create function genova_044.guard_hidden_message_link()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $function$
begin
  if tg_op = 'UPDATE' and (
    new.id is distinct from old.id or new.message_id is distinct from old.message_id
    or new.member_id is distinct from old.member_id or new.choir_id is distinct from old.choir_id
    or new.created_at is distinct from old.created_at
  ) then
    raise exception '044: hidden-message identity is immutable' using errcode='42501';
  end if;
  if not exists (
    select 1
    from public.chat_messages message
    join public.chat_room_members membership
      on membership.room_id=message.room_id and membership.choir_id=message.choir_id
    join public.choir_members member
      on member.id=membership.member_id and member.choir_id=membership.choir_id
    where message.id=new.message_id and message.choir_id=new.choir_id
      and membership.member_id=new.member_id
  ) then
    raise exception '044: hidden-message link is outside room membership' using errcode='23514';
  end if;
  return new;
end
$function$;

create function genova_044.normalize_chat_message_insert()
returns trigger language plpgsql security definer set search_path = pg_catalog, public
as $function$
declare server_time timestamptz;
begin
  if auth.uid() is null then return new; end if;
  server_time := clock_timestamp();
  new.created_at := server_time;
  new.updated_at := server_time;
  new.is_edited := false;
  new.is_deleted := false;
  return new;
end
$function$;

revoke all on function genova_044.current_member_can_access_room(uuid,uuid) from public;
revoke all on function genova_044.current_member_hides_message(uuid,uuid) from public;
revoke all on function genova_044.reply_is_in_room(uuid,uuid,uuid) from public;
revoke all on function genova_044.guard_hidden_message_link() from public;
revoke all on function genova_044.normalize_chat_message_insert() from public;
grant execute on function genova_044.current_member_can_access_room(uuid,uuid) to authenticated;
grant execute on function genova_044.current_member_hides_message(uuid,uuid) to authenticated;
grant execute on function genova_044.reply_is_in_room(uuid,uuid,uuid) to authenticated;

create trigger chat_message_hidden_link_044
before insert or update on public.chat_message_hidden_members
for each row execute function genova_044.guard_hidden_message_link();

create trigger chat_message_insert_normalize_044
before insert on public.chat_messages
for each row execute function genova_044.normalize_chat_message_insert();

drop policy "Edit own messages" on public.chat_messages;
drop policy "Send messages" on public.chat_messages;
drop policy "View room messages" on public.chat_messages;

create policy "Room members send constrained messages"
on public.chat_messages for insert to authenticated
with check (
  sender_id = public.current_chat_member_id()
  and choir_id = public.current_choir_id()
  and message_type in ('text', 'image', 'sticker', 'poll')
  and genova_044.current_member_can_access_room(room_id, choir_id)
  and (
    reply_to_id is null
    or genova_044.reply_is_in_room(reply_to_id, room_id, choir_id)
  )
);

create policy "Room members view unhidden messages"
on public.chat_messages for select to authenticated
using (
  genova_044.current_member_can_access_room(room_id, choir_id)
  and not genova_044.current_member_hides_message(id, choir_id)
);

create function public.edit_chat_message(p_message_id uuid, p_content text)
returns uuid language plpgsql security definer set search_path = pg_catalog, public
as $function$
declare actor_member_id uuid:=public.current_chat_member_id(); actor_choir_id uuid:=public.current_choir_id(); target public.chat_messages;
begin
  if auth.uid() is null or actor_member_id is null or actor_choir_id is null then raise exception '044: active member required' using errcode='42501'; end if;
  if p_content is null or btrim(p_content)='' then raise exception '044: text content required' using errcode='22023'; end if;
  select * into target from public.chat_messages where id=p_message_id for update;
  if not found or target.choir_id<>actor_choir_id or target.sender_id<>actor_member_id
    or not genova_044.current_member_can_access_room(target.room_id,target.choir_id) then
    raise exception '044: message is outside sender authority' using errcode='42501';
  end if;
  if target.message_type<>'text' or target.is_deleted then raise exception '044: message cannot be edited' using errcode='22023'; end if;
  if clock_timestamp()>target.created_at+interval '1 hour' then raise exception '044: edit window expired' using errcode='22023'; end if;
  update public.chat_messages set content=p_content,is_edited=true,updated_at=clock_timestamp() where id=target.id;
  return target.id;
end
$function$;

create function public.delete_chat_message_for_everyone(p_message_id uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog, public
as $function$
declare actor_member_id uuid:=public.current_chat_member_id(); actor_choir_id uuid:=public.current_choir_id(); target public.chat_messages;
begin
  select * into target from public.chat_messages where id=p_message_id for update;
  if auth.uid() is null or actor_member_id is null or actor_choir_id is null or not found
    or target.choir_id<>actor_choir_id or target.sender_id<>actor_member_id
    or not genova_044.current_member_can_access_room(target.room_id,target.choir_id) then
    raise exception '044: message is outside sender authority' using errcode='42501';
  end if;
  if clock_timestamp()>target.created_at+interval '1 hour' then raise exception '044: delete window expired' using errcode='22023'; end if;
  update public.chat_messages set is_deleted=true,content=null,metadata_json='{}'::jsonb,updated_at=clock_timestamp() where id=target.id;
  return target.id;
end
$function$;

create function public.hide_chat_message_for_self(p_message_id uuid)
returns uuid language plpgsql security definer set search_path = pg_catalog, public
as $function$
declare actor_member_id uuid:=public.current_chat_member_id(); actor_choir_id uuid:=public.current_choir_id(); target public.chat_messages; hidden_id uuid;
begin
  select * into target from public.chat_messages where id=p_message_id;
  if auth.uid() is null or actor_member_id is null or actor_choir_id is null or not found or target.choir_id<>actor_choir_id
    or not genova_044.current_member_can_access_room(target.room_id,target.choir_id) then
    raise exception '044: message is outside member authority' using errcode='42501';
  end if;
  insert into public.chat_message_hidden_members(message_id,member_id,choir_id)
  values(target.id,actor_member_id,actor_choir_id)
  on conflict(message_id,member_id) do update set message_id=excluded.message_id
  returning id into hidden_id;
  return hidden_id;
end
$function$;

revoke all on function public.edit_chat_message(uuid,text) from public, anon;
revoke all on function public.delete_chat_message_for_everyone(uuid) from public, anon;
revoke all on function public.hide_chat_message_for_self(uuid) from public, anon;
grant execute on function public.edit_chat_message(uuid,text) to authenticated;
grant execute on function public.delete_chat_message_for_everyone(uuid) to authenticated;
grant execute on function public.hide_chat_message_for_self(uuid) to authenticated;

commit;
