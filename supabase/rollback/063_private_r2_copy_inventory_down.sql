-- 063 exact local rollback. RESTRICT refuses unexpected dependants.
begin;
select pg_advisory_xact_lock(hashtext('genovakorist:063:private-r2-copy-inventory'));

do $preflight$
begin
  if to_regnamespace('genova_063') is null
    or to_regprocedure('public.private_r2_copy_inventory_063(uuid,text)') is null then
    raise exception '063 down refused: expected inventory objects are missing';
  end if;
end;
$preflight$;

drop function public.private_r2_copy_inventory_063(uuid,text) restrict;
drop function genova_063.drive_file_id(text) restrict;
drop function genova_063.stable_uuid(text) restrict;
drop schema genova_063 restrict;
notify pgrst,'reload schema';
commit;
