#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)";cd "$REPO_ROOT"
SOURCE_DB="${GENOVA_060_SOURCE_DATABASE:-genova_008_test_restore}";TARGET_DB="${PGDATABASE:-genova_060_test_runtime}"
PSQL="${PSQL_BIN:-/opt/homebrew/opt/libpq/bin/psql}";DUMP="${PG_DUMP_BIN:-/opt/homebrew/opt/libpq/bin/pg_dump}"
CREATE="${CREATEDB_BIN:-/opt/homebrew/opt/libpq/bin/createdb}";DROP="${DROPDB_BIN:-/opt/homebrew/opt/libpq/bin/dropdb}"
refuse(){ echo "REFUSED: $*" >&2;exit 2; };[[ "$SOURCE_DB" =~ ^genova_[A-Za-z0-9_]*test[A-Za-z0-9_]*$ ]]||refuse unsafe-source;[[ "$TARGET_DB" =~ ^genova_060_test[A-Za-z0-9_]*$ ]]||refuse unsafe-target
export PGHOST=127.0.0.1 PGPORT="${PGPORT:-5432}";q(){ PGDATABASE="$1" "$PSQL" -X -Atq -v ON_ERROR_STOP=1 -c "$2"; };exists(){ [ "$(q postgres "select exists(select 1 from pg_database where datname='$1')")" = t ]; }
hash_schema(){ PGDATABASE="$1" "$DUMP" --schema-only --no-owner --no-privileges|sed -E '/^\\(un)?restrict /d'|shasum -a 256|awk '{print $1}'; }
created=false;cleanup(){ if [ "$created" = true ]&&exists "$TARGET_DB";then "$DROP" --force "$TARGET_DB" >/dev/null 2>&1||true;fi; };trap cleanup EXIT
exists "$SOURCE_DB"||refuse missing-source;exists "$TARGET_DB"&&refuse target-exists;source_hash="$(hash_schema "$SOURCE_DB")";"$CREATE" -T "$SOURCE_DB" "$TARGET_DB";created=true;q postgres "alter database \"$TARGET_DB\" owner to postgres";q "$TARGET_DB" 'grant usage on schema extensions to postgres'
for migration in 20260919190000_chat_room_membership_authority_041.sql 20260919193000_chat_social_membership_authority_042.sql 20260919194500_chat_message_status_authority_043.sql 20260919201500_chat_core_message_authority_044.sql 20260919213000_chat_text_send_idempotency_045.sql;do PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f "supabase/migrations/$migration" >/dev/null;done
baseline="$(hash_schema "$TARGET_DB")";echo "started: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/20260923193000_private_r2_chat_media_060.sql >/dev/null
PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/tests/060_private_r2_chat_media.sql >/dev/null;echo 'PASS ordered batch, room access, delete, avatar replace and refusal matrix'
advisor_errors="$(q "$TARGET_DB" "with findings as(
 select 'invalid-index' from pg_index i join pg_class c on c.oid=i.indexrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('public','genova_060') and not i.indisvalid
 union all select 'unvalidated-constraint' from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname in('public','genova_060') and not c.convalidated
 union all select 'unsafe-security-definer-search-path' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where ((n.nspname='public' and p.proname in('can_read_chat_media_060','chat_media_upload_060','chat_media_abort_060','chat_media_message_delete_060'))or n.nspname='genova_060') and p.prosecdef and not exists(select 1 from unnest(coalesce(p.proconfig,'{}'))s where s like 'search_path=%')
 union all select 'rls-not-forced' from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname,c.relname) in(('public','chat_media_versions'),('genova_060','batches'),('genova_060','parts'),('genova_060','message_deletes')) and(not c.relrowsecurity or not c.relforcerowsecurity)
 union all select 'client-private-grant' from information_schema.role_table_grants where table_schema='genova_060' and grantee in('anon','authenticated','service_role')
 union all select 'client-rpc-grant' from information_schema.routine_privileges where routine_schema='public' and routine_name in('can_read_chat_media_060','chat_media_upload_060','chat_media_abort_060','chat_media_message_delete_060') and grantee in('anon','authenticated')
)select count(*) from findings;")";[ "$advisor_errors" = 0 ]||refuse "database-advisor-errors=$advisor_errors";echo 'PASS local catalog advisors returned no error'
PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/rollback/060_private_r2_chat_media_down.sql >/dev/null;[ "$(hash_schema "$TARGET_DB")" = "$baseline" ]||refuse down-schema-mismatch;echo 'PASS exact down restored pre-060 schema'
PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/20260923193000_private_r2_chat_media_060.sql >/dev/null
PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -c "insert into genova_060.batches(actor_id,batch_id,choir_id,actor_member_id,room_id,kind,expected_count) values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'message-image',1);" >/dev/null
if PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/rollback/060_private_r2_chat_media_down.sql >/dev/null 2>&1;then refuse down-accepted-unresolved-state;fi;echo 'PASS down refuses unresolved provider state'
[ "$(hash_schema "$SOURCE_DB")" = "$source_hash" ]||refuse source-changed;cleanup;created=false;exists "$TARGET_DB"&&refuse target-remains;echo 'PASS source unchanged and disposable database removed';echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
