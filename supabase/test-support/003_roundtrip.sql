-- LOCAL RESTORED REPLICA ONLY. Run with psql -X -v ON_ERROR_STOP=1 -f this-file.
-- Never run on production: this applies and reverses DDL under a transaction.
\set ON_ERROR_STOP on
begin;
create temporary table before_rows (table_name text primary key, row_count bigint, digest text);
do $$
declare t record; n bigint; digest text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('select count(*), md5(coalesce(string_agg(row_json, chr(10) order by row_json), ''''))
      from (select to_jsonb(r)::text as row_json from public.%I r) s', t.tablename) into n, digest;
    insert into before_rows values(t.tablename, n, digest);
  end loop;
end $$;
create temporary table before_policies as select to_jsonb(p) as definition from pg_policies p where schemaname = 'public';
create temporary table before_functions as
  select p.oid::regprocedure::text as signature, pg_get_functiondef(p.oid) as definition
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prokind = 'f';
create temporary table before_triggers as
  select t.tgrelid, t.tgname, t.tgenabled, pg_get_triggerdef(t.oid) as definition
  from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and not t.tgisinternal;
create temporary table before_constraints as
  select conrelid, conname, pg_get_constraintdef(oid) as definition
  from pg_constraint where connamespace = 'public'::regnamespace;
\ir ../migrations/20260903214901_tenant_schema_003.sql
do $$
declare t record; n bigint; digest text; bad bigint;
begin
  for t in select * from before_rows loop
    execute format('select count(*), md5(coalesce(string_agg(row_json, chr(10) order by row_json), ''''))
      from (select (to_jsonb(r) - ''choir_id'')::text as row_json from public.%I r) s', t.table_name) into n, digest;
    if n <> t.row_count or digest <> t.digest then raise exception 'Backfill changed existing data in %', t.table_name; end if;
  end loop;
  for t in select table_name from information_schema.columns where table_schema = 'public' and column_name = 'choir_id' loop
    execute format('select count(*) from public.%I where choir_id is distinct from $1', t.table_name)
      into bad using 'b596e85e-6dfe-4bd4-8ecc-61ff3b925d40'::uuid;
    if bad <> 0 then raise exception 'Backfill missed rows in %', t.table_name; end if;
  end loop;
  raise notice '003 backfill preserved all 37 tables, including timestamps and audit/cache values';
end $$;
\ir ../rollback/003_tenant_schema_down.sql
do $$
declare t record; n bigint; digest text;
begin
  for t in select * from before_rows loop
    execute format('select count(*), md5(coalesce(string_agg(row_json, chr(10) order by row_json), ''''))
      from (select to_jsonb(r)::text as row_json from public.%I r) s', t.table_name) into n, digest;
    if n <> t.row_count or digest <> t.digest then raise exception 'Rollback changed data in %', t.table_name; end if;
  end loop;
  if exists ((select * from before_policies except select to_jsonb(p) from pg_policies p where schemaname = 'public')
    union all (select to_jsonb(p) from pg_policies p where schemaname = 'public' except select * from before_policies)) then
    raise exception 'Policy roundtrip mismatch';
  end if;
  if exists (select 1 from before_functions f where f.definition is distinct from pg_get_functiondef(to_regprocedure(f.signature))) then
    raise exception 'Function roundtrip mismatch';
  end if;
  if exists (select 1 from before_triggers b left join pg_trigger trg on trg.tgrelid=b.tgrelid and trg.tgname=b.tgname
    where b.tgenabled is distinct from trg.tgenabled or b.definition is distinct from pg_get_triggerdef(trg.oid)) then
    raise exception 'Trigger roundtrip mismatch';
  end if;
  if exists (select 1 from before_constraints b left join pg_constraint c on c.conrelid=b.conrelid and c.conname=b.conname
    where b.definition is distinct from pg_get_constraintdef(c.oid)) then raise exception 'Constraint roundtrip mismatch'; end if;
  if to_regclass('public.choirs') is not null or to_regnamespace('genova_003') is not null
    or exists(select 1 from information_schema.columns where table_schema='public' and column_name='choir_id') then
    raise exception 'Rollback left tenant schema objects behind';
  end if;
  raise notice '003 exact data/policy/function/trigger/constraint roundtrip passed';
end $$;
rollback;
