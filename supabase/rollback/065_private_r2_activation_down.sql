-- Local acceptance rollback. A committed activation requires separate reverse reconciliation.
begin;
select pg_advisory_xact_lock(hashtext('genovakorist:065:private-r2-activation'));

do $guard$
begin
  if to_regnamespace('genova_065') is null
    or to_regprocedure('public.private_r2_activate_065(uuid,uuid,text,jsonb,jsonb,jsonb)') is null
    or to_regclass('genova_065.activation_runs') is null
    or to_regclass('genova_065.activation_items') is null then
    raise exception '065 down refused: accepted activation objects are incomplete';
  end if;
  if exists(select 1 from genova_065.activation_runs)
    or exists(select 1 from genova_065.activation_items) then
    raise exception '065 down refused: committed activation requires reverse reconciliation';
  end if;
end;
$guard$;

drop function public.private_r2_activate_065(uuid,uuid,text,jsonb,jsonb,jsonb) restrict;
drop table genova_065.activation_items restrict;
drop table genova_065.activation_runs restrict;
drop schema genova_065 restrict;
notify pgrst,'reload schema';
commit;
