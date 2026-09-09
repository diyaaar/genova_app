#!/usr/bin/env bash
# 024 regression guard — LOCAL ISOLATED DATABASES ONLY.
#
# Expected use:
#   PGDATABASE=genova_024_test_restore \
#   GENOVA_024_SOURCE_DATABASE=genova_008_test_restore \
#   bash supabase/test-support/024_annotation_safe_save_runner.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

TARGET_DB="${PGDATABASE:-genova_024_test_restore}"
SOURCE_DB="${GENOVA_024_SOURCE_DATABASE:-genova_008_test_restore}"
PG_HOST="${PGHOST:-127.0.0.1}"
PG_PORT="${PGPORT:-5432}"
PSQL_BIN="${PSQL_BIN:-/opt/homebrew/opt/libpq/bin/psql}"
CREATEDB_BIN="${CREATEDB_BIN:-/opt/homebrew/opt/libpq/bin/createdb}"
DROPDB_BIN="${DROPDB_BIN:-/opt/homebrew/opt/libpq/bin/dropdb}"
MIGRATION="supabase/migrations/20260909232000_repertoire_pdf_annotation_safe_save_024.sql"
DOWN="supabase/rollback/024_repertoire_pdf_annotation_safe_save_down.sql"
TEST_FILE="supabase/tests/024_repertoire_pdf_annotation_safe_save.sql"
MISMATCH_DB="genova_024_mismatch_test"
RPC_SIGNATURE="public.save_repertoire_pdf_annotation_snapshot(uuid,integer,text,text,integer,jsonb,bigint)"

case "$TARGET_DB" in
  genova_024_test*) ;;
  *) echo "REFUSED: target '$TARGET_DB' is not a dedicated genova_024_test* database"; exit 2 ;;
esac
case "$SOURCE_DB" in
  genova_008_test*|genova_024_source_test*) ;;
  *) echo "REFUSED: source '$SOURCE_DB' is not an allowed restored test database"; exit 2 ;;
esac
[ "$TARGET_DB" != "$SOURCE_DB" ] || {
  echo "REFUSED: source and target databases must differ"; exit 2;
}
[ "$PG_HOST" = "127.0.0.1" ] || {
  echo "REFUSED: host must be 127.0.0.1, got '$PG_HOST'"; exit 2;
}
[ -x "$PSQL_BIN" ] && [ -x "$CREATEDB_BIN" ] && [ -x "$DROPDB_BIN" ] || {
  echo "REFUSED: PostgreSQL psql/createdb/dropdb tools are required"; exit 2;
}

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

stable_snapshot () {
  local database="$1"
  psql_q "$database" "
    select concat_ws('|',
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from auth.users row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.choirs row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.choir_members row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.roles row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by member_id, role_id)::text, '[]')) from public.choir_member_roles row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.repertoire row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.repertoire_files row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by song_id, member_id)::text, '[]')) from public.song_assignments row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) - 'revision' order by id)::text, '[]')) from public.repertoire_pdf_annotations row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by session_id)::text, '[]')) from genova_005.active_choir_sessions row_value)
    );"
}

database_exists () {
  [ "$(psql_q postgres "select exists(select 1 from pg_database where datname = '$1');")" = "t" ]
}

drop_mismatch_database () {
  if database_exists "$MISMATCH_DB"; then
    "$DROPDB_BIN" --force "$MISMATCH_DB" >/dev/null 2>&1 || true
  fi
}

trap drop_mismatch_database EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

database_exists "$SOURCE_DB" || {
  echo "REFUSED: source database '$SOURCE_DB' does not exist"; exit 2;
}
database_exists "$TARGET_DB" || {
  echo "REFUSED: target database '$TARGET_DB' does not exist"; exit 2;
}

server_version="$(psql_q "$TARGET_DB" "select current_setting('server_version_num');")" || exit 2
case "$server_version" in
  17*) ;;
  *) echo "REFUSED: PostgreSQL 17 is required, got server_version_num=$server_version"; exit 2 ;;
esac

for schema in genova_003 genova_005; do
  [ "$(psql_q "$TARGET_DB" "select to_regnamespace('$schema') is not null;")" = "t" ] || {
    echo "REFUSED: target is missing required schema $schema"; exit 2;
  }
done

forward_present="$(psql_q "$TARGET_DB" "select to_regprocedure('$RPC_SIGNATURE') is not null;")"
backup_present="$(psql_q "$TARGET_DB" "select to_regnamespace('genova_024') is not null;")"
revision_present="$(psql_q "$TARGET_DB" "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='repertoire_pdf_annotations' and column_name='revision');")"

if [ "$forward_present" = "t" ] && [ "$backup_present" = "t" ] && [ "$revision_present" = "t" ]; then
  psql_db "$TARGET_DB" -q -f "$DOWN" >/dev/null
elif [ "$forward_present" != "f" ] || [ "$backup_present" != "f" ] || [ "$revision_present" != "f" ]; then
  echo "REFUSED: target has a partial/inconsistent 024 state"
  exit 2
fi

prior_trigger_hash="$(psql_q "$TARGET_DB" "select md5(pg_get_functiondef('public.set_repertoire_pdf_annotations_updated_fields()'::regprocedure));")" || exit 2
source_baseline="$(stable_snapshot "$SOURCE_DB")" || exit 2
target_baseline="$(stable_snapshot "$TARGET_DB")" || exit 2
[ "$source_baseline" = "$target_baseline" ] || {
  echo "REFUSED: source and target stable table snapshots differ before 024"; exit 2;
}

echo "database: $TARGET_DB from $SOURCE_DB @ $PG_HOST:$PG_PORT (PostgreSQL 17)"
echo "started: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

drop_mismatch_database
"$CREATEDB_BIN" -T "$SOURCE_DB" "$MISMATCH_DB"
psql_db "$MISMATCH_DB" -q -c "
  with candidate as (
    select annotation.id,
      (
        select other_song.id
        from public.repertoire other_song
        where other_song.choir_id = annotation.choir_id
          and other_song.id <> file.song_id
        order by other_song.id
        limit 1
      ) as wrong_song_id
    from public.repertoire_pdf_annotations annotation
    join public.repertoire_files file on file.id = annotation.repertoire_file_id
    order by annotation.id
    limit 1
  )
  update public.repertoire_pdf_annotations annotation
  set song_id = candidate.wrong_song_id
  from candidate
  where annotation.id = candidate.id
    and candidate.wrong_song_id is not null;"

[ "$(psql_q "$MISMATCH_DB" "select count(*) from public.repertoire_pdf_annotations annotation join public.repertoire_files file on file.id=annotation.repertoire_file_id where annotation.song_id is distinct from file.song_id or annotation.choir_id is distinct from file.choir_id;")" != "0" ] || {
  echo "FAIL: mismatch preflight fixture could not be created"; exit 1;
}

set +e
mismatch_output="$(psql_db "$MISMATCH_DB" -q -f "$MIGRATION" 2>&1)"
mismatch_status=$?
set -e
if [ "$mismatch_status" -eq 0 ]; then
  echo "FAIL: 024 migration accepted a pre-existing relation mismatch"
  exit 1
fi
case "$mismatch_output" in
  *"024 refused: existing annotation song/file/choir mismatch"*) ;;
  *) echo "FAIL: mismatch preflight failed for an unexpected reason"; echo "$mismatch_output"; exit 1 ;;
esac
[ "$(psql_q "$MISMATCH_DB" "select to_regnamespace('genova_024') is null and to_regprocedure('$RPC_SIGNATURE') is null and not exists(select 1 from information_schema.columns where table_schema='public' and table_name='repertoire_pdf_annotations' and column_name='revision');")" = "t" ] || {
  echo "FAIL: rejected mismatch migration left partial 024 schema"; exit 1;
}
echo "PASS mismatch preflight refused existing relation drift without partial schema"
drop_mismatch_database

psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null
psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(stable_snapshot "$TARGET_DB")" = "$target_baseline" ] || {
  echo "FAIL: forward test changed stable fixture tables"; exit 1;
}
echo "PASS forward migration and role/revision/relation matrix"

psql_db "$TARGET_DB" -q -f "$DOWN" >/dev/null
[ "$(psql_q "$TARGET_DB" "select md5(pg_get_functiondef('public.set_repertoire_pdf_annotations_updated_fields()'::regprocedure));")" = "$prior_trigger_hash" ] || {
  echo "FAIL: down migration did not restore the prior trigger function"; exit 1;
}
[ "$(psql_q "$TARGET_DB" "select to_regnamespace('genova_024') is null and to_regprocedure('$RPC_SIGNATURE') is null and not exists(select 1 from information_schema.columns where table_schema='public' and table_name='repertoire_pdf_annotations' and column_name='revision');")" = "t" ] || {
  echo "FAIL: down migration left 024 schema objects"; exit 1;
}
[ "$(stable_snapshot "$TARGET_DB")" = "$target_baseline" ] || {
  echo "FAIL: down migration changed stable fixture tables"; exit 1;
}
echo "PASS down migration restored trigger/schema and preserved table data"

psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null
psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(stable_snapshot "$TARGET_DB")" = "$target_baseline" ] || {
  echo "FAIL: restored forward test changed stable fixture tables"; exit 1;
}
[ "$(stable_snapshot "$SOURCE_DB")" = "$source_baseline" ] || {
  echo "FAIL: source database changed during 024 runner"; exit 1;
}

echo "PASS forward state restored; target fixtures and source database unchanged"
echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
