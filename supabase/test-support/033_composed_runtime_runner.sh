#!/usr/bin/env bash
# 033 composed permanent-WebView runtime — DISPOSABLE LOCAL SERVICES ONLY.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$REPO_ROOT"

refuse () { echo "REFUSED: $*" >&2; exit 2; }

ACTION="${1:-}"
RUNTIME_INPUT="${GENOVA_033_WORKDIR:-}"
DOCKER_CONTEXT_INPUT="${GENOVA_033_DOCKER_CONTEXT:-}"
SOURCE_DATABASE="${PGDATABASE:-}"
SOURCE_HOST="${PGHOST:-127.0.0.1}"
SOURCE_PORT="${PGPORT:-5432}"
PSQL_COMMAND="${PSQL_BIN:-psql}"
PG_DUMP_COMMAND="${PG_DUMP_BIN:-pg_dump}"

case "$ACTION" in initialize|serve-loopback-tunnel|start|prepare|status|serve-credential|refresh-ticket|expire-ticket|arm-single-401|arm-double-401|disarm-401|revoke-admin-refresh|cleanup|stop) ;; *) refuse 'unsupported 033 action' ;; esac
[ -n "$RUNTIME_INPUT" ] || refuse 'GENOVA_033_WORKDIR is required'
RUNTIME_PARENT="$(cd "$(dirname "$RUNTIME_INPUT")" && pwd -P)"
[ "$RUNTIME_PARENT/$(basename "$RUNTIME_INPUT")" = "$REPO_ROOT/spike/033-runtime" ] || refuse 'runtime must resolve exactly to spike/033-runtime'
[ "$DOCKER_CONTEXT_INPUT" = 'colima-genova033' ] || refuse 'Docker context must be colima-genova033'
case "$SOURCE_DATABASE" in genova_008_test*) ;; *) refuse 'PGDATABASE must be a dedicated genova_008 test copy' ;; esac
[ "$SOURCE_HOST" = '127.0.0.1' ] || refuse 'PGHOST must be 127.0.0.1'
[ "$SOURCE_PORT" = '5432' ] || refuse 'PGPORT must be 5432'

for command_name in docker supabase node pnpm rsync curl lsof ssh "$PSQL_COMMAND" "$PG_DUMP_COMMAND"; do
  command -v "$command_name" >/dev/null 2>&1 || refuse "missing command: $command_name"
done

source_psql () { PGHOST="$SOURCE_HOST" PGPORT="$SOURCE_PORT" PGDATABASE="$SOURCE_DATABASE" "$PSQL_COMMAND" -X -A -t -v ON_ERROR_STOP=1 -c "$1"; }

source_snapshot () {
  source_psql "select concat_ws('|',
    (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from auth.users r),
    (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.choirs r),
    (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.choir_members r),
    (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.announcements r),
    (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.rehearsals r),
    (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from public.profile_change_requests r),
    (select count(*)::text || ':' || md5(coalesce(jsonb_agg(to_jsonb(r) order by id)::text,'[]')) from genova_008.invitations r));"
}

[ "$(source_psql "select current_setting('server_version_num') like '17%';")" = 't' ] || refuse 'source must be PostgreSQL 17'
for required_schema in genova_003 genova_005 genova_007 genova_008; do
  [ "$(source_psql "select to_regnamespace('$required_schema') is not null;")" = 't' ] || refuse "source schema missing: $required_schema"
done

if [ "$ACTION" = 'initialize' ]; then
  [ ! -e "$RUNTIME_INPUT" ] || refuse '033 runtime path already exists'
  mkdir -p "$RUNTIME_INPUT/supabase/functions"
  cp supabase/test-support/033_runtime_config.toml "$RUNTIME_INPUT/supabase/config.toml"
  echo 'PASS runtime_initialize path=owned services=not-started'
  exit 0
fi

[ -d "$RUNTIME_INPUT" ] || refuse '033 runtime path does not exist'
RUNTIME_DIR="$(cd "$RUNTIME_INPUT" && pwd -P)"
PROJECT_ID="$(sed -n 's/^project_id = "\([^"]*\)"/\1/p' "$RUNTIME_DIR/supabase/config.toml")"
[ "$PROJECT_ID" = 'genova-033-runtime' ] || refuse 'unexpected runtime project'

if [ "$ACTION" = 'serve-loopback-tunnel' ]; then
  SSH_CONFIG_INPUT="${GENOVA_033_SSH_CONFIG:-}"
  [ -n "$SSH_CONFIG_INPUT" ] || refuse 'GENOVA_033_SSH_CONFIG is required'
  SSH_CONFIG_PARENT="$(cd "$(dirname "$SSH_CONFIG_INPUT")" && pwd -P)"
  SSH_CONFIG="$SSH_CONFIG_PARENT/$(basename "$SSH_CONFIG_INPUT")"
  [ "$SSH_CONFIG" = "$HOME/.colima/_lima/colima-genova033/ssh.config" ] || refuse 'unexpected Colima SSH config'
  [ -f "$SSH_CONFIG" ] && [ ! -L "$SSH_CONFIG" ] || refuse 'Colima SSH config must be a regular file'
  [ "$(sed -n 's/^portForwarder: //p' "$HOME/.colima/genova033/colima.yaml")" = 'none' ] \
    || refuse 'Colima automatic port forwarding must be disabled'
  exec ssh -F "$SSH_CONFIG" -o ControlMaster=no -o ControlPath=none \
    -o ExitOnForwardFailure=yes -o GatewayPorts=no \
    -o ServerAliveInterval=15 -o ServerAliveCountMax=2 -N \
    -L 127.0.0.1:54321:127.0.0.1:54321 \
    -L 127.0.0.1:54322:127.0.0.1:54322 \
    lima-colima-genova033
fi

if [ "$ACTION" = 'start' ]; then
  for local_port in 54321 54322; do
    [ "$(lsof -nP -a -iTCP:"$local_port" -sTCP:LISTEN -Fn | sed -n 's/^n//p')" = "127.0.0.1:$local_port" ] \
      || refuse "exact loopback tunnel is missing for port $local_port"
  done
  if ! DOCKER_CONTEXT="$DOCKER_CONTEXT_INPUT" supabase start --workdir "$RUNTIME_DIR" >/dev/null 2>&1; then
    DOCKER_CONTEXT="$DOCKER_CONTEXT_INPUT" supabase stop --workdir "$RUNTIME_DIR" --no-backup >/dev/null 2>&1 || true
    refuse 'local Supabase stack failed to start'
  fi
  EDGE_CONTAINER="supabase_edge_runtime_$PROJECT_ID"
  if [ "$(DOCKER_CONTEXT="$DOCKER_CONTEXT_INPUT" docker inspect -f '{{.State.Running}}' "$EDGE_CONTAINER" 2>/dev/null || true)" != 'true' ]; then
    DOCKER_CONTEXT="$DOCKER_CONTEXT_INPUT" docker start "$EDGE_CONTAINER" >/dev/null 2>&1 \
      || refuse 'local Edge runtime failed to start'
  fi
  [ "$(DOCKER_CONTEXT="$DOCKER_CONTEXT_INPUT" docker inspect -f '{{.State.Running}}' "$EDGE_CONTAINER" 2>/dev/null || true)" = 'true' ] \
    || refuse 'local Edge runtime is not running'
  echo 'PASS runtime_start stack=healthy endpoints=loopback-only output=redacted'
  exit 0
fi

TEMP_DIR="$(mktemp -d "$RUNTIME_DIR/.033-run.XXXXXX")"
cleanup_temp () {
  [ ! -e "$TEMP_DIR" ] || find "$TEMP_DIR" -depth -delete
}
trap cleanup_temp EXIT
RUNTIME_ENVIRONMENT="$(DOCKER_CONTEXT="$DOCKER_CONTEXT_INPUT" supabase status -o env --workdir "$RUNTIME_DIR" 2>"$TEMP_DIR/status.stderr")" || refuse 'local Supabase stack is not healthy'
eval "$RUNTIME_ENVIRONMENT"
: "${API_URL:?missing API_URL}" "${DB_URL:?missing DB_URL}" "${ANON_KEY:?missing ANON_KEY}" "${SERVICE_ROLE_KEY:?missing SERVICE_ROLE_KEY}"

target_psql () { "$PSQL_COMMAND" "$DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c "$1"; }

RUNTIME_API_URL="$API_URL" RUNTIME_DB_URL="$DB_URL" RUNTIME_ANON_KEY="$ANON_KEY" RUNTIME_SERVICE_KEY="$SERVICE_ROLE_KEY" node <<'NODE'
const assert=require('node:assert/strict');
for (const [name,port] of [['RUNTIME_API_URL','54321'],['RUNTIME_DB_URL','54322']]) {
  const url=new URL(process.env[name]); assert.ok(['http:','postgresql:'].includes(url.protocol));
  assert.ok(['127.0.0.1','localhost'].includes(url.hostname)); assert.equal(url.port,port);
}
for (const [key,role] of [[process.env.RUNTIME_ANON_KEY,'anon'],[process.env.RUNTIME_SERVICE_KEY,'service_role']]) {
  const claims=JSON.parse(Buffer.from(key.split('.')[1],'base64url')); assert.equal(claims.iss,'supabase-demo'); assert.equal(claims.role,role);
}
NODE

FIXTURE_PATH="$RUNTIME_DIR/.033-fixture.json"
ENV_PATH="$RUNTIME_DIR/.033-runtime.env"
SOURCE_BASELINE_PATH="$RUNTIME_DIR/.033-source-baseline"

if [ "$ACTION" = 'serve-credential' ]; then
  case "${GENOVA_033_CREDENTIAL_ROLE:-}" in admin|chorist) ;; *) refuse 'GENOVA_033_CREDENTIAL_ROLE must be admin or chorist' ;; esac
  [ -f "$FIXTURE_PATH" ] || refuse '033 fixture does not exist'
  GENOVA_033_CREDENTIAL_SERVER=1 GENOVA_033_CREDENTIAL_ROLE="$GENOVA_033_CREDENTIAL_ROLE" \
    GENOVA_033_WORKDIR="$RUNTIME_DIR" GENOVA_033_FIXTURE_PATH="$FIXTURE_PATH" \
    node supabase/test-support/033_credential_server.mjs
  exit 0
fi

fixture_action () {
  SUPABASE_URL="http://127.0.0.1:54321" SUPABASE_ANON_KEY="$ANON_KEY" SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY" \
  GENOVA_033_PROJECT_ID="$PROJECT_ID" GENOVA_033_WORKDIR="$RUNTIME_DIR" \
  GENOVA_033_FIXTURE_PATH="$FIXTURE_PATH" GENOVA_033_ENV_PATH="$ENV_PATH" \
  GENOVA_033_PDF_PATH="$REPO_ROOT/apps/mobile/src/repertoire/__fixtures__/score_40p.pdf" \
    pnpm exec tsx supabase/test-support/033_composed_runtime_fixtures.ts "$1"
}

if [ "$ACTION" = 'prepare' ]; then
  [ ! -e "$FIXTURE_PATH" ] || refuse '033 fixture already exists'
  [ ! -e "$ENV_PATH" ] || refuse '033 env already exists'
  [ ! -e "$SOURCE_BASELINE_PATH" ] || refuse '033 source baseline already exists'
  source_snapshot >"$SOURCE_BASELINE_PATH"
  SCHEMA_DUMP="$TEMP_DIR/source-schema.sql"
  PGHOST="$SOURCE_HOST" PGPORT="$SOURCE_PORT" PGDATABASE="$SOURCE_DATABASE" \
    "$PG_DUMP_COMMAND" --schema-only --no-owner --no-privileges \
      --schema=public --schema=genova_003 --schema=genova_005 --schema=genova_007 --schema=genova_008 >"$SCHEMA_DUMP"
  [ -s "$SCHEMA_DUMP" ] || refuse 'source schema dump is empty'
  target_psql 'drop schema if exists genova_008 cascade; drop schema if exists genova_007 cascade; drop schema if exists genova_005 cascade; drop schema if exists genova_003 cascade; drop schema if exists public cascade;'
  "$PSQL_COMMAND" "$DB_URL" -X -v ON_ERROR_STOP=1 -q -f "$SCHEMA_DUMP"
  target_psql "grant usage on schema public to anon,authenticated,service_role;
    grant select on all tables in schema public to authenticated;
    grant all privileges on all tables in schema public to service_role;
    grant all privileges on all sequences in schema public to service_role;
    grant execute on all functions in schema public to authenticated,service_role;
    do \$\$ declare t text; begin foreach t in array array['announcements','choir_members','choir_member_roles','rehearsals','rehearsal_invitees','attendance','profile_change_requests','assignments','assignment_targets','assignment_submissions'] loop
      begin execute format('alter publication supabase_realtime add table public.%I',t); exception when duplicate_object then null; end;
    end loop; end \$\$; notify pgrst,'reload schema';"
  mkdir -p "$RUNTIME_DIR/supabase/functions/repertoire-file" "$RUNTIME_DIR/supabase/functions/choir-invitations" "$RUNTIME_DIR/supabase/functions/create-choir" "$RUNTIME_DIR/supabase/functions/_shared"
  rsync -a supabase/functions/repertoire-file/index.ts supabase/functions/repertoire-file/handler.ts supabase/functions/repertoire-file/ticket.ts supabase/functions/repertoire-file/storage.ts "$RUNTIME_DIR/supabase/functions/repertoire-file/"
  rsync -a supabase/functions/choir-invitations/index.ts supabase/functions/choir-invitations/handler.ts "$RUNTIME_DIR/supabase/functions/choir-invitations/"
  rsync -a supabase/functions/create-choir/create-choir-core.ts "$RUNTIME_DIR/supabase/functions/create-choir/"
  rsync -a lib/server/drive-file-content.ts "$RUNTIME_DIR/supabase/functions/_shared/"
  GENOVA_033_FUNCTION_DIR="$RUNTIME_DIR/supabase/functions/repertoire-file" node <<'NODE'
const fs = require('node:fs');
const before = '../../../lib/server/drive-file-content.ts';
const after = '../_shared/drive-file-content.ts';
for (const name of ['handler.ts', 'storage.ts']) {
  const path = `${process.env.GENOVA_033_FUNCTION_DIR}/${name}`;
  const source = fs.readFileSync(path, 'utf8');
  if (source.split(before).length !== 2) throw new Error(`expected one ${name} shared import`);
  fs.writeFileSync(path, source.replace(before, after));
}
NODE
  GENOVA_033_INVITATION_INDEX="$RUNTIME_DIR/supabase/functions/choir-invitations/index.ts" node <<'NODE'
const fs = require('node:fs');
const path = process.env.GENOVA_033_INVITATION_INDEX;
const source = fs.readFileSync(path, 'utf8');
const before = `Deno.serve(createInvitationHandler((authorization) => {\n`;
const after = `const handleInvitation = createInvitationHandler((authorization) => {\n`;
if (source.split(before).length !== 2) throw new Error('expected one invitation serve declaration');
const withHandler = source.replace(before, after).replace(/\n\}\)\);\s*$/, `\n});\n\nlet forcedUnauthorizedRemaining = 0; // GENOVA_033_FORCED_401\n\nDeno.serve((request) => {\n  if (forcedUnauthorizedRemaining > 0 && request.method === 'POST' && /^Bearer\\s+.+/i.test(request.headers.get('Authorization') ?? '')) {\n    forcedUnauthorizedRemaining -= 1;\n    return new Response(JSON.stringify({ error: '033 forced local unauthorized' }), {\n      status: 401,\n      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },\n    });\n  }\n  return handleInvitation(request);\n});\n`);
fs.writeFileSync(path, withHandler);
NODE
  docker --context "$DOCKER_CONTEXT_INPUT" restart "supabase_edge_runtime_${PROJECT_ID}" >/dev/null
  for _attempt in $(seq 1 30); do
    if curl -fsS -o /dev/null -X OPTIONS "http://127.0.0.1:54321/functions/v1/choir-invitations"; then break; fi
    sleep 1
  done
  if ! fixture_action prepare; then
    [ "$(source_snapshot)" = "$(cat "$SOURCE_BASELINE_PATH")" ] || refuse 'source database changed during failed prepare'
    find "$SOURCE_BASELINE_PATH" -type f -delete
    exit 1
  fi
  fixture_action status
  [ "$(source_snapshot)" = "$(cat "$SOURCE_BASELINE_PATH")" ] || refuse 'source database changed during prepare'
  exit 0
fi

if [ "$ACTION" = 'status' ]; then
  fixture_action status
  [ "$(source_snapshot)" = "$(cat "$SOURCE_BASELINE_PATH")" ] || refuse 'source database changed'
  exit 0
fi

if [ "$ACTION" = 'refresh-ticket' ]; then fixture_action refresh-ticket; exit 0; fi
if [ "$ACTION" = 'expire-ticket' ]; then fixture_action expire-ticket; exit 0; fi
if [ "$ACTION" = 'revoke-admin-refresh' ]; then
  FIXTURE_USER_ID="$(GENOVA_033_FIXTURE_PATH="$FIXTURE_PATH" node <<'NODE'
const fixture = JSON.parse(require('node:fs').readFileSync(process.env.GENOVA_033_FIXTURE_PATH, 'utf8'));
if (!/^[0-9a-f-]{36}$/i.test(fixture.adminUserId ?? '')) process.exit(1);
process.stdout.write(fixture.adminUserId);
NODE
)" || refuse 'could not resolve owned admin user'
  [ -n "$FIXTURE_USER_ID" ] || refuse 'owned admin user is empty'
  target_psql "delete from auth.sessions where user_id = '$FIXTURE_USER_ID'::uuid;"
  echo 'PASS admin_refresh revoked=owned-local-session'
  exit 0
fi
if [ "$ACTION" = 'arm-single-401' ] || [ "$ACTION" = 'arm-double-401' ] || [ "$ACTION" = 'disarm-401' ]; then
  INVITATION_INDEX="$RUNTIME_DIR/supabase/functions/choir-invitations/index.ts"
  case "$ACTION" in
    arm-single-401) FAULT_COUNT=1 ;;
    arm-double-401) FAULT_COUNT=2 ;;
    disarm-401) FAULT_COUNT=0 ;;
  esac
  GENOVA_033_INVITATION_INDEX="$INVITATION_INDEX" GENOVA_033_FAULT_COUNT="$FAULT_COUNT" node <<'NODE'
const fs = require('node:fs');
const path = process.env.GENOVA_033_INVITATION_INDEX;
const nextCount = process.env.GENOVA_033_FAULT_COUNT;
const source = fs.readFileSync(path, 'utf8');
const pattern = /let forcedUnauthorizedRemaining = [012]; \/\/ GENOVA_033_(?:SINGLE_401|FORCED_401)/;
if (!pattern.test(source)) throw new Error('033 forced 401 seam missing');
fs.writeFileSync(path, source.replace(pattern, `let forcedUnauthorizedRemaining = ${nextCount}; // GENOVA_033_FORCED_401`));
NODE
  docker --context "$DOCKER_CONTEXT_INPUT" restart "supabase_edge_runtime_${PROJECT_ID}" >/dev/null
  for _attempt in $(seq 1 30); do
    if curl -fsS -o /dev/null -X OPTIONS "http://127.0.0.1:54321/functions/v1/choir-invitations"; then
      echo "PASS invitation_401_fault action=$ACTION"
      exit 0
    fi
    sleep 1
  done
  refuse 'Edge runtime did not recover after 401 fault action'
fi

if [ "$ACTION" = 'cleanup' ]; then
  fixture_action cleanup
  [ "$(source_snapshot)" = "$(cat "$SOURCE_BASELINE_PATH")" ] || refuse 'source database changed before cleanup'
  find "$SOURCE_BASELINE_PATH" -delete
fi

if [ "$ACTION" = 'cleanup' ] || [ "$ACTION" = 'stop' ]; then
  DOCKER_CONTEXT="$DOCKER_CONTEXT_INPUT" supabase stop --workdir "$RUNTIME_DIR" --no-backup
  find "$RUNTIME_DIR" -depth -delete
  [ ! -e "$RUNTIME_DIR" ] || refuse 'runtime directory cleanup failed'
  echo 'PASS runtime_cleanup stack=stopped path=removed'
fi
