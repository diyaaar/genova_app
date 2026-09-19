-- LOCAL/CONTROLLED ROLLBACK for 041. A hosted rollback still requires explicit approval.

begin;

do $preflight$
begin
  if to_regnamespace('genova_041') is null
    or to_regclass('genova_041.prior_chat_room_member_policies') is null then
    raise exception '041 down refused: rollback metadata is missing';
  end if;
  if (select count(*) from genova_041.prior_chat_room_member_policies) <> 2 then
    raise exception '041 down refused: rollback policy set is incomplete';
  end if;
end
$preflight$;

drop policy if exists "Room creators or admins add members" on public.chat_room_members;
drop policy if exists "Members update own room preferences" on public.chat_room_members;
drop policy if exists "Room admins update member roles" on public.chat_room_members;
drop trigger if exists chat_room_members_guard_041 on public.chat_room_members;

do $restore$
declare
  prior record;
  role_list text;
  statement text;
begin
  for prior in
    select * from genova_041.prior_chat_room_member_policies order by policyname
  loop
    select string_agg(quote_ident(role_name), ', ' order by role_name)
      into role_list
    from unnest(prior.roles) role_name;

    statement := format(
      'create policy %I on public.chat_room_members as %s for %s to %s',
      prior.policyname,
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

drop schema genova_041 cascade;

commit;
