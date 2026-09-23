-- 060: private R2 chat image batches and room avatars with live room authorization.
begin;
select pg_advisory_xact_lock(hashtext('genovakorist:060:private-r2-chat-media'));

do $preflight$
begin
  if to_regnamespace('genova_060') is not null
    or to_regclass('public.chat_media_versions') is not null
    or exists(select 1 from information_schema.columns where table_schema='public'
      and table_name='chat_rooms' and column_name='avatar_media_version_id') then
    raise exception '060 refused: private chat media objects already exist';
  end if;
  if to_regnamespace('genova_045') is null
    or to_regprocedure('public.delete_chat_message_for_everyone(uuid)') is null
    or to_regprocedure('genova_044.current_member_can_access_room(uuid,uuid)') is null then
    raise exception '060 refused: chat authority prerequisites are missing';
  end if;
end;
$preflight$;

create schema genova_060;
revoke all on schema genova_060 from public,anon,authenticated,service_role;

create table genova_060.prior_delete_function(definition text not null);
insert into genova_060.prior_delete_function
select pg_get_functiondef('public.delete_chat_message_for_everyone(uuid)'::regprocedure);
revoke all on genova_060.prior_delete_function from public,anon,authenticated,service_role;

create table genova_060.batches(
  actor_id uuid not null,
  batch_id uuid not null,
  choir_id uuid not null,
  actor_member_id uuid not null,
  room_id uuid not null,
  kind text not null check(kind in('message-image','room-avatar')),
  reply_to_id uuid,
  expected_count smallint not null check(expected_count between 1 and 5),
  state text not null default 'uploading' check(state in('uploading','committed','aborting','aborted')),
  message_id uuid,
  prior_avatar_version_id uuid,
  avatar_cleanup_state text check(avatar_cleanup_state in('deleting','deleted')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key(actor_id,batch_id)
);
alter table genova_060.batches enable row level security;
alter table genova_060.batches force row level security;
revoke all on genova_060.batches from public,anon,authenticated,service_role;

create table genova_060.parts(
  actor_id uuid not null,
  batch_id uuid not null,
  position smallint not null check(position between 0 and 4),
  retry_key uuid not null,
  version_id uuid not null unique default gen_random_uuid(),
  lease uuid not null default gen_random_uuid(),
  metadata jsonb not null,
  bucket text not null check(bucket ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  state text not null default 'uploading' check(state in('uploading','ready','deleting','deleted','failed')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key(actor_id,batch_id,position),
  unique(actor_id,retry_key),
  foreign key(actor_id,batch_id) references genova_060.batches(actor_id,batch_id) on delete restrict
);
alter table genova_060.parts enable row level security;
alter table genova_060.parts force row level security;
revoke all on genova_060.parts from public,anon,authenticated,service_role;

create table genova_060.message_deletes(
  actor_id uuid not null,
  retry_key uuid not null,
  choir_id uuid not null,
  message_id uuid not null unique,
  room_id uuid not null,
  targets jsonb not null,
  lease uuid not null default gen_random_uuid(),
  state text not null check(state in('deleting','deleted')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  primary key(actor_id,retry_key)
);
alter table genova_060.message_deletes enable row level security;
alter table genova_060.message_deletes force row level security;
revoke all on genova_060.message_deletes from public,anon,authenticated,service_role;

create table public.chat_media_versions(
  id uuid primary key,
  choir_id uuid not null references public.choirs(id),
  room_id uuid not null references public.chat_rooms(id) on delete restrict,
  kind text not null check(kind in('message-image','room-avatar')),
  batch_id uuid not null,
  position smallint not null check(position between 0 and 4),
  message_id uuid references public.chat_messages(id) on delete restrict,
  created_by uuid not null references public.choir_members(id) on delete restrict,
  provider text not null check(provider='r2'),
  bucket text not null check(bucket ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  object_key text not null check(length(object_key) between 1 and 1024),
  content_length bigint not null check(content_length between 1 and 12582912),
  mime_type text not null check(mime_type in('image/jpeg','image/png','image/webp','image/gif')),
  sha256_hex text not null check(sha256_hex ~ '^[0-9a-f]{64}$'),
  file_name text not null check(length(file_name) between 1 and 255),
  state text not null check(state in('ready','active','deleting','deleted')),
  created_at timestamptz not null default clock_timestamp(),
  unique(bucket,object_key),
  unique(batch_id,position),
  check((kind='message-image' and position between 0 and 4
      and ((state='ready' and message_id is null) or (state<>'ready' and message_id is not null)))
    or (kind='room-avatar' and message_id is null and position=0))
);
alter table public.chat_media_versions enable row level security;
alter table public.chat_media_versions force row level security;
revoke all on public.chat_media_versions from public,anon,authenticated;
grant select on public.chat_media_versions to authenticated,service_role;
grant all on public.chat_media_versions to service_role;

alter table public.chat_rooms add column avatar_media_version_id uuid
  references public.chat_media_versions(id) on delete restrict;
alter table public.chat_rooms add constraint chat_room_avatar_media_alias_060
  check(avatar_media_version_id is null or avatar_url='r2_chat_'||avatar_media_version_id::text);
create index chat_media_room_active_060 on public.chat_media_versions(room_id,kind,created_at desc)
  where state='active';
create index chat_media_message_active_060 on public.chat_media_versions(message_id,position)
  where state='active' and message_id is not null;

create policy chat_media_versions_room_read_060 on public.chat_media_versions
for select to authenticated using(
  state='active' and choir_id=public.current_choir_id()
  and genova_044.current_member_can_access_room(room_id,choir_id)
  and (
    (kind='room-avatar' and exists(select 1 from public.chat_rooms r
      where r.id=chat_media_versions.room_id and r.avatar_media_version_id=chat_media_versions.id))
    or (kind='message-image' and exists(select 1 from public.chat_messages m
      where m.id=chat_media_versions.message_id and m.room_id=chat_media_versions.room_id
        and not m.is_deleted and (m.metadata_json->'private_media_version_ids') ? chat_media_versions.id::text))
  )
);

create function genova_060.guard_private_identity()
returns trigger language plpgsql set search_path='' as $fn$
begin
  if current_user in('postgres','service_role') then return new; end if;
  if tg_table_name='chat_messages' then
    if coalesce(new.metadata_json,'{}'::jsonb) ? 'private_media_version_ids' then
      raise exception 'Private chat media identity is server-owned' using errcode='42501';
    end if;
  elsif tg_table_name='chat_rooms' then
    if new.avatar_media_version_id is distinct from old.avatar_media_version_id
      or (new.avatar_url is distinct from old.avatar_url and coalesce(new.avatar_url,'') like 'r2_chat_%') then
      raise exception 'Private room avatar identity is server-owned' using errcode='42501';
    end if;
  end if;
  return new;
end;
$fn$;
create trigger chat_message_private_media_guard_060 before insert or update of metadata_json
on public.chat_messages for each row execute function genova_060.guard_private_identity();
create trigger chat_room_private_avatar_guard_060 before update of avatar_url,avatar_media_version_id
on public.chat_rooms for each row execute function genova_060.guard_private_identity();

create function genova_060.authorize_actor(
  p_actor_id uuid,p_session_id uuid,p_choir_id uuid,p_room_id uuid,p_kind text
) returns uuid language plpgsql security definer set search_path='' as $fn$
declare actor_member uuid;selected_choir uuid;
begin
  if p_actor_id is null or p_choir_id is null or p_room_id is null
    or p_kind not in('message-image','room-avatar') then
    raise exception 'Chat media access denied' using errcode='42501';end if;
  if p_session_id is not null then
    select s.choir_id into selected_choir from genova_005.active_choir_sessions s
    join public.choir_members m on m.auth_user_id=s.auth_user_id and m.choir_id=s.choir_id and m.is_active
    where s.session_id=p_session_id and s.auth_user_id=p_actor_id;
    if selected_choir is distinct from p_choir_id then
      raise exception 'Chat media access denied' using errcode='42501';end if;
  end if;
  select m.id into actor_member from public.choir_members m where m.auth_user_id=p_actor_id
    and m.choir_id=p_choir_id and m.is_active limit 1;
  if actor_member is null or not exists(select 1 from public.chat_rooms r
      join public.chat_room_members rm on rm.room_id=r.id and rm.choir_id=r.choir_id
      where r.id=p_room_id and r.choir_id=p_choir_id and not r.is_archived and rm.member_id=actor_member)
    or (p_kind='room-avatar' and not exists(select 1 from public.chat_room_members rm
      where rm.room_id=p_room_id and rm.choir_id=p_choir_id and rm.member_id=actor_member and rm.role='admin')) then
    raise exception 'Chat media access denied' using errcode='42501';end if;
  return actor_member;
end;
$fn$;
revoke all on function genova_060.authorize_actor(uuid,uuid,uuid,uuid,text)
  from public,anon,authenticated,service_role;

create function public.can_read_chat_media_060(p_actor_id uuid,p_choir_id uuid,p_file_version_id uuid)
returns boolean language sql stable security definer set search_path='' as $fn$
  select exists(
    select 1 from public.chat_media_versions v
    join public.choir_members actor on actor.auth_user_id=p_actor_id and actor.choir_id=v.choir_id and actor.is_active
    join public.chat_room_members rm on rm.room_id=v.room_id and rm.choir_id=v.choir_id and rm.member_id=actor.id
    where v.id=p_file_version_id and v.choir_id=p_choir_id and v.state='active' and (
      (v.kind='room-avatar' and exists(select 1 from public.chat_rooms r
        where r.id=v.room_id and r.avatar_media_version_id=v.id))
      or (v.kind='message-image' and exists(select 1 from public.chat_messages m
        where m.id=v.message_id and m.room_id=v.room_id and not m.is_deleted
          and (m.metadata_json->'private_media_version_ids') ? v.id::text))
    )
  );
$fn$;
revoke all on function public.can_read_chat_media_060(uuid,uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.can_read_chat_media_060(uuid,uuid,uuid) to service_role;

create function public.chat_media_upload_060(
  p_action text,p_actor_id uuid,p_session_id uuid,p_choir_id uuid,p_retry_key uuid,
  p_metadata jsonb default null,p_bucket text default null,p_lease uuid default null,p_sha256 text default null
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare b genova_060.batches%rowtype;p genova_060.parts%rowtype;member_id uuid;acquired boolean:=false;
  object_key text;ids jsonb;names jsonb;message_row public.chat_messages%rowtype;old_version public.chat_media_versions%rowtype;
begin
  if p_action not in('reserve','commit','finalize-avatar') or p_actor_id is null or p_retry_key is null then
    raise exception 'Invalid chat media upload operation' using errcode='22023';end if;
  if p_action='reserve' then
    if p_metadata is null or jsonb_typeof(p_metadata)<>'object'
      or not(p_metadata ?& array['kind','batchId','roomId','replyToId','expectedCount','position','fileName','mimeType','size'])
      or (select count(*) from jsonb_object_keys(p_metadata))<>9
      or coalesce(p_metadata->>'kind','') not in('message-image','room-avatar')
      or coalesce(p_metadata->>'batchId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(p_metadata->>'roomId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or (p_metadata->'replyToId'<>'null'::jsonb and coalesce(p_metadata->>'replyToId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
      or coalesce(p_metadata->>'expectedCount','') !~ '^[1-5]$'
      or coalesce(p_metadata->>'position','') !~ '^[0-4]$'
      or (p_metadata->>'position')::int >= (p_metadata->>'expectedCount')::int
      or ((p_metadata->>'kind')='room-avatar' and ((p_metadata->>'expectedCount')<>'1' or (p_metadata->>'position')<>'0' or p_metadata->'replyToId'<>'null'::jsonb))
      or coalesce(length(p_metadata->>'fileName'),0) not between 1 and 255
      or (p_metadata->>'fileName') ~ '[[:cntrl:]/\\]'
      or lower(coalesce(p_metadata->>'mimeType','')) not in('image/jpeg','image/png','image/webp','image/gif')
      or coalesce(p_metadata->>'size','') !~ '^[0-9]{1,8}$'
      or coalesce((p_metadata->>'size')::bigint,0) not between 1 and 12582912
      or p_bucket is null or p_bucket !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' then
      raise exception 'Invalid chat media upload metadata' using errcode='22023';end if;
    member_id:=genova_060.authorize_actor(p_actor_id,p_session_id,p_choir_id,
      (p_metadata->>'roomId')::uuid,p_metadata->>'kind');
    if p_metadata->'replyToId'<>'null'::jsonb and not exists(select 1 from public.chat_messages m
      where m.id=(p_metadata->>'replyToId')::uuid and m.room_id=(p_metadata->>'roomId')::uuid
        and m.choir_id=p_choir_id) then raise exception 'Reply is outside room' using errcode='42501';end if;
    insert into genova_060.batches(actor_id,batch_id,choir_id,actor_member_id,room_id,kind,reply_to_id,expected_count)
    values(p_actor_id,(p_metadata->>'batchId')::uuid,p_choir_id,member_id,(p_metadata->>'roomId')::uuid,
      p_metadata->>'kind',nullif(p_metadata->>'replyToId','')::uuid,(p_metadata->>'expectedCount')::smallint)
    on conflict(actor_id,batch_id) do nothing;
    select * into b from genova_060.batches where actor_id=p_actor_id
      and batch_id=(p_metadata->>'batchId')::uuid for update;
    if not found or b.choir_id<>p_choir_id or b.actor_member_id<>member_id
      or b.room_id<>(p_metadata->>'roomId')::uuid or b.kind<>(p_metadata->>'kind')
      or b.reply_to_id is distinct from nullif(p_metadata->>'replyToId','')::uuid
      or b.expected_count<>(p_metadata->>'expectedCount')::smallint then
      raise exception 'Chat media batch conflict' using errcode='23505';end if;
    insert into genova_060.parts(actor_id,batch_id,position,retry_key,metadata,bucket)
    values(p_actor_id,b.batch_id,(p_metadata->>'position')::smallint,p_retry_key,p_metadata,p_bucket)
    on conflict(actor_id,batch_id,position) do nothing returning * into p;acquired:=found;
  end if;
  if p_action<>'reserve' then
    select * into p from genova_060.parts where actor_id=p_actor_id and retry_key=p_retry_key for update;
    if not found then raise exception 'Chat media upload reservation not found' using errcode='42501';end if;
    select * into b from genova_060.batches where actor_id=p.actor_id and batch_id=p.batch_id for update;
  elsif not acquired then
    select * into p from genova_060.parts where actor_id=p_actor_id
      and batch_id=(p_metadata->>'batchId')::uuid and position=(p_metadata->>'position')::smallint for update;
  end if;
  if not found or b.choir_id is distinct from p_choir_id or p.retry_key is distinct from p_retry_key
    or (p_action='reserve' and (p.metadata is distinct from p_metadata or p.bucket is distinct from p_bucket)) then
    raise exception 'Chat media upload conflict' using errcode='23505';end if;
  object_key:='choirs/'||b.choir_id||'/chat/'||b.room_id||'/'||b.kind||'/'||b.batch_id||'/'||p.position||'/'||p.version_id||'/content';

  if p_action='reserve' and p.state='failed' then
    update genova_060.parts set state='uploading',lease=gen_random_uuid(),updated_at=clock_timestamp()
      where actor_id=p.actor_id and batch_id=p.batch_id and position=p.position returning * into p;acquired:=true;
  elsif p_action='commit' then
    if p_lease is null or p_lease<>p.lease then raise exception 'Chat media upload lease conflict' using errcode='23505';end if;
    if p.state='uploading' then
      if coalesce(p_sha256,'') !~ '^[0-9a-f]{64}$' then raise exception 'Invalid verified digest' using errcode='22023';end if;
      member_id:=genova_060.authorize_actor(p_actor_id,p_session_id,p_choir_id,b.room_id,b.kind);
      if member_id<>b.actor_member_id then raise exception 'Chat media access denied' using errcode='42501';end if;
      insert into public.chat_media_versions(id,choir_id,room_id,kind,batch_id,position,message_id,created_by,
        provider,bucket,object_key,content_length,mime_type,sha256_hex,file_name,state)
      values(p.version_id,b.choir_id,b.room_id,b.kind,b.batch_id,p.position,
        null,b.actor_member_id,'r2',p.bucket,object_key,
        (p.metadata->>'size')::bigint,lower(p.metadata->>'mimeType'),p_sha256,p.metadata->>'fileName','ready');
      update genova_060.parts set state='ready',updated_at=clock_timestamp()
        where actor_id=p.actor_id and batch_id=p.batch_id and position=p.position returning * into p;
    end if;
    if b.state='uploading' and (select count(*) from genova_060.parts q where q.actor_id=b.actor_id
      and q.batch_id=b.batch_id and q.state='ready')=b.expected_count then
      select jsonb_agg(to_jsonb(q.version_id::text) order by q.position),
        jsonb_agg(to_jsonb(q.metadata->>'fileName') order by q.position) into ids,names
      from genova_060.parts q where q.actor_id=b.actor_id and q.batch_id=b.batch_id;
      if b.kind='message-image' then
        insert into public.chat_messages(id,choir_id,room_id,sender_id,content,message_type,reply_to_id,metadata_json)
        values(b.batch_id,b.choir_id,b.room_id,b.actor_member_id,'','image',b.reply_to_id,
          jsonb_build_object('private_media_version_ids',ids,'private_media_file_names',names))
        returning * into message_row;
        update public.chat_media_versions set state='active',message_id=b.batch_id where batch_id=b.batch_id;
        update genova_060.batches set state='committed',message_id=b.batch_id,updated_at=clock_timestamp()
          where actor_id=b.actor_id and batch_id=b.batch_id returning * into b;
      else
        select v.* into old_version from public.chat_rooms r join public.chat_media_versions v
          on v.id=r.avatar_media_version_id where r.id=b.room_id for update of r,v;
        if found then update public.chat_media_versions set state='deleting' where id=old_version.id;end if;
        update public.chat_media_versions set state='active' where id=p.version_id;
        update public.chat_rooms set avatar_media_version_id=p.version_id,
          avatar_url='r2_chat_'||p.version_id::text,updated_at=clock_timestamp() where id=b.room_id;
        update genova_060.batches set state='committed',prior_avatar_version_id=old_version.id,
          avatar_cleanup_state=case when old_version.id is null then null else 'deleting' end,
          updated_at=clock_timestamp() where actor_id=b.actor_id and batch_id=b.batch_id returning * into b;
      end if;
    end if;
  elsif p_action='finalize-avatar' then
    if b.kind<>'room-avatar' or b.state<>'committed' or b.prior_avatar_version_id is null
      or b.avatar_cleanup_state<>'deleting' or p_lease is null or p_lease<>p.lease then
      raise exception 'Avatar cleanup state conflict' using errcode='23505';end if;
    update public.chat_media_versions set state='deleted' where id=b.prior_avatar_version_id and state='deleting';
    update genova_060.batches set avatar_cleanup_state='deleted',updated_at=clock_timestamp()
      where actor_id=b.actor_id and batch_id=b.batch_id returning * into b;
  end if;

  if b.state='committed' then
    if b.kind='message-image' then select * into message_row from public.chat_messages where id=b.message_id;end if;
    if b.prior_avatar_version_id is not null then select * into old_version from public.chat_media_versions where id=b.prior_avatar_version_id;end if;
    return jsonb_build_object('state','committed','kind',b.kind,'batchId',b.batch_id,'fileVersionId',p.version_id,
      'message',case when b.kind='message-image' then to_jsonb(message_row) else null end,
      'avatarAlias',case when b.kind='room-avatar' then 'r2_chat_'||p.version_id::text else null end,
      'priorAvatar',case when old_version.id is null then null else jsonb_build_object('fileVersionId',old_version.id,
        'bucket',old_version.bucket,'objectKey',old_version.object_key,'state',old_version.state) end,
      'avatarCleanupState',b.avatar_cleanup_state,'lease',p.lease);
  end if;
  return jsonb_build_object('state',case when p.state='ready' then 'part-ready' else p.state end,
    'kind',b.kind,'batchId',b.batch_id,'position',p.position,'fileVersionId',p.version_id,
    'choirId',b.choir_id,'roomId',b.room_id,'bucket',p.bucket,'objectKey',object_key,
    'lease',p.lease,'acquired',acquired);
end;
$fn$;
revoke all on function public.chat_media_upload_060(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text)
  from public,anon,authenticated,service_role;
grant execute on function public.chat_media_upload_060(text,uuid,uuid,uuid,uuid,jsonb,text,uuid,text) to service_role;

create function public.chat_media_abort_060(
  p_action text,p_actor_id uuid,p_session_id uuid,p_choir_id uuid,p_retry_key uuid,p_batch_id uuid,p_lease uuid default null
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare b genova_060.batches%rowtype;targets jsonb;member_id uuid;
begin
  if p_action not in('reserve','finalize') or p_actor_id is null or p_retry_key is null or p_batch_id is null then
    raise exception 'Invalid chat media abort operation' using errcode='22023';end if;
  select * into b from genova_060.batches where actor_id=p_actor_id and batch_id=p_batch_id for update;
  if not found or b.choir_id<>p_choir_id then raise exception 'Chat media batch not found' using errcode='42501';end if;
  member_id:=genova_060.authorize_actor(p_actor_id,p_session_id,p_choir_id,b.room_id,b.kind);
  if member_id<>b.actor_member_id then raise exception 'Chat media access denied' using errcode='42501';end if;
  if b.state='committed' then return jsonb_build_object('state','committed','batchId',b.batch_id,'messageId',b.message_id);end if;
  if p_action='reserve' and b.state='uploading' then
    update genova_060.batches set state='aborting',updated_at=clock_timestamp() where actor_id=b.actor_id and batch_id=b.batch_id returning * into b;
    update public.chat_media_versions set state='deleting' where batch_id=b.batch_id and state='ready';
    update genova_060.parts set state='deleting' where actor_id=b.actor_id and batch_id=b.batch_id and state='ready';
  elsif p_action='finalize' then
    if b.state<>'aborting' or p_lease is null or p_lease<>p_retry_key then
      raise exception 'Chat media abort state conflict' using errcode='23505';end if;
    update public.chat_media_versions set state='deleted' where batch_id=b.batch_id and state='deleting';
    update genova_060.parts set state='deleted' where actor_id=b.actor_id and batch_id=b.batch_id and state='deleting';
    update genova_060.batches set state='aborted',updated_at=clock_timestamp() where actor_id=b.actor_id and batch_id=b.batch_id returning * into b;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('fileVersionId',v.id,'bucket',v.bucket,'objectKey',v.object_key)
    order by v.position),'[]'::jsonb) into targets from public.chat_media_versions v where v.batch_id=b.batch_id and v.state in('deleting','deleted');
  return jsonb_build_object('state',b.state,'batchId',b.batch_id,'lease',p_retry_key,'targets',targets);
end;
$fn$;
revoke all on function public.chat_media_abort_060(text,uuid,uuid,uuid,uuid,uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.chat_media_abort_060(text,uuid,uuid,uuid,uuid,uuid,uuid) to service_role;

create or replace function public.delete_chat_message_for_everyone(p_message_id uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $fn$
declare actor_member_id uuid:=public.current_chat_member_id();actor_choir_id uuid:=public.current_choir_id();target public.chat_messages;
begin
  select * into target from public.chat_messages where id=p_message_id for update;
  if auth.uid() is null or actor_member_id is null or actor_choir_id is null or not found
    or target.choir_id<>actor_choir_id or target.sender_id<>actor_member_id
    or not genova_044.current_member_can_access_room(target.room_id,target.choir_id) then
    raise exception '044: message is outside sender authority' using errcode='42501';end if;
  if target.metadata_json ? 'private_media_version_ids' then
    raise exception '060: private media deletion requires server reconciliation' using errcode='0A000';end if;
  if clock_timestamp()>target.created_at+interval '1 hour' then raise exception '044: delete window expired' using errcode='22023';end if;
  update public.chat_messages set is_deleted=true,content=null,metadata_json='{}'::jsonb,updated_at=clock_timestamp() where id=target.id;
  return target.id;
end;
$fn$;
revoke all on function public.delete_chat_message_for_everyone(uuid) from public,anon;
grant execute on function public.delete_chat_message_for_everyone(uuid) to authenticated;

create function public.chat_media_message_delete_060(
  p_action text,p_actor_id uuid,p_session_id uuid,p_choir_id uuid,p_retry_key uuid,p_message_id uuid,p_lease uuid default null
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare d genova_060.message_deletes%rowtype;m public.chat_messages%rowtype;member_id uuid;targets jsonb;
begin
  if p_action not in('reserve','finalize') or p_actor_id is null or p_retry_key is null or p_message_id is null then
    raise exception 'Invalid chat media delete operation' using errcode='22023';end if;
  select * into d from genova_060.message_deletes where actor_id=p_actor_id and retry_key=p_retry_key for update;
  if not found and p_action='reserve' then
    select * into m from public.chat_messages where id=p_message_id for update;
    if not found then raise exception 'Chat media message not found' using errcode='42501';end if;
    member_id:=genova_060.authorize_actor(p_actor_id,p_session_id,p_choir_id,m.room_id,'message-image');
    if m.choir_id<>p_choir_id or m.sender_id<>member_id or m.is_deleted
      or clock_timestamp()>m.created_at+interval '1 hour' then raise exception 'Chat media delete denied' using errcode='42501';end if;
    select coalesce(jsonb_agg(jsonb_build_object('fileVersionId',v.id,'bucket',v.bucket,'objectKey',v.object_key)
      order by v.position),'[]'::jsonb) into targets from public.chat_media_versions v
      where v.message_id=m.id and v.state='active';
    if jsonb_array_length(targets)=0 or not(m.metadata_json ? 'private_media_version_ids') then
      raise exception 'Message has no private media' using errcode='P0002';end if;
    insert into genova_060.message_deletes(actor_id,retry_key,choir_id,message_id,room_id,targets,state)
    values(p_actor_id,p_retry_key,p_choir_id,m.id,m.room_id,targets,'deleting') returning * into d;
    update public.chat_media_versions set state='deleting' where message_id=m.id and state='active';
    update public.chat_messages set is_deleted=true,content=null,metadata_json='{}'::jsonb,
      updated_at=clock_timestamp() where id=m.id;
  elsif not found then raise exception 'Chat media delete reservation not found' using errcode='42501';end if;
  if d.message_id<>p_message_id or d.choir_id<>p_choir_id then raise exception 'Chat media delete conflict' using errcode='23505';end if;
  if p_action='finalize' then
    if d.state<>'deleting' or p_lease is null or p_lease<>d.lease then raise exception 'Chat media delete lease conflict' using errcode='23505';end if;
    update public.chat_media_versions set state='deleted' where message_id=d.message_id and state='deleting';
    update genova_060.message_deletes set state='deleted',updated_at=clock_timestamp()
      where actor_id=d.actor_id and retry_key=d.retry_key returning * into d;
  end if;
  return jsonb_build_object('state',d.state,'messageId',d.message_id,'roomId',d.room_id,
    'choirId',d.choir_id,'targets',d.targets,'lease',d.lease);
end;
$fn$;
revoke all on function public.chat_media_message_delete_060(text,uuid,uuid,uuid,uuid,uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.chat_media_message_delete_060(text,uuid,uuid,uuid,uuid,uuid,uuid) to service_role;

notify pgrst,'reload schema';
commit;
