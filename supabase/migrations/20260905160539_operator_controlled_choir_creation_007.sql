-- 007: create a choir only through an explicitly authorized platform operator.
-- Choir creation, default roles, founding membership and the founding Chef role
-- are committed as one transaction by this database function.

select pg_advisory_xact_lock(hashtext('genovakorist:007:choir-creation'));

set local lock_timeout = '5s';
set local statement_timeout = '90s';

create schema genova_007;
revoke all on schema genova_007 from public, anon, authenticated, service_role;

create table genova_007.platform_operators (
  auth_user_id uuid primary key
    references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid
    references auth.users(id) on delete set null
);

create index platform_operators_granted_by_idx
  on genova_007.platform_operators (granted_by)
  where granted_by is not null;

alter table genova_007.platform_operators enable row level security;
revoke all on table genova_007.platform_operators
  from public, anon, authenticated, service_role;

comment on table genova_007.platform_operators is
  'Private allow-list for global choir creation. A choir-level Chef role does not grant this authority.';

create table genova_007.choir_creation_audit (
  choir_id uuid primary key
    references public.choirs(id) on delete cascade,
  operator_auth_user_id uuid
    references auth.users(id) on delete set null,
  founder_auth_user_id uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index choir_creation_audit_operator_idx
  on genova_007.choir_creation_audit (operator_auth_user_id)
  where operator_auth_user_id is not null;

create index choir_creation_audit_founder_idx
  on genova_007.choir_creation_audit (founder_auth_user_id)
  where founder_auth_user_id is not null;

alter table genova_007.choir_creation_audit enable row level security;
revoke all on table genova_007.choir_creation_audit
  from public, anon, authenticated, service_role;

comment on table genova_007.choir_creation_audit is
  'Server-owned audit link for choirs created through the 007 operator workflow.';

create function public.create_operator_choir(
  p_choir_name text,
  p_choir_slug text,
  p_founder_auth_user_id uuid,
  p_founder_first_name text,
  p_founder_last_name text
)
returns table (
  choir_id uuid,
  member_id uuid,
  choir_slug text,
  choir_name text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_auth_user_id uuid := auth.uid();
  normalized_choir_name text := btrim(p_choir_name);
  normalized_choir_slug text := lower(btrim(p_choir_slug));
  normalized_first_name text := btrim(p_founder_first_name);
  normalized_last_name text := btrim(p_founder_last_name);
  founder_email text;
  created_choir_id uuid;
  created_member_id uuid;
  chef_role_id uuid;
  original_jwt_claims text := current_setting('request.jwt.claims', true);
  original_jwt_claim_sub text := current_setting('request.jwt.claim.sub', true);
begin
  if caller_auth_user_id is null or not exists (
    select 1
    from genova_007.platform_operators operator_record
    where operator_record.auth_user_id = caller_auth_user_id
  ) then
    raise insufficient_privilege using message = 'Platform operator authorization is required.';
  end if;

  if normalized_choir_name is null
    or length(normalized_choir_name) < 2
    or length(normalized_choir_name) > 120 then
    raise invalid_parameter_value using message = 'Choir name must be between 2 and 120 characters.';
  end if;

  if normalized_choir_slug is null
    or length(normalized_choir_slug) < 3
    or length(normalized_choir_slug) > 63
    or normalized_choir_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise invalid_parameter_value using message = 'Choir slug is invalid.';
  end if;

  if normalized_first_name is null
    or length(normalized_first_name) < 1
    or length(normalized_first_name) > 80
    or normalized_last_name is null
    or length(normalized_last_name) < 1
    or length(normalized_last_name) > 80 then
    raise invalid_parameter_value using message = 'Founder name is invalid.';
  end if;

  select lower(btrim(user_account.email))
  into founder_email
  from auth.users user_account
  where user_account.id = p_founder_auth_user_id
    and user_account.deleted_at is null
    and (
      user_account.banned_until is null
      or user_account.banned_until <= now()
    );

  if founder_email is null or founder_email = '' then
    raise invalid_parameter_value using message = 'Founder must be an active Auth user with an email address.';
  end if;

  -- Serialize the same normalized slug so concurrent requests fail predictably
  -- at the unique constraint without interleaving the dependent inserts.
  perform pg_advisory_xact_lock(
    hashtext('genovakorist:007:choir-slug:' || normalized_choir_slug)
  );

  insert into public.choirs (slug, name)
  values (normalized_choir_slug, normalized_choir_name)
  returning id into created_choir_id;

  insert into public.roles (choir_id, name)
  values
    (created_choir_id, 'Korist'),
    (created_choir_id, 'Partisyon Şefi'),
    (created_choir_id, 'Şef');

  select role_record.id
  into strict chef_role_id
  from public.roles role_record
  where role_record.choir_id = created_choir_id
    and role_record.name = 'Şef';

  -- The 003 trigger correctly prevents an authenticated caller from assigning
  -- another Auth identity. This vetted definer function has already captured
  -- and authorized the caller, so clear the request identity only around the
  -- founding membership insert and restore it before continuing.
  begin
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);

    insert into public.choir_members (
      choir_id,
      auth_user_id,
      email,
      first_name,
      last_name,
      voice_group,
      join_date,
      is_active
    ) values (
      created_choir_id,
      p_founder_auth_user_id,
      founder_email,
      normalized_first_name,
      normalized_last_name,
      'Şef',
      current_date,
      true
    )
    returning id into created_member_id;

    perform set_config('request.jwt.claims', coalesce(original_jwt_claims, ''), true);
    perform set_config('request.jwt.claim.sub', coalesce(original_jwt_claim_sub, ''), true);
  exception when others then
    perform set_config('request.jwt.claims', coalesce(original_jwt_claims, ''), true);
    perform set_config('request.jwt.claim.sub', coalesce(original_jwt_claim_sub, ''), true);
    raise;
  end;

  insert into public.choir_member_roles (choir_id, member_id, role_id)
  values (created_choir_id, created_member_id, chef_role_id);

  insert into genova_007.choir_creation_audit (
    choir_id,
    operator_auth_user_id,
    founder_auth_user_id
  ) values (
    created_choir_id,
    caller_auth_user_id,
    p_founder_auth_user_id
  );

  return query
  select
    created_choir_id,
    created_member_id,
    normalized_choir_slug,
    normalized_choir_name;
end;
$function$;

revoke all on function public.create_operator_choir(text, text, uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.create_operator_choir(text, text, uuid, text, text)
  to authenticated;

comment on function public.create_operator_choir(text, text, uuid, text, text) is
  'Atomically creates a choir, its default roles, an existing Auth user founding membership and the founding Chef role for an allow-listed platform operator.';
