-- LOCAL ISOLATED DATABASE ONLY. Synthetic fixtures are transaction-local and rolled back.
begin;
do $test$
declare
  choir uuid:='20000000-0000-4000-8000-000000000060';other_choir uuid:='20000000-0000-4000-8000-000000000061';
  sender_user uuid:='10000000-0000-4000-8000-000000000060';peer_user uuid:='10000000-0000-4000-8000-000000000061';
  outsider_user uuid:='10000000-0000-4000-8000-000000000062';cross_user uuid:='10000000-0000-4000-8000-000000000063';
  sender uuid:='30000000-0000-4000-8000-000000000060';peer uuid:='30000000-0000-4000-8000-000000000061';
  outsider uuid:='30000000-0000-4000-8000-000000000062';cross_member uuid:='30000000-0000-4000-8000-000000000063';
  room uuid:='40000000-0000-4000-8000-000000000060';cross_room uuid:='40000000-0000-4000-8000-000000000061';
  batch uuid:='50000000-0000-4000-8000-000000000060';avatar1 uuid:='50000000-0000-4000-8000-000000000061';avatar2 uuid:='50000000-0000-4000-8000-000000000062';
  retry0 uuid:='60000000-0000-4000-8000-000000000060';retry1 uuid:='60000000-0000-4000-8000-000000000061';
  retry_avatar1 uuid:='60000000-0000-4000-8000-000000000062';retry_avatar2 uuid:='60000000-0000-4000-8000-000000000063';
  result jsonb;meta jsonb;lease uuid;version0 uuid;version1 uuid;old_avatar uuid;refused boolean;delete_lease uuid;delete_retry uuid:=gen_random_uuid();
begin
  insert into auth.users(id) values(sender_user),(peer_user),(outsider_user),(cross_user);
  insert into public.choirs(id,slug,name) values(choir,'060-chat','060 Chat'),(other_choir,'060-other','060 Other');
  insert into public.choir_members(id,choir_id,auth_user_id,first_name,last_name,voice_group,join_date,is_active) values
    (sender,choir,sender_user,'Sender','060','Soprano',current_date,true),(peer,choir,peer_user,'Peer','060','Alto',current_date,true),
    (outsider,choir,outsider_user,'Outsider','060','Tenor',current_date,true),(cross_member,other_choir,cross_user,'Cross','060','Bass',current_date,true);
  insert into public.chat_rooms(id,choir_id,name,slug,type,created_by) values
    (room,choir,'060 Room','060-room','custom',sender),(cross_room,other_choir,'060 Cross','060-cross','custom',cross_member);
  insert into public.chat_room_members(choir_id,room_id,member_id,role) values
    (choir,room,sender,'admin'),(choir,room,peer,'member'),(other_choir,cross_room,cross_member,'admin');

  if has_function_privilege('authenticated','public.chat_media_upload_060(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE')
    or not has_function_privilege('service_role','public.chat_media_upload_060(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)','EXECUTE') then
    raise exception '060 RPC privilege boundary failed';end if;
  execute 'set local role service_role';
  meta:=jsonb_build_object('kind','message-image','batchId',batch,'roomId',room,'replyToId',null,
    'expectedCount',2,'position',0,'fileName','first.jpg','mimeType','image/jpeg','size',5);
  refused:=false;begin perform public.chat_media_upload_060('reserve',outsider_user,null,choir,gen_random_uuid(),meta,'genova-private');
  exception when insufficient_privilege then refused:=true;end;if not refused then raise exception '060 nonmember reserved media';end if;
  refused:=false;begin perform public.chat_media_upload_060('reserve',cross_user,null,other_choir,gen_random_uuid(),jsonb_set(meta,'{roomId}',to_jsonb(room)),'genova-private');
  exception when insufficient_privilege then refused:=true;end;if not refused then raise exception '060 crossed choir room';end if;

  result:=public.chat_media_upload_060('reserve',sender_user,null,choir,retry0,meta,'genova-private');lease:=(result->>'lease')::uuid;version0:=(result->>'fileVersionId')::uuid;
  result:=public.chat_media_upload_060('commit',sender_user,null,choir,retry0,meta,'genova-private',lease,repeat('a',64));
  if result->>'state'<>'part-ready' or exists(select 1 from public.chat_messages where id=batch) then raise exception '060 exposed incomplete batch';end if;
  meta:=jsonb_set(jsonb_set(jsonb_set(meta,'{position}','1'),'{fileName}',to_jsonb('second.jpg'::text)),'{size}','6');
  result:=public.chat_media_upload_060('reserve',sender_user,null,choir,retry1,meta,'genova-private');lease:=(result->>'lease')::uuid;version1:=(result->>'fileVersionId')::uuid;
  result:=public.chat_media_upload_060('commit',sender_user,null,choir,retry1,meta,'genova-private',lease,repeat('b',64));
  if result->>'state'<>'committed' or (result->'message'->>'id')::uuid<>batch
    or (select metadata_json->'private_media_version_ids' from public.chat_messages where id=batch)
      <>jsonb_build_array(version0::text,version1::text) then raise exception '060 ordered batch commit failed: %',result;end if;
  if not public.can_read_chat_media_060(sender_user,choir,version0) or not public.can_read_chat_media_060(peer_user,choir,version1)
    or public.can_read_chat_media_060(outsider_user,choir,version0) then raise exception '060 room read matrix failed';end if;
  if public.chat_media_upload_060('reserve',sender_user,null,choir,retry1,meta,'genova-private')->>'state'<>'committed' then raise exception '060 committed replay failed';end if;

  execute 'reset role';perform set_config('request.jwt.claims',json_build_object('sub',sender_user,'role','authenticated')::text,true);execute 'set local role authenticated';
  refused:=false;begin perform public.delete_chat_message_for_everyone(batch);exception when feature_not_supported then refused:=true;end;if not refused then raise exception '060 direct private delete accepted';end if;
  refused:=false;begin insert into public.chat_messages(choir_id,room_id,sender_id,content,message_type,metadata_json)
    values(choir,room,sender,'','image',jsonb_build_object('private_media_version_ids',jsonb_build_array(version0::text)));
  exception when insufficient_privilege then refused:=true;end;if not refused then raise exception '060 client forged private identity';end if;
  execute 'reset role';execute 'set local role service_role';
  result:=public.chat_media_message_delete_060('reserve',sender_user,null,choir,delete_retry,batch,null);delete_lease:=(result->>'lease')::uuid;
  if result->>'state'<>'deleting' or not(select is_deleted from public.chat_messages where id=batch)
    or public.can_read_chat_media_060(peer_user,choir,version0) then raise exception '060 DB-first message delete failed';end if;
  result:=public.chat_media_message_delete_060('finalize',sender_user,null,choir,delete_retry,batch,delete_lease);
  if result->>'state'<>'deleted' then raise exception '060 message delete finalize failed';end if;

  meta:=jsonb_build_object('kind','room-avatar','batchId',avatar1,'roomId',room,'replyToId',null,
    'expectedCount',1,'position',0,'fileName','avatar.png','mimeType','image/png','size',8);
  refused:=false;begin perform public.chat_media_upload_060('reserve',peer_user,null,choir,gen_random_uuid(),meta,'genova-private');
  exception when insufficient_privilege then refused:=true;end;if not refused then raise exception '060 nonadmin avatar accepted';end if;
  result:=public.chat_media_upload_060('reserve',sender_user,null,choir,retry_avatar1,meta,'genova-private');lease:=(result->>'lease')::uuid;
  result:=public.chat_media_upload_060('commit',sender_user,null,choir,retry_avatar1,meta,'genova-private',lease,repeat('c',64));old_avatar:=(result->>'fileVersionId')::uuid;
  if result->>'state'<>'committed' or (select avatar_media_version_id from public.chat_rooms where id=room)<>old_avatar
    or not public.can_read_chat_media_060(peer_user,choir,old_avatar) then raise exception '060 avatar commit failed';end if;
  meta:=jsonb_set(meta,'{batchId}',to_jsonb(avatar2));
  result:=public.chat_media_upload_060('reserve',sender_user,null,choir,retry_avatar2,meta,'genova-private');lease:=(result->>'lease')::uuid;
  result:=public.chat_media_upload_060('commit',sender_user,null,choir,retry_avatar2,meta,'genova-private',lease,repeat('d',64));
  if result->'priorAvatar'->>'state'<>'deleting' or public.can_read_chat_media_060(peer_user,choir,old_avatar) then raise exception '060 old avatar stayed readable';end if;
  result:=public.chat_media_upload_060('finalize-avatar',sender_user,null,choir,retry_avatar2,meta,'genova-private',lease,null);
  if result->>'avatarCleanupState'<>'deleted' then raise exception '060 avatar cleanup finalize failed';end if;
  execute 'reset role';
end;
$test$;
rollback;
