#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$REPO_ROOT"

SOURCE_DB="${GENOVA_063_SOURCE_DATABASE:-genova_008_test_restore}"
TARGET_DB="${PGDATABASE:-genova_063_test_inventory}"
PSQL="${PSQL_BIN:-/opt/homebrew/opt/libpq/bin/psql}"
DUMP="${PG_DUMP_BIN:-/opt/homebrew/opt/libpq/bin/pg_dump}"
CREATE="${CREATEDB_BIN:-/opt/homebrew/opt/libpq/bin/createdb}"
DROP="${DROPDB_BIN:-/opt/homebrew/opt/libpq/bin/dropdb}"

refuse(){ echo "REFUSED: $*" >&2; exit 2; }
[[ "$SOURCE_DB" =~ ^genova_[A-Za-z0-9_]*test[A-Za-z0-9_]*$ ]] || refuse unsafe-source
[[ "$TARGET_DB" =~ ^genova_063_test[A-Za-z0-9_]*$ ]] || refuse unsafe-target
export PGHOST=127.0.0.1 PGPORT="${PGPORT:-5432}"
q(){ PGDATABASE="$1" "$PSQL" -X -Atq -v ON_ERROR_STOP=1 -c "$2"; }
exists(){ [ "$(q postgres "select exists(select 1 from pg_database where datname='$1')")" = t ]; }
hash_schema(){
  PGDATABASE="$1" "$DUMP" --schema-only --no-owner --no-privileges |
    sed -E '/^\\(un)?restrict /d' | shasum -a 256 | awk '{print $1}'
}
apply(){
  PGOPTIONS='-c role=postgres' PGDATABASE="$TARGET_DB" "$PSQL" -X -q -v ON_ERROR_STOP=1 -f "$1" >/dev/null
}

created=false
cleanup(){
  if [ "$created" = true ] && exists "$TARGET_DB"; then "$DROP" --force "$TARGET_DB" >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

exists "$SOURCE_DB" || refuse missing-source
exists "$TARGET_DB" && refuse target-exists
[[ "20260923193000_private_r2_chat_media_060.sql" < "20260923194500_private_r2_copy_inventory_063.sql" ]] \
  || refuse migration-order
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
for migration in "${prerequisites[@]}"; do apply "supabase/migrations/$migration"; done

if apply supabase/migrations/20260923194500_private_r2_copy_inventory_063.sql 2>/dev/null; then
  refuse accepted-without-053-060
fi
echo 'PASS 063 refuses an incomplete private-storage baseline'

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
for migration in "${forward[@]}"; do apply "supabase/migrations/$migration"; done
baseline="$(hash_schema "$TARGET_DB")"

apply supabase/migrations/20260923194500_private_r2_copy_inventory_063.sql
apply supabase/tests/063_private_r2_copy_inventory.sql
echo 'PASS 063 six-family inventory, classification, order, identity and privilege matrix'

q "$TARGET_DB" "create view genova_063.down_guard_probe as
 select i.item_id from public.choirs c
 cross join lateral public.private_r2_copy_inventory_063(c.id,'genova-private') i"
if apply supabase/rollback/063_private_r2_copy_inventory_down.sql 2>/dev/null; then
  refuse down-accepted-unexpected-dependent
fi
q "$TARGET_DB" 'drop view genova_063.down_guard_probe'
echo 'PASS 063 down refuses an unexpected dependent object'

apply supabase/rollback/063_private_r2_copy_inventory_down.sql
[ "$(hash_schema "$TARGET_DB")" = "$baseline" ] || refuse down-schema-mismatch
echo 'PASS 063 exact down restored the accepted 060 schema'

apply supabase/migrations/20260923194500_private_r2_copy_inventory_063.sql
apply supabase/tests/063_private_r2_copy_inventory.sql
echo 'PASS 063 clean reapply and repeated acceptance'

[ "$(hash_schema "$SOURCE_DB")" = "$source_hash" ] || refuse source-changed
cleanup
created=false
exists "$TARGET_DB" && refuse target-remains
echo 'PASS source unchanged and disposable database removed'
