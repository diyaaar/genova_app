#!/usr/bin/env bash
# 046 regression guard — LOCAL ISOLATED POSTGRESQL 17 DATABASES ONLY.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"; cd "$REPO_ROOT"
TARGET_DB="${PGDATABASE:-genova_046_test_restore}"; SOURCE_DB="${GENOVA_046_SOURCE_DATABASE:-genova_008_test_restore}"
PG_HOST="${PGHOST:-127.0.0.1}"; PG_PORT="${PGPORT:-5432}"
PSQL_BIN="${PSQL_BIN:-/opt/homebrew/opt/postgresql@17/bin/psql}"; CREATEDB_BIN="${CREATEDB_BIN:-/opt/homebrew/opt/postgresql@17/bin/createdb}"; DROPDB_BIN="${DROPDB_BIN:-/opt/homebrew/opt/postgresql@17/bin/dropdb}"
PREREQUISITES=(
  supabase/migrations/20260919190000_chat_room_membership_authority_041.sql
  supabase/migrations/20260919193000_chat_social_membership_authority_042.sql
  supabase/migrations/20260919194500_chat_message_status_authority_043.sql
  supabase/migrations/20260919201500_chat_core_message_authority_044.sql
  supabase/migrations/20260919213000_chat_text_send_idempotency_045.sql
)
MIGRATION=supabase/migrations/20260919221500_private_chat_realtime_046.sql
DOWN=supabase/rollback/046_private_chat_realtime_down.sql
TEST_FILE=supabase/tests/046_private_chat_realtime.sql
refuse(){ echo "REFUSED: $*" >&2; exit 2; }
[[ "$TARGET_DB" =~ ^genova_046_test[A-Za-z0-9_]*$ ]] || refuse "unsafe target '$TARGET_DB'"
[[ "$SOURCE_DB" =~ ^(genova_008_test|genova_046_source_test)[A-Za-z0-9_]*$ ]] || refuse "unsafe source '$SOURCE_DB'"
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
 (select count(*)||':'||md5(coalesce(jsonb_agg(to_jsonb(r)-'client_mutation_id' order by id)::text,'[]')) from public.chat_messages r));"; }
policy_snapshot(){ psql_q "$1" "select md5(coalesce(string_agg(to_jsonb(p)::text,E'\\n' order by policyname),'')) from (select policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname='realtime' and tablename='messages') p;"; }
publication_snapshot(){ psql_q "$1" "select md5(coalesce(string_agg(schemaname||'.'||tablename,E'\\n' order by schemaname,tablename),'')) from pg_publication_tables where pubname='supabase_realtime';"; }
target_created=false
cleanup(){ if [ "$target_created" = true ] && database_exists "$TARGET_DB"; then "$DROPDB_BIN" --force "$TARGET_DB" >/dev/null 2>&1 || true; fi; }
trap cleanup EXIT; trap 'exit 130' INT; trap 'exit 143' TERM
database_exists "$SOURCE_DB" || refuse "source '$SOURCE_DB' missing"; database_exists "$TARGET_DB" && refuse 'target exists'
[ "$(psql_q "$SOURCE_DB" "select current_setting('server_version_num') like '17%';")" = t ] || refuse 'PostgreSQL 17 required'
[ "$(psql_q "$SOURCE_DB" "select to_regnamespace('realtime') is null and not exists(select 1 from pg_publication) and to_regnamespace('genova_046') is null;")" = t ] || refuse 'source is not the expected non-Realtime baseline'
source_data="$(stable_snapshot "$SOURCE_DB")"; "$CREATEDB_BIN" -T "$SOURCE_DB" "$TARGET_DB"; target_created=true
[ "$(stable_snapshot "$TARGET_DB")" = "$source_data" ] || refuse 'clone mismatch'
for prerequisite in "${PREREQUISITES[@]}"; do psql_db "$TARGET_DB" -q -f "$prerequisite" >/dev/null; done
if psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null 2>&1; then
  echo 'FAIL: migration accepted a database without Supabase Realtime prerequisites' >&2
  exit 1
fi
[ "$(psql_q "$TARGET_DB" "select to_regnamespace('genova_046') is null;")" = t ] || { echo 'FAIL: refused preflight left 046 state' >&2; exit 1; }
echo 'PASS migration refused the non-Realtime source contract before changes'
psql_db "$TARGET_DB" -q -c "create schema realtime; create table realtime.messages(id uuid primary key default gen_random_uuid(), topic text, extension text not null); alter table realtime.messages enable row level security; create function realtime.topic() returns text language sql stable as 'select current_setting(''realtime.topic'',true)'; grant usage on schema realtime to anon,authenticated; grant select,insert on realtime.messages to anon,authenticated; create publication supabase_realtime for table public.chat_messages;" >/dev/null
post_fixture_data="$(stable_snapshot "$TARGET_DB")"; prior_policy="$(policy_snapshot "$TARGET_DB")"; prior_publication="$(publication_snapshot "$TARGET_DB")"
echo "database: $TARGET_DB cloned from $SOURCE_DB @ $PG_HOST:$PG_PORT (PostgreSQL 17; 041-045 + minimal Realtime contract fixture)"; echo "started: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null; psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(stable_snapshot "$TARGET_DB")" = "$post_fixture_data" ] || { echo 'FAIL: forward changed product fixtures' >&2; exit 1; }
echo 'PASS forward migration and room/topic/member/refusal/publication matrix'
psql_db "$TARGET_DB" -q -f "$DOWN" >/dev/null
[ "$(policy_snapshot "$TARGET_DB")" = "$prior_policy" ] || { echo 'FAIL: down policy mismatch' >&2; exit 1; }
[ "$(publication_snapshot "$TARGET_DB")" = "$prior_publication" ] || { echo 'FAIL: down publication mismatch' >&2; exit 1; }
[ "$(psql_q "$TARGET_DB" "select to_regnamespace('genova_046') is null;")" = t ] || { echo 'FAIL: down helper schema remains' >&2; exit 1; }
[ "$(stable_snapshot "$TARGET_DB")" = "$post_fixture_data" ] || { echo 'FAIL: down changed product fixtures' >&2; exit 1; }
echo 'PASS down restored exact pre-046 policy/publication/API/data state'
psql_db "$TARGET_DB" -q -f "$MIGRATION" >/dev/null; psql_db "$TARGET_DB" -q -f "$TEST_FILE" >/dev/null
[ "$(stable_snapshot "$SOURCE_DB")" = "$source_data" ] || { echo 'FAIL: source data changed' >&2; exit 1; }
echo 'PASS restored-forward state; source baseline unchanged'
cleanup; target_created=false; database_exists "$TARGET_DB" && { echo 'FAIL: target remains' >&2; exit 1; }
echo 'PASS disposable target database removed'; echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
