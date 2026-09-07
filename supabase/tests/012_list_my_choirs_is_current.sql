-- Regression test for 012. Run on an isolated/restored database with 003 and 005
-- applied. All fixtures are transaction-local and are rolled back.
--
-- Guards the defect found live on 7 September 2026: with several memberships and
-- no session selection, `is_current` came back null for every row, and the shared
-- client contract rejects a non-boolean, locking a multi-choir member out of the
-- very screen that would let them choose.

begin;

do $test$
declare
  user_multi uuid := gen_random_uuid();
  session_multi uuid := gen_random_uuid();
  choir_one uuid := gen_random_uuid();
  choir_two uuid := gen_random_uuid();
  member_one uuid := gen_random_uuid();
  member_two uuid := gen_random_uuid();
  row_count integer;
  null_count integer;
  true_count integer;
  selected uuid;
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values
    (user_multi, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '012-multi-' || user_multi || '@example.invalid', '', now(), now(), now());

  insert into public.choirs (id, slug, name) values
    (choir_one, '012-one-' || choir_one, '012 Choir One'),
    (choir_two, '012-two-' || choir_two, '012 Choir Two');

  insert into public.choir_members (
    id, auth_user_id, choir_id, first_name, last_name, voice_group, join_date
  ) values
    (member_one, user_multi, choir_one, 'Multi', 'One', 'Soprano', current_date),
    (member_two, user_multi, choir_two, 'Multi', 'Two', 'Alto', current_date);

  execute 'set local role authenticated';

  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', user_multi,
      'role', 'authenticated',
      'session_id', session_multi
    )::text,
    true
  );

  -- Precondition: this is exactly the state that produced the defect.
  if public.current_choir_id() is not null then
    raise exception '012: multi-membership without a choice must not resolve a tenant';
  end if;

  select count(*), count(*) filter (where is_current is null), count(*) filter (where is_current)
  into row_count, null_count, true_count
  from public.list_my_choirs();

  if row_count <> 2 then
    raise exception '012: expected both memberships to be listed, got %', row_count;
  end if;
  if null_count <> 0 then
    raise exception '012: is_current came back null for % row(s); the client contract rejects the whole list', null_count;
  end if;
  if true_count <> 0 then
    raise exception '012: nothing is selected yet, so no row may claim to be current';
  end if;

  -- After a choice, exactly one row is current and the other is explicitly false.
  selected := public.set_active_choir(choir_two);
  if selected <> choir_two then
    raise exception '012: set_active_choir did not confirm the requested choir';
  end if;

  select count(*) filter (where is_current is null), count(*) filter (where is_current)
  into null_count, true_count
  from public.list_my_choirs();

  if null_count <> 0 then
    raise exception '012: is_current must stay boolean after a selection';
  end if;
  if true_count <> 1 then
    raise exception '012: expected exactly one current row after a selection, got %', true_count;
  end if;

  if not exists (
    select 1 from public.list_my_choirs() where choir_id = choir_two and is_current
  ) then
    raise exception '012: the selected choir is not the one marked current';
  end if;
end
$test$;

rollback;
