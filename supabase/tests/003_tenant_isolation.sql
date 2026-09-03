-- Reusable isolation test for migration 003.
-- Synthetic users/fixtures are rolled back. Never move a real member between choirs.

begin;

set local statement_timeout = '60s';
set local lock_timeout = '10s';

do $test$
declare
  tenant_tables constant text[] := array[
    'announcements',
    'assignment_submission_audit_logs',
    'assignment_submission_history',
    'assignment_submission_private_notes',
    'assignment_submissions',
    'assignment_targets',
    'assignments',
    'attendance',
    'chat_message_status',
    'chat_messages',
    'chat_notification_preferences',
    'chat_poll_votes',
    'chat_polls',
    'chat_reactions',
    'chat_room_members',
    'chat_rooms',
    'chat_starred_messages',
    'choir_member_roles',
    'choir_members',
    'departments',
    'profile_change_requests',
    'push_subscriptions',
    'rehearsal_invitees',
    'rehearsals',
    'repertoire',
    'repertoire_cache_versions',
    'repertoire_files',
    'repertoire_pdf_annotations',
    'repertoire_song_comments',
    'repertoire_song_tags',
    'repertoire_tags',
    'roles',
    'schools',
    'song_assignments'
  ];
  target_table text;
  nullable_column boolean;
  missing_default boolean;
  missing_fk boolean;
  missing_index boolean;
  unscoped_policy_count integer;
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'choirs'
      and c.relkind = 'r'
      and c.relrowsecurity
  ) then
    raise exception 'public.choirs is missing or RLS is disabled';
  end if;

  foreach target_table in array tenant_tables loop
    select (is_nullable <> 'NO')
    into nullable_column
    from information_schema.columns
    where table_schema = 'public'
      and information_schema.columns.table_name = target_table
      and column_name = 'choir_id';

    if nullable_column is distinct from false then
      raise exception 'public.%.choir_id is missing or nullable', target_table;
    end if;

    select not (column_default like '%current_choir_id%')
    into missing_default
    from information_schema.columns
    where table_schema = 'public'
      and information_schema.columns.table_name = target_table
      and column_name = 'choir_id';

    if missing_default is distinct from false then
      raise exception 'public.%.choir_id has no current_choir_id() default', target_table;
    end if;

    select not exists (
      select 1
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
      where n.nspname = 'public'
        and rel.relname = target_table
        and con.contype = 'f'
        and con.confrelid = 'public.choirs'::regclass
    ) into missing_fk;

    if missing_fk then
      raise exception 'public.% has no foreign key to public.choirs', target_table;
    end if;

    select not exists (
      select 1
      from pg_indexes
      where schemaname = 'public'
        and tablename = target_table
        and indexdef ~ '\(choir_id\)'
    ) into missing_index;

    if missing_index then
      raise exception 'public.% has no choir_id index', target_table;
    end if;
  end loop;

  select count(*)
  into unscoped_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = any (tenant_tables)
    and (
      (qual is not null and qual not like '%current_choir_id%')
      or (with_check is not null and with_check not like '%current_choir_id%')
    );

  if unscoped_policy_count <> 0 then
    raise exception '% tenant policies are missing the current_choir_id() guard',
      unscoped_policy_count;
  end if;
end
$test$;

-- A valid Auth identity without a choir must not inherit the singleton tenant.
set local role authenticated;
do $nonmember$
declare t record; n bigint;
begin
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  if public.current_choir_id() is not null then raise exception 'Non-member resolved to a tenant'; end if;
  for t in select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'choir_id'
  loop
    execute format('select count(*) from public.%I', t.table_name) into n;
    if n <> 0 then raise exception 'Non-member can read %', t.table_name; end if;
  end loop;
  perform set_config('request.jwt.claim.sub', '', true);
end
$nonmember$;
reset role;

do $fixtures$
declare
  choir_a_id uuid := 'b596e85e-6dfe-4bd4-8ecc-61ff3b925d40';
  choir_b_id uuid := gen_random_uuid();
  member_a_id uuid := gen_random_uuid();
  member_b_id uuid := gen_random_uuid();
  user_a_id uuid := gen_random_uuid();
  user_b_id uuid := gen_random_uuid();
  song_a_id uuid := gen_random_uuid();
  song_b_id uuid := gen_random_uuid();
  file_b_id uuid := gen_random_uuid();
  announcement_b_id uuid := gen_random_uuid();
  annotation_b_id uuid := gen_random_uuid();
  room_a_id uuid := gen_random_uuid();
begin
  insert into auth.users(id) values(user_a_id), (user_b_id);
  insert into public.choirs (id, slug, name)
  values (choir_b_id, 'tenant-test-' || choir_b_id::text, 'Tenant isolation test');

  insert into public.choir_members(id, auth_user_id, choir_id, first_name, last_name, join_date)
  values (member_a_id, user_a_id, choir_a_id, 'Isolation', 'A', current_date),
    (member_b_id, user_b_id, choir_b_id, 'Isolation', 'B', current_date);
  insert into public.roles(choir_id, name) values(choir_b_id, 'Şef');
  insert into public.choir_member_roles(choir_id, member_id, role_id)
    select choir_b_id, member_b_id, id from public.roles where choir_id = choir_b_id and name = 'Şef';

  insert into public.repertoire (id, choir_id, title)
  values
    (song_a_id, choir_a_id, '003 tenant A ' || song_a_id::text),
    (song_b_id, choir_b_id, '003 tenant B ' || song_b_id::text);

  insert into public.repertoire_files (
    id,
    choir_id,
    song_id,
    file_name,
    file_type,
    drive_file_id,
    uploaded_by
  ) values (
    file_b_id,
    choir_b_id,
    song_b_id,
    'tenant-test.pdf',
    'sheet',
    'tenant-test-' || file_b_id::text,
    member_b_id
  );


  insert into public.announcements (
    id,
    choir_id,
    title,
    description,
    created_by
  ) values (
    announcement_b_id,
    choir_b_id,
    'Tenant isolation test',
    'Rolled back automatically',
    member_b_id
  );

  insert into public.repertoire_pdf_annotations (
    id,
    choir_id,
    song_id,
    repertoire_file_id,
    page_number,
    layer_type,
    owner_member_id,
    created_by,
    updated_by
  ) values (
    annotation_b_id,
    choir_b_id,
    song_b_id,
    file_b_id,
    1,
    'personal',
    member_b_id,
    member_b_id,
    member_b_id
  );

  -- Optional recipient lists may be SQL NULL as well as an empty array.
  update public.announcements set target_users = null where id = announcement_b_id;

  perform set_config('tenant_test.choir_a', choir_a_id::text, true);
  perform set_config('tenant_test.choir_b', choir_b_id::text, true);
  perform set_config('tenant_test.member_a', member_a_id::text, true);
  perform set_config('tenant_test.member_b', member_b_id::text, true);
  perform set_config('tenant_test.user_a', user_a_id::text, true);
  perform set_config('tenant_test.user_b', user_b_id::text, true);
  perform set_config('tenant_test.song_a', song_a_id::text, true);
  perform set_config('tenant_test.song_b', song_b_id::text, true);
  perform set_config('tenant_test.announcement_b', announcement_b_id::text, true);
  perform set_config('tenant_test.annotation_b', annotation_b_id::text, true);
  insert into public.chat_rooms(id, choir_id, name, slug, created_by)
    values(room_a_id, choir_a_id, 'Isolation A', 'isolation-' || room_a_id, member_a_id);
  insert into public.chat_room_members(room_id, choir_id, member_id, role)
    values(room_a_id, choir_a_id, member_a_id, 'admin');
  perform set_config('tenant_test.room_a', room_a_id::text, true);
end
$fixtures$;

set local role authenticated;
do $tenant_b_session$
begin
  perform set_config('request.jwt.claim.sub', current_setting('tenant_test.user_b'), true);
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', current_setting('tenant_test.user_b'),
      'role', 'authenticated'
    )::text,
    true
  );
end
$tenant_b_session$;

do $tenant_b_checks$
declare
  tenant_tables constant text[] := array[
    'announcements',
    'assignment_submission_audit_logs',
    'assignment_submission_history',
    'assignment_submission_private_notes',
    'assignment_submissions',
    'assignment_targets',
    'assignments',
    'attendance',
    'chat_message_status',
    'chat_messages',
    'chat_notification_preferences',
    'chat_poll_votes',
    'chat_polls',
    'chat_reactions',
    'chat_room_members',
    'chat_rooms',
    'chat_starred_messages',
    'choir_member_roles',
    'choir_members',
    'departments',
    'profile_change_requests',
    'push_subscriptions',
    'rehearsal_invitees',
    'rehearsals',
    'repertoire',
    'repertoire_cache_versions',
    'repertoire_files',
    'repertoire_pdf_annotations',
    'repertoire_song_comments',
    'repertoire_song_tags',
    'repertoire_tags',
    'roles',
    'schools',
    'song_assignments'
  ];
  target_table text;
  cross_tenant_row_exists boolean;
  affected_rows integer;
  inserted_choir_id uuid;
begin
  if public.current_choir_id() <> current_setting('tenant_test.choir_b')::uuid then
    raise exception 'Tenant B user resolved to the wrong choir';
  end if;

  foreach target_table in array tenant_tables loop
    execute format(
      'select exists (select 1 from public.%I where choir_id is distinct from public.current_choir_id())',
      target_table
    ) into cross_tenant_row_exists;

    if cross_tenant_row_exists then
      raise exception 'Tenant B can read another choir through public.%', target_table;
    end if;
  end loop;

  if not exists (
    select 1
    from public.repertoire
    where id = current_setting('tenant_test.song_b')::uuid
  ) then
    raise exception 'Tenant B cannot read its repertoire fixture';
  end if;

  if not exists (
    select 1
    from public.announcements
    where id = current_setting('tenant_test.announcement_b')::uuid
  ) then
    raise exception 'Tenant B cannot read its announcement fixture';
  end if;

  if not exists (
    select 1
    from public.repertoire_pdf_annotations
    where id = current_setting('tenant_test.annotation_b')::uuid
  ) then
    raise exception 'Tenant B cannot read its annotation fixture';
  end if;

  insert into public.chat_rooms (name, slug, created_by)
  values (
    'Tenant default test',
    'tenant-default-' || gen_random_uuid()::text,
    current_setting('tenant_test.member_b')::uuid
  )
  returning choir_id into inserted_choir_id;

  if inserted_choir_id <> current_setting('tenant_test.choir_b')::uuid then
    raise exception 'choir_id default did not resolve to tenant B';
  end if;

  update public.repertoire
  set title = 'cross-tenant update must fail'
  where id = current_setting('tenant_test.song_a')::uuid;
  get diagnostics affected_rows = row_count;

  if affected_rows <> 0 then
    raise exception 'Tenant B updated tenant A repertoire';
  end if;

  delete from public.repertoire
  where id = current_setting('tenant_test.song_a')::uuid;
  get diagnostics affected_rows = row_count;

  if affected_rows <> 0 then
    raise exception 'Tenant B deleted tenant A repertoire';
  end if;

  -- B is a chef: these denials must come from isolation, not missing privileges.
  if exists(select 1 from public.get_member_continuity_info(current_setting('tenant_test.member_a')::uuid)) then
    raise exception 'Cross-tenant continuity RPC leak';
  end if;
  if exists(select 1 from public.get_member_room_ids(current_setting('tenant_test.member_a')::uuid)) then
    raise exception 'Cross-tenant room RPC leak';
  end if;
  if public.is_room_admin(current_setting('tenant_test.room_a')::uuid, current_setting('tenant_test.member_a')::uuid) then
    raise exception 'Cross-tenant admin RPC leak';
  end if;
  if public.is_room_member(current_setting('tenant_test.room_a')::uuid, current_setting('tenant_test.member_a')::uuid) then
    raise exception 'Cross-tenant membership RPC leak';
  end if;
  begin
    update public.announcements
      set target_users = array[current_setting('tenant_test.member_a')::uuid]
      where id = current_setting('tenant_test.announcement_b')::uuid;
    get diagnostics affected_rows = row_count;
    if affected_rows <> 0 then raise exception 'Cross-tenant announcement target accepted'; end if;
  exception when check_violation then null; end;
  begin
    insert into public.repertoire_files(choir_id, song_id, file_name, file_type, drive_file_id)
    values(current_setting('tenant_test.choir_b')::uuid, current_setting('tenant_test.song_a')::uuid,
      'forged.pdf', 'sheet', 'forged');
    raise exception 'Cross-tenant parent reference accepted';
  exception when check_violation then null; end;
  begin
    insert into public.repertoire(choir_id, title)
      values(current_setting('tenant_test.choir_a')::uuid, 'forged tenant insert');
    raise exception 'Cross-tenant INSERT accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.choir_members set auth_user_id = gen_random_uuid()
      where id = current_setting('tenant_test.member_b')::uuid;
    raise exception 'Auth identity reassignment accepted';
  exception when check_violation then null; end;
end
$tenant_b_checks$;

do $tenant_a_session$
begin
  perform set_config('request.jwt.claim.sub', current_setting('tenant_test.user_a'), true);
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', current_setting('tenant_test.user_a'),
      'role', 'authenticated'
    )::text,
    true
  );
end
$tenant_a_session$;

do $tenant_a_checks$
declare t record; leaked boolean; checked integer := 0;
begin
  if public.current_choir_id() <> current_setting('tenant_test.choir_a')::uuid then
    raise exception 'Tenant A user resolved to the wrong choir';
  end if;
  for t in select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'choir_id'
  loop
    execute format('select exists(select 1 from public.%I where choir_id <> public.current_choir_id())',
      t.table_name) into leaked;
    if leaked then raise exception 'Tenant A can read another tenant in %', t.table_name; end if;
    checked := checked + 1;
  end loop;
  if checked <> 34 then raise exception 'Tenant A scan missed tables: %', checked; end if;
  if not public.is_room_member(current_setting('tenant_test.room_a')::uuid, current_setting('tenant_test.member_a')::uuid)
    or not public.is_room_admin(current_setting('tenant_test.room_a')::uuid, current_setting('tenant_test.member_a')::uuid) then
    raise exception 'Same-tenant room membership/admin regression';
  end if;

  if exists (
    select 1
    from public.repertoire
    where id = current_setting('tenant_test.song_b')::uuid
  ) then
    raise exception 'Tenant A can read tenant B repertoire';
  end if;

  if exists (
    select 1
    from public.announcements
    where id = current_setting('tenant_test.announcement_b')::uuid
  ) then
    raise exception 'Tenant A can read tenant B announcement';
  end if;

  if exists (
    select 1
    from public.repertoire_pdf_annotations
    where id = current_setting('tenant_test.annotation_b')::uuid
  ) then
    raise exception 'Tenant A can read tenant B annotation';
  end if;
end
$tenant_a_checks$;

reset role;

set local role anon;
do $anonymous$
declare t record; n bigint;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '{}', true);
  if public.current_choir_id() is not null then raise exception 'Anonymous tenant resolution'; end if;
  for t in select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'choir_id'
  loop
    execute format('select count(*) from public.%I', t.table_name) into n;
    if n <> 0 then raise exception 'Anonymous tenant data in %', t.table_name; end if;
  end loop;
end
$anonymous$;
reset role;

set local role service_role;
do $privileged_writes$
begin
  if public.current_choir_id() is not null then raise exception 'Service-role default must be NULL'; end if;
  begin
    update public.announcements
      set target_users = array[current_setting('tenant_test.member_a')::uuid]
      where id = current_setting('tenant_test.announcement_b')::uuid;
    raise exception 'Service-role cross-tenant announcement target accepted';
  exception when check_violation then null; end;
  begin
    insert into public.repertoire(choir_id, id, title)
      values(current_setting('tenant_test.choir_b')::uuid,
        current_setting('tenant_test.song_a')::uuid, 'forged upsert')
      on conflict(id) do update set choir_id = excluded.choir_id, title = excluded.title;
    raise exception 'Service-role upsert moved a row across tenants';
  exception when check_violation then null; end;
  begin
    insert into public.repertoire_files(choir_id, song_id, file_name, file_type, drive_file_id)
    values(current_setting('tenant_test.choir_b')::uuid, current_setting('tenant_test.song_a')::uuid,
      'forged.pdf', 'sheet', 'forged');
    raise exception 'Service-role cross-tenant parent accepted';
  exception when check_violation then null; end;
end
$privileged_writes$;
reset role;

do $test_complete$
begin
  raise notice '003 tenant isolation test passed';
end
$test_complete$;

rollback;
