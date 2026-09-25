-- LOCAL ISOLATED DATABASE ONLY. Synthetic fixtures and activation are rolled back.
begin;

insert into auth.users(id) values('10000000-0000-4000-8000-000000000065');
insert into public.choirs(id,slug,name) values
 ('20000000-0000-4000-8000-000000000065','065-activation','065 Activation'),
 ('20000000-0000-4000-8000-000000000066','065-other','065 Other');
insert into public.choir_members
 (id,choir_id,auth_user_id,first_name,last_name,voice_group,join_date,is_active) values
 ('30000000-0000-4000-8000-000000000065','20000000-0000-4000-8000-000000000065',
  '10000000-0000-4000-8000-000000000065','Activation','Owner','Soprano',current_date,true);
insert into public.repertoire(id,choir_id,title,is_visible) values
 ('40000000-0000-4000-8000-000000000065','20000000-0000-4000-8000-000000000065','065 Song',true);
insert into public.repertoire_files
 (id,choir_id,song_id,file_name,file_type,drive_file_id,mime_type,file_size_bytes) values
 ('41000000-0000-4000-8000-000000000065','20000000-0000-4000-8000-000000000065',
  '40000000-0000-4000-8000-000000000065','score.pdf','sheet','DriveFile065A','application/pdf',120);

insert into public.assignments(id,choir_id,title,description,created_by,is_active,is_locked) values
 ('50000000-0000-4000-8000-000000000065','20000000-0000-4000-8000-000000000065',
  '065 Assignment','Synthetic','30000000-0000-4000-8000-000000000065',true,false);
insert into public.assignment_submissions(
 id,choir_id,assignment_id,member_id,drive_file_id,file_name,mime_type,file_size_bytes,submitted_at,
 status,reviewer_audio_drive_file_id,reviewer_audio_file_name,reviewer_audio_mime_type,
 reviewer_audio_file_size_bytes,is_reviewer_note_hidden,reviewer_note_history,submission_note_history,
 approved_at,approved_by
) values(
 '51000000-0000-4000-8000-000000000065','20000000-0000-4000-8000-000000000065',
 '50000000-0000-4000-8000-000000000065','30000000-0000-4000-8000-000000000065',
 'DriveSubmit065','take.wav','audio/wav',200,clock_timestamp(),'approved',
 'DriveReview065','review.wav','audio/wav',80,false,'[]','[]',clock_timestamp(),
 '30000000-0000-4000-8000-000000000065'
);
insert into public.assignment_submission_private_notes(
 submission_id,choir_id,assignment_id,member_id,reviewer_note,reviewer_audio_drive_file_id,
 reviewer_audio_file_name,reviewer_audio_mime_type,reviewer_audio_file_size_bytes,last_updated_by
) values(
 '51000000-0000-4000-8000-000000000065','20000000-0000-4000-8000-000000000065',
 '50000000-0000-4000-8000-000000000065','30000000-0000-4000-8000-000000000065','private',
 'DrivePrivateReview065','private-review.wav','audio/wav',81,'30000000-0000-4000-8000-000000000065'
);
insert into public.assignment_submission_history(
 id,choir_id,assignment_id,member_id,source_submission_id,drive_file_id,file_name,mime_type,
 file_size_bytes,submitted_at,archive_reason,reviewer_audio_drive_file_id,reviewer_audio_file_name,
 reviewer_audio_mime_type,reviewer_audio_file_size_bytes,approved_at,approved_by
) values(
 '52000000-0000-4000-8000-000000000066','20000000-0000-4000-8000-000000000065',
 '50000000-0000-4000-8000-000000000065','30000000-0000-4000-8000-000000000065',
 '51000000-0000-4000-8000-000000000065','DriveHistory065','history.wav','audio/wav',190,
 clock_timestamp(),'resubmitted','DriveHistoryReview065','history-review.wav','audio/wav',82,
 clock_timestamp(),'30000000-0000-4000-8000-000000000065'
);
insert into public.assignment_submission_private_history(
 history_id,choir_id,assignment_id,member_id,reviewer_note,reviewer_audio_drive_file_id,
 reviewer_audio_file_name,reviewer_audio_mime_type,reviewer_audio_file_size_bytes
) values(
 '52000000-0000-4000-8000-000000000066','20000000-0000-4000-8000-000000000065',
 '50000000-0000-4000-8000-000000000065','30000000-0000-4000-8000-000000000065','private history',
 'DrivePrivateHistory065','private-history.wav','audio/wav',83
);
insert into public.repertoire_song_comments(
 id,choir_id,song_id,content_html,created_by,audio_drive_file_id,audio_file_name,audio_mime_type,
 audio_file_size_bytes,is_hidden
) values(
 '60000000-0000-4000-8000-000000000065','20000000-0000-4000-8000-000000000065',
 '40000000-0000-4000-8000-000000000065','','30000000-0000-4000-8000-000000000065',
 'DriveComment065','comment.wav','audio/wav',84,false
);
insert into public.chat_rooms(id,choir_id,name,slug,type,created_by,avatar_url) values(
 '70000000-0000-4000-8000-000000000065','20000000-0000-4000-8000-000000000065',
 '065 Room','065-room','custom','30000000-0000-4000-8000-000000000065',
  'https://drive.google.com/uc?export=download&id=DriveAvatar065'
);
insert into public.chat_messages(id,choir_id,room_id,sender_id,content,message_type,metadata_json) values(
 '71000000-0000-4000-8000-000000000065','20000000-0000-4000-8000-000000000065',
 '70000000-0000-4000-8000-000000000065','30000000-0000-4000-8000-000000000065','','image',
 '{"url":"https://drive.google.com/uc?id=DriveChatImage065","drive_file_id":"DriveChatImage065"}'
);

do $test$
declare
  choir constant uuid:='20000000-0000-4000-8000-000000000065';
  request_id constant uuid:='90000000-0000-4000-8000-000000000065';
  bucket constant text:='genova-private';
  project_ref constant text:='hievmwwctjjlhmssoxsu';
  snapshot jsonb;stale_snapshot jsonb;conflict_snapshot jsonb;orphan_snapshot jsonb;
  journal jsonb;partial_journal jsonb;report jsonb;
  status_counts jsonb;result1 jsonb;result2 jsonb;refused boolean;candidate_count integer;snapshot_count integer;
begin
  if has_function_privilege('public','public.private_r2_activate_065(uuid,uuid,text,jsonb,jsonb,jsonb)','EXECUTE')
    or has_function_privilege('anon','public.private_r2_activate_065(uuid,uuid,text,jsonb,jsonb,jsonb)','EXECUTE')
    or has_function_privilege('authenticated','public.private_r2_activate_065(uuid,uuid,text,jsonb,jsonb,jsonb)','EXECUTE')
    or not has_function_privilege('service_role','public.private_r2_activate_065(uuid,uuid,text,jsonb,jsonb,jsonb)','EXECUTE')
    or has_schema_privilege('service_role','genova_065','USAGE')
    or (select provolatile from pg_proc where oid=
      'public.private_r2_activate_065(uuid,uuid,text,jsonb,jsonb,jsonb)'::regprocedure)<>'v'
    or (select proconfig from pg_proc where oid=
      'public.private_r2_activate_065(uuid,uuid,text,jsonb,jsonb,jsonb)'::regprocedure)
      is distinct from array['search_path=""']::text[] then
    raise exception '065 privilege/volatility/search_path boundary failed';
  end if;

  select jsonb_agg(to_jsonb(i) order by family,source_owner,source_row_id,source_slot,source_version),
    count(*),count(*) filter(where inventory_status in('ready-for-provider-metadata','needs-provider-metadata'))
    into snapshot,snapshot_count,candidate_count
    from public.private_r2_copy_inventory_063(choir,bucket) i;
  select jsonb_object_agg(inventory_status,item_count order by inventory_status) into status_counts
    from(select inventory_status,count(*) item_count
      from public.private_r2_copy_inventory_063(choir,bucket) group by inventory_status) counts;

  select jsonb_agg(jsonb_build_object(
    'journalVersion',1,'itemId',i.item_id,'fingerprint',encode(extensions.digest(convert_to(i.item_id::text,'UTF8'),'sha256'),'hex'),
    'projectRef',project_ref,'choirId',i.choir_id,'family',i.family,'sourceOwner',i.source_owner,
    'sourceRowId',i.source_row_id,'sourceSlot',i.source_slot,'sourceVersion',i.source_version,
    'legacyFileId',i.legacy_file_id,'destinationBucket',i.destination_bucket,
    'destinationObjectKey',i.destination_object_key,
    'contentLength',coalesce(i.content_length,case when i.family like 'chat-%' then 64 else 1 end),
    'mimeType',coalesce(i.mime_type,case when i.family like 'chat-%' then 'image/png' else 'application/octet-stream' end),
    'fileName',coalesce(i.file_name,case when i.family='chat-room-avatar' then 'avatar.png' else 'image.png' end),
    'attempt',1,'recordedAt','2026-09-25T08:45:00.000Z','status','verified','action','copied',
    'sha256Hex',encode(extensions.digest(convert_to('065|'||i.item_id::text,'UTF8'),'sha256'),'hex'),
    'verifiedAt','2026-09-25T08:45:00.000Z'
  ) order by family,source_owner,source_row_id,source_slot,source_version) into journal
  from public.private_r2_copy_inventory_063(choir,bucket) i
  where i.inventory_status in('ready-for-provider-metadata','needs-provider-metadata');

  report:=jsonb_build_object('reportVersion',1,'projectRef',project_ref,'choirId',choir,'bucket',bucket,
    'inventoryFingerprint',repeat('a',64),'manifestSha256Hex',repeat('b',64),
    'inventoryItemCount',snapshot_count,'manifestItemCount',candidate_count,
    'excludedItemCount',snapshot_count-candidate_count,'unresolvedItemCount',0,'statusCounts',status_counts,
    'totalBytes',1048,'limits',jsonb_build_object('maxItems',candidate_count,'maxTotalBytes',10000),
    'excluded','[]'::jsonb,'preparedAt','2026-09-25T08:40:00.000Z');

  if candidate_count<>10 or snapshot_count<>10 then
    raise exception '065 fixture did not cover six families: candidates %, snapshot %, statuses %, excluded %',
      candidate_count,snapshot_count,status_counts,
      (select jsonb_agg(jsonb_build_object('family',family,'reference',legacy_reference,'status',inventory_status))
        from public.private_r2_copy_inventory_063(choir,bucket) where inventory_status not in('ready-for-provider-metadata','needs-provider-metadata'));
  end if;
  refused:=false;
  begin perform public.private_r2_activate_065(gen_random_uuid(),choir,bucket,snapshot,report-'reportVersion',journal);
  exception when others then refused:=true;end;
  if not refused then raise exception '065 accepted an incomplete 064 report';end if;
  refused:=false;
  begin perform public.private_r2_activate_065(gen_random_uuid(),choir,bucket,snapshot,report,
    jsonb_set(journal,'{0,fingerprint}','null'::jsonb));
  exception when others then refused:=true;end;
  if not refused then raise exception '065 accepted a null verified journal identity';end if;
  partial_journal:=journal-0;
  refused:=false;
  begin perform public.private_r2_activate_065(gen_random_uuid(),choir,bucket,snapshot,report,partial_journal);
  exception when others then refused:=true;end;
  if not refused or exists(select 1 from genova_065.activation_runs)
    or exists(select 1 from public.repertoire_file_storage_locations where repertoire_file_id='41000000-0000-4000-8000-000000000065') then
    raise exception '065 partial journal was not atomic/refused';end if;

  stale_snapshot:=jsonb_set(snapshot,'{0,status_detail}',to_jsonb('stale synthetic detail'::text));
  refused:=false;
  begin perform public.private_r2_activate_065(gen_random_uuid(),choir,bucket,stale_snapshot,report,journal);
  exception when serialization_failure then refused:=true;end;
  if not refused or exists(select 1 from genova_065.activation_runs) then
    raise exception '065 stale snapshot was accepted';end if;

  insert into public.repertoire_file_storage_locations(id,repertoire_file_id,choir_id,provider,bucket,object_key,
    content_length,mime_type,sha256_hex,verified_at,is_active) values(
    '42000000-0000-4000-8000-000000000065','41000000-0000-4000-8000-000000000065',choir,'r2','other-private',
    'choirs/20000000-0000-4000-8000-000000000065/repertoire/41000000-0000-4000-8000-000000000065/content',
    120,'application/pdf',repeat('c',64),clock_timestamp(),true);
  select jsonb_agg(to_jsonb(i) order by family,source_owner,source_row_id,source_slot,source_version)
    into conflict_snapshot from public.private_r2_copy_inventory_063(choir,bucket) i;
  refused:=false;
  begin perform public.private_r2_activate_065(gen_random_uuid(),choir,bucket,conflict_snapshot,report,journal);
  exception when others then refused:=true;end;
  if not refused or exists(select 1 from genova_065.activation_runs) then
    raise exception '065 conflicting active target was accepted';end if;
  delete from public.repertoire_file_storage_locations where id='42000000-0000-4000-8000-000000000065';

  insert into public.repertoire_file_storage_locations(id,repertoire_file_id,choir_id,provider,bucket,object_key,
    content_length,mime_type,sha256_hex,verified_at,is_active) values(
    '42000000-0000-4000-8000-000000000066','41000000-0000-4000-8000-000000000065',choir,'r2',bucket,
    'choirs/20000000-0000-4000-8000-000000000065/repertoire/41000000-0000-4000-8000-000000000065/content',
    120,'application/pdf',repeat('d',64),clock_timestamp(),false);
  refused:=false;
  begin perform public.private_r2_activate_065(gen_random_uuid(),choir,bucket,snapshot,report,journal);
  exception when unique_violation then refused:=true;end;
  if not refused or exists(select 1 from genova_065.activation_runs) then
    raise exception '065 hidden destination collision was accepted';end if;
  delete from public.repertoire_file_storage_locations where id='42000000-0000-4000-8000-000000000066';

  insert into public.assignment_submission_history(
    id,choir_id,assignment_id,member_id,source_submission_id,drive_file_id,file_name,mime_type,
    file_size_bytes,submitted_at,archive_reason
  ) values(
    '52000000-0000-4000-8000-000000000065',choir,'50000000-0000-4000-8000-000000000065',
    '30000000-0000-4000-8000-000000000065',null,'DriveOrphan065','orphan.wav','audio/wav',90,
    clock_timestamp(),'resubmitted');
  select jsonb_agg(to_jsonb(i) order by family,source_owner,source_row_id,source_slot,source_version)
    into orphan_snapshot from public.private_r2_copy_inventory_063(choir,bucket) i;
  refused:=false;
  begin perform public.private_r2_activate_065(gen_random_uuid(),choir,bucket,orphan_snapshot,report,journal);
  exception when check_violation then refused:=true;end;
  if not refused or exists(select 1 from genova_065.activation_runs) then
    raise exception '065 orphaned history was accepted';end if;
  delete from public.assignment_submission_history where id='52000000-0000-4000-8000-000000000065';

  execute 'set local role authenticated';
  refused:=false;
  begin perform public.private_r2_activate_065(request_id,choir,bucket,snapshot,report,journal);
  exception when insufficient_privilege then refused:=true;end;
  execute 'reset role';
  if not refused then raise exception '065 authenticated role executed activation';end if;

  execute 'set local role service_role';
  result1:=public.private_r2_activate_065(request_id,choir,bucket,snapshot,report,journal);
  result2:=public.private_r2_activate_065(request_id,choir,bucket,snapshot,report,journal);
  execute 'reset role';
  if result1 is distinct from result2 or result1->>'status'<>'committed'
    or (result1->>'activatedItemCount')::integer<>10
    or (select count(*) from genova_065.activation_runs)<>1
    or (select count(*) from genova_065.activation_items)<>10
    or (select count(distinct family) from genova_065.activation_items)<>6 then
    raise exception '065 activation/replay evidence failed';end if;

  if not exists(select 1 from public.repertoire_file_storage_locations
      where repertoire_file_id='41000000-0000-4000-8000-000000000065' and is_active and sha256_hex~'^[0-9a-f]{64}$')
    or (select current_file_version_id from public.assignment_submissions
      where id='51000000-0000-4000-8000-000000000065') is null
    or (select reviewer_audio_file_version_id from public.assignment_submissions
      where id='51000000-0000-4000-8000-000000000065') is null
    or (select reviewer_audio_file_version_id from public.assignment_submission_private_notes
      where submission_id='51000000-0000-4000-8000-000000000065') is null
    or (select file_version_id from public.assignment_submission_history
      where id='52000000-0000-4000-8000-000000000066') is null
    or (select reviewer_audio_file_version_id from public.assignment_submission_history
      where id='52000000-0000-4000-8000-000000000066') is null
    or (select reviewer_audio_file_version_id from public.assignment_submission_private_history
      where history_id='52000000-0000-4000-8000-000000000066') is null
    or (select audio_file_version_id from public.repertoire_song_comments
      where id='60000000-0000-4000-8000-000000000065') is null
    or not ((select metadata_json from public.chat_messages
      where id='71000000-0000-4000-8000-000000000065') ? 'private_media_version_ids')
    or (select avatar_media_version_id from public.chat_rooms
      where id='70000000-0000-4000-8000-000000000065') is null then
    raise exception '065 did not activate every product pointer';end if;

  refused:=false;
  execute 'set local role service_role';
  begin perform public.private_r2_activate_065(request_id,choir,bucket,snapshot,report,
    jsonb_set(journal,'{0,fingerprint}',to_jsonb(repeat('f',64))));
  exception when unique_violation then refused:=true;end;
  execute 'reset role';
  if not refused or (select count(*) from genova_065.activation_runs)<>1 then
    raise exception '065 accepted a changed replay';end if;
end;
$test$;

rollback;
