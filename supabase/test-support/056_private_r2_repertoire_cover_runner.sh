#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$REPO_ROOT"
SOURCE_DB="${GENOVA_056_SOURCE_DATABASE:-genova_008_test_restore}"
TARGET_DB="${PGDATABASE:-genova_056_test_runtime}"
PSQL="${PSQL_BIN:-/opt/homebrew/opt/libpq/bin/psql}"
DUMP="${PG_DUMP_BIN:-/opt/homebrew/opt/libpq/bin/pg_dump}"
CREATE="${CREATEDB_BIN:-/opt/homebrew/opt/libpq/bin/createdb}"
DROP="${DROPDB_BIN:-/opt/homebrew/opt/libpq/bin/dropdb}"
refuse(){ echo "REFUSED: $*" >&2;exit 2; }
[[ "$SOURCE_DB" =~ ^genova_[A-Za-z0-9_]*test[A-Za-z0-9_]*$ ]] || refuse unsafe-source
[[ "$TARGET_DB" =~ ^genova_056_test[A-Za-z0-9_]*$ ]] || refuse unsafe-target
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
for migration in 20260920205054_private_r2_repertoire_read_053 20260921185113_private_r2_repertoire_upload_054 20260922071942_private_r2_repertoire_lifecycle_055;do
  PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f "supabase/migrations/$migration.sql" >/dev/null
done
baseline="$(hash_schema "$TARGET_DB")"
echo "started: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/20260922171847_private_r2_repertoire_cover_056.sql >/dev/null
PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/tests/056_private_r2_repertoire_cover.sql >/dev/null
echo 'PASS cover privilege, metadata, reserve/commit/replay and active mapping matrix'
PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/rollback/056_private_r2_repertoire_cover_down.sql >/dev/null
[ "$(hash_schema "$TARGET_DB")" = "$baseline" ] || refuse down-schema-mismatch
echo 'PASS exact down restored 055 schema'
PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/migrations/20260922171847_private_r2_repertoire_cover_056.sql >/dev/null
PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -v setup_only=true -f supabase/tests/056_private_r2_repertoire_cover.sql >/dev/null
PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -c "set role service_role;select public.repertoire_cover_upload_056('reserve','10000000-0000-4000-8000-000000000056',null,'20000000-0000-4000-8000-000000000056',gen_random_uuid(),jsonb_build_object('songId','50000000-0000-4000-8000-000000000056','fileName','cover.png','fileType','other','mimeType','image/png','size',69,'partitionLabel','__cover__'),'genova-private');" >/dev/null
if PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f supabase/rollback/056_private_r2_repertoire_cover_down.sql >/dev/null 2>&1;then refuse down-accepted-cover-record;fi
echo 'PASS down refuses cover upload/object reconciliation state'
[ "$(hash_schema "$SOURCE_DB")" = "$source_hash" ] || refuse source-changed
cleanup;created=false
exists "$TARGET_DB" && refuse target-remains
echo 'PASS source unchanged and disposable database removed'
echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
