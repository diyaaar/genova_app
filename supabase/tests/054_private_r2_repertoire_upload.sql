-- Synthetic fixtures only; rollback preserves the restored baseline.
begin;
insert into auth.users (id) values ('10000000-0000-4000-8000-000000000054');
insert into public.choirs (id,slug,name) values
  ('20000000-0000-4000-8000-000000000054','054-upload','054 Upload'),
  ('20000000-0000-4000-8000-000000000055','054-other','054 Other');
insert into public.choir_members (id,choir_id,auth_user_id,first_name,last_name,join_date)
  values ('30000000-0000-4000-8000-000000000054','20000000-0000-4000-8000-000000000054',
    '10000000-0000-4000-8000-000000000054','Synthetic','Manager',current_date);
insert into public.roles (id,choir_id,name) values
  ('40000000-0000-4000-8000-000000000054','20000000-0000-4000-8000-000000000054','Şef');
insert into public.choir_member_roles (choir_id,member_id,role_id) values
  ('20000000-0000-4000-8000-000000000054','30000000-0000-4000-8000-000000000054','40000000-0000-4000-8000-000000000054');
insert into public.repertoire (id,choir_id,title,is_visible) values
  ('50000000-0000-4000-8000-000000000054','20000000-0000-4000-8000-000000000054','054 Song',true),
  ('50000000-0000-4000-8000-000000000055','20000000-0000-4000-8000-000000000055','Other Song',true);

\if :{?setup_only}
commit;
\quit
\endif

do $test$
declare
  actor uuid := '10000000-0000-4000-8000-000000000054';
  choir uuid := '20000000-0000-4000-8000-000000000054';
  retry uuid := '60000000-0000-4000-8000-000000000054';
  retry2 uuid := '60000000-0000-4000-8000-000000000055';
  meta jsonb := jsonb_build_object('songId','50000000-0000-4000-8000-000000000054',
    'fileName','score.pdf','fileType','sheet','mimeType','application/pdf','size',69,
    'partitionLabel',null);
  first_result jsonb;
  result jsonb;
  lease uuid;
  refused boolean;
begin
  if has_function_privilege('authenticated','public.repertoire_upload_054(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE')
    or has_function_privilege('anon','public.repertoire_upload_054(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE')
    or not has_function_privilege('service_role','public.repertoire_upload_054(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE')
    or has_schema_privilege('authenticated','genova_054','USAGE') then
    raise exception '054 RPC/private schema privileges are incorrect';
  end if;
  if not exists (select 1 from pg_class where oid = 'genova_054.uploads'::regclass and relrowsecurity and relforcerowsecurity) then
    raise exception '054 operational table must force RLS';
  end if;
  execute 'set local role authenticated';
  refused := false;
  begin perform public.repertoire_upload_054('reserve',actor,null,choir,retry,meta,'genova-private');
  exception when insufficient_privilege then refused := true; end;
  execute 'reset role';
  if not refused then raise exception '054 client invoked service RPC'; end if;

  execute 'set local role service_role';
  refused := false;
  begin perform public.repertoire_upload_054('reserve',actor,null,choir,retry,
    jsonb_set(meta,'{songId}','"50000000-0000-4000-8000-000000000055"'),'genova-private');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception '054 cross-choir song accepted'; end if;
  refused := false;
  begin perform public.repertoire_upload_054('reserve',actor,null,choir,retry,
    jsonb_set(meta,'{mimeType}','"text/html"'),'genova-private');
  exception when invalid_parameter_value then refused := true; end;
  if not refused then raise exception '054 active MIME accepted'; end if;

  first_result := public.repertoire_upload_054('reserve',actor,null,choir,retry,meta,'genova-private');
  lease := (first_result->>'lease')::uuid;
  if first_result->>'state' <> 'uploading' or lease is null then raise exception '054 reservation failed'; end if;
  result := public.repertoire_upload_054('reserve',actor,null,choir,retry,meta,'genova-private');
  if result->>'state' <> 'pending' or result->>'lease' is not null then raise exception '054 replay stole active lease'; end if;
  refused := false;
  begin perform public.repertoire_upload_054('reserve',actor,null,choir,retry,
    jsonb_set(meta,'{size}',to_jsonb(70)),'genova-private');
  exception when unique_violation then refused := true; end;
  if not refused then raise exception '054 changed retry payload accepted'; end if;
  refused := false;
  begin perform public.repertoire_upload_054('commit',actor,null,choir,retry,meta,'genova-private',gen_random_uuid(),repeat('a',64));
  exception when unique_violation then refused := true; end;
  if not refused then raise exception '054 wrong lease accepted'; end if;

  -- Revocation after PUT must fail commit, leave no active file, and still permit owned cleanup.
  execute 'reset role';
  update public.choir_members set is_active = false where auth_user_id = actor;
  execute 'set local role service_role';
  refused := false;
  begin perform public.repertoire_upload_054('commit',actor,null,choir,retry,meta,'genova-private',lease,repeat('a',64));
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception '054 inactive manager committed'; end if;
  execute 'reset role';
  if exists(select 1 from public.repertoire_files where id = (first_result->>'fileId')::uuid) then
    raise exception '054 failed commit created a catalogue row';
  end if;
  execute 'set local role service_role';
  result := public.repertoire_upload_054('cleanup',actor,null,choir,retry,meta,'genova-private',lease);
  if result->>'state' <> 'cleanup' then raise exception '054 cleanup not acquired'; end if;
  refused := false;
  begin perform public.repertoire_upload_054('commit',actor,null,choir,retry,meta,'genova-private',lease,repeat('a',64));
  exception when unique_violation then refused := true; end;
  if not refused then raise exception '054 late commit after cleanup accepted'; end if;
  perform public.repertoire_upload_054('failed',actor,null,choir,retry,meta,'genova-private',lease);
  execute 'reset role';
  update public.choir_members set is_active = true where auth_user_id = actor;
  execute 'set local role service_role';
  result := public.repertoire_upload_054('reserve',actor,null,choir,retry,meta,'genova-private');
  if result->>'fileId' <> first_result->>'fileId' or result->>'lease' = lease::text then
    raise exception '054 cleaned retry did not keep file identity and rotate lease';
  end if;
  lease := (result->>'lease')::uuid;
  result := public.repertoire_upload_054('commit',actor,null,choir,retry,meta,'genova-private',lease,repeat('a',64));
  if result->>'state' <> 'committed' or result->'file'->>'drive_download_link' is not null then
    raise exception '054 atomic commit result wrong';
  end if;
  if public.repertoire_upload_054('cleanup',actor,null,choir,retry,meta,'genova-private',lease) <> result
    or public.repertoire_upload_054('reserve',actor,null,choir,retry,meta,'genova-private') <> result then
    raise exception '054 ambiguous successful commit not preserved/replayed';
  end if;
  execute 'reset role';
  if (select count(*) from public.repertoire_files where id = (first_result->>'fileId')::uuid) <> 1
    or (select count(*) from public.repertoire_file_storage_locations where repertoire_file_id = (first_result->>'fileId')::uuid and is_active) <> 1 then
    raise exception '054 missing/duplicate file or mapping';
  end if;

  -- A non-manager cannot reserve, even with an active membership.
  delete from public.choir_member_roles where member_id = '30000000-0000-4000-8000-000000000054';
  execute 'set local role service_role';
  refused := false;
  begin perform public.repertoire_upload_054('reserve',actor,null,choir,retry2,meta,'genova-private');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception '054 non-manager reserved'; end if;
  execute 'reset role';
end;
$test$;
rollback;
