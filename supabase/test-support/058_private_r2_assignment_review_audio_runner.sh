#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$REPO_ROOT"
SOURCE_DB="${GENOVA_058_SOURCE_DATABASE:-genova_008_test_restore}"
TARGET_DB="${PGDATABASE:-genova_058_test_runtime}"
PSQL="${PSQL_BIN:-/opt/homebrew/opt/libpq/bin/psql}"
DUMP="${PG_DUMP_BIN:-/opt/homebrew/opt/libpq/bin/pg_dump}"
CREATE="${CREATEDB_BIN:-/opt/homebrew/opt/libpq/bin/createdb}"
DROP="${DROPDB_BIN:-/opt/homebrew/opt/libpq/bin/dropdb}"
refuse(){ echo "REFUSED: $*" >&2;exit 2; }
[[ "$SOURCE_DB" =~ ^genova_[A-Za-z0-9_]*test[A-Za-z0-9_]*$ ]] || refuse unsafe-source
[[ "$TARGET_DB" =~ ^genova_058_test[A-Za-z0-9_]*$ ]] || refuse unsafe-target
export PGHOST=127.0.0.1 PGPORT="${PGPORT:-5432}"
q(){ PGDATABASE="$1" "$PSQL" -X -Atq -v ON_ERROR_STOP=1 -c "$2"; }
exists(){ [ "$(q postgres "select exists(select 1 from pg_database where datname='$1')")" = t ]; }
hash_schema(){ PGDATABASE="$1" "$DUMP" --schema-only --no-owner --no-privileges | sed -E '/^\\(un)?restrict /d' | shasum -a 256 | awk '{print $1}'; }
created=false
cleanup(){ if [ "$created" = true ] && exists "$TARGET_DB";then "$DROP" --force "$TARGET_DB" >/dev/null 2>&1 || true;fi; }
trap cleanup EXIT
exists "$SOURCE_DB" || refuse missing-source
exists "$TARGET_DB" && refuse target-exists
source_hash="$(hash_schema "$SOURCE_DB")"
"$CREATE" -T "$SOURCE_DB" "$TARGET_DB";created=true
q postgres "alter database \"$TARGET_DB\" owner to postgres"
PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/20260516_assignment_review_audio.sql >/dev/null
PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/20260922221500_private_r2_assignment_versions_057.sql >/dev/null
PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -v setup_only=true -f supabase/tests/057_private_r2_assignment_versions.sql >/dev/null
baseline="$(hash_schema "$TARGET_DB")"
echo "started: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/20260923103000_private_r2_assignment_review_audio_058.sql >/dev/null
PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/tests/058_private_r2_assignment_review_audio.sql >/dev/null
echo 'PASS review upload/replace, visibility, private history and owner/reviewer/tenant matrix'
advisor_errors="$(q "$TARGET_DB" "
with findings as (
 select 'invalid-index' finding from pg_index i join pg_class c on c.oid=i.indexrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','genova_058') and not i.indisvalid
 union all select 'unvalidated-constraint' from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname in ('public','genova_058') and not c.convalidated
 union all select 'unsafe-security-definer-search-path' from pg_proc p join pg_namespace n on n.oid=p.pronamespace where ((n.nspname='public' and p.proname in ('assignment_review_audio_upload_058','set_assignment_review_visibility_058','claim_assignment_review_notification_058')) or n.nspname='genova_058') and p.prosecdef and not exists(select 1 from unnest(coalesce(p.proconfig,'{}')) setting where setting like 'search_path=%')
 union all select 'rls-not-forced' from pg_class c join pg_namespace n on n.oid=c.relnamespace where (n.nspname,c.relname) in (('public','assignment_review_audio_versions'),('public','assignment_submission_private_history'),('genova_058','uploads'),('genova_058','notification_claims')) and (not c.relrowsecurity or not c.relforcerowsecurity)
 union all select 'client-private-schema-grant' from information_schema.role_table_grants where table_schema='genova_058' and grantee in ('anon','authenticated','service_role')
 union all select 'client-rpc-grant' from information_schema.routine_privileges where routine_schema='public' and routine_name in ('assignment_review_audio_upload_058','set_assignment_review_visibility_058','claim_assignment_review_notification_058') and grantee in ('anon','authenticated')
 union all select 'immutable-trigger-disabled' from pg_trigger t where t.tgname='assignment_review_audio_versions_immutable' and t.tgenabled<>'O'
)select count(*) from findings;")"
[ "$advisor_errors" = 0 ] || refuse "database-advisor-errors=$advisor_errors"
echo 'PASS local catalog advisors returned no error'
PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/rollback/058_private_r2_assignment_review_audio_down.sql >/dev/null
[ "$(hash_schema "$TARGET_DB")" = "$baseline" ] || refuse down-schema-mismatch
echo 'PASS exact down restored pre-058 schema'
PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/20260923103000_private_r2_assignment_review_audio_058.sql >/dev/null
PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -c "insert into public.assignment_submissions(id,choir_id,assignment_id,member_id,drive_file_id,file_name,mime_type,file_size_bytes,submitted_at,updated_at,status,reviewer_note_history,submission_note_history,is_reviewer_note_hidden) values('60000000-0000-4000-8000-000000000058','20000000-0000-4000-8000-000000000057','50000000-0000-4000-8000-000000000057','30000000-0000-4000-8000-000000000057','legacy-submission','take.wav','audio/wav',16,now(),now(),'pending','[]','[]',false);set role service_role;select public.assignment_review_audio_upload_058('reserve','10000000-0000-4000-8000-000000000059',null,'20000000-0000-4000-8000-000000000057',gen_random_uuid(),jsonb_build_object('submissionId','60000000-0000-4000-8000-000000000058','fileName','review.wav','mimeType','audio/wav','size',16,'status','approved','reviewerNote',null),'genova-private');" >/dev/null
if PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/rollback/058_private_r2_assignment_review_audio_down.sql >/dev/null 2>&1;then refuse down-accepted-upload-record;fi
echo 'PASS down refuses upload/object reconciliation state'
[ "$(hash_schema "$SOURCE_DB")" = "$source_hash" ] || refuse source-changed
cleanup;created=false
exists "$TARGET_DB" && refuse target-remains
echo 'PASS source unchanged and disposable database removed'
echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
