-- LOCAL ISOLATED DATABASE ONLY. Synthetic fixtures are transaction-local and rolled back.
begin;
do $test$
declare
  choir_a uuid:=gen_random_uuid(); choir_b uuid:=gen_random_uuid();
  user_sender uuid:=gen_random_uuid(); user_peer uuid:=gen_random_uuid();
  user_other uuid:=gen_random_uuid(); user_nonmember uuid:=gen_random_uuid(); user_cross uuid:=gen_random_uuid();
  member_sender uuid:=gen_random_uuid(); member_peer uuid:=gen_random_uuid();
  member_other uuid:=gen_random_uuid(); member_nonmember uuid:=gen_random_uuid(); member_cross uuid:=gen_random_uuid();
  room_a uuid:=gen_random_uuid(); room_other uuid:=gen_random_uuid(); room_cross uuid:=gen_random_uuid();
  msg_edit uuid:=gen_random_uuid(); msg_delete uuid:=gen_random_uuid(); msg_expired uuid:=gen_random_uuid();
  msg_image uuid:=gen_random_uuid(); msg_peer uuid:=gen_random_uuid(); msg_other uuid:=gen_random_uuid(); msg_cross uuid:=gen_random_uuid();
  sent_id uuid:=gen_random_uuid(); reply_id uuid:=gen_random_uuid(); hidden_first uuid; hidden_repeat uuid;
  affected integer; refused boolean; stored public.chat_messages;
begin
  if (select count(*) from pg_policies where schemaname='public' and tablename='chat_messages' and policyname<>'tenant_isolation_003')<>2
    or exists(select 1 from pg_policies where schemaname='public' and tablename='chat_messages' and cmd='UPDATE') then
    raise exception '044: message policy set still exposes direct update';
  end if;
  if not exists(select 1 from pg_class where oid='public.chat_message_hidden_members'::regclass and relrowsecurity)
    or not has_table_privilege('authenticated','public.chat_message_hidden_members','SELECT')
    or has_table_privilege('authenticated','public.chat_message_hidden_members','INSERT,UPDATE,DELETE') then
    raise exception '044: hidden-message table privilege/RLS boundary is wrong';
  end if;
  if not has_function_privilege('authenticated','public.edit_chat_message(uuid,text)','EXECUTE')
    or has_function_privilege('anon','public.edit_chat_message(uuid,text)','EXECUTE')
    or not has_function_privilege('authenticated','public.delete_chat_message_for_everyone(uuid)','EXECUTE')
    or not has_function_privilege('authenticated','public.hide_chat_message_for_self(uuid)','EXECUTE') then
    raise exception '044: RPC privileges are wrong';
  end if;

  insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
    (user_sender,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','044-s-'||user_sender||'@example.invalid','',now(),now(),now()),
    (user_peer,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','044-p-'||user_peer||'@example.invalid','',now(),now(),now()),
    (user_other,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','044-o-'||user_other||'@example.invalid','',now(),now(),now()),
    (user_nonmember,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','044-n-'||user_nonmember||'@example.invalid','',now(),now(),now()),
    (user_cross,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','044-c-'||user_cross||'@example.invalid','',now(),now(),now());
  insert into public.choirs(id,slug,name) values (choir_a,'044-a-'||choir_a,'044 A'),(choir_b,'044-b-'||choir_b,'044 B');
  insert into public.choir_members(id,auth_user_id,choir_id,first_name,last_name,voice_group,join_date) values
    (member_sender,user_sender,choir_a,'044','Sender','Soprano',current_date),(member_peer,user_peer,choir_a,'044','Peer','Alto',current_date),
    (member_other,user_other,choir_a,'044','Other','Tenor',current_date),(member_nonmember,user_nonmember,choir_a,'044','Nonmember','Bass',current_date),
    (member_cross,user_cross,choir_b,'044','Cross','Bass',current_date);
  insert into public.chat_rooms(id,choir_id,name,slug,type,created_by) values
    (room_a,choir_a,'044 A','044-a-'||room_a,'custom',member_sender),(room_other,choir_a,'044 O','044-o-'||room_other,'custom',member_other),
    (room_cross,choir_b,'044 C','044-c-'||room_cross,'custom',member_cross);
  insert into public.chat_room_members(choir_id,room_id,member_id,role) values
    (choir_a,room_a,member_sender,'admin'),(choir_a,room_a,member_peer,'member'),(choir_a,room_other,member_other,'admin'),(choir_b,room_cross,member_cross,'admin');
  insert into public.chat_messages(id,choir_id,room_id,sender_id,content,message_type,metadata_json,created_at,updated_at,is_deleted) values
    (msg_edit,choir_a,room_a,member_sender,'edit me','text','{"keep":"yes"}',clock_timestamp()-interval '59 minutes 58 seconds',clock_timestamp()-interval '59 minutes 58 seconds',false),
    (msg_delete,choir_a,room_a,member_sender,'delete me','text','{"remove":"yes"}',clock_timestamp()-interval '59 minutes 58 seconds',clock_timestamp()-interval '59 minutes 58 seconds',false),
    (msg_expired,choir_a,room_a,member_sender,'expired','text','{}',clock_timestamp()-interval '60 minutes 10 seconds',clock_timestamp()-interval '60 minutes 10 seconds',false),
    (msg_image,choir_a,room_a,member_sender,null,'image','{"url":"https://example.invalid/a"}',clock_timestamp(),clock_timestamp(),false),
    (msg_peer,choir_a,room_a,member_peer,'peer','text','{}',clock_timestamp(),clock_timestamp(),false),
    (msg_other,choir_a,room_other,member_other,'other','text','{}',clock_timestamp(),clock_timestamp(),false),
    (msg_cross,choir_b,room_cross,member_cross,'cross','text','{}',clock_timestamp(),clock_timestamp(),false);

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',json_build_object('sub',user_sender,'role','authenticated','session_id',gen_random_uuid())::text,true);

  perform public.edit_chat_message(msg_edit,'edited safely');
  select * into stored from public.chat_messages where id=msg_edit;
  if stored.content<>'edited safely' or not stored.is_edited or stored.metadata_json->>'keep'<>'yes'
    or stored.room_id<>room_a or stored.sender_id<>member_sender or stored.message_type<>'text' then
    raise exception '044: edit changed forbidden fields or missed content';
  end if;
  refused:=false; begin perform public.edit_chat_message(msg_expired,'late'); exception when invalid_parameter_value then refused:=true; end;
  if not refused then raise exception '044: expired edit accepted'; end if;
  refused:=false; begin perform public.edit_chat_message(msg_image,'not text'); exception when invalid_parameter_value then refused:=true; end;
  if not refused then raise exception '044: non-text edit accepted'; end if;
  refused:=false; begin perform public.edit_chat_message(msg_peer,'not owner'); exception when insufficient_privilege then refused:=true; end;
  if not refused then raise exception '044: other-sender edit accepted'; end if;
  refused:=false; begin perform public.edit_chat_message(msg_edit,'   '); exception when invalid_parameter_value then refused:=true; end;
  if not refused then raise exception '044: blank edit accepted'; end if;

  update public.chat_messages set room_id=room_other,sender_id=member_other,message_type='system',created_at=clock_timestamp() where id=msg_edit;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception '044: direct identity/type/time update accepted'; end if;

  perform public.delete_chat_message_for_everyone(msg_delete);
  select * into stored from public.chat_messages where id=msg_delete;
  if not stored.is_deleted or stored.content is not null or stored.metadata_json<>'{}'::jsonb
    or stored.room_id<>room_a or stored.sender_id<>member_sender then
    raise exception '044: delete-everyone stored wrong shape';
  end if;
  perform public.delete_chat_message_for_everyone(msg_delete);
  refused:=false; begin perform public.edit_chat_message(msg_delete,'revive'); exception when invalid_parameter_value then refused:=true; end;
  if not refused then raise exception '044: deleted message edit accepted'; end if;
  refused:=false; begin perform public.delete_chat_message_for_everyone(msg_expired); exception when invalid_parameter_value then refused:=true; end;
  if not refused then raise exception '044: expired delete accepted'; end if;
  refused:=false; begin perform public.delete_chat_message_for_everyone(msg_peer); exception when insufficient_privilege then refused:=true; end;
  if not refused then raise exception '044: other-sender delete accepted'; end if;

  insert into public.chat_messages(id,choir_id,room_id,sender_id,content,message_type,reply_to_id,created_at,updated_at,is_edited,is_deleted)
  values(sent_id,choir_a,room_a,member_sender,'new','text',msg_peer,'2000-01-01','2000-01-01',true,true);
  select * into stored from public.chat_messages where id=sent_id;
  if stored.created_at<'2026-01-01'::timestamptz or stored.updated_at is distinct from stored.created_at or stored.is_edited or stored.is_deleted then
    raise exception '044: authenticated insert kept client-owned server fields';
  end if;
  insert into public.chat_messages(id,choir_id,room_id,sender_id,content,message_type,reply_to_id)
  values(reply_id,choir_a,room_a,member_sender,'reply','text',sent_id);
  refused:=false; begin
    insert into public.chat_messages(choir_id,room_id,sender_id,content,message_type,reply_to_id)
    values(choir_a,room_a,member_sender,'cross reply','text',msg_other);
  exception when insufficient_privilege then refused:=true; end;
  if not refused then raise exception '044: cross-room reply accepted'; end if;
  refused:=false; begin
    insert into public.chat_messages(choir_id,room_id,sender_id,content,message_type)
    values(choir_a,room_a,member_peer,'foreign sender','text');
  exception when insufficient_privilege then refused:=true; end;
  if not refused then raise exception '044: foreign sender insert accepted'; end if;
  refused:=false; begin
    insert into public.chat_messages(choir_id,room_id,sender_id,content,message_type)
    values(choir_a,room_a,member_sender,'forged system','system');
  exception when insufficient_privilege then refused:=true; end;
  if not refused then raise exception '044: client-authored system message accepted'; end if;

  hidden_first:=public.hide_chat_message_for_self(msg_peer);
  hidden_repeat:=public.hide_chat_message_for_self(msg_peer);
  if hidden_first is distinct from hidden_repeat or exists(select 1 from public.chat_messages where id=msg_peer)
    or (select count(*) from public.chat_message_hidden_members where message_id=msg_peer)<>1 then
    raise exception '044: self hide was not isolated/idempotent';
  end if;

  perform set_config('request.jwt.claims',json_build_object('sub',user_peer,'role','authenticated','session_id',gen_random_uuid())::text,true);
  if not exists(select 1 from public.chat_messages where id=msg_peer)
    or exists(select 1 from public.chat_message_hidden_members where message_id=msg_peer) then
    raise exception '044: another member inherited hidden state';
  end if;

  perform set_config('request.jwt.claims',json_build_object('sub',user_nonmember,'role','authenticated','session_id',gen_random_uuid())::text,true);
  if exists(select 1 from public.chat_messages where room_id=room_a) then raise exception '044: nonmember read room messages'; end if;
  refused:=false; begin perform public.hide_chat_message_for_self(msg_peer); exception when insufficient_privilege then refused:=true; end;
  if not refused then raise exception '044: nonmember hide accepted'; end if;
  refused:=false; begin
    insert into public.chat_messages(choir_id,room_id,sender_id,content,message_type) values(choir_a,room_a,member_nonmember,'bad','text');
  exception when insufficient_privilege then refused:=true; end;
  if not refused then raise exception '044: nonmember send accepted'; end if;

  perform set_config('request.jwt.claims',json_build_object('sub',user_cross,'role','authenticated','session_id',gen_random_uuid())::text,true);
  if exists(select 1 from public.chat_messages where choir_id=choir_a) then raise exception '044: cross-choir read leaked'; end if;
end
$test$;
rollback;
