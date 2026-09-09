-- LOCAL ISOLATED DATABASE ONLY. Run after 024 on a dedicated PostgreSQL 17 copy.
-- Every synthetic identity and product row is transaction-local and rolled back.

begin;

do $test$
declare
  choir_a uuid := gen_random_uuid();
  choir_b uuid := gen_random_uuid();
  user_chef uuid := gen_random_uuid();
  user_leader uuid := gen_random_uuid();
  user_chorist uuid := gen_random_uuid();
  user_outsider uuid := gen_random_uuid();
  user_multi uuid := gen_random_uuid();
  member_chef uuid := gen_random_uuid();
  member_leader uuid := gen_random_uuid();
  member_chorist uuid := gen_random_uuid();
  member_outsider uuid := gen_random_uuid();
  member_multi_a uuid := gen_random_uuid();
  member_multi_b uuid := gen_random_uuid();
  role_chef_a uuid := gen_random_uuid();
  role_leader_a uuid := gen_random_uuid();
  role_chorist_a uuid := gen_random_uuid();
  role_chorist_b uuid := gen_random_uuid();
  song_a uuid := gen_random_uuid();
  song_other_a uuid := gen_random_uuid();
  song_b uuid := gen_random_uuid();
  file_a uuid := gen_random_uuid();
  file_b uuid := gen_random_uuid();
  direct_row_id uuid;
  current_session uuid;
  result_row record;
  stored_row record;
  unchanged_json jsonb;
  row_count integer;
begin
  if has_function_privilege(
      'anon',
      'public.save_repertoire_pdf_annotation_snapshot(uuid,integer,text,text,integer,jsonb,bigint)',
      'EXECUTE'
    )
    or has_function_privilege(
      'service_role',
      'public.save_repertoire_pdf_annotation_snapshot(uuid,integer,text,text,integer,jsonb,bigint)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.save_repertoire_pdf_annotation_snapshot(uuid,integer,text,text,integer,jsonb,bigint)',
      'EXECUTE'
    ) then
    raise exception '024: annotation RPC grant surface is not authenticated-only';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'repertoire_pdf_annotations'
      and column_name = 'revision'
      and data_type = 'bigint'
      and is_nullable = 'NO'
      and column_default = '1'
  ) then
    raise exception '024: positive revision column is missing or has the wrong shape';
  end if;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values
    (user_chef, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '024-chef-' || user_chef || '@example.invalid', '', now(), now(), now()),
    (user_leader, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '024-leader-' || user_leader || '@example.invalid', '', now(), now(), now()),
    (user_chorist, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '024-chorist-' || user_chorist || '@example.invalid', '', now(), now(), now()),
    (user_outsider, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '024-outsider-' || user_outsider || '@example.invalid', '', now(), now(), now()),
    (user_multi, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '024-multi-' || user_multi || '@example.invalid', '', now(), now(), now());

  insert into public.choirs (id, slug, name) values
    (choir_a, '024-a-' || choir_a, '024 Choir A'),
    (choir_b, '024-b-' || choir_b, '024 Choir B');

  insert into public.roles (id, choir_id, name) values
    (role_chef_a, choir_a, 'Şef'),
    (role_leader_a, choir_a, 'Partisyon Şefi'),
    (role_chorist_a, choir_a, 'Korist'),
    (role_chorist_b, choir_b, 'Korist');

  insert into public.choir_members (
    id, auth_user_id, choir_id, first_name, last_name, voice_group, join_date
  ) values
    (member_chef, user_chef, choir_a, '024', 'Chef', 'Soprano', current_date),
    (member_leader, user_leader, choir_a, '024', 'Leader', 'Alto', current_date),
    (member_chorist, user_chorist, choir_a, '024', 'Chorist', 'Tenor', current_date),
    (member_outsider, user_outsider, choir_b, '024', 'Outsider', 'Bass', current_date),
    (member_multi_a, user_multi, choir_a, '024', 'Multi A', 'Soprano', current_date),
    (member_multi_b, user_multi, choir_b, '024', 'Multi B', 'Bass', current_date);

  insert into public.choir_member_roles (choir_id, member_id, role_id) values
    (choir_a, member_chef, role_chef_a),
    (choir_a, member_leader, role_leader_a),
    (choir_a, member_chorist, role_chorist_a),
    (choir_b, member_outsider, role_chorist_b),
    (choir_a, member_multi_a, role_chorist_a),
    (choir_b, member_multi_b, role_chorist_b);

  insert into public.repertoire (id, choir_id, title, is_visible) values
    (song_a, choir_a, '024 Song A ' || song_a, true),
    (song_other_a, choir_a, '024 Other A ' || song_other_a, true),
    (song_b, choir_b, '024 Song B ' || song_b, true);

  insert into public.repertoire_files (
    id, choir_id, song_id, file_name, file_type, drive_file_id, mime_type
  ) values
    (file_a, choir_a, song_a, '024-a.pdf', 'sheet', '024-file-a-' || file_a, 'application/pdf'),
    (file_b, choir_b, song_b, '024-b.pdf', 'sheet', '024-file-b-' || file_b, 'application/pdf');

  insert into public.song_assignments (choir_id, song_id, member_id, assigned_by, part_name)
  values (choir_a, song_a, member_chorist, member_chef, 'Tenor');

  execute 'set local role authenticated';

  -- An existing direct client remains writable, but cannot choose relation,
  -- audit identity or revision values after 024.
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_chorist, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);

  insert into public.repertoire_pdf_annotations (
    song_id, repertoire_file_id, page_number, layer_type, owner_member_id,
    target_voice_group, annotations_json, schema_version, created_by, updated_by,
    choir_id, revision
  ) values (
    song_other_a, file_a, 90, 'personal', member_chorist,
    null, '[{"id":"direct-1","type":"text"}]'::jsonb, 1, member_chef, member_chef,
    choir_a, 999
  ) returning id into direct_row_id;

  select * into strict stored_row
  from public.repertoire_pdf_annotations
  where id = direct_row_id;

  if stored_row.song_id <> song_a
    or stored_row.choir_id <> choir_a
    or stored_row.created_by <> member_chorist
    or stored_row.updated_by <> member_chorist
    or stored_row.revision <> 1 then
    raise exception '024: direct insert retained spoofed relation/audit/revision fields';
  end if;

  update public.repertoire_pdf_annotations
  set song_id = song_other_a,
      annotations_json = '[{"id":"direct-2","type":"text"}]'::jsonb,
      created_by = member_chef,
      updated_by = member_chef,
      revision = 777
  where id = direct_row_id;

  select * into strict stored_row
  from public.repertoire_pdf_annotations
  where id = direct_row_id;

  if stored_row.song_id <> song_a
    or stored_row.created_by <> member_chorist
    or stored_row.updated_by <> member_chorist
    or stored_row.revision <> 2 then
    raise exception '024: direct update did not preserve creator/derive relation/increment once';
  end if;

  -- Chorist personal CAS lifecycle: absence -> revision 1 -> revision 2 -> delete.
  select * into strict result_row
  from public.save_repertoire_pdf_annotation_snapshot(
    file_a, 1, 'personal', null, 1,
    '[{"id":"personal-1","type":"text"}]'::jsonb, null
  );
  if result_row.deleted or result_row.next_revision <> 1 or result_row.annotation_id is null then
    raise exception '024: personal insert did not return revision 1';
  end if;

  begin
    perform * from public.save_repertoire_pdf_annotation_snapshot(
      file_a, 1, 'personal', null, 1, '[{"id":"duplicate"}]'::jsonb, null
    );
    raise exception '024: duplicate absence-expected create was accepted';
  exception when serialization_failure then
    null;
  end;

  select * into strict result_row
  from public.save_repertoire_pdf_annotation_snapshot(
    file_a, 1, 'personal', null, 1,
    '[{"id":"personal-2","type":"text"}]'::jsonb, 1
  );
  if result_row.deleted or result_row.next_revision <> 2 then
    raise exception '024: personal update did not return revision 2';
  end if;

  select annotations_json into strict unchanged_json
  from public.repertoire_pdf_annotations
  where id = result_row.annotation_id;

  begin
    perform * from public.save_repertoire_pdf_annotation_snapshot(
      file_a, 1, 'personal', null, 1, '[{"id":"stale"}]'::jsonb, 1
    );
    raise exception '024: stale update was accepted';
  exception when serialization_failure then
    null;
  end;
  if (select annotations_json from public.repertoire_pdf_annotations where id = result_row.annotation_id)
    is distinct from unchanged_json then
    raise exception '024: stale update changed the stored snapshot';
  end if;

  begin
    perform * from public.save_repertoire_pdf_annotation_snapshot(
      file_a, 1, 'personal', null, 1, '[]'::jsonb, 1
    );
    raise exception '024: stale delete was accepted';
  exception when serialization_failure then
    null;
  end;

  select * into strict result_row
  from public.save_repertoire_pdf_annotation_snapshot(
    file_a, 1, 'personal', null, 1, '[]'::jsonb, 2
  );
  if not result_row.deleted or result_row.next_revision is not null then
    raise exception '024: exact-revision delete result is invalid';
  end if;
  if exists (
    select 1 from public.repertoire_pdf_annotations
    where repertoire_file_id = file_a and page_number = 1 and layer_type = 'personal'
  ) then
    raise exception '024: exact-revision delete left the row present';
  end if;

  begin
    perform * from public.save_repertoire_pdf_annotation_snapshot(
      file_a, 1, 'personal', null, 1, '[]'::jsonb, 2
    );
    raise exception '024: missing positive-revision delete was accepted';
  exception when serialization_failure then
    null;
  end;

  select * into strict result_row
  from public.save_repertoire_pdf_annotation_snapshot(
    file_a, 1, 'personal', null, 1, '[]'::jsonb, null
  );
  if not result_row.deleted or result_row.annotation_id is not null then
    raise exception '024: absence-expected empty no-op result is invalid';
  end if;

  -- Chorists may read shared layers but cannot mutate them.
  begin
    perform * from public.save_repertoire_pdf_annotation_snapshot(
      file_a, 2, 'shared_voice_group', 'Tenor', 1, '[{"id":"forbidden"}]'::jsonb, null
    );
    raise exception '024: chorist shared-voice mutation was accepted';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform * from public.save_repertoire_pdf_annotation_snapshot(
      file_a, 2, 'shared_all', null, 1, '[{"id":"forbidden"}]'::jsonb, null
    );
    raise exception '024: chorist shared-all mutation was accepted';
  exception when insufficient_privilege then
    null;
  end;

  -- Section leader owns only the active voice-group shared layer.
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_leader, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  select * into strict result_row
  from public.save_repertoire_pdf_annotation_snapshot(
    file_a, 2, 'shared_voice_group', 'Alto', 1, '[{"id":"leader-alto"}]'::jsonb, null
  );
  if result_row.next_revision <> 1 then
    raise exception '024: leader own-voice insert failed';
  end if;
  begin
    perform * from public.save_repertoire_pdf_annotation_snapshot(
      file_a, 3, 'shared_voice_group', 'Bass', 1, '[{"id":"wrong-voice"}]'::jsonb, null
    );
    raise exception '024: leader other-voice mutation was accepted';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform * from public.save_repertoire_pdf_annotation_snapshot(
      file_a, 3, 'shared_all', null, 1, '[{"id":"leader-all"}]'::jsonb, null
    );
    raise exception '024: leader shared-all mutation was accepted';
  exception when insufficient_privilege then
    null;
  end;

  -- Chef may mutate every shared layer.
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_chef, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  select * into strict result_row
  from public.save_repertoire_pdf_annotation_snapshot(
    file_a, 3, 'shared_all', null, 1, '[{"id":"chef-all"}]'::jsonb, null
  );
  if result_row.next_revision <> 1 then
    raise exception '024: chef shared-all insert failed';
  end if;
  select * into strict result_row
  from public.save_repertoire_pdf_annotation_snapshot(
    file_a, 4, 'shared_voice_group', 'Bass', 1, '[{"id":"chef-bass"}]'::jsonb, null
  );
  if result_row.next_revision <> 1 then
    raise exception '024: chef other-voice insert failed';
  end if;

  -- Invalid shapes and versions fail before mutation.
  begin
    perform * from public.save_repertoire_pdf_annotation_snapshot(
      file_a, 0, 'personal', null, 1, '[]'::jsonb, null
    );
    raise exception '024: zero page was accepted';
  exception when invalid_parameter_value then
    null;
  end;
  begin
    perform * from public.save_repertoire_pdf_annotation_snapshot(
      file_a, 5, 'shared_voice_group', 'NotAVoice', 1, '[]'::jsonb, null
    );
    raise exception '024: invalid voice group was accepted';
  exception when invalid_parameter_value then
    null;
  end;
  begin
    perform * from public.save_repertoire_pdf_annotation_snapshot(
      file_a, 5, 'personal', null, 2, '[]'::jsonb, null
    );
    raise exception '024: unsupported schema version was accepted';
  exception when invalid_parameter_value then
    null;
  end;

  -- A user in another choir cannot learn or mutate the choir-A file.
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_outsider, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  begin
    insert into public.repertoire_pdf_annotations (
      song_id, repertoire_file_id, page_number, layer_type, owner_member_id,
      annotations_json, schema_version, choir_id
    ) values (
      song_b, file_a, 6, 'personal', member_outsider,
      '[{"id":"direct-wrong-choir"}]'::jsonb, 1, choir_b
    );
    raise exception '024: direct wrong-choir file mutation was accepted';
  exception when insufficient_privilege then
    null;
  end;
  begin
    insert into public.repertoire_pdf_annotations (
      song_id, repertoire_file_id, page_number, layer_type, owner_member_id,
      annotations_json, schema_version, choir_id
    ) values (
      song_b, gen_random_uuid(), 6, 'personal', member_outsider,
      '[{"id":"direct-missing-file"}]'::jsonb, 1, choir_b
    );
    raise exception '024: direct missing-file mutation was accepted';
  exception when insufficient_privilege then
    null;
  end;
  begin
    perform * from public.save_repertoire_pdf_annotation_snapshot(
      file_a, 6, 'personal', null, 1, '[{"id":"wrong-choir"}]'::jsonb, null
    );
    raise exception '024: wrong-choir file mutation was accepted';
  exception when insufficient_privilege then
    null;
  end;

  -- A multi-membership session without an active selection resolves no tenant.
  current_session := gen_random_uuid();
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_multi, 'role', 'authenticated', 'session_id', current_session
  )::text, true);
  if public.current_choir_id() is not null then
    raise exception '024: unresolved-session fixture unexpectedly selected a choir';
  end if;
  begin
    perform * from public.save_repertoire_pdf_annotation_snapshot(
      file_a, 7, 'personal', null, 1, '[{"id":"unresolved"}]'::jsonb, null
    );
    raise exception '024: unresolved active-choir mutation was accepted';
  exception when insufficient_privilege then
    null;
  end;

  -- Anonymous has no RPC execution grant.
  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{}', true);
  begin
    perform * from public.save_repertoire_pdf_annotation_snapshot(
      file_a, 8, 'personal', null, 1, '[]'::jsonb, null
    );
    raise exception '024: anonymous RPC execution was accepted';
  exception when insufficient_privilege then
    null;
  end;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_chef, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  execute 'set local role postgres';
  select count(*) into row_count
  from public.repertoire_pdf_annotations
  where repertoire_file_id in (file_a, file_b);
  if row_count <> 4 then
    raise exception '024: denial/lifecycle matrix left unexpected row count %', row_count;
  end if;

  raise notice '024 annotation mutation role/revision/relation matrix passed';
end
$test$;

rollback;
