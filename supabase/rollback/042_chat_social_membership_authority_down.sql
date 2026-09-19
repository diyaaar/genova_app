-- LOCAL/CONTROLLED ROLLBACK for 042. A hosted rollback still requires explicit approval.

begin;

do $preflight$
begin
  if to_regnamespace('genova_042') is null
    or to_regclass('genova_042.prior_social_policies') is null then
    raise exception '042 down refused: rollback metadata is missing';
  end if;
  if (select count(*) from genova_042.prior_social_policies) <> 15 then
    raise exception '042 down refused: rollback policy set is incomplete';
  end if;
end
$preflight$;

drop policy if exists "Room members view reactions" on public.chat_reactions;
drop policy if exists "Members add own room reactions" on public.chat_reactions;
drop policy if exists "Members no-op own reaction upserts" on public.chat_reactions;
drop policy if exists "Members remove own room reactions" on public.chat_reactions;
drop policy if exists "Room members view polls" on public.chat_polls;
drop policy if exists "Message senders create room polls" on public.chat_polls;
drop policy if exists "Room members view poll votes" on public.chat_poll_votes;
drop policy if exists "Members cast own room votes" on public.chat_poll_votes;
drop policy if exists "Members no-op own vote upserts" on public.chat_poll_votes;
drop policy if exists "Members remove own room votes" on public.chat_poll_votes;
drop policy if exists "Members view own room stars" on public.chat_starred_messages;
drop policy if exists "Members add own room stars" on public.chat_starred_messages;
drop policy if exists "Members remove own room stars" on public.chat_starred_messages;

drop trigger if exists chat_reactions_noop_update_042 on public.chat_reactions;
drop trigger if exists chat_poll_votes_noop_update_042 on public.chat_poll_votes;
drop index if exists public.idx_chat_polls_message_042;
drop index if exists public.idx_chat_stars_member_created_042;

do $restore$
declare
  prior record;
  role_list text;
  statement text;
begin
  for prior in
    select * from genova_042.prior_social_policies order by tablename, policyname
  loop
    select string_agg(quote_ident(role_name), ', ' order by role_name)
      into role_list
    from unnest(prior.roles) role_name;

    statement := format(
      'create policy %I on public.%I as %s for %s to %s',
      prior.policyname,
      prior.tablename,
      prior.permissive,
      prior.cmd,
      role_list
    );
    if prior.qual is not null then
      statement := statement || format(' using (%s)', prior.qual);
    end if;
    if prior.with_check is not null then
      statement := statement || format(' with check (%s)', prior.with_check);
    end if;
    execute statement;
  end loop;
end
$restore$;

drop schema genova_042 cascade;

commit;
