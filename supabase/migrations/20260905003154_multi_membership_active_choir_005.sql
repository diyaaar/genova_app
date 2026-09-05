-- 005: allow one authenticated account to belong to multiple choirs while
-- keeping every database request scoped to one explicitly selected choir.

select pg_advisory_xact_lock(hashtext('genovakorist:005:multi-membership'));

set local lock_timeout = '5s';
set local statement_timeout = '90s';

create schema genova_005;
revoke all on schema genova_005 from public, anon, authenticated, service_role;

-- Keep exact definitions and comments for a lossless down migration. These
-- helpers predate 005 and several are referenced by existing RLS policies.
create table genova_005.function_backups (
  signature text primary key,
  definition text not null,
  description text
);

insert into genova_005.function_backups (signature, definition, description)
select
  format('%I.%I(%s)', namespace.nspname, routine.proname, pg_get_function_identity_arguments(routine.oid)),
  pg_get_functiondef(routine.oid),
  obj_description(routine.oid, 'pg_proc')
from pg_proc routine
join pg_namespace namespace on namespace.oid = routine.pronamespace
where namespace.nspname = 'public'
  and routine.proname = any (array[
    'current_choir_id',
    'current_choir_member_id',
    'current_chat_member_id',
    'current_member_voice_group',
    'current_member_has_role',
    'get_current_member_id',
    'get_current_member_voice_group',
    'get_my_member_id',
    'get_my_role',
    'get_pending_approvals',
    'is_chef',
    'is_current_user_chef',
    'is_leader'
  ]);

do $backup_check$
begin
  if (select count(*) from genova_005.function_backups) <> 13 then
    raise exception '005 expected 13 existing Auth helper functions';
  end if;
end
$backup_check$;

revoke all on table genova_005.function_backups
  from public, anon, authenticated, service_role;

-- The old global unique constraint encoded one Auth account = one choir.
-- Keep uniqueness inside a choir and add the reverse lookup index used by
-- current_choir_id() and the membership-list RPC.
alter table public.choir_members
  drop constraint choir_members_auth_user_id_key,
  add constraint choir_members_choir_id_auth_user_id_key
    unique (choir_id, auth_user_id);

create index choir_members_auth_user_id_idx
  on public.choir_members (auth_user_id)
  where auth_user_id is not null;

create table genova_005.active_choir_sessions (
  session_id uuid primary key,
  auth_user_id uuid not null,
  choir_id uuid not null,
  selected_at timestamptz not null default now(),
  constraint active_choir_sessions_membership_fkey
    foreign key (choir_id, auth_user_id)
    references public.choir_members (choir_id, auth_user_id)
    on update cascade
    on delete cascade
);

create index active_choir_sessions_membership_idx
  on genova_005.active_choir_sessions (choir_id, auth_user_id);

revoke all on table genova_005.active_choir_sessions
  from public, anon, authenticated, service_role;

comment on table genova_005.active_choir_sessions is
  'Server-owned active choir selection keyed by the verified Supabase Auth session_id claim.';

create function genova_005.current_session_id()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $function$
  select case
    when coalesce((select auth.jwt()->>'session_id'), '') ~*
      '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((select auth.jwt()->>'session_id'))::uuid
    else null
  end;
$function$;

revoke all on function genova_005.current_session_id()
  from public, anon, authenticated, service_role;

-- A stored choice wins only while the same Auth user still owns that
-- membership. With no stored choice, exactly one membership is selected for
-- backwards compatibility. Multiple memberships without a choice fail closed.
create or replace function public.current_choir_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  with request_context as (
    select
      (select auth.uid()) as auth_user_id,
      genova_005.current_session_id() as session_id
  ),
  selected_membership as (
    select active.choir_id
    from request_context context
    join genova_005.active_choir_sessions active
      on active.session_id = context.session_id
     and active.auth_user_id = context.auth_user_id
    join public.choir_members member
      on member.choir_id = active.choir_id
     and member.auth_user_id = active.auth_user_id
    limit 1
  ),
  only_membership as (
    select
      case when count(*) = 1 then (array_agg(member.choir_id))[1] end as choir_id
    from public.choir_members member
    where member.auth_user_id = (select auth_user_id from request_context)
  )
  select coalesce(
    (select choir_id from selected_membership),
    (select choir_id from only_membership)
  );
$function$;

comment on function public.current_choir_id() is
  'Resolves the verified session active choir; falls back only for exactly one membership and otherwise returns NULL.';

create or replace function public.current_choir_member_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select member.id
  from public.choir_members member
  where member.auth_user_id = (select auth.uid())
    and member.choir_id = public.current_choir_id()
  limit 1;
$function$;

comment on function public.current_choir_member_id() is
  'Returns the authenticated user membership inside the verified active choir.';

create or replace function public.current_chat_member_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select public.current_choir_member_id();
$function$;

comment on function public.current_chat_member_id() is
  'Chat compatibility alias for the active choir membership ID.';

create or replace function public.current_member_voice_group()
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select member.voice_group
  from public.choir_members member
  where member.id = public.current_choir_member_id()
    and member.choir_id = public.current_choir_id()
  limit 1;
$function$;

comment on function public.current_member_voice_group() is
  'Returns the active choir membership voice group, never another membership value.';

create or replace function public.current_member_has_role(role_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.choir_member_roles member_role
    join public.roles role on role.id = member_role.role_id
    where member_role.member_id = public.current_choir_member_id()
      and member_role.choir_id = public.current_choir_id()
      and role.choir_id = member_role.choir_id
      and (
        role.name = role_name
        or (
          role_name in ('Şef', 'Åef', 'Sef')
          and role.name in ('Şef', 'Åef', 'Sef')
        )
        or (
          role_name in ('Partisyon Şefi', 'Partisyon Åefi', 'Partisyon Sefi')
          and role.name in ('Partisyon Şefi', 'Partisyon Åefi', 'Partisyon Sefi')
        )
      )
  );
$function$;

comment on function public.current_member_has_role(text) is
  'Checks roles only for the authenticated membership in the verified active choir.';

-- Older policies and RPCs call these compatibility helpers. SECURITY DEFINER
-- would otherwise bypass choir_members RLS and could borrow identity or roles
-- from another membership owned by the same Auth account.
create or replace function public.get_current_member_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select public.current_choir_member_id();
$function$;

create or replace function public.get_current_member_voice_group()
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select public.current_member_voice_group();
$function$;

create or replace function public.get_my_member_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select public.current_choir_member_id();
$function$;

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = ''
as $function$
  select role.name
  from public.choir_member_roles member_role
  join public.roles role
    on role.id = member_role.role_id
   and role.choir_id = member_role.choir_id
  where member_role.member_id = public.current_choir_member_id()
    and member_role.choir_id = public.current_choir_id()
  limit 1;
$function$;

create or replace function public.is_chef()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select public.current_member_has_role('Şef');
$function$;

create or replace function public.is_current_user_chef()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select public.current_member_has_role('Şef');
$function$;

create or replace function public.is_leader()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    public.current_member_has_role('Şef')
    or public.current_member_has_role('Partisyon Şefi');
$function$;

create or replace function public.get_pending_approvals()
returns table (
  attendance_id uuid,
  member_id uuid,
  rehearsal_id uuid,
  status text,
  checked_in_at timestamptz,
  member_first_name text,
  member_last_name text,
  member_voice_group text,
  rehearsal_date date,
  rehearsal_title text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_member_id uuid := public.current_choir_member_id();
  caller_voice_group text := public.current_member_voice_group();
  active_choir_id uuid := public.current_choir_id();
  caller_is_chef boolean := public.current_member_has_role('Şef');
  caller_is_section_leader boolean := public.current_member_has_role('Partisyon Şefi');
begin
  if caller_member_id is null
    or active_choir_id is null
    or (not caller_is_chef and not caller_is_section_leader) then
    return;
  end if;

  return query
    select
      attendance_row.id,
      attendance_row.member_id,
      attendance_row.rehearsal_id,
      attendance_row.status::text,
      attendance_row.checked_in_at,
      member.first_name,
      member.last_name,
      member.voice_group,
      rehearsal.date,
      rehearsal.title
    from public.attendance attendance_row
    join public.choir_members member
      on member.id = attendance_row.member_id
     and member.choir_id = attendance_row.choir_id
    join public.rehearsals rehearsal
      on rehearsal.id = attendance_row.rehearsal_id
     and rehearsal.choir_id = attendance_row.choir_id
    where attendance_row.choir_id = active_choir_id
      and attendance_row.status = 'pending'
      and (
        caller_is_chef
        or member.voice_group = caller_voice_group
      )
    order by attendance_row.checked_in_at desc;
end;
$function$;

comment on function public.get_current_member_id() is
  'Compatibility helper returning only the verified active choir membership.';
comment on function public.get_current_member_voice_group() is
  'Compatibility helper returning only the verified active choir voice group.';
comment on function public.get_my_member_id() is
  'Compatibility helper returning only the verified active choir membership.';
comment on function public.get_my_role() is
  'Returns one role attached to the verified active choir membership.';
comment on function public.is_chef() is
  'Checks the chef role only inside the verified active choir.';
comment on function public.is_current_user_chef() is
  'Checks the chef role only inside the verified active choir.';
comment on function public.is_leader() is
  'Checks chef or section-leader roles only inside the verified active choir.';
comment on function public.get_pending_approvals() is
  'Returns pending attendance rows authorized by the active choir role and voice group.';

create function public.list_my_choirs()
returns table (
  choir_id uuid,
  member_id uuid,
  choir_name text,
  choir_slug text,
  member_is_active boolean,
  is_current boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    choir.id,
    member.id,
    choir.name,
    choir.slug,
    member.is_active,
    choir.id = public.current_choir_id()
  from public.choir_members member
  join public.choirs choir on choir.id = member.choir_id
  where member.auth_user_id = (select auth.uid())
  order by choir.name, choir.id;
$function$;

revoke all on function public.list_my_choirs() from public, anon, service_role;
grant execute on function public.list_my_choirs() to authenticated;

comment on function public.list_my_choirs() is
  'Lists only the caller memberships so a client can choose an active choir before tenant RLS opens.';

create function public.set_active_choir(p_choir_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  caller_session_id uuid := genova_005.current_session_id();
begin
  if caller_id is null or caller_session_id is null then
    raise exception 'Geçerli kullanıcı oturumu bulunamadı.' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.choir_members member
    where member.auth_user_id = caller_id
      and member.choir_id = p_choir_id
  ) then
    raise exception 'Bu koro için üyelik bulunamadı.' using errcode = '42501';
  end if;

  insert into genova_005.active_choir_sessions (
    session_id,
    auth_user_id,
    choir_id,
    selected_at
  )
  values (caller_session_id, caller_id, p_choir_id, now())
  on conflict (session_id) do update
    set choir_id = excluded.choir_id,
        selected_at = excluded.selected_at
    where genova_005.active_choir_sessions.auth_user_id = excluded.auth_user_id;

  if not found then
    raise exception 'Oturum başka bir kullanıcıyla eşleşiyor.' using errcode = '42501';
  end if;

  return p_choir_id;
end;
$function$;

revoke all on function public.set_active_choir(uuid)
  from public, anon, service_role;
grant execute on function public.set_active_choir(uuid) to authenticated;

comment on function public.set_active_choir(uuid) is
  'Selects one of the caller memberships for only the verified Supabase Auth session.';

-- A browser push endpoint is globally unique. When the same browser switches
-- choir, move its row only if the existing endpoint belongs to another
-- membership of the same authenticated account; never let an endpoint be
-- hijacked from another account or remain subscribed to the inactive choir.
create function public.upsert_my_active_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  active_choir_id uuid := public.current_choir_id();
  active_member_id uuid := public.current_choir_member_id();
  normalized_endpoint text := btrim(p_endpoint);
  existing_owner_id uuid;
  subscription_id uuid;
begin
  if caller_id is null or active_choir_id is null or active_member_id is null then
    raise exception 'Geçerli aktif koro üyeliği bulunamadı.' using errcode = '28000';
  end if;
  if normalized_endpoint = '' or length(normalized_endpoint) > 4096
    or btrim(p_p256dh) = '' or length(p_p256dh) > 4096
    or btrim(p_auth) = '' or length(p_auth) > 4096 then
    raise exception 'Geçersiz PushSubscription verisi.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(normalized_endpoint, 0));

  select member.auth_user_id
    into existing_owner_id
  from public.push_subscriptions subscription
  join public.choir_members member on member.id = subscription.member_id
  where subscription.endpoint = normalized_endpoint;

  if found and existing_owner_id is distinct from caller_id then
    raise exception 'Push endpoint başka bir hesaba ait.' using errcode = '42501';
  end if;

  delete from public.push_subscriptions subscription
  where subscription.endpoint = normalized_endpoint
    and (
      subscription.choir_id is distinct from active_choir_id
      or subscription.member_id is distinct from active_member_id
    );

  insert into public.push_subscriptions (
    choir_id,
    member_id,
    endpoint,
    p256dh,
    auth,
    user_agent,
    updated_at
  ) values (
    active_choir_id,
    active_member_id,
    normalized_endpoint,
    btrim(p_p256dh),
    btrim(p_auth),
    p_user_agent,
    now()
  )
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        updated_at = excluded.updated_at
  returning id into subscription_id;

  return subscription_id;
end;
$function$;

create function public.delete_my_push_subscription(p_endpoint text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  caller_id uuid := (select auth.uid());
  deleted_count integer;
begin
  if caller_id is null then
    raise exception 'Geçerli kullanıcı oturumu bulunamadı.' using errcode = '28000';
  end if;

  delete from public.push_subscriptions subscription
  using public.choir_members member
  where subscription.member_id = member.id
    and member.auth_user_id = caller_id
    and subscription.endpoint = btrim(p_endpoint);

  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$function$;

revoke all on function public.upsert_my_active_push_subscription(text, text, text, text)
  from public, anon, service_role;
grant execute on function public.upsert_my_active_push_subscription(text, text, text, text)
  to authenticated;
revoke all on function public.delete_my_push_subscription(text)
  from public, anon, service_role;
grant execute on function public.delete_my_push_subscription(text)
  to authenticated;

comment on function public.upsert_my_active_push_subscription(text, text, text, text) is
  'Registers one browser endpoint for the caller active choir and safely moves the caller own prior row.';
comment on function public.delete_my_push_subscription(text) is
  'Deletes the caller own browser endpoint across their choir memberships during unsubscribe or sign-out.';

notify pgrst, 'reload schema';
