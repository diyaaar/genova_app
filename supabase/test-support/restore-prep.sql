-- Prepares a local PostgreSQL 17 so a Supabase logical dump restores and behaves like
-- the live project. LOCAL RESTORE ONLY — never run against production.
--
-- pg_dump carries schemas, data and grants, but NOT role attributes, which live in the
-- cluster globals. Without them a restore looks fine and then lies: roles that carry
-- BYPASSRLS upstream lose it here, so RLS silently filters rows for SECURITY DEFINER
-- functions and service-role writes, and tenant CHECK constraints that look a parent row
-- up can pass vacuously. The attributes below were read from the live project on
-- 7 September 2026 (pg_roles) and are reproduced exactly.

do $$
declare r text;
begin
  foreach r in array array[
    'postgres','anon','authenticated','service_role','authenticator','dashboard_user',
    'pgbouncer','supabase_admin','supabase_auth_admin','supabase_storage_admin',
    'supabase_realtime_admin','supabase_replication_admin','supabase_read_only_user'
  ] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I', r);
    end if;
  end loop;
end $$;

-- Attributes as observed live. BYPASSRLS is the one that matters for the 003/006/007 tests.
alter role anon                       with nobypassrls nologin inherit;
alter role authenticated              with nobypassrls nologin inherit;
alter role authenticator              with nobypassrls login   noinherit;
alter role dashboard_user             with nobypassrls nologin inherit   createrole createdb replication;
alter role pgbouncer                  with nobypassrls login   inherit;
alter role postgres                   with bypassrls   login   inherit   createrole createdb replication;
alter role service_role               with bypassrls   nologin inherit;
alter role supabase_admin             with superuser   bypassrls login inherit createrole createdb replication;
alter role supabase_auth_admin        with nobypassrls login   noinherit createrole;
alter role supabase_read_only_user    with bypassrls   login   inherit;
alter role supabase_realtime_admin    with nobypassrls nologin noinherit;
alter role supabase_replication_admin with nobypassrls login   inherit   replication;
alter role supabase_storage_admin     with nobypassrls login   noinherit createrole;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
