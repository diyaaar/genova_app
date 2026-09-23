#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
cd "$REPO_ROOT"
for port in 8000 18059; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "REFUSED: port-$port-in-use" >&2
    exit 2
  fi
done
pnpm exec tsx supabase/test-support/059_repertoire_comment_runtime_acceptance.ts
for port in 8000 18059; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "REFUSED: port-$port-left-open" >&2
    exit 2
  fi
done
