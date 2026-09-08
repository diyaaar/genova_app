#!/usr/bin/env bash
# 012 regression guard — LOCAL ISOLATED DATABASE ONLY.
#
# Applies the fixed function, proves the SQL regression test passes, applies the
# 012 down-migration, proves the same test fails for the expected null result,
# and restores the fixed function. Fixture rows are created only inside the test
# file's transaction and are checked against a before/after database snapshot.
#
#   PGDATABASE=genova_008_test_restore bash supabase/test-support/012_regression_runner.sh
#
# Never point this at production.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

DB="${PGDATABASE:-genova_012_test}"
HOST="${PGHOST:-127.0.0.1}"
PORT="${PGPORT:-5432}"
PSQL_BIN="${PSQL_BIN:-psql}"
MIGRATION="supabase/migrations/20260907210932_list_my_choirs_is_current_not_null_012.sql"
DOWN="supabase/rollback/012_list_my_choirs_is_current_not_null_down.sql"
TEST_FILE="supabase/tests/012_list_my_choirs_is_current.sql"

case "$DB" in
  genova_008_test*|genova_012_test*) ;;
  *) echo "REFUSED: database '$DB' is not a dedicated genova_008_test* or genova_012_test* copy"; exit 2 ;;
esac
[ "$HOST" = "127.0.0.1" ] || {
  echo "REFUSED: host must be 127.0.0.1, got '$HOST'"; exit 2;
}

export PGHOST="$HOST" PGPORT="$PORT" PGDATABASE="$DB"

psql_q () {
  "$PSQL_BIN" -X -A -t -v ON_ERROR_STOP=1 -c "$1"
}

snapshot () {
  psql_q "
    select concat_ws('|',
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from auth.users row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.choirs row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.choir_members row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by session_id)::text, '[]')) from genova_005.active_choir_sessions row_value)
    );"
}

server_version="$(psql_q "select current_setting('server_version_num');")" || exit 2
case "$server_version" in
  17*) ;;
  *) echo "REFUSED: PostgreSQL 17 is required, got server_version_num=$server_version"; exit 2 ;;
esac

for schema in genova_003 genova_005; do
  [ "$(psql_q "select to_regnamespace('$schema') is not null;")" = "t" ] || {
    echo "REFUSED: $schema is missing; 012 requires a database with 003 and 005 applied"; exit 2;
  }
done
[ "$(psql_q "select to_regprocedure('public.list_my_choirs()') is not null;")" = "t" ] || {
  echo "REFUSED: public.list_my_choirs() is missing"; exit 2;
}

baseline="$(snapshot)" || exit 2
restore_needed=0

restore_fix () {
  if [ "$restore_needed" -eq 1 ]; then
    "$PSQL_BIN" -X -v ON_ERROR_STOP=1 -q -f "$MIGRATION" >/dev/null 2>&1 || true
  fi
}
trap restore_fix EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo "database: $DB @ $HOST:$PORT (PostgreSQL 17)"
echo "started : $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

"$PSQL_BIN" -X -v ON_ERROR_STOP=1 -q -f "$MIGRATION" || exit 1
"$PSQL_BIN" -X -v ON_ERROR_STOP=1 -q -f "$TEST_FILE" || exit 1
echo "PASS  fixed function: 012 SQL test exited 0"

[ "$(snapshot)" = "$baseline" ] || {
  echo "FAIL  fixed-function run changed fixture tables"; exit 1;
}
echo "PASS  fixed-function run left no fixture rows"

"$PSQL_BIN" -X -v ON_ERROR_STOP=1 -q -f "$DOWN" || exit 1
restore_needed=1
negative_output="$("$PSQL_BIN" -X -v ON_ERROR_STOP=1 -q -f "$TEST_FILE" 2>&1)"
negative_status=$?

if [ "$negative_status" -eq 0 ]; then
  echo "FAIL  down-migration: 012 SQL test unexpectedly exited 0"
  exit 1
fi
case "$negative_output" in
  *"012: is_current came back null for 2 row(s)"*) ;;
  *)
    echo "FAIL  down-migration: test failed for an unexpected reason"
    printf '%s\n' "$negative_output"
    exit 1
    ;;
esac
echo "PASS  down-migration: 012 SQL test failed with the expected two null rows (exit $negative_status)"

[ "$(snapshot)" = "$baseline" ] || {
  echo "FAIL  down-migration run changed fixture tables"; exit 1;
}
echo "PASS  down-migration run left no fixture rows"

"$PSQL_BIN" -X -v ON_ERROR_STOP=1 -q -f "$MIGRATION" || exit 1
restore_needed=0

[ "$(psql_q "select pg_get_functiondef('public.list_my_choirs()'::regprocedure) like '%is not distinct from public.current_choir_id()%';")" = "t" ] || {
  echo "FAIL  fixed function was not restored"; exit 1;
}
"$PSQL_BIN" -X -v ON_ERROR_STOP=1 -q -f "$TEST_FILE" || exit 1
[ "$(snapshot)" = "$baseline" ] || {
  echo "FAIL  restored-function run changed fixture tables"; exit 1;
}

echo "PASS  fixed function restored and 012 SQL test exited 0 again"
echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
