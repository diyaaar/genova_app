begin;
insert into auth.users(id) values
 ('10000000-0000-4000-8000-000000000059'),('10000000-0000-4000-8000-000000000060'),
 ('10000000-0000-4000-8000-000000000061'),('10000000-0000-4000-8000-000000000062'),
 ('10000000-0000-4000-8000-000000000063');
insert into public.choirs(id,slug,name) values
 ('20000000-0000-4000-8000-000000000059','059-comments','059 Comments'),
 ('20000000-0000-4000-8000-000000000060','059-other','059 Other');
insert into public.choir_members(id,choir_id,auth_user_id,first_name,last_name,voice_group,join_date,is_active) values
 ('30000000-0000-4000-8000-000000000059','20000000-0000-4000-8000-000000000059','10000000-0000-4000-8000-000000000059','Chef','059','Alto',current_date,true),
 ('30000000-0000-4000-8000-000000000060','20000000-0000-4000-8000-000000000059','10000000-0000-4000-8000-000000000060','Leader','059','Soprano',current_date,true),
 ('30000000-0000-4000-8000-000000000061','20000000-0000-4000-8000-000000000059','10000000-0000-4000-8000-000000000061','Singer','059','Soprano',current_date,true),
 ('30000000-0000-4000-8000-000000000062','20000000-0000-4000-8000-000000000059','10000000-0000-4000-8000-000000000062','Other','Leader','Bass',current_date,true),
 ('30000000-0000-4000-8000-000000000063','20000000-0000-4000-8000-000000000060','10000000-0000-4000-8000-000000000063','Other','Chef','Soprano',current_date,true);
insert into public.roles(id,choir_id,name) values
 ('40000000-0000-4000-8000-000000000059','20000000-0000-4000-8000-000000000059','Şef'),
 ('40000000-0000-4000-8000-000000000060','20000000-0000-4000-8000-000000000059','Partisyon Şefi'),
 ('40000000-0000-4000-8000-000000000061','20000000-0000-4000-8000-000000000060','Şef');
insert into public.choir_member_roles(choir_id,member_id,role_id) values
 ('20000000-0000-4000-8000-000000000059','30000000-0000-4000-8000-000000000059','40000000-0000-4000-8000-000000000059'),
 ('20000000-0000-4000-8000-000000000059','30000000-0000-4000-8000-000000000060','40000000-0000-4000-8000-000000000060'),
 ('20000000-0000-4000-8000-000000000059','30000000-0000-4000-8000-000000000062','40000000-0000-4000-8000-000000000060'),
 ('20000000-0000-4000-8000-000000000060','30000000-0000-4000-8000-000000000063','40000000-0000-4000-8000-000000000061');
insert into public.repertoire(id,choir_id,title,is_visible) values
 ('50000000-0000-4000-8000-000000000059','20000000-0000-4000-8000-000000000059','059 Song',true),
 ('50000000-0000-4000-8000-000000000060','20000000-0000-4000-8000-000000000060','059 Other Song',true);

do $test$
declare choir uuid:='20000000-0000-4000-8000-000000000059';song uuid:='50000000-0000-4000-8000-000000000059';
 chef uuid:='10000000-0000-4000-8000-000000000059';leader uuid:='10000000-0000-4000-8000-000000000060';
 singer uuid:='10000000-0000-4000-8000-000000000061';bass uuid:='10000000-0000-4000-8000-000000000062';
 comment uuid:='60000000-0000-4000-8000-000000000059';retry uuid:='70000000-0000-4000-8000-000000000059';
 result jsonb;meta jsonb;lease uuid;version uuid;refused boolean;text_comment uuid:='60000000-0000-4000-8000-000000000060';
 delete_retry uuid:='80000000-0000-4000-8000-000000000059';delete_lease uuid;
begin
 if has_function_privilege('authenticated','public.repertoire_comment_upload_059(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE')
  or has_function_privilege('authenticated','public.create_repertoire_text_comment_059(uuid,uuid,uuid,uuid,uuid,text,text)','EXECUTE')
  or has_function_privilege('authenticated','public.repertoire_comment_delete_059(text,uuid,uuid,uuid,uuid,uuid)','EXECUTE')
  or not has_function_privilege('service_role','public.repertoire_comment_upload_059(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE') then
  raise exception '059 wrapper privileges wrong';end if;
 meta:=jsonb_build_object('commentId',comment,'songId',song,'contentHtml','<p>Soprano note</p>',
  'targetVoiceGroup','Soprano','fileName','comment.wav','mimeType','audio/wav','size',16);
 execute 'set local role service_role';
 refused:=false;begin perform public.repertoire_comment_upload_059('reserve',leader,null,choir,gen_random_uuid(),jsonb_set(meta,'{targetVoiceGroup}','null'),'genova-private');
 exception when insufficient_privilege then refused:=true;end;if not refused then raise exception '059 leader created global audio';end if;
 refused:=false;begin perform public.repertoire_comment_upload_059('reserve',bass,null,choir,gen_random_uuid(),meta,'genova-private');
 exception when insufficient_privilege then refused:=true;end;if not refused then raise exception '059 wrong voice created audio';end if;
 refused:=false;begin perform public.repertoire_comment_upload_059('reserve',leader,null,choir,gen_random_uuid(),jsonb_set(meta,'{songId}','"50000000-0000-4000-8000-000000000060"'),'genova-private');
 exception when insufficient_privilege then refused:=true;end;if not refused then raise exception '059 crossed choir song';end if;
 result:=public.repertoire_comment_upload_059('reserve',leader,null,choir,retry,meta,'genova-private');
 lease:=(result->>'lease')::uuid;version:=(result->>'fileVersionId')::uuid;
 if result->>'state'<>'uploading' or lease is null then raise exception '059 reserve failed';end if;
 if public.repertoire_comment_upload_059('reserve',leader,null,choir,retry,meta,'genova-private')->>'state'<>'pending' then raise exception '059 pending replay failed';end if;
 result:=public.repertoire_comment_upload_059('commit',leader,null,choir,retry,meta,'genova-private',lease,repeat('a',64));
 if result->>'state'<>'committed' or (result->'comment'->>'audio_file_version_id')::uuid<>version then raise exception '059 commit failed: %',result;end if;
 if not public.can_read_repertoire_comment_audio_059(chef,choir,version)
  or not public.can_read_repertoire_comment_audio_059(leader,choir,version)
  or not public.can_read_repertoire_comment_audio_059(singer,choir,version)
  or public.can_read_repertoire_comment_audio_059(bass,choir,version) then raise exception '059 target read matrix failed';end if;
 execute 'reset role';
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000060","role":"authenticated"}',true);
 execute 'set local role authenticated';
 refused:=false;begin update public.repertoire_song_comments set audio_drive_file_id=null where id=comment;
 exception when insufficient_privilege then refused:=true;end;if not refused then raise exception '059 client mutated audio identity';end if;
 execute 'reset role';
 update public.repertoire_song_comments set is_hidden=true where id=comment;
 execute 'set local role service_role';
 if not public.can_read_repertoire_comment_audio_059(chef,choir,version)
  or public.can_read_repertoire_comment_audio_059(leader,choir,version)
  or public.can_read_repertoire_comment_audio_059(singer,choir,version) then raise exception '059 hidden read matrix failed';end if;
 execute 'reset role';update public.repertoire_song_comments set is_hidden=false where id=comment;
 execute 'set local role service_role';
 result:=public.create_repertoire_text_comment_059(chef,null,choir,text_comment,song,'<p>Global text</p>',null);
 if (result->>'id')::uuid<>text_comment or result->>'audio_drive_file_id' is not null then raise exception '059 text comment failed';end if;
 if (public.create_repertoire_text_comment_059(chef,null,choir,text_comment,song,'<p>Global text</p>',null)->>'id')::uuid<>text_comment then raise exception '059 text replay failed';end if;
 refused:=false;begin perform public.create_repertoire_text_comment_059(leader,null,choir,gen_random_uuid(),song,'<p>Bad global</p>',null);
 exception when insufficient_privilege then refused:=true;end;if not refused then raise exception '059 leader created global text';end if;
 refused:=false;begin perform public.repertoire_comment_delete_059('reserve',bass,choir,gen_random_uuid(),comment,null);
 exception when insufficient_privilege then refused:=true;end;if not refused then raise exception '059 non-owner leader deleted comment';end if;
 result:=public.repertoire_comment_delete_059('reserve',leader,choir,delete_retry,comment,null);delete_lease:=(result->>'lease')::uuid;
 if result->>'state'<>'deleting' or exists(select 1 from public.repertoire_song_comments where id=comment)
  or exists(select 1 from public.repertoire_comment_audio_versions where id=version)
  or public.can_read_repertoire_comment_audio_059(singer,choir,version) then raise exception '059 delete reserve failed';end if;
 if public.repertoire_comment_delete_059('reserve',leader,choir,delete_retry,comment,null)->>'state'<>'deleting' then raise exception '059 delete replay failed';end if;
 result:=public.repertoire_comment_delete_059('finalize',leader,choir,delete_retry,comment,delete_lease);
 if result->>'state'<>'deleted' then raise exception '059 delete finalize failed';end if;
 result:=public.repertoire_comment_delete_059('reserve',chef,choir,gen_random_uuid(),text_comment,null);
 if result->>'state'<>'deleted' or exists(select 1 from public.repertoire_song_comments where id=text_comment) then raise exception '059 text delete failed';end if;
 execute 'reset role';
end;
$test$;

do $rls$
declare count_seen integer;
begin
 insert into public.repertoire_song_comments(id,choir_id,song_id,content_html,created_by,target_voice_group,is_hidden) values
  ('60000000-0000-4000-8000-000000000061','20000000-0000-4000-8000-000000000059','50000000-0000-4000-8000-000000000059','<p>visible</p>','30000000-0000-4000-8000-000000000060','Soprano',false),
  ('60000000-0000-4000-8000-000000000062','20000000-0000-4000-8000-000000000059','50000000-0000-4000-8000-000000000059','<p>hidden</p>','30000000-0000-4000-8000-000000000060','Soprano',true);
 insert into public.repertoire_song_comments(id,choir_id,song_id,content_html,created_by,target_voice_group,is_hidden,
   audio_drive_file_id,audio_file_name,audio_mime_type,audio_file_size_bytes) values
  ('60000000-0000-4000-8000-000000000063','20000000-0000-4000-8000-000000000059','50000000-0000-4000-8000-000000000059','',
   '30000000-0000-4000-8000-000000000060','Soprano',false,'legacy-drive-audio','legacy.wav','audio/wav',16);
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000060","role":"authenticated"}',true);
 execute 'set local role authenticated';
 begin delete from public.repertoire_song_comments where id='60000000-0000-4000-8000-000000000063';
   raise exception '059 legacy audio direct delete succeeded';exception when insufficient_privilege then null;end;
 execute 'reset role';
 if not exists(select 1 from public.repertoire_song_comments where id='60000000-0000-4000-8000-000000000063') then raise exception '059 legacy audio was orphaned';end if;
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000061","role":"authenticated"}',true);
 execute 'set local role authenticated';select count(*) into count_seen from public.repertoire_song_comments where id in('60000000-0000-4000-8000-000000000061','60000000-0000-4000-8000-000000000062');
 if count_seen<>1 then raise exception '059 singer hidden RLS failed: %',count_seen;end if;execute 'reset role';
 perform set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000059","role":"authenticated"}',true);
 execute 'set local role authenticated';select count(*) into count_seen from public.repertoire_song_comments where id in('60000000-0000-4000-8000-000000000061','60000000-0000-4000-8000-000000000062');
 if count_seen<>2 then raise exception '059 chef hidden RLS failed: %',count_seen;end if;execute 'reset role';
end;
$rls$;
rollback;
