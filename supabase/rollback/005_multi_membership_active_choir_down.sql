-- 005 down: restore the one Auth account = one choir contract.
-- Refuse to continue once real multi-membership data exists.

select pg_advisory_xact_lock(hashtext('genovakorist:005:multi-membership'));

set local lock_timeout = '5s';
set local statement_timeout = '90s';

do $rollback$
begin
  if exists (
    select member.auth_user_id
    from public.choir_members member
    where member.auth_user_id is not null
    group by member.auth_user_id
    having count(*) > 1
  ) then
    raise exception '005 rollback refused: multi-choir memberships exist';
  end if;
end
$rollback$;

drop function public.set_active_choir(uuid);
drop function public.list_my_choirs();
drop function public.upsert_my_active_push_subscription(text, text, text, text);
drop function public.delete_my_push_subscription(text);

do $restore_functions$
declare
  backup record;
begin
  for backup in
    select signature, definition, description
    from genova_005.function_backups
    order by signature
  loop
    execute backup.definition;
    execute format('comment on function %s is %L', backup.signature, backup.description);
  end loop;
end
$restore_functions$;

drop table genova_005.function_backups;
drop table genova_005.active_choir_sessions;
drop function genova_005.current_session_id();
drop schema genova_005;

drop index public.choir_members_auth_user_id_idx;

alter table public.choir_members
  drop constraint choir_members_choir_id_auth_user_id_key,
  add constraint choir_members_auth_user_id_key unique (auth_user_id);

notify pgrst, 'reload schema';
