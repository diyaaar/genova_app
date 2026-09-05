-- Remove only the restrictive policies introduced by 006.

select pg_advisory_xact_lock(hashtext('genovakorist:006:membership-admin-lockdown'));

set local lock_timeout = '5s';
set local statement_timeout = '90s';

do $rollback$
declare
  table_name text;
  target_tables constant text[] := array[
    'choir_members',
    'choir_member_roles',
    'roles',
    'departments',
    'schools'
  ];
begin
  foreach table_name in array target_tables loop
    if to_regclass(format('public.%I', table_name)) is null then
      raise exception '006 rollback expected public.% but it does not exist', table_name;
    end if;

    execute format(
      'drop policy if exists membership_admin_lockdown_006_insert on public.%I',
      table_name
    );
    execute format(
      'drop policy if exists membership_admin_lockdown_006_update on public.%I',
      table_name
    );
    execute format(
      'drop policy if exists membership_admin_lockdown_006_delete on public.%I',
      table_name
    );
  end loop;
end
$rollback$;

notify pgrst, 'reload schema';
