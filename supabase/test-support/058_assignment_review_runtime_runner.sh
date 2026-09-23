#!/usr/bin/env bash
# 058 actual local Deno.serve + signed loopback R2 review upload/read. No hosted resources.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$REPO_ROOT"
refuse(){ echo "REFUSED: $*" >&2;exit 2; }
for command_name in deno node pnpm lsof;do command -v "$command_name" >/dev/null||refuse "missing command: $command_name";done
for port in 8000 18058;do if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1;then refuse "loopback port $port is already in use";fi;done
available_before="$(df -k .|awk 'NR==2 {print $4}')";[ "$available_before" -ge 10485760 ]||refuse 'less than 10 GiB available'
echo "started: $(date -u '+%Y-%m-%dT%H:%M:%SZ') free_kib=$available_before"
pnpm exec tsx supabase/test-support/058_assignment_review_runtime_acceptance.ts
for port in 8000 18058;do if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1;then refuse "owned listener remains on $port";fi;done
available_after="$(df -k .|awk 'NR==2 {print $4}')";[ "$available_after" -ge 10485760 ]||refuse 'runtime cleanup left less than 10 GiB available'
echo "PASS actual Deno review upload/read services and signed loopback provider stopped free_kib=$available_after"
echo "finished: $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
