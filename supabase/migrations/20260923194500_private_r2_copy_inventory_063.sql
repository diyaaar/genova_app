-- 063: deterministic service-only inventory of legacy file references for bounded R2 copy.
-- CLI scaffold renamed after 060 so ordered migration runners satisfy the declared dependency.
-- This migration performs no provider request and mutates no product row.
begin;
select pg_advisory_xact_lock(hashtext('genovakorist:063:private-r2-copy-inventory'));

do $preflight$
begin
  if to_regnamespace('genova_063') is not null
    or to_regprocedure('public.private_r2_copy_inventory_063(uuid,text)') is not null then
    raise exception '063 refused: inventory objects already exist';
  end if;
  if to_regclass('public.repertoire_file_storage_locations') is null
    or to_regclass('public.assignment_submission_file_versions') is null
    or to_regclass('public.assignment_review_audio_versions') is null
    or to_regclass('public.assignment_submission_private_history') is null
    or to_regclass('public.repertoire_comment_audio_versions') is null
    or to_regclass('public.chat_media_versions') is null
    or not exists(select 1 from information_schema.columns where table_schema='public'
      and table_name='chat_rooms' and column_name='avatar_media_version_id') then
    raise exception '063 requires the complete 053-060 private storage schema';
  end if;
end;
$preflight$;

create schema genova_063;
revoke all on schema genova_063 from public,anon,authenticated,service_role;

create function genova_063.stable_uuid(value text)
returns uuid language sql immutable strict parallel safe set search_path='' as $fn$
  select (
    substr(md5(value),1,8)||'-'||substr(md5(value),9,4)||'-5'||substr(md5(value),14,3)||
    '-a'||substr(md5(value),18,3)||'-'||substr(md5(value),21,12)
  )::uuid;
$fn$;

create function genova_063.drive_file_id(reference text)
returns text language plpgsql immutable parallel safe set search_path='' as $fn$
declare matched text[]; normalized text:=btrim(reference);
begin
  if normalized ~ '^[A-Za-z0-9_-]{10,200}$' then return normalized; end if;
  matched:=regexp_match(normalized,
    '^https://drive[.]google[.]com/file/d/([A-Za-z0-9_-]{10,200})(?:[/]|[?]|$)','i');
  if matched is not null then return matched[1]; end if;
  matched:=regexp_match(normalized,
    '^https://drive[.]google[.]com/uc(?:[?]|/).*?(?:[?&])id=([A-Za-z0-9_-]{10,200})(?:[&#]|$)','i');
  if matched is not null then return matched[1]; end if;
  return null;
end;
$fn$;

revoke all on function genova_063.stable_uuid(text) from public,anon,authenticated,service_role;
revoke all on function genova_063.drive_file_id(text) from public,anon,authenticated,service_role;

create function public.private_r2_copy_inventory_063(p_choir_id uuid,p_bucket text)
returns table(
  item_id uuid,
  choir_id uuid,
  family text,
  source_owner text,
  source_row_id uuid,
  source_slot text,
  source_version text,
  legacy_reference text,
  legacy_file_id text,
  file_name text,
  mime_type text,
  content_length bigint,
  destination_version_id uuid,
  destination_batch_id uuid,
  destination_bucket text,
  destination_object_key text,
  inventory_status text,
  status_detail text
)
language plpgsql stable security definer set search_path='' as $fn$
begin
  if p_choir_id is null or p_bucket is null
    or p_bucket !~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$' then
    raise exception 'Invalid private copy inventory target' using errcode='22023';
  end if;
  if not exists(select 1 from public.choirs c where c.id=p_choir_id) then
    raise exception 'Unknown choir for private copy inventory' using errcode='22023';
  end if;

  return query
  with
  repertoire_rows as(
    select 'repertoire-file'::text family,'public.repertoire_files'::text owner,f.id row_id,
      'content'::text slot,'legacy-current'::text version,f.drive_file_id reference,
      f.file_name,f.mime_type,f.file_size_bytes content_length,f.id destination_version,null::uuid batch_id,
      coalesce(loc.bucket,p_bucket) bucket,
      coalesce(loc.object_key,'choirs/'||f.choir_id||'/repertoire/'||f.id||'/content') object_key,
      case when loc.id is not null and loc.is_active then
        case when loc.bucket=p_bucket and loc.object_key='choirs/'||f.choir_id||'/repertoire/'||f.id||'/content'
          then 'already-private' else 'private-target-conflict' end
        when coalesce(f.drive_file_id,'') like 'r2\_%' escape '\' then 'private-alias-unresolved'
      end base_status,
      case when loc.id is not null and loc.is_active then 'active repertoire mapping exists'
        when coalesce(f.drive_file_id,'') like 'r2\_%' escape '\' then 'R2 alias has no active mapping'
      end base_detail
    from public.repertoire_files f
    left join public.repertoire_file_storage_locations loc
      on loc.repertoire_file_id=f.id and loc.choir_id=f.choir_id and loc.is_active
    where f.choir_id=p_choir_id and f.drive_file_id is not null
  ),
  assignment_rows as(
    select 'assignment-submission'::text,'public.assignment_submissions'::text,s.id,
      'content'::text,'legacy-current'::text,s.drive_file_id,s.file_name,s.mime_type,s.file_size_bytes,
      coalesce(s.current_file_version_id,genova_063.stable_uuid('063|assignment-current|'||s.id)),null::uuid,
      coalesce(v.bucket,p_bucket),coalesce(v.object_key,'choirs/'||s.choir_id||'/assignments/'||s.assignment_id||
        '/submissions/'||coalesce(s.current_file_version_id,genova_063.stable_uuid('063|assignment-current|'||s.id))||'/content'),
      case when s.current_file_version_id is not null and v.id is not null then
        case when v.bucket=p_bucket then 'already-private' else 'private-target-conflict' end
        when coalesce(s.drive_file_id,'') like 'r2\_%' escape '\' then 'private-alias-unresolved' end,
      case when s.current_file_version_id is not null and v.id is not null then 'current private assignment version exists'
        when coalesce(s.drive_file_id,'') like 'r2\_%' escape '\' then 'R2 alias has no version row' end
    from public.assignment_submissions s
    left join public.assignment_submission_file_versions v on v.id=s.current_file_version_id
    where s.choir_id=p_choir_id and s.drive_file_id is not null
    union all
    select 'assignment-submission','public.assignment_submission_history',h.id,'content','legacy-history',
      h.drive_file_id,h.file_name,h.mime_type,h.file_size_bytes,
      coalesce(h.file_version_id,genova_063.stable_uuid('063|assignment-history|'||h.id)),null::uuid,
      coalesce(v.bucket,p_bucket),coalesce(v.object_key,'choirs/'||h.choir_id||'/assignments/'||h.assignment_id||
        '/submissions/'||coalesce(h.file_version_id,genova_063.stable_uuid('063|assignment-history|'||h.id))||'/content'),
      case when h.file_version_id is not null and v.id is not null then
        case when v.bucket=p_bucket then 'already-private' else 'private-target-conflict' end
        when coalesce(h.drive_file_id,'') like 'r2\_%' escape '\' then 'private-alias-unresolved'
        when h.source_submission_id is null or s.id is null then 'activation-parent-missing' end,
      case when h.file_version_id is not null and v.id is not null then 'private assignment history version exists'
        when coalesce(h.drive_file_id,'') like 'r2\_%' escape '\' then 'R2 alias has no version row'
        when h.source_submission_id is null or s.id is null then 'history has no live submission parent for 057 activation' end
    from public.assignment_submission_history h
    left join public.assignment_submissions s on s.id=h.source_submission_id and s.choir_id=h.choir_id
    left join public.assignment_submission_file_versions v on v.id=h.file_version_id
    where h.choir_id=p_choir_id and h.drive_file_id is not null
  ),
  review_rows as(
    select 'assignment-review'::text,'public.assignment_submissions'::text,s.id,'reviewer-audio'::text,
      'legacy-current'::text,s.reviewer_audio_drive_file_id,s.reviewer_audio_file_name,
      s.reviewer_audio_mime_type,s.reviewer_audio_file_size_bytes,
      coalesce(s.reviewer_audio_file_version_id,genova_063.stable_uuid('063|review-current|'||s.id)),null::uuid,
      coalesce(v.bucket,p_bucket),coalesce(v.object_key,'choirs/'||s.choir_id||'/assignments/'||s.assignment_id||
        '/submissions/'||s.id||'/reviews/'||coalesce(s.reviewer_audio_file_version_id,
          genova_063.stable_uuid('063|review-current|'||s.id))||'/content'),
      case when s.reviewer_audio_file_version_id is not null and v.id is not null then
        case when v.bucket=p_bucket then 'already-private' else 'private-target-conflict' end
        when coalesce(s.reviewer_audio_drive_file_id,'') like 'r2\_review\_%' escape '\' then 'private-alias-unresolved' end,
      case when s.reviewer_audio_file_version_id is not null and v.id is not null then 'current private review version exists'
        when coalesce(s.reviewer_audio_drive_file_id,'') like 'r2\_review\_%' escape '\' then 'R2 review alias has no version row' end
    from public.assignment_submissions s
    left join public.assignment_review_audio_versions v on v.id=s.reviewer_audio_file_version_id
    where s.choir_id=p_choir_id and s.reviewer_audio_drive_file_id is not null
    union all
    select 'assignment-review','public.assignment_submission_private_notes',p.submission_id,'reviewer-audio',
      'legacy-private',p.reviewer_audio_drive_file_id,p.reviewer_audio_file_name,p.reviewer_audio_mime_type,
      p.reviewer_audio_file_size_bytes,coalesce(p.reviewer_audio_file_version_id,
        genova_063.stable_uuid('063|review-private|'||p.submission_id)),null::uuid,
      coalesce(v.bucket,p_bucket),coalesce(v.object_key,'choirs/'||p.choir_id||'/assignments/'||p.assignment_id||
        '/submissions/'||p.submission_id||'/reviews/'||coalesce(p.reviewer_audio_file_version_id,
          genova_063.stable_uuid('063|review-private|'||p.submission_id))||'/content'),
      case when p.reviewer_audio_file_version_id is not null and v.id is not null then
        case when v.bucket=p_bucket then 'already-private' else 'private-target-conflict' end
        when coalesce(p.reviewer_audio_drive_file_id,'') like 'r2\_review\_%' escape '\' then 'private-alias-unresolved'
        when s.id is null then 'activation-parent-missing' end,
      case when p.reviewer_audio_file_version_id is not null and v.id is not null then 'private hidden review version exists'
        when coalesce(p.reviewer_audio_drive_file_id,'') like 'r2\_review\_%' escape '\' then 'R2 review alias has no version row'
        when s.id is null then 'private review has no live submission parent' end
    from public.assignment_submission_private_notes p
    left join public.assignment_submissions s on s.id=p.submission_id and s.choir_id=p.choir_id
    left join public.assignment_review_audio_versions v on v.id=p.reviewer_audio_file_version_id
    where p.choir_id=p_choir_id and p.reviewer_audio_drive_file_id is not null
    union all
    select 'assignment-review','public.assignment_submission_history',h.id,'reviewer-audio','legacy-history',
      h.reviewer_audio_drive_file_id,h.reviewer_audio_file_name,h.reviewer_audio_mime_type,
      h.reviewer_audio_file_size_bytes,coalesce(h.reviewer_audio_file_version_id,
        genova_063.stable_uuid('063|review-history|'||h.id)),null::uuid,
      coalesce(v.bucket,p_bucket),coalesce(v.object_key,'choirs/'||h.choir_id||'/assignments/'||h.assignment_id||
        '/submissions/'||coalesce(h.source_submission_id,h.id)||'/reviews/'||coalesce(h.reviewer_audio_file_version_id,
          genova_063.stable_uuid('063|review-history|'||h.id))||'/content'),
      case when h.reviewer_audio_file_version_id is not null and v.id is not null then
        case when v.bucket=p_bucket then 'already-private' else 'private-target-conflict' end
        when coalesce(h.reviewer_audio_drive_file_id,'') like 'r2\_review\_%' escape '\' then 'private-alias-unresolved'
        when h.source_submission_id is null or s.id is null then 'activation-parent-missing' end,
      case when h.reviewer_audio_file_version_id is not null and v.id is not null then 'private review history version exists'
        when coalesce(h.reviewer_audio_drive_file_id,'') like 'r2\_review\_%' escape '\' then 'R2 review alias has no version row'
        when h.source_submission_id is null or s.id is null then 'review history has no live submission parent' end
    from public.assignment_submission_history h
    left join public.assignment_submissions s on s.id=h.source_submission_id and s.choir_id=h.choir_id
    left join public.assignment_review_audio_versions v on v.id=h.reviewer_audio_file_version_id
    where h.choir_id=p_choir_id and h.reviewer_audio_drive_file_id is not null
    union all
    select 'assignment-review','public.assignment_submission_private_history',p.history_id,'reviewer-audio',
      'legacy-private-history',p.reviewer_audio_drive_file_id,p.reviewer_audio_file_name,p.reviewer_audio_mime_type,
      p.reviewer_audio_file_size_bytes,coalesce(p.reviewer_audio_file_version_id,
        genova_063.stable_uuid('063|review-private-history|'||p.history_id)),null::uuid,
      coalesce(v.bucket,p_bucket),coalesce(v.object_key,'choirs/'||p.choir_id||'/assignments/'||p.assignment_id||
        '/submissions/'||coalesce(h.source_submission_id,p.history_id)||'/reviews/'||coalesce(p.reviewer_audio_file_version_id,
          genova_063.stable_uuid('063|review-private-history|'||p.history_id))||'/content'),
      case when p.reviewer_audio_file_version_id is not null and v.id is not null then
        case when v.bucket=p_bucket then 'already-private' else 'private-target-conflict' end
        when coalesce(p.reviewer_audio_drive_file_id,'') like 'r2\_review\_%' escape '\' then 'private-alias-unresolved'
        when h.source_submission_id is null or s.id is null then 'activation-parent-missing' end,
      case when p.reviewer_audio_file_version_id is not null and v.id is not null then 'private hidden history version exists'
        when coalesce(p.reviewer_audio_drive_file_id,'') like 'r2\_review\_%' escape '\' then 'R2 review alias has no version row'
        when h.source_submission_id is null or s.id is null then 'private review history has no live submission parent' end
    from public.assignment_submission_private_history p
    join public.assignment_submission_history h on h.id=p.history_id and h.choir_id=p.choir_id
    left join public.assignment_submissions s on s.id=h.source_submission_id and s.choir_id=h.choir_id
    left join public.assignment_review_audio_versions v on v.id=p.reviewer_audio_file_version_id
    where p.choir_id=p_choir_id and p.reviewer_audio_drive_file_id is not null
  ),
  comment_rows as(
    select 'repertoire-comment'::text,'public.repertoire_song_comments'::text,c.id,'comment-audio'::text,
      'legacy-current'::text,c.audio_drive_file_id,c.audio_file_name,c.audio_mime_type,c.audio_file_size_bytes,
      coalesce(c.audio_file_version_id,genova_063.stable_uuid('063|comment|'||c.id)),null::uuid,
      coalesce(v.bucket,p_bucket),coalesce(v.object_key,'choirs/'||c.choir_id||'/repertoire/'||c.song_id||
        '/comments/'||c.id||'/audio/'||coalesce(c.audio_file_version_id,
          genova_063.stable_uuid('063|comment|'||c.id))||'/content'),
      case when c.audio_file_version_id is not null and v.id is not null then
        case when v.bucket=p_bucket then 'already-private' else 'private-target-conflict' end
        when coalesce(c.audio_drive_file_id,'') like 'r2\_comment\_%' escape '\' then 'private-alias-unresolved' end,
      case when c.audio_file_version_id is not null and v.id is not null then 'private comment audio version exists'
        when coalesce(c.audio_drive_file_id,'') like 'r2\_comment\_%' escape '\' then 'R2 comment alias has no version row' end
    from public.repertoire_song_comments c
    left join public.repertoire_comment_audio_versions v on v.id=c.audio_file_version_id
    where c.choir_id=p_choir_id and c.audio_drive_file_id is not null
  ),
  legacy_chat_rows as(
    select 'chat-message-image'::text,'public.chat_messages'::text,m.id,
      ('image:'||x.position)::text,'legacy-current'::text,x.reference,null::text,null::text,null::bigint,
      genova_063.stable_uuid('063|chat-image|'||m.id||'|'||x.position),
      genova_063.stable_uuid('063|chat-batch|'||m.id),p_bucket,
      'choirs/'||m.choir_id||'/chat/'||m.room_id||'/message-image/'||
        genova_063.stable_uuid('063|chat-batch|'||m.id)||'/'||x.position||'/'||
        genova_063.stable_uuid('063|chat-image|'||m.id||'|'||x.position)||'/content',
      null::text,null::text
    from public.chat_messages m
    cross join lateral(
      select 0::int position,coalesce(m.metadata_json->>'drive_file_id',m.metadata_json->>'url',
        m.metadata_json->>'web_view_link',m.metadata_json->>'web_content_link') reference
      where greatest(
        case when jsonb_typeof(m.metadata_json->'drive_file_ids')='array' then jsonb_array_length(m.metadata_json->'drive_file_ids') else 0 end,
        case when jsonb_typeof(m.metadata_json->'urls')='array' then jsonb_array_length(m.metadata_json->'urls') else 0 end,
        case when jsonb_typeof(m.metadata_json->'web_view_links')='array' then jsonb_array_length(m.metadata_json->'web_view_links') else 0 end,
        case when jsonb_typeof(m.metadata_json->'web_content_links')='array' then jsonb_array_length(m.metadata_json->'web_content_links') else 0 end
      )=0
      union all
      select n,coalesce(m.metadata_json->'drive_file_ids'->>n,m.metadata_json->'urls'->>n,
        m.metadata_json->'web_view_links'->>n,m.metadata_json->'web_content_links'->>n)
      from generate_series(0,greatest(
        case when jsonb_typeof(m.metadata_json->'drive_file_ids')='array' then jsonb_array_length(m.metadata_json->'drive_file_ids') else 0 end,
        case when jsonb_typeof(m.metadata_json->'urls')='array' then jsonb_array_length(m.metadata_json->'urls') else 0 end,
        case when jsonb_typeof(m.metadata_json->'web_view_links')='array' then jsonb_array_length(m.metadata_json->'web_view_links') else 0 end,
        case when jsonb_typeof(m.metadata_json->'web_content_links')='array' then jsonb_array_length(m.metadata_json->'web_content_links') else 0 end
      )-1) n
    ) x
    where m.choir_id=p_choir_id and m.message_type='image' and not m.is_deleted
      and not(coalesce(m.metadata_json,'{}'::jsonb)?'private_media_version_ids')
  ),
  private_chat_rows as(
    select 'chat-message-image'::text,'public.chat_messages'::text,v.message_id,
      ('image:'||v.position)::text,'private-current'::text,'r2_chat_'||v.id,v.file_name,v.mime_type,v.content_length,
      v.id,v.batch_id,v.bucket,v.object_key,
      case when v.bucket=p_bucket then 'already-private' else 'private-target-conflict' end,
      'private chat media version exists'
    from public.chat_media_versions v
    where v.choir_id=p_choir_id and v.kind='message-image' and v.message_id is not null and v.state='active'
  ),
  avatar_rows as(
    select 'chat-room-avatar'::text,'public.chat_rooms'::text,r.id,'avatar'::text,'legacy-current'::text,
      r.avatar_url,null::text,null::text,null::bigint,
      genova_063.stable_uuid('063|chat-avatar|'||r.id),genova_063.stable_uuid('063|chat-avatar-batch|'||r.id),p_bucket,
      'choirs/'||r.choir_id||'/chat/'||r.id||'/room-avatar/'||genova_063.stable_uuid('063|chat-avatar-batch|'||r.id)||
        '/0/'||genova_063.stable_uuid('063|chat-avatar|'||r.id)||'/content',null::text,null::text
    from public.chat_rooms r
    where r.choir_id=p_choir_id and r.avatar_url is not null and r.avatar_media_version_id is null
    union all
    select 'chat-room-avatar','public.chat_rooms',r.id,'avatar','private-current','r2_chat_'||v.id,
      v.file_name,v.mime_type,v.content_length,v.id,v.batch_id,v.bucket,v.object_key,
      case when v.bucket=p_bucket then 'already-private' else 'private-target-conflict' end,
      'private room avatar version exists'
    from public.chat_rooms r
    join public.chat_media_versions v on v.id=r.avatar_media_version_id and v.room_id=r.id
      and v.kind='room-avatar' and v.state='active'
    where r.choir_id=p_choir_id
  ),
  raw(family,owner,row_id,slot,version,reference,file_name,mime_type,content_length,
      destination_version,batch_id,bucket,object_key,base_status,base_detail) as(
    select * from repertoire_rows union all select * from assignment_rows union all select * from review_rows
    union all select * from comment_rows union all select * from legacy_chat_rows
    union all select * from private_chat_rows union all select * from avatar_rows
  ),
  recognized as(
    select r.*,genova_063.drive_file_id(r.reference) recognized_id,
      genova_063.stable_uuid('063|item|'||p_choir_id||'|'||r.owner||'|'||r.row_id||'|'||r.slot||'|'||r.version) stable_item
    from raw r
  ),
  classified as(
    select x.*,
      case
        when x.base_status is not null then x.base_status
        when x.reference is null or btrim(x.reference)='' then 'missing-reference'
        when x.family='chat-message-image' and split_part(x.slot,':',2)::integer>4
          then 'activation-shape-unsupported'
        when x.reference like 'sb\_%' escape '\' then 'non-drive-storage'
        when x.recognized_id is null then 'unsupported-reference'
        when x.file_name is null or length(btrim(x.file_name)) not between 1 and 255
          or x.mime_type is null or btrim(lower(x.mime_type)) !~ '^[a-z0-9][a-z0-9.+-]*/[a-z0-9][a-z0-9.+-]*$'
          or x.content_length is null or x.content_length<1 then 'needs-provider-metadata'
        when x.content_length>case x.family when 'assignment-submission' then 52428800
          when 'assignment-review' then 20971520 when 'repertoire-comment' then 20971520
          when 'chat-message-image' then 12582912 when 'chat-room-avatar' then 12582912 else 104857600 end
          then 'stored-metadata-invalid'
        else 'ready-for-provider-metadata'
      end final_status,
      coalesce(x.base_detail,
        case when x.reference is null or btrim(x.reference)='' then 'image message has no legacy file reference'
          when x.family='chat-message-image' and split_part(x.slot,':',2)::integer>4
            then 'legacy image batch exceeds the accepted five-part destination contract'
          when x.reference like 'sb\_%' escape '\' then 'Supabase Storage alias is not a Drive object'
          when x.recognized_id is null then 'reference is not a recognized first-party Drive ID or URL'
          when x.file_name is null or x.mime_type is null or x.content_length is null or x.content_length<1
            then 'stored metadata is incomplete; Google metadata is still required for every candidate'
          when x.content_length>case x.family when 'assignment-submission' then 52428800
            when 'assignment-review' then 20971520 when 'repertoire-comment' then 20971520
            when 'chat-message-image' then 12582912 when 'chat-room-avatar' then 12582912 else 104857600 end
            then 'stored length exceeds the accepted family limit'
          else 'structurally ready; Google metadata and bytes remain unverified' end) final_detail
    from recognized x
  )
  select c.stable_item,p_choir_id,c.family,c.owner,c.row_id,c.slot,c.version,c.reference,
    case when c.final_status in('already-private','private-target-conflict','private-alias-unresolved','non-drive-storage')
      then null else c.recognized_id end,
    c.file_name,lower(c.mime_type),c.content_length,c.destination_version,c.batch_id,c.bucket,
    case when c.final_status='activation-shape-unsupported' then null else c.object_key end,
    c.final_status,c.final_detail
  from classified c
  order by case c.family when 'repertoire-file' then 1 when 'assignment-submission' then 2
      when 'assignment-review' then 3 when 'repertoire-comment' then 4
      when 'chat-message-image' then 5 else 6 end,
    c.owner,c.row_id,c.slot,c.version;
end;
$fn$;

revoke all on function public.private_r2_copy_inventory_063(uuid,text)
  from public,anon,authenticated,service_role;
grant execute on function public.private_r2_copy_inventory_063(uuid,text) to service_role;

comment on function public.private_r2_copy_inventory_063(uuid,text) is
  '063 service-only, stable, read-only legacy reference inventory. Output is not provider-verified copy evidence.';

notify pgrst,'reload schema';
commit;
