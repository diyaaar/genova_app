-- 003 rollback: keep a fresh backup; refuse rollback once other tenants exist.
-- Run this file in a single transaction. Restore exact policy/function definitions.
select pg_advisory_xact_lock(hashtext('genovakorist:003:tenant-schema'));
set local lock_timeout = '5s';
do $rollback$
declare t record; p record; f record; roles_sql text;
begin
  if exists(select 1 from public.choirs where slug <> 'genesi-nova') then
    raise exception 'Rollback requires reconciliation of other tenants first';
  end if;
  for t in select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'choir_id'
  loop
    execute format('drop trigger tenant_links_003 on public.%I', t.table_name);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t.table_name
    loop execute format('drop policy %I on public.%I', p.policyname, t.table_name); end loop;
    for p in select * from genova_003.original_policies where tablename = t.table_name
    loop
      select string_agg(quote_ident(r), ', ') into roles_sql from unnest(p.roles) r;
      execute format('create policy %I on public.%I as %s for %s to %s%s%s',
        p.policyname, p.tablename, p.permissive, p.cmd, roles_sql,
        case when p.qual is null then '' else ' using (' || p.qual || ')' end,
        case when p.with_check is null then '' else ' with check (' || p.with_check || ')' end);
    end loop;
  end loop;
  for f in select definition from genova_003.original_functions loop execute f.definition; end loop;
end
$rollback$;
drop policy "Members can view current choir" on public.choirs;

alter table public.chat_rooms
  drop constraint chat_rooms_slug_key,
  add constraint chat_rooms_slug_key unique (slug);

alter table public.choir_members
  drop constraint choir_members_email_key,
  add constraint choir_members_email_key unique (email);

alter table public.departments
  drop constraint departments_name_key,
  add constraint departments_name_key unique (name);

alter table public.rehearsals
  drop constraint rehearsals_date_start_time_key,
  add constraint rehearsals_date_start_time_key unique (date, start_time);

alter table public.repertoire_tags
  drop constraint repertoire_tags_name_key,
  add constraint repertoire_tags_name_key unique (name);

alter table public.repertoire
  drop constraint repertoire_title_key,
  add constraint repertoire_title_key unique (title);

alter table public.roles
  drop constraint roles_name_key,
  add constraint roles_name_key unique (name);

alter table public.schools
  drop constraint schools_name_key,
  add constraint schools_name_key unique (name);

alter table public.repertoire_cache_versions
  drop constraint repertoire_cache_versions_pkey,
  add constraint repertoire_cache_versions_pkey primary key (scope);


do $rollback$
declare t record;
begin
  for t in select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'choir_id'
  loop
    execute format('alter table public.%I drop column choir_id', t.table_name);
  end loop;
end
$rollback$;
drop function public.current_choir_id();
drop table public.choirs;
drop function genova_003.enforce_tenant_links();
drop table genova_003.original_policies;
drop table genova_003.original_functions;
drop table genova_003.original_triggers;
drop schema genova_003;
notify pgrst, 'reload schema';
