-- LOCAL ISOLATED DATABASE ONLY. Run with psql -X -v ON_ERROR_STOP=1.
-- Synthetic users and repertoire rows are transaction-local and rolled back.

begin;

do $test$
declare
  choir_a uuid := gen_random_uuid();
  choir_b uuid := gen_random_uuid();
  user_chef uuid := gen_random_uuid();
  user_leader uuid := gen_random_uuid();
  user_assigned uuid := gen_random_uuid();
  user_unassigned uuid := gen_random_uuid();
  user_multi uuid := gen_random_uuid();
  member_chef uuid := gen_random_uuid();
  member_leader uuid := gen_random_uuid();
  member_assigned uuid := gen_random_uuid();
  member_unassigned uuid := gen_random_uuid();
  member_multi_a uuid := gen_random_uuid();
  member_multi_b uuid := gen_random_uuid();
  role_chef uuid := gen_random_uuid();
  role_leader uuid := gen_random_uuid();
  role_chorist_a uuid := gen_random_uuid();
  role_chorist_b uuid := gen_random_uuid();
  song_visible uuid := gen_random_uuid();
  song_hidden uuid := gen_random_uuid();
  file_visible uuid := gen_random_uuid();
  file_hidden uuid := gen_random_uuid();
  session_id uuid := gen_random_uuid();
  visible_count integer;
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values
    (user_chef, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '015-chef-' || user_chef || '@example.invalid', '', now(), now(), now()),
    (user_leader, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '015-leader-' || user_leader || '@example.invalid', '', now(), now(), now()),
    (user_assigned, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '015-assigned-' || user_assigned || '@example.invalid', '', now(), now(), now()),
    (user_unassigned, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '015-unassigned-' || user_unassigned || '@example.invalid', '', now(), now(), now()),
    (user_multi, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '015-multi-' || user_multi || '@example.invalid', '', now(), now(), now());

  insert into public.choirs (id, slug, name) values
    (choir_a, '015-a-' || choir_a, '015 Choir A'),
    (choir_b, '015-b-' || choir_b, '015 Choir B');

  insert into public.roles (id, choir_id, name) values
    (role_chef, choir_a, 'Şef'),
    (role_leader, choir_a, 'Partisyon Şefi'),
    (role_chorist_a, choir_a, 'Korist'),
    (role_chorist_b, choir_b, 'Korist');

  insert into public.choir_members (
    id, auth_user_id, choir_id, first_name, last_name, voice_group, join_date
  ) values
    (member_chef, user_chef, choir_a, '015', 'Chef', 'Şef', current_date),
    (member_leader, user_leader, choir_a, '015', 'Leader', 'Alto', current_date),
    (member_assigned, user_assigned, choir_a, '015', 'Assigned', 'Alto', current_date),
    (member_unassigned, user_unassigned, choir_a, '015', 'Unassigned', 'Tenor', current_date),
    (member_multi_a, user_multi, choir_a, '015', 'Multi A', 'Bass', current_date),
    (member_multi_b, user_multi, choir_b, '015', 'Multi B', 'Bass', current_date);

  insert into public.choir_member_roles (choir_id, member_id, role_id) values
    (choir_a, member_chef, role_chef),
    (choir_a, member_leader, role_leader),
    (choir_a, member_assigned, role_chorist_a),
    (choir_a, member_unassigned, role_chorist_a),
    (choir_a, member_multi_a, role_chef),
    (choir_b, member_multi_b, role_chorist_b);

  insert into public.repertoire (id, choir_id, title, is_visible) values
    (song_visible, choir_a, '015 Visible ' || song_visible, true),
    (song_hidden, choir_a, '015 Hidden ' || song_hidden, false);

  insert into public.repertoire_files (
    id, choir_id, song_id, file_name, file_type, drive_file_id, mime_type
  ) values
    (file_visible, choir_a, song_visible, 'visible.pdf', 'sheet', '015-visible-file', 'application/pdf'),
    (file_hidden, choir_a, song_hidden, 'hidden.pdf', 'sheet', '015-hidden-file', 'application/pdf');

  insert into public.song_assignments (choir_id, song_id, member_id, assigned_by, part_name)
  values (choir_a, song_visible, member_assigned, member_chef, 'Alto');

  execute 'set local role authenticated';

  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_chef, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  select count(*) into visible_count from public.repertoire_files
  where id in (file_visible, file_hidden);
  if visible_count <> 2 then raise exception '015: chef expected 2 files, got %', visible_count; end if;

  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_leader, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  select count(*) into visible_count from public.repertoire_files
  where id in (file_visible, file_hidden);
  if visible_count <> 2 then raise exception '015: leader expected 2 files, got %', visible_count; end if;

  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_assigned, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  select count(*) into visible_count from public.repertoire_files
  where id in (file_visible, file_hidden);
  if visible_count <> 1 or not exists (
    select 1 from public.repertoire_files where id = file_visible
  ) then raise exception '015: assigned chorist did not receive only the visible assigned file'; end if;

  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_unassigned, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  select count(*) into visible_count from public.repertoire_files
  where id in (file_visible, file_hidden);
  if visible_count <> 0 then raise exception '015: unassigned chorist saw % protected file(s)', visible_count; end if;

  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_multi, 'role', 'authenticated', 'session_id', session_id
  )::text, true);
  if public.current_choir_id() is not null then
    raise exception '015: unresolved multi-membership selected a choir';
  end if;
  select count(*) into visible_count from public.repertoire_files
  where id in (file_visible, file_hidden);
  if visible_count <> 0 then raise exception '015: no-active-choir session saw protected files'; end if;

  perform public.set_active_choir(choir_b);
  if public.current_choir_id() <> choir_b then raise exception '015: wrong-choir precondition failed'; end if;
  select count(*) into visible_count from public.repertoire_files
  where id in (file_visible, file_hidden);
  if visible_count <> 0 then raise exception '015: choir B selection saw choir A protected files'; end if;

  raise notice '015 repertoire-file RLS matrix passed';
end
$test$;

rollback;
