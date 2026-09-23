begin;
insert into public.assignment_submissions(
  id,choir_id,assignment_id,member_id,drive_file_id,file_name,mime_type,file_size_bytes,
  submitted_at,updated_at,status,reviewer_note_history,submission_note_history,is_reviewer_note_hidden
) values(
  '60000000-0000-4000-8000-000000000058','20000000-0000-4000-8000-000000000057',
  '50000000-0000-4000-8000-000000000057','30000000-0000-4000-8000-000000000057',
  'legacy-submission','take.wav','audio/wav',16,now(),now(),'pending','[]','[]',false
);

do $test$
declare choir uuid:='20000000-0000-4000-8000-000000000057'; submission uuid:='60000000-0000-4000-8000-000000000058';
 assignment uuid:='50000000-0000-4000-8000-000000000057'; chef_actor uuid:='10000000-0000-4000-8000-000000000058';
 section_actor uuid:='10000000-0000-4000-8000-000000000059'; owner_actor uuid:='10000000-0000-4000-8000-000000000057';
 retry1 uuid:='61000000-0000-4000-8000-000000000058';retry2 uuid:='61000000-0000-4000-8000-000000000059';
 reserve jsonb;committed jsonb;meta jsonb;lease uuid;version1 uuid;version2 uuid;refused boolean;
begin
 if has_function_privilege('authenticated','public.assignment_review_audio_upload_058(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE')
  or has_function_privilege('anon','public.assignment_review_audio_upload_058(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE')
  or has_function_privilege('authenticated','public.set_assignment_review_visibility_058(uuid,uuid,uuid,boolean)','EXECUTE')
  or not has_function_privilege('service_role','public.assignment_review_audio_upload_058(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE') then
  raise exception '058 wrapper privileges wrong';
 end if;
 meta:=jsonb_build_object('submissionId',submission,'fileName','review-1.wav','mimeType','audio/wav',
  'size',16,'status','approved','reviewerNote','visible review');
 execute 'set local role service_role';
 refused:=false;begin perform public.assignment_review_audio_upload_058('reserve',owner_actor,null,choir,gen_random_uuid(),meta,'genova-private');
 exception when insufficient_privilege then refused:=true;end;if not refused then raise exception '058 owner reviewed own submission';end if;
 refused:=false;begin perform public.assignment_review_audio_upload_058('reserve','10000000-0000-4000-8000-000000000060',null,choir,gen_random_uuid(),meta,'genova-private');
 exception when insufficient_privilege then refused:=true;end;if not refused then raise exception '058 wrong section accepted';end if;
 refused:=false;begin perform public.assignment_review_audio_upload_058('reserve','10000000-0000-4000-8000-000000000061',null,'20000000-0000-4000-8000-000000000058',gen_random_uuid(),meta,'genova-private');
 exception when insufficient_privilege then refused:=true;end;if not refused then raise exception '058 wrong choir accepted';end if;
 for committed in select value from jsonb_array_elements(jsonb_build_array(
   jsonb_set(meta,'{mimeType}','"audio/midi"'),jsonb_set(meta,'{size}','0'),
   jsonb_set(meta,'{status}','"pending"'),jsonb_set(meta,'{reviewerNote}',to_jsonb(repeat('x',1201))))) loop
   refused:=false;begin perform public.assignment_review_audio_upload_058('reserve',section_actor,null,choir,gen_random_uuid(),committed,'genova-private');
   exception when invalid_parameter_value then refused:=true;end;if not refused then raise exception '058 unsafe metadata accepted: %',committed;end if;
 end loop;
 reserve:=public.assignment_review_audio_upload_058('reserve',section_actor,null,choir,retry1,meta,'genova-private');
 lease:=(reserve->>'lease')::uuid;version1:=(reserve->>'fileVersionId')::uuid;
 if reserve->>'state'<>'uploading' or lease is null then raise exception '058 reserve failed';end if;
 if public.assignment_review_audio_upload_058('reserve',section_actor,null,choir,retry1,meta,'genova-private')->>'state'<>'pending' then raise exception '058 pending replay failed';end if;
 committed:=public.assignment_review_audio_upload_058('commit',section_actor,null,choir,retry1,meta,'genova-private',lease,repeat('a',64));
 if committed->>'state'<>'committed' or (committed->'submission'->>'reviewer_audio_file_version_id')::uuid<>version1
  or committed->'submission'->>'status'<>'approved' then raise exception '058 visible commit failed: %',committed;end if;
 if not public.can_read_assignment_review_audio_058(owner_actor,choir,version1)
  or not public.can_read_assignment_review_audio_058(section_actor,choir,version1)
  or public.can_read_assignment_review_audio_058('10000000-0000-4000-8000-000000000060',choir,version1) then
  raise exception '058 visible live-ticket authorization failed';end if;
 if not public.claim_assignment_review_notification_058(section_actor,choir,submission,version1)
  or public.claim_assignment_review_notification_058(section_actor,choir,submission,version1) then raise exception '058 notification claim not one-shot';end if;
 perform public.set_assignment_review_visibility_058(chef_actor,choir,submission,true);
 if (select reviewer_audio_file_version_id from public.assignment_submissions where id=submission) is not null
  or (select reviewer_audio_file_version_id from public.assignment_submission_private_notes where submission_id=submission)<>version1 then raise exception '058 hide pointer transition failed';end if;
 if public.can_read_assignment_review_audio_058(owner_actor,choir,version1)
  or not public.can_read_assignment_review_audio_058(section_actor,choir,version1) then
  raise exception '058 hidden live-ticket authorization failed';end if;
 refused:=false;begin perform public.set_assignment_review_visibility_058(section_actor,choir,submission,false);
 exception when insufficient_privilege then refused:=true;end;if not refused then raise exception '058 section leader changed visibility';end if;
 perform public.set_assignment_review_visibility_058(chef_actor,choir,submission,false);
 if (select reviewer_audio_file_version_id from public.assignment_submissions where id=submission)<>version1 then raise exception '058 unhide restore failed';end if;
 if not public.can_read_assignment_review_audio_058(owner_actor,choir,version1) then raise exception '058 unhide live-ticket restore failed';end if;
 perform public.set_assignment_review_visibility_058(chef_actor,choir,submission,true);
 meta:=jsonb_build_object('submissionId',submission,'fileName','review-2.wav','mimeType','audio/wav',
  'size',20,'status','rejected','reviewerNote','hidden review');
 reserve:=public.assignment_review_audio_upload_058('reserve',chef_actor,null,choir,retry2,meta,'genova-private');
 lease:=(reserve->>'lease')::uuid;version2:=(reserve->>'fileVersionId')::uuid;
 committed:=public.assignment_review_audio_upload_058('commit',chef_actor,null,choir,retry2,meta,'genova-private',lease,repeat('b',64));
 if committed->'submission'->>'reviewer_audio_file_version_id' is not null
  or (select reviewer_audio_file_version_id from public.assignment_submission_private_notes where submission_id=submission)<>version2
  or (select count(*) from public.assignment_review_audio_versions where submission_id=submission)<>2 then raise exception '058 hidden replacement failed';end if;
 execute 'reset role';
 refused:=false;begin update public.assignment_review_audio_versions set file_name='mutated' where id=version1;
 exception when object_not_in_prerequisite_state then refused:=true;end;if not refused then raise exception '058 immutable version mutated';end if;
end;
$test$;

do $rls$
declare count_seen integer;
begin
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000057","role":"authenticated"}',true);
 execute 'set local role authenticated';select count(*) into count_seen from public.assignment_review_audio_versions;
 if count_seen<>0 then raise exception '058 owner saw hidden or replaced review versions: %',count_seen;end if;execute 'reset role';
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000059","role":"authenticated"}',true);
 execute 'set local role authenticated';select count(*) into count_seen from public.assignment_review_audio_versions;
 if count_seen<>2 then raise exception '058 matching reviewer lost versions: %',count_seen;end if;execute 'reset role';
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000060","role":"authenticated"}',true);
 execute 'set local role authenticated';select count(*) into count_seen from public.assignment_review_audio_versions;
 if count_seen<>0 then raise exception '058 wrong section crossed scope: %',count_seen;end if;execute 'reset role';
end;
$rls$;

do $archive$
declare result jsonb;lease uuid;saved_history_id uuid;version2 uuid;meta jsonb;
begin
 execute 'set local role service_role';
 meta:=jsonb_build_object('assignmentId','50000000-0000-4000-8000-000000000057','fileName','resubmit.wav',
  'mimeType','audio/wav','size',18,'note',null);
 result:=public.assignment_submission_upload_057('reserve','10000000-0000-4000-8000-000000000057',null,
  '20000000-0000-4000-8000-000000000057','62000000-0000-4000-8000-000000000058',meta,'genova-private');
 lease:=(result->>'lease')::uuid;
 result:=public.assignment_submission_upload_057('commit','10000000-0000-4000-8000-000000000057',null,
  '20000000-0000-4000-8000-000000000057','62000000-0000-4000-8000-000000000058',meta,'genova-private',lease,repeat('c',64));
 select id into saved_history_id from public.assignment_submission_history where source_submission_id='60000000-0000-4000-8000-000000000058' order by archived_at desc limit 1;
 select id into version2 from public.assignment_review_audio_versions where submission_id='60000000-0000-4000-8000-000000000058' order by version_number desc limit 1;
 if saved_history_id is null or (select reviewer_audio_file_version_id from public.assignment_submission_history where id=saved_history_id) is not null
  or (select reviewer_audio_file_version_id from public.assignment_submission_private_history where history_id=saved_history_id)<>version2
  or (select reviewer_note from public.assignment_submission_private_history where history_id=saved_history_id)<>'hidden review'
  or exists(select 1 from public.assignment_submission_private_notes where submission_id='60000000-0000-4000-8000-000000000058') then
  raise exception '058 hidden resubmit archive failed';end if;
 if public.can_read_assignment_review_audio_058('10000000-0000-4000-8000-000000000057',
    '20000000-0000-4000-8000-000000000057',version2)
  or not public.can_read_assignment_review_audio_058('10000000-0000-4000-8000-000000000059',
    '20000000-0000-4000-8000-000000000057',version2) then
  raise exception '058 private history live-ticket authorization failed';end if;
 execute 'reset role';
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000057","role":"authenticated"}',true);
 execute 'set local role authenticated';if exists(select 1 from public.assignment_submission_private_history) then raise exception '058 owner saw private history';end if;execute 'reset role';
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000059","role":"authenticated"}',true);
 execute 'set local role authenticated';if (select count(*) from public.assignment_submission_private_history)<>1 then raise exception '058 reviewer lost private history';end if;execute 'reset role';
end;
$archive$;
rollback;
