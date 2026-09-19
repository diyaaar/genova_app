-- LOCAL ISOLATED DATABASE ONLY. Synthetic fixtures are transaction-local and rolled back.

begin;

do $test$
declare
  choir_a uuid := gen_random_uuid();
  choir_b uuid := gen_random_uuid();
  user_admin uuid := gen_random_uuid();
  user_member uuid := gen_random_uuid();
  user_invitee uuid := gen_random_uuid();
  user_nonmember uuid := gen_random_uuid();
  user_cross uuid := gen_random_uuid();
  member_admin uuid := gen_random_uuid();
  member_member uuid := gen_random_uuid();
  member_invitee uuid := gen_random_uuid();
  member_nonmember uuid := gen_random_uuid();
  member_cross uuid := gen_random_uuid();
  room_a uuid := gen_random_uuid();
  room_other_a uuid := gen_random_uuid();
  room_b uuid := gen_random_uuid();
  creator_room uuid := gen_random_uuid();
  membership_admin uuid := gen_random_uuid();
  membership_member uuid := gen_random_uuid();
  refused boolean;
  refusal_state text;
  affected integer;
  stored record;
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_room_members'
      and policyname = 'Room creators or admins add members'
      and roles = array['authenticated'::name]
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_room_members'
      and policyname = 'Members update own room preferences'
      and roles = array['authenticated'::name]
  ) or not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_room_members'
      and policyname = 'Room admins update member roles'
      and roles = array['authenticated'::name]
  ) then
    raise exception '041: repaired authenticated policy set is missing';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'chat_room_members'
      and policyname in ('Add room members', 'Update own membership')
  ) then
    raise exception '041: permissive prior policies remain active';
  end if;
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.chat_room_members'::regclass
      and tgname = 'chat_room_members_guard_041'
      and not tgisinternal
  ) then
    raise exception '041: membership update guard trigger is missing';
  end if;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values
    (user_admin, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '041-admin-' || user_admin || '@example.invalid', '', now(), now(), now()),
    (user_member, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '041-member-' || user_member || '@example.invalid', '', now(), now(), now()),
    (user_invitee, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '041-invitee-' || user_invitee || '@example.invalid', '', now(), now(), now()),
    (user_nonmember, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '041-nonmember-' || user_nonmember || '@example.invalid', '', now(), now(), now()),
    (user_cross, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '041-cross-' || user_cross || '@example.invalid', '', now(), now(), now());

  insert into public.choirs (id, slug, name) values
    (choir_a, '041-a-' || choir_a, '041 Choir A'),
    (choir_b, '041-b-' || choir_b, '041 Choir B');

  insert into public.choir_members (
    id, auth_user_id, choir_id, first_name, last_name, voice_group, join_date
  ) values
    (member_admin, user_admin, choir_a, '041', 'Admin', 'Soprano', current_date),
    (member_member, user_member, choir_a, '041', 'Member', 'Alto', current_date),
    (member_invitee, user_invitee, choir_a, '041', 'Invitee', 'Tenor', current_date),
    (member_nonmember, user_nonmember, choir_a, '041', 'Nonmember', 'Bass', current_date),
    (member_cross, user_cross, choir_b, '041', 'Cross', 'Bass', current_date);

  insert into public.chat_rooms (id, choir_id, name, slug, type, created_by) values
    (room_a, choir_a, '041 Room A', '041-room-a-' || room_a, 'custom', member_admin),
    (room_other_a, choir_a, '041 Other A', '041-other-a-' || room_other_a, 'custom', member_invitee),
    (room_b, choir_b, '041 Room B', '041-room-b-' || room_b, 'custom', member_cross);

  insert into public.chat_room_members (
    id, choir_id, room_id, member_id, role
  ) values
    (membership_admin, choir_a, room_a, member_admin, 'admin'),
    (membership_member, choir_a, room_a, member_member, 'member'),
    (gen_random_uuid(), choir_a, room_other_a, member_invitee, 'admin'),
    (gen_random_uuid(), choir_b, room_b, member_cross, 'admin');

  execute 'set local role authenticated';

  -- A same-choir user cannot add themselves to an arbitrary room.
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_nonmember, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  refused := false;
  begin
    insert into public.chat_room_members (room_id, member_id, role)
    values (room_a, member_nonmember, 'member');
  exception when insufficient_privilege then
    refused := true;
  end;
  if not refused then raise exception '041: same-choir nonmember self-add was accepted'; end if;

  -- Cross-choir self-add remains refused by the outer tenant/link boundary.
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_cross, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  refused := false;
  begin
    insert into public.chat_room_members (room_id, member_id, role)
    values (room_a, member_cross, 'member');
  exception when others then
    get stacked diagnostics refusal_state = returned_sqlstate;
    if refusal_state not in ('42501', '23514') then
      raise exception '041: cross-choir refusal used unexpected SQLSTATE %', refusal_state;
    end if;
    refused := true;
  end;
  if not refused then raise exception '041: cross-choir self-add was accepted'; end if;

  -- A non-admin room member cannot add another same-choir member.
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_member, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  refused := false;
  begin
    insert into public.chat_room_members (room_id, member_id, role)
    values (room_a, member_nonmember, 'member');
  exception when insufficient_privilege then
    refused := true;
  end;
  if not refused then raise exception '041: non-admin member add was accepted'; end if;

  -- Own read/mute/hide/nickname state remains directly writable.
  update public.chat_room_members
  set nickname = '041 self',
      last_read_at = clock_timestamp(),
      notifications_enabled = false,
      hidden_at = clock_timestamp()
  where id = membership_member;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception '041: own preference update did not affect one row'; end if;
  select * into strict stored from public.chat_room_members where id = membership_member;
  if stored.nickname <> '041 self' or stored.notifications_enabled
    or stored.last_read_at is null or stored.hidden_at is null or stored.role <> 'member' then
    raise exception '041: own preference update stored the wrong shape';
  end if;

  -- A member cannot self-promote or move/reidentify the membership.
  refused := false;
  begin
    update public.chat_room_members set role = 'admin' where id = membership_member;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '041: member self-promotion was accepted'; end if;

  refused := false;
  begin
    update public.chat_room_members set room_id = room_other_a where id = membership_member;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '041: membership room identity mutation was accepted'; end if;

  refused := false;
  begin
    update public.chat_room_members set member_id = member_nonmember where id = membership_member;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '041: membership member identity mutation was accepted'; end if;

  refused := false;
  begin
    update public.chat_room_members set id = gen_random_uuid() where id = membership_member;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '041: membership row identity mutation was accepted'; end if;

  refused := false;
  begin
    update public.chat_room_members set choir_id = choir_b where id = membership_member;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '041: membership choir identity mutation was accepted'; end if;

  refused := false;
  begin
    update public.chat_room_members set joined_at = joined_at - interval '1 day'
    where id = membership_member;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '041: membership join timestamp mutation was accepted'; end if;

  -- A non-admin update of another membership sees no writable row.
  update public.chat_room_members set role = 'member' where id = membership_admin;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '041: non-admin changed another membership'; end if;

  -- Creator bootstrap/member add remains compatible with the current multi-row web insert.
  insert into public.chat_rooms (id, name, slug, type, created_by)
  values (creator_room, '041 Creator Room', '041-creator-' || creator_room, 'custom', member_member);
  insert into public.chat_room_members (room_id, member_id, role) values
    (creator_room, member_member, 'admin'),
    (creator_room, member_invitee, 'member');
  if (select count(*) from public.chat_room_members where room_id = creator_room) <> 2 then
    raise exception '041: creator multi-row member bootstrap failed';
  end if;

  -- Room admin can add/remove a same-choir member and update another member's role.
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_admin, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  insert into public.chat_room_members (room_id, member_id, role)
  values (room_a, member_nonmember, 'member');
  update public.chat_room_members set role = 'admin' where id = membership_member;
  get diagnostics affected = row_count;
  if affected <> 1 or (select role from public.chat_room_members where id = membership_member) <> 'admin' then
    raise exception '041: admin role update failed';
  end if;
  update public.chat_room_members set role = 'member' where id = membership_member;
  update public.chat_room_members set role = 'member' where id = membership_member;
  get diagnostics affected = row_count;
  if affected <> 1 then
    raise exception '041: idempotent admin role update failed';
  end if;

  refused := false;
  begin
    update public.chat_room_members
    set role = 'admin', notifications_enabled = true
    where id = membership_member;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '041: admin combined role/preference update was accepted'; end if;

  delete from public.chat_room_members
  where room_id = room_a and member_id = member_nonmember;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception '041: admin member removal failed'; end if;

  -- A member can still leave their own room.
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_invitee, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  delete from public.chat_room_members
  where room_id = creator_room and member_id = member_invitee;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception '041: self leave failed'; end if;
end
$test$;

rollback;
