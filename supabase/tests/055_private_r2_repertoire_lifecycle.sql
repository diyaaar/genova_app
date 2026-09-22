-- Synthetic fixtures only. The ordinary matrix rolls back; setup_only supports concurrency proof.
begin;
insert into auth.users(id) values ('10000000-0000-4000-8000-000000000055');
insert into public.choirs(id,slug,name) values
 ('20000000-0000-4000-8000-000000000055','055-lifecycle','055 Lifecycle'),
 ('20000000-0000-4000-8000-000000000056','055-other','055 Other');
insert into public.choir_members(id,choir_id,auth_user_id,first_name,last_name,join_date) values
 ('30000000-0000-4000-8000-000000000055','20000000-0000-4000-8000-000000000055',
  '10000000-0000-4000-8000-000000000055','Synthetic','Manager',current_date);
insert into public.roles(id,choir_id,name) values
 ('40000000-0000-4000-8000-000000000055','20000000-0000-4000-8000-000000000055','Şef');
insert into public.choir_member_roles(choir_id,member_id,role_id) values
 ('20000000-0000-4000-8000-000000000055','30000000-0000-4000-8000-000000000055','40000000-0000-4000-8000-000000000055');
insert into public.repertoire(id,choir_id,title,is_visible,drive_folder_id) values
 ('50000000-0000-4000-8000-000000000055','20000000-0000-4000-8000-000000000055','R2 song',true,null),
 ('50000000-0000-4000-8000-000000000056','20000000-0000-4000-8000-000000000055','Annotated',true,null),
 ('50000000-0000-4000-8000-000000000057','20000000-0000-4000-8000-000000000055','Mixed',true,'legacy-folder'),
 ('50000000-0000-4000-8000-000000000059','20000000-0000-4000-8000-000000000055','Too many',true,null),
 ('50000000-0000-4000-8000-000000000058','20000000-0000-4000-8000-000000000056','Other',true,null);
insert into public.repertoire_files(id,choir_id,song_id,file_name,file_type,drive_file_id,mime_type,file_size_bytes,uploaded_by) values
 ('60000000-0000-4000-8000-000000000055','20000000-0000-4000-8000-000000000055','50000000-0000-4000-8000-000000000055','score.pdf','sheet','r2_60000000-0000-4000-8000-000000000055','application/pdf',69,'30000000-0000-4000-8000-000000000055'),
 ('60000000-0000-4000-8000-000000000056','20000000-0000-4000-8000-000000000055','50000000-0000-4000-8000-000000000056','annotated.pdf','sheet','r2_60000000-0000-4000-8000-000000000056','application/pdf',69,'30000000-0000-4000-8000-000000000055'),
 ('60000000-0000-4000-8000-000000000057','20000000-0000-4000-8000-000000000055','50000000-0000-4000-8000-000000000057','legacy.pdf','sheet','google-file','application/pdf',69,'30000000-0000-4000-8000-000000000055');
insert into public.repertoire_file_storage_locations
 (repertoire_file_id,choir_id,provider,bucket,object_key,content_length,mime_type,sha256_hex,verified_at,is_active)
select f.id,f.choir_id,'r2','genova-private','choirs/'||f.choir_id||'/repertoire/'||f.id||'/content',
 f.file_size_bytes,f.mime_type,repeat('a',64),now(),true from public.repertoire_files f
 where f.id in ('60000000-0000-4000-8000-000000000055','60000000-0000-4000-8000-000000000056');
insert into public.repertoire_pdf_annotations
 (id,choir_id,song_id,repertoire_file_id,page_number,layer_type,owner_member_id,annotations_json)
values ('70000000-0000-4000-8000-000000000055','20000000-0000-4000-8000-000000000055',
 '50000000-0000-4000-8000-000000000056','60000000-0000-4000-8000-000000000056',1,'personal',
 '30000000-0000-4000-8000-000000000055','[]');
with generated as (
 select (substr(md5('055-big-'||g),1,8)||'-'||substr(md5('055-big-'||g),9,4)||'-4'||substr(md5('055-big-'||g),14,3)||'-8'||substr(md5('055-big-'||g),18,3)||'-'||substr(md5('055-big-'||g),21,12))::uuid id
 from generate_series(1,101) g
)
insert into public.repertoire_files(id,choir_id,song_id,file_name,file_type,drive_file_id,mime_type,file_size_bytes,uploaded_by)
select id,'20000000-0000-4000-8000-000000000055','50000000-0000-4000-8000-000000000059','bulk.pdf','sheet',
 'r2_'||id,'application/pdf',69,'30000000-0000-4000-8000-000000000055' from generated;
insert into public.repertoire_file_storage_locations
 (repertoire_file_id,choir_id,provider,bucket,object_key,content_length,mime_type,sha256_hex,verified_at,is_active)
select f.id,f.choir_id,'r2','genova-private','choirs/'||f.choir_id||'/repertoire/'||f.id||'/content',69,
 'application/pdf',repeat('b',64),now(),true from public.repertoire_files f
 where f.song_id='50000000-0000-4000-8000-000000000059';

\if :{?setup_only}
commit;
\quit
\endif

do $test$
declare
 actor uuid := '10000000-0000-4000-8000-000000000055';
 choir uuid := '20000000-0000-4000-8000-000000000055';
 retry uuid := '80000000-0000-4000-8000-000000000055';
 result jsonb;
 refused boolean;
begin
 if has_function_privilege('authenticated','public.repertoire_lifecycle_055(text,uuid,uuid,uuid,uuid,text,uuid,text)','EXECUTE')
   or has_function_privilege('anon','public.repertoire_lifecycle_055(text,uuid,uuid,uuid,uuid,text,uuid,text)','EXECUTE')
   or not has_function_privilege('service_role','public.repertoire_lifecycle_055(text,uuid,uuid,uuid,uuid,text,uuid,text)','EXECUTE')
   or has_schema_privilege('authenticated','genova_055','USAGE') then
   raise exception '055 RPC/private schema privileges are incorrect';
 end if;
 if not exists(select 1 from pg_class where oid='genova_055.deletion_jobs'::regclass and relrowsecurity and relforcerowsecurity)
   or not exists(select 1 from pg_class where oid='genova_055.deletion_objects'::regclass and relrowsecurity and relforcerowsecurity) then
   raise exception '055 operational tables must force RLS';
 end if;
 execute 'set local role authenticated'; refused:=false;
 begin perform public.repertoire_lifecycle_055('reserve-delete',actor,null,choir,retry,'file','60000000-0000-4000-8000-000000000055','delete');
 exception when insufficient_privilege then refused:=true; end;
 execute 'reset role'; if not refused then raise exception '055 client invoked service RPC'; end if;

 execute 'set local role service_role';
 result:=public.repertoire_lifecycle_055('check-replace',actor,null,choir,retry,'file','60000000-0000-4000-8000-000000000055','replacement');
 if result->>'state'<>'ready' then raise exception '055 replacement preflight failed'; end if;
 refused:=false;
 begin perform public.repertoire_lifecycle_055('check-replace',actor,null,choir,retry,'file','60000000-0000-4000-8000-000000000056','replacement');
 exception when sqlstate 'P5501' then refused:=true; end;
 if not refused then raise exception '055 annotated replacement accepted'; end if;
 refused:=false;
 begin perform public.repertoire_lifecycle_055('reserve-delete',actor,null,choir,retry,'song','50000000-0000-4000-8000-000000000057','delete');
 exception when sqlstate 'P5502' then refused:=true; end;
 if not refused then raise exception '055 mixed song deletion accepted'; end if;
 refused:=false;
 begin perform public.repertoire_lifecycle_055('reserve-delete',actor,null,choir,retry,'song','50000000-0000-4000-8000-000000000059','delete');
 exception when sqlstate 'P5503' then refused:=true; end;
 if not refused then raise exception '055 unbounded song deletion accepted'; end if;

 result:=public.repertoire_lifecycle_055('reserve-delete',actor,null,choir,retry,'file','60000000-0000-4000-8000-000000000055','delete');
 if result->>'state'<>'cleanup' or jsonb_array_length(result->'targets')<>1
   or result->'targets'->0->>'objectKey' <> 'choirs/20000000-0000-4000-8000-000000000055/repertoire/60000000-0000-4000-8000-000000000055/content' then
   raise exception '055 exact file cleanup target wrong';
 end if;
 execute 'reset role';
 if exists(select 1 from public.repertoire_files where id='60000000-0000-4000-8000-000000000055') then
   raise exception '055 product file remained visible';
 end if;
 execute 'set local role service_role';
 if public.repertoire_lifecycle_055('reserve-delete',actor,null,choir,gen_random_uuid(),'file','60000000-0000-4000-8000-000000000055','delete') <> result then
   raise exception '055 deleted target did not replay exact job';
 end if;
 result:=public.repertoire_lifecycle_055('cleaned',actor,null,choir,retry,'file','60000000-0000-4000-8000-000000000055','delete');
 if result->>'state'<>'cleaned' then raise exception '055 cleanup completion failed'; end if;

 -- Explicit delete retains today's confirmed cascade semantics; replacement never reaches this path when annotated.
 result:=public.repertoire_lifecycle_055('reserve-delete',actor,null,choir,gen_random_uuid(),'file','60000000-0000-4000-8000-000000000056','delete');
 execute 'reset role';
 if exists(select 1 from public.repertoire_pdf_annotations where id='70000000-0000-4000-8000-000000000055') then
   raise exception '055 explicit delete did not cascade annotation';
 end if;
 execute 'set local role service_role';
 perform public.repertoire_lifecycle_055('cleaned',actor,null,choir,retry,'file','60000000-0000-4000-8000-000000000055','delete');

 result:=public.repertoire_lifecycle_055('cleaned',actor,null,choir,gen_random_uuid(),'file','60000000-0000-4000-8000-000000000056','delete');
 if result->>'state'<>'cleaned' then raise exception '055 annotated explicit-delete cleanup failed'; end if;
 result:=public.repertoire_lifecycle_055('reserve-delete',actor,null,choir,gen_random_uuid(),'song','50000000-0000-4000-8000-000000000055','delete');
 if result->>'state'<>'cleanup' or jsonb_array_length(result->'targets')<>0 then
   raise exception '055 empty R2-only song deletion failed';
 end if;
 perform public.repertoire_lifecycle_055('cleaned',actor,null,choir,gen_random_uuid(),'song','50000000-0000-4000-8000-000000000055','delete');

 execute 'reset role'; delete from public.choir_member_roles where member_id='30000000-0000-4000-8000-000000000055';
 execute 'set local role service_role'; refused:=false;
 begin perform public.repertoire_lifecycle_055('reserve-delete',actor,null,choir,gen_random_uuid(),'song','50000000-0000-4000-8000-000000000055','delete');
 exception when insufficient_privilege then refused:=true; end;
 if not refused then raise exception '055 revoked manager deleted target'; end if;
 execute 'reset role';
end;
$test$;
rollback;
