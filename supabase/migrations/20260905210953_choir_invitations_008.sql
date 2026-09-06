-- 008: user-JWT-only invitation workflow; no direct invitation-table access.
begin;
set local lock_timeout = '5s';
create schema genova_008;
revoke all on schema genova_008 from public, anon, authenticated, service_role;

create table genova_008.invitations (
  id uuid primary key default gen_random_uuid(),
  choir_id uuid not null references public.choirs(id) on delete cascade,
  email text not null,
  first_name text not null check (length(first_name) between 1 and 80),
  last_name text not null check (length(last_name) between 1 and 80),
  voice_group text not null check (voice_group in ('Soprano','Alto','Tenor','Bass')),
  token_hash text not null unique,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  revoked_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  check (email = lower(btrim(email)) and length(email) between 3 and 254),
  check (expires_at > created_at),
  check ((accepted_at is null) = (accepted_by is null)),
  check (accepted_at is null or revoked_at is null)
);
create index invitations_choir_created_idx on genova_008.invitations(choir_id, created_at desc);
create index invitations_creator_idx on genova_008.invitations(created_by);
create index invitations_acceptor_idx on genova_008.invitations(accepted_by) where accepted_by is not null;
create unique index invitations_pending_email_idx on genova_008.invitations(choir_id,email)
  where revoked_at is null and accepted_at is null;
alter table genova_008.invitations enable row level security;
revoke all on genova_008.invitations from public, anon, authenticated, service_role;

-- Privileged mutation is necessary behind the 006 direct-DML lock. Every action
-- authenticates a live session, then authorizes either the current Chef or recipient.
create function public.choir_invitation_command(p_action text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $fn$
declare
  caller uuid := auth.uid();
  account_email text;
  target_choir uuid;
  recipient text;
  raw_token text;
  inv genova_008.invitations%rowtype;
  new_member uuid;
  korist_role uuid;
  rows_json jsonb;
begin
  select lower(btrim(u.email)) into account_email from auth.users u
  where u.id = caller and u.email_confirmed_at is not null and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= now())
    and exists (select 1 from auth.sessions s where s.user_id = u.id
      and s.id = genova_005.current_session_id()
      and (s.not_after is null or s.not_after > now()));
  if account_email is null then
    raise insufficient_privilege using message = 'Verified active account required';
  end if;
  if p_action is null or p_action not in ('create','list','revoke','accept')
    or jsonb_typeof(p_payload) is distinct from 'object' then
    raise invalid_parameter_value using message = 'Invalid invitation command';
  end if;

  if p_action <> 'accept' then
    target_choir := (p_payload->>'choirId')::uuid;
    if target_choir is null or target_choir is distinct from public.current_choir_id()
      or not public.current_member_has_role('Şef') then
      raise insufficient_privilege using message = 'Current choir Chef required';
    end if;
    -- Serialize management and acceptance for this choir. Unique constraints
    -- additionally protect recipient and membership identity under concurrency.
    perform pg_advisory_xact_lock(hashtextextended('genova:008:' || target_choir,0));
  end if;

  if p_action = 'list' then
    select coalesce(jsonb_agg(t), '[]'::jsonb) into rows_json from (
      select i.id, i.email, i.first_name, i.last_name, i.voice_group,
        i.expires_at, i.accepted_at, i.revoked_at
      from genova_008.invitations i where i.choir_id = target_choir
      order by i.created_at desc, i.id limit 100
    ) t;
    return jsonb_build_object('invitations',rows_json);
  elsif p_action = 'create' then
    recipient := lower(btrim(p_payload->>'email'));
    if recipient is null or length(recipient) > 254 or recipient !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
      or coalesce(length(btrim(p_payload->>'firstName')),0) not between 1 and 80
      or coalesce(length(btrim(p_payload->>'lastName')),0) not between 1 and 80
      or coalesce(p_payload->>'voiceGroup','') not in ('Soprano','Alto','Tenor','Bass') then
      raise invalid_parameter_value using message = 'Invalid recipient';
    end if;
    if exists(select 1 from public.choir_members m where m.choir_id = target_choir
      and lower(btrim(m.email)) = recipient) then
      raise unique_violation using message = 'Membership already exists';
    end if;
    -- Bound abuse without introducing commercial plan semantics.
    if (select count(*) from genova_008.invitations i where i.choir_id = target_choir
      and i.created_at > now() - interval '1 hour') >= 50 then
      raise program_limit_exceeded using message = 'Invitation rate limit';
    end if;
    update genova_008.invitations set revoked_at = now()
      where choir_id = target_choir and email = recipient
      and revoked_at is null and accepted_at is null;
    raw_token := replace(gen_random_uuid()::text || gen_random_uuid()::text,'-','');
    insert into genova_008.invitations(choir_id,email,first_name,last_name,voice_group,token_hash,created_by)
    values(target_choir,recipient,btrim(p_payload->>'firstName'),btrim(p_payload->>'lastName'),
      p_payload->>'voiceGroup',encode(sha256(convert_to(raw_token,'UTF8')),'hex'),caller)
    returning * into inv;
    return jsonb_build_object('id',inv.id,'token',raw_token,'expiresAt',inv.expires_at);
  elsif p_action = 'revoke' then
    update genova_008.invitations set revoked_at = now()
      where id = (p_payload->>'invitationId')::uuid and choir_id = target_choir
      and accepted_at is null and revoked_at is null;
    if not found then raise invalid_parameter_value using message = 'Invitation unavailable'; end if;
    return jsonb_build_object('revoked',true);
  end if;

  raw_token := p_payload->>'token';
  if raw_token is null or raw_token !~ '^[a-f0-9]{64}$' then
    raise invalid_parameter_value using message = 'Invitation unavailable';
  end if;
  select i.choir_id into target_choir from genova_008.invitations i
    where i.token_hash = encode(sha256(convert_to(raw_token,'UTF8')),'hex');
  if target_choir is null then raise invalid_parameter_value using message = 'Invitation unavailable'; end if;
  perform pg_advisory_xact_lock(hashtextextended('genova:008:' || target_choir,0));
  select * into inv from genova_008.invitations i
    where i.token_hash = encode(sha256(convert_to(raw_token,'UTF8')),'hex') for update;
  if inv.email <> account_email or inv.revoked_at is not null
    or inv.accepted_at is not null or inv.expires_at <= clock_timestamp() then
    raise invalid_parameter_value using message = 'Invitation unavailable';
  end if;
  if not exists (
    select 1 from public.choir_members m
    join public.choir_member_roles mr on mr.member_id=m.id and mr.choir_id=m.choir_id
    join public.roles r on r.id=mr.role_id and r.choir_id=m.choir_id
    where m.choir_id=inv.choir_id and m.auth_user_id=inv.created_by and m.is_active and r.name='Şef'
  ) then raise invalid_parameter_value using message = 'Invitation unavailable'; end if;
  if exists(select 1 from public.choir_members m where m.choir_id=inv.choir_id
    and (m.auth_user_id=caller or lower(btrim(m.email))=account_email)) then
    raise unique_violation using message = 'Membership already exists';
  end if;
  select r.id into strict korist_role from public.roles r where r.choir_id=inv.choir_id and r.name='Korist';
  insert into public.choir_members(choir_id,auth_user_id,email,first_name,last_name,voice_group,join_date,is_active)
    values(inv.choir_id,caller,account_email,inv.first_name,inv.last_name,inv.voice_group,current_date,true)
    returning id into new_member;
  insert into public.choir_member_roles(choir_id,member_id,role_id)
    values(inv.choir_id,new_member,korist_role);
  update genova_008.invitations set accepted_at=now(),accepted_by=caller where id=inv.id;
  return jsonb_build_object('choirId',inv.choir_id,'memberId',new_member);
end;
$fn$;
revoke all on function public.choir_invitation_command(text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.choir_invitation_command(text,jsonb) to authenticated;
comment on function public.choir_invitation_command(text,jsonb) is
  '008: verified live-session Chef manages current-choir invitations; verified recipient accepts once as Korist. No raw token is persisted or listed.';
commit;
