begin;
drop function public.choir_invitation_command(text,jsonb);
drop table genova_008.invitations;
drop schema genova_008;
-- Accepted memberships are product data and deliberately remain intact.
commit;
