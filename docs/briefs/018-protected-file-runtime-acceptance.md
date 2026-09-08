# 018 — Protected-file service runtime acceptance in isolation

Prepared: 2026-09-08 under WF-006. Status: **NOT STARTED / all execution criteria NOT RUN**.
Single writer at execution: the receiving main agent, after revalidating checkout and authority.

## Outcome and delivery focus

Prove the actual `repertoire-file` service entrypoint can issue and consume a protected-file
ticket through HTTP against isolated Auth/RLS and synthetic provider bytes. This closes the
runtime gap left by 015's injected tests before the new native/web callers are integrated.
It does not repeat 015's local acceptance or claim provider/live/hardware acceptance.

## Sources and preparation evidence

Read [AGENTS](../../AGENTS.md), [handoff](../agent-handoff.md),
[guide](../gecis-rehberi.md), [work cycle](../ai-calisma-duzeni.md), the six memory indexes,
[MIGRATION](../../MIGRATION.md), [decisions](../../KARARLAR.md),
[delivery plan A1](../mobil-teslim-plani.md#a--turn-the-existing-read-implementation-into-runtime-evidence),
[015](015-shared-protected-repertoire-file.md), [016](016-native-pdf-readonly-annotations.md)
and [017](017-non-hardware-read-flow-acceptance.md).

Planning entry was `main / de7e55d` with an unrelated CLI-cache modification. This is not the
execution checkout check. 015's runtime is NOT RUN; its `index.ts` has `@ts-nocheck`, while its
handler/ticket tests run in the root test environment. Configuration delegates POST JWT and
GET/HEAD ticket checks to the handler (`verify_jwt = false`). Correct config alone is not runtime
or authorization proof. No environment command or product gate was run while preparing 018.

## Execution start check — fill before product changes

- [ ] Verify actual branch/HEAD, status and ownership; preserve unrelated CLI cache and any new work.
- [ ] Confirm active local implementation/test/commit authorization. No new external authority is
  supplied by this brief. Hardware and 010 fixture recreation remain excluded.
- [ ] Inspect actual Deno/Supabase runtime availability and versions; prove the chosen Auth/DB/
  provider targets are isolated/local and test-only without printing credentials or personal data.
- [ ] Name the one writer, exact permitted source/test/config paths and commands after inspection.
- [ ] Record the current source/import/runtime behavior, required gates and rollback strategy.
- [ ] Ensure fixture lifecycle is cleanup-safe and test commands cannot default to production URLs.

**First concrete action after the repository reading order:** inspect the entrypoint/config and
installed local runtime tools; record versions and whether an isolated Auth + PostgreSQL/RLS +
synthetic HTTP provider topology is available. Do not call the hosted project to fill this gap.
If provisioning is needed, plan the smallest local test environment; a missing tool remains an
unrun gate, not a reason to replace the runtime test with another injected-handler test.

## Allowed scope and preserved behavior

- `supabase/functions/repertoire-file/`: entrypoint/runtime corrections exposed by this acceptance;
  `supabase/config.toml` only where required and accompanied by auth regression tests.
- `supabase/test-support/` and `supabase/tests/`: local-only runner/fixtures and role matrix;
  existing fixture paths from 015 are preferred over a parallel test framework.
- `lib/repertuvar/protected-file-client.ts` and its tests only for an exposed contract defect.
- Root dependency/config changes only if strictly needed for this runtime gate, justified before
  editing; do not casually upgrade the web/mobile stack. Record the expanded scope in this brief.
- This brief and minimal evidence/status indexes; generated logs/builds remain ignored, sanitized
  evidence locations are recorded. Preserve shared provider/annotation identifiers and web callers.

POST must validate the actual user session, active choir and RLS-selected file; GET/HEAD must
validate the actual signed/expired/tampered ticket. Do not turn gateway JWT verification on as a
shortcut that breaks ticket-only reads, or off on unrelated functions. Preserve active-content
rejection, non-sensitive errors, CORS, private/no-store and `nosniff` headers.

## Implementation and verification sequence

1. Freeze the local test topology and source revision. Use synthetic users, two choirs, roles,
   assigned/hidden/unauthorized files and deterministic PDF bytes. Production credentials and
   existing real-account sessions are forbidden. Guard targets before any setup or mutation.
2. Load/serve the actual entrypoint with its real imports and runtime configuration. Run an
   appropriate runtime compile/import check; inherited `@ts-nocheck` is not type-validation proof.
   Resolve justified typing/import issues or explicitly record remaining unchecked boundaries.
3. Exercise local Auth + the real RPC/RLS file lookup and actual ticket cryptography over HTTP.
   Auth/RLS must not be replaced by an always-allow stub. Provider bytes may come from a controlled
   local server or local Storage; identify that substitution, keep production defaults intact.
4. Compare permitted GET bytes to the fixture hash; exercise HEAD, full/open/suffix ranges,
   invalid/unsatisfiable ranges, MIME denial and upstream failure. Observe large-response resource
   behavior because the current handler buffers the upstream; measure before proposing a rewrite.
5. Prove absent/invalid JWT, no active choir, wrong choir, unauthorized assignment, tampered/expired
   ticket and mismatched file ID cannot retrieve bytes. Verify web/native shared client contract.
6. Remove only task-owned synthetic fixtures; compare baseline state. On failure, preserve useful
   sanitized evidence and leave the failing row open. Do not copy secrets into logs or commits.
7. Run applicable root gates and focused tests, review diff, then commit code and evidence separately.

## Mandatory acceptance evidence

All rows below remain NOT RUN until execution. Required failures/unrun rows keep 018 open.

| Criterion / expected behavior | Required? | Status | Date / revision / environment / command | Evidence and limits |
|---|---|---|---|---|
| Actual runtime entrypoint/import/config loads and serves with checked boundaries documented | yes | NOT RUN | | 015's injected tests and Next build do not satisfy this |
| Actual isolated Auth/RPC/RLS authorizes allowed roles and rejects missing/no-selection/wrong-choir/unassigned cases | yes | NOT RUN | | Synthetic identities only; no always-allow authorize stub |
| HTTP POST issues a real ticket; HTTP GET returns matching synthetic PDF bytes/checksum | yes | NOT RUN | | Local provider only, not live Drive proof |
| Expired/tampered/mismatched ticket and invalid session fail without file bytes or secret leakage | yes | NOT RUN | | Include ticket-only GET/HEAD config boundary |
| HEAD/ranges/416/MIME/upstream failure and bounded test resource behavior are recorded | yes | NOT RUN | | No throughput or production-size claim without measurement |
| Shared client integration and applicable root `pnpm check` / focused runtime tests pass | yes | NOT RUN | | Mobile build N/A only if no native files/dependencies/config change |
| Target guards, fixture baseline/cleanup, scope, local links and diff checks pass | yes | NOT RUN | | Task-owned synthetic data only |
| Separate code/evidence commits and next-task handoff preserve 004/010 and historical acceptance | yes | NOT RUN | | No external or hardware action |

## Rollback, blockers and next task

Revert the owned code/config commit, then its evidence commit; remove only owned local fixtures
or disposable test environment. Never reset shared work or run a blanket migration against a
hosted project. An unexpected external target, unknown dirty ownership or need for real data stops
that action. Two failed approaches trigger diagnosis/replanning, not automatic acceptance.

After required acceptance, plan A2 from the canonical roadmap: native product PDF/Skia rendering
on current iOS/Android simulator/emulator builds using this verified local service. If 018 remains
blocked, A2 cannot claim this integration by substituting another fake. This brief's preparation
is not authority to start A2, a deployment, 010 cleanup, or postponed hardware testing.
