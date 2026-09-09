#!/usr/bin/env bash
# 018 protected-file runtime acceptance — DISPOSABLE LOCAL SUPABASE ONLY.
#
# GENOVA_018_WORKDIR="$PWD/spike/018-runtime" \
# GENOVA_018_DOCKER_CONTEXT=colima-genova018 \
# PGDATABASE=genova_008_test_restore \
# PSQL_BIN=/opt/homebrew/opt/postgresql@17/bin/psql \
# PG_DUMP_BIN=/opt/homebrew/opt/postgresql@17/bin/pg_dump \
# bash supabase/test-support/018_repertoire_file_runtime_runner.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$REPO_ROOT"

refuse () {
  echo "REFUSED: $*" >&2
  exit 2
}

RUNTIME_INPUT="${GENOVA_018_WORKDIR:-}"
DOCKER_CONTEXT_INPUT="${GENOVA_018_DOCKER_CONTEXT:-}"
SOURCE_DATABASE="${PGDATABASE:-}"
SOURCE_HOST="${PGHOST:-127.0.0.1}"
SOURCE_PORT="${PGPORT:-5432}"
PSQL_COMMAND="${PSQL_BIN:-psql}"
PG_DUMP_COMMAND="${PG_DUMP_BIN:-pg_dump}"
DENO_COMMAND="${DENO_BIN:-deno}"

[ -n "$RUNTIME_INPUT" ] || refuse 'GENOVA_018_WORKDIR is required'
[ -d "$RUNTIME_INPUT" ] || refuse "runtime directory does not exist: $RUNTIME_INPUT"
RUNTIME_DIR="$(cd "$RUNTIME_INPUT" && pwd -P)"
[ "$RUNTIME_DIR" = "$REPO_ROOT/spike/018-runtime" ] || {
  refuse "runtime must resolve exactly to $REPO_ROOT/spike/018-runtime"
}
[ "$DOCKER_CONTEXT_INPUT" = 'colima-genova018' ] || {
  refuse 'GENOVA_018_DOCKER_CONTEXT must be colima-genova018'
}
case "$SOURCE_DATABASE" in
  genova_008_test*|genova_018_test*) ;;
  *) refuse "PGDATABASE must name a dedicated genova_008_test* or genova_018_test* copy" ;;
esac
[ "$SOURCE_HOST" = '127.0.0.1' ] || refuse 'PGHOST must be 127.0.0.1'
[ "$SOURCE_PORT" = '5432' ] || refuse 'PGPORT must be 5432'

for command_name in docker supabase node pnpm rsync curl "$PSQL_COMMAND" "$PG_DUMP_COMMAND" "$DENO_COMMAND"; do
  command -v "$command_name" >/dev/null 2>&1 || refuse "missing command: $command_name"
done

PROJECT_ID="$(sed -n 's/^project_id = "\([^"]*\)"/\1/p' "$RUNTIME_DIR/supabase/config.toml")"
[ "$PROJECT_ID" = 'genova-018-runtime' ] || refuse "unexpected runtime project_id: $PROJECT_ID"

DB_CONTAINER='supabase_db_genova-018-runtime'
EDGE_CONTAINER='supabase_edge_runtime_genova-018-runtime'
for container_name in "$DB_CONTAINER" "$EDGE_CONTAINER"; do
  container_project="$(docker --context "$DOCKER_CONTEXT_INPUT" inspect \
    --format '{{index .Config.Labels "com.supabase.cli.project"}}' "$container_name" 2>/dev/null || true)"
  [ "$container_project" = "$PROJECT_ID" ] || refuse "unexpected or missing container: $container_name"
done

TEMP_DIR="$(mktemp -d "$RUNTIME_DIR/.018-run.XXXXXX")"
cleanup () {
  rm -rf -- "$TEMP_DIR"
}
trap cleanup EXIT

RUNTIME_ENVIRONMENT="$(DOCKER_CONTEXT="$DOCKER_CONTEXT_INPUT" supabase status -o env \
  --workdir "$RUNTIME_DIR" 2>"$TEMP_DIR/status.stderr")" || {
    sed -E 's/(KEY|SECRET|TOKEN)=.*/\1=[redacted]/' "$TEMP_DIR/status.stderr" >&2
    refuse 'the disposable Supabase stack is not healthy'
  }
eval "$RUNTIME_ENVIRONMENT"
: "${API_URL:?missing local API_URL}"
: "${DB_URL:?missing local DB_URL}"
: "${ANON_KEY:?missing local ANON_KEY}"
: "${SERVICE_ROLE_KEY:?missing local SERVICE_ROLE_KEY}"

RUNTIME_API_URL="$API_URL" RUNTIME_DB_URL="$DB_URL" RUNTIME_SERVICE_KEY="$SERVICE_ROLE_KEY" \
  node <<'NODE'
const assert = require('node:assert/strict');
const api = new URL(process.env.RUNTIME_API_URL);
const db = new URL(process.env.RUNTIME_DB_URL);
assert.equal(api.protocol, 'http:');
assert.ok(['127.0.0.1', 'localhost'].includes(api.hostname));
assert.equal(api.port, '54321');
assert.equal(db.protocol, 'postgresql:');
assert.ok(['127.0.0.1', 'localhost'].includes(db.hostname));
assert.equal(db.port, '54322');
assert.equal(db.pathname, '/postgres');
const parts = process.env.RUNTIME_SERVICE_KEY.split('.');
assert.equal(parts.length, 3);
const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
assert.equal(claims.iss, 'supabase-demo');
assert.equal(claims.role, 'service_role');
NODE

source_psql () {
  PGHOST="$SOURCE_HOST" PGPORT="$SOURCE_PORT" PGDATABASE="$SOURCE_DATABASE" \
    "$PSQL_COMMAND" -X -A -t -v ON_ERROR_STOP=1 -c "$1"
}

target_psql () {
  "$PSQL_COMMAND" "$DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c "$1"
}

source_snapshot () {
  source_psql "
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

[ "$(source_psql "select current_setting('server_version_num') like '17%';")" = 't' ] || {
  refuse 'source PostgreSQL must be version 17'
}
for required_schema in genova_003 genova_005; do
  [ "$(source_psql "select to_regnamespace('$required_schema') is not null;")" = 't' ] || {
    refuse "source schema is missing: $required_schema"
  }
done
[ "$(source_psql "select to_regclass('public.repertoire_files') is not null;")" = 't' ] || {
  refuse 'source public.repertoire_files is missing'
}
[ "$(target_psql "select current_database() = 'postgres' and current_setting('server_version_num') like '17%';")" = 't' ] || {
  refuse 'target is not the disposable PostgreSQL 17 postgres database'
}
[ "$(target_psql "select count(*) from auth.users where email like '018-%@example.invalid';")" = '0' ] || {
  refuse 'stale 018 Auth fixtures exist; reset only the disposable runtime before retrying'
}
[ "$(target_psql "select count(*) from storage.buckets where name like 'genova-018-%';")" = '0' ] || {
  refuse 'stale 018 Storage fixtures exist; reset only the disposable runtime before retrying'
}

SOURCE_BASELINE="$(source_snapshot)"
SCHEMA_DUMP="$TEMP_DIR/source-schema.sql"
PGHOST="$SOURCE_HOST" PGPORT="$SOURCE_PORT" PGDATABASE="$SOURCE_DATABASE" \
  "$PG_DUMP_COMMAND" --schema-only --no-owner --no-privileges \
    --schema=public --schema=genova_003 --schema=genova_005 >"$SCHEMA_DUMP"
[ -s "$SCHEMA_DUMP" ] || refuse 'source schema dump is empty'

target_psql 'drop schema if exists genova_005 cascade; drop schema if exists genova_003 cascade; drop schema if exists public cascade;'
"$PSQL_COMMAND" "$DB_URL" -X -v ON_ERROR_STOP=1 -q -f "$SCHEMA_DUMP"
target_psql "
  grant usage on schema public to anon, authenticated, service_role;
  grant select on public.choir_members, public.choir_member_roles, public.roles,
    public.repertoire, public.repertoire_files, public.song_assignments to authenticated;
  grant execute on function public.current_choir_id() to authenticated;
  grant execute on function public.set_active_choir(uuid) to authenticated;
  grant all privileges on all tables in schema public to service_role;
  grant all privileges on all sequences in schema public to service_role;
  grant all privileges on all functions in schema public to service_role;
  notify pgrst, 'reload schema';"

mkdir -p "$RUNTIME_DIR/supabase/functions/repertoire-file" \
  "$RUNTIME_DIR/supabase/functions/create-choir" "$RUNTIME_DIR/lib/server"
rsync -a supabase/functions/repertoire-file/index.ts \
  supabase/functions/repertoire-file/handler.ts \
  supabase/functions/repertoire-file/ticket.ts \
  supabase/functions/repertoire-file/storage.ts \
  "$RUNTIME_DIR/supabase/functions/repertoire-file/"
rsync -a supabase/functions/create-choir/create-choir-core.ts \
  "$RUNTIME_DIR/supabase/functions/create-choir/"
rsync -a lib/server/drive-file-content.ts "$RUNTIME_DIR/lib/server/"
for source_file in \
  supabase/functions/repertoire-file/index.ts \
  supabase/functions/repertoire-file/handler.ts \
  supabase/functions/repertoire-file/ticket.ts \
  supabase/functions/repertoire-file/storage.ts \
  supabase/functions/create-choir/create-choir-core.ts \
  lib/server/drive-file-content.ts; do
  cmp -s "$source_file" "$RUNTIME_DIR/$source_file" || refuse "runtime source differs: $source_file"
done

"$DENO_COMMAND" check --node-modules-dir=none --no-lock \
  supabase/functions/repertoire-file/index.ts
docker --context "$DOCKER_CONTEXT_INPUT" restart "$EDGE_CONTAINER" >/dev/null
EDGE_HTTP_CODE=''
for _attempt in 1 2 3 4 5 6 7 8 9 10; do
  EDGE_HTTP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' -X OPTIONS \
    "$API_URL/functions/v1/repertoire-file" || true)"
  [ "$EDGE_HTTP_CODE" = '204' ] && break
  sleep 1
done
[ "$EDGE_HTTP_CODE" = '204' ] || refuse 'Edge endpoint did not become ready'

EDGE_MEMORY_BEFORE="$(docker --context "$DOCKER_CONTEXT_INPUT" stats --no-stream \
  --format '{{.MemUsage}}' "$EDGE_CONTAINER")"
SUPABASE_URL="$API_URL" SUPABASE_ANON_KEY="$ANON_KEY" \
SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" GENOVA_018_PROJECT_ID="$PROJECT_ID" \
  pnpm exec tsx supabase/test-support/018_repertoire_file_runtime_acceptance.ts
EDGE_MEMORY_AFTER="$(docker --context "$DOCKER_CONTEXT_INPUT" stats --no-stream \
  --format '{{.MemUsage}}' "$EDGE_CONTAINER")"

[ "$(source_snapshot)" = "$SOURCE_BASELINE" ] || {
  echo 'FAIL  isolated source database changed during 018' >&2
  exit 1
}
[ "$(target_psql "select count(*) from auth.users where email like '018-%@example.invalid';")" = '0' ] || {
  echo 'FAIL  runtime Auth fixtures remain' >&2
  exit 1
}
[ "$(target_psql "select count(*) from storage.buckets where name like 'genova-018-%';")" = '0' ] || {
  echo 'FAIL  runtime Storage fixtures remain' >&2
  exit 1
}

echo "PASS  runtime_project=$PROJECT_ID api=loopback source_database=$SOURCE_DATABASE"
echo "PASS  source schema-only copy and tracked source baseline unchanged"
echo "PASS  entrypoint Deno check and exact runtime source hashes"
echo "OBSERVE edge_memory_before=$EDGE_MEMORY_BEFORE"
echo "OBSERVE edge_memory_after=$EDGE_MEMORY_AFTER"
echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
