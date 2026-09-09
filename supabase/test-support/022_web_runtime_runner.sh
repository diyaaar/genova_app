#!/usr/bin/env bash
# 022 web protected-file compatibility — DISPOSABLE LOCAL SUPABASE ONLY.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$REPO_ROOT"

refuse () {
  echo "REFUSED: $*" >&2
  exit 2
}

ACTION="${1:-}"
RUNTIME_INPUT="${GENOVA_022_WORKDIR:-}"
DOCKER_CONTEXT_INPUT="${GENOVA_022_DOCKER_CONTEXT:-}"
SOURCE_DATABASE="${PGDATABASE:-}"
SOURCE_HOST="${PGHOST:-127.0.0.1}"
SOURCE_PORT="${PGPORT:-5432}"
PSQL_COMMAND="${PSQL_BIN:-psql}"
PG_DUMP_COMMAND="${PG_DUMP_BIN:-pg_dump}"
DENO_COMMAND="${DENO_BIN:-deno}"

case "$ACTION" in
  prepare|status|enable-failure|disable-failure|cleanup) ;;
  *) refuse 'action must be prepare, status, enable-failure, disable-failure or cleanup' ;;
esac
[ -n "$RUNTIME_INPUT" ] || refuse 'GENOVA_022_WORKDIR is required'
[ -d "$RUNTIME_INPUT" ] || refuse "runtime directory does not exist: $RUNTIME_INPUT"
RUNTIME_DIR="$(cd "$RUNTIME_INPUT" && pwd -P)"
[ "$RUNTIME_DIR" = "$REPO_ROOT/spike/022-runtime" ] || {
  refuse "runtime must resolve exactly to $REPO_ROOT/spike/022-runtime"
}
[ "$DOCKER_CONTEXT_INPUT" = 'colima-genova022' ] || refuse 'Docker context must be colima-genova022'
case "$SOURCE_DATABASE" in genova_008_test*|genova_018_test*|genova_021_test*|genova_022_test*) ;;
  *) refuse 'PGDATABASE must be a dedicated genova test copy' ;;
esac
[ "$SOURCE_HOST" = '127.0.0.1' ] || refuse 'PGHOST must be 127.0.0.1'
[ "$SOURCE_PORT" = '5432' ] || refuse 'PGPORT must be 5432'

for command_name in docker supabase node pnpm rsync curl "$PSQL_COMMAND" "$PG_DUMP_COMMAND" "$DENO_COMMAND"; do
  command -v "$command_name" >/dev/null 2>&1 || refuse "missing command: $command_name"
done

PROJECT_ID="$(sed -n 's/^project_id = "\([^"]*\)"/\1/p' "$RUNTIME_DIR/supabase/config.toml")"
[ "$PROJECT_ID" = 'genova-022-runtime' ] || refuse "unexpected runtime project: $PROJECT_ID"
DB_CONTAINER='supabase_db_genova-022-runtime'
EDGE_CONTAINER='supabase_edge_runtime_genova-022-runtime'
for container_name in "$DB_CONTAINER" "$EDGE_CONTAINER"; do
  container_project="$(docker --context "$DOCKER_CONTEXT_INPUT" inspect \
    --format '{{index .Config.Labels "com.supabase.cli.project"}}' "$container_name" 2>/dev/null || true)"
  [ "$container_project" = "$PROJECT_ID" ] || refuse "unexpected or missing container: $container_name"
done

TEMP_DIR="$(mktemp -d "$RUNTIME_DIR/.022-run.XXXXXX")"
cleanup_temp () { rm -rf -- "$TEMP_DIR"; }
trap cleanup_temp EXIT

RUNTIME_ENVIRONMENT="$(DOCKER_CONTEXT="$DOCKER_CONTEXT_INPUT" supabase status -o env \
  --workdir "$RUNTIME_DIR" 2>"$TEMP_DIR/status.stderr")" || refuse 'local Supabase stack is not healthy'
eval "$RUNTIME_ENVIRONMENT"
: "${API_URL:?missing local API_URL}"
: "${DB_URL:?missing local DB_URL}"
: "${ANON_KEY:?missing local ANON_KEY}"
: "${SERVICE_ROLE_KEY:?missing local SERVICE_ROLE_KEY}"

RUNTIME_API_URL="$API_URL" RUNTIME_DB_URL="$DB_URL" RUNTIME_SERVICE_KEY="$SERVICE_ROLE_KEY" node <<'NODE'
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
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.repertoire row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.repertoire_files row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by id)::text, '[]')) from public.repertoire_pdf_annotations row_value),
      (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(row_value) order by session_id)::text, '[]')) from genova_005.active_choir_sessions row_value)
    );"
}

[ "$(source_psql "select current_setting('server_version_num') like '17%';")" = 't' ] || refuse 'source must be PostgreSQL 17'
for required_schema in genova_003 genova_005; do
  [ "$(source_psql "select to_regnamespace('$required_schema') is not null;")" = 't' ] || refuse "source schema missing: $required_schema"
done
[ "$(target_psql "select current_database() = 'postgres' and current_setting('server_version_num') like '17%';")" = 't' ] || refuse 'unexpected target database'

FIXTURE_PATH="$RUNTIME_DIR/.022-fixture.json"
WEB_ENV_PATH="$RUNTIME_DIR/.022-web.env"
SOURCE_BASELINE_PATH="$RUNTIME_DIR/.022-source-baseline"

fixture_command () {
  SUPABASE_URL="$API_URL" SUPABASE_ANON_KEY="$ANON_KEY" \
  SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" GENOVA_022_PROJECT_ID="$PROJECT_ID" \
  GENOVA_022_WORKDIR="$RUNTIME_DIR" GENOVA_022_FIXTURE_PATH="$FIXTURE_PATH" \
  GENOVA_022_WEB_ENV_PATH="$WEB_ENV_PATH" \
  GENOVA_022_PDF_PATH="$REPO_ROOT/apps/mobile/src/repertoire/__fixtures__/score_40p.pdf" \
  GENOVA_022_ANNOTATION_PATH="$REPO_ROOT/apps/mobile/src/repertoire/__fixtures__/annotations.sample.json" \
    pnpm exec tsx supabase/test-support/022_web_runtime_fixtures.ts "$1"
}

if [ "$ACTION" = 'prepare' ]; then
  [ ! -e "$FIXTURE_PATH" ] || refuse '022 fixture record already exists'
  [ ! -e "$WEB_ENV_PATH" ] || refuse '022 web environment already exists'
  [ "$(target_psql "select count(*) from auth.users where email like '022-web-%@example.invalid';")" = '0' ] || refuse 'stale 022 Auth fixture exists'
  [ "$(target_psql "select count(*) from storage.buckets where name like 'genova-022-%';")" = '0' ] || refuse 'stale 022 Storage fixture exists'

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
      public.schools, public.departments,
      public.repertoire, public.repertoire_files, public.repertoire_pdf_annotations,
      public.repertoire_cache_versions, public.song_assignments,
      public.repertoire_tags, public.repertoire_song_tags to authenticated;
    grant execute on function public.current_choir_id() to authenticated;
    grant execute on function public.list_my_choirs() to authenticated;
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
  rsync -a supabase/functions/create-choir/create-choir-core.ts "$RUNTIME_DIR/supabase/functions/create-choir/"
  rsync -a lib/server/drive-file-content.ts "$RUNTIME_DIR/lib/server/"
  "$DENO_COMMAND" check --node-modules-dir=none --no-lock supabase/functions/repertoire-file/index.ts
  docker --context "$DOCKER_CONTEXT_INPUT" restart "$EDGE_CONTAINER" >/dev/null
  EDGE_HTTP_CODE=''
  for _attempt in 1 2 3 4 5 6 7 8 9 10; do
    EDGE_HTTP_CODE="$(curl -sS -o /dev/null -w '%{http_code}' -X OPTIONS "$API_URL/functions/v1/repertoire-file" || true)"
    [ "$EDGE_HTTP_CODE" = '204' ] && break
    sleep 1
  done
  [ "$EDGE_HTTP_CODE" = '204' ] || refuse 'Edge endpoint did not become ready'
  fixture_command prepare
  printf '%s\n' "$SOURCE_BASELINE" >"$SOURCE_BASELINE_PATH"
  chmod 600 "$SOURCE_BASELINE_PATH"
fi

[ -f "$FIXTURE_PATH" ] || refuse '022 fixture record is missing'
[ -f "$SOURCE_BASELINE_PATH" ] || refuse '022 source baseline is missing'
[ "$(source_snapshot)" = "$(cat "$SOURCE_BASELINE_PATH")" ] || refuse 'source database changed during 022'

if [ "$ACTION" = 'status' ]; then
  fixture_command status
elif [ "$ACTION" = 'enable-failure' ]; then
  fixture_command enable-failure
elif [ "$ACTION" = 'disable-failure' ]; then
  fixture_command disable-failure
elif [ "$ACTION" = 'cleanup' ]; then
  fixture_command cleanup
  [ "$(target_psql "select count(*) from auth.users where email like '022-web-%@example.invalid';")" = '0' ] || refuse '022 Auth fixture remains'
  [ "$(target_psql "select count(*) from storage.buckets where name like 'genova-022-%';")" = '0' ] || refuse '022 Storage fixture remains'
  rm -f -- "$SOURCE_BASELINE_PATH"
fi

echo "PASS runtime_project=$PROJECT_ID api=loopback source_database=$SOURCE_DATABASE action=$ACTION"
echo 'PASS source database baseline unchanged'
