-- Run only on an isolated/restored database with 003 and 005 applied.
-- All fixtures are transaction-local and are rolled back.

begin;

do $test$
declare
  user_multi uuid := gen_random_uuid();
  user_single uuid := gen_random_uuid();
  user_outsider uuid := gen_random_uuid();
  session_a uuid := gen_random_uuid();
  session_b uuid := '77777777-7777-7777-7777-777777777777';
  session_single uuid := gen_random_uuid();
  choir_a uuid;
  choir_b uuid := gen_random_uuid();
  choir_outsider uuid := gen_random_uuid();
  member_a uuid := gen_random_uuid();
  member_b uuid := gen_random_uuid();
  member_single uuid := gen_random_uuid();
  role_a uuid;
  role_b uuid := gen_random_uuid();
  repertoire_a uuid := gen_random_uuid();
  repertoire_b uuid := gen_random_uuid();
  selected uuid;
  visible_count integer;
begin
  if has_schema_privilege('authenticated', 'genova_005', 'USAGE')
    or has_function_privilege('anon', 'public.list_my_choirs()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.list_my_choirs()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.set_active_choir(uuid)', 'EXECUTE') then
    raise exception '005 private schema or RPC grants violate least privilege';
  end if;

  select id into strict choir_a from public.choirs where slug = 'genesi-nova';
  select id into strict role_a
  from public.roles
  where choir_id = choir_a and name = 'Şef';

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values
    (user_multi, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '005-multi-' || user_multi || '@example.invalid', '', now(), now(), now()),
    (user_single, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '005-single-' || user_single || '@example.invalid', '', now(), now(), now()),
    (user_outsider, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '005-outsider-' || user_outsider || '@example.invalid', '', now(), now(), now());

  insert into public.choirs (id, slug, name) values
    (choir_b, '005-b-' || choir_b, '005 Choir B'),
    (choir_outsider, '005-out-' || choir_outsider, '005 Outsider Choir');

  insert into public.choir_members (
    id, auth_user_id, choir_id, first_name, last_name, voice_group, join_date
  ) values
    (member_a, user_multi, choir_a, 'Multi', 'A', 'Soprano', current_date),
    (member_b, user_multi, choir_b, 'Multi', 'B', 'Alto', current_date),
    (member_single, user_single, choir_a, 'Single', 'A', 'Tenor', current_date);

  insert into public.roles (id, choir_id, name) values
    (role_b, choir_b, 'Korist');

  insert into public.choir_member_roles (choir_id, member_id, role_id) values
    (choir_a, member_a, role_a),
    (choir_b, member_b, role_b);

  insert into public.repertoire (id, choir_id, title) values
    (repertoire_a, choir_a, '005 Repertoire A ' || repertoire_a),
    (repertoire_b, choir_b, '005 Repertoire B ' || repertoire_b);

  execute 'set local role authenticated';

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', user_multi,
      'role', 'authenticated',
      'session_id', session_a
    )::text,
    true
  );

  if public.current_choir_id() is not null then
    raise exception 'Multi-membership without a choice resolved a tenant';
  end if;
  if public.current_choir_member_id() is not null
    or public.current_chat_member_id() is not null
    or public.get_current_member_id() is not null
    or public.get_my_member_id() is not null
    or public.get_current_member_voice_group() is not null
    or public.get_my_role() is not null
    or public.is_chef()
    or public.is_current_user_chef()
    or public.is_leader() then
    raise exception 'Compatibility helper resolved identity or roles before selection';
  end if;

  select count(*) into visible_count from public.choir_members;
  if visible_count <> 0 then
    raise exception 'Tenant rows were visible before multi-membership selection';
  end if;

  select count(*) into visible_count from public.list_my_choirs();
  if visible_count <> 2 then
    raise exception 'Membership picker did not return exactly two caller choirs';
  end if;

  selected := public.set_active_choir(choir_a);
  if selected <> choir_a or public.current_choir_id() <> choir_a then
    raise exception 'Session A did not select choir A';
  end if;
  if public.current_choir_member_id() <> member_a
    or public.current_chat_member_id() <> member_a
    or public.get_current_member_id() <> member_a
    or public.get_my_member_id() <> member_a
    or public.current_member_voice_group() <> 'Soprano'
    or public.get_current_member_voice_group() <> 'Soprano'
    or public.get_my_role() <> 'Şef'
    or not public.is_chef()
    or not public.is_current_user_chef()
    or not public.is_leader() then
    raise exception 'Session A helper functions did not resolve member A';
  end if;

  insert into public.push_subscriptions (member_id, endpoint, p256dh, auth)
  values (member_a, 'https://example.invalid/005-direct-a-' || session_a, 'p256dh-a', 'auth-a');
  if public.upsert_my_active_push_subscription(
    'https://example.invalid/005-shared-endpoint',
    'p256dh-shared-a',
    'auth-shared-a',
    '005-test-a'
  ) is null then
    raise exception 'Session A push RPC did not return a subscription';
  end if;

  select count(*) into visible_count
  from public.repertoire
  where id in (repertoire_a, repertoire_b);
  if visible_count <> 1 or not exists (
    select 1 from public.repertoire where id = repertoire_a
  ) then
    raise exception 'Session A repertoire isolation failed';
  end if;

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', user_multi,
      'role', 'authenticated',
      'session_id', session_b
    )::text,
    true
  );

  if public.current_choir_id() is not null then
    raise exception 'Session B inherited session A selection';
  end if;

  perform public.set_active_choir(choir_b);
  if public.current_choir_id() <> choir_b
    or public.current_choir_member_id() <> member_b
    or public.current_member_voice_group() <> 'Alto'
    or public.get_my_role() <> 'Korist'
    or public.is_chef()
    or public.is_current_user_chef()
    or public.is_leader() then
    raise exception 'Session B did not resolve member B';
  end if;

  select count(*) into visible_count from public.push_subscriptions;
  if visible_count <> 0 then
    raise exception 'Session B could see session A push subscription';
  end if;
  perform public.upsert_my_active_push_subscription(
    'https://example.invalid/005-shared-endpoint',
    'p256dh-shared-b',
    'auth-shared-b',
    '005-test-b'
  );
  insert into public.push_subscriptions (member_id, endpoint, p256dh, auth)
  values (member_b, 'https://example.invalid/005-direct-b-' || session_b, 'p256dh-b', 'auth-b');

  begin
    perform public.set_active_choir(choir_outsider);
    raise exception 'Non-member choir selection was accepted';
  exception when insufficient_privilege then
    null;
  end;

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', user_multi,
      'role', 'authenticated',
      'session_id', session_a
    )::text,
    true
  );
  if public.current_choir_id() <> choir_a then
    raise exception 'Session A selection changed when session B selected choir B';
  end if;
  select count(*) into visible_count
  from public.push_subscriptions
  where endpoint = 'https://example.invalid/005-shared-endpoint';
  if visible_count <> 0 then
    raise exception 'Moved push endpoint remained visible in the inactive choir';
  end if;

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', user_single,
      'role', 'authenticated',
      'session_id', session_single
    )::text,
    true
  );
  if public.current_choir_id() <> choir_a
    or public.current_choir_member_id() <> member_single then
    raise exception 'Single-membership compatibility fallback failed';
  end if;
  perform public.upsert_my_active_push_subscription(
    'https://example.invalid/005-single-owner',
    'p256dh-single',
    'auth-single',
    '005-test-single'
  );

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', user_multi,
      'role', 'authenticated',
      'session_id', session_a
    )::text,
    true
  );
  begin
    perform public.upsert_my_active_push_subscription(
      'https://example.invalid/005-single-owner',
      'p256dh-hijack',
      'auth-hijack',
      '005-test-hijack'
    );
    raise exception 'Another account push endpoint was accepted';
  exception when insufficient_privilege then
    null;
  end;

  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', user_multi, 'role', 'authenticated')::text,
    true
  );
  begin
    perform public.set_active_choir(choir_a);
    raise exception 'Selection without a session_id was accepted';
  exception when invalid_authorization_specification then
    null;
  end;
  if not public.delete_my_push_subscription('https://example.invalid/005-direct-a-' || session_a) then
    raise exception 'Push cleanup required an active choir selection';
  end if;

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', user_outsider,
      'role', 'authenticated',
      'session_id', gen_random_uuid()
    )::text,
    true
  );
  if public.current_choir_id() is not null then
    raise exception 'User without membership resolved a tenant';
  end if;
end
$test$;

rollback;
