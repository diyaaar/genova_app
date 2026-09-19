-- 042: bind reactions, polls, votes and stars to current room membership and actor identity.
-- Message status, core messages and Realtime authorization remain later packages.

begin;

do $preflight$
declare
  actual_policies text[];
  expected_policies constant text[] := array[
    'chat_poll_votes:Allow all read',
    'chat_poll_votes:Allow voting',
    'chat_poll_votes:Cast vote',
    'chat_poll_votes:Remove own vote',
    'chat_poll_votes:View poll votes',
    'chat_polls:Allow all read',
    'chat_polls:Allow insert polls',
    'chat_polls:Create polls',
    'chat_polls:View polls',
    'chat_reactions:Add reactions',
    'chat_reactions:Allow all read',
    'chat_reactions:Allow insert/delete reactions',
    'chat_reactions:Remove own reactions',
    'chat_reactions:View reactions',
    'chat_starred_messages:Members can manage their own stars'
  ];
begin
  if to_regnamespace('genova_042') is not null then
    raise exception '042 refused: genova_042 already exists';
  end if;
  if to_regnamespace('genova_041') is null
    or to_regclass('public.chat_reactions') is null
    or to_regclass('public.chat_polls') is null
    or to_regclass('public.chat_poll_votes') is null
    or to_regclass('public.chat_starred_messages') is null
    or to_regprocedure('public.current_chat_member_id()') is null
    or to_regprocedure('public.current_choir_id()') is null then
    raise exception '042 refused: 041 or required chat authority surface is missing';
  end if;

  select array_agg(tablename || ':' || policyname order by tablename, policyname)
    into actual_policies
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'chat_reactions', 'chat_polls', 'chat_poll_votes', 'chat_starred_messages'
    )
    and policyname <> 'tenant_isolation_003';

  if actual_policies is distinct from expected_policies then
    raise exception '042 refused: prior social policy set differs from the dated baseline';
  end if;
  if (select count(*) from pg_policies
      where schemaname = 'public'
        and tablename in (
          'chat_reactions', 'chat_polls', 'chat_poll_votes', 'chat_starred_messages'
        )
        and policyname = 'tenant_isolation_003'
        and permissive = 'RESTRICTIVE') <> 4 then
    raise exception '042 refused: restrictive tenant policies are incomplete';
  end if;
  if to_regclass('public.idx_chat_polls_message_042') is not null
    or to_regclass('public.idx_chat_stars_member_created_042') is not null then
    raise exception '042 refused: expected new index name already exists';
  end if;
end
$preflight$;

create schema genova_042;
revoke all on schema genova_042 from public;

create table genova_042.prior_social_policies as
select tablename, policyname, permissive, roles::text[] as roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'chat_reactions', 'chat_polls', 'chat_poll_votes', 'chat_starred_messages'
  )
  and policyname <> 'tenant_isolation_003'
order by tablename, policyname;

revoke all on genova_042.prior_social_policies from public;

create function genova_042.current_member_can_access_message(
  p_message_id uuid,
  p_choir_id uuid,
  p_require_sender boolean default false
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select p_choir_id = public.current_choir_id()
    and exists (
      select 1
      from public.chat_messages message
      join public.chat_room_members membership
        on membership.room_id = message.room_id
       and membership.choir_id = message.choir_id
      where message.id = p_message_id
        and message.choir_id = p_choir_id
        and membership.member_id = public.current_chat_member_id()
        and (not p_require_sender or message.sender_id = public.current_chat_member_id())
    );
$function$;

create function genova_042.current_member_can_access_poll(
  p_poll_id uuid,
  p_choir_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $function$
  select p_choir_id = public.current_choir_id()
    and exists (
      select 1
      from public.chat_polls poll
      join public.chat_messages message
        on message.id = poll.message_id
       and message.choir_id = poll.choir_id
      join public.chat_room_members membership
        on membership.room_id = message.room_id
       and membership.choir_id = message.choir_id
      where poll.id = p_poll_id
        and poll.choir_id = p_choir_id
        and membership.member_id = public.current_chat_member_id()
    );
$function$;

create function genova_042.guard_social_noop_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  if auth.uid() is null or new is not distinct from old then
    return new;
  end if;
  raise exception '042: social upsert may not change row identity or content'
    using errcode = '42501';
end
$function$;

revoke all on function genova_042.current_member_can_access_message(uuid, uuid, boolean) from public;
revoke all on function genova_042.current_member_can_access_poll(uuid, uuid) from public;
revoke all on function genova_042.guard_social_noop_update() from public;
grant execute on function genova_042.current_member_can_access_message(uuid, uuid, boolean) to authenticated;
grant execute on function genova_042.current_member_can_access_poll(uuid, uuid) to authenticated;

drop policy "Add reactions" on public.chat_reactions;
drop policy "Allow all read" on public.chat_reactions;
drop policy "Allow insert/delete reactions" on public.chat_reactions;
drop policy "Remove own reactions" on public.chat_reactions;
drop policy "View reactions" on public.chat_reactions;

drop policy "Allow all read" on public.chat_polls;
drop policy "Allow insert polls" on public.chat_polls;
drop policy "Create polls" on public.chat_polls;
drop policy "View polls" on public.chat_polls;

drop policy "Allow all read" on public.chat_poll_votes;
drop policy "Allow voting" on public.chat_poll_votes;
drop policy "Cast vote" on public.chat_poll_votes;
drop policy "Remove own vote" on public.chat_poll_votes;
drop policy "View poll votes" on public.chat_poll_votes;

drop policy "Members can manage their own stars" on public.chat_starred_messages;

create policy "Room members view reactions"
on public.chat_reactions for select to authenticated
using (genova_042.current_member_can_access_message(message_id, choir_id));

create policy "Members add own room reactions"
on public.chat_reactions for insert to authenticated
with check (
  member_id = public.current_chat_member_id()
  and genova_042.current_member_can_access_message(message_id, choir_id)
);

create policy "Members no-op own reaction upserts"
on public.chat_reactions for update to authenticated
using (
  member_id = public.current_chat_member_id()
  and genova_042.current_member_can_access_message(message_id, choir_id)
)
with check (
  member_id = public.current_chat_member_id()
  and genova_042.current_member_can_access_message(message_id, choir_id)
);

create policy "Members remove own room reactions"
on public.chat_reactions for delete to authenticated
using (
  member_id = public.current_chat_member_id()
  and genova_042.current_member_can_access_message(message_id, choir_id)
);

create policy "Room members view polls"
on public.chat_polls for select to authenticated
using (genova_042.current_member_can_access_message(message_id, choir_id));

create policy "Message senders create room polls"
on public.chat_polls for insert to authenticated
with check (genova_042.current_member_can_access_message(message_id, choir_id, true));

create policy "Room members view poll votes"
on public.chat_poll_votes for select to authenticated
using (genova_042.current_member_can_access_poll(poll_id, choir_id));

create policy "Members cast own room votes"
on public.chat_poll_votes for insert to authenticated
with check (
  member_id = public.current_chat_member_id()
  and genova_042.current_member_can_access_poll(poll_id, choir_id)
);

create policy "Members no-op own vote upserts"
on public.chat_poll_votes for update to authenticated
using (
  member_id = public.current_chat_member_id()
  and genova_042.current_member_can_access_poll(poll_id, choir_id)
)
with check (
  member_id = public.current_chat_member_id()
  and genova_042.current_member_can_access_poll(poll_id, choir_id)
);

create policy "Members remove own room votes"
on public.chat_poll_votes for delete to authenticated
using (
  member_id = public.current_chat_member_id()
  and genova_042.current_member_can_access_poll(poll_id, choir_id)
);

create policy "Members view own room stars"
on public.chat_starred_messages for select to authenticated
using (
  member_id = public.current_chat_member_id()
  and genova_042.current_member_can_access_message(message_id, choir_id)
);

create policy "Members add own room stars"
on public.chat_starred_messages for insert to authenticated
with check (
  member_id = public.current_chat_member_id()
  and genova_042.current_member_can_access_message(message_id, choir_id)
);

create policy "Members remove own room stars"
on public.chat_starred_messages for delete to authenticated
using (
  member_id = public.current_chat_member_id()
  and genova_042.current_member_can_access_message(message_id, choir_id)
);

create trigger chat_reactions_noop_update_042
before update on public.chat_reactions
for each row execute function genova_042.guard_social_noop_update();

create trigger chat_poll_votes_noop_update_042
before update on public.chat_poll_votes
for each row execute function genova_042.guard_social_noop_update();

create index idx_chat_polls_message_042
on public.chat_polls (message_id);

create index idx_chat_stars_member_created_042
on public.chat_starred_messages (member_id, created_at desc);

commit;
