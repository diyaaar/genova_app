-- 041: close arbitrary same-choir room self-join and membership self-escalation.
-- This migration intentionally leaves secondary chat tables and Realtime for later packages.

begin;

do $preflight$
begin
  if to_regnamespace('genova_041') is not null then
    raise exception '041 refused: genova_041 already exists';
  end if;
  if to_regclass('public.chat_room_members') is null
    or to_regprocedure('public.current_chat_member_id()') is null
    or to_regprocedure('public.current_choir_id()') is null
    or to_regprocedure('public.is_room_admin(uuid,uuid)') is null then
    raise exception '041 refused: required chat membership authority surface is missing';
  end if;
  if (select count(*) from pg_policies
      where schemaname = 'public' and tablename = 'chat_room_members'
        and policyname = 'Add room members' and cmd = 'INSERT') <> 1
    or (select count(*) from pg_policies
      where schemaname = 'public' and tablename = 'chat_room_members'
        and policyname = 'Update own membership' and cmd = 'UPDATE') <> 1 then
    raise exception '041 refused: expected prior insert/update policies are missing';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_room_members'
      and cmd = 'UPDATE' and policyname <> 'Update own membership'
  ) then
    raise exception '041 refused: unexpected prior membership update policy exists';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_room_members'
      and policyname = 'tenant_isolation_003' and permissive = 'RESTRICTIVE'
  ) then
    raise exception '041 refused: restrictive tenant policy is missing';
  end if;
end
$preflight$;

create schema genova_041;
revoke all on schema genova_041 from public;

create table genova_041.prior_chat_room_member_policies as
select policyname, permissive, roles::text[] as roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'chat_room_members'
  and policyname in ('Add room members', 'Update own membership')
order by policyname;

revoke all on genova_041.prior_chat_room_member_policies from public;

create function genova_041.guard_chat_room_member_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  actor_member_id uuid;
begin
  -- Local maintenance/migrations and service operations still rely on bypass-RLS authority.
  -- This trigger is a defence for authenticated direct-table writes, not a replacement for RLS.
  if auth.uid() is null then
    return new;
  end if;

  actor_member_id := public.current_chat_member_id();
  if actor_member_id is null then
    raise exception '041: current chat member is required' using errcode = '42501';
  end if;

  if new.id is distinct from old.id
    or new.room_id is distinct from old.room_id
    or new.member_id is distinct from old.member_id
    or new.choir_id is distinct from old.choir_id
    or new.joined_at is distinct from old.joined_at then
    raise exception '041: membership identity is immutable' using errcode = '42501';
  end if;

  -- A member owns only their local room preferences/read state, never their role.
  if actor_member_id = old.member_id and new.role is not distinct from old.role then
    return new;
  end if;

  -- A room admin may set only role, including an idempotent same-value write.
  -- Combining that write with preference changes refuses.
  if public.is_room_admin(old.room_id, actor_member_id)
    and new.nickname is not distinct from old.nickname
    and new.last_read_at is not distinct from old.last_read_at
    and new.notifications_enabled is not distinct from old.notifications_enabled
    and new.hidden_at is not distinct from old.hidden_at then
    return new;
  end if;

  raise exception '041: membership update is outside the actor authority'
    using errcode = '42501';
end
$function$;

revoke all on function genova_041.guard_chat_room_member_update() from public;

drop policy "Add room members" on public.chat_room_members;
drop policy "Update own membership" on public.chat_room_members;

create policy "Room creators or admins add members"
on public.chat_room_members
for insert
to authenticated
with check (
  choir_id = public.current_choir_id()
  and (
    public.is_room_admin(room_id, public.current_chat_member_id())
    or exists (
      select 1
      from public.chat_rooms room
      where room.id = chat_room_members.room_id
        and room.choir_id = chat_room_members.choir_id
        and room.created_by = public.current_chat_member_id()
    )
  )
);

create policy "Members update own room preferences"
on public.chat_room_members
for update
to authenticated
using (
  member_id = public.current_chat_member_id()
  and choir_id = public.current_choir_id()
)
with check (
  member_id = public.current_chat_member_id()
  and choir_id = public.current_choir_id()
);

create policy "Room admins update member roles"
on public.chat_room_members
for update
to authenticated
using (
  public.is_room_admin(room_id, public.current_chat_member_id())
  and choir_id = public.current_choir_id()
)
with check (
  choir_id = public.current_choir_id()
);

create trigger chat_room_members_guard_041
before update on public.chat_room_members
for each row execute function genova_041.guard_chat_room_member_update();

commit;
