#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$REPO_ROOT"

SOURCE_DB="${GENOVA_061_SOURCE_DATABASE:-genova_008_test_restore}"
TARGET_DB="${PGDATABASE:-genova_061_test_release_chain}"
PSQL="${PSQL_BIN:-/opt/homebrew/opt/libpq/bin/psql}"
DUMP="${PG_DUMP_BIN:-/opt/homebrew/opt/libpq/bin/pg_dump}"
CREATE="${CREATEDB_BIN:-/opt/homebrew/opt/libpq/bin/createdb}"
DROP="${DROPDB_BIN:-/opt/homebrew/opt/libpq/bin/dropdb}"

refuse() { echo "REFUSED: $*" >&2; exit 2; }
[[ "$SOURCE_DB" =~ ^genova_[A-Za-z0-9_]*test[A-Za-z0-9_]*$ ]] || refuse unsafe-source
[[ "$TARGET_DB" =~ ^genova_061_test[A-Za-z0-9_]*$ ]] || refuse unsafe-target
export PGHOST=127.0.0.1 PGPORT="${PGPORT:-5432}"
q() { PGDATABASE="$1" "$PSQL" -X -Atq -v ON_ERROR_STOP=1 -c "$2"; }
exists() { [ "$(q postgres "select exists(select 1 from pg_database where datname='$1')")" = t ]; }
hash_schema() {
  PGDATABASE="$1" "$DUMP" --schema-only --no-owner --no-privileges |
    sed -E '/^\\(un)?restrict /d' | shasum -a 256 | awk '{print $1}'
}

created=false
cleanup() {
  if [ "$created" = true ] && exists "$TARGET_DB"; then
    "$DROP" --force "$TARGET_DB" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

exists "$SOURCE_DB" || refuse missing-source
exists "$TARGET_DB" && refuse target-exists
source_hash="$(hash_schema "$SOURCE_DB")"
"$CREATE" -T "$SOURCE_DB" "$TARGET_DB"
created=true
q postgres "alter database \"$TARGET_DB\" owner to postgres"
q "$TARGET_DB" 'grant usage on schema extensions to postgres'

prerequisites=(
  20260516_assignment_review_audio.sql
  20260919190000_chat_room_membership_authority_041.sql
  20260919193000_chat_social_membership_authority_042.sql
  20260919194500_chat_message_status_authority_043.sql
  20260919201500_chat_core_message_authority_044.sql
  20260919213000_chat_text_send_idempotency_045.sql
)
for migration in "${prerequisites[@]}"; do
  PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 \
    -f "supabase/migrations/$migration" >/dev/null
done
baseline="$(hash_schema "$TARGET_DB")"

forward=(
  20260920205054_private_r2_repertoire_read_053.sql
  20260921185113_private_r2_repertoire_upload_054.sql
  20260922071942_private_r2_repertoire_lifecycle_055.sql
  20260922171847_private_r2_repertoire_cover_056.sql
  20260922221500_private_r2_assignment_versions_057.sql
  20260923103000_private_r2_assignment_review_audio_058.sql
  20260923170000_private_r2_repertoire_comment_audio_059.sql
  20260923193000_private_r2_chat_media_060.sql
)
reverse=(
  060_private_r2_chat_media_down.sql
  059_private_r2_repertoire_comment_audio_down.sql
  058_private_r2_assignment_review_audio_down.sql
  057_private_r2_assignment_versions_down.sql
  056_private_r2_repertoire_cover_down.sql
  055_private_r2_repertoire_lifecycle_down.sql
  054_private_r2_repertoire_upload_down.sql
  053_private_r2_repertoire_read_down.sql
)

echo "started: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
for migration in "${forward[@]}"; do
  PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 \
    -f "supabase/migrations/$migration" >/dev/null
done

expected="genova_053 genova_054 genova_055 genova_057 genova_058 genova_059 genova_060"
actual="$(q "$TARGET_DB" "select string_agg(nspname,' ' order by nspname) from pg_namespace where nspname ~ '^genova_05[3-9]$|^genova_060$'")"
[ "$actual" = "$expected" ] || refuse "schema-chain=$actual"
invalid="$(q "$TARGET_DB" "with findings as(
 select 'invalid-index' from pg_index where not indisvalid
 union all select 'unvalidated-constraint' from pg_constraint where not convalidated
 union all select 'client-operational-schema-grant' from information_schema.role_table_grants
   where table_schema in('genova_053','genova_054','genova_055','genova_057','genova_058','genova_059','genova_060')
     and grantee in('anon','authenticated','service_role')
)select count(*) from findings")"
[ "$invalid" = 0 ] || refuse "catalog-findings=$invalid"
echo 'PASS 053-060 forward chain and catalogue guards'

q "$TARGET_DB" "insert into public.choirs(id,slug,name) values
 ('10000000-0000-4000-8000-000000000061','061-chain','061 Chain');
 insert into public.repertoire(id,choir_id,title,is_visible) values
 ('20000000-0000-4000-8000-000000000061','10000000-0000-4000-8000-000000000061','061 Song',true);
 insert into public.repertoire_files(id,choir_id,song_id,file_name,file_type,drive_file_id,mime_type) values
 ('30000000-0000-4000-8000-000000000061','10000000-0000-4000-8000-000000000061',
  '20000000-0000-4000-8000-000000000061','score.pdf','sheet','legacy-061','application/pdf');
 insert into public.repertoire_file_storage_locations(repertoire_file_id,choir_id,provider,bucket,
  object_key,content_length,mime_type,sha256_hex,verified_at,is_active) values
 ('30000000-0000-4000-8000-000000000061','10000000-0000-4000-8000-000000000061','r2',
  'genova-private','choirs/10000000-0000-4000-8000-000000000061/repertoire/30000000-0000-4000-8000-000000000061/content',
  1,'application/pdf',repeat('a',64),clock_timestamp(),true)"
if PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 \
  -f supabase/rollback/053_private_r2_repertoire_read_down.sql >/dev/null 2>&1; then
  refuse down-accepted-active-provider-mapping
fi
q "$TARGET_DB" "delete from public.repertoire_file_storage_locations where repertoire_file_id='30000000-0000-4000-8000-000000000061';
 delete from public.repertoire_files where id='30000000-0000-4000-8000-000000000061';
 delete from public.repertoire where id='20000000-0000-4000-8000-000000000061';
 delete from public.repertoire_cache_versions where choir_id='10000000-0000-4000-8000-000000000061';
 delete from public.choirs where id='10000000-0000-4000-8000-000000000061'"
echo 'PASS 053 down refuses active provider mapping'

PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -c \
  "insert into genova_054.uploads(actor_id,retry_key,choir_id,member_id,song_id,metadata,bucket)
   values(gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),gen_random_uuid(),'{}','genova-private')" >/dev/null
if PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 \
  -f supabase/rollback/054_private_r2_repertoire_upload_down.sql >/dev/null 2>&1; then
  refuse down-accepted-unresolved-provider-state
fi
q "$TARGET_DB" 'delete from genova_054.uploads'
echo 'PASS down refuses unresolved provider state'

for rollback in "${reverse[@]}"; do
  PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 \
    -f "supabase/rollback/$rollback" >/dev/null
done
[ "$(hash_schema "$TARGET_DB")" = "$baseline" ] || refuse down-schema-mismatch
echo 'PASS reverse down chain restored the pre-053 schema'

[ "$(hash_schema "$SOURCE_DB")" = "$source_hash" ] || refuse source-changed
cleanup
created=false
exists "$TARGET_DB" && refuse target-remains
echo 'PASS source unchanged and disposable database removed'
echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
