-- 054: service-owned upload lifecycle. No provider operation or live data copy.
begin;
select pg_advisory_xact_lock(hashtext('genovakorist:054:private-r2-upload'));

create schema genova_054;
revoke all on schema genova_054 from public, anon, authenticated, service_role;

create table genova_054.uploads (
  actor_id uuid not null,
  retry_key uuid not null,
  choir_id uuid not null,
  member_id uuid not null,
  song_id uuid not null,
  file_id uuid not null unique default gen_random_uuid(),
  lease uuid not null default gen_random_uuid(),
  metadata jsonb not null,
  bucket text not null check (bucket ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  state text not null default 'uploading'
    check (state in ('uploading', 'cleanup', 'failed', 'committed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (actor_id, retry_key)
);
-- Deliberately no cascading FK: an interrupted upload must remain discoverable even if its
-- song/account is removed. Reconciliation owns deletion of these operational records.
alter table genova_054.uploads enable row level security;
alter table genova_054.uploads force row level security;
revoke all on table genova_054.uploads from public, anon, authenticated, service_role;

create function genova_054.authorize_manager(actor_id uuid, session_id uuid, choir_id uuid)
returns uuid language plpgsql security invoker set search_path = '' as $fn$
declare
  selected_choir uuid;
  member_id uuid;
begin
  if actor_id is null or choir_id is null then
    raise exception 'Upload access denied' using errcode = '42501';
  end if;
  select s.choir_id into selected_choir from genova_005.active_choir_sessions s
    join public.choir_members m on m.auth_user_id = s.auth_user_id and m.choir_id = s.choir_id
    where s.session_id = authorize_manager.session_id and s.auth_user_id = actor_id;
  if selected_choir is null then
    select case when count(*) = 1 then (array_agg(m.choir_id))[1] end into selected_choir
      from public.choir_members m where m.auth_user_id = actor_id;
  end if;
  if selected_choir is distinct from choir_id then
    raise exception 'Upload access denied' using errcode = '42501';
  end if;
  -- Lock membership and role assignment through final commit; concurrent revocation is serialized.
  select m.id into member_id from public.choir_members m
    join public.choir_member_roles mr on mr.member_id = m.id and mr.choir_id = m.choir_id
    join public.roles r on r.id = mr.role_id and r.choir_id = mr.choir_id
    where m.auth_user_id = actor_id and m.choir_id = authorize_manager.choir_id
      and m.is_active and r.name in ('Şef', 'Sef', 'Åef')
    limit 1 for share of m, mr, r;
  if member_id is null then
    raise exception 'Upload access denied' using errcode = '42501';
  end if;
  return member_id;
end;
$fn$;
revoke all on function genova_054.authorize_manager(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

-- Only the Edge service may invoke this boundary. actor/session must come from an Auth-verified
-- token; the service must never forward a caller-supplied verification or provider location.
create function public.repertoire_upload_054(
  p_action text, p_actor_id uuid, p_session_id uuid, p_choir_id uuid,
  p_retry_key uuid, p_metadata jsonb default null, p_bucket text default null,
  p_lease uuid default null, p_sha256 text default null
) returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare
  u genova_054.uploads%rowtype;
  manager_id uuid;
  result_file public.repertoire_files%rowtype;
  acquired boolean := false;
  object_key text;
begin
  if p_action not in ('reserve', 'commit', 'cleanup', 'failed') or p_action is null
    or p_actor_id is null or p_retry_key is null then
    raise exception 'Invalid upload operation' using errcode = '22023';
  end if;
  if p_action = 'reserve' then
    manager_id := genova_054.authorize_manager(p_actor_id, p_session_id, p_choir_id);
    if p_metadata is null or jsonb_typeof(p_metadata) <> 'object'
      or not (p_metadata ?& array['songId','fileName','mimeType','fileType','size','partitionLabel'])
      or (select count(*) from jsonb_object_keys(p_metadata)) <> 6
      or coalesce(p_metadata->>'songId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(length(p_metadata->>'fileName'),0) not between 1 and 255
      or (p_metadata->>'fileName') ~ '[[:cntrl:]/\\]'
      or (p_metadata->>'fileName') ~* '\.(html?|xhtml?|svgz?|xml|xsl|xslt|js|mjs)$'
      or coalesce(p_metadata->>'size','') !~ '^[0-9]{1,9}$'
      or coalesce((p_metadata->>'size')::bigint,0) not between 1 and 104857600
      or coalesce(p_metadata->>'fileType','') not in ('sheet','audio')
      or not (
        (p_metadata->>'fileType' = 'sheet' and p_metadata->>'mimeType' = 'application/pdf') or
        (p_metadata->>'fileType' = 'audio' and p_metadata->>'mimeType' in
          ('audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/aac','audio/ogg','audio/webm','audio/flac'))
      )
      or coalesce(length(p_metadata->>'partitionLabel'),0) > 100
      or p_bucket is null or p_bucket !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' then
      raise exception 'Invalid upload metadata' using errcode = '22023';
    end if;
    perform 1 from public.repertoire r
      where r.id = (p_metadata->>'songId')::uuid and r.choir_id = p_choir_id for share;
    if not found then raise exception 'Upload access denied' using errcode = '42501'; end if;
    insert into genova_054.uploads (actor_id,retry_key,choir_id,member_id,song_id,metadata,bucket)
      values (p_actor_id,p_retry_key,p_choir_id,manager_id,(p_metadata->>'songId')::uuid,p_metadata,p_bucket)
      on conflict (actor_id,retry_key) do nothing returning * into u;
    acquired := found;
  end if;
  select * into u from genova_054.uploads
    where actor_id = p_actor_id and retry_key = p_retry_key for update;
  if not found or u.choir_id is distinct from p_choir_id then
    raise exception 'Upload reservation not found' using errcode = '42501';
  end if;
  object_key := 'choirs/' || u.choir_id || '/repertoire/' || u.file_id || '/content';
  if p_action = 'reserve' then
    if u.metadata is distinct from p_metadata or u.bucket is distinct from p_bucket then
      raise exception 'Upload retry conflict' using errcode = '23505';
    end if;
    if u.state = 'failed' then
      update genova_054.uploads set state = 'uploading', lease = gen_random_uuid(), updated_at = now()
        where actor_id = p_actor_id and retry_key = p_retry_key returning * into u;
      acquired := true;
    end if;
  else
    if p_lease is null or p_lease <> u.lease then
      raise exception 'Upload lease conflict' using errcode = '23505';
    end if;
    if p_action = 'commit' and u.state = 'uploading' then
      if coalesce(p_sha256, '') !~ '^[0-9a-f]{64}$' then
        raise exception 'Invalid verified digest' using errcode = '22023';
      end if;
      manager_id := genova_054.authorize_manager(p_actor_id,p_session_id,p_choir_id);
      if manager_id <> u.member_id then raise exception 'Upload access denied' using errcode = '42501'; end if;
      perform 1 from public.repertoire r where r.id = u.song_id and r.choir_id = u.choir_id for share;
      if not found then raise exception 'Upload access denied' using errcode = '42501'; end if;
      insert into public.repertoire_files
        (id,choir_id,song_id,file_name,file_type,partition_label,drive_file_id,mime_type,file_size_bytes,uploaded_by)
        values (u.file_id,u.choir_id,u.song_id,u.metadata->>'fileName',u.metadata->>'fileType',
          u.metadata->>'partitionLabel','r2_' || u.file_id,u.metadata->>'mimeType',
          (u.metadata->>'size')::bigint,u.member_id);
      insert into public.repertoire_file_storage_locations
        (repertoire_file_id,choir_id,provider,bucket,object_key,content_length,mime_type,sha256_hex,verified_at)
        values (u.file_id,u.choir_id,'r2',u.bucket,object_key,(u.metadata->>'size')::bigint,
          u.metadata->>'mimeType',p_sha256,now());
      update public.repertoire_file_storage_locations set is_active = true
        where repertoire_file_id = u.file_id and choir_id = u.choir_id;
      update genova_054.uploads set state = 'committed',updated_at = now()
        where actor_id = p_actor_id and retry_key = p_retry_key returning * into u;
    elsif p_action = 'cleanup' and u.state = 'uploading' then
      -- This lock/state transition excludes a late commit before the Edge deletes the object.
      update genova_054.uploads set state = 'cleanup',updated_at = now()
        where actor_id = p_actor_id and retry_key = p_retry_key returning * into u;
    elsif p_action = 'failed' and u.state = 'cleanup' then
      -- Call only after provider DELETE succeeded; otherwise keep explicit reconciliation state.
      update genova_054.uploads set state = 'failed',updated_at = now()
        where actor_id = p_actor_id and retry_key = p_retry_key returning * into u;
    elsif u.state <> 'committed' then
      raise exception 'Upload state conflict' using errcode = '23505';
    end if;
  end if;
  if u.state = 'committed' then
    select * into result_file from public.repertoire_files where id = u.file_id and choir_id = u.choir_id;
    if not found then raise exception 'Committed file no longer available' using errcode = '23505'; end if;
    return jsonb_build_object('state','committed','file',to_jsonb(result_file));
  end if;
  return jsonb_build_object('state',case when p_action = 'reserve' and not acquired then 'pending' else u.state end,
    'fileId',u.file_id,'choirId',u.choir_id,'bucket',u.bucket,'objectKey',object_key,
    'lease',case when acquired or p_action <> 'reserve' then u.lease else null end);
end;
$fn$;
revoke all on function public.repertoire_upload_054(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)
  from public, anon, authenticated, service_role;
grant execute on function public.repertoire_upload_054(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text) to service_role;

comment on function public.repertoire_upload_054(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text) is
  '054 Edge-only upload transaction. Verify Auth before reserve and exact provider readback before commit. Resolve cleanup state before DELETE; never automatically steal an uploading lease.';
notify pgrst, 'reload schema';
commit;
