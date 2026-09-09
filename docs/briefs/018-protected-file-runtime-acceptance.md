# 018 — Protected-file service runtime acceptance in isolation

Prepared: 2026-09-08 under WF-006. Executed: 2026-09-09. Status: **LOCAL ACCEPTANCE
COMPLETE** at code/test commit `0b3df6e`; this documentation-only commit is the evidence record.
Single writer: the main agent after revalidating checkout and authority.

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

- [x] **2026-09-08:** verified `main` at `57293ff77ada80804f39fa2bd4b247c66918446d`
  with recorded `origin/main` at `a13f696da8c731e9af2a2bce473d4f4ae4a81587` (18 commits
  ahead). The only pre-existing change is `supabase/.temp/cli-latest` (empty to `v2.116.0`);
  it remains unowned, unstaged and outside this brief. The receiving main agent is the one writer.
- [x] The owner's 2026-09-08 continuation explicitly authorizes the long-running local package
  loop, including implementation, local tests and required local commits. No new external authority is
  supplied by this brief. Hardware and 010 fixture recreation remain excluded.
- [x] Initial environment inspection: Supabase CLI `2.107.0`, Node `v24.13.1`, pnpm `11.9.0`
  and Homebrew PostgreSQL `17.11` are available. `genova_008_test_restore` listens only on local
  PostgreSQL at `127.0.0.1:5432` and contains `auth`, `genova_003`, `genova_005` and
  `public.repertoire_files`. Deno is absent and no Docker-compatible daemon is running.
  Official Supabase local Edge serving requires a Docker-compatible runtime; therefore the planned
  topology is a task-owned, minimal Colima/Docker VM plus a disposable Supabase CLI project with
  Auth, PostgREST, Storage, gateway and Edge Runtime. It will receive only synthetic identities,
  synthetic PDF bytes and the isolated schema needed for 018; production URLs/credentials and the
  hosted project are forbidden. Availability remains to be proven by execution.
- [x] Runtime versions and target: Colima `0.10.3`, Docker `29.8.0`, Supabase CLI `2.107.0`,
  Edge Runtime `1.74.1`, GoTrue `2.190.0`, PostgREST `14.13`, Storage API `1.60.20`, Kong
  `2.8.1`, disposable Supabase PostgreSQL `17.6.1.136`, source PostgreSQL `17.11`, and host
  Deno `2.9.6`. The advertised/tested API is `http://127.0.0.1:54321`, the JWT issuer is the
  local `supabase-demo`, and project/container labels are `genova-018-runtime`. Colima's SSH
  forwarding process listens on the host wildcard address even though the runner accepts only
  the loopback URL; this isolated stack held synthetic data only and was removed after evidence.
- [x] Writer and permitted paths: the main agent may edit only
  `supabase/functions/repertoire-file/`, 018-owned files under `supabase/test-support/` and
  `supabase/tests/`, an exposed defect in `lib/repertuvar/protected-file-client.ts` plus its tests,
  and this brief/minimal status indexes. Root dependency/config expansion requires a newly recorded
  justification. Planned commands are task-owned local runtime setup, focused Deno/HTTP acceptance,
  the guarded PostgreSQL matrix, focused repository tests and `pnpm check`.
- [x] **2026-09-09 lint-gate diagnosis and config-scope expansion:** the first root `pnpm check`
  stopped at 27 pre-existing React Compiler findings in untouched application files. A bounded
  attempt to align `eslint-config-next` from `16.0.8` to installed Next `15.5.25` was rejected by
  that package's legacy Rushstack patch under this repository's flat ESLint configuration; the
  dependency is restored to exact `16.0.8`. React Compiler is not enabled in `next.config.ts`.
  Rather than rewrite twelve unrelated product modules or weaken general linting, this brief may
  disable only `react-hooks/set-state-in-effect` and `react-hooks/preserve-manual-memoization` in
  `eslint.config.mjs`, retaining the rest of the Next rules and `--max-warnings=0`. Re-enable these
  advisory compiler-optimization rules only in a dedicated React Compiler adoption task.
- [x] Runtime boundary at task start: `index.ts` imports Supabase JS through Deno's `npm:` resolver,
  imports the shared active-content guard outside the function directory, builds a user client for
  `auth.getUser` + `current_choir_id` + RLS selection, builds an admin client for ticket reads/provider
  bytes, and serves the composed handler with `Deno.serve`. `config.toml` deliberately leaves gateway
  JWT verification off only for `repertoire-file` so ticket-only GET/HEAD reaches method-specific
  handler checks. `@ts-nocheck` still leaves the entrypoint boundary unchecked. Required gates are
  the eight mandatory rows below. Rollback is the owned code commit followed by the evidence commit;
  the disposable runtime and only its synthetic fixtures are removed without touching the restored
  local database or the unrelated CLI cache.
- [x] The runner must require loopback URLs, a task-specific project/database identity and explicit
  synthetic fixture inputs. It must refuse missing target variables rather than inheriting a hosted
  `SUPABASE_URL`; cleanup/baseline comparison is mandatory even on a failed scenario.

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

Evidence below is self-review in the disposable local stack. It proves neither hosted deployment,
live Drive behavior, real accounts, a remote CI run nor hardware acceptance.

| Criterion / expected behavior | Required? | Status | Date / revision / environment / command | Evidence and limits |
|---|---|---|---|---|
| Actual runtime entrypoint/import/config loads and serves with checked boundaries documented | yes | PASS | 2026-09-09, `0b3df6e`, Edge Runtime `1.74.1`; guarded 018 runner | Actual `Deno.serve` entrypoint returned HTTP 204/POST/GET/HEAD through Kong. Host Deno `2.9.6` checked the import graph after removing `@ts-nocheck`; a typed-array WebCrypto incompatibility was fixed. Runtime copies matched repository bytes. |
| Actual isolated Auth/RPC/RLS authorizes allowed roles and rejects missing/no-selection/wrong-choir/unassigned cases | yes | PASS | 2026-09-09, disposable `genova-018-runtime` | Six actual GoTrue password sessions, two choirs and real `current_choir_id`/RLS calls passed for chef, leader and assigned chorist; missing/invalid JWT, no selection, wrong choir, unassigned and hidden-file cases were refused. Synthetic identities only. |
| HTTP POST issues a real ticket; HTTP GET returns matching synthetic PDF bytes/checksum | yes | PASS | 2026-09-09, guarded HTTP runner | Real HMAC ticket issue/verification and Storage-backed 45-byte PDF returned matching SHA-256. The runtime's internal worker URL exposed a proxy contract defect; the handler now returns a relative query and the shared client resolves and revalidates it against its configured public endpoint. Local Storage is a provider substitute, not Drive proof. |
| Expired/tampered/mismatched ticket and invalid session fail without file bytes or secret leakage | yes | PASS | 2026-09-09, guarded HTTP runner | Expired, signature-tampered and file-ID-mismatched tickets returned 401; invalid session returned 401. Failure bodies were checked against the service key and protected-byte hash. No credential was written to evidence. |
| HEAD/ranges/416/MIME/upstream failure and bounded test resource behavior are recorded | yes | PASS | 2026-09-09, guarded HTTP runner | Full HEAD, fixed/open/suffix 206 and three 416 cases passed; missing object returned 502. Storage reports uploaded HTML as `text/html` in object info but `text/plain` on raw download, exposing a real MIME bypass; the function now preserves an active type from either source and returned 415. One 8 MiB buffered response passed in 116 ms; Edge container sample moved from 68.61 MiB to 101.1 MiB. This is one bounded observation, not throughput or production sizing. |
| Shared client integration and applicable root `pnpm check` / focused runtime tests pass | yes | PASS | 2026-09-09, `0b3df6e` | Focused function/client suite: 4 files / 36 tests. Root `pnpm check`: lint, typecheck, 38 files / 253 tests with coverage, service-worker syntax and Next `15.5.25` build PASS. A first lint run exposed 27 untouched React Compiler advisory findings; a failed Next-15 config downgrade was reverted, then only the two compiler rules were disabled because React Compiler is not enabled. Native gate N/A: no mobile source/dependency/config changed. |
| Target guards, fixture baseline/cleanup, scope, local links and diff checks pass | yes | PASS | 2026-09-09, guarded runner + documentation review | Wrong database name was refused before mutation. Runner requires the exact workdir/context/project/container labels, loopback URL, local JWT issuer/role and PostgreSQL 17 test-copy name. Source was schema-only copied; tracked source hash stayed unchanged; public/Auth/Storage fixtures returned to baseline after success and failures. Seven changed Markdown files contained 112 local targets and one heading fragment, with zero missing; `git diff --check` passed and the unrelated CLI cache stayed unstaged. |
| Separate code/evidence commits and next-task handoff preserve 004/010 and historical acceptance | yes | PASS | 2026-09-09, code `0b3df6e`; this evidence commit | Product/runtime/tests and records are separate. No push, CI dispatch, deploy, hosted query/write, real account/email, spending or hardware action occurred. 004 remains 25/27 with hardware postponed; 010 remains 6/7 without fixture recreation. The next local task is plan A2, actual native PDF/Skia rendering on both current simulators/emulators. |

## Execution notes and reusable command

The first runtime location under `/tmp` could not be mounted into Colima and produced an Edge
entrypoint 503; moving the disposable project under ignored `spike/018-runtime` fixed that topology.
The first root lint gate and the failed version-alignment attempt are recorded in the start check
rather than erased. The repeatable runner rebuilds only the disposable target's `public`,
`genova_003` and `genova_005` schemas from a schema-only local test copy, refuses stale 018
Auth/Storage fixtures, compares the source snapshot, runs Deno check and the HTTP matrix, and
always lets the TypeScript fixture cleanup restore its tracked baseline:

```bash
GENOVA_018_WORKDIR="$PWD/spike/018-runtime" \
GENOVA_018_DOCKER_CONTEXT=colima-genova018 \
PGDATABASE=genova_008_test_restore \
PSQL_BIN=/opt/homebrew/opt/postgresql@17/bin/psql \
PG_DUMP_BIN=/opt/homebrew/opt/postgresql@17/bin/pg_dump \
bash supabase/test-support/018_repertoire_file_runtime_runner.sh
```

## Rollback, blockers and next task

Revert the owned code/config commit, then its evidence commit; remove only owned local fixtures
or disposable test environment. Never reset shared work or run a blanket migration against a
hosted project. An unexpected external target, unknown dirty ownership or need for real data stops
that action. Two failed approaches trigger diagnosis/replanning, not automatic acceptance.

After this required local acceptance, plan A2 from the canonical roadmap: native product PDF/Skia
rendering on current iOS/Android simulator/emulator builds using this verified local service. A2
cannot claim integration by substituting another fake. This brief is not authority for deployment,
010 fixture recreation or postponed hardware testing.
