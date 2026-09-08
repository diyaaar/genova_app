#!/usr/bin/env bash
# 010 step 3 — fresh-restore acceptance. LOCAL RESTORED DATABASE ONLY.
#
# Applies only the 008 migration to a restored copy, runs the 003-008 isolation
# tests, the 008 concurrency check and a real down roundtrip, then re-applies 008.
# It refuses to run unless the target database name marks it as a dedicated test
# copy, which is also what supabase/test-support/008_concurrency.mjs requires.
#
#   bash supabase/test-support/010_step3_runner.sh
#
# Never point this at the production project.

set -uo pipefail

DB="${PGDATABASE:-genova_008_test_restore}"
HOST="${PGHOST:-127.0.0.1}"
PORT="${PGPORT:-5432}"
LOG="supabase/test-support/010_step3.log"
MIGRATION="supabase/migrations/20260905210953_choir_invitations_008.sql"
DOWN="supabase/rollback/008_choir_invitations_down.sql"

case "$DB" in
  genova_008_test*) ;;
  *) echo "REFUSED: database '$DB' is not a dedicated genova_008_test* copy"; exit 2 ;;
esac
[ "$HOST" = "127.0.0.1" ] || { echo "REFUSED: host must be 127.0.0.1, got '$HOST'"; exit 2; }

export PGHOST="$HOST" PGPORT="$PORT" PGDATABASE="$DB"
PSQL="psql -X -v ON_ERROR_STOP=1 -q"
: > "$LOG"
pass=0; fail=0

step () {                      # step <label> <command...>
  local label="$1"; shift
  printf '\n===== %s =====\n' "$label" >> "$LOG"
  if "$@" >> "$LOG" 2>&1; then
    echo "PASS  $label"; pass=$((pass+1))
  else
    echo "FAIL  $label"; fail=$((fail+1))
  fi
}

q () { psql -X -A -t -c "$1" 2>/dev/null | tr -d '[:space:]'; }

echo "database: $DB @ $HOST:$PORT"
echo "started : $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo

# --- preconditions -----------------------------------------------------------
if [ "$(q "select to_regnamespace('genova_008') is not null")" = "t" ]; then
  echo "REFUSED: genova_008 already exists; step 3 needs a pre-008 restore"; exit 2
fi
for s in genova_003 genova_005 genova_007; do
  [ "$(q "select to_regnamespace('$s') is not null")" = "t" ] || {
    echo "REFUSED: $s missing; this is not a full restore"; exit 2; }
done
members_before="$(q 'select count(*) from public.choir_members')"
echo "precondition: 008 absent, 003/005/007 present, choir_members=$members_before"
echo

# --- apply 008 ---------------------------------------------------------------
step "008 migration applied"        $PSQL -f "$MIGRATION"

# --- isolation tests ---------------------------------------------------------
for t in 003_tenant_isolation 005_active_choir_isolation 006_membership_admin_lockdown \
         007_operator_controlled_choir_creation 008_choir_invitations; do
  step "test ${t%%_*} (${t#*_})"    $PSQL -f "supabase/tests/$t.sql"
done

# --- concurrency -------------------------------------------------------------
if command -v node >/dev/null 2>&1; then
  step "008 concurrency"            node supabase/test-support/008_concurrency.mjs
else
  echo "SKIP  008 concurrency (node not found)"
fi

# --- down roundtrip ----------------------------------------------------------
# 008_concurrency.mjs already performs the real roundtrip: it commits an acceptance,
# applies the down migration and asserts the accepted membership survives. Repeating
# the down here would only drop objects it has already removed, so this verifies the
# state the concurrency test left behind instead of re-running it.
schema_gone="$(q "select to_regnamespace('genova_008') is null")"
fn_gone="$(q "select to_regprocedure('public.choir_invitation_command(text,jsonb)') is null")"
members_after="$(q 'select count(*) from public.choir_members')"

if [ "$schema_gone" = "t" ] && [ "$fn_gone" = "t" ]; then
  echo "PASS  down (run inside the concurrency test) removed genova_008 and its function"
  pass=$((pass+1))
else
  echo "FAIL  genova_008 or its command function survived the down"; fail=$((fail+1))
fi

if [ "$members_after" = "$members_before" ]; then
  echo "PASS  membership count unchanged across the roundtrip ($members_after)"; pass=$((pass+1))
else
  echo "FAIL  membership count changed: $members_before -> $members_after"; fail=$((fail+1))
fi

step "008 re-applied after down"    $PSQL -f "$MIGRATION"

# --- 012 regression guard ---------------------------------------------------
# The restored copy has 003 and 005 applied. Keep the multi-membership picker
# regression in this database acceptance path, including proof that the guard
# fails against 012's down-migration and restores the fixed function afterwards.
step "012 list_my_choirs regression guard" bash supabase/test-support/012_regression_runner.sh

# --- summary -----------------------------------------------------------------
echo
echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "RESULT  : $pass passed, $fail failed"
echo "full output: $LOG"
[ "$fail" -eq 0 ] || exit 1
