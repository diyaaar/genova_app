-- Minimal synthetic 048 source. LOCAL ISOLATED POSTGRESQL 17 ONLY.
-- It models only the chat read/RPC prerequisites and contains no project data.

do $roles$
begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end
$roles$;

create schema auth;
create table auth.users (
  id uuid primary key,
  instance_id uuid,
  aud text,
  role text,
  email text,
  encrypted_password text,
  email_confirmed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $function$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub',true),''),
    nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub'
  )::uuid;
$function$;
grant usage on schema auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;

create table public.choirs (id uuid primary key,slug text not null,name text not null);
create table public.choir_members (
  id uuid primary key,auth_user_id uuid not null references auth.users(id),
  choir_id uuid not null references public.choirs(id),first_name text not null,last_name text not null,
  voice_group text,join_date date,is_active boolean not null default true
);
create table public.chat_rooms (
  id uuid primary key,choir_id uuid not null references public.choirs(id),name text not null,slug text,
  description text,type text not null,created_by uuid references public.choir_members(id),avatar_url text,
  is_archived boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table public.chat_room_members (
  id uuid primary key default gen_random_uuid(),choir_id uuid not null references public.choirs(id),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  member_id uuid not null references public.choir_members(id) on delete cascade,nickname text,
  role text not null default 'member',joined_at timestamptz not null default now(),last_read_at timestamptz,
  notifications_enabled boolean not null default true,hidden_at timestamptz,unique(room_id,member_id)
);
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),choir_id uuid not null references public.choirs(id),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.choir_members(id),content text,message_type text not null default 'text',
  reply_to_id uuid references public.chat_messages(id),metadata_json jsonb not null default '{}'::jsonb,
  is_edited boolean not null default false,is_deleted boolean not null default false,
  created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index idx_chat_messages_room_created on public.chat_messages(room_id,created_at desc);

create function public.current_choir_id() returns uuid language sql stable security definer
set search_path=pg_catalog,public,auth as $function$
  select member.choir_id from public.choir_members member
  where member.auth_user_id=auth.uid() and member.is_active is true order by member.id limit 1;
$function$;
create function public.current_chat_member_id() returns uuid language sql stable security definer
set search_path=pg_catalog,public,auth as $function$
  select member.id from public.choir_members member
  where member.auth_user_id=auth.uid() and member.is_active is true
    and member.choir_id=public.current_choir_id() order by member.id limit 1;
$function$;
grant execute on function public.current_choir_id() to authenticated;
grant execute on function public.current_chat_member_id() to authenticated;

alter table public.chat_room_members enable row level security;
create policy "048 fixture members read own rooms" on public.chat_room_members
for select to authenticated using (member_id=public.current_chat_member_id() and choir_id=public.current_choir_id());
create policy "048 fixture members update own rooms" on public.chat_room_members
for update to authenticated using (member_id=public.current_chat_member_id() and choir_id=public.current_choir_id())
with check (member_id=public.current_chat_member_id() and choir_id=public.current_choir_id());
grant select,update on public.chat_room_members to authenticated;

create schema genova_046;
revoke all on schema genova_046 from public,anon,authenticated;
create publication supabase_realtime for table public.chat_messages;
