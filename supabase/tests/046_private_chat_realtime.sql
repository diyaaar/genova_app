-- LOCAL ISOLATED DATABASE ONLY. The runner supplies a minimal Realtime contract fixture.

begin;

do $test$
declare
  choir_a uuid := gen_random_uuid(); choir_b uuid := gen_random_uuid();
  user_member uuid := gen_random_uuid(); user_peer uuid := gen_random_uuid();
  user_nonmember uuid := gen_random_uuid(); user_cross uuid := gen_random_uuid();
  user_revoked uuid := gen_random_uuid();
  member_member uuid := gen_random_uuid(); member_peer uuid := gen_random_uuid();
  member_nonmember uuid := gen_random_uuid(); member_cross uuid := gen_random_uuid();
  member_revoked uuid := gen_random_uuid();
  room_a uuid := gen_random_uuid(); room_other uuid := gen_random_uuid(); room_cross uuid := gen_random_uuid();
  refused boolean;
begin
  if (select count(*) from pg_policies where schemaname='realtime' and tablename='messages'
      and policyname like '046 %') <> 2 then
    raise exception '046: expected two Realtime policies';
  end if;
  if not has_function_privilege('authenticated','genova_046.can_access_chat_room_topic(text)','EXECUTE')
    or has_function_privilege('anon','genova_046.can_access_chat_room_topic(text)','EXECUTE') then
    raise exception '046: helper privilege boundary is wrong';
  end if;
  if (select count(*) from pg_publication_tables where pubname='supabase_realtime'
      and schemaname='public' and tablename in ('chat_messages','chat_reactions','chat_message_status')) <> 3 then
    raise exception '046: publication membership is incomplete';
  end if;
  if (select count(*) from genova_046.prior_publication_tables) <> 1
    or not exists (select 1 from genova_046.prior_publication_tables where tablename='chat_messages') then
    raise exception '046: prior publication state was not retained';
  end if;

  insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
    (user_member,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','046-m-'||user_member||'@example.invalid','',now(),now(),now()),
    (user_peer,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','046-p-'||user_peer||'@example.invalid','',now(),now(),now()),
    (user_nonmember,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','046-n-'||user_nonmember||'@example.invalid','',now(),now(),now()),
    (user_cross,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','046-c-'||user_cross||'@example.invalid','',now(),now(),now()),
    (user_revoked,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','046-r-'||user_revoked||'@example.invalid','',now(),now(),now());
  insert into public.choirs(id,slug,name) values
    (choir_a,'046-a-'||choir_a,'046 A'),(choir_b,'046-b-'||choir_b,'046 B');
  insert into public.choir_members(id,auth_user_id,choir_id,first_name,last_name,voice_group,join_date,is_active) values
    (member_member,user_member,choir_a,'046','Member','Soprano',current_date,true),
    (member_peer,user_peer,choir_a,'046','Peer','Alto',current_date,true),
    (member_nonmember,user_nonmember,choir_a,'046','Nonmember','Tenor',current_date,true),
    (member_cross,user_cross,choir_b,'046','Cross','Bass',current_date,true),
    (member_revoked,user_revoked,choir_a,'046','Revoked','Bass',current_date,true);
  insert into public.chat_rooms(id,choir_id,name,slug,type,created_by) values
    (room_a,choir_a,'046 Room A','046-a-'||room_a,'custom',member_member),
    (room_other,choir_a,'046 Other','046-o-'||room_other,'custom',member_peer),
    (room_cross,choir_b,'046 Cross','046-c-'||room_cross,'custom',member_cross);
  insert into public.chat_room_members(choir_id,room_id,member_id,role) values
    (choir_a,room_a,member_member,'admin'),(choir_a,room_a,member_revoked,'member'),
    (choir_a,room_other,member_peer,'admin'),(choir_b,room_cross,member_cross,'admin');
  delete from public.chat_room_members where room_id=room_a and member_id=member_revoked;

  insert into realtime.messages(topic,extension) values
    ('fixture','broadcast'),('fixture','presence'),('fixture','postgres_changes');

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',json_build_object('sub',user_member,'role','authenticated','session_id',gen_random_uuid())::text,true);
  perform set_config('realtime.topic','chat:'||room_a,true);
  if (select count(*) from realtime.messages) <> 2 then
    raise exception '046: room member did not receive exactly Broadcast/Presence authorization';
  end if;
  insert into realtime.messages(topic,extension) values('fixture','broadcast'),('fixture','presence');
  refused := false;
  begin insert into realtime.messages(topic,extension) values('fixture','postgres_changes');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception '046: unsupported extension insert was accepted'; end if;

  perform set_config('realtime.topic','chat:'||room_other,true);
  if (select count(*) from realtime.messages) <> 0 then raise exception '046: other room was visible'; end if;
  refused := false;
  begin insert into realtime.messages(topic,extension) values('fixture','broadcast');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception '046: other room send was accepted'; end if;

  perform set_config('realtime.topic','chat:not-a-uuid',true);
  if (select count(*) from realtime.messages) <> 0 then raise exception '046: malformed topic was visible'; end if;
  perform set_config('realtime.topic','chat:global',true);
  if (select count(*) from realtime.messages) <> 0 then raise exception '046: global topic was authorized'; end if;

  perform set_config('request.jwt.claims',json_build_object('sub',user_peer,'role','authenticated','session_id',gen_random_uuid())::text,true);
  perform set_config('realtime.topic','chat:'||room_other,true);
  if (select count(*) from realtime.messages) < 2 then raise exception '046: peer could not access own room'; end if;
  perform set_config('realtime.topic','chat:'||room_a,true);
  if (select count(*) from realtime.messages) <> 0 then raise exception '046: same-choir nonmember accessed room'; end if;

  perform set_config('request.jwt.claims',json_build_object('sub',user_nonmember,'role','authenticated','session_id',gen_random_uuid())::text,true);
  if (select count(*) from realtime.messages) <> 0 then raise exception '046: nonmember accessed room'; end if;
  perform set_config('request.jwt.claims',json_build_object('sub',user_cross,'role','authenticated','session_id',gen_random_uuid())::text,true);
  if (select count(*) from realtime.messages) <> 0 then raise exception '046: cross-choir member accessed room'; end if;
  perform set_config('request.jwt.claims',json_build_object('sub',user_revoked,'role','authenticated','session_id',gen_random_uuid())::text,true);
  if (select count(*) from realtime.messages) <> 0 then raise exception '046: revoked room member accessed room'; end if;

  execute 'set local role anon';
  perform set_config('request.jwt.claims',json_build_object('role','anon')::text,true);
  if (select count(*) from realtime.messages) <> 0 then raise exception '046: anonymous role accessed room'; end if;
end
$test$;

rollback;
