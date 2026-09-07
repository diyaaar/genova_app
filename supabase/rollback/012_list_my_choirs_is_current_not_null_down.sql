-- 012 down — restores the pre-fix body of public.list_my_choirs().
--
-- Applying this reintroduces the multi-membership lockout described in the 012
-- migration: with several memberships and no session selection, every row comes
-- back with is_current = null and the client contract rejects the list. Use it
-- only to reproduce that defect deliberately.

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
    choir.id = public.current_choir_id()
  from public.choir_members member
  join public.choirs choir on choir.id = member.choir_id
  where member.auth_user_id = (select auth.uid())
  order by choir.name, choir.id;
$function$;

revoke all on function public.list_my_choirs() from public, anon, service_role;
grant execute on function public.list_my_choirs() to authenticated;

comment on function public.list_my_choirs() is
  'Lists only the caller memberships so a client can choose an active choir before tenant RLS opens.';
