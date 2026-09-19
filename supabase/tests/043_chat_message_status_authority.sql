-- LOCAL ISOLATED DATABASE ONLY. Synthetic fixtures are transaction-local and rolled back.

begin;

do $test$
declare
  choir_a uuid := gen_random_uuid(); choir_b uuid := gen_random_uuid();
  user_sender uuid := gen_random_uuid(); user_reader uuid := gen_random_uuid();
  user_peer uuid := gen_random_uuid(); user_other uuid := gen_random_uuid();
  user_nonmember uuid := gen_random_uuid(); user_cross uuid := gen_random_uuid();
  member_sender uuid := gen_random_uuid(); member_reader uuid := gen_random_uuid();
  member_peer uuid := gen_random_uuid(); member_other uuid := gen_random_uuid();
  member_nonmember uuid := gen_random_uuid(); member_cross uuid := gen_random_uuid();
  room_a uuid := gen_random_uuid(); room_other uuid := gen_random_uuid(); room_cross uuid := gen_random_uuid();
  message_a uuid := gen_random_uuid(); message_peer uuid := gen_random_uuid();
  message_other uuid := gen_random_uuid(); message_cross uuid := gen_random_uuid();
  first_status public.chat_message_status; repeated_status public.chat_message_status;
  read_status public.chat_message_status; final_status public.chat_message_status;
  late_status public.chat_message_status;
  refused boolean; affected integer;
begin
  if (select count(*) from pg_policies where schemaname='public'
      and tablename='chat_message_status' and policyname <> 'tenant_isolation_003') <> 1
    or not exists (select 1 from pg_policies where schemaname='public'
      and tablename='chat_message_status' and policyname='Members view authorized message status'
      and roles=array['authenticated'::name] and cmd='SELECT') then
    raise exception '043: repaired status policy set is wrong';
  end if;
  if to_regprocedure('public.mark_chat_message_status(uuid,text)') is null
    or not has_function_privilege('authenticated', 'public.mark_chat_message_status(uuid,text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.mark_chat_message_status(uuid,text)', 'EXECUTE') then
    raise exception '043: RPC privilege boundary is wrong';
  end if;

  insert into auth.users (id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at) values
    (user_sender,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','043-s-'||user_sender||'@example.invalid','',now(),now(),now()),
    (user_reader,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','043-r-'||user_reader||'@example.invalid','',now(),now(),now()),
    (user_peer,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','043-p-'||user_peer||'@example.invalid','',now(),now(),now()),
    (user_other,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','043-o-'||user_other||'@example.invalid','',now(),now(),now()),
    (user_nonmember,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','043-n-'||user_nonmember||'@example.invalid','',now(),now(),now()),
    (user_cross,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','043-c-'||user_cross||'@example.invalid','',now(),now(),now());
  insert into public.choirs(id,slug,name) values
    (choir_a,'043-a-'||choir_a,'043 A'),(choir_b,'043-b-'||choir_b,'043 B');
  insert into public.choir_members(id,auth_user_id,choir_id,first_name,last_name,voice_group,join_date) values
    (member_sender,user_sender,choir_a,'043','Sender','Soprano',current_date),
    (member_reader,user_reader,choir_a,'043','Reader','Alto',current_date),
    (member_peer,user_peer,choir_a,'043','Peer','Tenor',current_date),
    (member_other,user_other,choir_a,'043','Other','Bass',current_date),
    (member_nonmember,user_nonmember,choir_a,'043','Nonmember','Bass',current_date),
    (member_cross,user_cross,choir_b,'043','Cross','Bass',current_date);
  insert into public.chat_rooms(id,choir_id,name,slug,type,created_by) values
    (room_a,choir_a,'043 Room A','043-a-'||room_a,'custom',member_sender),
    (room_other,choir_a,'043 Other','043-o-'||room_other,'custom',member_other),
    (room_cross,choir_b,'043 Cross','043-c-'||room_cross,'custom',member_cross);
  insert into public.chat_room_members(choir_id,room_id,member_id,role) values
    (choir_a,room_a,member_sender,'admin'),(choir_a,room_a,member_reader,'member'),
    (choir_a,room_a,member_peer,'member'),(choir_a,room_other,member_other,'admin'),
    (choir_b,room_cross,member_cross,'admin');
  insert into public.chat_messages(id,choir_id,room_id,sender_id,content,message_type) values
    (message_a,choir_a,room_a,member_sender,'043 message','text'),
    (message_peer,choir_a,room_a,member_peer,'043 peer','text'),
    (message_other,choir_a,room_other,member_other,'043 other','text'),
    (message_cross,choir_b,room_cross,member_cross,'043 cross','text');
  insert into public.chat_message_status(choir_id,message_id,member_id,delivered_at) values
    (choir_a,message_a,member_peer,clock_timestamp()),
    (choir_a,message_other,member_other,clock_timestamp()),
    (choir_b,message_cross,member_cross,clock_timestamp());

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',json_build_object('sub',user_reader,'role','authenticated','session_id',gen_random_uuid())::text,true);
  if (select count(*) from public.chat_message_status) <> 0 then
    raise exception '043: reader saw another member status before owning a row';
  end if;

  first_status := public.mark_chat_message_status(message_a,'delivered');
  if first_status.member_id <> member_reader or first_status.choir_id <> choir_a
    or first_status.delivered_at is null or first_status.read_at is not null then
    raise exception '043: delivered RPC stored wrong row';
  end if;
  repeated_status := public.mark_chat_message_status(message_a,'delivered');
  if repeated_status.delivered_at is distinct from first_status.delivered_at
    or repeated_status.read_at is not null then
    raise exception '043: repeated delivered call was not idempotent';
  end if;
  read_status := public.mark_chat_message_status(message_a,'read');
  if read_status.delivered_at is distinct from first_status.delivered_at
    or read_status.read_at is null or read_status.read_at < read_status.delivered_at then
    raise exception '043: read transition was not monotonic';
  end if;
  final_status := public.mark_chat_message_status(message_a,'read');
  if final_status.delivered_at is distinct from read_status.delivered_at
    or final_status.read_at is distinct from read_status.read_at then
    raise exception '043: repeated read call was not idempotent';
  end if;
  late_status := public.mark_chat_message_status(message_a,'delivered');
  if late_status.delivered_at is distinct from read_status.delivered_at
    or late_status.read_at is distinct from read_status.read_at then
    raise exception '043: late delivered call regressed read state';
  end if;
  if (select count(*) from public.chat_message_status) <> 1 then
    raise exception '043: reader did not see exactly own status';
  end if;

  refused := false;
  begin perform public.mark_chat_message_status(message_a,'invalid');
  exception when invalid_parameter_value then refused := true; end;
  if not refused then raise exception '043: invalid status was accepted'; end if;
  refused := false;
  begin perform public.mark_chat_message_status(message_other,'read');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception '043: inaccessible same-choir message was accepted'; end if;
  refused := false;
  begin perform public.mark_chat_message_status(message_cross,'read');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception '043: cross-choir message was accepted'; end if;

  refused := false;
  begin insert into public.chat_message_status(choir_id,message_id,member_id,delivered_at)
    values(choir_a,message_peer,member_reader,clock_timestamp());
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception '043: direct status insert was accepted'; end if;
  update public.chat_message_status set read_at=null where message_id=message_a and member_id=member_reader;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '043: direct status update was accepted'; end if;

  perform set_config('request.jwt.claims',json_build_object('sub',user_sender,'role','authenticated','session_id',gen_random_uuid())::text,true);
  if (select count(*) from public.chat_message_status where message_id=message_a) <> 2 then
    raise exception '043: sender could not read all message statuses';
  end if;
  perform set_config('request.jwt.claims',json_build_object('sub',user_nonmember,'role','authenticated','session_id',gen_random_uuid())::text,true);
  if (select count(*) from public.chat_message_status) <> 0 then raise exception '043: nonmember read statuses'; end if;
  refused := false;
  begin perform public.mark_chat_message_status(message_a,'read');
  exception when insufficient_privilege then refused := true; end;
  if not refused then raise exception '043: nonmember RPC was accepted'; end if;
end
$test$;

rollback;
