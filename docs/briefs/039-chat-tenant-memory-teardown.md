# 039 — Chat tenant-memory teardown

**Status / date / responsible writer:** IN PROGRESS / 2026-09-19 / primary agent

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
The only unrelated dirty path is `supabase/.temp/cli-latest`.

**Current work card:** Observable result: after normal sign-out/tenant cleanup or embedded
`context.clear`, the process-wide chat store returns its exact initial state before any asynchronous
disk/cache cleanup completes. Next actions: (1) add both reset calls and two lifecycle regressions;
(2) run focused/full root gates and review ordering; (3) clean outputs, record and select the shared
read contract. Exit when all required rows pass and no DB/native/live claim is made.

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

- [ ] Successful ordinary sign-out/tenant cleanup resets the process-wide chat store.
- [ ] Embedded context clear resets the chat store while protected children remain blank.
- [ ] A rejected/failed ordinary sign-out does not run the post-success tenant cleanup early.
- [ ] Existing cache/query/annotation/bridge cleanup behavior and chat store initial shape remain.
- [ ] Focused tests and root `pnpm check` pass; diff review, cleanup and 10 GiB floor pass.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source/resource preflight | local repository at `7c63064` | PASS | Central cleanup seams and existing synchronous reset verified; 12,088,544 KiB free; no runtime/dependency planned. |

**Delivery:** Pending product implementation and acceptance record.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Ordinary successful sign-out/tenant cleanup resets chat store | yes | NOT RUN | pending focused test | Must run at the existing post-success cleanup boundary. |
| Embedded `context.clear` resets chat store and blanks children | yes | NOT RUN | pending focused test | Reset must be synchronous before asynchronous cache work completes. |
| Failed sign-out preserves current tenant state | yes | NOT RUN | pending regression review/test | No eager reset before Auth/annotation transition succeeds. |
| Focused tests and root shared/web gate | yes | NOT RUN | pending | Root gate required for provider/shared web change. |
| Diff review, cleanup, disk floor and records | yes | NOT RUN | pending | Preserve unrelated CLI temp marker unstaged. |
| DB/Realtime/native runtime/device/hosted | N/A — web memory repair only | N/A | not executed | Required in later C3 briefs. |

