# 034 — Notification deep-link contract

**Status / date / responsible writer:** IN PROGRESS / 2026-09-19 / primary agent

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

- [ ] All seven existing event types resolve to canonical routes accepted by C1 policy.
- [ ] Assignment events omit the rejected redundant query; raw/foreign URL fields cannot override
      a derived destination.
- [ ] Invalid type, identifier, date, delivery identity and timestamp fail closed.
- [ ] Route owner/availability and exact duplicate key are exposed without granting access.
- [ ] Migration start check and delivery checks are evidenced.
- [ ] Root `pnpm check` passes at the product revision.
- [ ] Diff is self-reviewed, scope indexes are updated, generated output is cleaned and free space
      remains at least 10 GiB.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source inventory and route comparison | local repository at `f63481b` | PASS | Seven server event types found; assignment query conflicts with accepted C1 policy; no native notification implementation. No provider/device claim. |
| 2026-09-19 | Resource preflight | local filesystem | PASS | 18,462,640 KiB free; no new runtime/download planned; unrelated dirty temp marker preserved. |

**Delivery:** Pending implementation, acceptance, product commit, record commit and next C2 slice
selection.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Seven known event types produce typed metadata and canonical paths | yes | NOT RUN | focused local contract test pending | Must cover profile decision, announcement, rehearsal, assignment create/submit/review and repertoire assignment. |
| C1 policy determines web/native owner and current availability | yes | NOT RUN | focused local contract test pending | This is route classification, not authorization or navigation. |
| Assignment paths omit `aid`; raw or foreign URL input cannot override the route | yes | NOT RUN | focused hostile-input cases pending | Destination pages still recheck current session/tenant/role. |
| Malformed/unknown type, identifier, date, delivery identity and timestamp fail closed | yes | NOT RUN | focused negative cases pending | No permissive fallback to `/` or caller URL. |
| Duplicate delivery exposes the same stable dedupe key; distinct identities remain distinct | yes | NOT RUN | focused duplicate cases pending | Persistence/eviction belongs to the delivery adapter brief. |
| Existing server builders use the shared contract and retain notification text/recipient behavior | yes | NOT RUN | typecheck, tests and diff review pending | No provider send will run. |
| Root shared/web gate | yes | NOT RUN | `pnpm check` pending | Does not prove provider, hosted DB, native runtime or hardware behavior. |
| Provider delivery, real recipients and foreground/background device tap | N/A — explicitly outside this first C2 contract slice | N/A | not executed | Remain required in later C2 delivery acceptance. |
| Cleanup, disk floor and dirty-path ownership verified | yes | NOT RUN | post-gate check pending | Remove `.next`; preserve `supabase/.temp/cli-latest`. |
| Diff review and record consistency | yes | NOT RUN | self-review/document gates pending | Self-review is not independent review. |
