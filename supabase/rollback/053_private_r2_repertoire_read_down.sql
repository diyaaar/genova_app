-- LOCAL/REVIEWED ROLLBACK ONLY. Hosted execution requires separate approval.
-- This removes only 053 metadata. It never deletes provider objects.

begin;

select pg_advisory_xact_lock(hashtext('genovakorist:053:private-r2-repertoire-read'));

do $preflight$
begin
  if to_regclass('public.repertoire_file_storage_locations') is null
    or to_regnamespace('genova_053') is null
    or not exists (
      select 1 from pg_constraint
      where conrelid = 'public.repertoire_files'::regclass
        and conname = 'repertoire_files_id_choir_id_key_053'
    ) then
    raise exception '053 down refused: expected applied state is incomplete';
  end if;
end
$preflight$;

drop table public.repertoire_file_storage_locations;
drop function genova_053.guard_storage_location_update();
drop schema genova_053;
alter table public.repertoire_files
  drop constraint repertoire_files_id_choir_id_key_053;

notify pgrst, 'reload schema';

commit;
