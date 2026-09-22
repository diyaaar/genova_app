#!/usr/bin/env bash
# 055 regression guard — LOCAL ISOLATED POSTGRESQL 17 DATABASES ONLY.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$REPO_ROOT"
SOURCE_DB="${GENOVA_055_SOURCE_DATABASE:-genova_008_test_restore}"
TARGET_DB="${PGDATABASE:-genova_055_test_runtime}"
PG_HOST="${PGHOST:-127.0.0.1}"; PG_PORT="${PGPORT:-5432}"
PSQL_BIN="${PSQL_BIN:-/opt/homebrew/opt/libpq/bin/psql}"
PG_DUMP_BIN="${PG_DUMP_BIN:-/opt/homebrew/opt/libpq/bin/pg_dump}"
CREATEDB_BIN="${CREATEDB_BIN:-/opt/homebrew/opt/libpq/bin/createdb}"
DROPDB_BIN="${DROPDB_BIN:-/opt/homebrew/opt/libpq/bin/dropdb}"
MIGRATION=supabase/migrations/20260922071942_private_r2_repertoire_lifecycle_055.sql
DOWN=supabase/rollback/055_private_r2_repertoire_lifecycle_down.sql
TEST_FILE=supabase/tests/055_private_r2_repertoire_lifecycle.sql
refuse(){ echo "REFUSED: $*" >&2; exit 2; }
[[ "$SOURCE_DB" =~ ^genova_[A-Za-z0-9_]*test[A-Za-z0-9_]*$ ]] || refuse "unsafe source '$SOURCE_DB'"
[[ "$TARGET_DB" =~ ^genova_055_test[A-Za-z0-9_]*$ ]] || refuse "unsafe target '$TARGET_DB'"
[ "$SOURCE_DB" != "$TARGET_DB" ] || refuse 'source and target must differ'
[ "$PG_HOST" = 127.0.0.1 ] || refuse 'loopback only'
for item in "$PSQL_BIN" "$PG_DUMP_BIN" "$CREATEDB_BIN" "$DROPDB_BIN"; do [ -x "$item" ] || refuse "missing tool: $item"; done
for item in "$MIGRATION" "$DOWN" "$TEST_FILE"; do [ -f "$item" ] || refuse "missing source: $item"; done
export PGHOST="$PG_HOST" PGPORT="$PG_PORT"
psql_db(){ local database="$1"; shift; PGDATABASE="$database" "$PSQL_BIN" -X -v ON_ERROR_STOP=1 "$@"; }
psql_q(){ local database="$1" sql="$2"; psql_db "$database" -A -t -q -c "$sql"; }
database_exists(){ [ "$(psql_q postgres "select exists(select 1 from pg_database where datname='$1');")" = t ]; }
schema_hash(){ PGDATABASE="$1" "$PG_DUMP_BIN" --schema-only --no-owner --no-privileges | sed -E '/^\\(un)?restrict /d' | shasum -a 256 | awk '{print $1}'; }
data_snapshot(){ psql_q "$1" "select concat_ws('|',
 (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.repertoire r),
 (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.repertoire_files r),
 (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.repertoire_pdf_annotations r));"; }
target_created=false
cleanup(){ if [ "$target_created" = true ] && database_exists "$TARGET_DB"; then "$DROPDB_BIN" --force "$TARGET_DB" >/dev/null 2>&1 || true; fi; }
trap cleanup EXIT; trap 'exit 130' INT; trap 'exit 143' TERM
database_exists "$SOURCE_DB" || refuse "source '$SOURCE_DB' does not exist"
database_exists "$TARGET_DB" && refuse "target '$TARGET_DB' already exists"
[ "$(psql_q postgres "select current_setting('server_version_num') like '17%';")" = t ] || refuse 'PostgreSQL 17 required'
[ "$(psql_q "$SOURCE_DB" "select to_regclass('public.repertoire_files') is not null and to_regnamespace('genova_055') is null;")" = t ] || refuse 'source baseline is incompatible'
source_schema="$(schema_hash "$SOURCE_DB")"; source_data="$(data_snapshot "$SOURCE_DB")"
"$CREATEDB_BIN" -T "$SOURCE_DB" "$TARGET_DB"; target_created=true
psql_db "$TARGET_DB" -q -f supabase/migrations/20260920205054_private_r2_repertoire_read_053.sql >/dev/null
psql_db "$TARGET_DB" -q -f supabase/migrations/20260921185113_private_r2_repertoire_upload_054.sql >/dev/null
baseline_schema="$(schema_hash "$TARGET_DB")"
[ "$(data_snapshot "$TARGET_DB")" = "$source_data" ] || refuse 'pre-055 data mismatch'
echo "database: $TARGET_DB cloned from local $SOURCE_DB @ $PG_HOST:$PG_PORT (PostgreSQL 17)"
echo "started: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null
psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(data_snapshot "$TARGET_DB")" = "$source_data" ] || refuse 'forward/test changed baseline data'
echo 'PASS exact-target, role, annotation, mixed-song and idempotent lifecycle matrix'
psql_db "$TARGET_DB" -q -f "$DOWN" >/dev/null
[ "$(schema_hash "$TARGET_DB")" = "$baseline_schema" ] || refuse 'down schema differs from baseline'
[ "$(data_snapshot "$TARGET_DB")" = "$source_data" ] || refuse 'down changed baseline data'
echo 'PASS down restored exact 054 schema and data state'
psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null
psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(schema_hash "$SOURCE_DB")" = "$source_schema" ] || refuse 'source schema changed'
[ "$(data_snapshot "$SOURCE_DB")" = "$source_data" ] || refuse 'source data changed'
echo 'PASS restored-forward state; source unchanged'
psql_db "$TARGET_DB" -q -v setup_only=true -f "$TEST_FILE" >/dev/null
PGDATABASE="$TARGET_DB" PSQL_BIN="$PSQL_BIN" pnpm exec tsx supabase/test-support/055_lifecycle_concurrency.ts
if psql_db "$TARGET_DB" -q -f "$DOWN" >/dev/null 2>&1; then refuse 'down accepted pending provider cleanup'; fi
echo 'PASS down refuses pending provider cleanup'
cleanup; target_created=false
database_exists "$TARGET_DB" && refuse 'target remains'
echo 'PASS disposable target database removed'
echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
