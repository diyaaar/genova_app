-- 053: server-owned, tenant-bound private object locations for repertoire reads.
-- This migration does not copy, activate or delete any object.

begin;

select pg_advisory_xact_lock(hashtext('genovakorist:053:private-r2-repertoire-read'));

do $preflight$
begin
  if to_regclass('public.repertoire_files') is null
    or to_regclass('public.choirs') is null then
    raise exception '053 requires the tenant-aware repertoire schema';
  end if;
  if to_regclass('public.repertoire_file_storage_locations') is not null
    or to_regnamespace('genova_053') is not null
    or exists (
      select 1 from pg_constraint
      where conrelid = 'public.repertoire_files'::regclass
        and conname = 'repertoire_files_id_choir_id_key_053'
    ) then
    raise exception '053 refused: expected objects already exist';
  end if;
end
$preflight$;

create schema genova_053;
revoke all on schema genova_053 from public, anon, authenticated, service_role;

alter table public.repertoire_files
  add constraint repertoire_files_id_choir_id_key_053 unique (id, choir_id);

create table public.repertoire_file_storage_locations (
  id uuid primary key default gen_random_uuid(),
  repertoire_file_id uuid not null,
  choir_id uuid not null,
  provider text not null,
  bucket text not null,
  object_key text not null,
  content_length bigint not null,
  mime_type text not null,
  sha256_hex text not null,
  verified_at timestamptz not null,
  is_active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint repertoire_file_storage_locations_file_tenant_fkey
    foreign key (repertoire_file_id, choir_id)
    references public.repertoire_files (id, choir_id)
    on delete cascade,
  constraint repertoire_file_storage_locations_provider_check
    check (provider = 'r2'),
  constraint repertoire_file_storage_locations_bucket_check
    check (bucket ~ '^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$'),
  constraint repertoire_file_storage_locations_object_key_check
    check (
      length(object_key) between 1 and 1024
      and object_key ~ '^[A-Za-z0-9][A-Za-z0-9._/-]*$'
      and object_key !~ '(^|/)\.{1,2}(/|$)'
      and object_key not like '%//%'
      and object_key like (
        'choirs/' || choir_id::text || '/repertoire/' || repertoire_file_id::text || '/%'
      )
      and object_key <> (
        'choirs/' || choir_id::text || '/repertoire/' || repertoire_file_id::text || '/'
      )
    ),
  constraint repertoire_file_storage_locations_content_length_check
    check (content_length > 0),
  constraint repertoire_file_storage_locations_mime_type_check
    check (
      mime_type = btrim(mime_type)
      and mime_type ~ '^[a-z0-9][a-z0-9.+-]*/[a-z0-9][a-z0-9.+-]*$'
    ),
  constraint repertoire_file_storage_locations_sha256_check
    check (sha256_hex ~ '^[0-9a-f]{64}$'),
  constraint repertoire_file_storage_locations_provider_object_key_key
    unique (provider, bucket, object_key)
);

create unique index repertoire_file_storage_locations_one_active_file_053
  on public.repertoire_file_storage_locations (repertoire_file_id)
  where is_active;

create index repertoire_file_storage_locations_active_lookup_053
  on public.repertoire_file_storage_locations (repertoire_file_id, choir_id)
  include (provider, bucket, object_key, content_length, mime_type, sha256_hex, verified_at)
  where is_active;

create function genova_053.guard_storage_location_update()
returns trigger
language plpgsql
set search_path = pg_catalog
as $function$
begin
  if new.repertoire_file_id is distinct from old.repertoire_file_id
    or new.choir_id is distinct from old.choir_id
    or new.provider is distinct from old.provider
    or new.bucket is distinct from old.bucket
    or new.object_key is distinct from old.object_key then
    raise exception '053 storage location identity is immutable' using errcode = '23514';
  end if;
  if old.is_active and (
    new.content_length is distinct from old.content_length
    or new.mime_type is distinct from old.mime_type
    or new.sha256_hex is distinct from old.sha256_hex
    or new.verified_at is distinct from old.verified_at
  ) then
    raise exception '053 active verification metadata is immutable' using errcode = '23514';
  end if;
  new.updated_at := timezone('utc', now());
  return new;
end
$function$;

revoke all on function genova_053.guard_storage_location_update()
  from public, anon, authenticated, service_role;

create trigger guard_storage_location_update_053
before update on public.repertoire_file_storage_locations
for each row execute function genova_053.guard_storage_location_update();

alter table public.repertoire_file_storage_locations enable row level security;
alter table public.repertoire_file_storage_locations force row level security;

revoke all on table public.repertoire_file_storage_locations
  from public, anon, authenticated, service_role;
grant select on table public.repertoire_file_storage_locations to service_role;

comment on table public.repertoire_file_storage_locations is
  '053 server-owned verified private object mappings. No client role may read or write this table.';
comment on column public.repertoire_file_storage_locations.object_key is
  'Immutable tenant/file-prefixed provider key; never a URL and never supplied by a client.';
comment on column public.repertoire_file_storage_locations.is_active is
  'Activation is an operator-controlled release action after byte/hash verification.';

notify pgrst, 'reload schema';

commit;
