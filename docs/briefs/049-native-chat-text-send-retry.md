# 049 — Native chat text send and protected retry

**Status / date / responsible writer:** ACCEPTED LOCALLY / 2026-09-20 / primary agent

**Purpose and user need:** Let an authenticated mobile member send text, reply and link-preview
messages once, recover a lost acknowledgement after restart and explicitly retry or cancel without
leaking another account or choir's queued content.

**Delivery focus:** This is C3 order 5 after 048. It adopts 045's idempotent server RPC in the
native room, adds a bounded queue through the existing chunked SecureStore and reconciles exact
client mutation IDs against fresh authorized snapshots. Queue persistence must succeed before any
send. Editing/deletion, social/Presence, media and room administration remain later slices.

**Starting evidence:** Product `dc86d5d` / records `58409a9` accept a memory-only native list/read
flow with no composer. Migration 045 and web adoption already define sender-scoped idempotency,
exact text/reply/link-preview payload reuse and explicit retry/cancel. Native already has
`expo-secure-store`, a tested chunked storage adapter and `expo-crypto.randomUUID`; no new dependency
is needed. The shared read model does not yet retain `client_mutation_id`, so a fresh snapshot cannot
reconcile a native lost acknowledgement. Only the unrelated `supabase/.temp/cli-latest` is dirty.

**Current work card:** Observable result: in one authorized native room, text/reply/link content is
stored in the protected scoped queue before network, shown as pending/failed, and collapses to one
server message after acknowledgement, snapshot or explicit retry. Next actions: (1) extend the
shared read contract with nullable mutation identity and add the protected queue/gateway; (2)
compose accessible send/reply/retry/cancel UI; (3) run mobile/root/bundle gates, clean and record.
Exit only when every local required criterion passes or a failure remains explicit.

**Resources:** Start snapshot: 21,362,264 KiB (~20.4 GiB) free; no `.next`, coverage, bundle output,
VM, simulator or DB runtime is retained. Reuse installed dependencies. Estimated peak is under
1 GiB for sequential tests, root build and Expo exports. Remove exact `.next`, coverage and
`apps/mobile/.expo/bundle-check-049-*` after their last check; keep >=10 GiB free and run one heavy
process at a time.

**Allowed files / modules:**

- `lib/chat-read-contract.ts` and focused tests — expose the nullable server mutation identity
  needed for cross-client snapshot reconciliation; no transport or storage side effect.
- `apps/mobile/src/chat/` — bounded protected queue, Supabase send/preview adapter, coordinator,
  composer adoption and focused tests.
- Existing mobile auth storage/client exports only if required to reuse chunked SecureStore; shell
  and acceptance doubles only for the exact send composition or tenant teardown.
- This brief and, after acceptance, plan/MIGRATION/active-context/handoff status records.

**Sources / existing patterns:**

- [038 inventory](038-native-chat-feature-inventory.md#sequential-c3-delivery-split),
  [045 idempotent send](045-chat-text-send-idempotency.md) and
  [048 native read](048-native-chat-list-read.md).
- `lib/chat-read-contract.ts`, 045's RPC, current web pending queue and native chunked SecureStore,
  tenant-cache, random UUID and injected gateway patterns.

**Migration start check:**

- Read: `AGENTS.md`, handoff, active context, plan C3/resource controls, transition guide/work
  cycle/template, 038/045/048, current shared read/send/cache code and mobile storage/chat source.
- Boundary: native text/reply/link-preview send only. The server remains 045's RPC; no new route,
  schema or direct table insert. Shared mutation identity stays framework-free and optional for old
  rows/clients. Chat remains native-owned; permanent WebView screens and web behavior do not change.
- Preserve: exact content/reply/preview payload on retry, one server message after lost response,
  current chronological read snapshots and compatibility fallbacks, explicit pending/failed state,
  restart recovery, queue TTL/cap/size refusal and synchronous tenant invalidation.
- Authority/writer: one primary writer. Scoped local source/tests/exports/commits and exact cleanup
  are authorized. No hosted query/migration/RPC invocation, real account/data, deploy, push, CI,
  provider, credential, simulator/hardware, distribution, publication or spending.
- Required proof: persist-before-network/write refusal; same-key retry and snapshot reconciliation;
  malformed/wrong-room/mismatched acknowledgement refusal; account/choir/member/room scope, TTL,
  count/byte cap, corrupted/partial storage and clear; restart pending auto-retry once, failed manual
  retry/cancel, reply/preview payload stability; mobile/root and sequential bundle gates. Historical
  045 SQL evidence is a dependency, not rerun or hosted evidence.

**Out of scope:**

- Edit/delete/hide/copy/star, reactions, polls, delivered/read native writes, typing or Presence.
- Image/file/sticker send, uploads, gallery/file list, room/member/DM administration.
- Background OS retry, push-triggered send, unlimited drafts, general offline message history or
  claiming SecureStore queue delivery as server/provider delivery.
- Schema changes, hosted 045/048 application, real socket/link-preview invocation, simulator/device
  acceptance, deploy/push/release or web visual changes.

**Risk / authority / rollback:** A request sent before durable queue write can disappear; changing
preview/reply metadata under the same key can be rejected; stale callbacks can write another tenant;
an unbounded keychain queue can exhaust storage. Persist the exact accepted request first, cap age,
count and serialized bytes, serialize sends, bind every result to account+choir+member+room and
reconcile only equal mutation IDs returned through parsed room snapshots/acknowledgements. Storage
failure is visible and blocks network. Tenant clear invalidates in-flight results and removes only
this queue namespace. Revert the product commit for client rollback; no new DB down is needed.

**Small implementation steps:**

1. Add/test optional mutation identity parsing and a protected scoped queue with deterministic
   retention, corruption and write-failure behavior.
2. Add/test the Supabase adapter/coordinator and accessible composer/reply/pending/retry/cancel UI.
3. Run focused/full/root/export gates; review data/lifecycle/accessibility, clean and record.

**Done definition:**

- [x] Text, reply and successful link-preview payloads persist before network and acknowledge one
      server message; malformed or mismatched acknowledgements fail closed.
- [x] Lost response/restart, explicit retry/cancel, snapshot/event duplicate reconciliation and
      offline-visible failure keep exact payload and never silently remove queued content.
- [x] Queue account/choir/member/room scope, seven-day TTL, count/byte cap, corrupted/partial read,
      write refusal and tenant clear pass; message bodies use protected storage, not plain files.
- [x] Ready-room composer and message controls are accessible; no send control appears outside an
      authorized loaded room and later chat features are not implied.
- [x] Focused tests, mobile `npx tsc --noEmit && npm test`, root `pnpm check`, sequential iOS/Android
      Expo bundles, diff review, cleanup and >=10 GiB free-space check pass.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-20 | Source/ownership/resource preflight | local product `dc86d5d`, records `58409a9` | PASS | Only unrelated CLI marker is dirty; 21,362,264 KiB free. 045 RPC/web retry and native chunked SecureStore/random UUID exist; native has no composer/queue and shared snapshots discard mutation identity. No runtime/build/download started. |
| 2026-09-20 | Current Supabase client/changelog review | official `functions.invoke`, `rpc` references and changelog | PASS | Current JavaScript shapes match the adapter. Node 20 support ended, while the gate ran on Node 24. No hosted project was queried or changed. |
| 2026-09-20 | Two-attempt reassessment | focused TypeScript/renderer startup | PASS after repair | Attempt 1 exposed an un-injected default environment gateway; attempt 2 exposed the preview JSON index contract. Work paused for causal review, then explicit injection and the shared JSON shape repaired the causes without weakening acceptance. |
| 2026-09-20 | Protected queue/coordinator/UI focused acceptance | local product work leading to `2118182` | PASS | Six suites / 39 tests cover persist-before-network, protected two-slot pointer commit, missing/corrupt/partial storage, TTL/count/UTF-8 byte cap, scope/clear, lost response, exact retry, snapshot reconciliation, malformed/wrong-room/payload acknowledgement, restart/manual retry/cancel and tenant cleanup. |
| 2026-09-20 | Full mobile and root compatibility gates | local Node 24, product `2118182` | PASS | Mobile TypeScript plus 43 suites / 248 tests pass. Root lint/typecheck, 65 files / 602 tests, service-worker syntax and Next production build pass. Existing SafeAreaView/punycode warnings remain non-failing and were not hidden. |
| 2026-09-20 | Sequential bundle resolution and cleanup | local Expo export, product `2118182` | PASS | iOS and Android each resolve 1,431 modules / 4.3 MB. Both bundle directories, root `.next` and coverage are removed; 21,370,380 KiB (~20.4 GiB) remains free. Bundles are not simulator/device execution. |
| 2026-09-20 | Scope/security/lifecycle self-review | local diff and exact cleanup | PASS | Native calls only 045's accepted authenticated RPC and existing preview function; no service credential, schema or direct message insert was added. Pointer-less storage fails closed, late room/tenant results cannot update the visible room and injected/default queues participate in tenant clear. Self-review is not independent review. |
| 2026-09-20 | Acceptance-record consistency gate | five changed Markdown files | PASS | 153 local file links resolve with zero missing; stale 049 pending/next-send markers are absent and `git diff --check` passes. Only the unrelated CLI marker remains outside the document set. |

**Delivery:** Planning commit `ce9a55a`; product/tests `2118182`; this separate acceptance/status
record follows. No hosted DB/Edge/socket, real account/data, simulator/device, deploy, push or release
was run. The next ready C3 slice is a separately bounded native core-message action brief before
reactions/polls/ephemeral social state.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Shared mutation identity and parsed acknowledgement boundary | yes | PASS | 2026-09-20, `2118182`, shared/mobile focused tests | Old null/absent rows stay compatible; invalid UUID, wrong room/key/content/reply/preview acknowledgements refuse. |
| Protected scoped queue and restart/retry/cancel lifecycle | yes | PASS | 2026-09-20, `2118182`, queue/gateway tests | Persist-before-network, exact retry, reconciliation, TTL/count/UTF-8 byte limits, pointer commit failure, corruption and tenant clear pass. Storage refusal starts no send RPC. |
| Native composer/reply/link and pending/failed UX | yes | PASS | 2026-09-20, `2118182`, React Native renderer | Accessible loaded-room composer/reply and pending/failed retry/cancel paths pass; preview failure preserves text send and no control appears before an authorized room snapshot. |
| Mobile/root compatibility and iOS/Android bundle resolution | yes | PASS | 2026-09-20, `2118182`, local gates | Mobile 43/248, root 65/602/build and sequential 1,431-module iOS/Android exports pass. Exports are not simulator/device/runtime evidence. |
| Diff/data/lifecycle/accessibility review, cleanup and records | yes | PASS | 2026-09-20, `2118182`, local self-review | Exact generated outputs removed, 21,370,380 KiB free; only unrelated CLI marker remains dirty. Self-review is not independent review. |
| Hosted RPC/preview/socket, real account/data, simulator/hardware/provider/deploy/release | no — separately approved later gates | NOT RUN | no external authority | Blocks deployed/runtime/device claims, not bounded local implementation evidence. |
