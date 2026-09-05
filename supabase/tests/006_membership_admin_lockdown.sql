-- Run only on an isolated/restored database with 003, 005 and 006 applied.
-- All fixtures and mutation checks are transaction-local and rolled back.

begin;

do $fixtures$
declare
  test_user uuid := gen_random_uuid();
  test_choir uuid := gen_random_uuid();
  test_member uuid := gen_random_uuid();
  test_role uuid := gen_random_uuid();
  test_department uuid := gen_random_uuid();
  test_school uuid := gen_random_uuid();
begin
  create temporary table test_006_ids (
    auth_user_id uuid not null,
    choir_id uuid not null,
    member_id uuid not null,
    role_id uuid not null,
    department_id uuid not null,
    school_id uuid not null
  ) on commit drop;
  grant select on table test_006_ids to authenticated, service_role;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values (
    test_user,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    '006-' || test_user || '@example.invalid',
    '',
    now(),
    now(),
    now()
  );

  insert into public.choirs (id, slug, name)
  values (test_choir, '006-' || test_choir, '006 Security Test');

  insert into public.roles (id, choir_id, name)
  values (test_role, test_choir, 'Şef');

  insert into public.departments (id, choir_id, name)
  values (test_department, test_choir, '006 Department');

  insert into public.schools (id, choir_id, name)
  values (test_school, test_choir, '006 School');

  insert into public.choir_members (
    id, choir_id, auth_user_id, first_name, last_name, voice_group,
    join_date, department_id, school_id
  ) values (
    test_member, test_choir, test_user, '006', 'Member', 'Şef',
    current_date, test_department, test_school
  );

  insert into public.choir_member_roles (choir_id, member_id, role_id)
  values (test_choir, test_member, test_role);

  insert into test_006_ids values (
    test_user, test_choir, test_member, test_role, test_department, test_school
  );
end
$fixtures$;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select auth_user_id from test_006_ids),
    'role', 'authenticated',
    'session_id', gen_random_uuid()
  )::text,
  true
);

do $authenticated_checks$
declare
  ids test_006_ids%rowtype;
  affected integer;
begin
  select * into strict ids from test_006_ids;

  if public.current_choir_id() <> ids.choir_id
    or not public.current_member_has_role('Şef') then
    raise exception '006 fixture did not resolve an authenticated Şef membership';
  end if;

  begin
    insert into public.choir_members (
      choir_id, first_name, last_name, join_date
    ) values (ids.choir_id, 'Blocked', 'Member', current_date);
    raise exception 'Authenticated choir_members insert was accepted';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.choir_member_roles (choir_id, member_id, role_id)
    values (ids.choir_id, ids.member_id, ids.role_id);
    raise exception 'Authenticated choir_member_roles insert was accepted';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.roles (choir_id, name)
    values (ids.choir_id, 'Blocked Role');
    raise exception 'Authenticated roles insert was accepted';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.departments (choir_id, name)
    values (ids.choir_id, 'Blocked Department');
    raise exception 'Authenticated departments insert was accepted';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.schools (choir_id, name)
    values (ids.choir_id, 'Blocked School');
    raise exception 'Authenticated schools insert was accepted';
  exception when insufficient_privilege then
    null;
  end;

  update public.choir_members set last_name = last_name where id = ids.member_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Authenticated choir_members update was accepted'; end if;

  update public.choir_member_roles set assigned_at = assigned_at where member_id = ids.member_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Authenticated choir_member_roles update was accepted'; end if;

  update public.roles set name = name where id = ids.role_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Authenticated roles update was accepted'; end if;

  update public.departments set name = name where id = ids.department_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Authenticated departments update was accepted'; end if;

  update public.schools set name = name where id = ids.school_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Authenticated schools update was accepted'; end if;

  delete from public.choir_member_roles where member_id = ids.member_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Authenticated choir_member_roles delete was accepted'; end if;

  delete from public.choir_members where id = ids.member_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Authenticated choir_members delete was accepted'; end if;

  delete from public.roles where id = ids.role_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Authenticated roles delete was accepted'; end if;

  delete from public.departments where id = ids.department_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Authenticated departments delete was accepted'; end if;

  delete from public.schools where id = ids.school_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Authenticated schools delete was accepted'; end if;
end
$authenticated_checks$;

reset role;
set local role service_role;

do $service_role_checks$
declare
  ids test_006_ids%rowtype;
  affected integer;
begin
  select * into strict ids from test_006_ids;

  update public.choir_members set last_name = last_name where id = ids.member_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Service role could not update choir_members'; end if;

  update public.choir_member_roles set assigned_at = assigned_at where member_id = ids.member_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Service role could not update choir_member_roles'; end if;

  update public.roles set name = name where id = ids.role_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Service role could not update roles'; end if;

  update public.departments set name = name where id = ids.department_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Service role could not update departments'; end if;

  update public.schools set name = name where id = ids.school_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Service role could not update schools'; end if;
end
$service_role_checks$;

reset role;

do $policy_checks$
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
    and permissive = 'RESTRICTIVE'
    and roles = array['authenticated']::name[];

  if policy_count <> 15 then
    raise exception '006 expected 15 restrictive authenticated policies, found %', policy_count;
  end if;
end
$policy_checks$;

rollback;
