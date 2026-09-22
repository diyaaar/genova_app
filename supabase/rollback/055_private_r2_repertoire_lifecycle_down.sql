-- Local acceptance rollback. Live rollback requires exact reconciliation authority.
begin;
select pg_advisory_xact_lock(hashtext('genovakorist:055:private-r2-lifecycle'));
do $guard$
begin
  if exists(select 1 from genova_055.deletion_jobs where state <> 'cleaned') then
    raise exception '055 down refused: provider cleanup remains';
  end if;
end;
$guard$;
drop function public.repertoire_lifecycle_055(text,uuid,uuid,uuid,uuid,text,uuid,text);
drop table genova_055.deletion_objects;
drop table genova_055.deletion_jobs;
drop schema genova_055;
notify pgrst, 'reload schema';
commit;
