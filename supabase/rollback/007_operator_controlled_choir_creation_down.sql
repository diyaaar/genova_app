-- 007 rollback removes the creation interface and its private authorization
-- metadata. It intentionally does not delete choirs or memberships already
-- created through the workflow; product data needs a separate explicit decision.

select pg_advisory_xact_lock(hashtext('genovakorist:007:choir-creation'));

set local lock_timeout = '5s';
set local statement_timeout = '90s';

drop function if exists public.create_operator_choir(text, text, uuid, text, text);
drop schema if exists genova_007 cascade;
