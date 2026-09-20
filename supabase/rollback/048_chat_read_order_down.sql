-- LOCAL/REVIEWED ROLLBACK ONLY. Hosted execution requires separate approval.

begin;

do $preflight$
begin
  if to_regnamespace('genova_048') is null
    or to_regclass('public.idx_chat_messages_room_created_id_048') is null
    or to_regprocedure('public.mark_chat_room_read(uuid)') is null then
    raise exception '048 down refused: expected applied state is incomplete';
  end if;
end
$preflight$;

drop index public.idx_chat_messages_room_created_id_048;
drop function public.mark_chat_room_read(uuid);
drop schema genova_048;

commit;
