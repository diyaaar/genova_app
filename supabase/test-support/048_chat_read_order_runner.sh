#!/usr/bin/env bash
# 048 regression guard — LOCAL ISOLATED POSTGRESQL 17 DATABASES ONLY.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$REPO_ROOT"
TARGET_DB="${PGDATABASE:-genova_048_test_restore}"
SOURCE_DB="${GENOVA_048_SOURCE_DATABASE:-genova_048_source_test}"
PG_HOST="${PGHOST:-127.0.0.1}"; PG_PORT="${PGPORT:-5432}"
PSQL_BIN="${PSQL_BIN:-/opt/homebrew/opt/postgresql@17/bin/psql}"
CREATEDB_BIN="${CREATEDB_BIN:-/opt/homebrew/opt/postgresql@17/bin/createdb}"
DROPDB_BIN="${DROPDB_BIN:-/opt/homebrew/opt/postgresql@17/bin/dropdb}"
FIXTURE=supabase/test-support/048_chat_read_fixture.sql
MIGRATION=supabase/migrations/20260920090000_chat_read_order_048.sql
DOWN=supabase/rollback/048_chat_read_order_down.sql
TEST_FILE=supabase/tests/048_chat_read_order.sql

refuse(){ echo "REFUSED: $*" >&2; exit 2; }
[[ "$TARGET_DB" =~ ^genova_048_test[A-Za-z0-9_]*$ ]] || refuse "unsafe target '$TARGET_DB'"
[[ "$SOURCE_DB" =~ ^genova_048_source_test[A-Za-z0-9_]*$ ]] || refuse "unsafe source '$SOURCE_DB'"
[ "$TARGET_DB" != "$SOURCE_DB" ] || refuse 'source and target must differ'
[ "$PG_HOST" = 127.0.0.1 ] || refuse 'loopback only'
for item in "$PSQL_BIN" "$CREATEDB_BIN" "$DROPDB_BIN"; do [ -x "$item" ] || refuse "missing tool: $item"; done
for item in "$FIXTURE" "$MIGRATION" "$DOWN" "$TEST_FILE"; do [ -f "$item" ] || refuse "missing source: $item"; done

export PGHOST="$PG_HOST" PGPORT="$PG_PORT"
psql_db(){ local database="$1"; shift; PGDATABASE="$database" "$PSQL_BIN" -X -v ON_ERROR_STOP=1 "$@"; }
psql_q(){ local database="$1" sql="$2"; psql_db "$database" -A -t -q -c "$sql"; }
database_exists(){ [ "$(psql_q postgres "select exists(select 1 from pg_database where datname='$1');")" = t ]; }
stable_snapshot(){ psql_q "$1" "select concat_ws('|',
 (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from auth.users r),
 (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.choirs r),
 (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.choir_members r),
 (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.chat_rooms r),
 (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.chat_room_members r),
 (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.chat_messages r));"; }
index_snapshot(){ psql_q "$1" "select md5(coalesce(string_agg(indexname||':'||indexdef,E'\n' order by indexname),'')) from pg_indexes where schemaname='public' and tablename='chat_messages';"; }

source_created=false; target_created=false
cleanup(){
  if [ "$target_created" = true ] && database_exists "$TARGET_DB"; then "$DROPDB_BIN" --force "$TARGET_DB" >/dev/null 2>&1 || true; fi
  if [ "$source_created" = true ] && database_exists "$SOURCE_DB"; then "$DROPDB_BIN" --force "$SOURCE_DB" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT; trap 'exit 130' INT; trap 'exit 143' TERM
database_exists "$SOURCE_DB" && refuse 'source already exists'
database_exists "$TARGET_DB" && refuse 'target already exists'
[ "$(psql_q postgres "select current_setting('server_version_num') like '17%';")" = t ] || refuse 'PostgreSQL 17 required'

"$CREATEDB_BIN" -T template0 "$SOURCE_DB"; source_created=true
psql_db "$SOURCE_DB" -q -f "$FIXTURE" >/dev/null
source_data="$(stable_snapshot "$SOURCE_DB")"; source_indexes="$(index_snapshot "$SOURCE_DB")"
[ "$(psql_q "$SOURCE_DB" "select to_regnamespace('genova_046') is not null and to_regnamespace('genova_048') is null;")" = t ] || refuse 'synthetic source fixture is incomplete'
"$CREATEDB_BIN" -T "$SOURCE_DB" "$TARGET_DB"; target_created=true
[ "$(stable_snapshot "$TARGET_DB")" = "$source_data" ] || refuse 'clone data mismatch'
[ "$(index_snapshot "$TARGET_DB")" = "$source_indexes" ] || refuse 'clone index mismatch'

psql_db "$TARGET_DB" -q -c "alter publication supabase_realtime drop table public.chat_messages; drop schema genova_046;" >/dev/null
if psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null 2>&1; then echo 'FAIL: migration accepted missing 046 prerequisite' >&2; exit 1; fi
[ "$(psql_q "$TARGET_DB" "select to_regnamespace('genova_048') is null and to_regclass('public.idx_chat_messages_room_created_id_048') is null and to_regprocedure('public.mark_chat_room_read(uuid)') is null;")" = t ] || { echo 'FAIL: refused preflight left 048 state' >&2; exit 1; }
psql_db "$TARGET_DB" -q -c "create schema genova_046; revoke all on schema genova_046 from public,anon,authenticated; alter publication supabase_realtime add table public.chat_messages;" >/dev/null
echo 'PASS migration refused missing 046 state before changes'

prior_data="$(stable_snapshot "$TARGET_DB")"; prior_indexes="$(index_snapshot "$TARGET_DB")"
echo "database: $TARGET_DB cloned from synthetic $SOURCE_DB @ $PG_HOST:$PG_PORT (PostgreSQL 17)"
echo "started: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null
psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(stable_snapshot "$TARGET_DB")" = "$prior_data" ] || { echo 'FAIL: forward/test changed fixture data' >&2; exit 1; }
echo 'PASS forward index, server-time room-read authority and cursor matrix'

psql_db "$TARGET_DB" -q -f "$DOWN" >/dev/null
[ "$(index_snapshot "$TARGET_DB")" = "$prior_indexes" ] || { echo 'FAIL: down index state mismatch' >&2; exit 1; }
[ "$(psql_q "$TARGET_DB" "select to_regnamespace('genova_048') is null and to_regprocedure('public.mark_chat_room_read(uuid)') is null;")" = t ] || { echo 'FAIL: down API or marker schema remains' >&2; exit 1; }
[ "$(stable_snapshot "$TARGET_DB")" = "$prior_data" ] || { echo 'FAIL: down changed fixture data' >&2; exit 1; }
echo 'PASS down restored exact prior index/API/data state'

psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null
psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(stable_snapshot "$SOURCE_DB")" = "$source_data" ] || { echo 'FAIL: source fixture changed' >&2; exit 1; }
echo 'PASS restored-forward state; synthetic source unchanged'
cleanup; source_created=false; target_created=false
database_exists "$TARGET_DB" && { echo 'FAIL: target remains' >&2; exit 1; }
database_exists "$SOURCE_DB" && { echo 'FAIL: source remains' >&2; exit 1; }
echo 'PASS disposable source and target databases removed'
echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
