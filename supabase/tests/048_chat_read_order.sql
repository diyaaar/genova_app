-- LOCAL ISOLATED DATABASE ONLY. Proves index shape and equal-time cursor behavior.

begin;

do $test$
declare
  choir_id uuid := '10000000-0000-4000-8000-000000000048';
  user_id uuid := '20000000-0000-4000-8000-000000000048';
  v_member_id uuid := '30000000-0000-4000-8000-000000000048';
  v_room_id uuid := '40000000-0000-4000-8000-000000000048';
  other_room_id uuid := '40000000-0000-4000-8000-000000000049';
  same_time timestamptz := '2026-09-20 09:00:00+00';
  ordered_ids uuid[];
  read_at timestamptz;
  refused boolean := false;
begin
  if to_regnamespace('genova_048') is null then
    raise exception '048: applied marker schema is missing';
  end if;
  if pg_get_indexdef('public.idx_chat_messages_room_created_id_048'::regclass)
      not like '%(room_id, created_at DESC, id DESC)%' then
    raise exception '048: index does not match the accepted stable cursor order';
  end if;
  if not has_function_privilege('authenticated','public.mark_chat_room_read(uuid)','EXECUTE')
    or has_function_privilege('anon','public.mark_chat_room_read(uuid)','EXECUTE') then
    raise exception '048: room-read RPC privilege boundary is wrong';
  end if;

  insert into auth.users (
    id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at
  ) values (
    user_id,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
    '048-'||user_id||'@example.invalid','',now(),now(),now()
  );
  insert into public.choirs(id,slug,name) values (choir_id,'048-'||choir_id,'048 Choir');
  insert into public.choir_members(
    id,auth_user_id,choir_id,first_name,last_name,voice_group,join_date,is_active
  ) values (v_member_id,user_id,choir_id,'048','Member','Alto',current_date,true);
  insert into public.chat_rooms(id,choir_id,name,slug,type,created_by)
    values
      (v_room_id,choir_id,'048 Room','048-'||v_room_id,'custom',v_member_id),
      (other_room_id,choir_id,'048 Other','048-'||other_room_id,'custom',v_member_id);
  insert into public.chat_room_members(choir_id,room_id,member_id,role)
    values (choir_id,v_room_id,v_member_id,'admin');
  insert into public.chat_messages(
    id,choir_id,room_id,sender_id,content,message_type,created_at,updated_at
  ) values
    ('50000000-0000-4000-8000-000000000001',choir_id,v_room_id,v_member_id,'one','text',same_time,same_time),
    ('50000000-0000-4000-8000-000000000002',choir_id,v_room_id,v_member_id,'two','text',same_time,same_time),
    ('50000000-0000-4000-8000-000000000003',choir_id,v_room_id,v_member_id,'three','text',same_time,same_time),
    ('50000000-0000-4000-8000-000000000004',choir_id,v_room_id,v_member_id,'newer','text',same_time + interval '1 second',same_time + interval '1 second');

  select array_agg(id order by created_at desc,id desc) into ordered_ids
  from public.chat_messages where room_id=v_room_id;
  if ordered_ids <> array[
    '50000000-0000-4000-8000-000000000004'::uuid,
    '50000000-0000-4000-8000-000000000003'::uuid,
    '50000000-0000-4000-8000-000000000002'::uuid,
    '50000000-0000-4000-8000-000000000001'::uuid
  ] then
    raise exception '048: initial stable order is wrong';
  end if;

  select array_agg(id order by created_at desc,id desc) into ordered_ids
  from public.chat_messages
  where room_id=v_room_id
    and (created_at < same_time or (created_at=same_time and id < '50000000-0000-4000-8000-000000000003'));
  if ordered_ids <> array[
    '50000000-0000-4000-8000-000000000002'::uuid,
    '50000000-0000-4000-8000-000000000001'::uuid
  ] then
    raise exception '048: equal-time cursor skipped or duplicated a row';
  end if;

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims',json_build_object(
    'sub',user_id,'role','authenticated','session_id',gen_random_uuid()
  )::text,true);
  read_at := public.mark_chat_room_read(v_room_id);
  if read_at is null or not exists (
    select 1 from public.chat_room_members
    where room_id=v_room_id and member_id=v_member_id and last_read_at=read_at
  ) then
    raise exception '048: authorized room read did not store the server timestamp';
  end if;
  begin
    perform public.mark_chat_room_read(other_room_id);
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '048: nonmember room read was accepted'; end if;
end
$test$;

rollback;
