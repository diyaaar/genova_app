begin;
insert into auth.users(id) values('10000000-0000-4000-8000-000000000056');
insert into public.choirs(id,slug,name) values('20000000-0000-4000-8000-000000000056','056-cover','056 Cover');
insert into public.choir_members(id,choir_id,auth_user_id,first_name,last_name,join_date) values
 ('30000000-0000-4000-8000-000000000056','20000000-0000-4000-8000-000000000056',
  '10000000-0000-4000-8000-000000000056','Synthetic','Manager',current_date);
insert into public.roles(id,choir_id,name) values
 ('40000000-0000-4000-8000-000000000056','20000000-0000-4000-8000-000000000056','Şef');
insert into public.choir_member_roles(choir_id,member_id,role_id) values
 ('20000000-0000-4000-8000-000000000056','30000000-0000-4000-8000-000000000056','40000000-0000-4000-8000-000000000056');
insert into public.repertoire(id,choir_id,title,is_visible) values
 ('50000000-0000-4000-8000-000000000056','20000000-0000-4000-8000-000000000056','Cover Song',true);
\if :{?setup_only}
commit;
\quit
\endif
do $test$
declare
 actor uuid:='10000000-0000-4000-8000-000000000056'; choir uuid:='20000000-0000-4000-8000-000000000056';
 retry uuid:='60000000-0000-4000-8000-000000000056'; lease uuid; result jsonb; refused boolean;
 meta jsonb:=jsonb_build_object('songId','50000000-0000-4000-8000-000000000056','fileName','cover.png',
  'fileType','other','mimeType','image/png','size',69,'partitionLabel','__cover__');
begin
 if has_function_privilege('authenticated','public.repertoire_cover_upload_056(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE')
   or has_function_privilege('anon','public.repertoire_cover_upload_056(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE')
   or not has_function_privilege('service_role','public.repertoire_cover_upload_056(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE') then
   raise exception '056 wrapper privileges wrong';
 end if;
 execute 'set local role authenticated';refused:=false;
 begin perform public.repertoire_cover_upload_056('reserve',actor,null,choir,retry,meta,'genova-private');
 exception when insufficient_privilege then refused:=true;end;
 execute 'reset role';if not refused then raise exception '056 client called wrapper';end if;
 execute 'set local role service_role';
 for result in select value from jsonb_array_elements(jsonb_build_array(
   jsonb_set(meta,'{mimeType}','"image/svg+xml"'),jsonb_set(meta,'{fileName}','"cover.jpg"'),
   jsonb_set(meta,'{mimeType}','null'),jsonb_set(meta,'{partitionLabel}','null'),
   jsonb_set(meta,'{fileType}','"sheet"'))) loop
   refused:=false;begin perform public.repertoire_cover_upload_056('reserve',actor,null,choir,gen_random_uuid(),result,'genova-private');
   exception when invalid_parameter_value then refused:=true;end;
   if not refused then raise exception '056 unsafe cover metadata accepted: %',result;end if;
 end loop;
 result:=public.repertoire_cover_upload_056('reserve',actor,null,choir,retry,meta,'genova-private');
 lease:=(result->>'lease')::uuid;if result->>'state'<>'uploading' or lease is null then raise exception '056 reserve failed';end if;
 if public.repertoire_cover_upload_056('reserve',actor,null,choir,retry,meta,'genova-private')->>'state'<>'pending' then raise exception '056 active retry not pending';end if;
 result:=public.repertoire_cover_upload_056('commit',actor,null,choir,retry,meta,'genova-private',lease,repeat('a',64));
 if result->>'state'<>'committed' or result->'file'->>'file_type'<>'other' or result->'file'->>'partition_label'<>'__cover__' then raise exception '056 commit wrong';end if;
 if public.repertoire_cover_upload_056('reserve',actor,null,choir,retry,meta,'genova-private')<>result then raise exception '056 committed replay wrong';end if;
 execute 'reset role';
 if (select count(*) from public.repertoire_file_storage_locations where repertoire_file_id=(result->'file'->>'id')::uuid and is_active)<>1 then raise exception '056 active mapping missing';end if;
end;
$test$;
rollback;
