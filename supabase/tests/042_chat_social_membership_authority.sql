-- LOCAL ISOLATED DATABASE ONLY. Synthetic fixtures are transaction-local and rolled back.

begin;

do $test$
declare
  choir_a uuid := gen_random_uuid();
  choir_b uuid := gen_random_uuid();
  user_actor uuid := gen_random_uuid();
  user_peer uuid := gen_random_uuid();
  user_other_room uuid := gen_random_uuid();
  user_nonmember uuid := gen_random_uuid();
  user_cross uuid := gen_random_uuid();
  member_actor uuid := gen_random_uuid();
  member_peer uuid := gen_random_uuid();
  member_other_room uuid := gen_random_uuid();
  member_nonmember uuid := gen_random_uuid();
  member_cross uuid := gen_random_uuid();
  room_a uuid := gen_random_uuid();
  room_other_a uuid := gen_random_uuid();
  room_b uuid := gen_random_uuid();
  message_actor uuid := gen_random_uuid();
  message_peer uuid := gen_random_uuid();
  message_other_room uuid := gen_random_uuid();
  message_cross uuid := gen_random_uuid();
  poll_actor uuid := gen_random_uuid();
  poll_other_room uuid := gen_random_uuid();
  poll_cross uuid := gen_random_uuid();
  reaction_actor uuid := gen_random_uuid();
  vote_actor uuid := gen_random_uuid();
  affected integer;
  refused boolean;
begin
  if (select count(*) from pg_policies
      where schemaname = 'public'
        and tablename in (
          'chat_reactions', 'chat_polls', 'chat_poll_votes', 'chat_starred_messages'
        )
        and policyname <> 'tenant_isolation_003'
        and roles = array['authenticated'::name]) <> 13 then
    raise exception '042: repaired authenticated policy set is incomplete';
  end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and policyname in (
        'Allow all read', 'Allow insert/delete reactions', 'Allow insert polls', 'Allow voting',
        'Members can manage their own stars'
      )
      and tablename in (
        'chat_reactions', 'chat_polls', 'chat_poll_votes', 'chat_starred_messages'
      )
  ) then
    raise exception '042: broad prior social policy remains active';
  end if;
  if (select count(*) from pg_trigger
      where tgname in ('chat_reactions_noop_update_042', 'chat_poll_votes_noop_update_042')
        and not tgisinternal) <> 2 then
    raise exception '042: no-op update guards are incomplete';
  end if;
  if to_regclass('public.idx_chat_polls_message_042') is null
    or to_regclass('public.idx_chat_stars_member_created_042') is null then
    raise exception '042: supporting indexes are missing';
  end if;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at
  ) values
    (user_actor, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '042-actor-' || user_actor || '@example.invalid', '', now(), now(), now()),
    (user_peer, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '042-peer-' || user_peer || '@example.invalid', '', now(), now(), now()),
    (user_other_room, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '042-other-' || user_other_room || '@example.invalid', '', now(), now(), now()),
    (user_nonmember, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '042-nonmember-' || user_nonmember || '@example.invalid', '', now(), now(), now()),
    (user_cross, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      '042-cross-' || user_cross || '@example.invalid', '', now(), now(), now());

  insert into public.choirs (id, slug, name) values
    (choir_a, '042-a-' || choir_a, '042 Choir A'),
    (choir_b, '042-b-' || choir_b, '042 Choir B');

  insert into public.choir_members (
    id, auth_user_id, choir_id, first_name, last_name, voice_group, join_date
  ) values
    (member_actor, user_actor, choir_a, '042', 'Actor', 'Soprano', current_date),
    (member_peer, user_peer, choir_a, '042', 'Peer', 'Alto', current_date),
    (member_other_room, user_other_room, choir_a, '042', 'Other', 'Tenor', current_date),
    (member_nonmember, user_nonmember, choir_a, '042', 'Nonmember', 'Bass', current_date),
    (member_cross, user_cross, choir_b, '042', 'Cross', 'Bass', current_date);

  insert into public.chat_rooms (id, choir_id, name, slug, type, created_by) values
    (room_a, choir_a, '042 Room A', '042-room-a-' || room_a, 'custom', member_actor),
    (room_other_a, choir_a, '042 Other A', '042-other-a-' || room_other_a, 'custom', member_other_room),
    (room_b, choir_b, '042 Room B', '042-room-b-' || room_b, 'custom', member_cross);

  insert into public.chat_room_members (choir_id, room_id, member_id, role) values
    (choir_a, room_a, member_actor, 'admin'),
    (choir_a, room_a, member_peer, 'member'),
    (choir_a, room_other_a, member_other_room, 'admin'),
    (choir_b, room_b, member_cross, 'admin');

  insert into public.chat_messages (
    id, choir_id, room_id, sender_id, content, message_type
  ) values
    (message_actor, choir_a, room_a, member_actor, '042 actor', 'text'),
    (message_peer, choir_a, room_a, member_peer, '042 peer', 'text'),
    (message_other_room, choir_a, room_other_a, member_actor, '042 other room', 'text'),
    (message_cross, choir_b, room_b, member_cross, '042 cross', 'text');

  insert into public.chat_polls (
    id, choir_id, message_id, question, options_json
  ) values
    (poll_actor, choir_a, message_actor, '042 accessible?', '[{"id":"a","text":"A"},{"id":"b","text":"B"}]'),
    (poll_other_room, choir_a, message_other_room, '042 other?', '[{"id":"a","text":"A"}]'),
    (poll_cross, choir_b, message_cross, '042 cross?', '[{"id":"a","text":"A"}]');

  insert into public.chat_reactions (id, choir_id, message_id, member_id, emoji) values
    (reaction_actor, choir_a, message_actor, member_actor, '👍'),
    (gen_random_uuid(), choir_a, message_peer, member_peer, '🎵'),
    (gen_random_uuid(), choir_a, message_other_room, member_other_room, '🚪'),
    (gen_random_uuid(), choir_b, message_cross, member_cross, '🌍');

  insert into public.chat_poll_votes (id, choir_id, poll_id, member_id, option_id) values
    (vote_actor, choir_a, poll_actor, member_actor, 'a'),
    (gen_random_uuid(), choir_a, poll_actor, member_peer, 'b'),
    (gen_random_uuid(), choir_a, poll_other_room, member_other_room, 'a'),
    (gen_random_uuid(), choir_b, poll_cross, member_cross, 'a');

  insert into public.chat_starred_messages (choir_id, message_id, member_id) values
    (choir_a, message_actor, member_actor),
    (choir_a, message_peer, member_peer),
    (choir_a, message_other_room, member_other_room),
    (choir_b, message_cross, member_cross);

  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_actor, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);

  if (select count(*) from public.chat_reactions) <> 2
    or (select count(*) from public.chat_polls) <> 1
    or (select count(*) from public.chat_poll_votes) <> 2
    or (select count(*) from public.chat_starred_messages) <> 1 then
    raise exception '042: room-member or own-star read boundary returned the wrong rows';
  end if;

  -- Exact current-web upsert conflicts remain no-op compatible.
  insert into public.chat_reactions (choir_id, message_id, member_id, emoji)
  values (choir_a, message_actor, member_actor, '👍')
  on conflict (message_id, member_id, emoji) do update
  set message_id = excluded.message_id,
      member_id = excluded.member_id,
      emoji = excluded.emoji;

  insert into public.chat_poll_votes (choir_id, poll_id, member_id, option_id)
  values (choir_a, poll_actor, member_actor, 'a')
  on conflict (poll_id, member_id, option_id) do update
  set poll_id = excluded.poll_id,
      member_id = excluded.member_id,
      option_id = excluded.option_id;

  -- Authorized own writes still work.
  insert into public.chat_reactions (choir_id, message_id, member_id, emoji)
  values (choir_a, message_peer, member_actor, '👏');
  insert into public.chat_poll_votes (choir_id, poll_id, member_id, option_id)
  values (choir_a, poll_actor, member_actor, 'c');
  insert into public.chat_starred_messages (choir_id, message_id, member_id)
  values (choir_a, message_peer, member_actor);
  insert into public.chat_polls (choir_id, message_id, question, options_json)
  values (choir_a, message_actor, '042 actor second?', '[{"id":"a","text":"A"}]');

  -- Row identity/content cannot be moved by the upsert UPDATE path.
  refused := false;
  begin
    update public.chat_reactions set emoji = '🔥' where id = reaction_actor;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '042: reaction identity/content update was accepted'; end if;

  refused := false;
  begin
    update public.chat_poll_votes set option_id = 'changed' where id = vote_actor;
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '042: vote identity/content update was accepted'; end if;

  -- Another member's actor identity and inaccessible rooms refuse.
  refused := false;
  begin
    insert into public.chat_reactions (choir_id, message_id, member_id, emoji)
    values (choir_a, message_actor, member_peer, '❌');
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '042: reaction with another member identity was accepted'; end if;

  refused := false;
  begin
    insert into public.chat_reactions (choir_id, message_id, member_id, emoji)
    values (choir_a, message_other_room, member_actor, '❌');
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '042: reaction in inaccessible room was accepted'; end if;

  refused := false;
  begin
    insert into public.chat_poll_votes (choir_id, poll_id, member_id, option_id)
    values (choir_a, poll_actor, member_peer, 'x');
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '042: vote with another member identity was accepted'; end if;

  refused := false;
  begin
    insert into public.chat_poll_votes (choir_id, poll_id, member_id, option_id)
    values (choir_a, poll_other_room, member_actor, 'x');
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '042: vote in inaccessible room was accepted'; end if;

  refused := false;
  begin
    insert into public.chat_starred_messages (choir_id, message_id, member_id)
    values (choir_a, message_actor, member_peer);
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '042: star with another member identity was accepted'; end if;

  refused := false;
  begin
    insert into public.chat_starred_messages (choir_id, message_id, member_id)
    values (choir_a, message_other_room, member_actor);
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '042: star in inaccessible room was accepted'; end if;

  refused := false;
  begin
    insert into public.chat_polls (choir_id, message_id, question, options_json)
    values (choir_a, message_peer, '042 not sender?', '[{"id":"a","text":"A"}]');
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '042: poll on another sender message was accepted'; end if;

  refused := false;
  begin
    insert into public.chat_polls (choir_id, message_id, question, options_json)
    values (choir_a, message_other_room, '042 inaccessible?', '[{"id":"a","text":"A"}]');
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '042: poll in inaccessible room was accepted'; end if;

  delete from public.chat_reactions
  where message_id = message_peer and member_id = member_peer;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '042: another member reaction was deleted'; end if;
  delete from public.chat_poll_votes
  where poll_id = poll_actor and member_id = member_peer;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '042: another member vote was deleted'; end if;
  delete from public.chat_starred_messages
  where message_id = message_peer and member_id = member_peer;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception '042: another member star was deleted'; end if;

  -- Same-choir nonmember has no read or write authority.
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_nonmember, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  if (select count(*) from public.chat_reactions) <> 0
    or (select count(*) from public.chat_polls) <> 0
    or (select count(*) from public.chat_poll_votes) <> 0
    or (select count(*) from public.chat_starred_messages) <> 0 then
    raise exception '042: same-choir nonmember read social rows';
  end if;

  refused := false;
  begin
    insert into public.chat_reactions (choir_id, message_id, member_id, emoji)
    values (choir_a, message_actor, member_nonmember, '❌');
  exception when insufficient_privilege then refused := true;
  end;
  if not refused then raise exception '042: same-choir nonmember reaction was accepted'; end if;

  -- Cross-choir member sees only their own room's rows, never choir A.
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_cross, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  if (select count(*) from public.chat_reactions) <> 1
    or (select count(*) from public.chat_polls) <> 1
    or (select count(*) from public.chat_poll_votes) <> 1
    or (select count(*) from public.chat_starred_messages) <> 1 then
    raise exception '042: cross-choir read boundary returned the wrong rows';
  end if;

  -- Return to the actor and prove own delete paths.
  perform set_config('request.jwt.claims', json_build_object(
    'sub', user_actor, 'role', 'authenticated', 'session_id', gen_random_uuid()
  )::text, true);
  delete from public.chat_reactions
  where message_id = message_peer and member_id = member_actor and emoji = '👏';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception '042: own reaction delete failed'; end if;
  delete from public.chat_poll_votes
  where poll_id = poll_actor and member_id = member_actor and option_id = 'c';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception '042: own vote delete failed'; end if;
  delete from public.chat_starred_messages
  where message_id = message_peer and member_id = member_actor;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception '042: own star delete failed'; end if;
end
$test$;

rollback;
