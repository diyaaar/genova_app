-- LOCAL ISOLATED DATABASE ONLY. Synthetic fixtures are transaction-local and rolled back.
begin;

insert into auth.users(id) values('10000000-0000-4000-8000-000000000063');
insert into public.choirs(id,slug,name) values
 ('20000000-0000-4000-8000-000000000063','063-inventory','063 Inventory'),
 ('20000000-0000-4000-8000-000000000064','063-other','063 Other');
insert into public.choir_members
 (id,choir_id,auth_user_id,first_name,last_name,voice_group,join_date,is_active) values
 ('30000000-0000-4000-8000-000000000063','20000000-0000-4000-8000-000000000063',
  '10000000-0000-4000-8000-000000000063','Inventory','Owner','Soprano',current_date,true);

insert into public.repertoire(id,choir_id,title,is_visible) values
 ('40000000-0000-4000-8000-000000000063','20000000-0000-4000-8000-000000000063','063 Song',true);
insert into public.repertoire_files
 (id,choir_id,song_id,file_name,file_type,drive_file_id,mime_type,file_size_bytes) values
 ('41000000-0000-4000-8000-000000000063','20000000-0000-4000-8000-000000000063',
  '40000000-0000-4000-8000-000000000063','score.pdf','sheet','DriveFile063A','application/pdf',120),
 ('41000000-0000-4000-8000-000000000064','20000000-0000-4000-8000-000000000063',
  '40000000-0000-4000-8000-000000000063','mapped.pdf','sheet','DriveFile063B','application/pdf',121);
insert into public.repertoire_file_storage_locations
 (repertoire_file_id,choir_id,provider,bucket,object_key,content_length,mime_type,sha256_hex,verified_at,is_active) values
 ('41000000-0000-4000-8000-000000000064','20000000-0000-4000-8000-000000000063','r2','genova-private',
  'choirs/20000000-0000-4000-8000-000000000063/repertoire/41000000-0000-4000-8000-000000000064/content',
  121,'application/pdf',repeat('a',64),clock_timestamp(),true);

insert into public.assignments(id,choir_id,title,description,created_by,is_active,is_locked) values
 ('50000000-0000-4000-8000-000000000063','20000000-0000-4000-8000-000000000063',
  '063 Assignment','Synthetic','30000000-0000-4000-8000-000000000063',true,false);
insert into public.assignment_submissions(
 id,choir_id,assignment_id,member_id,drive_file_id,file_name,mime_type,file_size_bytes,submitted_at,
 status,reviewer_audio_drive_file_id,reviewer_audio_file_name,reviewer_audio_mime_type,
 reviewer_audio_file_size_bytes,is_reviewer_note_hidden,reviewer_note_history,submission_note_history
) values(
 '51000000-0000-4000-8000-000000000063','20000000-0000-4000-8000-000000000063',
 '50000000-0000-4000-8000-000000000063','30000000-0000-4000-8000-000000000063',
 'DriveSubmit063','take.wav','audio/wav',200,clock_timestamp(),'pending',
 'DriveReview063','review.wav','audio/wav',80,false,'[]','[]'
);
insert into public.assignment_submission_private_notes(
 submission_id,choir_id,assignment_id,member_id,reviewer_note,reviewer_audio_drive_file_id,
 reviewer_audio_file_name,reviewer_audio_mime_type,reviewer_audio_file_size_bytes
) values(
 '51000000-0000-4000-8000-000000000063','20000000-0000-4000-8000-000000000063',
 '50000000-0000-4000-8000-000000000063','30000000-0000-4000-8000-000000000063','hidden',
 'DrivePrivateReview063','private.wav','audio/wav',81
);
insert into public.assignment_submission_history(
 id,choir_id,assignment_id,member_id,source_submission_id,drive_file_id,file_name,mime_type,
 file_size_bytes,submitted_at,archive_reason,reviewer_audio_drive_file_id,reviewer_audio_file_name,
 reviewer_audio_mime_type,reviewer_audio_file_size_bytes
) values
 ('52000000-0000-4000-8000-000000000063','20000000-0000-4000-8000-000000000063',
  '50000000-0000-4000-8000-000000000063','30000000-0000-4000-8000-000000000063',null,
  'DriveHistory063','history.wav','audio/wav',201,clock_timestamp(),'resubmitted',
  'DriveHistoryReview063','history-review.wav','audio/wav',82),
 ('52000000-0000-4000-8000-000000000064','20000000-0000-4000-8000-000000000063',
  '50000000-0000-4000-8000-000000000063','30000000-0000-4000-8000-000000000063',
  '51000000-0000-4000-8000-000000000063','sb_storage_063','storage.wav','audio/wav',202,
  clock_timestamp(),'resubmitted',null,null,null,null);
insert into public.assignment_submission_private_history(
 history_id,choir_id,assignment_id,member_id,reviewer_note,reviewer_audio_drive_file_id,
 reviewer_audio_file_name,reviewer_audio_mime_type,reviewer_audio_file_size_bytes
) values(
 '52000000-0000-4000-8000-000000000063','20000000-0000-4000-8000-000000000063',
 '50000000-0000-4000-8000-000000000063','30000000-0000-4000-8000-000000000063','private history',
 'DrivePrivateHistory063','private-history.wav','audio/wav',83
);

insert into public.repertoire_song_comments(
 id,choir_id,song_id,content_html,created_by,audio_drive_file_id,audio_file_name,audio_mime_type,
 audio_file_size_bytes,is_hidden
) values(
 '60000000-0000-4000-8000-000000000063','20000000-0000-4000-8000-000000000063',
 '40000000-0000-4000-8000-000000000063','','30000000-0000-4000-8000-000000000063',
 'DriveComment063','comment.wav','audio/wav',84,false
);

insert into public.chat_rooms(id,choir_id,name,slug,type,created_by,avatar_url) values(
 '70000000-0000-4000-8000-000000000063','20000000-0000-4000-8000-000000000063',
 '063 Room','063-room','custom','30000000-0000-4000-8000-000000000063',
 'https://drive.google.com/uc?id=DriveAvatar063'
);
insert into public.chat_messages(id,choir_id,room_id,sender_id,content,message_type,metadata_json) values
 ('71000000-0000-4000-8000-000000000063','20000000-0000-4000-8000-000000000063',
  '70000000-0000-4000-8000-000000000063','30000000-0000-4000-8000-000000000063','','image',
  '{"url":"https://drive.google.com/uc?id=DriveChatSingle063","drive_file_id":"DriveChatSingle063"}'),
 ('71000000-0000-4000-8000-000000000064','20000000-0000-4000-8000-000000000063',
  '70000000-0000-4000-8000-000000000063','30000000-0000-4000-8000-000000000063','','image',
  '{"urls":["https://drive.google.com/uc?id=DriveChatMulti063A","https://drive.google.com/file/d/DriveChatMulti063B/view"],"drive_file_ids":["DriveChatMulti063A","DriveChatMulti063B"]}'),
 ('71000000-0000-4000-8000-000000000065','20000000-0000-4000-8000-000000000063',
  '70000000-0000-4000-8000-000000000063','30000000-0000-4000-8000-000000000063','','image',
  '{"url":"https://example.invalid/not-drive.jpg"}'),
 ('71000000-0000-4000-8000-000000000066','20000000-0000-4000-8000-000000000063',
  '70000000-0000-4000-8000-000000000063','30000000-0000-4000-8000-000000000063','','image','{}'),
 ('71000000-0000-4000-8000-000000000067','20000000-0000-4000-8000-000000000063',
  '70000000-0000-4000-8000-000000000063','30000000-0000-4000-8000-000000000063','','image',
  '{"drive_file_ids":["DriveOverflow063A","DriveOverflow063B","DriveOverflow063C","DriveOverflow063D","DriveOverflow063E","DriveOverflow063F"]}');

do $test$
declare
  choir constant uuid:='20000000-0000-4000-8000-000000000063';
  fingerprint1 text; fingerprint2 text; refused boolean; before_count bigint; after_count bigint;
begin
  if has_function_privilege('anon','public.private_r2_copy_inventory_063(uuid,text)','EXECUTE')
    or has_function_privilege('authenticated','public.private_r2_copy_inventory_063(uuid,text)','EXECUTE')
    or not has_function_privilege('service_role','public.private_r2_copy_inventory_063(uuid,text)','EXECUTE')
    or has_schema_privilege('service_role','genova_063','USAGE')
    or has_function_privilege('service_role','genova_063.drive_file_id(text)','EXECUTE')
    or has_function_privilege('service_role','genova_063.stable_uuid(text)','EXECUTE')
    or (select provolatile from pg_proc where oid='public.private_r2_copy_inventory_063(uuid,text)'::regprocedure)<>'s'
    or (select proconfig from pg_proc where oid='public.private_r2_copy_inventory_063(uuid,text)'::regprocedure)
      is distinct from array['search_path=""']::text[] then
    raise exception '063 privilege/volatility/search_path boundary failed';
  end if;

  execute 'set local role authenticated';
  refused:=false;
  begin perform public.private_r2_copy_inventory_063(choir,'genova-private');
  exception when insufficient_privilege then refused:=true; end;
  execute 'reset role';
  if not refused then raise exception '063 authenticated role executed inventory'; end if;

  refused:=false;
  begin perform public.private_r2_copy_inventory_063(choir,'Bad_Bucket');
  exception when invalid_parameter_value then refused:=true; end;
  if not refused then raise exception '063 accepted invalid bucket'; end if;
  refused:=false;
  begin perform public.private_r2_copy_inventory_063('20000000-0000-4000-8000-000000000099','genova-private');
  exception when invalid_parameter_value then refused:=true; end;
  if not refused then raise exception '063 accepted unknown choir'; end if;

  select count(*) into before_count from public.repertoire_files;
  create temporary table inventory_063 on commit drop as
    select * from public.private_r2_copy_inventory_063(choir,'genova-private');
  select count(*) into after_count from public.repertoire_files;
  if before_count<>after_count then raise exception '063 inventory mutated product rows'; end if;

  if (select count(distinct family) from inventory_063)<>6
    or not exists(select 1 from inventory_063 where family='repertoire-file')
    or not exists(select 1 from inventory_063 where family='assignment-submission')
    or not exists(select 1 from inventory_063 where family='assignment-review')
    or not exists(select 1 from inventory_063 where family='repertoire-comment')
    or not exists(select 1 from inventory_063 where family='chat-message-image')
    or not exists(select 1 from inventory_063 where family='chat-room-avatar') then
    raise exception '063 omitted an accepted copy family';
  end if;
  if (select count(distinct source_owner) from inventory_063 where family='assignment-review')<>4 then
    raise exception '063 omitted a review-audio owner';
  end if;

  if not exists(select 1 from inventory_063 where source_row_id='41000000-0000-4000-8000-000000000064'
      and inventory_status='already-private')
    or not exists(select 1 from inventory_063 where legacy_reference='sb_storage_063'
      and inventory_status='non-drive-storage' and legacy_file_id is null)
    or not exists(select 1 from inventory_063 where source_row_id='52000000-0000-4000-8000-000000000063'
      and family='assignment-submission' and inventory_status='activation-parent-missing')
    or not exists(select 1 from inventory_063 where legacy_reference='https://example.invalid/not-drive.jpg'
      and inventory_status='unsupported-reference')
    or not exists(select 1 from inventory_063 where source_row_id='71000000-0000-4000-8000-000000000066'
      and inventory_status='missing-reference' and legacy_reference is null)
    or not exists(select 1 from inventory_063 where source_row_id='71000000-0000-4000-8000-000000000067'
      and source_slot='image:5' and inventory_status='activation-shape-unsupported'
      and destination_object_key is null)
    or not exists(select 1 from inventory_063 where legacy_reference='DriveChatSingle063'
      and inventory_status='needs-provider-metadata')
    or not exists(select 1 from inventory_063 where legacy_reference='DriveFile063A'
      and inventory_status='ready-for-provider-metadata') then
    raise exception '063 classification matrix failed';
  end if;

  if (select array_agg(source_slot order by source_slot) from inventory_063
      where source_row_id='71000000-0000-4000-8000-000000000064')<>array['image:0','image:1']
    or (select array_agg(legacy_file_id order by source_slot) from inventory_063
      where source_row_id='71000000-0000-4000-8000-000000000064')
      <>array['DriveChatMulti063A','DriveChatMulti063B'] then
    raise exception '063 chat array order/Drive ID extraction failed';
  end if;
  if (select legacy_file_id from inventory_063 where family='chat-room-avatar')<>'DriveAvatar063' then
    raise exception '063 avatar URL extraction failed';
  end if;
  if exists(select 1 from inventory_063 where inventory_status<>'activation-shape-unsupported'
      and (destination_object_key not like 'choirs/'||choir||'/%'
        or destination_object_key not like '%/content' or destination_bucket<>'genova-private'))
    or (select count(*) from inventory_063 where item_id is null or destination_version_id is null)>0
    or (select count(distinct item_id) from inventory_063)<>(select count(*) from inventory_063)
    or exists(select 1 from inventory_063 where family='chat-message-image'
      and inventory_status<>'activation-shape-unsupported' and source_slot !~ '^image:[0-4]$') then
    raise exception '063 destination/item identity contract failed';
  end if;

  select md5(string_agg(row_to_json(i)::text,E'\n' order by family,source_owner,source_row_id,source_slot,source_version))
    into fingerprint1 from inventory_063 i;
  select md5(string_agg(row_to_json(i)::text,E'\n' order by family,source_owner,source_row_id,source_slot,source_version))
    into fingerprint2 from public.private_r2_copy_inventory_063(choir,'genova-private') i;
  if fingerprint1 is null or fingerprint1<>fingerprint2 then raise exception '063 inventory is not deterministic'; end if;
  if exists(select 1 from public.private_r2_copy_inventory_063('20000000-0000-4000-8000-000000000064','genova-private')) then
    raise exception '063 crossed choir boundary';
  end if;
end;
$test$;

rollback;
