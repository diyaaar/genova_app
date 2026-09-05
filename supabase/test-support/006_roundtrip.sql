-- LOCAL RESTORED DATABASE ONLY. Run with psql -X -v ON_ERROR_STOP=1.
-- Never run on production: this applies and reverses 006 inside a transaction.

\set ON_ERROR_STOP on

begin;

create temporary table before_006_policies as
select to_jsonb(policy) definition
from pg_policies policy
where schemaname = 'public'
  and tablename = any (array[
    'choir_members', 'choir_member_roles', 'roles', 'departments', 'schools'
  ]);

create temporary table before_006_rows as
select table_name, row_count, digest
from (
  select 'choir_members'::text table_name, count(*) row_count,
    md5(coalesce(string_agg(to_jsonb(row_value)::text, chr(10) order by to_jsonb(row_value)::text), '')) digest
  from public.choir_members row_value
  union all
  select 'choir_member_roles', count(*),
    md5(coalesce(string_agg(to_jsonb(row_value)::text, chr(10) order by to_jsonb(row_value)::text), ''))
  from public.choir_member_roles row_value
  union all
  select 'roles', count(*),
    md5(coalesce(string_agg(to_jsonb(row_value)::text, chr(10) order by to_jsonb(row_value)::text), ''))
  from public.roles row_value
  union all
  select 'departments', count(*),
    md5(coalesce(string_agg(to_jsonb(row_value)::text, chr(10) order by to_jsonb(row_value)::text), ''))
  from public.departments row_value
  union all
  select 'schools', count(*),
    md5(coalesce(string_agg(to_jsonb(row_value)::text, chr(10) order by to_jsonb(row_value)::text), ''))
  from public.schools row_value
) snapshot;

\ir ../migrations/20260905102806_membership_admin_lockdown_006.sql

do $migration_checks$
declare
  policy_count integer;
begin
  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = any (array[
      'choir_members', 'choir_member_roles', 'roles', 'departments', 'schools'
    ])
    and policyname like 'membership_admin_lockdown_006_%'
    and permissive = 'RESTRICTIVE';

  if policy_count <> 15 then
    raise exception '006 migration created % policies instead of 15', policy_count;
  end if;
end
$migration_checks$;

\ir ../rollback/006_membership_admin_lockdown_down.sql

do $roundtrip_checks$
declare
  target record;
  actual_count bigint;
  actual_digest text;
begin
  if exists (
    (select definition from before_006_policies
     except
     select to_jsonb(policy) from pg_policies policy
     where schemaname = 'public'
       and tablename = any (array[
         'choir_members', 'choir_member_roles', 'roles', 'departments', 'schools'
       ]))
    union all
    (select to_jsonb(policy) from pg_policies policy
     where schemaname = 'public'
       and tablename = any (array[
         'choir_members', 'choir_member_roles', 'roles', 'departments', 'schools'
       ])
     except select definition from before_006_policies)
  ) then
    raise exception '006 policy roundtrip mismatch';
  end if;

  for target in select * from before_006_rows loop
    execute format(
      'select count(*), md5(coalesce(string_agg(to_jsonb(row_value)::text, chr(10) '
      'order by to_jsonb(row_value)::text), '''')) from public.%I row_value',
      target.table_name
    ) into actual_count, actual_digest;

    if actual_count <> target.row_count or actual_digest <> target.digest then
      raise exception '006 roundtrip changed data in %', target.table_name;
    end if;
  end loop;
end
$roundtrip_checks$;

rollback;
