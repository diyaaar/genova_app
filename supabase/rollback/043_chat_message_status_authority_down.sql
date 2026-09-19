-- LOCAL/CONTROLLED ROLLBACK for 043. A hosted rollback still requires explicit approval.

begin;

do $preflight$
begin
  if to_regnamespace('genova_043') is null
    or to_regclass('genova_043.prior_message_status_policies') is null then
    raise exception '043 down refused: rollback metadata is missing';
  end if;
  if (select count(*) from genova_043.prior_message_status_policies) <> 3 then
    raise exception '043 down refused: rollback policy set is incomplete';
  end if;
end
$preflight$;

drop policy if exists "Members view authorized message status" on public.chat_message_status;
drop function if exists public.mark_chat_message_status(uuid, text);

do $restore$
declare
  prior record;
  role_list text;
  statement text;
begin
  for prior in
    select * from genova_043.prior_message_status_policies order by policyname
  loop
    select string_agg(quote_ident(role_name), ', ' order by role_name)
      into role_list
    from unnest(prior.roles) role_name;
    statement := format(
      'create policy %I on public.chat_message_status as %s for %s to %s',
      prior.policyname, prior.permissive, prior.cmd, role_list
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

drop schema genova_043 cascade;

commit;
