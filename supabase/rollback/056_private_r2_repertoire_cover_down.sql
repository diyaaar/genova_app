begin;
select pg_advisory_xact_lock(hashtext('genovakorist:056:private-r2-cover'));
do $guard$
begin
  if exists(select 1 from genova_054.uploads where metadata->>'fileType'='other') then
    raise exception '056 down refused: reconcile cover uploads and objects first';
  end if;
end;
$guard$;
drop function public.repertoire_cover_upload_056(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text);
notify pgrst,'reload schema';
commit;
