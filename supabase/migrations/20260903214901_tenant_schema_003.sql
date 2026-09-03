-- 003: make the application schema tenant-aware.
-- The three public website intake tables (collab_inquiries, contact_messages,
-- subscribers) are intentionally global and are not tied to a choir.

select pg_advisory_xact_lock(hashtext('genovakorist:003:tenant-schema'));

set local lock_timeout = '5s';
set local statement_timeout = '90s';

-- Private metadata for an exact rollback, including the original policy idioms.
create schema genova_003;
revoke all on schema genova_003 from public, anon, authenticated, service_role;
create table genova_003.original_policies as select * from pg_policies where schemaname = 'public';
create table genova_003.original_triggers as
select t.tgrelid, t.tgname, t.tgenabled from pg_trigger t
join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal;
create table genova_003.original_functions as
select p.oid::regprocedure::text as signature, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
and p.proname in ('bump_repertoire_catalog_cache_version', 'check_slug_available',
  'get_pending_approvals', 'get_member_continuity_info', 'get_member_room_ids',
  'is_room_admin', 'is_room_member', 'can_current_member_access_assignment_for_read');
revoke all on all tables in schema genova_003 from public, anon, authenticated, service_role;

create table public.choirs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.choirs enable row level security;

insert into public.choirs (id, slug, name)
values (
  'b596e85e-6dfe-4bd4-8ecc-61ff3b925d40',
  'genesi-nova',
  'Genesi Nova'
);

do $migration$
declare
  tenant_tables constant text[] := array[
    'announcements',
    'assignment_submission_audit_logs',
    'assignment_submission_history',
    'assignment_submission_private_notes',
    'assignment_submissions',
    'assignment_targets',
    'assignments',
    'attendance',
    'chat_message_status',
    'chat_messages',
    'chat_notification_preferences',
    'chat_poll_votes',
    'chat_polls',
    'chat_reactions',
    'chat_room_members',
    'chat_rooms',
    'chat_starred_messages',
    'choir_member_roles',
    'choir_members',
    'departments',
    'profile_change_requests',
    'push_subscriptions',
    'rehearsal_invitees',
    'rehearsals',
    'repertoire',
    'repertoire_cache_versions',
    'repertoire_files',
    'repertoire_pdf_annotations',
    'repertoire_song_comments',
    'repertoire_song_tags',
    'repertoire_tags',
    'roles',
    'schools',
    'song_assignments'
  ];
  table_name text;
  primary_choir_id constant uuid := 'b596e85e-6dfe-4bd4-8ecc-61ff3b925d40';
  saved_trigger record;
begin
  foreach table_name in array tenant_tables loop
    if to_regclass(format('public.%I', table_name)) is null then
      raise exception '003 tenant migration expected public.% but it does not exist', table_name;
    end if;

    execute format('alter table public.%I add column choir_id uuid', table_name);
  end loop;

  -- Backfill is metadata only: preserve audit timestamps, updated_by and cache
  -- versions. Restore each trigger's original mode before releasing the lock.
  foreach table_name in array tenant_tables loop
    execute format('alter table public.%I disable trigger user', table_name);
    execute format(
      'update public.%I set choir_id = $1 where choir_id is null',
      table_name
    ) using primary_choir_id;
  end loop;
  for saved_trigger in select * from genova_003.original_triggers
    where tgrelid in (select ('public.' || unnest(tenant_tables))::regclass)
  loop
    execute format('alter table %s %s trigger %I', saved_trigger.tgrelid::regclass,
      case saved_trigger.tgenabled when 'D' then 'disable' when 'A' then 'enable always'
        when 'R' then 'enable replica' else 'enable' end, saved_trigger.tgname);
  end loop;
end
$migration$;

create or replace function public.current_choir_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $function$
  select cm.choir_id
  from public.choir_members cm
  where cm.auth_user_id = (select auth.uid())
  limit 1;
$function$;

revoke all on function public.current_choir_id() from public;
revoke all on function public.current_choir_id() from anon;
grant execute on function public.current_choir_id() to anon, authenticated, service_role;

comment on function public.current_choir_id() is
  'Returns only the authenticated member tenant; no member or service-role JWT means NULL.';

do $migration$
declare
  tenant_tables constant text[] := array[
    'announcements',
    'assignment_submission_audit_logs',
    'assignment_submission_history',
    'assignment_submission_private_notes',
    'assignment_submissions',
    'assignment_targets',
    'assignments',
    'attendance',
    'chat_message_status',
    'chat_messages',
    'chat_notification_preferences',
    'chat_poll_votes',
    'chat_polls',
    'chat_reactions',
    'chat_room_members',
    'chat_rooms',
    'chat_starred_messages',
    'choir_member_roles',
    'choir_members',
    'departments',
    'profile_change_requests',
    'push_subscriptions',
    'rehearsal_invitees',
    'rehearsals',
    'repertoire',
    'repertoire_cache_versions',
    'repertoire_files',
    'repertoire_pdf_annotations',
    'repertoire_song_comments',
    'repertoire_song_tags',
    'repertoire_tags',
    'roles',
    'schools',
    'song_assignments'
  ];
  table_name text;
begin
  foreach table_name in array tenant_tables loop
    execute format(
      'alter table public.%I alter column choir_id set default public.current_choir_id()',
      table_name
    );
    execute format(
      'alter table public.%I alter column choir_id set not null',
      table_name
    );
    execute format(
      'alter table public.%I add constraint %I foreign key (choir_id) references public.choirs(id)',
      table_name,
      table_name || '_choir_id_fkey'
    );
    execute format(
      'create index %I on public.%I (choir_id)',
      table_name || '_choir_id_idx',
      table_name
    );
  end loop;
end
$migration$;

-- Natural keys belong to a choir. UUID-based relation keys remain globally
-- unique and do not need a wider constraint.
alter table public.chat_rooms
  drop constraint chat_rooms_slug_key,
  add constraint chat_rooms_slug_key unique (choir_id, slug);

alter table public.choir_members
  drop constraint choir_members_email_key,
  add constraint choir_members_email_key unique (choir_id, email);

alter table public.departments
  drop constraint departments_name_key,
  add constraint departments_name_key unique (choir_id, name);

alter table public.rehearsals
  drop constraint rehearsals_date_start_time_key,
  add constraint rehearsals_date_start_time_key unique (choir_id, date, start_time);

alter table public.repertoire_tags
  drop constraint repertoire_tags_name_key,
  add constraint repertoire_tags_name_key unique (choir_id, name);

alter table public.repertoire
  drop constraint repertoire_title_key,
  add constraint repertoire_title_key unique (choir_id, title);

alter table public.roles
  drop constraint roles_name_key,
  add constraint roles_name_key unique (choir_id, name);

alter table public.schools
  drop constraint schools_name_key,
  add constraint schools_name_key unique (choir_id, name);

alter table public.repertoire_cache_versions
  drop constraint repertoire_cache_versions_pkey,
  add constraint repertoire_cache_versions_pkey primary key (choir_id, scope);

create or replace function public.bump_repertoire_catalog_cache_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  target_choir_id uuid := coalesce(new.choir_id, old.choir_id, public.current_choir_id());
begin
  if target_choir_id is null then
    raise exception 'Cannot bump repertoire cache without choir_id';
  end if;

  insert into public.repertoire_cache_versions (choir_id, scope, version, updated_at)
  values (target_choir_id, 'catalog', 1, timezone('utc', now()))
  on conflict (choir_id, scope) do update
    set version = public.repertoire_cache_versions.version + 1,
        updated_at = excluded.updated_at;

  return coalesce(new, old);
end;
$function$;

create or replace function public.check_slug_available(
  p_slug text,
  p_exclude_room_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select not exists (
    select 1
    from public.chat_rooms cr
    where cr.choir_id = public.current_choir_id()
      and cr.slug = p_slug
      and (p_exclude_room_id is null or cr.id <> p_exclude_room_id)
  );
$function$;

do $migration$
declare
  tenant_tables constant text[] := array[
    'announcements',
    'assignment_submission_audit_logs',
    'assignment_submission_history',
    'assignment_submission_private_notes',
    'assignment_submissions',
    'assignment_targets',
    'assignments',
    'attendance',
    'chat_message_status',
    'chat_messages',
    'chat_notification_preferences',
    'chat_poll_votes',
    'chat_polls',
    'chat_reactions',
    'chat_room_members',
    'chat_rooms',
    'chat_starred_messages',
    'choir_member_roles',
    'choir_members',
    'departments',
    'profile_change_requests',
    'push_subscriptions',
    'rehearsal_invitees',
    'rehearsals',
    'repertoire',
    'repertoire_cache_versions',
    'repertoire_files',
    'repertoire_pdf_annotations',
    'repertoire_song_comments',
    'repertoire_song_tags',
    'repertoire_tags',
    'roles',
    'schools',
    'song_assignments'
  ];
  policy_row record;
  alter_statement text;
  scoped_policy_count integer := 0;
begin
  for policy_row in
    select tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and tablename = any (tenant_tables)
    order by tablename, policyname
  loop
    alter_statement := format(
      'alter policy %I on public.%I',
      policy_row.policyname,
      policy_row.tablename
    );

    if policy_row.qual is not null then
      alter_statement := alter_statement || format(
        ' using ((%s) and (choir_id = public.current_choir_id()))',
        policy_row.qual
      );
    end if;

    if policy_row.with_check is not null then
      alter_statement := alter_statement || format(
        ' with check ((%s) and (choir_id = public.current_choir_id()))',
        policy_row.with_check
      );
    end if;

    execute alter_statement;
    scoped_policy_count := scoped_policy_count + 1;
  end loop;

  if scoped_policy_count = 0 then
    raise exception '003 tenant migration did not find any policies to scope';
  end if;

  raise notice '003 tenant migration scoped % existing policies', scoped_policy_count;
end
$migration$;

create policy "Members can view current choir"
on public.choirs
for select
to authenticated
using (id = public.current_choir_id());

revoke all on table public.choirs from anon;
grant select on table public.choirs to authenticated;
grant all on table public.choirs to service_role;

notify pgrst, 'reload schema';

-- RLS does not constrain SECURITY DEFINER RPCs. Preserve existing calculations
-- but constrain their data sources and reject cross-tenant parameter values.
do $rpc$
declare original text; revised text;
begin
  select definition into strict original from genova_003.original_functions
    where signature = 'get_pending_approvals()' or signature = 'public.get_pending_approvals()';
  revised := replace(original, 'WHERE a.status = ''pending''',
    'WHERE a.choir_id = public.current_choir_id() AND a.status = ''pending''');
  if revised = original then raise exception 'Unexpected get_pending_approvals definition'; end if;
  execute revised;

  select definition into strict original from genova_003.original_functions
    where signature in ('get_member_continuity_info(uuid)', 'public.get_member_continuity_info(uuid)');
  revised := replace(original, 'BEGIN', $guard$BEGIN
    IF auth.uid() IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.choir_members WHERE id = p_member_id
        AND choir_id = public.current_choir_id()
    ) THEN RETURN; END IF;
  $guard$);
  revised := replace(revised, 'WHERE (a.target_voice_group',
    'WHERE a.choir_id = public.current_choir_id() AND (a.target_voice_group');
  if revised = original then raise exception 'Unexpected get_member_continuity_info definition'; end if;
  execute revised;
end
$rpc$;
alter function public.get_member_continuity_info(uuid) set search_path = public;

create or replace function public.get_member_room_ids(p_member_id uuid)
returns setof uuid language sql stable security definer set search_path = public as $$
  select room_id from public.chat_room_members
  where member_id = p_member_id and p_member_id = public.current_chat_member_id()
    and choir_id = public.current_choir_id();
$$;
create or replace function public.is_room_admin(p_room_id uuid, p_member_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.chat_room_members
    where room_id = p_room_id and member_id = p_member_id
      and p_member_id = public.current_chat_member_id()
      and choir_id = public.current_choir_id() and role = 'admin');
$$;
create or replace function public.is_room_member(p_room_id uuid, p_member_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.chat_room_members
    where room_id = p_room_id and member_id = p_member_id
      and p_member_id = public.current_chat_member_id()
      and choir_id = public.current_choir_id());
$$;

create or replace function public.can_current_member_access_assignment_for_read(
  p_assignment_id uuid, p_assignment_creator_id uuid, p_assignment_target_voice_group text
) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.assignments a
    where a.id = p_assignment_id and a.choir_id = public.current_choir_id()
    and (
      public.current_member_has_role('Şef') or a.created_by = public.current_choir_member_id()
      or exists (select 1 from public.assignment_targets t
        join public.choir_members m on m.id = t.member_id
        where t.assignment_id = a.id and t.choir_id = a.choir_id
        and (t.member_id = public.current_choir_member_id()
          or (public.current_member_has_role('Partisyon Şefi')
            and m.voice_group = public.current_member_voice_group())))
      or (not exists(select 1 from public.assignment_targets t where t.assignment_id = a.id)
        and (a.target_voice_group is null or btrim(a.target_voice_group) = ''
          or a.target_voice_group = public.current_member_voice_group()))
    )
  );
$$;

-- Keep the original FK names/relationships for PostgREST embedding. Validate
-- tenant equality in a private trigger, including writes that bypass RLS.
create function genova_003.enforce_tenant_links() returns trigger
language plpgsql security definer set search_path = pg_catalog, public as $$
declare link record; row_data jsonb := to_jsonb(new); ref_value uuid; parent_choir uuid;
begin
  if tg_op = 'UPDATE' and new.choir_id is distinct from old.choir_id then
    raise exception 'Tenant identity is immutable' using errcode = '23514';
  end if;
  if tg_table_name = 'choir_members' and auth.uid() is not null then
    if tg_op = 'UPDATE' and row_data->>'auth_user_id' is distinct from to_jsonb(old)->>'auth_user_id' then
      raise exception 'Auth identity is immutable' using errcode = '23514';
    end if;
    if tg_op = 'INSERT' and row_data->>'auth_user_id' is not null
      and (row_data->>'auth_user_id')::uuid <> auth.uid() then
      raise exception 'Cannot assign another auth identity' using errcode = '23514';
    end if;
  end if;
  for link in
    select a.attname as child_column, c.confrelid as parent_table, pa.attname as parent_column
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    join pg_attribute pa on pa.attrelid = c.confrelid and pa.attnum = c.confkey[1]
    where c.conrelid = tg_relid and c.contype = 'f' and cardinality(c.conkey) = 1
      and a.attname <> 'choir_id'
      and exists(select 1 from pg_attribute ca where ca.attrelid = c.confrelid
        and ca.attname = 'choir_id' and not ca.attisdropped)
  loop
    ref_value := (row_data->>link.child_column)::uuid;
    if ref_value is null then continue; end if;
    execute format('select choir_id from %s where %I = $1', link.parent_table::regclass, link.parent_column)
      into parent_choir using ref_value;
    if parent_choir is distinct from new.choir_id then
      raise exception 'Cross-tenant reference rejected' using errcode = '23514';
    end if;
  end loop;
  if tg_table_name = 'announcements' and exists (
    select 1 from jsonb_array_elements_text(coalesce(nullif(row_data->'target_users', 'null'::jsonb), '[]'::jsonb)) t(value)
    where not exists(select 1 from public.choir_members m
      where m.id = t.value::uuid and m.choir_id = new.choir_id)
  ) then raise exception 'Cross-tenant announcement target rejected' using errcode = '23514'; end if;
  return new;
end;
$$;
revoke all on function genova_003.enforce_tenant_links() from public, anon, authenticated, service_role;
do $triggers$
declare target record;
begin
  for target in select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'choir_id'
  loop
    execute format('create trigger tenant_links_003 before insert or update on public.%I
      for each row execute function genova_003.enforce_tenant_links()', target.table_name);
    execute format('create policy tenant_isolation_003 on public.%I as restrictive
      for all to public using (choir_id = public.current_choir_id())
      with check (choir_id = public.current_choir_id())', target.table_name);
  end loop;
end
$triggers$;
