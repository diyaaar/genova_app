-- LOCAL ISOLATED DATABASE ONLY. Proves 053 tenant, shape and privilege boundaries.

begin;

do $test$
declare
  choir_a uuid := '10000000-0000-4000-8000-000000000053';
  choir_b uuid := '10000000-0000-4000-8000-000000000054';
  song_a uuid := '20000000-0000-4000-8000-000000000053';
  file_a uuid := '30000000-0000-4000-8000-000000000053';
  second_location uuid := '40000000-0000-4000-8000-000000000053';
  refused boolean;
begin
  if to_regclass('public.repertoire_file_storage_locations') is null
    or to_regnamespace('genova_053') is null then
    raise exception '053 private schema or table is missing';
  end if;
  if not exists (
    select 1 from pg_class
    where oid = 'public.repertoire_file_storage_locations'::regclass
      and relrowsecurity and relforcerowsecurity
  ) then
    raise exception '053 RLS must be enabled and forced';
  end if;
  if has_table_privilege('anon', 'public.repertoire_file_storage_locations', 'SELECT')
    or has_table_privilege('anon', 'public.repertoire_file_storage_locations', 'INSERT')
    or has_table_privilege('authenticated', 'public.repertoire_file_storage_locations', 'SELECT')
    or has_table_privilege('authenticated', 'public.repertoire_file_storage_locations', 'INSERT')
    or not has_table_privilege('service_role', 'public.repertoire_file_storage_locations', 'SELECT')
    or has_table_privilege('service_role', 'public.repertoire_file_storage_locations', 'INSERT') then
    raise exception '053 table privilege boundary is wrong';
  end if;

  insert into public.choirs (id, slug, name) values
    (choir_a, '053-a', '053 A'),
    (choir_b, '053-b', '053 B');
  insert into public.repertoire (id, choir_id, title, is_visible)
    values (song_a, choir_a, '053 Song', true);
  insert into public.repertoire_files (
    id, choir_id, song_id, file_name, file_type, drive_file_id, mime_type
  ) values (
    file_a, choir_a, song_a, 'score.pdf', 'sheet', 'legacy-drive-053', 'application/pdf'
  );
  insert into public.repertoire_file_storage_locations (
    repertoire_file_id, choir_id, provider, bucket, object_key,
    content_length, mime_type, sha256_hex, verified_at, is_active
  ) values (
    file_a, choir_a, 'r2', 'genova-private',
    'choirs/' || choir_a || '/repertoire/' || file_a || '/score-053.pdf',
    123, 'application/pdf', repeat('a', 64), now(), true
  );

  if (select count(*) from public.repertoire_file_storage_locations
      where repertoire_file_id = file_a and choir_id = choir_a and is_active) <> 1 then
    raise exception '053 valid active mapping was not stored';
  end if;

  refused := false;
  begin
    insert into public.repertoire_file_storage_locations (
      id, repertoire_file_id, choir_id, provider, bucket, object_key,
      content_length, mime_type, sha256_hex, verified_at, is_active
    ) values (
      second_location, file_a, choir_a, 'r2', 'genova-private',
      'choirs/' || choir_a || '/repertoire/' || file_a || '/second.pdf',
      124, 'application/pdf', repeat('b', 64), now(), true
    );
  exception when unique_violation then refused := true;
  end;
  if not refused then raise exception '053 accepted duplicate active mapping'; end if;

  refused := false;
  begin
    insert into public.repertoire_file_storage_locations (
      repertoire_file_id, choir_id, provider, bucket, object_key,
      content_length, mime_type, sha256_hex, verified_at
    ) values (
      file_a, choir_b, 'r2', 'genova-private',
      'choirs/' || choir_b || '/repertoire/' || file_a || '/wrong-choir.pdf',
      123, 'application/pdf', repeat('c', 64), now()
    );
  exception when foreign_key_violation then refused := true;
  end;
  if not refused then raise exception '053 accepted cross-choir mapping'; end if;

  refused := false;
  begin
    insert into public.repertoire_file_storage_locations (
      repertoire_file_id, choir_id, provider, bucket, object_key,
      content_length, mime_type, sha256_hex, verified_at
    ) values (
      file_a, choir_a, 'r2', 'genova-private', '../escape.pdf',
      123, 'application/pdf', repeat('d', 64), now()
    );
  exception when check_violation then refused := true;
  end;
  if not refused then raise exception '053 accepted unsafe object key'; end if;

  refused := false;
  begin
    update public.repertoire_file_storage_locations
      set object_key = 'choirs/' || choir_a || '/repertoire/' || file_a || '/changed.pdf'
      where repertoire_file_id = file_a and is_active;
  exception when check_violation then refused := true;
  end;
  if not refused then raise exception '053 accepted storage identity mutation'; end if;

  refused := false;
  begin
    update public.repertoire_file_storage_locations
      set content_length = content_length + 1
      where repertoire_file_id = file_a and is_active;
  exception when check_violation then refused := true;
  end;
  if not refused then raise exception '053 accepted active verification metadata mutation'; end if;

  execute 'set local role authenticated';
  refused := false;
  begin
    perform count(*) from public.repertoire_file_storage_locations;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '053 authenticated role read private mapping'; end if;

  refused := false;
  begin
    insert into public.repertoire_file_storage_locations (
      repertoire_file_id, choir_id, provider, bucket, object_key,
      content_length, mime_type, sha256_hex, verified_at
    ) values (
      file_a, choir_a, 'r2', 'genova-private',
      'choirs/' || choir_a || '/repertoire/' || file_a || '/client.pdf',
      123, 'application/pdf', repeat('e', 64), now()
    );
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '053 authenticated role wrote verification claim'; end if;
end
$test$;

rollback;
