#!/usr/bin/env bash
# 043 regression guard — LOCAL ISOLATED POSTGRESQL 17 DATABASES ONLY.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$REPO_ROOT"
TARGET_DB="${PGDATABASE:-genova_043_test_restore}"
SOURCE_DB="${GENOVA_043_SOURCE_DATABASE:-genova_008_test_restore}"
PG_HOST="${PGHOST:-127.0.0.1}"; PG_PORT="${PGPORT:-5432}"
PSQL_BIN="${PSQL_BIN:-/opt/homebrew/opt/postgresql@17/bin/psql}"
CREATEDB_BIN="${CREATEDB_BIN:-/opt/homebrew/opt/postgresql@17/bin/createdb}"
DROPDB_BIN="${DROPDB_BIN:-/opt/homebrew/opt/postgresql@17/bin/dropdb}"
PREREQUISITE_041="supabase/migrations/20260919190000_chat_room_membership_authority_041.sql"
PREREQUISITE_042="supabase/migrations/20260919193000_chat_social_membership_authority_042.sql"
MIGRATION="supabase/migrations/20260919194500_chat_message_status_authority_043.sql"
DOWN="supabase/rollback/043_chat_message_status_authority_down.sql"
TEST_FILE="supabase/tests/043_chat_message_status_authority.sql"

refuse(){ echo "REFUSED: $*" >&2; exit 2; }
[[ "$TARGET_DB" =~ ^genova_043_test[A-Za-z0-9_]*$ ]] || refuse "unsafe target '$TARGET_DB'"
[[ "$SOURCE_DB" =~ ^(genova_008_test|genova_043_source_test)[A-Za-z0-9_]*$ ]] || refuse "unsafe source '$SOURCE_DB'"
[ "$TARGET_DB" != "$SOURCE_DB" ] || refuse 'source and target must differ'
[ "$PG_HOST" = '127.0.0.1' ] || refuse "host must be 127.0.0.1"
for item in "$PSQL_BIN" "$CREATEDB_BIN" "$DROPDB_BIN"; do [ -x "$item" ] || refuse "missing tool: $item"; done
for item in "$PREREQUISITE_041" "$PREREQUISITE_042" "$MIGRATION" "$DOWN" "$TEST_FILE"; do [ -f "$item" ] || refuse "missing source: $item"; done
export PGHOST="$PG_HOST" PGPORT="$PG_PORT"

psql_db(){ local database="$1"; shift; PGDATABASE="$database" "$PSQL_BIN" -X -v ON_ERROR_STOP=1 "$@"; }
psql_q(){ local database="$1" sql="$2"; psql_db "$database" -A -t -q -c "$sql"; }
database_exists(){ [ "$(psql_q postgres "select exists(select 1 from pg_database where datname='$1');")" = t ]; }
stable_snapshot(){
  psql_q "$1" "select concat_ws('|',
    (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from auth.users r),
    (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.choirs r),
    (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.choir_members r),
    (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.chat_rooms r),
    (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.chat_room_members r),
    (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.chat_messages r),
    (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.chat_message_status r));"
}
policy_snapshot(){ psql_q "$1" "select md5(coalesce(string_agg(to_jsonb(p)::text,E'\\n' order by policyname),'')) from (select policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname='public' and tablename='chat_message_status') p;"; }
function_snapshot(){ psql_q "$1" "select coalesce(md5(pg_get_functiondef(to_regprocedure('public.mark_chat_message_status(uuid,text)'))),'absent');"; }

target_created=false
cleanup(){ if [ "$target_created" = true ] && database_exists "$TARGET_DB"; then "$DROPDB_BIN" --force "$TARGET_DB" >/dev/null 2>&1 || true; fi; }
trap cleanup EXIT; trap 'exit 130' INT; trap 'exit 143' TERM

database_exists "$SOURCE_DB" || refuse "source '$SOURCE_DB' missing"
database_exists "$TARGET_DB" && refuse "target '$TARGET_DB' already exists"
[ "$(psql_q "$SOURCE_DB" "select current_setting('server_version_num') like '17%';")" = t ] || refuse 'PostgreSQL 17 required'
[ "$(psql_q "$SOURCE_DB" "select to_regnamespace('genova_041') is null and to_regnamespace('genova_042') is null and to_regnamespace('genova_043') is null;")" = t ] || refuse 'source already migrated'
source_data="$(stable_snapshot "$SOURCE_DB")"; source_policy="$(policy_snapshot "$SOURCE_DB")"; source_function="$(function_snapshot "$SOURCE_DB")"
"$CREATEDB_BIN" -T "$SOURCE_DB" "$TARGET_DB"; target_created=true
[ "$(stable_snapshot "$TARGET_DB")" = "$source_data" ] || refuse 'clone data mismatch'
psql_db "$TARGET_DB" -q -f "$PREREQUISITE_041" >/dev/null
psql_db "$TARGET_DB" -q -f "$PREREQUISITE_042" >/dev/null
post_042_policy="$(policy_snapshot "$TARGET_DB")"; post_042_function="$(function_snapshot "$TARGET_DB")"

echo "database: $TARGET_DB cloned from $SOURCE_DB @ $PG_HOST:$PG_PORT (PostgreSQL 17; 041-042 applied)"
echo "started: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null
psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(stable_snapshot "$TARGET_DB")" = "$source_data" ] || { echo 'FAIL: forward changed fixture data' >&2; exit 1; }
[ "$(psql_q "$TARGET_DB" "select to_regnamespace('genova_043') is not null and to_regprocedure('public.mark_chat_message_status(uuid,text)') is not null;")" = t ] || { echo 'FAIL: forward objects incomplete' >&2; exit 1; }
echo 'PASS forward migration and sender/reader/nonmember/status matrix'

psql_db "$TARGET_DB" -q -f "$DOWN" >/dev/null
[ "$(policy_snapshot "$TARGET_DB")" = "$post_042_policy" ] || { echo 'FAIL: down policy mismatch' >&2; exit 1; }
[ "$(function_snapshot "$TARGET_DB")" = "$post_042_function" ] || { echo 'FAIL: down function mismatch' >&2; exit 1; }
[ "$(stable_snapshot "$TARGET_DB")" = "$source_data" ] || { echo 'FAIL: down changed fixture data' >&2; exit 1; }
echo 'PASS down migration restored exact post-042 status policy/API/data state'

psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null
psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(stable_snapshot "$TARGET_DB")" = "$source_data" ] || { echo 'FAIL: re-forward changed fixture data' >&2; exit 1; }
[ "$(stable_snapshot "$SOURCE_DB")" = "$source_data" ] || { echo 'FAIL: source data changed' >&2; exit 1; }
[ "$(policy_snapshot "$SOURCE_DB")" = "$source_policy" ] || { echo 'FAIL: source policy changed' >&2; exit 1; }
[ "$(function_snapshot "$SOURCE_DB")" = "$source_function" ] || { echo 'FAIL: source function changed' >&2; exit 1; }
echo 'PASS restored-forward state; source and target baselines unchanged'
cleanup; target_created=false
database_exists "$TARGET_DB" && { echo 'FAIL: disposable target remains' >&2; exit 1; }
echo 'PASS disposable target database removed'
echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
