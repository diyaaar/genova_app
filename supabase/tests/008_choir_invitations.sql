-- Isolated database only. Every fixture is rolled back.
begin;
create temporary table ids (label text primary key, uid uuid default gen_random_uuid(), sid uuid default gen_random_uuid());
insert into ids(label) values ('chef'),('otherchef'),('recipient'),('wrong'),('unverified');
grant select on ids to authenticated;
insert into auth.users(id,instance_id,aud,role,email,email_confirmed_at,created_at,updated_at)
select uid,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
  label || '-008@example.invalid',case when label <> 'unverified' then now() end,now(),now() from ids;
insert into auth.sessions(id,user_id,created_at,updated_at) select sid,uid,now(),now() from ids;
insert into public.choirs(id,slug,name)
select uid,'test-008-'||label,'Test '||label from ids where label in ('chef','otherchef');
insert into public.roles(choir_id,name)
select uid,r from ids cross join unnest(array['Şef','Korist','Partisyon Şefi']) r where label in ('chef','otherchef');
insert into public.choir_members(choir_id,auth_user_id,email,first_name,last_name,voice_group,is_active,join_date)
select uid,uid,label||'-008@example.invalid','Test',label,'Şef',true,current_date from ids where label in ('chef','otherchef');
insert into public.choir_member_roles(choir_id,member_id,role_id)
select m.choir_id,m.id,r.id from public.choir_members m join public.roles r on r.choir_id=m.choir_id
where m.choir_id in (select uid from ids) and r.name='Şef';
create temporary table results(label text primary key, data jsonb);
grant select,insert,update on results to authenticated;
create function pg_temp.login(label text) returns void language sql as $$
 select set_config('request.jwt.claims',json_build_object('sub',uid,'role','authenticated','session_id',sid)::text,true)
 from ids where ids.label=$1;
$$;
create function pg_temp.expect_error(action text, payload jsonb, expected text) returns void language plpgsql as $$
begin
  begin
    perform public.choir_invitation_command(action,payload);
  exception when others then
    if sqlstate=expected then return; end if;
    raise;
  end;
  raise exception 'Expected % for %',expected,action;
end;
$$;
set local role authenticated;
select pg_temp.login('chef');
insert into results values ('original',public.choir_invitation_command('create',jsonb_build_object(
  'choirId',(select uid from ids where label='chef'),'email',' RECIPIENT-008@example.invalid ',
  'firstName',' Ada ','lastName','Lovelace','voiceGroup','Alto')));
-- Replacement invalidates the original token.
insert into results values ('replacement',public.choir_invitation_command('create',jsonb_build_object(
  'choirId',(select uid from ids where label='chef'),'email','recipient-008@example.invalid',
  'firstName','Ada','lastName','Lovelace','voiceGroup','Alto')));
select pg_temp.expect_error('list',jsonb_build_object('choirId',(select uid from ids where label='otherchef')),'42501');
select pg_temp.login('wrong');
select pg_temp.expect_error('accept',jsonb_build_object('token',(select data->>'token' from results where label='replacement')),'22023');
select pg_temp.expect_error('list',jsonb_build_object('choirId',(select uid from ids where label='chef')),'42501');
select pg_temp.login('unverified');
select pg_temp.expect_error('accept',jsonb_build_object('token',(select data->>'token' from results where label='replacement')),'42501');
select pg_temp.login('recipient');
select pg_temp.expect_error('accept',jsonb_build_object('token',(select data->>'token' from results where label='original')),'22023');
insert into results values ('accepted',public.choir_invitation_command('accept',jsonb_build_object(
  'token',(select data->>'token' from results where label='replacement'))));
select pg_temp.expect_error('accept',jsonb_build_object('token',(select data->>'token' from results where label='replacement')),'22023');
select pg_temp.expect_error('create',jsonb_build_object('choirId',(select uid from ids where label='chef')),'42501');
reset role;
do $$
begin
  if (select count(*) from public.choir_members where auth_user_id=(select uid from ids where label='recipient'))<>1 then
    raise exception 'Expected exactly one membership'; end if;
  if not exists(select 1 from public.choir_member_roles mr join public.roles r on r.id=mr.role_id
    where mr.member_id=(select (data->>'memberId')::uuid from results where label='accepted') and r.name='Korist') then
    raise exception 'Korist role missing'; end if;
  if exists(select 1 from genova_008.invitations i join results r on i.token_hash=r.data->>'token') then
    raise exception 'Raw token stored'; end if;
  if has_table_privilege('authenticated','genova_008.invitations','SELECT')
    or has_function_privilege('anon','public.choir_invitation_command(text,jsonb)','EXECUTE')
    or has_function_privilege('service_role','public.choir_invitation_command(text,jsonb)','EXECUTE') then
    raise exception 'Unexpected grants'; end if;
end;
$$;
set local role authenticated;
select pg_temp.login('chef');
select pg_temp.expect_error('create',jsonb_build_object('choirId',(select uid from ids where label='chef'),
  'email','recipient-008@example.invalid','firstName','Ada','lastName','L','voiceGroup','Alto'),'23505');
insert into results values ('revoked',public.choir_invitation_command('create',jsonb_build_object(
  'choirId',(select uid from ids where label='chef'),'email','wrong-008@example.invalid',
  'firstName','Test','lastName','User','voiceGroup','Bass')));
select pg_temp.login('otherchef');
select pg_temp.expect_error('revoke',jsonb_build_object('choirId',(select uid from ids where label='otherchef'),
  'invitationId',(select data->>'id' from results where label='revoked')),'22023');
select pg_temp.login('chef');
select public.choir_invitation_command('revoke',jsonb_build_object('choirId',(select uid from ids where label='chef'),
  'invitationId',(select data->>'id' from results where label='revoked')));
select pg_temp.login('wrong');
select pg_temp.expect_error('accept',jsonb_build_object('token',(select data->>'token' from results where label='revoked')),'22023');
select pg_temp.login('chef');
insert into results values ('expired',public.choir_invitation_command('create',jsonb_build_object(
  'choirId',(select uid from ids where label='chef'),'email','wrong-008@example.invalid',
  'firstName','Test','lastName','User','voiceGroup','Bass')));
reset role;
update genova_008.invitations set created_at=now()-interval '9 days',expires_at=now()-interval '1 day'
where id=(select (data->>'id')::uuid from results where label='expired');
set local role authenticated;
select pg_temp.login('wrong');
select pg_temp.expect_error('accept',jsonb_build_object('token',(select data->>'token' from results where label='expired')),'22023');
select pg_temp.login('chef');
insert into results values ('atomic',public.choir_invitation_command('create',jsonb_build_object(
  'choirId',(select uid from ids where label='chef'),'email','wrong-008@example.invalid',
  'firstName','Test','lastName','User','voiceGroup','Bass')));
reset role;
-- Force the role insert to fail after the member insert; transaction must undo both.
create function pg_temp.reject_role() returns trigger language plpgsql as $$
begin raise check_violation using message='Simulated role write failure'; end;
$$;
create trigger test_008_role_failure before insert on public.choir_member_roles for each row execute function pg_temp.reject_role();
set local role authenticated;
select pg_temp.login('wrong');
select pg_temp.expect_error('accept',jsonb_build_object('token',(select data->>'token' from results where label='atomic')),'23514');
reset role;
drop trigger test_008_role_failure on public.choir_member_roles;
do $$
begin
 if exists(select 1 from public.choir_members where auth_user_id=(select uid from ids where label='wrong'))
 or exists(select 1 from genova_008.invitations where id=(select (data->>'id')::uuid from results where label='atomic') and accepted_at is not null)
 then raise exception 'Failed accept left partial data'; end if;
end;
$$;
-- Revocation of the issuer's role makes their pending invite unusable.
delete from public.choir_member_roles where member_id in
  (select id from public.choir_members where auth_user_id=(select uid from ids where label='chef'));
set local role authenticated;
select pg_temp.login('wrong');
select pg_temp.expect_error('accept',jsonb_build_object('token',(select data->>'token' from results where label='atomic')),'22023');
reset role;
delete from auth.sessions where user_id=(select uid from ids where label='wrong');
set local role authenticated;
select pg_temp.expect_error('accept',jsonb_build_object('token',(select data->>'token' from results where label='atomic')),'42501');
reset role;
rollback;
