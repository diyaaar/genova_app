-- 012 — list_my_choirs must never return a null is_current
--
-- Defect observed live on 7 September 2026. `public.current_choir_id()` returns
-- null on purpose when the caller has several memberships and has not selected
-- one for the current session. The comparison `choir.id = public.current_choir_id()`
-- then evaluates to null rather than false under three-valued logic, so every row
-- came back with `is_current = null`.
--
-- The shared client contract (`lib/choir-context-core.ts`, `parseMembershipOption`)
-- requires a boolean and fails closed on anything else, so the whole membership
-- list was rejected and a multi-choir member saw "no accessible choir membership"
-- instead of the choir picker — the exact screen 005 exists to show them. Members
-- with a single membership were unaffected, because `current_choir_id()` falls
-- back to that one membership, which is why this stayed hidden until a second
-- membership existed.
--
-- `is not distinct from` keeps the intended meaning and removes the null: true
-- only when the row is the session's active choir, false in every other case,
-- including "nothing selected yet". `choir.id` is a primary key and never null,
-- so the null-equals-null branch of the operator cannot be reached.
--
-- Function body only; no schema, data, grant or policy change.

create or replace function public.list_my_choirs()
returns table (
  choir_id uuid,
  member_id uuid,
  choir_name text,
  choir_slug text,
  member_is_active boolean,
  is_current boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    choir.id,
    member.id,
    choir.name,
    choir.slug,
    member.is_active,
    choir.id is not distinct from public.current_choir_id()
  from public.choir_members member
  join public.choirs choir on choir.id = member.choir_id
  where member.auth_user_id = (select auth.uid())
  order by choir.name, choir.id;
$function$;

revoke all on function public.list_my_choirs() from public, anon, service_role;
grant execute on function public.list_my_choirs() to authenticated;

comment on function public.list_my_choirs() is
  'Lists only the caller memberships so a client can choose an active choir before tenant RLS opens. is_current is always boolean; false means no session selection yet.';
