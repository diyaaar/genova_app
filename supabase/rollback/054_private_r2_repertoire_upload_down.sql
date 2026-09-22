-- Local acceptance rollback. Live rollback needs separate data/object reconciliation authority.
begin;
select pg_advisory_xact_lock(hashtext('genovakorist:054:private-r2-upload'));
do $guard$
begin
  if exists (select 1 from genova_054.uploads) then
    raise exception '054 down refused: reconcile upload records and provider objects first';
  end if;
end;
$guard$;
drop function public.repertoire_upload_054(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text);
drop function genova_054.authorize_manager(uuid,uuid,uuid);
drop table genova_054.uploads;
drop schema genova_054;
notify pgrst, 'reload schema';
commit;
