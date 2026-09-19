#!/usr/bin/env bash
# 041 regression guard — LOCAL ISOLATED POSTGRESQL 17 DATABASES ONLY.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$REPO_ROOT"

TARGET_DB="${PGDATABASE:-genova_041_test_restore}"
SOURCE_DB="${GENOVA_041_SOURCE_DATABASE:-genova_008_test_restore}"
PG_HOST="${PGHOST:-127.0.0.1}"
PG_PORT="${PGPORT:-5432}"
PSQL_BIN="${PSQL_BIN:-/opt/homebrew/opt/postgresql@17/bin/psql}"
CREATEDB_BIN="${CREATEDB_BIN:-/opt/homebrew/opt/postgresql@17/bin/createdb}"
DROPDB_BIN="${DROPDB_BIN:-/opt/homebrew/opt/postgresql@17/bin/dropdb}"
MIGRATION="supabase/migrations/20260919190000_chat_room_membership_authority_041.sql"
DOWN="supabase/rollback/041_chat_room_membership_authority_down.sql"
TEST_FILE="supabase/tests/041_chat_room_membership_authority.sql"

refuse () {
  echo "REFUSED: $*" >&2
  exit 2
}

[[ "$TARGET_DB" =~ ^genova_041_test[A-Za-z0-9_]*$ ]] \
  || refuse "target '$TARGET_DB' is not a dedicated genova_041_test* database"
[[ "$SOURCE_DB" =~ ^(genova_008_test|genova_041_source_test)[A-Za-z0-9_]*$ ]] \
  || refuse "source '$SOURCE_DB' is not an allowed restored test database"
[ "$TARGET_DB" != "$SOURCE_DB" ] || refuse 'source and target databases must differ'
[ "$PG_HOST" = '127.0.0.1' ] || refuse "host must be 127.0.0.1, got '$PG_HOST'"
for command_path in "$PSQL_BIN" "$CREATEDB_BIN" "$DROPDB_BIN"; do
  [ -x "$command_path" ] || refuse "required PostgreSQL tool is missing: $command_path"
done
for source_path in "$MIGRATION" "$DOWN" "$TEST_FILE"; do
  [ -f "$source_path" ] || refuse "required 041 source is missing: $source_path"
done

export PGHOST="$PG_HOST" PGPORT="$PG_PORT"

psql_db () {
  local database="$1"
  shift
  PGDATABASE="$database" "$PSQL_BIN" -X -v ON_ERROR_STOP=1 "$@"
}

psql_q () {
  local database="$1"
  local sql="$2"
  psql_db "$database" -A -t -q -c "$sql"
}

database_exists () {
  [ "$(psql_q postgres "select exists(select 1 from pg_database where datname = '$1');")" = 't' ]
}

stable_snapshot () {
  local database="$1"
  psql_q "$database" "
    select concat_ws('|',
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from auth.users row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.choirs row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.choir_members row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.chat_rooms row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.chat_room_members row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by session_id)::text, '[]')) from genova_005.active_choir_sessions row_value)
    );"
}

policy_snapshot () {
  local database="$1"
  psql_q "$database" "
    select md5(coalesce(string_agg(to_jsonb(policy_row)::text, E'\\n' order by policyname), ''))
    from (
      select policyname, permissive, roles, cmd, qual, with_check
      from pg_policies
      where schemaname='public' and tablename='chat_room_members'
    ) policy_row;"
}

trigger_snapshot () {
  local database="$1"
  psql_q "$database" "
    select md5(coalesce(string_agg(pg_get_triggerdef(oid), E'\\n' order by tgname), ''))
    from pg_trigger
    where tgrelid='public.chat_room_members'::regclass and not tgisinternal;"
}

target_created=false
cleanup () {
  if [ "$target_created" = true ] && database_exists "$TARGET_DB"; then
    "$DROPDB_BIN" --force "$TARGET_DB" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

database_exists "$SOURCE_DB" || refuse "source database '$SOURCE_DB' does not exist"
database_exists "$TARGET_DB" && refuse "target database '$TARGET_DB' already exists"
[ "$(psql_q "$SOURCE_DB" "select current_setting('server_version_num') like '17%';")" = 't' ] \
  || refuse 'source PostgreSQL must be version 17'
[ "$(psql_q "$SOURCE_DB" "select to_regnamespace('genova_041') is null;")" = 't' ] \
  || refuse 'source already contains 041 state'
[ "$(psql_q "$SOURCE_DB" "select to_regnamespace('genova_003') is not null and to_regnamespace('genova_005') is not null;")" = 't' ] \
  || refuse 'source is missing required tenant/session schemas'

source_baseline="$(stable_snapshot "$SOURCE_DB")"
source_policy_baseline="$(policy_snapshot "$SOURCE_DB")"
source_trigger_baseline="$(trigger_snapshot "$SOURCE_DB")"

"$CREATEDB_BIN" -T "$SOURCE_DB" "$TARGET_DB"
target_created=true

[ "$(stable_snapshot "$TARGET_DB")" = "$source_baseline" ] \
  || refuse 'disposable target data differs immediately after clone'
[ "$(policy_snapshot "$TARGET_DB")" = "$source_policy_baseline" ] \
  || refuse 'disposable target policies differ immediately after clone'
[ "$(trigger_snapshot "$TARGET_DB")" = "$source_trigger_baseline" ] \
  || refuse 'disposable target triggers differ immediately after clone'

echo "database: $TARGET_DB cloned from $SOURCE_DB @ $PG_HOST:$PG_PORT (PostgreSQL 17)"
echo "started: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null
psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(stable_snapshot "$TARGET_DB")" = "$source_baseline" ] \
  || { echo 'FAIL: forward matrix changed stable fixture tables' >&2; exit 1; }
[ "$(psql_q "$TARGET_DB" "select to_regnamespace('genova_041') is not null and exists(select 1 from pg_trigger where tgrelid='public.chat_room_members'::regclass and tgname='chat_room_members_guard_041');")" = 't' ] \
  || { echo 'FAIL: forward 041 authority objects are incomplete' >&2; exit 1; }
echo 'PASS forward migration and creator/admin/self/refusal matrix'

psql_db "$TARGET_DB" -q -f "$DOWN" >/dev/null
[ "$(psql_q "$TARGET_DB" "select to_regnamespace('genova_041') is null and not exists(select 1 from pg_trigger where tgrelid='public.chat_room_members'::regclass and tgname='chat_room_members_guard_041');")" = 't' ] \
  || { echo 'FAIL: down migration left 041 objects' >&2; exit 1; }
[ "$(policy_snapshot "$TARGET_DB")" = "$source_policy_baseline" ] \
  || { echo 'FAIL: down migration did not restore exact membership policies' >&2; exit 1; }
[ "$(trigger_snapshot "$TARGET_DB")" = "$source_trigger_baseline" ] \
  || { echo 'FAIL: down migration did not restore exact membership triggers' >&2; exit 1; }
[ "$(stable_snapshot "$TARGET_DB")" = "$source_baseline" ] \
  || { echo 'FAIL: down migration changed stable fixture tables' >&2; exit 1; }
echo 'PASS down migration restored exact prior policy/trigger/data state'

psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null
psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(stable_snapshot "$TARGET_DB")" = "$source_baseline" ] \
  || { echo 'FAIL: restored-forward matrix changed stable fixture tables' >&2; exit 1; }
[ "$(stable_snapshot "$SOURCE_DB")" = "$source_baseline" ] \
  || { echo 'FAIL: source data changed during 041' >&2; exit 1; }
[ "$(policy_snapshot "$SOURCE_DB")" = "$source_policy_baseline" ] \
  || { echo 'FAIL: source policies changed during 041' >&2; exit 1; }
[ "$(trigger_snapshot "$SOURCE_DB")" = "$source_trigger_baseline" ] \
  || { echo 'FAIL: source triggers changed during 041' >&2; exit 1; }
echo 'PASS restored-forward state; source and target fixture baselines unchanged'

cleanup
target_created=false
database_exists "$TARGET_DB" && { echo 'FAIL: disposable target database remains' >&2; exit 1; }
echo 'PASS disposable target database removed'
echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
