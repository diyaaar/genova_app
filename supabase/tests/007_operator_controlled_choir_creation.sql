-- Run only on an isolated/restored database with 003, 005, 006 and 007 applied.
-- All fixtures and mutation checks are transaction-local and rolled back.

begin;

do $fixtures$
declare
  operator_user_id uuid := gen_random_uuid();
  founder_user_id uuid := gen_random_uuid();
  choir_chef_user_id uuid := gen_random_uuid();
  existing_choir_id uuid := gen_random_uuid();
  existing_member_id uuid := gen_random_uuid();
  existing_chef_role_id uuid := gen_random_uuid();
begin
  create temporary table test_007_ids (
    operator_auth_user_id uuid not null,
    founder_auth_user_id uuid not null,
    choir_chef_auth_user_id uuid not null,
    existing_choir_id uuid not null
  ) on commit drop;
  grant select on table test_007_ids to authenticated, anon, service_role;

  create temporary table test_007_created (
    choir_id uuid not null,
    member_id uuid not null,
    choir_slug text not null,
    choir_name text not null
  ) on commit drop;
  grant select, insert on table test_007_created to authenticated;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values
    (
      operator_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'operator-007-' || operator_user_id || '@example.invalid',
      '', now(), now(), now()
    ),
    (
      founder_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'founder-007-' || founder_user_id || '@example.invalid',
      '', now(), now(), now()
    ),
    (
      choir_chef_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'chef-007-' || choir_chef_user_id || '@example.invalid',
      '', now(), now(), now()
    );

  insert into public.choirs (id, slug, name)
  values (existing_choir_id, 'existing-007-' || existing_choir_id, 'Existing 007 Choir');

  insert into public.roles (id, choir_id, name)
  values (existing_chef_role_id, existing_choir_id, 'Şef');

  insert into public.choir_members (
    id, choir_id, auth_user_id, email, first_name, last_name,
    voice_group, join_date, is_active
  ) values (
    existing_member_id,
    existing_choir_id,
    choir_chef_user_id,
    'chef-007-' || choir_chef_user_id || '@example.invalid',
    'Choir',
    'Chef',
    'Şef',
    current_date,
    true
  );

  insert into public.choir_member_roles (choir_id, member_id, role_id)
  values (existing_choir_id, existing_member_id, existing_chef_role_id);

  insert into genova_007.platform_operators (auth_user_id)
  values (operator_user_id);

  insert into test_007_ids values (
    operator_user_id,
    founder_user_id,
    choir_chef_user_id,
    existing_choir_id
  );
end
$fixtures$;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select operator_auth_user_id from test_007_ids),
    'role', 'authenticated',
    'session_id', gen_random_uuid()
  )::text,
  true
);

insert into test_007_created (choir_id, member_id, choir_slug, choir_name)
select *
from public.create_operator_choir(
  '  Test Korosu  ',
  '  TEST-KOROSU-007  ',
  (select founder_auth_user_id from test_007_ids),
  '  Ada  ',
  '  Lovelace  '
);

reset role;

do $creation_checks$
declare
  created test_007_created%rowtype;
  ids test_007_ids%rowtype;
  expected_email text;
begin
  select * into strict created from test_007_created;
  select * into strict ids from test_007_ids;
  select lower(btrim(email)) into strict expected_email
  from auth.users where id = ids.founder_auth_user_id;

  if created.choir_slug <> 'test-korosu-007'
    or created.choir_name <> 'Test Korosu' then
    raise exception '007 did not normalize the choir result';
  end if;

  if not exists (
    select 1 from public.choirs
    where id = created.choir_id
      and slug = created.choir_slug
      and name = created.choir_name
  ) then
    raise exception '007 choir record is missing';
  end if;

  if (select count(*) from public.roles where choir_id = created.choir_id) <> 3
    or (select array_agg(name order by name) from public.roles where choir_id = created.choir_id)
      <> array['Korist', 'Partisyon Şefi', 'Şef']::text[] then
    raise exception '007 default role set is incomplete';
  end if;

  if not exists (
    select 1
    from public.choir_members member
    where member.id = created.member_id
      and member.choir_id = created.choir_id
      and member.auth_user_id = ids.founder_auth_user_id
      and member.email = expected_email
      and member.first_name = 'Ada'
      and member.last_name = 'Lovelace'
      and member.voice_group = 'Şef'
      and member.is_active
  ) then
    raise exception '007 founding membership is incomplete';
  end if;

  if not exists (
    select 1
    from public.choir_member_roles member_role
    join public.roles role_record on role_record.id = member_role.role_id
    where member_role.choir_id = created.choir_id
      and member_role.member_id = created.member_id
      and role_record.choir_id = created.choir_id
      and role_record.name = 'Şef'
  ) then
    raise exception '007 founding Chef role is missing';
  end if;

  if not exists (
    select 1
    from genova_007.choir_creation_audit audit
    where audit.choir_id = created.choir_id
      and audit.operator_auth_user_id = ids.operator_auth_user_id
      and audit.founder_auth_user_id = ids.founder_auth_user_id
  ) then
    raise exception '007 creation audit is missing';
  end if;
end
$creation_checks$;

set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select operator_auth_user_id from test_007_ids),
    'role', 'authenticated',
    'session_id', gen_random_uuid()
  )::text,
  true
);

do $atomicity_checks$
declare
  ids test_007_ids%rowtype;
  before_choirs bigint;
  before_members bigint;
  before_roles bigint;
  before_member_roles bigint;
begin
  select * into strict ids from test_007_ids;
  select count(*) into before_choirs from public.choirs;
  select count(*) into before_members from public.choir_members;
  select count(*) into before_roles from public.roles;
  select count(*) into before_member_roles from public.choir_member_roles;

  begin
    perform public.create_operator_choir(
      'Duplicate Choir',
      'test-korosu-007',
      ids.founder_auth_user_id,
      'Ada',
      'Lovelace'
    );
    raise exception '007 duplicate slug was accepted';
  exception when unique_violation then
    null;
  end;

  begin
    perform public.create_operator_choir(
      'Invalid Choir',
      'invalid slug',
      ids.founder_auth_user_id,
      'Ada',
      'Lovelace'
    );
    raise exception '007 invalid slug was accepted';
  exception when invalid_parameter_value then
    null;
  end;

  if (select count(*) from public.choirs) <> before_choirs
    or (select count(*) from public.choir_members) <> before_members
    or (select count(*) from public.roles) <> before_roles
    or (select count(*) from public.choir_member_roles) <> before_member_roles then
    raise exception '007 rejected request left partial product data';
  end if;
end
$atomicity_checks$;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select choir_chef_auth_user_id from test_007_ids),
    'role', 'authenticated',
    'session_id', gen_random_uuid()
  )::text,
  true
);

do $choir_chef_denial$
declare
  ids test_007_ids%rowtype;
begin
  select * into strict ids from test_007_ids;
  if not public.current_member_has_role('Şef') then
    raise exception '007 Chef denial fixture is invalid';
  end if;

  begin
    perform public.create_operator_choir(
      'Blocked Chef Choir',
      'blocked-chef-007',
      ids.founder_auth_user_id,
      'Ada',
      'Lovelace'
    );
    raise exception '007 choir-level Chef received platform authority';
  exception when insufficient_privilege then
    null;
  end;
end
$choir_chef_denial$;

reset role;
set local role anon;

do $anon_denial$
begin
  begin
    perform public.create_operator_choir(
      'Blocked Anonymous Choir',
      'blocked-anon-007',
      gen_random_uuid(),
      'Ada',
      'Lovelace'
    );
    raise exception '007 anonymous execute was accepted';
  exception when insufficient_privilege then
    null;
  end;
end
$anon_denial$;

reset role;
set local role service_role;

do $service_role_denial$
begin
  begin
    perform public.create_operator_choir(
      'Blocked Service Choir',
      'blocked-service-007',
      gen_random_uuid(),
      'Ada',
      'Lovelace'
    );
    raise exception '007 service-role execute was accepted';
  exception when insufficient_privilege then
    null;
  end;
end
$service_role_denial$;

reset role;
set local role authenticated;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select founder_auth_user_id from test_007_ids),
    'role', 'authenticated',
    'session_id', gen_random_uuid()
  )::text,
  true
);

do $founder_tenant_check$
declare
  created test_007_created%rowtype;
begin
  select * into strict created from test_007_created;
  if public.current_choir_id() <> created.choir_id
    or public.current_choir_member_id() <> created.member_id
    or not public.current_member_has_role('Şef') then
    raise exception '007 founder cannot resolve the new tenant membership';
  end if;
end
$founder_tenant_check$;

reset role;

do $privilege_checks$
declare
  signature constant text := 'public.create_operator_choir(text,text,uuid,text,text)';
begin
  if not has_function_privilege('authenticated', signature, 'EXECUTE')
    or has_function_privilege('anon', signature, 'EXECUTE')
    or has_function_privilege('service_role', signature, 'EXECUTE') then
    raise exception '007 function grants are not least-privilege';
  end if;

  if has_schema_privilege('authenticated', 'genova_007', 'USAGE')
    or has_table_privilege('authenticated', 'genova_007.platform_operators', 'SELECT')
    or has_table_privilege('service_role', 'genova_007.choir_creation_audit', 'SELECT') then
    raise exception '007 private authorization metadata is exposed';
  end if;

  if not exists (
    select 1
    from pg_class table_record
    join pg_namespace namespace on namespace.oid = table_record.relnamespace
    where namespace.nspname = 'genova_007'
      and table_record.relname in ('platform_operators', 'choir_creation_audit')
      and table_record.relrowsecurity
    group by namespace.nspname
    having count(*) = 2
  ) then
    raise exception '007 private tables are not RLS-enabled';
  end if;
end
$privilege_checks$;

rollback;
