-- 057: immutable private assignment file versions and an atomic current pointer.
begin;
select pg_advisory_xact_lock(hashtext('genovakorist:057:private-r2-assignment-versions'));

create schema genova_057;
revoke all on schema genova_057 from public, anon, authenticated, service_role;

create table genova_057.uploads (
  actor_id uuid not null,
  retry_key uuid not null,
  choir_id uuid not null,
  member_id uuid not null,
  assignment_id uuid not null,
  submission_id uuid not null default gen_random_uuid(),
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
-- No cascading foreign keys: uncertain provider outcomes must remain visible for reconciliation.
alter table genova_057.uploads enable row level security;
alter table genova_057.uploads force row level security;
revoke all on table genova_057.uploads from public, anon, authenticated, service_role;

create table genova_057.notification_claims (
  file_version_id uuid primary key,
  actor_id uuid not null,
  choir_id uuid not null,
  submission_id uuid not null,
  claimed_at timestamptz not null default now()
);
alter table genova_057.notification_claims enable row level security;
alter table genova_057.notification_claims force row level security;
revoke all on table genova_057.notification_claims from public, anon, authenticated, service_role;

create table public.assignment_submission_file_versions (
  id uuid primary key,
  choir_id uuid not null references public.choirs(id),
  submission_id uuid not null references public.assignment_submissions(id) on delete restrict,
  assignment_id uuid not null references public.assignments(id) on delete restrict,
  member_id uuid not null references public.choir_members(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  provider text not null check (provider = 'r2'),
  bucket text not null check (bucket ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  object_key text not null check (length(object_key) between 1 and 1024),
  content_length bigint not null check (content_length between 1 and 52428800),
  mime_type text not null check (length(mime_type) between 1 and 127),
  sha256_hex text not null check (sha256_hex ~ '^[0-9a-f]{64}$'),
  file_name text not null check (length(file_name) between 1 and 255),
  created_at timestamptz not null default now(),
  unique (submission_id, version_number),
  unique (bucket, object_key)
);
create index assignment_file_versions_owner_created_idx
  on public.assignment_submission_file_versions (assignment_id, member_id, created_at desc);

alter table public.assignment_submission_file_versions enable row level security;
alter table public.assignment_submission_file_versions force row level security;
revoke all on table public.assignment_submission_file_versions from public, anon, authenticated;
grant select on table public.assignment_submission_file_versions to authenticated;
grant select on table public.assignment_submission_file_versions to service_role;

create policy assignment_submission_file_versions_select
on public.assignment_submission_file_versions
for select to authenticated
using (
  choir_id = public.current_choir_id()
  and (
    member_id = (
      select cm.id from public.choir_members cm
      where cm.auth_user_id = auth.uid() and cm.choir_id = assignment_submission_file_versions.choir_id
      limit 1
    )
    or public.current_member_has_role('Şef')
    or (
      public.current_member_has_role('Partisyon Şefi')
      and exists (
        select 1
        from public.choir_members me
        join public.choir_members target_cm on target_cm.id = assignment_submission_file_versions.member_id
        where me.auth_user_id = auth.uid()
          and me.choir_id = assignment_submission_file_versions.choir_id
          and target_cm.choir_id = assignment_submission_file_versions.choir_id
          and me.is_active and target_cm.is_active
          and me.voice_group is not null
          and target_cm.voice_group = me.voice_group
      )
    )
  )
);

create function genova_057.refuse_version_mutation()
returns trigger language plpgsql set search_path = '' as $fn$
begin
  raise exception 'Assignment file versions are immutable' using errcode = '55000';
end;
$fn$;
create trigger assignment_submission_file_versions_immutable
before update on public.assignment_submission_file_versions
for each row execute function genova_057.refuse_version_mutation();

alter table public.assignment_submissions
  add column current_file_version_id uuid
    references public.assignment_submission_file_versions(id) on delete restrict;
alter table public.assignment_submission_history
  add column file_version_id uuid
    references public.assignment_submission_file_versions(id) on delete restrict;
create index assignment_submission_history_file_version_idx
  on public.assignment_submission_history (file_version_id)
  where file_version_id is not null;

create function genova_057.authorize_submitter(
  actor_id uuid, session_id uuid, choir_id uuid, assignment_id uuid
) returns uuid language plpgsql security invoker set search_path = '' as $fn$
declare
  selected_choir uuid;
  submitter_member_id uuid;
begin
  if actor_id is null or choir_id is null or assignment_id is null then
    raise exception 'Submission access denied' using errcode = '42501';
  end if;
  select s.choir_id into selected_choir
    from genova_005.active_choir_sessions s
    join public.choir_members m
      on m.auth_user_id = s.auth_user_id and m.choir_id = s.choir_id and m.is_active
    where s.session_id = authorize_submitter.session_id and s.auth_user_id = actor_id;
  if selected_choir is null then
    select case when count(*) = 1 then (array_agg(m.choir_id))[1] end into selected_choir
      from public.choir_members m where m.auth_user_id = actor_id and m.is_active;
  end if;
  if selected_choir is distinct from choir_id then
    raise exception 'Submission access denied' using errcode = '42501';
  end if;
  select m.id into submitter_member_id from public.choir_members m
    where m.auth_user_id = actor_id and m.choir_id = authorize_submitter.choir_id and m.is_active
    limit 1 for share;
  if submitter_member_id is null then
    raise exception 'Submission access denied' using errcode = '42501';
  end if;
  perform 1 from public.assignments a
    where a.id = authorize_submitter.assignment_id and a.choir_id = authorize_submitter.choir_id
      and a.is_active and not a.is_locked
    for share;
  if not found then
    raise exception 'Assignment is unavailable' using errcode = '42501';
  end if;
  perform 1 from public.assignment_targets t
    where t.assignment_id = authorize_submitter.assignment_id
      and t.member_id = submitter_member_id and t.choir_id = authorize_submitter.choir_id
    for share;
  if not found then
    raise exception 'Submission access denied' using errcode = '42501';
  end if;
  return submitter_member_id;
end;
$fn$;
revoke all on function genova_057.authorize_submitter(uuid,uuid,uuid,uuid)
  from public, anon, authenticated, service_role;

create function public.assignment_submission_upload_057(
  p_action text, p_actor_id uuid, p_session_id uuid, p_choir_id uuid,
  p_retry_key uuid, p_metadata jsonb default null, p_bucket text default null,
  p_lease uuid default null, p_sha256 text default null
) returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare
  u genova_057.uploads%rowtype;
  submitter_id uuid;
  current_submission public.assignment_submissions%rowtype;
  result_submission public.assignment_submissions%rowtype;
  existing_submission_id uuid;
  acquired boolean := false;
  object_key text;
  next_version integer;
  commit_time timestamptz;
  note_value text;
  had_previous boolean := false;
begin
  if p_action not in ('reserve','commit','cleanup','failed') or p_action is null
    or p_actor_id is null or p_retry_key is null then
    raise exception 'Invalid submission upload operation' using errcode = '22023';
  end if;
  if p_action = 'reserve' then
    if p_metadata is null or jsonb_typeof(p_metadata) <> 'object'
      or not (p_metadata ?& array['assignmentId','fileName','mimeType','size','note'])
      or (select count(*) from jsonb_object_keys(p_metadata)) <> 5
      or coalesce(p_metadata->>'assignmentId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(length(p_metadata->>'fileName'),0) not between 1 and 255
      or (p_metadata->>'fileName') ~ '[[:cntrl:]/\\]'
      or (p_metadata->>'fileName') ~* '\.(html?|xhtml?|svgz?|xml|xsl|xslt|js|mjs)$'
      or coalesce(length(p_metadata->>'mimeType'),0) not between 1 and 127
      or (p_metadata->>'mimeType') ~ '[[:cntrl:]]'
      or lower(p_metadata->>'mimeType') in
        ('application/ecmascript','application/javascript','application/xhtml+xml','application/xml',
         'image/svg+xml','text/ecmascript','text/html','text/javascript','text/xml')
      or lower(p_metadata->>'mimeType') like '%+xml'
      or coalesce(p_metadata->>'size','') !~ '^[0-9]{1,8}$'
      or coalesce((p_metadata->>'size')::bigint,0) not between 1 and 52428800
      or (p_metadata->'note' <> 'null'::jsonb and jsonb_typeof(p_metadata->'note') <> 'string')
      or coalesce(length(p_metadata->>'note'),0) > 1200
      or p_bucket is null or p_bucket !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' then
      raise exception 'Invalid submission upload metadata' using errcode = '22023';
    end if;
    submitter_id := genova_057.authorize_submitter(
      p_actor_id,p_session_id,p_choir_id,(p_metadata->>'assignmentId')::uuid);
    select s.id into existing_submission_id from public.assignment_submissions s
      where s.assignment_id=(p_metadata->>'assignmentId')::uuid
        and s.member_id=submitter_id and s.choir_id=p_choir_id;
    insert into genova_057.uploads
      (actor_id,retry_key,choir_id,member_id,assignment_id,submission_id,metadata,bucket)
      values (p_actor_id,p_retry_key,p_choir_id,submitter_id,(p_metadata->>'assignmentId')::uuid,
        coalesce(existing_submission_id,gen_random_uuid()),p_metadata,p_bucket)
      on conflict(actor_id,retry_key) do nothing returning * into u;
    acquired := found;
  end if;
  select * into u from genova_057.uploads
    where actor_id=p_actor_id and retry_key=p_retry_key for update;
  if not found or u.choir_id is distinct from p_choir_id then
    raise exception 'Submission upload reservation not found' using errcode = '42501';
  end if;
  object_key := 'choirs/'||u.choir_id||'/assignments/'||u.assignment_id||
    '/submissions/'||u.version_id||'/content';
  if p_action = 'reserve' then
    if u.metadata is distinct from p_metadata or u.bucket is distinct from p_bucket then
      raise exception 'Submission upload retry conflict' using errcode = '23505';
    end if;
    if u.state='failed' then
      update genova_057.uploads set state='uploading',lease=gen_random_uuid(),updated_at=now()
        where actor_id=p_actor_id and retry_key=p_retry_key returning * into u;
      acquired := true;
    end if;
  else
    if p_lease is null or p_lease <> u.lease then
      raise exception 'Submission upload lease conflict' using errcode = '23505';
    end if;
    if p_action='commit' and u.state='uploading' then
      if coalesce(p_sha256,'') !~ '^[0-9a-f]{64}$' then
        raise exception 'Invalid verified digest' using errcode = '22023';
      end if;
      submitter_id := genova_057.authorize_submitter(
        p_actor_id,p_session_id,p_choir_id,u.assignment_id);
      if submitter_id <> u.member_id then
        raise exception 'Submission access denied' using errcode = '42501';
      end if;
      perform pg_advisory_xact_lock(hashtextextended(u.assignment_id::text||':'||u.member_id::text,0));
      select * into current_submission from public.assignment_submissions s
        where s.assignment_id=u.assignment_id and s.member_id=u.member_id and s.choir_id=u.choir_id
        for update;
      had_previous := found;
      commit_time := now();
      note_value := nullif(btrim(coalesce(u.metadata->>'note','')),'');
      if had_previous then
        update genova_057.uploads set submission_id=current_submission.id,updated_at=now()
          where actor_id=p_actor_id and retry_key=p_retry_key returning * into u;
        insert into public.assignment_submission_history (
          choir_id,assignment_id,member_id,source_submission_id,file_version_id,
          drive_file_id,drive_web_view_link,drive_download_link,file_name,mime_type,file_size_bytes,
          drive_member_folder_id,submitted_at,updated_at,status,submission_note,reviewer_note,
          reviewer_audio_drive_file_id,reviewer_audio_file_name,reviewer_audio_mime_type,
          reviewer_audio_file_size_bytes,approved_at,approved_by,archive_reason
        ) values (
          current_submission.choir_id,current_submission.assignment_id,current_submission.member_id,
          current_submission.id,current_submission.current_file_version_id,current_submission.drive_file_id,
          current_submission.drive_web_view_link,current_submission.drive_download_link,
          current_submission.file_name,current_submission.mime_type,current_submission.file_size_bytes,
          current_submission.drive_member_folder_id,current_submission.submitted_at,current_submission.updated_at,
          current_submission.status,current_submission.submission_note,current_submission.reviewer_note,
          current_submission.reviewer_audio_drive_file_id,current_submission.reviewer_audio_file_name,
          current_submission.reviewer_audio_mime_type,current_submission.reviewer_audio_file_size_bytes,
          current_submission.approved_at,current_submission.approved_by,'resubmitted'
        );
        delete from public.assignment_submission_private_notes where submission_id=current_submission.id;
      else
        insert into public.assignment_submissions (
          id,choir_id,assignment_id,member_id,drive_file_id,drive_web_view_link,drive_download_link,
          file_name,mime_type,file_size_bytes,drive_member_folder_id,submitted_at,updated_at,status,
          submission_note,reviewer_note,reviewer_audio_drive_file_id,reviewer_audio_file_name,
          reviewer_audio_mime_type,reviewer_audio_file_size_bytes,is_reviewer_note_hidden,
          reviewer_note_history,submission_note_history,hidden_by,hidden_at,approved_at,approved_by
        ) values (
          u.submission_id,u.choir_id,u.assignment_id,u.member_id,'r2_'||u.version_id,null,null,
          u.metadata->>'fileName',u.metadata->>'mimeType',(u.metadata->>'size')::bigint,null,
          commit_time,commit_time,'pending',note_value,null,null,null,null,null,false,'[]'::jsonb,
          case when note_value is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object(
            'action','submission_note_updated','changed_at',commit_time,'changed_by',u.member_id,
            'previous_note',null,'next_note',note_value)) end,null,null,null,null
        ) returning * into current_submission;
      end if;
      select coalesce(max(v.version_number),0)+1 into next_version
        from public.assignment_submission_file_versions v where v.submission_id=u.submission_id;
      insert into public.assignment_submission_file_versions (
        id,choir_id,submission_id,assignment_id,member_id,version_number,provider,bucket,object_key,
        content_length,mime_type,sha256_hex,file_name
      ) values (
        u.version_id,u.choir_id,u.submission_id,u.assignment_id,u.member_id,next_version,'r2',u.bucket,
        object_key,(u.metadata->>'size')::bigint,u.metadata->>'mimeType',p_sha256,u.metadata->>'fileName'
      );
      update public.assignment_submissions set
        current_file_version_id=u.version_id,drive_file_id='r2_'||u.version_id,
        drive_web_view_link=null,drive_download_link=null,file_name=u.metadata->>'fileName',
        mime_type=u.metadata->>'mimeType',file_size_bytes=(u.metadata->>'size')::bigint,
        drive_member_folder_id=null,submitted_at=commit_time,updated_at=commit_time,status='pending',
        submission_note=note_value,reviewer_note=null,reviewer_audio_drive_file_id=null,
        reviewer_audio_file_name=null,reviewer_audio_mime_type=null,reviewer_audio_file_size_bytes=null,
        is_reviewer_note_hidden=false,reviewer_note_history='[]'::jsonb,
        submission_note_history=case when note_value is null then '[]'::jsonb else
          jsonb_build_array(jsonb_build_object('action','submission_note_updated','changed_at',commit_time,
            'changed_by',u.member_id,'previous_note',null,'next_note',note_value)) end,
        hidden_by=null,hidden_at=null,approved_at=null,approved_by=null
        where id=u.submission_id returning * into result_submission;
      insert into public.assignment_submission_audit_logs
        (choir_id,assignment_id,submission_id,member_id,actor_member_id,event_type,event_payload)
        values (u.choir_id,u.assignment_id,u.submission_id,u.member_id,u.member_id,
          case when had_previous then 'submission_resubmitted' else 'submission_submitted' end,
          jsonb_build_object('had_previous_submission',had_previous,
            'file_version_id',u.version_id));
      update genova_057.uploads set state='committed',updated_at=now()
        where actor_id=p_actor_id and retry_key=p_retry_key returning * into u;
    elsif p_action='cleanup' and u.state='uploading' then
      update genova_057.uploads set state='cleanup',updated_at=now()
        where actor_id=p_actor_id and retry_key=p_retry_key returning * into u;
    elsif p_action='failed' and u.state='cleanup' then
      update genova_057.uploads set state='failed',updated_at=now()
        where actor_id=p_actor_id and retry_key=p_retry_key returning * into u;
    elsif u.state<>'committed' then
      raise exception 'Submission upload state conflict' using errcode = '23505';
    end if;
  end if;
  if u.state='committed' then
    select * into result_submission from public.assignment_submissions
      where id=u.submission_id and choir_id=u.choir_id;
    if not found then raise exception 'Committed submission unavailable' using errcode='23505'; end if;
    return jsonb_build_object('state','committed','submission',to_jsonb(result_submission),
      'fileVersionId',u.version_id);
  end if;
  return jsonb_build_object('state',case when p_action='reserve' and not acquired then 'pending' else u.state end,
    'submissionId',u.submission_id,'fileVersionId',u.version_id,'choirId',u.choir_id,
    'bucket',u.bucket,'objectKey',object_key,
    'lease',case when acquired or p_action<>'reserve' then u.lease else null end);
end;
$fn$;

revoke all on function public.assignment_submission_upload_057(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)
  from public, anon, authenticated, service_role;
grant execute on function public.assignment_submission_upload_057(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)
  to service_role;
comment on function public.assignment_submission_upload_057(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text) is
  '057 Edge-only assignment upload transaction. Provider readback precedes immutable version insert and atomic current-pointer change.';

create function public.claim_assignment_notification_057(
  p_actor_id uuid, p_choir_id uuid, p_submission_id uuid, p_file_version_id uuid
) returns boolean language plpgsql security definer set search_path = '' as $fn$
declare claimed boolean;
begin
  if p_actor_id is null or p_choir_id is null or p_submission_id is null or p_file_version_id is null then
    raise exception 'Invalid notification claim' using errcode='22023';
  end if;
  perform 1 from public.assignment_submissions s
    join public.choir_members m on m.id=s.member_id and m.choir_id=s.choir_id
    where s.id=p_submission_id and s.choir_id=p_choir_id
      and s.current_file_version_id=p_file_version_id and m.auth_user_id=p_actor_id and m.is_active
    for share of s,m;
  if not found then raise exception 'Notification claim denied' using errcode='42501'; end if;
  insert into genova_057.notification_claims(file_version_id,actor_id,choir_id,submission_id)
    values(p_file_version_id,p_actor_id,p_choir_id,p_submission_id)
    on conflict(file_version_id) do nothing;
  claimed := found;
  return claimed;
end;
$fn$;
revoke all on function public.claim_assignment_notification_057(uuid,uuid,uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.claim_assignment_notification_057(uuid,uuid,uuid,uuid) to service_role;
comment on function public.claim_assignment_notification_057(uuid,uuid,uuid,uuid) is
  '057 service-only one-shot compatibility push claim for an exact owned current file version.';

notify pgrst,'reload schema';
commit;
