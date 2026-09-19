-- LOCAL ISOLATED DATABASE ONLY. Synthetic fixtures are transaction-local and rolled back.
begin;

do $test$
declare
  choir_a uuid := gen_random_uuid(); choir_b uuid := gen_random_uuid();
  user_sender uuid := gen_random_uuid(); user_peer uuid := gen_random_uuid();
  user_nonmember uuid := gen_random_uuid(); user_cross uuid := gen_random_uuid();
  member_sender uuid := gen_random_uuid(); member_peer uuid := gen_random_uuid();
  member_nonmember uuid := gen_random_uuid(); member_cross uuid := gen_random_uuid();
  room_a uuid := gen_random_uuid(); room_other uuid := gen_random_uuid(); room_cross uuid := gen_random_uuid();
  reply_a uuid := gen_random_uuid(); reply_other uuid := gen_random_uuid();
  key_a uuid := gen_random_uuid(); key_peer uuid := gen_random_uuid(); key_revoked uuid := gen_random_uuid();
  first_message public.chat_messages; repeated_message public.chat_messages; peer_message public.chat_messages;
  refused boolean;
begin
  if not exists (
      select 1 from pg_class
      where oid = 'public.chat_message_send_keys'::regclass and relrowsecurity
    )
    or has_table_privilege('authenticated', 'public.chat_message_send_keys', 'SELECT,INSERT,UPDATE,DELETE')
    or not has_function_privilege(
      'authenticated', 'public.send_chat_text_message(uuid,uuid,text,uuid,jsonb)', 'EXECUTE'
    )
    or has_function_privilege(
      'anon', 'public.send_chat_text_message(uuid,uuid,text,uuid,jsonb)', 'EXECUTE'
    ) then
    raise exception '045: table/RPC privilege boundary is wrong';
  end if;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values
    (user_sender,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','045-s-'||user_sender||'@example.invalid','',now(),now(),now()),
    (user_peer,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','045-p-'||user_peer||'@example.invalid','',now(),now(),now()),
    (user_nonmember,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','045-n-'||user_nonmember||'@example.invalid','',now(),now(),now()),
    (user_cross,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','045-c-'||user_cross||'@example.invalid','',now(),now(),now());
  insert into public.choirs(id,slug,name) values
    (choir_a,'045-a-'||choir_a,'045 A'),(choir_b,'045-b-'||choir_b,'045 B');
  insert into public.choir_members(
    id,auth_user_id,choir_id,first_name,last_name,voice_group,join_date
  ) values
    (member_sender,user_sender,choir_a,'045','Sender','Soprano',current_date),
    (member_peer,user_peer,choir_a,'045','Peer','Alto',current_date),
    (member_nonmember,user_nonmember,choir_a,'045','Nonmember','Tenor',current_date),
    (member_cross,user_cross,choir_b,'045','Cross','Bass',current_date);
  insert into public.chat_rooms(id,choir_id,name,slug,type,created_by) values
    (room_a,choir_a,'045 A','045-a-'||room_a,'custom',member_sender),
    (room_other,choir_a,'045 Other','045-o-'||room_other,'custom',member_peer),
    (room_cross,choir_b,'045 Cross','045-c-'||room_cross,'custom',member_cross);
  insert into public.chat_room_members(choir_id,room_id,member_id,role) values
    (choir_a,room_a,member_sender,'admin'),
    (choir_a,room_a,member_peer,'member'),
    (choir_a,room_other,member_peer,'admin'),
    (choir_b,room_cross,member_cross,'admin');
  insert into public.chat_messages(id,choir_id,room_id,sender_id,content,message_type) values
    (reply_a,choir_a,room_a,member_peer,'reply A','text'),
    (reply_other,choir_a,room_other,member_peer,'reply other','text');

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object(
    'sub',user_sender,'role','authenticated','session_id',gen_random_uuid()
  )::text, true);

  first_message := public.send_chat_text_message(
    room_a, key_a, 'hello once', reply_a,
    jsonb_build_object('link_preview', jsonb_build_object(
      'url','https://example.invalid/a','domain','example.invalid'
    ))
  );
  repeated_message := public.send_chat_text_message(
    room_a, key_a, 'hello once', reply_a,
    jsonb_build_object('link_preview', jsonb_build_object(
      'domain','example.invalid','url','https://example.invalid/a'
    ))
  );
  if repeated_message.id is distinct from first_message.id
    or repeated_message.client_mutation_id is distinct from key_a
    or (select count(*) from public.chat_messages where sender_id=member_sender and content='hello once') <> 1 then
    raise exception '045: retry did not acknowledge one message';
  end if;

  refused := false; begin
    perform public.send_chat_text_message(room_a,key_a,'changed',reply_a,'{}');
  exception when invalid_parameter_value then refused := true; end;
  if not refused then raise exception '045: changed content reused a key'; end if;
  refused := false; begin
    perform public.send_chat_text_message(room_a,key_a,'hello once',null,'{}');
  exception when invalid_parameter_value then refused := true; end;
  if not refused then raise exception '045: changed reply/metadata reused a key'; end if;
  refused := false; begin
    perform public.send_chat_text_message(room_other,key_a,'hello once',null,'{}');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception '045: inaccessible room key reuse was accepted'; end if;
  refused := false; begin
    perform public.send_chat_text_message(room_a,gen_random_uuid(),'bad metadata',null,'{"_status":"pending"}');
  exception when invalid_parameter_value then refused := true; end;
  if not refused then raise exception '045: client-only metadata was accepted'; end if;
  refused := false; begin
    perform public.send_chat_text_message(room_a,gen_random_uuid(),'cross reply',reply_other,'{}');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception '045: cross-room reply was accepted'; end if;

  perform public.edit_chat_message(first_message.id, 'edited after acknowledgement');
  repeated_message := public.send_chat_text_message(
    room_a, key_a, 'hello once', reply_a,
    jsonb_build_object('link_preview', jsonb_build_object(
      'url','https://example.invalid/a','domain','example.invalid'
    ))
  );
  if repeated_message.id <> first_message.id
    or repeated_message.content <> 'edited after acknowledgement'
    or not repeated_message.is_edited then
    raise exception '045: immutable request fingerprint did not survive message edit';
  end if;

  perform set_config('request.jwt.claims', json_build_object(
    'sub',user_peer,'role','authenticated','session_id',gen_random_uuid()
  )::text, true);
  peer_message := public.send_chat_text_message(room_a,key_a,'peer same key',null,'{}');
  if peer_message.sender_id <> member_peer or peer_message.id = first_message.id then
    raise exception '045: sender-scoped key collided across members';
  end if;

  perform set_config('request.jwt.claims', json_build_object(
    'sub',user_nonmember,'role','authenticated','session_id',gen_random_uuid()
  )::text, true);
  refused := false; begin
    perform public.send_chat_text_message(room_a,gen_random_uuid(),'nonmember',null,'{}');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception '045: nonmember send was accepted'; end if;

  perform set_config('request.jwt.claims', json_build_object(
    'sub',user_cross,'role','authenticated','session_id',gen_random_uuid()
  )::text, true);
  refused := false; begin
    perform public.send_chat_text_message(room_a,gen_random_uuid(),'cross choir',null,'{}');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception '045: cross-choir send was accepted'; end if;

  execute 'reset role';
  delete from public.chat_room_members where room_id=room_a and member_id=member_sender;
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object(
    'sub',user_sender,'role','authenticated','session_id',gen_random_uuid()
  )::text, true);
  refused := false; begin
    perform public.send_chat_text_message(room_a,key_a,'hello once',reply_a,
      jsonb_build_object('link_preview',jsonb_build_object('url','https://example.invalid/a','domain','example.invalid')));
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception '045: revoked room member received an acknowledgement'; end if;
  execute 'reset role';
  if (select count(*) from public.chat_message_send_keys
      where sender_id=member_sender and client_mutation_id=key_a) <> 1 then
    raise exception '045: sender key mapping was not singular';
  end if;
end
$test$;

rollback;
