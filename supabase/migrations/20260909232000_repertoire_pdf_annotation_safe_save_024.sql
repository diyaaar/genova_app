-- 024: make whole-layer annotation writes revision-checked and server-bound.
--
-- This migration deliberately leaves the existing RLS policies in force. The
-- authenticated RPC is SECURITY INVOKER, derives identity from the active choir
-- helpers and never accepts tenant, song, member, row or audit identifiers.

begin;

select pg_advisory_xact_lock(hashtext('genovakorist:024:annotation-safe-save'));

set local lock_timeout = '5s';
set local statement_timeout = '90s';

lock table public.repertoire_pdf_annotations in share row exclusive mode;

do $preflight$
begin
  if exists (
    select 1
    from public.repertoire_pdf_annotations annotation
    join public.repertoire_files file on file.id = annotation.repertoire_file_id
    where annotation.song_id is distinct from file.song_id
       or annotation.choir_id is distinct from file.choir_id
  ) then
    raise exception '024 refused: existing annotation song/file/choir mismatch';
  end if;

  if to_regprocedure(
    'public.save_repertoire_pdf_annotation_snapshot(uuid,integer,text,text,integer,jsonb,bigint)'
  ) is not null then
    raise exception '024 refused: annotation snapshot RPC already exists';
  end if;
end
$preflight$;

create schema genova_024;
revoke all on schema genova_024 from public, anon, authenticated, service_role;

create table genova_024.function_backup (
  signature text primary key,
  definition text not null
);

insert into genova_024.function_backup (signature, definition)
select
  routine.oid::regprocedure::text,
  pg_get_functiondef(routine.oid)
from pg_proc routine
join pg_namespace namespace on namespace.oid = routine.pronamespace
where namespace.nspname = 'public'
  and routine.proname = 'set_repertoire_pdf_annotations_updated_fields';

do $backup_check$
begin
  if (select count(*) from genova_024.function_backup) <> 1 then
    raise exception '024 expected exactly one annotation update trigger function';
  end if;
end
$backup_check$;

revoke all on table genova_024.function_backup
  from public, anon, authenticated, service_role;

alter table public.repertoire_pdf_annotations
  add column revision bigint not null default 1,
  add constraint repertoire_pdf_annotations_revision_positive_chk
    check (revision > 0);

create or replace function public.set_repertoire_pdf_annotations_updated_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_member_id uuid := public.current_choir_member_id();
  current_choir_id uuid := public.current_choir_id();
  verified_song_id uuid;
  verified_choir_id uuid;
begin
  if (select auth.uid()) is not null then
    if current_member_id is null or current_choir_id is null then
      raise exception 'ANNOTATION_FORBIDDEN: active choir membership is required'
        using errcode = '42501';
    end if;

    select file.song_id, file.choir_id
    into verified_song_id, verified_choir_id
    from public.repertoire_files file
    where file.id = new.repertoire_file_id
      and file.choir_id = current_choir_id;

    if not found then
      raise exception 'ANNOTATION_FORBIDDEN: repertoire file is unavailable in the active choir'
        using errcode = '42501';
    end if;
  else
    select file.song_id, file.choir_id
    into verified_song_id, verified_choir_id
    from public.repertoire_files file
    where file.id = new.repertoire_file_id;

    if not found then
      raise exception 'ANNOTATION_INVALID: repertoire file does not exist'
        using errcode = '22023';
    end if;
  end if;

  if tg_op = 'UPDATE' and (
    new.repertoire_file_id is distinct from old.repertoire_file_id
    or new.page_number is distinct from old.page_number
    or new.layer_type is distinct from old.layer_type
    or new.owner_member_id is distinct from old.owner_member_id
    or new.target_voice_group is distinct from old.target_voice_group
  ) then
    raise exception 'ANNOTATION_INVALID: logical row identity is immutable'
      using errcode = '22023';
  end if;

  new.song_id := verified_song_id;
  new.choir_id := verified_choir_id;

  if tg_op = 'INSERT' then
    new.revision := 1;
    if current_member_id is not null then
      new.created_by := current_member_id;
      new.updated_by := current_member_id;
    end if;
  else
    new.created_by := old.created_by;
    new.revision := old.revision + 1;
    if current_member_id is not null then
      new.updated_by := current_member_id;
    end if;
  end if;

  new.updated_at := timezone('utc', now());
  return new;
end;
$function$;

comment on function public.set_repertoire_pdf_annotations_updated_fields() is
  '024: derives annotation tenant/song from the file, stamps authenticated audit identity, preserves logical row identity and owns the monotonic revision.';

create function public.save_repertoire_pdf_annotation_snapshot(
  p_repertoire_file_id uuid,
  p_page_number integer,
  p_layer_type text,
  p_target_voice_group text,
  p_schema_version integer,
  p_annotations_json jsonb,
  p_expected_revision bigint
)
returns table (
  annotation_id uuid,
  next_revision bigint,
  deleted boolean,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  active_choir_id uuid := public.current_choir_id();
  active_member_id uuid := public.current_choir_member_id();
  active_voice_group text := public.current_member_voice_group();
  caller_is_chef boolean := public.current_member_has_role('Şef');
  caller_is_section_leader boolean := public.current_member_has_role('Partisyon Şefi');
  verified_song_id uuid;
  existing_row public.repertoire_pdf_annotations%rowtype;
  written_row public.repertoire_pdf_annotations%rowtype;
begin
  if (select auth.uid()) is null or active_choir_id is null or active_member_id is null then
    raise exception 'ANNOTATION_FORBIDDEN: authenticated active choir membership is required'
      using errcode = '42501';
  end if;

  if p_repertoire_file_id is null
    or p_page_number is null
    or p_page_number <= 0
    or p_schema_version is distinct from 1
    or jsonb_typeof(p_annotations_json) is distinct from 'array'
    or jsonb_array_length(p_annotations_json) > 5000
    or (p_expected_revision is not null and p_expected_revision <= 0) then
    raise exception 'ANNOTATION_INVALID: file, positive page/revision, schema 1 and an array of at most 5000 items are required'
      using errcode = '22023';
  end if;

  if p_layer_type = 'personal' then
    if p_target_voice_group is not null then
      raise exception 'ANNOTATION_INVALID: personal layer cannot target a voice group'
        using errcode = '22023';
    end if;
  elsif p_layer_type = 'shared_voice_group' then
    if p_target_voice_group is null
      or p_target_voice_group not in ('Soprano', 'Alto', 'Tenor', 'Bass') then
      raise exception 'ANNOTATION_INVALID: shared voice layer requires a canonical voice group'
        using errcode = '22023';
    end if;
    if not caller_is_chef
      and not (caller_is_section_leader and active_voice_group = p_target_voice_group) then
      raise exception 'ANNOTATION_FORBIDDEN: voice layer mutation is not permitted'
        using errcode = '42501';
    end if;
  elsif p_layer_type = 'shared_all' then
    if p_target_voice_group is not null then
      raise exception 'ANNOTATION_INVALID: shared-all layer cannot target a voice group'
        using errcode = '22023';
    end if;
    if not caller_is_chef then
      raise exception 'ANNOTATION_FORBIDDEN: shared-all mutation requires chef role'
        using errcode = '42501';
    end if;
  else
    raise exception 'ANNOTATION_INVALID: unsupported layer type'
      using errcode = '22023';
  end if;

  select file.song_id
  into verified_song_id
  from public.repertoire_files file
  where file.id = p_repertoire_file_id
    and file.choir_id = active_choir_id;

  if not found then
    raise exception 'ANNOTATION_FORBIDDEN: repertoire file is unavailable in the active choir'
      using errcode = '42501';
  end if;

  select annotation.*
  into existing_row
  from public.repertoire_pdf_annotations annotation
  where annotation.repertoire_file_id = p_repertoire_file_id
    and annotation.page_number = p_page_number
    and annotation.layer_type = p_layer_type
    and (
      (p_layer_type = 'personal'
        and annotation.owner_member_id = active_member_id
        and annotation.target_voice_group is null)
      or (p_layer_type = 'shared_voice_group'
        and annotation.owner_member_id is null
        and annotation.target_voice_group = p_target_voice_group)
      or (p_layer_type = 'shared_all'
        and annotation.owner_member_id is null
        and annotation.target_voice_group is null)
    )
  for update;

  if found then
    if p_expected_revision is null or existing_row.revision <> p_expected_revision then
      raise exception 'ANNOTATION_CONFLICT: expected revision does not match the stored row'
        using errcode = '40001';
    end if;

    if jsonb_array_length(p_annotations_json) = 0 then
      delete from public.repertoire_pdf_annotations annotation
      where annotation.id = existing_row.id
        and annotation.revision = p_expected_revision
      returning annotation.* into written_row;

      if not found then
        raise exception 'ANNOTATION_CONFLICT: annotation row changed before delete'
          using errcode = '40001';
      end if;

      return query select existing_row.id, null::bigint, true, null::timestamptz;
      return;
    end if;

    update public.repertoire_pdf_annotations annotation
    set annotations_json = p_annotations_json,
        schema_version = p_schema_version::smallint
    where annotation.id = existing_row.id
      and annotation.revision = p_expected_revision
    returning annotation.* into written_row;

    if not found then
      raise exception 'ANNOTATION_CONFLICT: annotation row changed before update'
        using errcode = '40001';
    end if;

    return query
      select written_row.id, written_row.revision, false, written_row.updated_at;
    return;
  end if;

  if p_expected_revision is not null then
    raise exception 'ANNOTATION_CONFLICT: expected annotation row is missing'
      using errcode = '40001';
  end if;

  if jsonb_array_length(p_annotations_json) = 0 then
    return query select null::uuid, null::bigint, true, null::timestamptz;
    return;
  end if;

  begin
    insert into public.repertoire_pdf_annotations (
      song_id,
      repertoire_file_id,
      page_number,
      layer_type,
      owner_member_id,
      target_voice_group,
      annotations_json,
      schema_version,
      choir_id
    ) values (
      verified_song_id,
      p_repertoire_file_id,
      p_page_number,
      p_layer_type,
      case when p_layer_type = 'personal' then active_member_id else null end,
      case when p_layer_type = 'shared_voice_group' then p_target_voice_group else null end,
      p_annotations_json,
      p_schema_version::smallint,
      active_choir_id
    )
    returning * into written_row;
  exception when unique_violation then
    raise exception 'ANNOTATION_CONFLICT: annotation row was created concurrently'
      using errcode = '40001';
  end;

  return query
    select written_row.id, written_row.revision, false, written_row.updated_at;
end;
$function$;

revoke all on function public.save_repertoire_pdf_annotation_snapshot(
  uuid, integer, text, text, integer, jsonb, bigint
) from public, anon, service_role;
grant execute on function public.save_repertoire_pdf_annotation_snapshot(
  uuid, integer, text, text, integer, jsonb, bigint
) to authenticated;

comment on function public.save_repertoire_pdf_annotation_snapshot(
  uuid, integer, text, text, integer, jsonb, bigint
) is
  '024: atomically creates, revision-updates or deletes one authorized whole annotation layer snapshot. Null expected revision requires absence; positive revision requires an exact stored row.';

notify pgrst, 'reload schema';

commit;
