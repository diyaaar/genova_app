#!/usr/bin/env bash
# 015 protected repertoire-file RLS acceptance — LOCAL ISOLATED DATABASE ONLY.
#
#   PGDATABASE=genova_008_test_restore bash supabase/test-support/015_repertoire_file_runner.sh

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

DB="${PGDATABASE:-genova_015_test}"
HOST="${PGHOST:-127.0.0.1}"
PORT="${PGPORT:-5432}"
PSQL_BIN="${PSQL_BIN:-psql}"
TEST_FILE="supabase/tests/015_repertoire_file_access.sql"

case "$DB" in
  genova_008_test*|genova_015_test*) ;;
  *) echo "REFUSED: database '$DB' is not a dedicated genova_008_test* or genova_015_test* copy"; exit 2 ;;
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
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.roles row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.choir_member_roles row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.repertoire row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.repertoire_files row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.song_assignments row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by choir_id, scope)::text, '[]')) from public.repertoire_cache_versions row_value),
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
    echo "REFUSED: $schema is missing; 015 requires 003 and 005"; exit 2;
  }
done
[ "$(psql_q "select to_regclass('public.repertoire_files') is not null;")" = "t" ] || {
  echo "REFUSED: public.repertoire_files is missing"; exit 2;
}
[ "$(psql_q "select exists(select 1 from pg_policies where schemaname='public' and tablename='repertoire_files' and policyname='tenant_isolation_003');")" = "t" ] || {
  echo "REFUSED: repertoire_files tenant policy is missing"; exit 2;
}

baseline="$(snapshot)" || exit 2
echo "database: $DB @ $HOST:$PORT (PostgreSQL 17)"
echo "started : $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

"$PSQL_BIN" -X -v ON_ERROR_STOP=1 -q -f "$TEST_FILE" || exit 1

[ "$(snapshot)" = "$baseline" ] || {
  echo "FAIL  015 SQL run changed tracked fixture tables"; exit 1;
}

echo "PASS  chef/leader/assigned/unassigned/no-selection/wrong-choir RLS matrix"
echo "PASS  transaction rollback left tracked fixture tables unchanged"
echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
