begin;
select pg_advisory_xact_lock(hashtext('genovakorist:058:private-r2-assignment-review-audio'));
do $guard$
begin
  if exists(select 1 from genova_058.uploads)
    or exists(select 1 from public.assignment_review_audio_versions)
    or exists(select 1 from public.assignment_submissions where reviewer_audio_file_version_id is not null)
    or exists(select 1 from public.assignment_submission_private_notes where reviewer_audio_file_version_id is not null)
    or exists(select 1 from public.assignment_submission_history where reviewer_audio_file_version_id is not null)
    or exists(select 1 from public.assignment_submission_private_history) then
    raise exception '058 down refused: reconcile review audio versions and private objects first';
  end if;
end;
$guard$;
drop function public.claim_assignment_review_notification_058(uuid,uuid,uuid,uuid);
drop function public.set_assignment_review_visibility_058(uuid,uuid,uuid,boolean);
drop function public.assignment_review_audio_upload_058(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text);
drop function public.can_read_assignment_review_audio_058(uuid,uuid,uuid);
drop trigger assignment_submission_align_review_pointer_058 on public.assignment_submissions;
drop function genova_058.align_public_review_pointer();
drop trigger assignment_history_archive_hidden_review_058 on public.assignment_submission_history;
drop function genova_058.archive_hidden_review();
drop trigger assignment_history_prepare_review_058 on public.assignment_submission_history;
drop function genova_058.prepare_public_history_review();
drop function genova_058.authorize_reviewer(uuid,uuid,uuid,uuid,boolean);
drop table public.assignment_submission_private_history;
drop policy assignment_review_audio_versions_select on public.assignment_review_audio_versions;
drop index public.assignment_submission_history_review_audio_version_idx;
alter table public.assignment_submission_history drop column reviewer_audio_file_version_id;
alter table public.assignment_submission_private_notes drop column reviewer_audio_file_version_id;
alter table public.assignment_submissions drop column reviewer_audio_file_version_id;
drop table public.assignment_review_audio_versions;
drop schema genova_058 cascade;
notify pgrst,'reload schema';
commit;
