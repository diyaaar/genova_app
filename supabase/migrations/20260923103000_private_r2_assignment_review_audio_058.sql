-- 058: immutable private assignment review audio with visible/private/history authority.
begin;
select pg_advisory_xact_lock(hashtext('genovakorist:058:private-r2-assignment-review-audio'));

create schema genova_058;
revoke all on schema genova_058 from public, anon, authenticated, service_role;

create table genova_058.uploads (
  actor_id uuid not null,
  retry_key uuid not null,
  choir_id uuid not null,
  actor_member_id uuid not null,
  submission_id uuid not null,
  assignment_id uuid not null,
  target_member_id uuid not null,
  version_id uuid not null unique default gen_random_uuid(),
  lease uuid not null default gen_random_uuid(),
  metadata jsonb not null,
  bucket text not null check (bucket ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  state text not null default 'uploading'
    check (state in ('uploading', 'cleanup', 'failed', 'committed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (actor_id, retry_key)
);
alter table genova_058.uploads enable row level security;
alter table genova_058.uploads force row level security;
revoke all on table genova_058.uploads from public, anon, authenticated, service_role;

create table genova_058.notification_claims (
  file_version_id uuid primary key,
  actor_id uuid not null,
  choir_id uuid not null,
  submission_id uuid not null,
  claimed_at timestamptz not null default now()
);
alter table genova_058.notification_claims enable row level security;
alter table genova_058.notification_claims force row level security;
revoke all on table genova_058.notification_claims from public, anon, authenticated, service_role;

create table public.assignment_review_audio_versions (
  id uuid primary key,
  choir_id uuid not null references public.choirs(id),
  submission_id uuid not null references public.assignment_submissions(id) on delete restrict,
  assignment_id uuid not null references public.assignments(id) on delete restrict,
  member_id uuid not null references public.choir_members(id) on delete restrict,
  created_by uuid not null references public.choir_members(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  provider text not null check (provider = 'r2'),
  bucket text not null check (bucket ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  object_key text not null check (length(object_key) between 1 and 1024),
  content_length bigint not null check (content_length between 1 and 20971520),
  mime_type text not null check (mime_type in
    ('audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/aac','audio/ogg','audio/webm','audio/flac')),
  sha256_hex text not null check (sha256_hex ~ '^[0-9a-f]{64}$'),
  file_name text not null check (length(file_name) between 1 and 255),
  created_at timestamptz not null default now(),
  unique (submission_id, version_number),
  unique (bucket, object_key)
);
create index assignment_review_audio_owner_created_idx
  on public.assignment_review_audio_versions (assignment_id, member_id, created_at desc);
alter table public.assignment_review_audio_versions enable row level security;
alter table public.assignment_review_audio_versions force row level security;
revoke all on table public.assignment_review_audio_versions from public, anon, authenticated;
grant select on table public.assignment_review_audio_versions to authenticated, service_role;

alter table public.assignment_submissions
  add column reviewer_audio_file_version_id uuid
    references public.assignment_review_audio_versions(id) on delete restrict;
alter table public.assignment_submission_private_notes
  add column reviewer_audio_file_version_id uuid
    references public.assignment_review_audio_versions(id) on delete restrict;
alter table public.assignment_submission_history
  add column reviewer_audio_file_version_id uuid
    references public.assignment_review_audio_versions(id) on delete restrict;
alter table public.assignment_submissions add constraint assignment_submission_review_version_alias_chk
  check (reviewer_audio_file_version_id is null or reviewer_audio_drive_file_id='r2_review_'||reviewer_audio_file_version_id::text);
alter table public.assignment_submission_private_notes add constraint assignment_private_review_version_alias_chk
  check (reviewer_audio_file_version_id is null or reviewer_audio_drive_file_id='r2_review_'||reviewer_audio_file_version_id::text);
alter table public.assignment_submission_history add constraint assignment_history_review_version_alias_chk
  check (reviewer_audio_file_version_id is null or reviewer_audio_drive_file_id='r2_review_'||reviewer_audio_file_version_id::text);
create index assignment_submission_history_review_audio_version_idx
  on public.assignment_submission_history (reviewer_audio_file_version_id)
  where reviewer_audio_file_version_id is not null;

create table public.assignment_submission_private_history (
  history_id uuid primary key references public.assignment_submission_history(id) on delete cascade,
  choir_id uuid not null references public.choirs(id),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  member_id uuid not null references public.choir_members(id) on delete cascade,
  reviewer_note text,
  reviewer_audio_file_version_id uuid references public.assignment_review_audio_versions(id) on delete restrict,
  reviewer_audio_drive_file_id text,
  reviewer_audio_file_name text,
  reviewer_audio_mime_type text,
  reviewer_audio_file_size_bytes bigint,
  note_history_json jsonb not null default '[]'::jsonb,
  archived_at timestamptz not null default now()
);
create index assignment_private_history_assignment_member_idx
  on public.assignment_submission_private_history (assignment_id, member_id, archived_at desc);
alter table public.assignment_submission_private_history enable row level security;
alter table public.assignment_submission_private_history force row level security;
revoke all on table public.assignment_submission_private_history from public, anon, authenticated;
grant select on table public.assignment_submission_private_history to authenticated, service_role;

create function genova_058.refuse_version_mutation()
returns trigger language plpgsql set search_path = '' as $fn$
begin
  raise exception 'Assignment review audio versions are immutable' using errcode = '55000';
end;
$fn$;
create trigger assignment_review_audio_versions_immutable
before update on public.assignment_review_audio_versions
for each row execute function genova_058.refuse_version_mutation();

create function genova_058.align_public_review_pointer()
returns trigger language plpgsql set search_path = '' as $fn$
begin
  if new.reviewer_audio_drive_file_id is null then new.reviewer_audio_file_version_id:=null; end if;
  return new;
end;
$fn$;
create trigger assignment_submission_align_review_pointer_058
before update of reviewer_audio_drive_file_id,reviewer_audio_file_version_id
on public.assignment_submissions for each row execute function genova_058.align_public_review_pointer();

create function genova_058.authorize_reviewer(
  actor_id uuid, session_id uuid, choir_id uuid, submission_id uuid, require_chef boolean default false
) returns table(actor_member_id uuid, is_chef boolean)
language plpgsql security invoker set search_path = '' as $fn$
declare selected_choir uuid; target_member_id uuid; actor_voice text; target_voice text;
begin
  if actor_id is null or choir_id is null or submission_id is null then
    raise exception 'Review access denied' using errcode='42501';
  end if;
  if session_id is not null then
    select s.choir_id into selected_choir from genova_005.active_choir_sessions s
      join public.choir_members m on m.auth_user_id=s.auth_user_id and m.choir_id=s.choir_id and m.is_active
      where s.session_id=authorize_reviewer.session_id and s.auth_user_id=actor_id;
    if selected_choir is distinct from choir_id then
      raise exception 'Review access denied' using errcode='42501';
    end if;
  end if;
  select m.id,m.voice_group into actor_member_id,actor_voice from public.choir_members m
    where m.auth_user_id=actor_id and m.choir_id=authorize_reviewer.choir_id and m.is_active
    limit 1 for share;
  select s.member_id,target.voice_group into target_member_id,target_voice
    from public.assignment_submissions s
    join public.choir_members target on target.id=s.member_id and target.choir_id=s.choir_id and target.is_active
    where s.id=authorize_reviewer.submission_id and s.choir_id=authorize_reviewer.choir_id
    for share of s,target;
  if actor_member_id is null or target_member_id is null then
    raise exception 'Review access denied' using errcode='42501';
  end if;
  select exists(
    select 1 from public.choir_member_roles cmr join public.roles r on r.id=cmr.role_id
    where cmr.member_id=actor_member_id and r.name='Şef'
  ) into is_chef;
  if not is_chef then
    if require_chef or actor_voice is null or target_voice is null or actor_voice<>target_voice
      or not exists(
        select 1 from public.choir_member_roles cmr join public.roles r on r.id=cmr.role_id
        where cmr.member_id=actor_member_id and r.name='Partisyon Şefi'
      ) then
      raise exception 'Review access denied' using errcode='42501';
    end if;
  end if;
  return next;
end;
$fn$;
revoke all on function genova_058.authorize_reviewer(uuid,uuid,uuid,uuid,boolean)
  from public,anon,authenticated,service_role;

create policy assignment_review_audio_versions_select
on public.assignment_review_audio_versions for select to authenticated using (
  choir_id=public.current_choir_id() and (
    exists(
      select 1 from public.assignment_submissions s join public.choir_members owner on owner.id=s.member_id
      where s.reviewer_audio_file_version_id=assignment_review_audio_versions.id
        and owner.auth_user_id=auth.uid() and not s.is_reviewer_note_hidden
    )
    or exists(
      select 1 from public.assignment_submission_history h join public.choir_members owner on owner.id=h.member_id
      where h.reviewer_audio_file_version_id=assignment_review_audio_versions.id
        and owner.auth_user_id=auth.uid()
    )
    or public.current_member_has_role('Şef')
    or (
      public.current_member_has_role('Partisyon Şefi') and exists(
        select 1 from public.choir_members me join public.choir_members target
          on target.id=assignment_review_audio_versions.member_id
        where me.auth_user_id=auth.uid() and me.choir_id=assignment_review_audio_versions.choir_id
          and target.choir_id=assignment_review_audio_versions.choir_id
          and me.is_active and target.is_active and me.voice_group is not null
          and target.voice_group=me.voice_group
      )
    )
  )
);

create policy assignment_submission_private_history_select
on public.assignment_submission_private_history for select to authenticated using (
  choir_id=public.current_choir_id() and (
    public.current_member_has_role('Şef') or (
      public.current_member_has_role('Partisyon Şefi') and exists(
        select 1 from public.choir_members me join public.choir_members target
          on target.id=assignment_submission_private_history.member_id
        where me.auth_user_id=auth.uid() and me.choir_id=assignment_submission_private_history.choir_id
          and target.choir_id=assignment_submission_private_history.choir_id
          and me.is_active and target.is_active and me.voice_group is not null
          and target.voice_group=me.voice_group
      )
    )
  )
);

create function public.can_read_assignment_review_audio_058(
  p_actor_id uuid,p_choir_id uuid,p_file_version_id uuid
) returns boolean language sql stable security definer set search_path = '' as $fn$
  select exists(
    select 1
    from public.assignment_review_audio_versions v
    join public.choir_members target on target.id=v.member_id and target.choir_id=v.choir_id
    join public.choir_members actor on actor.auth_user_id=p_actor_id
      and actor.choir_id=v.choir_id and actor.is_active
    where v.id=p_file_version_id and v.choir_id=p_choir_id and (
      (
        actor.id=target.id and (
          exists(
            select 1 from public.assignment_submissions s
            where s.id=v.submission_id and not s.is_reviewer_note_hidden
              and s.reviewer_audio_file_version_id=v.id
          )
          or exists(
            select 1 from public.assignment_submission_history h
            where h.member_id=target.id and h.reviewer_audio_file_version_id=v.id
          )
        )
      )
      or exists(
        select 1 from public.choir_member_roles cmr join public.roles r on r.id=cmr.role_id
        where cmr.member_id=actor.id and r.name='Şef'
      )
      or (
        actor.voice_group is not null and actor.voice_group=target.voice_group and exists(
          select 1 from public.choir_member_roles cmr join public.roles r on r.id=cmr.role_id
          where cmr.member_id=actor.id and r.name='Partisyon Şefi'
        )
      )
    )
  );
$fn$;
revoke all on function public.can_read_assignment_review_audio_058(uuid,uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.can_read_assignment_review_audio_058(uuid,uuid,uuid) to service_role;

create function genova_058.prepare_public_history_review()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare hidden boolean; version_id uuid;
begin
  if new.source_submission_id is not null then
    select s.is_reviewer_note_hidden,s.reviewer_audio_file_version_id into hidden,version_id
      from public.assignment_submissions s where s.id=new.source_submission_id;
    if new.reviewer_audio_file_version_id is null and not coalesce(hidden,false) then
      new.reviewer_audio_file_version_id:=version_id;
    end if;
  end if;
  return new;
end;
$fn$;
create trigger assignment_history_prepare_review_058
before insert on public.assignment_submission_history
for each row execute function genova_058.prepare_public_history_review();

create function genova_058.archive_hidden_review()
returns trigger language plpgsql security definer set search_path = '' as $fn$
declare private_note public.assignment_submission_private_notes%rowtype; choir uuid;
begin
  if new.source_submission_id is null then return new; end if;
  select p.* into private_note from public.assignment_submission_private_notes p
    where p.submission_id=new.source_submission_id and p.is_hidden;
  if not found then return new; end if;
  select a.choir_id into choir from public.assignments a where a.id=new.assignment_id;
  insert into public.assignment_submission_private_history(
    history_id,choir_id,assignment_id,member_id,reviewer_note,reviewer_audio_file_version_id,
    reviewer_audio_drive_file_id,reviewer_audio_file_name,reviewer_audio_mime_type,
    reviewer_audio_file_size_bytes,note_history_json,archived_at
  ) values (
    new.id,choir,new.assignment_id,new.member_id,private_note.reviewer_note,
    private_note.reviewer_audio_file_version_id,private_note.reviewer_audio_drive_file_id,
    private_note.reviewer_audio_file_name,private_note.reviewer_audio_mime_type,
    private_note.reviewer_audio_file_size_bytes,private_note.note_history_json,new.archived_at
  );
  return new;
end;
$fn$;
create trigger assignment_history_archive_hidden_review_058
after insert on public.assignment_submission_history
for each row execute function genova_058.archive_hidden_review();

create function public.assignment_review_audio_upload_058(
  p_action text,p_actor_id uuid,p_session_id uuid,p_choir_id uuid,p_retry_key uuid,
  p_metadata jsonb default null,p_bucket text default null,p_lease uuid default null,p_sha256 text default null
) returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare u genova_058.uploads%rowtype; actor_member uuid; chef boolean; submission public.assignment_submissions%rowtype;
  private_note public.assignment_submission_private_notes%rowtype; acquired boolean:=false; object_key text;
  next_version integer; commit_time timestamptz; note_value text; public_history jsonb; private_history jsonb;
  result_submission public.assignment_submissions%rowtype;
begin
  if p_action not in ('reserve','commit','cleanup','failed') or p_action is null
    or p_actor_id is null or p_retry_key is null then raise exception 'Invalid review upload operation' using errcode='22023'; end if;
  if p_action='reserve' then
    if p_metadata is null or jsonb_typeof(p_metadata)<>'object'
      or not (p_metadata ?& array['submissionId','fileName','mimeType','size','status','reviewerNote'])
      or (select count(*) from jsonb_object_keys(p_metadata))<>6
      or coalesce(p_metadata->>'submissionId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(length(p_metadata->>'fileName'),0) not between 1 and 255
      or (p_metadata->>'fileName') ~ '[[:cntrl:]/\\]'
      or lower(coalesce(p_metadata->>'mimeType','')) not in
        ('audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/aac','audio/ogg','audio/webm','audio/flac')
      or coalesce(p_metadata->>'size','') !~ '^[0-9]{1,8}$'
      or coalesce((p_metadata->>'size')::bigint,0) not between 1 and 20971520
      or p_metadata->>'status' not in ('approved','rejected')
      or (p_metadata->'reviewerNote'<>'null'::jsonb and jsonb_typeof(p_metadata->'reviewerNote')<>'string')
      or coalesce(length(p_metadata->>'reviewerNote'),0)>1200
      or p_bucket is null or p_bucket !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' then
      raise exception 'Invalid review upload metadata' using errcode='22023';
    end if;
    select * into actor_member,chef from genova_058.authorize_reviewer(
      p_actor_id,p_session_id,p_choir_id,(p_metadata->>'submissionId')::uuid,false);
    select s.* into submission from public.assignment_submissions s
      where s.id=(p_metadata->>'submissionId')::uuid and s.choir_id=p_choir_id;
    insert into genova_058.uploads(actor_id,retry_key,choir_id,actor_member_id,submission_id,
      assignment_id,target_member_id,metadata,bucket)
      values(p_actor_id,p_retry_key,p_choir_id,actor_member,submission.id,submission.assignment_id,
        submission.member_id,p_metadata,p_bucket)
      on conflict(actor_id,retry_key) do nothing returning * into u;
    acquired:=found;
  end if;
  select * into u from genova_058.uploads where actor_id=p_actor_id and retry_key=p_retry_key for update;
  if not found or u.choir_id is distinct from p_choir_id then
    raise exception 'Review upload reservation not found' using errcode='42501';
  end if;
  object_key:='choirs/'||u.choir_id||'/assignments/'||u.assignment_id||'/submissions/'||u.submission_id||
    '/reviews/'||u.version_id||'/content';
  if p_action='reserve' then
    if u.metadata is distinct from p_metadata or u.bucket is distinct from p_bucket then
      raise exception 'Review upload retry conflict' using errcode='23505';
    end if;
    if u.state='failed' then
      update genova_058.uploads set state='uploading',lease=gen_random_uuid(),updated_at=now()
        where actor_id=p_actor_id and retry_key=p_retry_key returning * into u; acquired:=true;
    end if;
  else
    if p_lease is null or p_lease<>u.lease then raise exception 'Review upload lease conflict' using errcode='23505'; end if;
    if p_action='commit' and u.state='uploading' then
      if coalesce(p_sha256,'') !~ '^[0-9a-f]{64}$' then raise exception 'Invalid verified digest' using errcode='22023'; end if;
      select * into actor_member,chef from genova_058.authorize_reviewer(
        p_actor_id,p_session_id,p_choir_id,u.submission_id,false);
      if actor_member<>u.actor_member_id then raise exception 'Review access denied' using errcode='42501'; end if;
      perform pg_advisory_xact_lock(hashtextextended(u.submission_id::text,58));
      select * into submission from public.assignment_submissions s where s.id=u.submission_id and s.choir_id=u.choir_id for update;
      if not found then raise exception 'Submission unavailable' using errcode='42501'; end if;
      select * into private_note from public.assignment_submission_private_notes p where p.submission_id=u.submission_id for update;
      commit_time:=now(); note_value:=nullif(btrim(coalesce(u.metadata->>'reviewerNote','')),'');
      public_history:=coalesce(submission.reviewer_note_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object(
        'action','reviewer_note_updated','changed_at',commit_time,'changed_by',actor_member,
        'previous_note_length',coalesce(length(submission.reviewer_note),0),'next_note_length',coalesce(length(note_value),0),
        'audio_changed',true));
      private_history:=coalesce(private_note.note_history_json,'[]'::jsonb)||jsonb_build_array(jsonb_build_object(
        'action','reviewer_note_updated','changed_at',commit_time,'changed_by',actor_member,
        'previous_note',coalesce(private_note.reviewer_note,submission.reviewer_note),'next_note',note_value,
        'previous_audio_file_version_id',coalesce(private_note.reviewer_audio_file_version_id,submission.reviewer_audio_file_version_id),
        'next_audio_file_version_id',u.version_id));
      select coalesce(max(v.version_number),0)+1 into next_version from public.assignment_review_audio_versions v
        where v.submission_id=u.submission_id;
      insert into public.assignment_review_audio_versions(id,choir_id,submission_id,assignment_id,member_id,
        created_by,version_number,provider,bucket,object_key,content_length,mime_type,sha256_hex,file_name)
        values(u.version_id,u.choir_id,u.submission_id,u.assignment_id,u.target_member_id,actor_member,next_version,
          'r2',u.bucket,object_key,(u.metadata->>'size')::bigint,lower(u.metadata->>'mimeType'),p_sha256,u.metadata->>'fileName');
      insert into public.assignment_submission_private_notes(submission_id,choir_id,assignment_id,member_id,reviewer_note,
        reviewer_audio_file_version_id,reviewer_audio_drive_file_id,reviewer_audio_file_name,
        reviewer_audio_mime_type,reviewer_audio_file_size_bytes,note_history_json,is_hidden,last_hidden_by,
        last_hidden_at,last_updated_by,last_updated_at)
        values(submission.id,u.choir_id,submission.assignment_id,submission.member_id,note_value,u.version_id,'r2_review_'||u.version_id,
          u.metadata->>'fileName',lower(u.metadata->>'mimeType'),(u.metadata->>'size')::bigint,private_history,
          submission.is_reviewer_note_hidden,private_note.last_hidden_by,private_note.last_hidden_at,actor_member,commit_time)
        on conflict(submission_id) do update set reviewer_note=excluded.reviewer_note,
          reviewer_audio_file_version_id=excluded.reviewer_audio_file_version_id,
          reviewer_audio_drive_file_id=excluded.reviewer_audio_drive_file_id,
          reviewer_audio_file_name=excluded.reviewer_audio_file_name,
          reviewer_audio_mime_type=excluded.reviewer_audio_mime_type,
          reviewer_audio_file_size_bytes=excluded.reviewer_audio_file_size_bytes,
          note_history_json=excluded.note_history_json,is_hidden=excluded.is_hidden,
          last_updated_by=excluded.last_updated_by,last_updated_at=excluded.last_updated_at;
      update public.assignment_submissions set status=u.metadata->>'status',updated_at=commit_time,
        approved_at=commit_time,approved_by=actor_member,reviewer_note_history=public_history,
        reviewer_note=case when is_reviewer_note_hidden then null else note_value end,
        reviewer_audio_file_version_id=case when is_reviewer_note_hidden then null else u.version_id end,
        reviewer_audio_drive_file_id=case when is_reviewer_note_hidden then null else 'r2_review_'||u.version_id end,
        reviewer_audio_file_name=case when is_reviewer_note_hidden then null else u.metadata->>'fileName' end,
        reviewer_audio_mime_type=case when is_reviewer_note_hidden then null else lower(u.metadata->>'mimeType') end,
        reviewer_audio_file_size_bytes=case when is_reviewer_note_hidden then null else (u.metadata->>'size')::bigint end
        where id=u.submission_id returning * into result_submission;
      insert into public.assignment_submission_audit_logs(choir_id,assignment_id,submission_id,member_id,
        actor_member_id,event_type,event_payload) values(u.choir_id,u.assignment_id,u.submission_id,u.target_member_id,
        actor_member,'submission_reviewed',jsonb_build_object('previous_status',submission.status,
          'next_status',u.metadata->>'status','reviewer_note_changed',true,'reviewer_audio_changed',true,
          'previous_hidden',submission.is_reviewer_note_hidden,'next_hidden',submission.is_reviewer_note_hidden,
          'next_audio_file_version_id',u.version_id));
      update genova_058.uploads set state='committed',updated_at=now()
        where actor_id=p_actor_id and retry_key=p_retry_key returning * into u;
    elsif p_action='cleanup' and u.state='uploading' then
      update genova_058.uploads set state='cleanup',updated_at=now() where actor_id=p_actor_id and retry_key=p_retry_key returning * into u;
    elsif p_action='failed' and u.state='cleanup' then
      update genova_058.uploads set state='failed',updated_at=now() where actor_id=p_actor_id and retry_key=p_retry_key returning * into u;
    elsif u.state<>'committed' then raise exception 'Review upload state conflict' using errcode='23505'; end if;
  end if;
  if u.state='committed' then
    select * into result_submission from public.assignment_submissions where id=u.submission_id and choir_id=u.choir_id;
    return jsonb_build_object('state','committed','submission',to_jsonb(result_submission),'fileVersionId',u.version_id);
  end if;
  return jsonb_build_object('state',case when p_action='reserve' and not acquired then 'pending' else u.state end,
    'submissionId',u.submission_id,'assignmentId',u.assignment_id,'fileVersionId',u.version_id,'choirId',u.choir_id,'bucket',u.bucket,
    'objectKey',object_key,'lease',case when acquired or p_action<>'reserve' then u.lease else null end);
end;
$fn$;
revoke all on function public.assignment_review_audio_upload_058(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)
  from public,anon,authenticated,service_role;
grant execute on function public.assignment_review_audio_upload_058(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)
  to service_role;

create function public.set_assignment_review_visibility_058(
  p_actor_id uuid,p_choir_id uuid,p_submission_id uuid,p_hidden boolean
) returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare actor_member uuid; chef boolean; submission public.assignment_submissions%rowtype;
  private_note public.assignment_submission_private_notes%rowtype; now_at timestamptz:=now(); public_history jsonb; private_history jsonb;
begin
  select * into actor_member,chef from genova_058.authorize_reviewer(p_actor_id,null,p_choir_id,p_submission_id,true);
  perform pg_advisory_xact_lock(hashtextextended(p_submission_id::text,58));
  select * into submission from public.assignment_submissions where id=p_submission_id and choir_id=p_choir_id for update;
  if submission.is_reviewer_note_hidden=p_hidden then return to_jsonb(submission); end if;
  select * into private_note from public.assignment_submission_private_notes where submission_id=p_submission_id for update;
  public_history:=coalesce(submission.reviewer_note_history,'[]'::jsonb)||jsonb_build_array(jsonb_build_object(
    'action',case when p_hidden then 'reviewer_note_hidden' else 'reviewer_note_unhidden' end,
    'changed_at',now_at,'changed_by',actor_member));
  private_history:=coalesce(private_note.note_history_json,'[]'::jsonb)||jsonb_build_array(jsonb_build_object(
    'action',case when p_hidden then 'reviewer_note_hidden' else 'reviewer_note_unhidden' end,
    'changed_at',now_at,'changed_by',actor_member));
  insert into public.assignment_submission_private_notes(submission_id,choir_id,assignment_id,member_id,reviewer_note,
    reviewer_audio_file_version_id,reviewer_audio_drive_file_id,reviewer_audio_file_name,
    reviewer_audio_mime_type,reviewer_audio_file_size_bytes,note_history_json,is_hidden,last_hidden_by,
    last_hidden_at,last_updated_by,last_updated_at)
    values(submission.id,p_choir_id,submission.assignment_id,submission.member_id,
      coalesce(private_note.reviewer_note,submission.reviewer_note),
      coalesce(private_note.reviewer_audio_file_version_id,submission.reviewer_audio_file_version_id),
      coalesce(private_note.reviewer_audio_drive_file_id,submission.reviewer_audio_drive_file_id),
      coalesce(private_note.reviewer_audio_file_name,submission.reviewer_audio_file_name),
      coalesce(private_note.reviewer_audio_mime_type,submission.reviewer_audio_mime_type),
      coalesce(private_note.reviewer_audio_file_size_bytes,submission.reviewer_audio_file_size_bytes),
      private_history,p_hidden,case when p_hidden then actor_member else private_note.last_hidden_by end,
      case when p_hidden then now_at else private_note.last_hidden_at end,actor_member,now_at)
    on conflict(submission_id) do update set reviewer_note=excluded.reviewer_note,
      reviewer_audio_file_version_id=excluded.reviewer_audio_file_version_id,
      reviewer_audio_drive_file_id=excluded.reviewer_audio_drive_file_id,
      reviewer_audio_file_name=excluded.reviewer_audio_file_name,
      reviewer_audio_mime_type=excluded.reviewer_audio_mime_type,
      reviewer_audio_file_size_bytes=excluded.reviewer_audio_file_size_bytes,
      note_history_json=excluded.note_history_json,is_hidden=excluded.is_hidden,
      last_hidden_by=excluded.last_hidden_by,last_hidden_at=excluded.last_hidden_at,
      last_updated_by=excluded.last_updated_by,last_updated_at=excluded.last_updated_at;
  update public.assignment_submissions set reviewer_note=case when p_hidden then null else
      coalesce(private_note.reviewer_note,submission.reviewer_note) end,
    reviewer_audio_file_version_id=case when p_hidden then null else
      coalesce(private_note.reviewer_audio_file_version_id,submission.reviewer_audio_file_version_id) end,
    reviewer_audio_drive_file_id=case when p_hidden then null else
      coalesce(private_note.reviewer_audio_drive_file_id,submission.reviewer_audio_drive_file_id) end,
    reviewer_audio_file_name=case when p_hidden then null else
      coalesce(private_note.reviewer_audio_file_name,submission.reviewer_audio_file_name) end,
    reviewer_audio_mime_type=case when p_hidden then null else
      coalesce(private_note.reviewer_audio_mime_type,submission.reviewer_audio_mime_type) end,
    reviewer_audio_file_size_bytes=case when p_hidden then null else
      coalesce(private_note.reviewer_audio_file_size_bytes,submission.reviewer_audio_file_size_bytes) end,
    reviewer_note_history=public_history,is_reviewer_note_hidden=p_hidden,
    hidden_by=case when p_hidden then actor_member else null end,hidden_at=case when p_hidden then now_at else null end,
    updated_at=now_at where id=p_submission_id returning * into submission;
  insert into public.assignment_submission_audit_logs(choir_id,assignment_id,submission_id,member_id,
    actor_member_id,event_type,event_payload) values(p_choir_id,submission.assignment_id,submission.id,
    submission.member_id,actor_member,case when p_hidden then 'reviewer_note_hidden' else 'reviewer_note_unhidden' end,
    jsonb_build_object('hidden',p_hidden));
  return to_jsonb(submission);
end;
$fn$;
revoke all on function public.set_assignment_review_visibility_058(uuid,uuid,uuid,boolean)
  from public,anon,authenticated,service_role;
grant execute on function public.set_assignment_review_visibility_058(uuid,uuid,uuid,boolean) to service_role;

create function public.claim_assignment_review_notification_058(
  p_actor_id uuid,p_choir_id uuid,p_submission_id uuid,p_file_version_id uuid
) returns boolean language plpgsql security definer set search_path = '' as $fn$
declare claimed boolean;
begin
  perform 1 from genova_058.uploads u
    join public.assignment_submissions s on s.id=u.submission_id and s.choir_id=u.choir_id
    where u.actor_id=p_actor_id and u.choir_id=p_choir_id and u.submission_id=p_submission_id
      and u.version_id=p_file_version_id and u.state='committed' and (
        s.reviewer_audio_file_version_id=p_file_version_id or (
          s.is_reviewer_note_hidden and exists(
            select 1 from public.assignment_submission_private_notes p
            where p.submission_id=s.id and p.reviewer_audio_file_version_id=p_file_version_id
          )
        )
      );
  if not found then raise exception 'Review notification claim denied' using errcode='42501'; end if;
  insert into genova_058.notification_claims(file_version_id,actor_id,choir_id,submission_id)
    values(p_file_version_id,p_actor_id,p_choir_id,p_submission_id) on conflict(file_version_id) do nothing;
  claimed:=found; return claimed;
end;
$fn$;
revoke all on function public.claim_assignment_review_notification_058(uuid,uuid,uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.claim_assignment_review_notification_058(uuid,uuid,uuid,uuid) to service_role;

notify pgrst,'reload schema';
commit;
