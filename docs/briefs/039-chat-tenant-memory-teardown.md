# 039 — Chat tenant-memory teardown

**Status / date / responsible writer:** ACCEPTED LOCALLY / 2026-09-19 / primary agent

**Purpose and user need:** Prevent a signed-out or choir-switched user from resolving prior-tenant
chat rooms or messages from the process-wide web chat store after persistent/query caches clear.

**Delivery focus:** This is the smallest safety repair selected by 038 before native chat read work.
Both ordinary browser Auth teardown and the embedded WebView context teardown synchronously reset
the existing Zustand chat store alongside current cache cleanup. It does not change chat features,
database authority or the future native contract.

**Starting evidence:** 038 proved `clearChatCaches()` and React Query cleanup in both lifecycle
providers, but no call to the existing `useChatStore.getState().reset()`. `ChatRoom` resolves a
slug/ID from that global store before asking `chat_room_members`, so a remounted screen can select
stale prior-choir metadata. Product HEAD remains `b1d565f`; 038 records are `d5e26be`/`7c63064`.
The only unrelated dirty path is `supabase/.temp/cli-latest`. Product implementation is now
accepted at `7a6a78e`; the historical starting point remains recorded rather than rewritten.

**Current work card:** Complete. After successful normal sign-out/tenant cleanup or embedded
`context.clear`, the process-wide chat store synchronously returns to its exact initial state.
Failed ordinary sign-out preserves the current store. The next ready C3 slice is the shared room/
message read contract; no DB/native/live claim follows from this acceptance.

**Resources:** Start snapshot: 12,088,544 KiB (~11.5 GiB) free; `.next` and coverage are absent.
No dependency/download/runtime is planned. The root gate may generate about 461 MiB `.next`; run
one heavy process and remove exact `.next`/coverage outputs after evidence, preserving 10 GiB free.

**Allowed files / modules:**

- `components/AuthProvider.tsx` — reset chat memory inside ordinary tenant cleanup.
- `components/EmbeddedWebBridgeProvider.tsx` — reset chat memory inside embedded cleanup.
- `components/AuthProvider.embedded.test.tsx` — normal sign-out/cleanup regression.
- `components/EmbeddedWebBridgeProvider.test.tsx` — embedded context-clear regression.
- This brief and, after acceptance, plan/MIGRATION/active-context/handoff status records.

**Sources / existing patterns:**

- [038](038-native-chat-feature-inventory.md) — finding, scope and sequencing authority.
- `store/useChatStore.ts` — existing synchronous `reset()` and exact initial state.
- `lib/chat-cache.ts` — persistent chat cleanup, which remains separate from process memory.
- Existing Auth/embedded provider tests — tenant transition and fail-closed context patterns.

**Migration start check:**

- Read: `AGENTS.md`, handoff, active context, plan controls, 038, transition guide/work cycle,
  both lifecycle providers/tests and the chat store/cache.
- Boundary: existing web/embedded tenant lifecycle only. Chat remains native-owned for future UI;
  no native app, shared read contract, backend or schema change.
- Preserve: annotation transition ordering, protected-file cleanup, Auth sign-out, bridge blanking,
  query/cache teardown and all chat feature behavior inside one valid tenant.
- Authority/writer: one primary writer; local code/tests/commits are authorized. No hosted query,
  migration, credential, deploy, CI, provider, hardware or publication.
- Required proof: normal sign-out and embedded clear reset; synchronous ordering review; focused
  tests and root `pnpm check`; generated-output cleanup/disk floor. Revert the product commit.

**Out of scope:**

- Chat RLS/Realtime/publication, room/message parsers, RN UI, offline queue and media.
- Refactoring all stores/caches into a new registry or changing persistence policy.
- Claiming room access safety from client cleanup; Postgres room authority remains separately open.

**Risk / authority / rollback:** Resetting too early during a failed sign-out could discard visible
state while the user remains signed in. The ordinary provider therefore keeps its existing call
site: cleanup runs only after successful sign-out or an accepted identity/tenant transition.
Embedded context invalidation already blanks content synchronously and must clear chat memory at the
same boundary. Rollback is code-only and restores prior behavior.

**Small implementation steps:**

1. Invoke the existing synchronous chat-store reset in both centralized cleanup callbacks.
2. Prove ordinary sign-out and embedded `context.clear` call the reset without changing failure flow.
3. Run focused/full gates, review ordering, remove exact outputs and update the acceptance record.

**Done definition:**

- [x] Successful ordinary sign-out/tenant cleanup resets the process-wide chat store.
- [x] Embedded context clear resets the chat store while protected children remain blank.
- [x] A rejected/failed ordinary sign-out does not run the post-success tenant cleanup early.
- [x] Existing cache/query/annotation/bridge cleanup behavior and chat store initial shape remain.
- [x] Focused tests and root `pnpm check` pass; diff review, cleanup and 10 GiB floor pass.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source/resource preflight | local repository at `7c63064` | PASS | Central cleanup seams and existing synchronous reset verified; 12,088,544 KiB free; no runtime/dependency planned. |
| 2026-09-19 | First focused provider run | local Vitest | FAIL | 2 of 23 tests failed because the existing annotation-transition test double did not invoke its supplied transition callback, so the product sign-out path was never exercised. This was a test-fixture defect; no acceptance criterion was weakened. |
| 2026-09-19 | Correct test double and rerun both provider suites | local Vitest, product candidate `7a6a78e` | PASS | 2 files / 23 tests passed. The real Zustand store was seeded with prior-tenant rooms/messages: successful sign-out and embedded `context.clear` reset it; rejected sign-out preserved it. |
| 2026-09-19 | Focused lint and type check | local repository | PASS | Both changed providers/tests linted with zero warnings; `tsc --noEmit` passed. |
| 2026-09-19 | `pnpm check` | local repository, product `7a6a78e` | PASS | Lint/typecheck, 57 test files / 542 tests, coverage, service-worker syntax and Next production build passed. This is not DB, native runtime, hosted or device evidence. |
| 2026-09-19 | Diff/order review | local source and tests | PASS | Both centralized callbacks call the existing synchronous `reset()` next to chat-cache cleanup. Ordinary cleanup remains downstream of successful sign-out/accepted transition; embedded invalidation still blanks protected children. |
| 2026-09-19 | Generated-output cleanup and disk recheck | local filesystem | PASS | Removed exact task outputs `.next` (489 MiB) and `coverage` (332 KiB). 15,592,952 KiB (~14.9 GiB) remained free; unrelated `supabase/.temp/cli-latest` stayed unstaged. |
| 2026-09-19 | Documentation consistency gate | five changed Markdown files | PASS | 111 local links resolve with zero missing; stale 039 pending/next-teardown markers are absent; `git diff --check` passes. |

**Delivery:** Planning commit `caf5030`; product/test commit `7a6a78e`; this acceptance/status
record follows separately. Rollback is the product commit only. Next: shared chat read contract.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Ordinary successful sign-out/tenant cleanup resets chat store | yes | PASS | 2026-09-19, `7a6a78e`, focused provider test | Seeded real store returns to initial rooms/active-room/messages state only after accepted transition. |
| Embedded `context.clear` resets chat store and blanks children | yes | PASS | 2026-09-19, `7a6a78e`, focused provider test and source review | Both effects occur synchronously at invalidation; asynchronous disk cleanup is not used as proof. |
| Failed sign-out preserves current tenant state | yes | PASS | 2026-09-19, `7a6a78e`, focused provider test | Rejected Auth sign-out leaves seeded store intact. |
| Focused tests and root shared/web gate | yes | PASS | 2026-09-19, local, 23 focused tests and `pnpm check` | Full gate: 57 files / 542 tests plus service worker and production build. |
| Diff review, cleanup, disk floor and records | yes | PASS | 2026-09-19, local source/filesystem/docs | Four scoped product/test files committed; outputs removed; ~14.9 GiB free; 111 local links and diff check pass; unrelated marker preserved. |
| DB/Realtime/native runtime/device/hosted | N/A — web memory repair only | N/A | not executed | Required in later C3 briefs. |
