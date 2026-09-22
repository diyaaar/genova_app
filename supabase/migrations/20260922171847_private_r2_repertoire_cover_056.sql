-- 056: a narrow cover reservation path reuses the verified 054 commit/cleanup lifecycle.
begin;
select pg_advisory_xact_lock(hashtext('genovakorist:056:private-r2-cover'));

create function public.repertoire_cover_upload_056(
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
  extension text;
begin
  if p_action <> 'reserve' then
    return public.repertoire_upload_054(p_action,p_actor_id,p_session_id,p_choir_id,
      p_retry_key,p_metadata,p_bucket,p_lease,p_sha256);
  end if;
  if p_actor_id is null or p_retry_key is null then
    raise exception 'Invalid cover upload operation' using errcode = '22023';
  end if;
  manager_id := genova_054.authorize_manager(p_actor_id,p_session_id,p_choir_id);
  extension := lower(substring(coalesce(p_metadata->>'fileName','') from '\.([^.]+)$'));
  if p_metadata is null or jsonb_typeof(p_metadata) <> 'object'
    or not (p_metadata ?& array['songId','fileName','mimeType','fileType','size','partitionLabel'])
    or (select count(*) from jsonb_object_keys(p_metadata)) <> 6
    or coalesce(p_metadata->>'songId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or coalesce(length(p_metadata->>'fileName'),0) not between 1 and 255
    or (p_metadata->>'fileName') ~ '[[:cntrl:]/\\]'
    or coalesce(p_metadata->>'size','') !~ '^[0-9]{1,9}$'
    or coalesce((p_metadata->>'size')::bigint,0) not between 1 and 104857600
    or coalesce(p_metadata->>'fileType','') <> 'other'
    or coalesce(p_metadata->>'partitionLabel','') <> '__cover__'
    or not coalesce((
      (p_metadata->>'mimeType' = 'application/pdf' and extension = 'pdf') or
      (p_metadata->>'mimeType' = 'image/jpeg' and extension in ('jpg','jpeg')) or
      (p_metadata->>'mimeType' = 'image/png' and extension = 'png') or
      (p_metadata->>'mimeType' = 'image/webp' and extension = 'webp') or
      (p_metadata->>'mimeType' = 'image/gif' and extension = 'gif') or
      (p_metadata->>'mimeType' = 'image/bmp' and extension = 'bmp') or
      (p_metadata->>'mimeType' = 'image/avif' and extension = 'avif')
    ),false)
    or p_bucket is null or p_bucket !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' then
    raise exception 'Invalid cover upload metadata' using errcode = '22023';
  end if;
  perform 1 from public.repertoire r
    where r.id = (p_metadata->>'songId')::uuid and r.choir_id = p_choir_id for share;
  if not found then raise exception 'Upload access denied' using errcode = '42501'; end if;
  insert into genova_054.uploads(actor_id,retry_key,choir_id,member_id,song_id,metadata,bucket)
    values(p_actor_id,p_retry_key,p_choir_id,manager_id,(p_metadata->>'songId')::uuid,p_metadata,p_bucket)
    on conflict(actor_id,retry_key) do nothing returning * into u;
  acquired := found;
  if not acquired then
    select * into u from genova_054.uploads
      where actor_id=p_actor_id and retry_key=p_retry_key for update;
    if not found or u.choir_id is distinct from p_choir_id then
      raise exception 'Upload reservation not found' using errcode = '42501';
    end if;
    if u.metadata is distinct from p_metadata or u.bucket is distinct from p_bucket then
      raise exception 'Upload retry conflict' using errcode = '23505';
    end if;
    if u.state='failed' then
      update genova_054.uploads set state='uploading',lease=gen_random_uuid(),updated_at=now()
        where actor_id=p_actor_id and retry_key=p_retry_key returning * into u;
      acquired := true;
    end if;
  end if;
  if u.state='committed' then
    select * into result_file from public.repertoire_files where id=u.file_id and choir_id=u.choir_id;
    if not found then raise exception 'Committed cover no longer available' using errcode='23505'; end if;
    return jsonb_build_object('state','committed','file',to_jsonb(result_file));
  end if;
  object_key := 'choirs/'||u.choir_id||'/repertoire/'||u.file_id||'/content';
  return jsonb_build_object('state',case when acquired then u.state else 'pending' end,
    'fileId',u.file_id,'choirId',u.choir_id,'bucket',u.bucket,'objectKey',object_key,
    'lease',case when acquired then u.lease else null end);
end;
$fn$;
revoke all on function public.repertoire_cover_upload_056(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)
  from public,anon,authenticated,service_role;
grant execute on function public.repertoire_cover_upload_056(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)
  to service_role;
comment on function public.repertoire_cover_upload_056(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text) is
  '056 Edge-only exact cover reservation. 054 owns verified commit and cleanup.';
notify pgrst,'reload schema';
commit;
