#!/usr/bin/env bash
# 044 regression guard — LOCAL ISOLATED POSTGRESQL 17 DATABASES ONLY.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"; cd "$REPO_ROOT"
TARGET_DB="${PGDATABASE:-genova_044_test_restore}"; SOURCE_DB="${GENOVA_044_SOURCE_DATABASE:-genova_008_test_restore}"
PG_HOST="${PGHOST:-127.0.0.1}"; PG_PORT="${PGPORT:-5432}"
PSQL_BIN="${PSQL_BIN:-/opt/homebrew/opt/postgresql@17/bin/psql}"; CREATEDB_BIN="${CREATEDB_BIN:-/opt/homebrew/opt/postgresql@17/bin/createdb}"; DROPDB_BIN="${DROPDB_BIN:-/opt/homebrew/opt/postgresql@17/bin/dropdb}"
PREREQUISITES=(
  supabase/migrations/20260919190000_chat_room_membership_authority_041.sql
  supabase/migrations/20260919193000_chat_social_membership_authority_042.sql
  supabase/migrations/20260919194500_chat_message_status_authority_043.sql
)
MIGRATION=supabase/migrations/20260919201500_chat_core_message_authority_044.sql
DOWN=supabase/rollback/044_chat_core_message_authority_down.sql
TEST_FILE=supabase/tests/044_chat_core_message_authority.sql
refuse(){ echo "REFUSED: $*" >&2; exit 2; }
[[ "$TARGET_DB" =~ ^genova_044_test[A-Za-z0-9_]*$ ]] || refuse "unsafe target '$TARGET_DB'"
[[ "$SOURCE_DB" =~ ^(genova_008_test|genova_044_source_test)[A-Za-z0-9_]*$ ]] || refuse "unsafe source '$SOURCE_DB'"
[ "$TARGET_DB" != "$SOURCE_DB" ] || refuse 'source and target must differ'; [ "$PG_HOST" = 127.0.0.1 ] || refuse 'loopback only'
for item in "$PSQL_BIN" "$CREATEDB_BIN" "$DROPDB_BIN"; do [ -x "$item" ] || refuse "missing tool: $item"; done
for item in "${PREREQUISITES[@]}" "$MIGRATION" "$DOWN" "$TEST_FILE"; do [ -f "$item" ] || refuse "missing source: $item"; done
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
policy_snapshot(){ psql_q "$1" "select md5(coalesce(string_agg(to_jsonb(p)::text,E'\\n' order by policyname),'')) from (select policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname='public' and tablename='chat_messages') p;"; }
api_snapshot(){ psql_q "$1" "select concat_ws('|',coalesce(md5(pg_get_functiondef(to_regprocedure('public.edit_chat_message(uuid,text)'))),'absent'),coalesce(md5(pg_get_functiondef(to_regprocedure('public.delete_chat_message_for_everyone(uuid)'))),'absent'),coalesce(md5(pg_get_functiondef(to_regprocedure('public.hide_chat_message_for_self(uuid)'))),'absent'),to_regclass('public.chat_message_hidden_members')::text);"; }
target_created=false
cleanup(){ if [ "$target_created" = true ] && database_exists "$TARGET_DB"; then "$DROPDB_BIN" --force "$TARGET_DB" >/dev/null 2>&1 || true; fi; }
trap cleanup EXIT; trap 'exit 130' INT; trap 'exit 143' TERM
database_exists "$SOURCE_DB" || refuse "source '$SOURCE_DB' missing"; database_exists "$TARGET_DB" && refuse "target exists"
[ "$(psql_q "$SOURCE_DB" "select current_setting('server_version_num') like '17%';")" = t ] || refuse 'PostgreSQL 17 required'
[ "$(psql_q "$SOURCE_DB" "select to_regnamespace('genova_041') is null and to_regnamespace('genova_042') is null and to_regnamespace('genova_043') is null and to_regnamespace('genova_044') is null;")" = t ] || refuse 'source already migrated'
source_data="$(stable_snapshot "$SOURCE_DB")"; source_policy="$(policy_snapshot "$SOURCE_DB")"; source_api="$(api_snapshot "$SOURCE_DB")"
"$CREATEDB_BIN" -T "$SOURCE_DB" "$TARGET_DB"; target_created=true; [ "$(stable_snapshot "$TARGET_DB")" = "$source_data" ] || refuse 'clone mismatch'
for prerequisite in "${PREREQUISITES[@]}"; do psql_db "$TARGET_DB" -q -f "$prerequisite" >/dev/null; done
post_043_policy="$(policy_snapshot "$TARGET_DB")"; post_043_api="$(api_snapshot "$TARGET_DB")"
echo "database: $TARGET_DB cloned from $SOURCE_DB @ $PG_HOST:$PG_PORT (PostgreSQL 17; 041-043 applied)"; echo "started: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null; psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(stable_snapshot "$TARGET_DB")" = "$source_data" ] || { echo 'FAIL: forward changed fixtures' >&2; exit 1; }
[ "$(psql_q "$TARGET_DB" "select to_regnamespace('genova_044') is not null and to_regclass('public.chat_message_hidden_members') is not null;")" = t ] || { echo 'FAIL: forward objects missing' >&2; exit 1; }
echo 'PASS forward migration and message mutation/hide/send/refusal matrix'
psql_db "$TARGET_DB" -q -f "$DOWN" >/dev/null
[ "$(policy_snapshot "$TARGET_DB")" = "$post_043_policy" ] || { echo 'FAIL: down policy mismatch' >&2; exit 1; }
[ "$(api_snapshot "$TARGET_DB")" = "$post_043_api" ] || { echo 'FAIL: down API/schema mismatch' >&2; exit 1; }
[ "$(stable_snapshot "$TARGET_DB")" = "$source_data" ] || { echo 'FAIL: down changed fixtures' >&2; exit 1; }
echo 'PASS down restored exact post-043 message policy/API/schema/data state'
psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null; psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(stable_snapshot "$TARGET_DB")" = "$source_data" ] || { echo 'FAIL: re-forward changed fixtures' >&2; exit 1; }
[ "$(stable_snapshot "$SOURCE_DB")" = "$source_data" ] || { echo 'FAIL: source data changed' >&2; exit 1; }
[ "$(policy_snapshot "$SOURCE_DB")" = "$source_policy" ] || { echo 'FAIL: source policy changed' >&2; exit 1; }
[ "$(api_snapshot "$SOURCE_DB")" = "$source_api" ] || { echo 'FAIL: source API changed' >&2; exit 1; }
echo 'PASS restored-forward state; source and target baselines unchanged'
cleanup; target_created=false; database_exists "$TARGET_DB" && { echo 'FAIL: target remains' >&2; exit 1; }
echo 'PASS disposable target database removed'; echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
