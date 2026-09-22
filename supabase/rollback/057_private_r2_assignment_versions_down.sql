begin;
select pg_advisory_xact_lock(hashtext('genovakorist:057:private-r2-assignment-versions'));
do $guard$
begin
  if exists(select 1 from genova_057.uploads)
    or exists(select 1 from public.assignment_submission_file_versions)
    or exists(select 1 from public.assignment_submissions where current_file_version_id is not null)
    or exists(select 1 from public.assignment_submission_history where file_version_id is not null) then
    raise exception '057 down refused: reconcile assignment versions and private objects first';
  end if;
end;
$guard$;
drop function public.assignment_submission_upload_057(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text);
drop function public.claim_assignment_notification_057(uuid,uuid,uuid,uuid);
drop function genova_057.authorize_submitter(uuid,uuid,uuid,uuid);
drop index public.assignment_submission_history_file_version_idx;
alter table public.assignment_submission_history drop column file_version_id;
alter table public.assignment_submissions drop column current_file_version_id;
drop table public.assignment_submission_file_versions;
drop schema genova_057 cascade;
notify pgrst,'reload schema';
commit;
