-- LOCAL/CONTROLLED ROLLBACK for 045. Hosted rollback needs explicit approval.
begin;

do $preflight$
begin
  if to_regnamespace('genova_045') is null
    or to_regclass('public.chat_message_send_keys') is null
    or to_regprocedure('public.send_chat_text_message(uuid,uuid,text,uuid,jsonb)') is null then
    raise exception '045 down refused: idempotency objects are incomplete';
  end if;
end
$preflight$;

drop function public.send_chat_text_message(uuid,uuid,text,uuid,jsonb);
drop table public.chat_message_send_keys;
alter table public.chat_messages drop column client_mutation_id;
drop schema genova_045 cascade;

commit;
