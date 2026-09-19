-- LOCAL/REVIEWED ROLLBACK ONLY. Hosted execution requires separate approval.

begin;

do $publication$
declare
  table_name text;
begin
  if to_regclass('genova_046.prior_publication_tables') is null then
    raise exception '046 down refused: prior publication state is missing';
  end if;

  foreach table_name in array array['chat_messages','chat_reactions','chat_message_status'] loop
    if not exists (
      select 1 from genova_046.prior_publication_tables prior
      where prior.schemaname='public' and prior.tablename=table_name
    ) and exists (
      select 1 from pg_publication_tables current_state
      where current_state.pubname='supabase_realtime'
        and current_state.schemaname='public'
        and current_state.tablename=table_name
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', table_name);
    end if;
  end loop;
end
$publication$;

drop policy if exists "046 room members receive chat signals" on realtime.messages;
drop policy if exists "046 room members send chat signals" on realtime.messages;
drop function if exists genova_046.can_access_chat_room_topic(text);
drop table genova_046.prior_publication_tables;
drop schema genova_046;

commit;
