-- LOCAL/CONTROLLED ROLLBACK for 044. Hosted rollback needs explicit approval.
begin;
do $preflight$ begin
  if to_regclass('genova_044.prior_message_policies') is null
    or (select count(*) from genova_044.prior_message_policies)<>3 then
    raise exception '044 down refused: rollback metadata missing';
  end if;
end $preflight$;

drop policy if exists "Room members send constrained messages" on public.chat_messages;
drop policy if exists "Room members view unhidden messages" on public.chat_messages;
drop function if exists public.edit_chat_message(uuid,text);
drop function if exists public.delete_chat_message_for_everyone(uuid);
drop function if exists public.hide_chat_message_for_self(uuid);

do $restore$
declare prior record; role_list text; statement text;
begin
  for prior in select * from genova_044.prior_message_policies order by policyname loop
    select string_agg(quote_ident(role_name),', ' order by role_name) into role_list from unnest(prior.roles) role_name;
    statement:=format('create policy %I on public.chat_messages as %s for %s to %s',prior.policyname,prior.permissive,prior.cmd,role_list);
    if prior.qual is not null then statement:=statement||format(' using (%s)',prior.qual); end if;
    if prior.with_check is not null then statement:=statement||format(' with check (%s)',prior.with_check); end if;
    execute statement;
  end loop;
end $restore$;
drop schema genova_044 cascade;
drop table if exists public.chat_message_hidden_members;
commit;
