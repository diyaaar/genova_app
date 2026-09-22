#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"; cd "$REPO_ROOT"
refuse(){ echo "REFUSED: $*" >&2; exit 2; }
for command_name in deno node pnpm lsof; do command -v "$command_name" >/dev/null || refuse "missing command: $command_name"; done
for port in 8000 18055; do lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && refuse "loopback port $port is already in use"; done
available_before="$(df -k . | awk 'NR==2 {print $4}')"; [ "$available_before" -ge 10485760 ] || refuse 'less than 10 GiB available'
echo "started: $(date -u '+%Y-%m-%dT%H:%M:%SZ') free_kib=$available_before"
pnpm exec tsx supabase/test-support/055_repertoire_lifecycle_runtime_acceptance.ts
for port in 8000 18055; do lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && refuse "owned listener remains on $port"; done
available_after="$(df -k . | awk 'NR==2 {print $4}')"; [ "$available_after" -ge 10485760 ] || refuse 'runtime cleanup left less than 10 GiB available'
echo "PASS actual Deno lifecycle and signed loopback provider stopped free_kib=$available_after"
echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
