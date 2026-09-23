-- Exact structural rollback for 060. Refuse while any private media lifecycle evidence exists.
begin;
select pg_advisory_xact_lock(hashtext('genovakorist:060:private-r2-chat-media'));

do $guard$
begin
  if to_regnamespace('genova_060') is null or to_regclass('public.chat_media_versions') is null then
    raise exception '060 rollback refused: expected objects are missing';
  end if;
  if exists(select 1 from public.chat_media_versions)
    or exists(select 1 from genova_060.batches)
    or exists(select 1 from genova_060.parts)
    or exists(select 1 from genova_060.message_deletes) then
    raise exception '060 rollback refused: private chat media lifecycle rows exist';
  end if;
end;
$guard$;

drop trigger chat_message_private_media_guard_060 on public.chat_messages;
drop trigger chat_room_private_avatar_guard_060 on public.chat_rooms;
drop policy chat_media_versions_room_read_060 on public.chat_media_versions;

drop function public.chat_media_message_delete_060(text,uuid,uuid,uuid,uuid,uuid,uuid);
drop function public.chat_media_abort_060(text,uuid,uuid,uuid,uuid,uuid,uuid);
drop function public.chat_media_upload_060(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text);
drop function public.can_read_chat_media_060(uuid,uuid,uuid);
drop function genova_060.authorize_actor(uuid,uuid,uuid,uuid,text);
drop function genova_060.guard_private_identity();

do $restore$
declare definition text;
begin
  select p.definition into definition from genova_060.prior_delete_function p;
  if definition is null then raise exception '060 rollback refused: prior delete function is missing';end if;
  execute definition;
end;
$restore$;
revoke all on function public.delete_chat_message_for_everyone(uuid) from public,anon;
grant execute on function public.delete_chat_message_for_everyone(uuid) to authenticated;

alter table public.chat_rooms drop constraint chat_room_avatar_media_alias_060;
alter table public.chat_rooms drop column avatar_media_version_id;
drop table public.chat_media_versions;
drop schema genova_060 cascade;

notify pgrst,'reload schema';
commit;
