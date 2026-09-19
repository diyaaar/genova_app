# 034 — Notification deep-link contract

**Status / date / responsible writer:** ACCEPTED LOCALLY / 2026-09-19 / primary agent

**Purpose and user need:** Establish one shared, fail-closed contract that turns every
existing push event into a canonical app destination before native notification delivery is
added.

**Delivery focus:** This is the first bounded C2 slice. It removes the current assignment-link
drift (`/odevler/<id>?aid=<id>` is rejected by the accepted mobile route policy), gives web and
future native consumers a stable notification identity for duplicate handling, and proves route
ownership/availability locally. Permission UI, device-token registration and provider delivery
are deliberately deferred to later C2 briefs.

**Starting evidence:** At `f63481b`, C1/033 is accepted locally and the worktree has only the
pre-existing unrelated `supabase/.temp/cli-latest` modification. `lib/server/push-notifications.ts`
emits seven event shapes. Its three assignment payloads include a redundant `aid` query, while
`classifyAppUrl` rejects all assignment queries. `public/sw.js` currently opens the supplied
`url`; no mobile notification implementation exists. These are verified source facts, not
provider or device evidence.

**Current work card:** Observable result: seven existing server push event types produce typed,
canonical destinations accepted by the C1 route policy, with a stable per-delivery identity.
Next actions: (1) add and test the framework-free contract; (2) bind existing server payload
builders to it; (3) run the full shared/web gate, review, record and clean. Exit when every
required row below passes and no C2 provider/device claim is made.

**Resources:** Start snapshot: 18,462,640 KiB free (~17.6 GiB), no task-owned runtime, build,
simulator or VM profile retained. Estimated peak is under 2 GiB for the existing dependency
tree's tests/build. No download or new environment is planned. Only one root gate may run; remove
its generated `.next` output after evidence is recorded and confirm at least 10 GiB remains free.

**Allowed files / modules:**

- `lib/notification-deep-link.ts` — new framework-free event/destination contract.
- `lib/notification-deep-link.test.ts` — contract and failure-case evidence.
- `lib/server/push-notifications.ts` — make the seven existing payload builders use the contract.
- `vitest.config.ts` — include the new critical shared contract in the existing coverage gate.
- This brief and, after acceptance, `docs/mobil-teslim-plani.md`, `MIGRATION.md`,
  `memory-bank/activeContext.md`, `docs/agent-handoff.md` — concise status indexes.

**Sources / existing patterns:**

- `docs/gecis-rehberi.md` and `docs/mobil-teslim-plani.md` — migration and C2 controls.
- `lib/mobile-webview-bridge.ts` and its tests — canonical route owner/availability authority.
- `lib/server/push-notifications.ts` — current event types and payload call sites.
- `public/sw.js`, `components/NotificationPrompt.tsx`, push subscribe/unsubscribe routes and the
  005 active-choir RPC migration — current browser delivery/token lifecycle inventory only.
- `MIGRATION.md` — route ownership and the VAPID-to-native second-channel boundary.

**Migration start check:**

- Read: `AGENTS.md`, `docs/agent-handoff.md`, `memory-bank/activeContext.md`, this brief's plan
  row and execution controls, `docs/gecis-rehberi.md`, `docs/ai-calisma-duzeni.md`, the brief
  template, the C1 route policy/tests and current push sources.
- Boundary: shared contract plus existing server payload construction; no native UI, WebView
  route rewrite, provider or backend schema work.
- Preserve: seven notification meanings and user-facing text; C1 route ownership; web behavior;
  destination pages remain responsible for current session, tenant and role authorization.
- Authority/writer: one primary writer; ordinary local code/tests/commits are authorized. The
  unrelated `supabase/.temp/cli-latest` path remains unstaged and untouched.
- Tests/rollback/open conflict: focused Vitest then root `pnpm check`; revert the product commit
  to roll back. Assignment `aid` duplication is the known conflict this brief resolves.

**Out of scope:**

- Expo notification packages, permission prompts, device tokens, FCM/APNs/VAPID changes, provider
  keys, real delivery/recipients, hardware, remote CI, deployment, push or spending.
- Subscription schema/RPC changes, hosted Supabase reads/writes and real account lifecycle tests.
- Service-worker tap adapter changes, foreground/background native behavior, notification inbox,
  retry storage or native assignment implementation.
- Any change to permanent WebView/native screen ownership or destination authorization rules.

**Risk / authority / rollback:** The main risk is silently routing a notification to the wrong
screen or allowing caller-supplied URLs to bypass route policy. The contract derives routes only
from known typed identifiers, validates identifiers/dates/metadata and delegates ownership to
`classifyAppUrl`; raw URL input is never authoritative. A delivery identifier supports exact
duplicate suppression but does not itself authorize access. Server call sites already isolate
push failures from the underlying product mutation. Rollback is code-only; no data or external
state is changed.

**Small implementation steps:**

1. Encode and test the seven event shapes, metadata validation, canonical paths, ownership and
   malicious/malformed refusals.
2. Replace hand-built server `url`/routing data with the shared builder without changing text or
   recipient selection.
3. Run focused and full gates, inspect the diff, record limits, remove generated output and commit
   product and records separately.

**Done definition:**

- [x] All seven existing event types resolve to canonical routes accepted by C1 policy.
- [x] Assignment events omit the rejected redundant query; raw/foreign URL fields cannot override
      a derived destination.
- [x] Invalid type, identifier, date, delivery identity and timestamp fail closed.
- [x] Route owner/availability and exact duplicate key are exposed without granting access.
- [x] Migration start check and delivery checks are evidenced.
- [x] Root `pnpm check` passes at the product revision.
- [x] Diff is self-reviewed, scope indexes are updated, generated output is cleaned and free space
      remains at least 10 GiB.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source inventory and route comparison | local repository at `f63481b` | PASS | Seven server event types found; assignment query conflicts with accepted C1 policy; no native notification implementation. No provider/device claim. |
| 2026-09-19 | Resource preflight | local filesystem | PASS | 18,462,640 KiB free; no new runtime/download planned; unrelated dirty temp marker preserved. |
| 2026-09-19 | `pnpm vitest run lib/notification-deep-link.test.ts lib/mobile-webview-bridge.test.ts` | local, uncommitted product diff | PASS | 2 files / 129 tests; all seven event paths, route policy and negative cases passed. |
| 2026-09-19 | First `pnpm typecheck` | local, uncommitted product diff | FAIL | The old generic `Record<string, unknown>` payload field did not accept the new discriminated union. The field was narrowed to `NotificationRoutingData`; the next typecheck passed. No acceptance row was removed. |
| 2026-09-19 | `pnpm typecheck` and focused ESLint | local, corrected product diff | PASS | Shared contract, tests and server integration passed with zero warnings. |
| 2026-09-19 | `pnpm check` | local at product content committed as `6883b3b` | PASS | Lint/typecheck; 56 files / 488 tests; coverage 90.43% statements, 81.75% branches, 97.22% functions, 95.92% lines; service worker syntax and Next production build passed. No provider or device operation. |
| 2026-09-19 | Product diff self-review | local commit `6883b3b` | PASS | Seven builders use the shared creator; text and recipient selection are unchanged; assignment query duplication is removed. Contract derives destinations from validated event data, rejects route override fields and marks authorization recheck required. Self-review is not independent review. |
| 2026-09-19 | Exact generated-output cleanup and disk check | local filesystem | PASS | Removed task-owned `.next` (461 MiB) and `coverage` (284 KiB); 16,935,320 KiB (~16.2 GiB) free. No runtime/download was created; unrelated temp marker remains unstaged. |
| 2026-09-19 | Local-link, status and diff checks | five changed Markdown files | PASS | 88 local links, zero missing targets; no stale 034 pending marker; `git diff --check` passed. |

**Delivery:** Planning commits `ed42a85` and `eda1f9e`; product commit `6883b3b`; this record commit
follows. Roll back `6883b3b` to remove the local contract. Provider delivery, permission UI,
device-token lifecycle, tap adapters and real-device evidence remain C2 work. The next bounded slice
must consume this contract without claiming provider or hardware acceptance.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Seven known event types produce typed metadata and canonical paths | yes | PASS | 2026-09-19, `6883b3b`, focused local contract test | Profile decision, announcement, rehearsal, assignment create/submit/review and repertoire assignment all passed. |
| C1 policy determines web/native owner and current availability | yes | PASS | 2026-09-19, `6883b3b`, focused contract + route-policy tests | Web destinations are available; repertoire is native/available; assignments are native/unavailable until C4. This is classification, not authorization or navigation. |
| Assignment paths omit `aid`; raw or foreign URL input cannot override the route | yes | PASS | 2026-09-19, `6883b3b`, focused hostile-input tests + diff review | All assignment events resolve to `/odevler/<uuid>`; forbidden `url`, `path`, route and credential/identity fields fail closed. Destination pages still recheck current access. |
| Malformed/unknown type, identifier, date, delivery identity and timestamp fail closed | yes | PASS | 2026-09-19, `6883b3b`, focused negative matrix | No permissive fallback to `/` or caller URL; invalid route policy also rejects. |
| Duplicate delivery exposes the same stable dedupe key; distinct identities remain distinct | yes | PASS | 2026-09-19, `6883b3b`, focused duplicate test | The server-owned UUID is preserved as the exact dedupe key. Persistence/eviction belongs to the delivery adapter brief. |
| Existing server builders use the shared contract and retain notification text/recipient behavior | yes | PASS | 2026-09-19, `6883b3b`, typecheck/build + self-review | Seven builders changed only routing fields; text and recipient code stayed intact. No provider send ran. |
| Root shared/web gate | yes | PASS | 2026-09-19, `6883b3b`, `pnpm check` | 56 files / 488 tests, thresholds, service-worker syntax and production build passed. Does not prove provider, hosted DB, native runtime or hardware behavior. |
| Provider delivery, real recipients and foreground/background device tap | N/A — explicitly outside this first C2 contract slice | N/A | not executed | Remain required in later C2 delivery acceptance. |
| Cleanup, disk floor and dirty-path ownership verified | yes | PASS | 2026-09-19, exact path checks + `df -k .` | `.next` and `coverage` absent; 16,935,320 KiB free; `supabase/.temp/cli-latest` remains the only unrelated dirty path. |
| Diff review and record consistency | yes | PASS | 2026-09-19, `6883b3b` and record diff | Product diff self-reviewed; document links/status/diff gate passed before the record commit. Self-review is not independent review. |
