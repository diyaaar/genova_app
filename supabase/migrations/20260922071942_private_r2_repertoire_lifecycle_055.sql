-- 055: service-owned R2 repertoire deletion and replacement guard.
-- Product rows are removed before provider cleanup; exact private targets remain reconcilable.
begin;
select pg_advisory_xact_lock(hashtext('genovakorist:055:private-r2-lifecycle'));

create schema genova_055;
revoke all on schema genova_055 from public, anon, authenticated, service_role;

create table genova_055.deletion_jobs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null,
  retry_key uuid not null,
  choir_id uuid not null,
  target_type text not null check (target_type in ('file','song')),
  target_id uuid not null,
  mode text not null check (mode in ('delete','replacement')),
  state text not null default 'cleanup' check (state in ('cleanup','cleaned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (actor_id, retry_key),
  unique (choir_id, target_type, target_id)
);

create table genova_055.deletion_objects (
  job_id uuid not null references genova_055.deletion_jobs(id) on delete cascade,
  ordinal smallint not null check (ordinal between 1 and 100),
  repertoire_file_id uuid not null,
  bucket text not null check (bucket ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  object_key text not null check (length(object_key) between 1 and 1024),
  primary key (job_id, ordinal),
  unique (bucket, object_key)
);

alter table genova_055.deletion_jobs enable row level security;
alter table genova_055.deletion_jobs force row level security;
alter table genova_055.deletion_objects enable row level security;
alter table genova_055.deletion_objects force row level security;
revoke all on table genova_055.deletion_jobs, genova_055.deletion_objects
  from public, anon, authenticated, service_role;

create function public.repertoire_lifecycle_055(
  p_action text,
  p_actor_id uuid,
  p_session_id uuid,
  p_choir_id uuid,
  p_retry_key uuid,
  p_target_type text,
  p_target_id uuid,
  p_mode text default 'delete'
) returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare
  manager_id uuid;
  job genova_055.deletion_jobs%rowtype;
  target_count integer;
  location_count integer;
  ordinal_value integer := 0;
  location_row record;
  result_targets jsonb;
begin
  if p_action not in ('check-replace','reserve-delete','cleaned')
    or p_actor_id is null or p_choir_id is null or p_retry_key is null or p_target_id is null
    or p_target_type not in ('file','song') or p_mode not in ('delete','replacement')
    or (p_target_type = 'song' and p_mode <> 'delete') then
    raise exception 'Invalid repertoire lifecycle operation' using errcode = '22023';
  end if;

  manager_id := genova_054.authorize_manager(p_actor_id,p_session_id,p_choir_id);
  perform pg_advisory_xact_lock(hashtextextended(p_choir_id::text || ':' || p_target_type || ':' || p_target_id::text,55));

  if p_action = 'check-replace' then
    if p_target_type <> 'file' or p_mode <> 'replacement' then
      raise exception 'Invalid replacement check' using errcode = '22023';
    end if;
    perform 1 from public.repertoire_files f
      join public.repertoire_file_storage_locations l
        on l.repertoire_file_id = f.id and l.choir_id = f.choir_id and l.is_active and l.provider = 'r2'
      where f.id = p_target_id and f.choir_id = p_choir_id and f.drive_file_id like 'r2\_%' escape '\'
      for share of f,l;
    if not found then raise exception 'R2 repertoire target not found' using errcode = 'P5502'; end if;
    if exists(select 1 from public.repertoire_pdf_annotations a
      where a.repertoire_file_id = p_target_id and a.choir_id = p_choir_id) then
      raise exception 'Annotated PDF replacement refused' using errcode = 'P5501';
    end if;
    return jsonb_build_object('state','ready');
  end if;

  select * into job from genova_055.deletion_jobs
    where choir_id = p_choir_id and target_type = p_target_type and target_id = p_target_id for update;
  if found then
    if job.mode is distinct from p_mode then
      raise exception 'Lifecycle retry conflict' using errcode = '23505';
    end if;
  elsif p_action = 'cleaned' then
    raise exception 'Lifecycle job not found' using errcode = '42501';
  else
    if p_target_type = 'file' then
      perform 1 from public.repertoire_files f
        join public.repertoire_file_storage_locations l
          on l.repertoire_file_id = f.id and l.choir_id = f.choir_id and l.is_active and l.provider = 'r2'
        where f.id = p_target_id and f.choir_id = p_choir_id and f.drive_file_id like 'r2\_%' escape '\'
        for update of f,l;
      if not found then raise exception 'R2 repertoire target not found' using errcode = 'P5502'; end if;
      if p_mode = 'replacement' and exists(select 1 from public.repertoire_pdf_annotations a
        where a.repertoire_file_id = p_target_id and a.choir_id = p_choir_id) then
        raise exception 'Annotated PDF replacement refused' using errcode = 'P5501';
      end if;
    else
      perform 1 from public.repertoire r where r.id = p_target_id and r.choir_id = p_choir_id
        and r.drive_folder_id is null for update;
      if not found then raise exception 'Mixed or missing repertoire song refused' using errcode = 'P5502'; end if;
      perform 1 from public.repertoire_files f where f.song_id = p_target_id and f.choir_id = p_choir_id for update;
      select count(*) into target_count from public.repertoire_files f
        where f.song_id = p_target_id and f.choir_id = p_choir_id;
      if target_count > 100 then raise exception 'Repertoire cleanup batch too large' using errcode = 'P5503'; end if;
      select count(*) into location_count from public.repertoire_files f
        join public.repertoire_file_storage_locations l
          on l.repertoire_file_id = f.id and l.choir_id = f.choir_id and l.is_active and l.provider = 'r2'
        where f.song_id = p_target_id and f.choir_id = p_choir_id
          and f.drive_file_id like 'r2\_%' escape '\';
      if target_count <> location_count then
        raise exception 'Mixed or incomplete repertoire song refused' using errcode = 'P5502';
      end if;
    end if;

    insert into genova_055.deletion_jobs
      (actor_id,retry_key,choir_id,target_type,target_id,mode)
      values (p_actor_id,p_retry_key,p_choir_id,p_target_type,p_target_id,p_mode)
      returning * into job;

    for location_row in
      select f.id as file_id,l.bucket,l.object_key
      from public.repertoire_files f
      join public.repertoire_file_storage_locations l
        on l.repertoire_file_id = f.id and l.choir_id = f.choir_id and l.is_active and l.provider = 'r2'
      where f.choir_id = p_choir_id
        and ((p_target_type = 'file' and f.id = p_target_id)
          or (p_target_type = 'song' and f.song_id = p_target_id))
      order by f.id
    loop
      ordinal_value := ordinal_value + 1;
      insert into genova_055.deletion_objects
        (job_id,ordinal,repertoire_file_id,bucket,object_key)
        values (job.id,ordinal_value,location_row.file_id,location_row.bucket,location_row.object_key);
    end loop;

    if p_target_type = 'file' then
      delete from public.repertoire_files where id = p_target_id and choir_id = p_choir_id;
    else
      delete from public.repertoire where id = p_target_id and choir_id = p_choir_id;
    end if;
  end if;

  if p_action = 'cleaned' and job.state = 'cleanup' then
    update genova_055.deletion_jobs set state = 'cleaned',updated_at = now()
      where id = job.id returning * into job;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'fileId',o.repertoire_file_id,'bucket',o.bucket,'objectKey',o.object_key
  ) order by o.ordinal),'[]'::jsonb) into result_targets
    from genova_055.deletion_objects o where o.job_id = job.id;
  return jsonb_build_object('state',job.state,'targetType',job.target_type,
    'targetId',job.target_id,'targets',result_targets);
end;
$fn$;

revoke all on function public.repertoire_lifecycle_055(text,uuid,uuid,uuid,uuid,text,uuid,text)
  from public, anon, authenticated, service_role;
grant execute on function public.repertoire_lifecycle_055(text,uuid,uuid,uuid,uuid,text,uuid,text)
  to service_role;

comment on function public.repertoire_lifecycle_055(text,uuid,uuid,uuid,uuid,text,uuid,text) is
  '055 Edge-only R2 repertoire lifecycle. Product deletion records exact server-owned cleanup targets first. Replacement refuses annotated files.';
notify pgrst, 'reload schema';
commit;
