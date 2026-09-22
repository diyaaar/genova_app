begin;
insert into auth.users(id) values
 ('10000000-0000-4000-8000-000000000057'),
 ('10000000-0000-4000-8000-000000000058'),
 ('10000000-0000-4000-8000-000000000059'),
 ('10000000-0000-4000-8000-000000000060'),
 ('10000000-0000-4000-8000-000000000061');
insert into public.choirs(id,slug,name) values
 ('20000000-0000-4000-8000-000000000057','057-assignment','057 Assignment'),
 ('20000000-0000-4000-8000-000000000058','057-other','057 Other');
insert into public.choir_members
 (id,choir_id,auth_user_id,first_name,last_name,voice_group,join_date,is_active) values
 ('30000000-0000-4000-8000-000000000057','20000000-0000-4000-8000-000000000057','10000000-0000-4000-8000-000000000057','Assigned','Singer','Soprano',current_date,true),
 ('30000000-0000-4000-8000-000000000058','20000000-0000-4000-8000-000000000057','10000000-0000-4000-8000-000000000058','Not','Assigned','Alto',current_date,true),
 ('30000000-0000-4000-8000-000000000059','20000000-0000-4000-8000-000000000057','10000000-0000-4000-8000-000000000059','Section','Leader','Soprano',current_date,true),
 ('30000000-0000-4000-8000-000000000060','20000000-0000-4000-8000-000000000057','10000000-0000-4000-8000-000000000060','Other','Leader','Bass',current_date,true),
 ('30000000-0000-4000-8000-000000000061','20000000-0000-4000-8000-000000000058','10000000-0000-4000-8000-000000000061','Other','Chef','Soprano',current_date,true);
insert into public.roles(id,choir_id,name) values
 ('40000000-0000-4000-8000-000000000057','20000000-0000-4000-8000-000000000057','Şef'),
 ('40000000-0000-4000-8000-000000000058','20000000-0000-4000-8000-000000000057','Partisyon Şefi'),
 ('40000000-0000-4000-8000-000000000059','20000000-0000-4000-8000-000000000058','Şef');
insert into public.choir_member_roles(choir_id,member_id,role_id) values
 ('20000000-0000-4000-8000-000000000057','30000000-0000-4000-8000-000000000058','40000000-0000-4000-8000-000000000057'),
 ('20000000-0000-4000-8000-000000000057','30000000-0000-4000-8000-000000000059','40000000-0000-4000-8000-000000000058'),
 ('20000000-0000-4000-8000-000000000057','30000000-0000-4000-8000-000000000060','40000000-0000-4000-8000-000000000058'),
 ('20000000-0000-4000-8000-000000000058','30000000-0000-4000-8000-000000000061','40000000-0000-4000-8000-000000000059');
insert into public.assignments
 (id,choir_id,title,description,created_by,is_active,is_locked) values
 ('50000000-0000-4000-8000-000000000057','20000000-0000-4000-8000-000000000057','057 Assignment','Synthetic','30000000-0000-4000-8000-000000000058',true,false);
insert into public.assignment_targets(id,choir_id,assignment_id,member_id) values
 ('51000000-0000-4000-8000-000000000057','20000000-0000-4000-8000-000000000057','50000000-0000-4000-8000-000000000057','30000000-0000-4000-8000-000000000057');

\if :{?setup_only}
commit;
\quit
\endif

do $test$
declare
 actor uuid := '10000000-0000-4000-8000-000000000057';
 choir uuid := '20000000-0000-4000-8000-000000000057';
 assignment uuid := '50000000-0000-4000-8000-000000000057';
 retry1 uuid := '60000000-0000-4000-8000-000000000057';
 retry2 uuid := '60000000-0000-4000-8000-000000000058';
 retry3 uuid := '60000000-0000-4000-8000-000000000059';
 retry4 uuid := '60000000-0000-4000-8000-000000000060';
 lease1 uuid; lease2 uuid; lease3 uuid; lease4 uuid; first_result jsonb; second_result jsonb; meta jsonb; refused boolean;
 stable_submission uuid; first_version uuid; second_version uuid; third_version uuid; fourth_version uuid;
begin
 if has_function_privilege('authenticated','public.assignment_submission_upload_057(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE')
   or has_function_privilege('anon','public.assignment_submission_upload_057(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE')
   or not has_function_privilege('service_role','public.assignment_submission_upload_057(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE') then
   raise exception '057 wrapper privileges wrong';
 end if;
 execute 'set local role authenticated';
 refused := false;
 begin perform public.assignment_submission_upload_057('reserve',actor,null,choir,retry1,'{}','genova-private');
 exception when insufficient_privilege then refused := true; end;
 execute 'reset role';
 if not refused then raise exception '057 client called service wrapper'; end if;

 meta := jsonb_build_object('assignmentId',assignment,'fileName','take-1.wav','mimeType','audio/wav',
   'size',16,'note','first');
 execute 'set local role service_role';
 for first_result in select value from jsonb_array_elements(jsonb_build_array(
   jsonb_set(meta,'{fileName}','"take.svg"'),jsonb_set(meta,'{mimeType}','"text/html"'),
   jsonb_set(meta,'{size}','0'),jsonb_set(meta,'{note}',to_jsonb(repeat('x',1201))))) loop
   refused := false;
   begin perform public.assignment_submission_upload_057('reserve',actor,null,choir,gen_random_uuid(),first_result,'genova-private');
   exception when invalid_parameter_value then refused := true; end;
   if not refused then raise exception '057 unsafe metadata accepted: %',first_result; end if;
 end loop;
 refused := false;
 begin perform public.assignment_submission_upload_057('reserve','10000000-0000-4000-8000-000000000058',null,choir,gen_random_uuid(),meta,'genova-private');
 exception when insufficient_privilege then refused := true; end;
 if not refused then raise exception '057 unassigned member accepted'; end if;
 update public.assignments set is_locked=true where id=assignment;
 refused := false;
 begin perform public.assignment_submission_upload_057('reserve',actor,null,choir,gen_random_uuid(),meta,'genova-private');
 exception when insufficient_privilege then refused := true; end;
 if not refused then raise exception '057 locked assignment accepted'; end if;
 update public.assignments set is_locked=false where id=assignment;
 update public.choir_members set is_active=false where auth_user_id=actor;
 refused := false;
 begin perform public.assignment_submission_upload_057('reserve',actor,null,choir,gen_random_uuid(),meta,'genova-private');
 exception when insufficient_privilege then refused := true; end;
 if not refused then raise exception '057 inactive member accepted'; end if;
 update public.choir_members set is_active=true where auth_user_id=actor;

 first_result := public.assignment_submission_upload_057('reserve',actor,null,choir,gen_random_uuid(),
   jsonb_build_object('assignmentId',assignment,'fileName','exercise.docx',
     'mimeType','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     'size',16,'note',null),'genova-private');
 if first_result->>'state'<>'uploading' then raise exception '057 passive OpenXML metadata refused'; end if;

 first_result := public.assignment_submission_upload_057('reserve',actor,null,choir,retry1,meta,'genova-private');
 lease1 := (first_result->>'lease')::uuid;
 if first_result->>'state'<>'uploading' or lease1 is null then raise exception '057 initial reserve failed'; end if;
 if public.assignment_submission_upload_057('reserve',actor,null,choir,retry1,meta,'genova-private')->>'state'<>'pending' then
   raise exception '057 active retry not pending';
 end if;
 first_result := public.assignment_submission_upload_057('commit',actor,null,choir,retry1,meta,'genova-private',lease1,repeat('a',64));
 stable_submission := (first_result->'submission'->>'id')::uuid;
 first_version := (first_result->>'fileVersionId')::uuid;
 if first_result->>'state'<>'committed' or stable_submission is null or first_version is null then
   raise exception '057 initial commit failed';
 end if;
 if public.assignment_submission_upload_057('reserve',actor,null,choir,retry1,meta,'genova-private')<>first_result then
   raise exception '057 committed replay mismatch';
 end if;

 update public.assignment_submissions set status='approved',reviewer_note='keep in history',
   approved_by='30000000-0000-4000-8000-000000000058',approved_at=now()
   where id=stable_submission;
 insert into public.assignment_submission_private_notes
   (submission_id,choir_id,assignment_id,member_id,reviewer_note)
   values(stable_submission,choir,assignment,'30000000-0000-4000-8000-000000000057','private old note');
 meta := jsonb_build_object('assignmentId',assignment,'fileName','take-2.wav','mimeType','audio/wav',
   'size',20,'note','second');
 first_result := public.assignment_submission_upload_057('reserve',actor,null,choir,retry2,meta,'genova-private');
 lease2 := (first_result->>'lease')::uuid;
 second_result := public.assignment_submission_upload_057('commit',actor,null,choir,retry2,meta,'genova-private',lease2,repeat('b',64));
 second_version := (second_result->>'fileVersionId')::uuid;
 if (second_result->'submission'->>'id')::uuid<>stable_submission or second_version=first_version then
   raise exception '057 stable submission/version identity failed';
 end if;

 -- Two uploads may be in flight at once. Commit order, not reservation order, owns the current pointer.
 meta := jsonb_build_object('assignmentId',assignment,'fileName','take-3.wav','mimeType','audio/wav','size',21,'note',null);
 first_result := public.assignment_submission_upload_057('reserve',actor,null,choir,retry3,meta,'genova-private');
 lease3 := (first_result->>'lease')::uuid; third_version := (first_result->>'fileVersionId')::uuid;
 meta := jsonb_build_object('assignmentId',assignment,'fileName','take-4.wav','mimeType','audio/wav','size',22,'note',null);
 second_result := public.assignment_submission_upload_057('reserve',actor,null,choir,retry4,meta,'genova-private');
 lease4 := (second_result->>'lease')::uuid; fourth_version := (second_result->>'fileVersionId')::uuid;
 second_result := public.assignment_submission_upload_057('commit',actor,null,choir,retry4,meta,'genova-private',lease4,repeat('d',64));
 meta := jsonb_build_object('assignmentId',assignment,'fileName','take-3.wav','mimeType','audio/wav','size',21,'note',null);
 first_result := public.assignment_submission_upload_057('commit',actor,null,choir,retry3,meta,'genova-private',lease3,repeat('c',64));
 if (first_result->'submission'->>'current_file_version_id')::uuid<>third_version
   or (second_result->>'fileVersionId')::uuid<>fourth_version then
   raise exception '057 competing reservation commit ordering failed';
 end if;
 if not public.claim_assignment_notification_057(actor,choir,stable_submission,third_version)
   or public.claim_assignment_notification_057(actor,choir,stable_submission,third_version) then
   raise exception '057 notification claim is not one-shot';
 end if;
 execute 'reset role';

 if (select count(*) from public.assignment_submission_file_versions where submission_id=stable_submission)<>4
   or (select array_agg(version_number order by version_number) from public.assignment_submission_file_versions where submission_id=stable_submission)<>array[1,2,3,4]
   or (select current_file_version_id from public.assignment_submissions where id=stable_submission)<>third_version
   or (select status from public.assignment_submissions where id=stable_submission)<>'pending'
   or (select count(*) from public.assignment_submission_history where source_submission_id=stable_submission
       and file_version_id=first_version and status='approved' and reviewer_note='keep in history')<>1
   or (select count(*) from public.assignment_submission_history where source_submission_id=stable_submission)<>3
   or exists(select 1 from public.assignment_submission_private_notes where submission_id=stable_submission) then
   raise exception '057 immutable history/current transition failed';
 end if;
 refused := false;
 begin update public.assignment_submission_file_versions set file_name='mutated' where id=first_version;
 exception when object_not_in_prerequisite_state then refused := true; end;
 if not refused then raise exception '057 immutable version mutated'; end if;
end;
$test$;

do $rls$
declare count_seen integer;
begin
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000057","role":"authenticated"}',true);
 execute 'set local role authenticated';
 select count(*) into count_seen from public.assignment_submission_file_versions;
 if count_seen<>4 then raise exception '057 owner did not see four versions: %',count_seen; end if;
 execute 'reset role';
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000059","role":"authenticated"}',true);
 execute 'set local role authenticated';
 select count(*) into count_seen from public.assignment_submission_file_versions;
 if count_seen<>4 then raise exception '057 matching section leader did not see versions: %',count_seen; end if;
 execute 'reset role';
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000060","role":"authenticated"}',true);
 execute 'set local role authenticated';
 select count(*) into count_seen from public.assignment_submission_file_versions;
 if count_seen<>0 then raise exception '057 other section leader crossed voice scope: %',count_seen; end if;
 execute 'reset role';
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000061","role":"authenticated"}',true);
 execute 'set local role authenticated';
 select count(*) into count_seen from public.assignment_submission_file_versions;
 if count_seen<>0 then raise exception '057 other choir chef crossed tenant: %',count_seen; end if;
 execute 'reset role';
end;
$rls$;
rollback;
