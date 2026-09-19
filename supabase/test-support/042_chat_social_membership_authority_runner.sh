#!/usr/bin/env bash
# 042 regression guard — LOCAL ISOLATED POSTGRESQL 17 DATABASES ONLY.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$REPO_ROOT"

TARGET_DB="${PGDATABASE:-genova_042_test_restore}"
SOURCE_DB="${GENOVA_042_SOURCE_DATABASE:-genova_008_test_restore}"
PG_HOST="${PGHOST:-127.0.0.1}"
PG_PORT="${PGPORT:-5432}"
PSQL_BIN="${PSQL_BIN:-/opt/homebrew/opt/postgresql@17/bin/psql}"
CREATEDB_BIN="${CREATEDB_BIN:-/opt/homebrew/opt/postgresql@17/bin/createdb}"
DROPDB_BIN="${DROPDB_BIN:-/opt/homebrew/opt/postgresql@17/bin/dropdb}"
PREREQUISITE="supabase/migrations/20260919190000_chat_room_membership_authority_041.sql"
MIGRATION="supabase/migrations/20260919193000_chat_social_membership_authority_042.sql"
DOWN="supabase/rollback/042_chat_social_membership_authority_down.sql"
TEST_FILE="supabase/tests/042_chat_social_membership_authority.sql"

refuse () {
  echo "REFUSED: $*" >&2
  exit 2
}

[[ "$TARGET_DB" =~ ^genova_042_test[A-Za-z0-9_]*$ ]] \
  || refuse "target '$TARGET_DB' is not a dedicated genova_042_test* database"
[[ "$SOURCE_DB" =~ ^(genova_008_test|genova_042_source_test)[A-Za-z0-9_]*$ ]] \
  || refuse "source '$SOURCE_DB' is not an allowed restored test database"
[ "$TARGET_DB" != "$SOURCE_DB" ] || refuse 'source and target databases must differ'
[ "$PG_HOST" = '127.0.0.1' ] || refuse "host must be 127.0.0.1, got '$PG_HOST'"
for command_path in "$PSQL_BIN" "$CREATEDB_BIN" "$DROPDB_BIN"; do
  [ -x "$command_path" ] || refuse "required PostgreSQL tool is missing: $command_path"
done
for source_path in "$PREREQUISITE" "$MIGRATION" "$DOWN" "$TEST_FILE"; do
  [ -f "$source_path" ] || refuse "required 042 source is missing: $source_path"
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
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.chat_messages row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.chat_reactions row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.chat_polls row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.chat_poll_votes row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.chat_starred_messages row_value)
    );"
}

policy_snapshot () {
  local database="$1"
  psql_q "$database" "
    select md5(coalesce(string_agg(to_jsonb(policy_row)::text, E'\\n' order by tablename, policyname), ''))
    from (
      select tablename, policyname, permissive, roles, cmd, qual, with_check
      from pg_policies
      where schemaname='public'
        and tablename in ('chat_reactions','chat_polls','chat_poll_votes','chat_starred_messages')
    ) policy_row;"
}

trigger_snapshot () {
  local database="$1"
  psql_q "$database" "
    select md5(coalesce(string_agg(pg_get_triggerdef(trigger.oid), E'\\n' order by relation.relname, trigger.tgname), ''))
    from pg_trigger trigger
    join pg_class relation on relation.oid=trigger.tgrelid
    join pg_namespace namespace on namespace.oid=relation.relnamespace
    where namespace.nspname='public'
      and relation.relname in ('chat_reactions','chat_polls','chat_poll_votes','chat_starred_messages')
      and not trigger.tgisinternal;"
}

index_snapshot () {
  local database="$1"
  psql_q "$database" "
    select md5(coalesce(string_agg(indexdef, E'\\n' order by tablename, indexname), ''))
    from pg_indexes
    where schemaname='public'
      and tablename in ('chat_reactions','chat_polls','chat_poll_votes','chat_starred_messages');"
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
[ "$(psql_q "$SOURCE_DB" "select to_regnamespace('genova_041') is null and to_regnamespace('genova_042') is null;")" = 't' ] \
  || refuse 'source already contains 041/042 state'

source_baseline="$(stable_snapshot "$SOURCE_DB")"
source_policy_baseline="$(policy_snapshot "$SOURCE_DB")"
source_trigger_baseline="$(trigger_snapshot "$SOURCE_DB")"
source_index_baseline="$(index_snapshot "$SOURCE_DB")"

"$CREATEDB_BIN" -T "$SOURCE_DB" "$TARGET_DB"
target_created=true

[ "$(stable_snapshot "$TARGET_DB")" = "$source_baseline" ] || refuse 'target data differs after clone'
psql_db "$TARGET_DB" -q -f "$PREREQUISITE" >/dev/null
post_041_policy_baseline="$(policy_snapshot "$TARGET_DB")"
post_041_trigger_baseline="$(trigger_snapshot "$TARGET_DB")"
post_041_index_baseline="$(index_snapshot "$TARGET_DB")"

echo "database: $TARGET_DB cloned from $SOURCE_DB @ $PG_HOST:$PG_PORT (PostgreSQL 17; 041 prerequisite applied)"
echo "started: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null
psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(stable_snapshot "$TARGET_DB")" = "$source_baseline" ] \
  || { echo 'FAIL: forward matrix changed stable fixture tables' >&2; exit 1; }
[ "$(psql_q "$TARGET_DB" "select to_regnamespace('genova_042') is not null;")" = 't' ] \
  || { echo 'FAIL: forward 042 authority objects are incomplete' >&2; exit 1; }
echo 'PASS forward migration and room/social actor/refusal matrix'

psql_db "$TARGET_DB" -q -f "$DOWN" >/dev/null
[ "$(psql_q "$TARGET_DB" "select to_regnamespace('genova_042') is null;")" = 't' ] \
  || { echo 'FAIL: down migration left 042 objects' >&2; exit 1; }
[ "$(policy_snapshot "$TARGET_DB")" = "$post_041_policy_baseline" ] \
  || { echo 'FAIL: down migration did not restore exact social policies' >&2; exit 1; }
[ "$(trigger_snapshot "$TARGET_DB")" = "$post_041_trigger_baseline" ] \
  || { echo 'FAIL: down migration did not restore exact social triggers' >&2; exit 1; }
[ "$(index_snapshot "$TARGET_DB")" = "$post_041_index_baseline" ] \
  || { echo 'FAIL: down migration did not restore exact social indexes' >&2; exit 1; }
[ "$(stable_snapshot "$TARGET_DB")" = "$source_baseline" ] \
  || { echo 'FAIL: down migration changed stable fixture tables' >&2; exit 1; }
echo 'PASS down migration restored exact post-041 policy/trigger/index/data state'

psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null
psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(stable_snapshot "$TARGET_DB")" = "$source_baseline" ] \
  || { echo 'FAIL: restored-forward matrix changed stable fixture tables' >&2; exit 1; }
[ "$(stable_snapshot "$SOURCE_DB")" = "$source_baseline" ] \
  || { echo 'FAIL: source data changed during 042' >&2; exit 1; }
[ "$(policy_snapshot "$SOURCE_DB")" = "$source_policy_baseline" ] \
  || { echo 'FAIL: source policies changed during 042' >&2; exit 1; }
[ "$(trigger_snapshot "$SOURCE_DB")" = "$source_trigger_baseline" ] \
  || { echo 'FAIL: source triggers changed during 042' >&2; exit 1; }
[ "$(index_snapshot "$SOURCE_DB")" = "$source_index_baseline" ] \
  || { echo 'FAIL: source indexes changed during 042' >&2; exit 1; }
echo 'PASS restored-forward state; source and target fixture baselines unchanged'

cleanup
target_created=false
database_exists "$TARGET_DB" && { echo 'FAIL: disposable target database remains' >&2; exit 1; }
echo 'PASS disposable target database removed'
echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
