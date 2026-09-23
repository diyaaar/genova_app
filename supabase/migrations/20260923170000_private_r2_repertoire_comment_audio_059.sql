-- 059: private R2 repertoire comment audio with live target visibility and recoverable delete.
begin;
select pg_advisory_xact_lock(hashtext('genovakorist:059:private-r2-repertoire-comment-audio'));

do $preflight$
begin
  if not exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='repertoire_song_comments' and column_name='is_hidden'
  ) then
    raise exception '059 requires the production is_hidden comment column; reconcile schema history first';
  end if;
end;
$preflight$;

create schema genova_059;
revoke all on schema genova_059 from public,anon,authenticated,service_role;

create table genova_059.uploads(
  actor_id uuid not null,
  retry_key uuid not null,
  choir_id uuid not null,
  actor_member_id uuid not null,
  comment_id uuid not null unique,
  song_id uuid not null,
  version_id uuid not null unique default gen_random_uuid(),
  lease uuid not null default gen_random_uuid(),
  metadata jsonb not null,
  bucket text not null check(bucket ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  state text not null default 'uploading' check(state in('uploading','cleanup','failed','committed')),
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  primary key(actor_id,retry_key)
);
alter table genova_059.uploads enable row level security;
alter table genova_059.uploads force row level security;
revoke all on table genova_059.uploads from public,anon,authenticated,service_role;

create table genova_059.deletes(
  actor_id uuid not null,retry_key uuid not null,choir_id uuid not null,comment_id uuid not null unique,
  version_id uuid,bucket text,object_key text,lease uuid not null default gen_random_uuid(),
  state text not null check(state in('deleting','deleted')),
  created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  primary key(actor_id,retry_key),
  check((version_id is null and bucket is null and object_key is null) or
    (version_id is not null and bucket is not null and object_key is not null))
);
alter table genova_059.deletes enable row level security;
alter table genova_059.deletes force row level security;
revoke all on table genova_059.deletes from public,anon,authenticated,service_role;

create table public.repertoire_comment_audio_versions(
  id uuid primary key,
  choir_id uuid not null references public.choirs(id),
  comment_id uuid not null unique,
  song_id uuid not null references public.repertoire(id) on delete restrict,
  created_by uuid not null references public.choir_members(id) on delete restrict,
  provider text not null check(provider='r2'),
  bucket text not null check(bucket ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  object_key text not null check(length(object_key) between 1 and 1024),
  content_length bigint not null check(content_length between 1 and 20971520),
  mime_type text not null check(mime_type in
    ('audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/aac','audio/ogg','audio/webm','audio/flac')),
  sha256_hex text not null check(sha256_hex ~ '^[0-9a-f]{64}$'),
  file_name text not null check(length(file_name) between 1 and 255),
  created_at timestamptz not null default now(),
  unique(bucket,object_key)
);
alter table public.repertoire_comment_audio_versions enable row level security;
alter table public.repertoire_comment_audio_versions force row level security;
revoke all on table public.repertoire_comment_audio_versions from public,anon,authenticated;
grant select on table public.repertoire_comment_audio_versions to authenticated,service_role;

alter table public.repertoire_song_comments add column audio_file_version_id uuid
  references public.repertoire_comment_audio_versions(id) on delete restrict;
alter table public.repertoire_song_comments add constraint repertoire_comment_audio_version_alias_chk
  check(audio_file_version_id is null or audio_drive_file_id='r2_comment_'||audio_file_version_id::text);
create index repertoire_song_comments_audio_version_idx on public.repertoire_song_comments(audio_file_version_id)
  where audio_file_version_id is not null;

create function genova_059.refuse_version_mutation()
returns trigger language plpgsql set search_path='' as $fn$
begin raise exception 'Repertoire comment audio versions are immutable' using errcode='55000';end;
$fn$;
create trigger repertoire_comment_audio_versions_immutable before update
on public.repertoire_comment_audio_versions for each row execute function genova_059.refuse_version_mutation();

create function genova_059.protect_comment_audio_identity()
returns trigger language plpgsql set search_path='' as $fn$
begin
  if tg_op='DELETE' then
    if old.audio_drive_file_id is not null and current_user not in('postgres','service_role') then
      raise exception 'Comment audio deletion requires server reconciliation' using errcode='42501';
    end if;
    return old;
  end if;
  if row(new.audio_file_version_id,new.audio_drive_file_id,new.audio_file_name,new.audio_mime_type,new.audio_file_size_bytes)
    is distinct from row(old.audio_file_version_id,old.audio_drive_file_id,old.audio_file_name,old.audio_mime_type,old.audio_file_size_bytes)
    and current_user not in('postgres','service_role') then
    raise exception 'Private comment audio identity is server-owned' using errcode='42501';
  end if;
  return new;
end;
$fn$;
create trigger repertoire_comment_audio_identity_update_059 before update of
  audio_file_version_id,audio_drive_file_id,audio_file_name,audio_mime_type,audio_file_size_bytes
  on public.repertoire_song_comments for each row execute function genova_059.protect_comment_audio_identity();
create trigger repertoire_comment_audio_identity_delete_059 before delete
  on public.repertoire_song_comments for each row execute function genova_059.protect_comment_audio_identity();

create policy repertoire_comment_visibility_059 on public.repertoire_song_comments
as restrictive for select to authenticated using(
  public.current_member_has_role('Şef') or (
    not is_hidden and (target_voice_group is null or target_voice_group=public.current_member_voice_group())
  )
);
create policy repertoire_comment_insert_059 on public.repertoire_song_comments
as restrictive for insert to authenticated with check(
  audio_file_version_id is null and audio_drive_file_id is null and created_by=public.current_choir_member_id() and (
    public.current_member_has_role('Şef') or (
      public.current_member_has_role('Partisyon Şefi') and target_voice_group=public.current_member_voice_group()
    )
  )
);
create policy repertoire_comment_update_059 on public.repertoire_song_comments
as restrictive for update to authenticated using(
  public.current_member_has_role('Şef') or (
    created_by=public.current_choir_member_id() and public.current_member_has_role('Partisyon Şefi')
      and target_voice_group=public.current_member_voice_group()
  )
) with check(
  public.current_member_has_role('Şef') or (
    created_by=public.current_choir_member_id() and public.current_member_has_role('Partisyon Şefi')
      and target_voice_group=public.current_member_voice_group()
  )
);
create policy repertoire_comment_delete_059 on public.repertoire_song_comments
as restrictive for delete to authenticated using(
  public.current_member_has_role('Şef') or (
    created_by=public.current_choir_member_id() and public.current_member_has_role('Partisyon Şefi')
      and target_voice_group=public.current_member_voice_group()
  )
);

create policy repertoire_comment_audio_versions_select
on public.repertoire_comment_audio_versions for select to authenticated using(
  choir_id=public.current_choir_id() and exists(
    select 1 from public.repertoire_song_comments c where c.id=repertoire_comment_audio_versions.comment_id
      and c.audio_file_version_id=repertoire_comment_audio_versions.id and (
        public.current_member_has_role('Şef') or (
          not c.is_hidden and (c.target_voice_group is null or c.target_voice_group=public.current_member_voice_group())
        )
      )
  )
);

create function genova_059.authorize_writer(
  actor_id uuid,session_id uuid,choir_id uuid,song_id uuid,target_voice_group text
) returns table(actor_member_id uuid,is_chef boolean)
language plpgsql security invoker set search_path='' as $fn$
declare selected_choir uuid;actor_voice text;leader boolean;
begin
  if actor_id is null or choir_id is null or song_id is null then raise exception 'Comment access denied' using errcode='42501';end if;
  if target_voice_group is not null and target_voice_group not in('Soprano','Alto','Tenor','Bass') then
    raise exception 'Invalid target voice group' using errcode='22023';end if;
  if session_id is not null then
    select s.choir_id into selected_choir from genova_005.active_choir_sessions s
      join public.choir_members m on m.auth_user_id=s.auth_user_id and m.choir_id=s.choir_id and m.is_active
      where s.session_id=authorize_writer.session_id and s.auth_user_id=actor_id;
    if selected_choir is distinct from choir_id then raise exception 'Comment access denied' using errcode='42501';end if;
  end if;
  select m.id,m.voice_group into actor_member_id,actor_voice from public.choir_members m
    where m.auth_user_id=actor_id and m.choir_id=authorize_writer.choir_id and m.is_active limit 1 for share;
  if actor_member_id is null or not exists(select 1 from public.repertoire r
    where r.id=authorize_writer.song_id and r.choir_id=authorize_writer.choir_id) then
    raise exception 'Comment access denied' using errcode='42501';end if;
  select exists(select 1 from public.choir_member_roles cmr join public.roles r on r.id=cmr.role_id
    where cmr.member_id=actor_member_id and r.name='Şef') into is_chef;
  select exists(select 1 from public.choir_member_roles cmr join public.roles r on r.id=cmr.role_id
    where cmr.member_id=actor_member_id and r.name='Partisyon Şefi') into leader;
  if not is_chef and (not leader or actor_voice is null or target_voice_group is distinct from actor_voice) then
    raise exception 'Comment access denied' using errcode='42501';end if;
  return next;
end;
$fn$;
revoke all on function genova_059.authorize_writer(uuid,uuid,uuid,uuid,text)
  from public,anon,authenticated,service_role;

create function public.can_read_repertoire_comment_audio_059(
  p_actor_id uuid,p_choir_id uuid,p_file_version_id uuid
) returns boolean language sql stable security definer set search_path='' as $fn$
  select exists(
    select 1 from public.repertoire_comment_audio_versions v
    join public.repertoire_song_comments c on c.id=v.comment_id and c.audio_file_version_id=v.id
    join public.choir_members actor on actor.auth_user_id=p_actor_id and actor.choir_id=v.choir_id and actor.is_active
    where v.id=p_file_version_id and v.choir_id=p_choir_id and (
      exists(select 1 from public.choir_member_roles cmr join public.roles r on r.id=cmr.role_id
        where cmr.member_id=actor.id and r.name='Şef')
      or (not c.is_hidden and (c.target_voice_group is null or c.target_voice_group=actor.voice_group))
    )
  );
$fn$;
revoke all on function public.can_read_repertoire_comment_audio_059(uuid,uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.can_read_repertoire_comment_audio_059(uuid,uuid,uuid) to service_role;

create function public.repertoire_comment_upload_059(
  p_action text,p_actor_id uuid,p_session_id uuid,p_choir_id uuid,p_retry_key uuid,
  p_metadata jsonb default null,p_bucket text default null,p_lease uuid default null,p_sha256 text default null
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare u genova_059.uploads%rowtype;actor_member uuid;chef boolean;acquired boolean:=false;
  object_key text;comment_row public.repertoire_song_comments%rowtype;target text;
begin
  if p_action not in('reserve','commit','cleanup','failed') or p_actor_id is null or p_retry_key is null then
    raise exception 'Invalid comment upload operation' using errcode='22023';end if;
  if p_action='reserve' then
    if p_metadata is null or jsonb_typeof(p_metadata)<>'object'
      or not(p_metadata ?& array['commentId','songId','contentHtml','targetVoiceGroup','fileName','mimeType','size'])
      or (select count(*) from jsonb_object_keys(p_metadata))<>7
      or coalesce(p_metadata->>'commentId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(p_metadata->>'songId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or jsonb_typeof(p_metadata->'contentHtml')<>'string' or length(p_metadata->>'contentHtml')>65536
      or (p_metadata->'targetVoiceGroup'<>'null'::jsonb and jsonb_typeof(p_metadata->'targetVoiceGroup')<>'string')
      or coalesce(length(p_metadata->>'fileName'),0) not between 1 and 255
      or (p_metadata->>'fileName') ~ '[[:cntrl:]/\\]'
      or lower(coalesce(p_metadata->>'mimeType','')) not in
        ('audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/aac','audio/ogg','audio/webm','audio/flac')
      or coalesce(p_metadata->>'size','') !~ '^[0-9]{1,8}$'
      or coalesce((p_metadata->>'size')::bigint,0) not between 1 and 20971520
      or p_bucket is null or p_bucket !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' then
      raise exception 'Invalid comment upload metadata' using errcode='22023';end if;
    target:=nullif(p_metadata->>'targetVoiceGroup','');
    select * into actor_member,chef from genova_059.authorize_writer(p_actor_id,p_session_id,p_choir_id,
      (p_metadata->>'songId')::uuid,target);
    if exists(select 1 from public.repertoire_song_comments where id=(p_metadata->>'commentId')::uuid) then
      raise exception 'Comment identity already exists' using errcode='23505';end if;
    insert into genova_059.uploads(actor_id,retry_key,choir_id,actor_member_id,comment_id,song_id,metadata,bucket)
      values(p_actor_id,p_retry_key,p_choir_id,actor_member,(p_metadata->>'commentId')::uuid,
        (p_metadata->>'songId')::uuid,p_metadata,p_bucket)
      on conflict(actor_id,retry_key) do nothing returning * into u;acquired:=found;
  end if;
  select * into u from genova_059.uploads where actor_id=p_actor_id and retry_key=p_retry_key for update;
  if not found or u.choir_id is distinct from p_choir_id then raise exception 'Comment upload reservation not found' using errcode='42501';end if;
  object_key:='choirs/'||u.choir_id||'/repertoire/'||u.song_id||'/comments/'||u.comment_id||'/audio/'||u.version_id||'/content';
  if p_action='reserve' then
    if u.metadata is distinct from p_metadata or u.bucket is distinct from p_bucket then
      raise exception 'Comment upload retry conflict' using errcode='23505';end if;
    if u.state='failed' then update genova_059.uploads set state='uploading',lease=gen_random_uuid(),updated_at=now()
      where actor_id=p_actor_id and retry_key=p_retry_key returning * into u;acquired:=true;end if;
  else
    if p_lease is null or p_lease<>u.lease then raise exception 'Comment upload lease conflict' using errcode='23505';end if;
    if p_action='commit' and u.state='uploading' then
      if coalesce(p_sha256,'') !~ '^[0-9a-f]{64}$' then raise exception 'Invalid verified digest' using errcode='22023';end if;
      target:=nullif(u.metadata->>'targetVoiceGroup','');
      select * into actor_member,chef from genova_059.authorize_writer(p_actor_id,p_session_id,p_choir_id,u.song_id,target);
      if actor_member<>u.actor_member_id then raise exception 'Comment access denied' using errcode='42501';end if;
      insert into public.repertoire_comment_audio_versions(id,choir_id,comment_id,song_id,created_by,provider,
        bucket,object_key,content_length,mime_type,sha256_hex,file_name)
      values(u.version_id,u.choir_id,u.comment_id,u.song_id,actor_member,'r2',u.bucket,object_key,
        (u.metadata->>'size')::bigint,lower(u.metadata->>'mimeType'),p_sha256,u.metadata->>'fileName');
      insert into public.repertoire_song_comments(id,choir_id,song_id,content_html,created_by,target_voice_group,
        audio_file_version_id,audio_drive_file_id,audio_file_name,audio_mime_type,audio_file_size_bytes,is_hidden)
      values(u.comment_id,u.choir_id,u.song_id,u.metadata->>'contentHtml',actor_member,target,u.version_id,
        'r2_comment_'||u.version_id,u.metadata->>'fileName',lower(u.metadata->>'mimeType'),
        (u.metadata->>'size')::bigint,false) returning * into comment_row;
      update genova_059.uploads set state='committed',updated_at=now() where actor_id=p_actor_id and retry_key=p_retry_key returning * into u;
    elsif p_action='cleanup' and u.state='uploading' then
      update genova_059.uploads set state='cleanup',updated_at=now() where actor_id=p_actor_id and retry_key=p_retry_key returning * into u;
    elsif p_action='failed' and u.state='cleanup' then
      update genova_059.uploads set state='failed',updated_at=now() where actor_id=p_actor_id and retry_key=p_retry_key returning * into u;
    elsif u.state<>'committed' then raise exception 'Comment upload state conflict' using errcode='23505';end if;
  end if;
  if u.state='committed' then
    select * into comment_row from public.repertoire_song_comments where id=u.comment_id and choir_id=u.choir_id;
    return jsonb_build_object('state','committed','comment',to_jsonb(comment_row),'fileVersionId',u.version_id);
  end if;
  return jsonb_build_object('state',case when p_action='reserve' and not acquired then 'pending' else u.state end,
    'commentId',u.comment_id,'songId',u.song_id,'fileVersionId',u.version_id,'choirId',u.choir_id,
    'bucket',u.bucket,'objectKey',object_key,'lease',case when acquired or p_action<>'reserve' then u.lease else null end);
end;
$fn$;
revoke all on function public.repertoire_comment_upload_059(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)
  from public,anon,authenticated,service_role;
grant execute on function public.repertoire_comment_upload_059(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text) to service_role;

create function public.create_repertoire_text_comment_059(
  p_actor_id uuid,p_session_id uuid,p_choir_id uuid,p_comment_id uuid,p_song_id uuid,p_content_html text,p_target_voice_group text
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare actor_member uuid;chef boolean;comment_row public.repertoire_song_comments%rowtype;
begin
  if p_comment_id is null or p_content_html is null or length(p_content_html)>65536 or not(
    length(btrim(regexp_replace(replace(p_content_html,'&nbsp;',' '),'<[^>]*>','','g')))>0
    or position('<img' in lower(p_content_html))>0
  ) then raise exception 'Comment text is invalid' using errcode='22023';end if;
  select * into actor_member,chef from genova_059.authorize_writer(p_actor_id,p_session_id,p_choir_id,p_song_id,p_target_voice_group);
  select * into comment_row from public.repertoire_song_comments where id=p_comment_id;
  if found then
    if comment_row.choir_id=p_choir_id and comment_row.song_id=p_song_id and comment_row.created_by=actor_member
      and comment_row.content_html=p_content_html and comment_row.target_voice_group is not distinct from p_target_voice_group
      and comment_row.audio_file_version_id is null and comment_row.audio_drive_file_id is null then
      return to_jsonb(comment_row);
    end if;
    raise exception 'Comment identity already exists' using errcode='23505';
  end if;
  insert into public.repertoire_song_comments(id,choir_id,song_id,content_html,created_by,target_voice_group,is_hidden)
    values(p_comment_id,p_choir_id,p_song_id,p_content_html,actor_member,p_target_voice_group,false)
    returning * into comment_row;
  return to_jsonb(comment_row);
end;
$fn$;
revoke all on function public.create_repertoire_text_comment_059(uuid,uuid,uuid,uuid,uuid,text,text)
  from public,anon,authenticated,service_role;
grant execute on function public.create_repertoire_text_comment_059(uuid,uuid,uuid,uuid,uuid,text,text) to service_role;

create function public.repertoire_comment_delete_059(
  p_action text,p_actor_id uuid,p_choir_id uuid,p_retry_key uuid,p_comment_id uuid,p_lease uuid default null
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare d genova_059.deletes%rowtype;c public.repertoire_song_comments%rowtype;v public.repertoire_comment_audio_versions%rowtype;
  actor_member uuid;chef boolean;leader boolean;
begin
  if p_action not in('reserve','finalize') or p_actor_id is null or p_choir_id is null or p_retry_key is null or p_comment_id is null then
    raise exception 'Invalid comment delete operation' using errcode='22023';end if;
  select * into d from genova_059.deletes where actor_id=p_actor_id and retry_key=p_retry_key for update;
  if found then
    if d.choir_id<>p_choir_id or d.comment_id<>p_comment_id then raise exception 'Comment delete retry conflict' using errcode='23505';end if;
  elsif p_action='reserve' then
    select * into c from public.repertoire_song_comments where id=p_comment_id and choir_id=p_choir_id for update;
    if not found then raise exception 'Comment unavailable' using errcode='42501';end if;
    select m.id,exists(select 1 from public.choir_member_roles cmr join public.roles r on r.id=cmr.role_id where cmr.member_id=m.id and r.name='Şef'),
      exists(select 1 from public.choir_member_roles cmr join public.roles r on r.id=cmr.role_id where cmr.member_id=m.id and r.name='Partisyon Şefi')
      into actor_member,chef,leader from public.choir_members m where m.auth_user_id=p_actor_id and m.choir_id=p_choir_id and m.is_active limit 1;
    if actor_member is null or (not chef and (not leader or c.created_by<>actor_member)) then
      raise exception 'Comment access denied' using errcode='42501';end if;
    if c.audio_file_version_id is null and c.audio_drive_file_id is not null then
      raise exception 'Legacy comment deletion requires legacy reconciliation' using errcode='0A000';end if;
    if c.audio_file_version_id is not null then select * into v from public.repertoire_comment_audio_versions where id=c.audio_file_version_id for update;end if;
    insert into genova_059.deletes(actor_id,retry_key,choir_id,comment_id,version_id,bucket,object_key,state)
      values(p_actor_id,p_retry_key,p_choir_id,p_comment_id,v.id,v.bucket,v.object_key,case when v.id is null then 'deleted' else 'deleting' end)
      returning * into d;
    delete from public.repertoire_song_comments where id=p_comment_id;
    if v.id is not null then delete from public.repertoire_comment_audio_versions where id=v.id;end if;
  else raise exception 'Comment delete reservation not found' using errcode='42501';end if;
  if p_action='finalize' then
    if p_lease is null or p_lease<>d.lease then raise exception 'Comment delete lease conflict' using errcode='23505';end if;
    if d.state='deleting' then update genova_059.deletes set state='deleted',updated_at=now()
      where actor_id=p_actor_id and retry_key=p_retry_key returning * into d;end if;
  end if;
  return jsonb_build_object('state',d.state,'commentId',d.comment_id,'fileVersionId',d.version_id,
    'choirId',d.choir_id,'bucket',d.bucket,'objectKey',d.object_key,'lease',d.lease);
end;
$fn$;
revoke all on function public.repertoire_comment_delete_059(text,uuid,uuid,uuid,uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.repertoire_comment_delete_059(text,uuid,uuid,uuid,uuid,uuid) to service_role;

notify pgrst,'reload schema';
commit;
