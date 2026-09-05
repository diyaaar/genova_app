-- LOCAL RESTORED 003 REPLICA ONLY. Run with psql -X -v ON_ERROR_STOP=1.
-- Never run on production: this applies and reverses 005 inside a transaction.
\set ON_ERROR_STOP on

begin;

create temporary table before_rows (
  table_name text primary key,
  row_count bigint,
  digest text
);

do $capture_rows$
declare
  target record;
  row_count bigint;
  digest text;
begin
  for target in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format(
      'select count(*), md5(coalesce(string_agg(row_json, chr(10) order by row_json), ''''))
       from (select to_jsonb(row_value)::text as row_json from public.%I row_value) rows',
      target.tablename
    ) into row_count, digest;
    insert into before_rows values (target.tablename, row_count, digest);
  end loop;
end
$capture_rows$;

create temporary table before_policies as
  select to_jsonb(policy) definition
  from pg_policies policy
  where schemaname = 'public';

create temporary table before_functions as
  select
    routine.oid::regprocedure::text signature,
    pg_get_functiondef(routine.oid) definition,
    obj_description(routine.oid, 'pg_proc') description,
    routine.proacl privileges
  from pg_proc routine
  join pg_namespace namespace on namespace.oid = routine.pronamespace
  where namespace.nspname = 'public' and routine.prokind = 'f';

create temporary table before_triggers as
  select
    trigger.tgrelid,
    trigger.tgname,
    trigger.tgenabled,
    pg_get_triggerdef(trigger.oid) definition
  from pg_trigger trigger
  join pg_class relation on relation.oid = trigger.tgrelid
  join pg_namespace namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public' and not trigger.tgisinternal;

create temporary table before_constraints as
  select
    constraint_row.conrelid,
    constraint_row.conname,
    pg_get_constraintdef(constraint_row.oid) definition
  from pg_constraint constraint_row
  where constraint_row.connamespace = 'public'::regnamespace;

create temporary table before_indexes as
  select tablename, indexname, indexdef
  from pg_indexes
  where schemaname = 'public';

\ir ../migrations/20260905003154_multi_membership_active_choir_005.sql

do $migration_checks$
begin
  if to_regnamespace('genova_005') is null
    or to_regclass('genova_005.active_choir_sessions') is null
    or to_regclass('genova_005.active_choir_sessions_membership_idx') is null
    or to_regprocedure('public.list_my_choirs()') is null
    or to_regprocedure('public.set_active_choir(uuid)') is null
    or to_regprocedure('public.upsert_my_active_push_subscription(text,text,text,text)') is null
    or to_regprocedure('public.delete_my_push_subscription(text)') is null then
    raise exception '005 migration objects are incomplete';
  end if;
  if to_regclass('public.choir_members_auth_user_id_key') is not null
    or to_regclass('public.choir_members_choir_id_auth_user_id_key') is null then
    raise exception '005 membership uniqueness contract is incomplete';
  end if;
end
$migration_checks$;

\ir ../rollback/005_multi_membership_active_choir_down.sql

do $roundtrip_checks$
declare
  target record;
  row_count bigint;
  digest text;
begin
  for target in select * from before_rows loop
    execute format(
      'select count(*), md5(coalesce(string_agg(row_json, chr(10) order by row_json), ''''))
       from (select to_jsonb(row_value)::text as row_json from public.%I row_value) rows',
      target.table_name
    ) into row_count, digest;
    if row_count <> target.row_count or digest <> target.digest then
      raise exception '005 roundtrip changed data in %', target.table_name;
    end if;
  end loop;

  if exists (
    (select definition from before_policies
     except select to_jsonb(policy) from pg_policies policy where schemaname = 'public')
    union all
    (select to_jsonb(policy) from pg_policies policy where schemaname = 'public'
     except select definition from before_policies)
  ) then
    raise exception '005 policy roundtrip mismatch';
  end if;

  if exists (
    select 1
    from before_functions expected
    left join pg_proc actual on actual.oid = to_regprocedure(expected.signature)
    where actual.oid is null
      or expected.definition is distinct from pg_get_functiondef(actual.oid)
      or expected.description is distinct from obj_description(actual.oid, 'pg_proc')
      or expected.privileges is distinct from actual.proacl
  ) then
    raise exception '005 function roundtrip mismatch';
  end if;

  if exists (
    select 1
    from before_triggers expected
    left join pg_trigger actual
      on actual.tgrelid = expected.tgrelid and actual.tgname = expected.tgname
    where actual.oid is null
      or expected.tgenabled is distinct from actual.tgenabled
      or expected.definition is distinct from pg_get_triggerdef(actual.oid)
  ) then
    raise exception '005 trigger roundtrip mismatch';
  end if;

  if exists (
    (select conrelid, conname, definition from before_constraints
     except
     select conrelid, conname, pg_get_constraintdef(oid)
     from pg_constraint where connamespace = 'public'::regnamespace)
    union all
    (select conrelid, conname, pg_get_constraintdef(oid)
     from pg_constraint where connamespace = 'public'::regnamespace
     except select conrelid, conname, definition from before_constraints)
  ) then
    raise exception '005 constraint roundtrip mismatch';
  end if;

  if exists (
    (select tablename, indexname, indexdef from before_indexes
     except select tablename, indexname, indexdef from pg_indexes where schemaname = 'public')
    union all
    (select tablename, indexname, indexdef from pg_indexes where schemaname = 'public'
     except select tablename, indexname, indexdef from before_indexes)
  ) then
    raise exception '005 index roundtrip mismatch';
  end if;

  if to_regnamespace('genova_005') is not null
    or to_regprocedure('public.list_my_choirs()') is not null
    or to_regprocedure('public.set_active_choir(uuid)') is not null
    or to_regprocedure('public.upsert_my_active_push_subscription(text,text,text,text)') is not null
    or to_regprocedure('public.delete_my_push_subscription(text)') is not null
    or to_regclass('public.choir_members_auth_user_id_key') is null
    or to_regclass('public.choir_members_choir_id_auth_user_id_key') is not null then
    raise exception '005 rollback left migration objects behind';
  end if;

  raise notice '005 exact data/policy/function/trigger/constraint/index roundtrip passed';
end
$roundtrip_checks$;

rollback;
