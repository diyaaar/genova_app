-- 065: atomically bind a current 063 snapshot to verified 062 copy evidence.
-- This migration performs no provider request. The public entrypoint is service-role only.
begin;
select pg_advisory_xact_lock(hashtext('genovakorist:065:private-r2-activation'));

do $preflight$
begin
  if to_regnamespace('genova_065') is not null
    or to_regprocedure('public.private_r2_activate_065(uuid,uuid,text,jsonb,jsonb,jsonb)') is not null then
    raise exception '065 refused: activation objects already exist';
  end if;
  if to_regprocedure('public.private_r2_copy_inventory_063(uuid,text)') is null
    or to_regclass('public.repertoire_file_storage_locations') is null
    or to_regclass('public.assignment_submission_file_versions') is null
    or to_regclass('public.assignment_review_audio_versions') is null
    or to_regclass('public.repertoire_comment_audio_versions') is null
    or to_regclass('public.chat_media_versions') is null
    or to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception '065 requires the accepted 053-063 private storage chain';
  end if;
end;
$preflight$;

create schema genova_065;
revoke all on schema genova_065 from public,anon,authenticated,service_role;

create table genova_065.activation_runs(
  request_id uuid primary key,
  choir_id uuid not null references public.choirs(id) on delete restrict,
  bucket text not null check(bucket ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  project_ref text not null check(project_ref ~ '^[a-z]{20}$'),
  inventory_fingerprint text not null check(inventory_fingerprint ~ '^[0-9a-f]{64}$'),
  manifest_sha256_hex text not null check(manifest_sha256_hex ~ '^[0-9a-f]{64}$'),
  snapshot_sha256_hex text not null check(snapshot_sha256_hex ~ '^[0-9a-f]{64}$'),
  report_sha256_hex text not null check(report_sha256_hex ~ '^[0-9a-f]{64}$'),
  journal_sha256_hex text not null check(journal_sha256_hex ~ '^[0-9a-f]{64}$'),
  activated_item_count integer not null check(activated_item_count>0),
  result jsonb not null,
  committed_at timestamptz not null default clock_timestamp()
);
alter table genova_065.activation_runs enable row level security;
alter table genova_065.activation_runs force row level security;
revoke all on table genova_065.activation_runs from public,anon,authenticated,service_role;

create table genova_065.activation_items(
  request_id uuid not null references genova_065.activation_runs(request_id) on delete restrict,
  item_id uuid not null,
  choir_id uuid not null,
  family text not null check(family in('repertoire-file','assignment-submission','assignment-review',
    'repertoire-comment','chat-message-image','chat-room-avatar')),
  source_owner text not null,
  source_row_id uuid not null,
  source_slot text not null,
  source_version text not null,
  legacy_file_id text not null,
  destination_version_id uuid not null,
  destination_batch_id uuid,
  destination_bucket text not null,
  destination_object_key text not null,
  content_length bigint not null,
  mime_type text not null,
  file_name text not null,
  sha256_hex text not null check(sha256_hex ~ '^[0-9a-f]{64}$'),
  manifest_fingerprint text not null check(manifest_fingerprint ~ '^[0-9a-f]{64}$'),
  verified_at timestamptz not null,
  primary key(request_id,item_id),
  unique(request_id,source_owner,source_row_id,source_slot,source_version),
  unique(request_id,destination_bucket,destination_object_key)
);
alter table genova_065.activation_items enable row level security;
alter table genova_065.activation_items force row level security;
revoke all on table genova_065.activation_items from public,anon,authenticated,service_role;

create function public.private_r2_activate_065(
  p_request_id uuid,
  p_choir_id uuid,
  p_bucket text,
  p_snapshot jsonb,
  p_report jsonb,
  p_journal jsonb
) returns jsonb
language plpgsql volatile security definer set search_path=''
as $fn$
declare
  existing genova_065.activation_runs%rowtype;
  snapshot_hash text;
  report_hash text;
  journal_hash text;
  current_snapshot jsonb;
  supplied_snapshot jsonb;
  status_counts jsonb;
  excluded_rows jsonb;
  candidate_count integer;
  snapshot_count integer;
  total_bytes bigint;
  result_value jsonb;
begin
  if p_request_id is null or p_choir_id is null or p_bucket is null
    or p_bucket !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'
    or jsonb_typeof(p_snapshot)<>'array' or jsonb_array_length(p_snapshot) not between 1 and 100000
    or jsonb_typeof(p_report)<>'object'
    or jsonb_typeof(p_journal)<>'array' or jsonb_array_length(p_journal) not between 1 and 100000 then
    raise exception 'Invalid private activation request' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_choir_id::text,65));
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,65));
  snapshot_hash:=encode(extensions.digest(convert_to(p_snapshot::text,'UTF8'),'sha256'),'hex');
  report_hash:=encode(extensions.digest(convert_to(p_report::text,'UTF8'),'sha256'),'hex');
  journal_hash:=encode(extensions.digest(convert_to(p_journal::text,'UTF8'),'sha256'),'hex');

  select * into existing from genova_065.activation_runs where request_id=p_request_id;
  if found then
    if existing.choir_id<>p_choir_id or existing.bucket<>p_bucket
      or existing.snapshot_sha256_hex<>snapshot_hash or existing.report_sha256_hex<>report_hash
      or existing.journal_sha256_hex<>journal_hash then
      raise exception 'Activation request replay conflict' using errcode='23505';
    end if;
    return existing.result;
  end if;

  if exists(
    select 1 from jsonb_array_elements(p_snapshot) e
    where jsonb_typeof(e)<>'object' or (
      select array_agg(key order by key) from jsonb_object_keys(e) key
    ) is distinct from array[
      'choir_id','content_length','destination_batch_id','destination_bucket','destination_object_key',
      'destination_version_id','family','file_name','inventory_status','item_id','legacy_file_id',
      'legacy_reference','mime_type','source_owner','source_row_id','source_slot','source_version','status_detail'
    ]::text[]
  ) then raise exception 'Invalid 063 activation snapshot' using errcode='22023'; end if;

  if to_regclass('pg_temp.activation_snapshot_065') is not null then
    drop table pg_temp.activation_snapshot_065;
  end if;
  create temporary table activation_snapshot_065 on commit drop as
  select * from jsonb_to_recordset(p_snapshot) as x(
    item_id uuid,choir_id uuid,family text,source_owner text,source_row_id uuid,source_slot text,
    source_version text,legacy_reference text,legacy_file_id text,file_name text,mime_type text,
    content_length bigint,destination_version_id uuid,destination_batch_id uuid,destination_bucket text,
    destination_object_key text,inventory_status text,status_detail text
  );

  if exists(select 1 from pg_temp.activation_snapshot_065 s where s.choir_id<>p_choir_id
      or s.destination_bucket<>p_bucket or s.item_id is null or s.destination_version_id is null
      or s.family not in('repertoire-file','assignment-submission','assignment-review','repertoire-comment',
        'chat-message-image','chat-room-avatar')
      or s.inventory_status not in('ready-for-provider-metadata','needs-provider-metadata',
        'already-private','non-drive-storage','private-target-conflict','private-alias-unresolved',
        'unsupported-reference','missing-reference','activation-parent-missing',
        'activation-shape-unsupported','stored-metadata-invalid'))
    or (select count(*) from pg_temp.activation_snapshot_065)<>jsonb_array_length(p_snapshot)
    or (select count(distinct item_id) from pg_temp.activation_snapshot_065)<>
      (select count(*) from pg_temp.activation_snapshot_065) then
    raise exception 'Invalid 063 activation snapshot' using errcode='22023';
  end if;

  select jsonb_agg(to_jsonb(s) order by family,source_owner,source_row_id,source_slot,source_version)
    into supplied_snapshot from pg_temp.activation_snapshot_065 s;
  select jsonb_agg(to_jsonb(i) order by family,source_owner,source_row_id,source_slot,source_version)
    into current_snapshot from public.private_r2_copy_inventory_063(p_choir_id,p_bucket) i;
  if current_snapshot is distinct from supplied_snapshot then
    raise exception 'Activation inventory snapshot is stale' using errcode='40001';
  end if;

  select count(*),count(*) filter(where inventory_status in('ready-for-provider-metadata','needs-provider-metadata'))
    into snapshot_count,candidate_count from pg_temp.activation_snapshot_065;
  if candidate_count<1 then raise exception 'Activation has no copy candidates' using errcode='22023'; end if;
  if exists(select 1 from pg_temp.activation_snapshot_065
      where inventory_status not in('ready-for-provider-metadata','needs-provider-metadata',
        'already-private','non-drive-storage')) then
    raise exception 'Activation inventory contains unresolved rows' using errcode='23514';
  end if;
  select jsonb_object_agg(inventory_status,item_count order by inventory_status) into status_counts
    from (select inventory_status,count(*) item_count from pg_temp.activation_snapshot_065
      group by inventory_status) counts;
  select coalesce(jsonb_agg(jsonb_build_object('itemId',item_id,'family',family,
      'sourceOwner',source_owner,'sourceRowId',source_row_id,'sourceSlot',source_slot,
      'sourceVersion',source_version,'inventoryStatus',inventory_status,'statusDetail',status_detail)
      order by family,source_owner,source_row_id,source_slot,source_version),'[]'::jsonb)
    into excluded_rows from pg_temp.activation_snapshot_065
    where inventory_status not in('ready-for-provider-metadata','needs-provider-metadata');

  if not (p_report ?& array['reportVersion','projectRef','choirId','bucket','inventoryFingerprint',
      'manifestSha256Hex','inventoryItemCount','manifestItemCount','excludedItemCount',
      'unresolvedItemCount','totalBytes','limits','statusCounts','excluded','preparedAt'])
    or p_report->>'reportVersion'<>'1' or p_report->>'projectRef' !~ '^[a-z]{20}$'
    or p_report->>'choirId'<>p_choir_id::text or p_report->>'bucket'<>p_bucket
    or p_report->>'inventoryFingerprint' !~ '^[0-9a-f]{64}$'
    or p_report->>'manifestSha256Hex' !~ '^[0-9a-f]{64}$'
    or coalesce((p_report->>'inventoryItemCount')::integer,-1)<>snapshot_count
    or coalesce((p_report->>'manifestItemCount')::integer,-1)<>candidate_count
    or coalesce((p_report->>'excludedItemCount')::integer,-1)<>snapshot_count-candidate_count
    or coalesce((p_report->>'unresolvedItemCount')::integer,-1)<>0
    or p_report->'statusCounts' is distinct from status_counts
    or p_report->'excluded' is distinct from excluded_rows then
    raise exception 'Activation report does not match inventory' using errcode='23514';
  end if;

  if exists(
    select 1 from jsonb_array_elements(p_journal) e
    where jsonb_typeof(e)<>'object' or (
      select array_agg(key order by key) from jsonb_object_keys(e) key
    ) is distinct from array[
      'action','attempt','choirId','contentLength','destinationBucket','destinationObjectKey','family',
      'fileName','fingerprint','itemId','journalVersion','legacyFileId','mimeType','projectRef','recordedAt',
      'sha256Hex','sourceOwner','sourceRowId','sourceSlot','sourceVersion','status','verifiedAt'
    ]::text[]
  ) then raise exception 'Invalid verified copy journal' using errcode='22023'; end if;

  if to_regclass('pg_temp.activation_journal_065') is not null then
    drop table pg_temp.activation_journal_065;
  end if;
  create temporary table activation_journal_065 on commit drop as
  select
    "journalVersion" journal_version,"itemId"::uuid item_id,"fingerprint" fingerprint,
    "projectRef" project_ref,"choirId"::uuid choir_id,"family" family,"sourceOwner" source_owner,
    "sourceRowId"::uuid source_row_id,"sourceSlot" source_slot,"sourceVersion" source_version,
    "legacyFileId" legacy_file_id,"destinationBucket" destination_bucket,
    "destinationObjectKey" destination_object_key,"contentLength"::bigint content_length,
    lower("mimeType") mime_type,"fileName" file_name,"attempt"::integer attempt,
    "recordedAt"::timestamptz recorded_at,"status" status,"action" action,
    "sha256Hex" sha256_hex,"verifiedAt"::timestamptz verified_at
  from jsonb_to_recordset(p_journal) as x(
    "journalVersion" integer,"itemId" text,"fingerprint" text,"projectRef" text,"choirId" text,
    "family" text,"sourceOwner" text,"sourceRowId" text,"sourceSlot" text,"sourceVersion" text,
    "legacyFileId" text,"destinationBucket" text,"destinationObjectKey" text,"contentLength" bigint,
    "mimeType" text,"fileName" text,"attempt" integer,"recordedAt" text,"status" text,"action" text,
    "sha256Hex" text,"verifiedAt" text
  );

  if (select count(*) from pg_temp.activation_journal_065)<>candidate_count
    or (select count(distinct item_id) from pg_temp.activation_journal_065)<>candidate_count
    or exists(select 1 from pg_temp.activation_journal_065 j where
      j.journal_version is null or j.item_id is null or j.fingerprint is null or j.project_ref is null
      or j.choir_id is null or j.family is null or j.source_owner is null or j.source_row_id is null
      or j.source_slot is null or j.source_version is null or j.legacy_file_id is null
      or j.destination_bucket is null or j.destination_object_key is null or j.content_length is null
      or j.mime_type is null or j.file_name is null or j.attempt is null or j.recorded_at is null
      or j.status is null or j.action is null or j.sha256_hex is null or j.verified_at is null
      or j.journal_version<>1
      or j.choir_id<>p_choir_id or j.destination_bucket<>p_bucket
      or j.project_ref<>p_report->>'projectRef' or j.status<>'verified'
      or j.action not in('copied','adopted','resumed') or j.attempt<1
      or j.fingerprint !~ '^[0-9a-f]{64}$' or j.sha256_hex !~ '^[0-9a-f]{64}$'
      or j.content_length<1 or length(j.file_name) not between 1 and 255
      or j.mime_type !~ '^[a-z0-9][a-z0-9.+-]*/[a-z0-9][a-z0-9.+-]*$') then
    raise exception 'Invalid verified copy journal' using errcode='22023';
  end if;
  select sum(content_length) into total_bytes from pg_temp.activation_journal_065;
  if coalesce((p_report->>'totalBytes')::bigint,-1)<>total_bytes
    or jsonb_typeof(p_report->'limits')<>'object'
    or coalesce((p_report->'limits'->>'maxItems')::integer,-1)<candidate_count
    or coalesce((p_report->'limits'->>'maxTotalBytes')::bigint,-1)<total_bytes
    or (p_report->>'preparedAt')::timestamptz is null then
    raise exception 'Activation report limits do not match verified journal' using errcode='23514';
  end if;

  if exists(
    select 1 from pg_temp.activation_snapshot_065 s
    full join pg_temp.activation_journal_065 j on j.item_id=s.item_id
    where coalesce(s.inventory_status,'') in('ready-for-provider-metadata','needs-provider-metadata')
      and (j.item_id is null or j.family<>s.family or j.source_owner<>s.source_owner
        or j.source_row_id<>s.source_row_id or j.source_slot<>s.source_slot
        or j.source_version<>s.source_version or j.legacy_file_id<>s.legacy_file_id
        or j.destination_bucket<>s.destination_bucket or j.destination_object_key<>s.destination_object_key
        or (s.content_length is not null and j.content_length<>s.content_length)
        or (s.mime_type is not null and j.mime_type<>lower(s.mime_type))
        or (s.file_name is not null and j.file_name<>s.file_name))
  ) or exists(
    select 1 from pg_temp.activation_journal_065 j left join pg_temp.activation_snapshot_065 s on s.item_id=j.item_id
    where s.item_id is null or s.inventory_status not in('ready-for-provider-metadata','needs-provider-metadata')
  ) then raise exception 'Verified journal does not cover the exact inventory candidates' using errcode='23514'; end if;

  if to_regclass('pg_temp.activation_candidates_065') is not null then
    drop table pg_temp.activation_candidates_065;
  end if;
  create temporary table activation_candidates_065 on commit drop as
  select s.*,j.project_ref,j.fingerprint,j.content_length verified_content_length,
    j.mime_type verified_mime_type,j.file_name verified_file_name,j.sha256_hex,j.verified_at
  from pg_temp.activation_snapshot_065 s join pg_temp.activation_journal_065 j using(item_id)
  where s.inventory_status in('ready-for-provider-metadata','needs-provider-metadata');

  if exists(
    select 1 from pg_temp.activation_candidates_065 c where
      (c.family='assignment-submission' and c.source_owner='public.assignment_submission_history'
        and not exists(select 1 from public.assignment_submission_history h
          join public.assignment_submissions s on s.id=h.source_submission_id and s.choir_id=h.choir_id
          where h.id=c.source_row_id and h.choir_id=p_choir_id))
      or (c.family='assignment-review' and c.source_owner='public.assignment_submissions'
        and not exists(select 1 from public.assignment_submissions s where s.id=c.source_row_id
          and s.choir_id=p_choir_id and s.approved_by is not null))
      or (c.family='assignment-review' and c.source_owner='public.assignment_submission_private_notes'
        and not exists(select 1 from public.assignment_submission_private_notes n where n.submission_id=c.source_row_id
          and n.choir_id=p_choir_id and n.last_updated_by is not null))
      or (c.family='assignment-review' and c.source_owner='public.assignment_submission_history'
        and not exists(select 1 from public.assignment_submission_history h
          join public.assignment_submissions s on s.id=h.source_submission_id and s.choir_id=h.choir_id
          where h.id=c.source_row_id and h.choir_id=p_choir_id and h.approved_by is not null))
      or (c.family='assignment-review' and c.source_owner='public.assignment_submission_private_history'
        and not exists(select 1 from public.assignment_submission_private_history n
          join public.assignment_submission_history h on h.id=n.history_id and h.choir_id=n.choir_id
          join public.assignment_submissions s on s.id=h.source_submission_id and s.choir_id=h.choir_id
          where n.history_id=c.source_row_id and n.choir_id=p_choir_id and h.approved_by is not null))
  ) then raise exception 'Activation source parent or reviewer identity is unresolved' using errcode='23514'; end if;

  if exists(select 1 from pg_temp.activation_candidates_065 c where
      exists(select 1 from public.repertoire_file_storage_locations v
        where c.family='repertoire-file' and (v.id=c.destination_version_id
          or (v.bucket=c.destination_bucket and v.object_key=c.destination_object_key)))
      or exists(select 1 from public.assignment_submission_file_versions v
        where c.family='assignment-submission' and (v.id=c.destination_version_id
          or (v.bucket=c.destination_bucket and v.object_key=c.destination_object_key)))
      or exists(select 1 from public.assignment_review_audio_versions v
        where c.family='assignment-review' and (v.id=c.destination_version_id
          or (v.bucket=c.destination_bucket and v.object_key=c.destination_object_key)))
      or exists(select 1 from public.repertoire_comment_audio_versions v
        where c.family='repertoire-comment' and (v.id=c.destination_version_id
          or (v.bucket=c.destination_bucket and v.object_key=c.destination_object_key)))
      or exists(select 1 from public.chat_media_versions v
        where c.family like 'chat-%' and (v.id=c.destination_version_id
          or (v.bucket=c.destination_bucket and v.object_key=c.destination_object_key)))
  ) then raise exception 'Activation destination conflicts with existing state' using errcode='23505'; end if;

  insert into public.repertoire_file_storage_locations(
    id,repertoire_file_id,choir_id,provider,bucket,object_key,content_length,mime_type,sha256_hex,verified_at,is_active
  ) select destination_version_id,source_row_id,choir_id,'r2',destination_bucket,destination_object_key,
      verified_content_length,verified_mime_type,sha256_hex,verified_at,true
    from pg_temp.activation_candidates_065 where family='repertoire-file';

  if to_regclass('pg_temp.assignment_activation_065') is not null then
    drop table pg_temp.assignment_activation_065;
  end if;
  create temporary table assignment_activation_065 on commit drop as
  with mapped as(
    select c.*,s.id submission_id,s.assignment_id,s.member_id
    from pg_temp.activation_candidates_065 c join public.assignment_submissions s on s.id=c.source_row_id
    where c.family='assignment-submission' and c.source_owner='public.assignment_submissions'
    union all
    select c.*,s.id,h.assignment_id,h.member_id
    from pg_temp.activation_candidates_065 c join public.assignment_submission_history h on h.id=c.source_row_id
      join public.assignment_submissions s on s.id=h.source_submission_id
    where c.family='assignment-submission' and c.source_owner='public.assignment_submission_history'
  ), ranked as(
    select mapped.*,row_number() over(partition by submission_id order by
      case when source_owner='public.assignment_submission_history' then 0 else 1 end,source_row_id) ordinal
    from mapped
  ) select ranked.*,(select coalesce(max(v.version_number),0) from public.assignment_submission_file_versions v
      where v.submission_id=ranked.submission_id)+ordinal version_number from ranked;

  insert into public.assignment_submission_file_versions(id,choir_id,submission_id,assignment_id,member_id,
    version_number,provider,bucket,object_key,content_length,mime_type,sha256_hex,file_name)
  select destination_version_id,choir_id,submission_id,assignment_id,member_id,version_number,'r2',
    destination_bucket,destination_object_key,verified_content_length,verified_mime_type,sha256_hex,verified_file_name
  from pg_temp.assignment_activation_065;
  update public.assignment_submissions s set current_file_version_id=a.destination_version_id,
    drive_file_id='r2_'||a.destination_version_id,drive_web_view_link=null,drive_download_link=null,
    drive_member_folder_id=null,file_name=a.verified_file_name,mime_type=a.verified_mime_type,
    file_size_bytes=a.verified_content_length
  from pg_temp.assignment_activation_065 a where a.source_owner='public.assignment_submissions'
    and s.id=a.source_row_id;
  update public.assignment_submission_history h set file_version_id=a.destination_version_id,
    drive_file_id='r2_'||a.destination_version_id,drive_web_view_link=null,drive_download_link=null,
    drive_member_folder_id=null,file_name=a.verified_file_name,mime_type=a.verified_mime_type,
    file_size_bytes=a.verified_content_length
  from pg_temp.assignment_activation_065 a where a.source_owner='public.assignment_submission_history'
    and h.id=a.source_row_id;

  if to_regclass('pg_temp.review_activation_065') is not null then
    drop table pg_temp.review_activation_065;
  end if;
  create temporary table review_activation_065 on commit drop as
  with mapped as(
    select c.*,s.id submission_id,s.assignment_id,s.member_id,s.approved_by created_by
    from pg_temp.activation_candidates_065 c join public.assignment_submissions s on s.id=c.source_row_id
    where c.family='assignment-review' and c.source_owner='public.assignment_submissions'
    union all
    select c.*,s.id,n.assignment_id,n.member_id,n.last_updated_by
    from pg_temp.activation_candidates_065 c join public.assignment_submission_private_notes n on n.submission_id=c.source_row_id
      join public.assignment_submissions s on s.id=n.submission_id
    where c.family='assignment-review' and c.source_owner='public.assignment_submission_private_notes'
    union all
    select c.*,s.id,h.assignment_id,h.member_id,h.approved_by
    from pg_temp.activation_candidates_065 c join public.assignment_submission_history h on h.id=c.source_row_id
      join public.assignment_submissions s on s.id=h.source_submission_id
    where c.family='assignment-review' and c.source_owner='public.assignment_submission_history'
    union all
    select c.*,s.id,n.assignment_id,n.member_id,h.approved_by
    from pg_temp.activation_candidates_065 c join public.assignment_submission_private_history n on n.history_id=c.source_row_id
      join public.assignment_submission_history h on h.id=n.history_id
      join public.assignment_submissions s on s.id=h.source_submission_id
    where c.family='assignment-review' and c.source_owner='public.assignment_submission_private_history'
  ), ranked as(
    select mapped.*,row_number() over(partition by submission_id order by source_owner,source_row_id) ordinal
    from mapped
  ) select ranked.*,(select coalesce(max(v.version_number),0) from public.assignment_review_audio_versions v
      where v.submission_id=ranked.submission_id)+ordinal version_number from ranked;

  insert into public.assignment_review_audio_versions(id,choir_id,submission_id,assignment_id,member_id,created_by,
    version_number,provider,bucket,object_key,content_length,mime_type,sha256_hex,file_name)
  select destination_version_id,choir_id,submission_id,assignment_id,member_id,created_by,version_number,'r2',
    destination_bucket,destination_object_key,verified_content_length,verified_mime_type,sha256_hex,verified_file_name
  from pg_temp.review_activation_065;
  update public.assignment_submissions s set reviewer_audio_file_version_id=a.destination_version_id,
    reviewer_audio_drive_file_id='r2_review_'||a.destination_version_id,
    reviewer_audio_file_name=a.verified_file_name,reviewer_audio_mime_type=a.verified_mime_type,
    reviewer_audio_file_size_bytes=a.verified_content_length
  from pg_temp.review_activation_065 a where a.source_owner='public.assignment_submissions' and s.id=a.source_row_id;
  update public.assignment_submission_private_notes n set reviewer_audio_file_version_id=a.destination_version_id,
    reviewer_audio_drive_file_id='r2_review_'||a.destination_version_id,
    reviewer_audio_file_name=a.verified_file_name,reviewer_audio_mime_type=a.verified_mime_type,
    reviewer_audio_file_size_bytes=a.verified_content_length
  from pg_temp.review_activation_065 a where a.source_owner='public.assignment_submission_private_notes'
    and n.submission_id=a.source_row_id;
  update public.assignment_submission_history h set reviewer_audio_file_version_id=a.destination_version_id,
    reviewer_audio_drive_file_id='r2_review_'||a.destination_version_id,
    reviewer_audio_file_name=a.verified_file_name,reviewer_audio_mime_type=a.verified_mime_type,
    reviewer_audio_file_size_bytes=a.verified_content_length
  from pg_temp.review_activation_065 a where a.source_owner='public.assignment_submission_history'
    and h.id=a.source_row_id;
  update public.assignment_submission_private_history n set reviewer_audio_file_version_id=a.destination_version_id,
    reviewer_audio_drive_file_id='r2_review_'||a.destination_version_id,
    reviewer_audio_file_name=a.verified_file_name,reviewer_audio_mime_type=a.verified_mime_type,
    reviewer_audio_file_size_bytes=a.verified_content_length
  from pg_temp.review_activation_065 a where a.source_owner='public.assignment_submission_private_history'
    and n.history_id=a.source_row_id;

  insert into public.repertoire_comment_audio_versions(id,choir_id,comment_id,song_id,created_by,provider,
    bucket,object_key,content_length,mime_type,sha256_hex,file_name)
  select c.destination_version_id,c.choir_id,c.source_row_id,s.song_id,s.created_by,'r2',c.destination_bucket,
    c.destination_object_key,c.verified_content_length,c.verified_mime_type,c.sha256_hex,c.verified_file_name
  from pg_temp.activation_candidates_065 c join public.repertoire_song_comments s on s.id=c.source_row_id
  where c.family='repertoire-comment';
  update public.repertoire_song_comments s set audio_file_version_id=c.destination_version_id,
    audio_drive_file_id='r2_comment_'||c.destination_version_id,audio_file_name=c.verified_file_name,
    audio_mime_type=c.verified_mime_type,audio_file_size_bytes=c.verified_content_length
  from pg_temp.activation_candidates_065 c where c.family='repertoire-comment' and s.id=c.source_row_id;

  insert into public.chat_media_versions(id,choir_id,room_id,kind,batch_id,position,message_id,created_by,
    provider,bucket,object_key,content_length,mime_type,sha256_hex,file_name,state)
  select c.destination_version_id,c.choir_id,m.room_id,'message-image',c.destination_batch_id,
    split_part(c.source_slot,':',2)::smallint,m.id,m.sender_id,'r2',c.destination_bucket,c.destination_object_key,
    c.verified_content_length,c.verified_mime_type,c.sha256_hex,c.verified_file_name,'active'
  from pg_temp.activation_candidates_065 c join public.chat_messages m on m.id=c.source_row_id
  where c.family='chat-message-image';
  with grouped as(
    select c.source_row_id,jsonb_agg(to_jsonb(c.destination_version_id::text)
      order by split_part(c.source_slot,':',2)::integer) ids,
      jsonb_agg(to_jsonb(c.verified_file_name) order by split_part(c.source_slot,':',2)::integer) names
    from pg_temp.activation_candidates_065 c where c.family='chat-message-image' group by c.source_row_id
  ) update public.chat_messages m set metadata_json=(coalesce(m.metadata_json,'{}'::jsonb)
      - 'drive_file_id' - 'url' - 'web_view_link' - 'web_content_link'
      - 'drive_file_ids' - 'urls' - 'web_view_links' - 'web_content_links')
      || jsonb_build_object('private_media_version_ids',g.ids,'private_media_file_names',g.names),
      updated_at=clock_timestamp()
    from grouped g where m.id=g.source_row_id;

  insert into public.chat_media_versions(id,choir_id,room_id,kind,batch_id,position,message_id,created_by,
    provider,bucket,object_key,content_length,mime_type,sha256_hex,file_name,state)
  select c.destination_version_id,c.choir_id,r.id,'room-avatar',c.destination_batch_id,0,null,r.created_by,
    'r2',c.destination_bucket,c.destination_object_key,c.verified_content_length,c.verified_mime_type,
    c.sha256_hex,c.verified_file_name,'active'
  from pg_temp.activation_candidates_065 c join public.chat_rooms r on r.id=c.source_row_id
  where c.family='chat-room-avatar';
  update public.chat_rooms r set avatar_media_version_id=c.destination_version_id,
    avatar_url='r2_chat_'||c.destination_version_id,updated_at=clock_timestamp()
  from pg_temp.activation_candidates_065 c where c.family='chat-room-avatar' and r.id=c.source_row_id;

  select jsonb_build_object('status','committed','requestId',p_request_id,'choirId',p_choir_id,
    'bucket',p_bucket,'activatedItemCount',candidate_count,'familyCounts',
    (select jsonb_object_agg(family,item_count order by family) from(
      select family,count(*) item_count from pg_temp.activation_candidates_065 group by family) f))
    into result_value;
  insert into genova_065.activation_runs(request_id,choir_id,bucket,project_ref,inventory_fingerprint,
    manifest_sha256_hex,snapshot_sha256_hex,report_sha256_hex,journal_sha256_hex,activated_item_count,result)
  values(p_request_id,p_choir_id,p_bucket,p_report->>'projectRef',p_report->>'inventoryFingerprint',
    p_report->>'manifestSha256Hex',snapshot_hash,report_hash,journal_hash,candidate_count,result_value);
  insert into genova_065.activation_items(request_id,item_id,choir_id,family,source_owner,source_row_id,
    source_slot,source_version,legacy_file_id,destination_version_id,destination_batch_id,destination_bucket,
    destination_object_key,content_length,mime_type,file_name,sha256_hex,manifest_fingerprint,verified_at)
  select p_request_id,item_id,choir_id,family,source_owner,source_row_id,source_slot,source_version,
    legacy_file_id,destination_version_id,destination_batch_id,destination_bucket,destination_object_key,
    verified_content_length,verified_mime_type,verified_file_name,sha256_hex,fingerprint,verified_at
  from pg_temp.activation_candidates_065;
  return result_value;
end;
$fn$;

revoke all on function public.private_r2_activate_065(uuid,uuid,text,jsonb,jsonb,jsonb)
  from public,anon,authenticated,service_role;
grant execute on function public.private_r2_activate_065(uuid,uuid,text,jsonb,jsonb,jsonb) to service_role;

comment on function public.private_r2_activate_065(uuid,uuid,text,jsonb,jsonb,jsonb) is
  '065 service-only atomic activation of a current 063 snapshot after verified 062 copy evidence.';
comment on table genova_065.activation_items is
  'Private immutable reconciliation evidence retaining legacy source identity after product aliases change.';

notify pgrst,'reload schema';
commit;
