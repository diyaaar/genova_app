-- 006: membership master data is server-managed. Authenticated clients may
-- keep their existing read access but must not write these tables directly.

select pg_advisory_xact_lock(hashtext('genovakorist:006:membership-admin-lockdown'));

set local lock_timeout = '5s';
set local statement_timeout = '90s';

do $migration$
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
      raise exception '006 expected public.% but it does not exist', table_name;
    end if;

    execute format('alter table public.%I enable row level security', table_name);

    execute format(
      'drop policy if exists membership_admin_lockdown_006_insert on public.%I',
      table_name
    );
    execute format(
      'create policy membership_admin_lockdown_006_insert on public.%I '
      'as restrictive for insert to authenticated '
      'with check (choir_id = public.current_choir_id() and false)',
      table_name
    );

    execute format(
      'drop policy if exists membership_admin_lockdown_006_update on public.%I',
      table_name
    );
    execute format(
      'create policy membership_admin_lockdown_006_update on public.%I '
      'as restrictive for update to authenticated '
      'using (choir_id = public.current_choir_id() and false) '
      'with check (choir_id = public.current_choir_id() and false)',
      table_name
    );

    execute format(
      'drop policy if exists membership_admin_lockdown_006_delete on public.%I',
      table_name
    );
    execute format(
      'create policy membership_admin_lockdown_006_delete on public.%I '
      'as restrictive for delete to authenticated '
      'using (choir_id = public.current_choir_id() and false)',
      table_name
    );
  end loop;
end
$migration$;

notify pgrst, 'reload schema';
