-- Scratch helper for the 010 restore check only. Prepares a local PostgreSQL 17 so a
-- Supabase dump can load: the role names the dump refers to, plus the extension schema
-- and extensions its default expressions need. Delete after the check.
do $$
declare r text;
begin
  foreach r in array array[
    'postgres','anon','authenticated','service_role','authenticator','dashboard_user',
    'pgbouncer','supabase_admin','supabase_auth_admin','supabase_storage_admin',
    'supabase_realtime_admin','supabase_replication_admin','supabase_read_only_user'
  ] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I nologin', r);
    end if;
  end loop;
end $$;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
