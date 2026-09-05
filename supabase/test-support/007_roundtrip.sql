-- LOCAL RESTORED DATABASE ONLY. Run with psql -X -v ON_ERROR_STOP=1.
-- Never run on production: this applies and reverses 007 inside a transaction.

\set ON_ERROR_STOP on

begin;

do $precondition$
begin
  if to_regnamespace('genova_007') is not null
    or to_regprocedure('public.create_operator_choir(text,text,uuid,text,text)') is not null then
    raise exception '007 roundtrip requires a pre-007 database';
  end if;
end
$precondition$;

create temporary table before_007_rows as
select table_name, row_count, digest
from (
  select 'choirs'::text table_name, count(*) row_count,
    md5(coalesce(string_agg(to_jsonb(row_value)::text, chr(10) order by to_jsonb(row_value)::text), '')) digest
  from public.choirs row_value
  union all
  select 'choir_members', count(*),
    md5(coalesce(string_agg(to_jsonb(row_value)::text, chr(10) order by to_jsonb(row_value)::text), ''))
  from public.choir_members row_value
  union all
  select 'roles', count(*),
    md5(coalesce(string_agg(to_jsonb(row_value)::text, chr(10) order by to_jsonb(row_value)::text), ''))
  from public.roles row_value
  union all
  select 'choir_member_roles', count(*),
    md5(coalesce(string_agg(to_jsonb(row_value)::text, chr(10) order by to_jsonb(row_value)::text), ''))
  from public.choir_member_roles row_value
) snapshot;

\ir ../migrations/20260905160539_operator_controlled_choir_creation_007.sql

do $migration_checks$
declare
  signature constant text := 'public.create_operator_choir(text,text,uuid,text,text)';
begin
  if to_regnamespace('genova_007') is null
    or to_regclass('genova_007.platform_operators') is null
    or to_regclass('genova_007.choir_creation_audit') is null
    or to_regprocedure(signature) is null then
    raise exception '007 migration did not create every expected object';
  end if;

  if (select count(*) from genova_007.platform_operators) <> 0
    or (select count(*) from genova_007.choir_creation_audit) <> 0 then
    raise exception '007 migration unexpectedly granted an operator or created product data';
  end if;

  if not has_function_privilege('authenticated', signature, 'EXECUTE')
    or has_function_privilege('anon', signature, 'EXECUTE')
    or has_function_privilege('service_role', signature, 'EXECUTE') then
    raise exception '007 migration function grants are not least-privilege';
  end if;

  if not (
    select routine.prosecdef
    from pg_proc routine
    where routine.oid = to_regprocedure(signature)
  ) then
    raise exception '007 function must be security definer';
  end if;
end
$migration_checks$;

\ir ../rollback/007_operator_controlled_choir_creation_down.sql

do $roundtrip_checks$
declare
  target record;
  actual_count bigint;
  actual_digest text;
begin
  if to_regnamespace('genova_007') is not null
    or to_regprocedure('public.create_operator_choir(text,text,uuid,text,text)') is not null then
    raise exception '007 down migration left schema or function objects';
  end if;

  for target in select * from before_007_rows loop
    execute format(
      'select count(*), md5(coalesce(string_agg(to_jsonb(row_value)::text, chr(10) '
      'order by to_jsonb(row_value)::text), '''')) from public.%I row_value',
      target.table_name
    ) into actual_count, actual_digest;

    if actual_count <> target.row_count or actual_digest <> target.digest then
      raise exception '007 roundtrip changed product data in %', target.table_name;
    end if;
  end loop;
end
$roundtrip_checks$;

rollback;
