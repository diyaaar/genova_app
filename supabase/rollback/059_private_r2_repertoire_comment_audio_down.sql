begin;
select pg_advisory_xact_lock(hashtext('genovakorist:059:private-r2-repertoire-comment-audio'));
do $guard$
begin
  if exists(select 1 from public.repertoire_comment_audio_versions)
    or exists(select 1 from public.repertoire_song_comments where audio_file_version_id is not null)
    or exists(select 1 from genova_059.uploads where state in('uploading','cleanup','committed'))
    or exists(select 1 from genova_059.deletes where state='deleting') then
    raise exception '059 down refused: reconcile private comment audio objects first';
  end if;
end;
$guard$;
drop function public.repertoire_comment_delete_059(text,uuid,uuid,uuid,uuid,uuid);
drop function public.create_repertoire_text_comment_059(uuid,uuid,uuid,uuid,uuid,text,text);
drop function public.repertoire_comment_upload_059(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text);
drop function public.can_read_repertoire_comment_audio_059(uuid,uuid,uuid);
drop function genova_059.authorize_writer(uuid,uuid,uuid,uuid,text);
drop policy repertoire_comment_audio_versions_select on public.repertoire_comment_audio_versions;
drop policy repertoire_comment_delete_059 on public.repertoire_song_comments;
drop policy repertoire_comment_update_059 on public.repertoire_song_comments;
drop policy repertoire_comment_insert_059 on public.repertoire_song_comments;
drop policy repertoire_comment_visibility_059 on public.repertoire_song_comments;
drop trigger repertoire_comment_audio_identity_delete_059 on public.repertoire_song_comments;
drop trigger repertoire_comment_audio_identity_update_059 on public.repertoire_song_comments;
drop function genova_059.protect_comment_audio_identity();
drop trigger repertoire_comment_audio_versions_immutable on public.repertoire_comment_audio_versions;
drop function genova_059.refuse_version_mutation();
drop index public.repertoire_song_comments_audio_version_idx;
alter table public.repertoire_song_comments drop column audio_file_version_id;
drop table public.repertoire_comment_audio_versions;
drop schema genova_059 cascade;
notify pgrst,'reload schema';
commit;
