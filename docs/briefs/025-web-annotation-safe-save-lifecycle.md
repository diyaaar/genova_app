# 025 — Web annotation safe-save lifecycle adoption

Prepared: 2026-09-09; executed: 2026-09-10. Status: **LOCAL ACCEPTANCE COMPLETE** at code/test
commit `42c2fbb`. This documentation-only update records the evidence. Single writer and
self-reviewer: main agent; no independent review is claimed. This is the second bounded B2 repair
after 024.

## Outcome and delivery focus

Make the existing web repertoire workspace consume 024's per-layer lossless/revision metadata and
authenticated CAS save adapter so edits target the actual PDF page, serialize per layer and cannot
be silently dropped by debounce, navigation, choir switch or sign-out. This removes the unsafe
compatibility save call from the product workspace before native writing follows the same path.

This package does not add native editing, offline durability, merge, per-author collaboration or a
final deletion UX. When a pending 023 owner decision is necessary, 025 uses a reversible fail-closed
guard: preserve the local unsaved snapshot, block tenant exit after a failed flush and refuse
deleting a previously stored layer. Those guards are safety boundaries, not approval of final UX.

## Execution start check

- [x] Read [AGENTS](../../AGENTS.md), [handoff](../agent-handoff.md),
  [migration guide](../gecis-rehberi.md), [work cycle](../ai-calisma-duzeni.md), the six
  memory-bank indexes, [MIGRATION](../../MIGRATION.md), [decisions](../../KARARLAR.md),
  [delivery plan B2](../mobil-teslim-plani.md#b--rehearsal-tools-without-breaking-the-shared-contract),
  [023 inventory](023-annotation-write-contract-inventory.md) and
  [024 foundation](024-annotation-mutation-safe-save-contract.md).
- [x] Verified `main` at `42350c9` with only the pre-existing, unowned
  `supabase/.temp/cli-latest` modification. It remains unstaged and outside 025. The main agent is
  the sole writer; no subagent is used.
- [x] The owner's continuing direction authorizes local implementation, browser/unit tests and
  local commits. It does not authorize applying 024 to hosted Supabase, real data/accounts,
  push/deploy, remote CI, messages, spending or hardware.
- [x] 024's local evidence is accepted at `1755803`, but the current workspace still calls the
  direct select/update/delete compatibility adapter. Its queue uses display `currentPage`, clears
  pending timers on unmount, shares one global status and can delete a newer queued payload when an
  older request completes. The safe adapter is not production-usable until this lifecycle is fixed.
- [x] Existing auth flow changes active choir before clearing tenant data and clears tenant data
  before sign-out. A shared in-memory annotation queue can therefore flush before either boundary;
  an already-ended external session can only discard private memory, never send under another
  tenant. `ToastProvider` wraps `AuthProvider`, so a blocked exit can be visible on every page.

## Allowed scope

- `lib/repertuvar/annotation-save-queue.ts` and focused tests: a browser-memory, tenant-owned,
  per-context latest-snapshot queue with serialized writes, revision rollover, retryable failures,
  flush and explicit private-memory discard.
- `lib/repertuvar/annotation-workspace-lifecycle.ts` and tests if pure page/metadata/delete guards
  materially reduce the large component's risk.
- `components/repertuvar/RepertoireWorkspace.tsx`: load/write metadata adoption, correct PDF page,
  queue subscription, unsupported-layer edit refusal, pending restoration, unload warning and
  removal of the legacy save call/timers.
- `components/AuthProvider.tsx` and focused tests: flush before choir switch/sign-out; visible
  refusal on failure; discard only after an external session has already ended or a successful
  tenant transition is committed.
- `lib/repertuvar/annotations.ts` only for a narrowly tested stored-empty deletion guard or adapter
  signature needed by lifecycle adoption. No SQL/schema change in 025.
- This brief and later minimal delivery-plan/MIGRATION/handoff/memory indexes after acceptance.

## Lifecycle contract

- Context identity is file ID + one-based **PDF** page + layer key. A cover may change display page
  numbering but never the stored annotation page. Commit, undo, redo and clear all use the same
  `activePdfPageNumber` that rendering and layer lookup use.
- Loading installs 024 metadata for every returned row. An absent logical row starts at expected
  revision null and is losslessly writable; a returned non-writable row remains visible but edit
  mode and every mutation entry point refuse it with a clear Turkish reason.
- One queue entry owns each context. Debounce collapses only not-yet-started snapshots for the same
  key. Once a request starts, a newer snapshot remains queued and runs with the returned revision;
  different keys may progress independently and cannot clear one another's error.
- Success updates row/revision state. Delete success returns the context to absence. Conflict,
  permission, invalid/missing contract or network failure keeps the latest local snapshot and marks
  that exact key retryable; no success from another key hides it.
- Component unmount cancels no data. It immediately requests a queue flush and leaves failures in
  browser memory. A same-tenant remount waits for pending work and overlays any retained local
  snapshot instead of loading stale server content over it. `beforeunload` warns while work remains.
- Choir switch and user-requested sign-out await a full flush before changing server/session state.
  Failure blocks the transition and shows a toast. After a successful transition, or when an
  external auth event proves the old session already ended, all old-tenant queue content is erased.
- Until the owner resolves deletion recovery/confirmation, transitioning a row with a positive
  stored revision to an empty snapshot is refused and retained as unsaved. Empty absence is a safe
  no-op. Individual erasing may remove the last visible item locally, but cannot delete the server
  row silently.

## Preserved behavior and exclusions

- Preserve item/layer/role definitions, one-based DB pages, normalized geometry, existing undo/redo
  depth, role UI affordances, defensive display, read-only native client and permanent screen
  ownership. `lib/repertuvar/annotation-types.ts` remains the only item schema.
- Keep the queue memory-only and online-first. No IndexedDB/localStorage persistence, background
  sync, automatic retry loop, merge/rebase, cross-sign-out draft or B3 durability claim.
- Do not apply/test hosted 024, add another API/Edge route, modify RLS/schema, send real annotations,
  change audio/PDF provider behavior, add native UI, deploy, push or touch hardware.
- An ordinary internal route change may finish a queued save in memory; it must not be called an
  operating-system/process durability guarantee.

## Risk, authority and rollback

- The highest risks are replaying a queued mutation after tenant change, dropping a newer payload
  when an older promise resolves, loading stale server data over an unsaved snapshot and presenting
  another key's success as recovery. Queue ownership and tests must cover each ordering explicitly.
- Auth transitions are security boundaries. Never proceed with switch/sign-out after a failed user-
  initiated flush. If the external session is already gone, do not retry with stale credentials;
  erase the old private payload and report only the local boundary.
- Rollback is the 025 code/test commit followed by its documentation commit. 024 remains locally
  prepared and current hosted behavior remains unchanged because no migration/release is authorized.
- A requirement for persistent drafts, automatic conflict resolution, destructive delete semantics
  or hosted validation stops only the dependent behavior; it does not justify inventing a choice.

## Implementation and verification sequence

1. Extract and unit-test PDF/display page identity plus a per-key queue state machine with injected
   safe-save dependency and deterministic timers.
2. Prove same-key debounce/latest-wins, in-flight successor revision, independent-key errors,
   conflict retention/retry, stored-empty refusal, flush/unmount and discard semantics.
3. Adopt metadata and queue in `RepertoireWorkspace`; remove legacy timers/call and use PDF page for
   commit/undo/redo/clear. Add focused component tests or the smallest testable integration seam for
   unsupported rows, retained pending snapshots and visible per-key status.
4. Gate `selectChoir` and user `signOut` through queue flush; test success ordering, failure refusal
   and external-session discard. Add unload warning only while the queue has pending/error work.
5. Run focused tests, root `pnpm check`, diff review and a local production-browser interaction with
   an injected safe adapter if feasible without hosted/schema access. Record unrun HTTP/hosted layers.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 025 open. Review is self-review unless an independent review is
actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Commit, undo, redo and clear use one-based PDF page identity with and without a cover; cover itself cannot be edited or saved | yes | **PASS** | 2026-09-10, `42c2fbb`; `annotation-workspace-lifecycle.test.ts` plus handler source review | No-cover pages stay one-based; a cover maps display 2/41 to PDF 1/40 and display 1 to null. All four mutation handlers now require and send `activePdfPageNumber`; no `pageNumber: currentPage` remains |
| Exact 024 row/revision/lossless metadata drives the workspace; unsupported/future/malformed rows remain visible but every mutation is refused before RPC | yes | **PASS** | 2026-09-10, focused adapter/lifecycle tests and workspace source integration | Loaded rows register exact revision/lossless metadata; pending local snapshots overlay server reads. Non-lossless rows remain in `layers` with a read-only warning; edit mode and the queue both refuse mutation. No hosted RPC call was made |
| Same-key debounce and in-flight successor serialize correctly with returned revisions; independent keys retain independent errors and retryable latest snapshots | yes | **PASS** | 2026-09-10, deterministic `annotation-save-queue.test.ts` | Same-key debounce keeps latest; an in-flight successor uses the returned revision; failure retains the newest snapshot/revision while another key may save. Memory-only whole-layer queue; no merge/automatic background retry claim |
| Unmount/internal navigation does not cancel pending data; same-tenant remount preserves/overlays it and browser unload warns only while unresolved work remains | yes | **PASS** | 2026-09-10, queue/lifecycle tests plus cleanup/load source review | Cleanup requests immediate owner flush and never cancels queue data; failure remains retryable and produces a global toast. Reload overlay and the before-unload event seam passed. Actual signed-in production-browser interaction was NOT RUN; process crash durability is N/A and not claimed |
| Choir switch and user sign-out flush before state change, block visibly on failure and erase old-tenant queue only after success; external session loss erases without stale retry | yes | **PASS** | 2026-09-10, `annotation-tenant-transition.test.ts`, queue tests and AuthProvider source review | Tested order is owner lock → flush → transition → discard. Flush/transition failure unlocks and preserves data; new writes are blocked during transition. External session/user loss discards without replay. No real account/session was used |
| Stored-row empty transition is refused pending owner deletion UX; absence-empty is a safe no-op and no server row is silently deleted | yes | **PASS** | 2026-09-10, deterministic queue and adapter tests | Stored-row clear is refused before local commit in the workspace and again in the queue; empty absence calls no adapter. Final confirmation/recovery semantics remain unresolved |
| Existing workspace no longer imports/calls legacy `saveLayerSnapshot`; focused tests and root `pnpm check` pass with no SQL/native/live/external change | yes | **PASS** | 2026-09-10, `42c2fbb`; source assertion; focused Vitest 4 files / 24 tests; root `pnpm check` | No legacy call/timer/display-page save remains in the workspace. Root lint/type passed; 42 files / 279 tests, coverage thresholds, Service Worker syntax and Next 15.5.25 build passed. Hosted RPC/HTTP, real browser account, deploy, SQL/native and hardware remain NOT RUN |

## Delivery

Planning is separate commit `5947074`; web lifecycle code/tests are commit `42c2fbb`. This
documentation-only update completes 025 locally. Rollback is this evidence update, then `42c2fbb`,
then the planning commit. No hosted query/migration, live account/data, push/deploy, remote CI,
message, spending or hardware action occurred.

025 removes the known unsafe web lifecycle but does not complete B2: 024 is still unapplied to the
hosted project, native remains read-only, and the four 023 collaboration/exit/deletion choices are
unresolved. Those choices prevent claiming the final B2 editing UX. Per the roadmap's blocker rule,
the next independent ready local package is 026, the first bounded B4 native audio playback/seek
slice; it must inventory and preserve current web audio behavior before product changes.
