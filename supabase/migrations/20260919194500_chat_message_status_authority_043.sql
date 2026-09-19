-- 043: durable, room-authorized and server-timestamped message status.

begin;

do $preflight$
declare
  actual_policies text[];
begin
  if to_regnamespace('genova_043') is not null
    or to_regprocedure('public.mark_chat_message_status(uuid,text)') is not null then
    raise exception '043 refused: authority objects already exist';
  end if;
  if to_regnamespace('genova_042') is null
    or to_regclass('public.chat_message_status') is null
    or to_regprocedure('public.current_chat_member_id()') is null
    or to_regprocedure('public.current_choir_id()') is null then
    raise exception '043 refused: 042 or required status surface is missing';
  end if;

  select array_agg(policyname order by policyname) into actual_policies
  from pg_policies
  where schemaname = 'public'
    and tablename = 'chat_message_status'
    and policyname <> 'tenant_isolation_003';
  if actual_policies is distinct from array[
    'Insert own message status',
    'Update own message status',
    'View message status'
  ] then
    raise exception '043 refused: prior message-status policy set differs';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_message_status'
      and policyname = 'tenant_isolation_003' and permissive = 'RESTRICTIVE'
  ) then
    raise exception '043 refused: restrictive tenant policy is missing';
  end if;
end
$preflight$;

create schema genova_043;
revoke all on schema genova_043 from public;

create table genova_043.prior_message_status_policies as
select policyname, permissive, roles::text[] as roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'chat_message_status'
  and policyname <> 'tenant_isolation_003'
order by policyname;

revoke all on genova_043.prior_message_status_policies from public;

drop policy "Insert own message status" on public.chat_message_status;
drop policy "Update own message status" on public.chat_message_status;
drop policy "View message status" on public.chat_message_status;

create policy "Members view authorized message status"
on public.chat_message_status
for select
to authenticated
using (
  choir_id = public.current_choir_id()
  and exists (
    select 1
    from public.chat_messages message
    join public.chat_room_members membership
      on membership.room_id = message.room_id
     and membership.choir_id = message.choir_id
    where message.id = chat_message_status.message_id
      and message.choir_id = chat_message_status.choir_id
      and membership.member_id = public.current_chat_member_id()
      and (
        chat_message_status.member_id = public.current_chat_member_id()
        or message.sender_id = public.current_chat_member_id()
      )
  )
);

create function public.mark_chat_message_status(
  p_message_id uuid,
  p_status text
)
returns public.chat_message_status
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  actor_member_id uuid := public.current_chat_member_id();
  actor_choir_id uuid := public.current_choir_id();
  server_time timestamptz := clock_timestamp();
  result public.chat_message_status;
begin
  if p_status not in ('delivered', 'read') then
    raise exception '043: status must be delivered or read' using errcode = '22023';
  end if;
  if actor_member_id is null or actor_choir_id is null then
    raise exception '043: active member is required' using errcode = '42501';
  end if;
  if not exists (
    select 1
    from public.chat_messages message
    join public.chat_room_members membership
      on membership.room_id = message.room_id
     and membership.choir_id = message.choir_id
    where message.id = p_message_id
      and message.choir_id = actor_choir_id
      and membership.member_id = actor_member_id
  ) then
    raise exception '043: message is outside current room authority' using errcode = '42501';
  end if;

  insert into public.chat_message_status as existing (
    message_id, member_id, choir_id, delivered_at, read_at
  ) values (
    p_message_id,
    actor_member_id,
    actor_choir_id,
    server_time,
    case when p_status = 'read' then server_time end
  )
  on conflict (message_id, member_id) do update
  set delivered_at = coalesce(existing.delivered_at, excluded.delivered_at),
      read_at = case
        when p_status = 'read' then coalesce(existing.read_at, excluded.read_at)
        else existing.read_at
      end
  returning * into result;

  return result;
end
$function$;

revoke all on function public.mark_chat_message_status(uuid, text) from public;
grant execute on function public.mark_chat_message_status(uuid, text) to authenticated;

commit;
