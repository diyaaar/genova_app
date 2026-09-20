# 051 — Native chat starred-message state and room panel

**Status / date / responsible writer:** ACCEPTED LOCALLY / 2026-09-20 / primary agent

**Historical interrupted checkpoint — WF-008:** Agent-owned product changes existed in
`apps/mobile/src/chat/` and `apps/mobile/src/ui/AppRoot.tsx` with accompanying tests. Last focused
run after adding the state serialization queue: 43 PASS / 2 FAIL (transport-start synchronization
in gateway tests). Earlier mobile 48/272, root 65/602/build and iOS/Android exports are pre-change
evidence, not final acceptance. Review panel-only stars, unknown initial state, stale lifecycle
callbacks and strict cursors as well as the reported failures before closing. Exact .next,
coverage and 051 exports were cleaned. Preserve these source edits; unrelated CLI cache stays
unstaged. After this coherent checkpoint, follow WF-008's storage/read delivery path instead of
automatically selecting another chat capability. Superseded by final acceptance below.

**Resumed checkpoint — 20 September:** Previous goal turn made progress (WF-008 committed and
the revised goal activated). Verified owned changes against `a4fead8`; unrelated CLI marker is
preserved. Disk preflight 21,325,708 KiB, before full gates 21,314,408 KiB. Existing dependencies
reused; estimated additional peak <1 GiB, exact cleanup targets unchanged. No runtime/VM/device
started. Read current handoff/context, guide/work cycle/template, delivery/resource controls,
MIGRATION/decisions and actual star gateway/transport/UI/tests plus 042 policy/web callers.

The two previous failures were test synchronization assumptions after queue serialization; tests
now wait for explicit transport-start signals. Self-review also repaired real panel-only removal,
unknown/lost-acknowledgement state, same-room return/tenant/unmount invalidation, old-room queued
work blocking a new room, invalid-calendar/cursor-boundary refusal, message-key dedup and manual
snapshot refresh. Added direct hook regression coverage. Focused 6 suites/53 tests passed, then
final mobile typecheck and 49 suites/282 tests passed after the last refresh/paging additions.
Final evidence below supersedes these intermediate test counts. No hosted/device acceptance.

**Purpose and user need:** Let the current native member star or unstar an authorized room message
and browse that room's own starred messages without trusting another member, choir or hidden row.

**Delivery focus:** This is the next coherent C3 order-6 family after 050. It adopts 042's
member-owned, room-authorized `chat_starred_messages` policies for strict snapshot/toggle state and
an accessible bounded room panel. Stars are personal durable state; reactions, polls, receipts,
typing, Presence, media and room administration remain separate. The table is not in the accepted
046 publication set, so this slice uses authoritative snapshots and explicit refresh rather than
inventing a Realtime guarantee.

**Starting evidence:** Product `9edda60` / records `d8cca11` accept native list/read/send and core
actions. Migration 042 limits star SELECT/INSERT/DELETE to `current_chat_member_id()` plus accessible
message/room and adds `(member_id, created_at desc)`; `(message_id, member_id)` is unique. The web
loads, toggles and lists stars but trusts loose result shapes and has no dedicated star Realtime
publication. Native messages currently have no star state or room star panel. The hosted target and
real data remain unverified. Only unrelated `supabase/.temp/cli-latest` is dirty.

**Current work card:** Observable result: in one authorized native room, each loaded message shows
the current member's exact star state, toggle changes only after a validated own-row acknowledgement
and a bounded room panel pages strict authorized message snapshots. Next actions: (1) add strict
star row/page contracts and Supabase gateway; (2) compose toggle/indicator/panel/refresh UI with
stale-scope guards; (3) run mobile/root/bundle gates, clean and record. Exit only when every local
required criterion passes or a required failure remains explicit.

**Resources:** Start snapshot: 21,371,364 KiB (~20.4 GiB) free; no retained build, bundle, VM,
simulator or DB runtime. Reuse installed dependencies and 042 source. Estimated peak is under 1 GiB
for sequential tests, root build and exports. Remove exact `.next`, coverage and
`apps/mobile/.expo/bundle-check-051-*` after their last check; keep >=10 GiB and one heavy process.

**Allowed files / modules:**

- `apps/mobile/src/chat/` — strict star contracts/gateway/Supabase adapter, room snapshot adoption,
  bounded starred panel and focused tests.
- Shared framework-free read contract only if an actually shared nested-message parser is required;
  do not broaden the shared model with client-only state.
- Existing shell doubles only for exact tenant teardown composition.
- This brief and, after acceptance, plan/MIGRATION/active-context/handoff status records.

**Sources / existing patterns:**

- [038 inventory](038-native-chat-feature-inventory.md#sequential-c3-delivery-split),
  [042 authority](042-chat-social-membership-authority.md),
  [048 read](048-native-chat-list-read.md) and [050 actions](050-native-chat-core-message-actions.md).
- `chat_starred_messages` schema/unique key, 042 policies/index, web star functions/panel and native
  stable `(created_at,id)` page/parser/scope patterns.
- Current official Supabase JavaScript table query guidance and changelog review recorded in 049.

**Migration start check:**

- Read: `AGENTS.md`, handoff, active context, plan C3/resource controls, transition guide/work
  cycle/template, 038/042/048/050, star schema/policies/index, web callers and native chat source.
- Boundary: current-member star read/add/remove plus bounded current-room panel only. No reactions,
  polls, receipts, Broadcast/Presence, media or administration. No new server logic, schema, route,
  publication or web behavior change.
- Preserve: personal star indicator/toggle and room star list; current account/choir/member/room;
  hidden/deleted/inaccessible message refusal; strict message compatibility; stable paging/order;
  empty/loading/error/refresh, repeated toggle, offline-visible last trusted state and tenant clear.
- Authority/writer: one primary writer. Scoped local source/tests/exports/commits and exact cleanup
  are authorized. No hosted query/write/migration, real account/data, deploy, push, CI, provider,
  credential, simulator/hardware, distribution, publication or spending.
- Required proof: current-member/choir/room row parsing and mismatch refusal; exact insert/delete
  filters and returned-row acknowledgement; duplicate/repeated toggle, lost/refused response,
  malformed/nested/hidden/deleted result, stable 40-row cursor/dedup, refresh, room/tenant change and
  late result; mobile/root/sequential bundles. Historical 042 SQL is dependency evidence only.

**Out of scope:**

- Star sharing, global cross-room search, notifications or adding stars to Realtime publication.
- Reaction/poll/status/typing/Presence/message-info, media and room/member management.
- Offline star mutation queue, optimistic authority, unbounded panel, schema/index changes or
  treating local fixtures/exports as hosted/device evidence.
- Hosted 042 application/query/write, real account/data/socket, simulator/device, deploy/push/release
  or web visual changes.

**Risk / authority / rollback:** A caller-supplied member ID, loose joined row or optimistic toggle
could expose another member's state or display a star the server refused. Every query binds the
server-confirmed scope and room, parses own member/choir/message identities and changes UI only after
an exact returned row. One in-flight toggle per message prevents reversal races; stale callbacks are
discarded on room/tenant change. Last trusted read state may remain visible with an offline warning,
but is not server freshness. Revert the product commit for client rollback; no DB down is needed.

**Small implementation steps:**

1. Add/test strict star row/page contracts, exact Supabase shapes and scope-safe gateway.
2. Add/test star indicator/toggle and bounded room panel with refresh/paging/lifecycle states.
3. Run focused/full/root/export gates; review authority/order/accessibility, clean and record.

**Done definition:**

- [x] Loaded messages show only the current member's authoritative star state; exact acknowledged
      add/remove toggles it and repeated/refused/lost responses never silently invent state.
- [x] The current-room panel pages at most 40 strict authorized rows per request with stable order,
      dedup, empty/error/refresh/older states and no hidden/deleted/inaccessible content.
- [x] Member/choir/room/message mismatch, malformed nested row, late room/tenant callback and tenant
      clear fail closed; no Realtime or offline mutation guarantee is implied.
- [x] Focused tests, mobile `npx tsc --noEmit && npm test`, root `pnpm check`, sequential iOS/Android
      Expo bundles, diff review, cleanup and >=10 GiB free-space check pass.
- [x] Migration controls and separate product/evidence commits are recorded; hosted, real-account,
      socket, simulator/device and release layers remain explicitly NOT RUN.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-20 | Source/ownership/resource preflight | local product `9edda60`, records `d8cca11` | PASS | Only unrelated CLI marker is dirty; 21,371,364 KiB free. 042 policies/index/unique key, web star behavior and native strict read/action patterns exist. No runtime/build/download started. |
| 2026-09-20 | Scope and publication review | local schema/migrations/source | PASS | Stars are own-member and accessible-message constrained, but not in 046's declared Realtime tables. The brief therefore requires snapshots/refresh and no socket claim. Hosted state was not inspected. |

| 2026-09-20 | Focused star/transport/panel/screen/tenant tests | local synthetic renderer/transport | PASS | Six suites/53 tests after first repairs; final run below adds refresh, paging and acknowledgement-refusal cases. |
| 2026-09-20 | `npx tsc --noEmit && npm test -- --runInBand` | `apps/mobile`, final `22a19d6` source | PASS | 49 suites/287 tests. Existing SafeAreaView/punycode/npm-config warnings remain unrelated. |
| 2026-09-20 | `pnpm check` | root, unchanged final production source | PASS | lint/typecheck, 65 files/602 tests, service-worker syntax and Next production build. Only mobile test cases added afterward; final mobile gate includes those. |
| 2026-09-20 | `npx expo export --platform android --output-dir .expo/bundle-check-051-android`, then corresponding `ios` export | local production JS/Hermes, synthetic URL/key, `EXPO_NO_DOTENV=1` | PASS | 1438 modules each; Android 4.4 MB / iOS 4.3 MB. No native compile, simulator/device. Existing 051 export gate retained; later ordinary UI work follows grouped-iOS policy. |
| 2026-09-20 | Self-review of final diff and 042 authority dependency | local source | PASS | Own-row acknowledgement, inner join, strict cursor/calendar/microseconds, panel-only removal, unknown-state refresh, lost-ack recovery, serialized state writes, A-B-A/tenant/unmount refusal reviewed/tested. No web/schema/publication change. ChatScreen size reviewed; new state/panel logic is separate, no unrelated refactor. Self-review is not independent review. |
| 2026-09-20 | Owned output cleanup | local filesystem | PASS | Removed `.next` 473,556 KiB, coverage 332 KiB, Android export 4,260 KiB and iOS export 4,252 KiB (~471 MiB total); all rebuildable. Free afterward 21,300,624 KiB (~20.31 GiB). No runtime/VM/device created or retained. Dependencies/source retained; CLI marker untouched. |

**Delivery:** Planning `d8dd8e3`; product/tests `22a19d6`; separate `051: record starred-message
acceptance and storage handoff` commit owns this evidence. Revert the client product commit for
rollback; no DB change made. Hosted 042/PostgREST joins/mutations still need approved integration
before beta exposure. Next: Drive file inventory and bounded private-R2 protected PDF/audio read
integration, not another chat feature. Full goal and 004/010 open criteria remain open.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Strict own-member star snapshot/toggle contract | yes | PASS | 2026-09-20, `22a19d6`, final gateway/adapter tests | Exact scope/room/message binding, returned-row acknowledgement, malformed/refused/lost/repeated cases. Mock transport only. |
| Bounded native indicator/toggle and room panel | yes | PASS | 2026-09-20, `22a19d6`, screen/panel/hook renderer tests | 40-row paging/cursor, dedup, empty/error/refresh/older, panel-only removal, accessible roles. No device visual claim. |
| Room/tenant lifecycle and late-result refusal | yes | PASS | 2026-09-20, `22a19d6`, hook/gateway/AppRoot tests | Old-room stall, A-B-A room/tenant, late panel, unknown/lost acknowledgement and tenant/unmount clear. |
| Mobile/root compatibility and iOS/Android bundle resolution | yes | PASS | 2026-09-20, final commands above | Mobile 49/287, root 65/602/build, both exports. Not simulator/device/runtime evidence. |
| Diff/authority/order/accessibility review, cleanup and records | yes | PASS | 2026-09-20, scoped diff, cleanup and documentation validation | Self-review, not independent review. >=10 GiB maintained. |
| Hosted 042 queries/writes, real account/data, socket, simulator/hardware/provider/deploy/release | no — separately approved later gates | NOT RUN | no external authority | Blocks deployed/runtime/device claims, not bounded local implementation evidence. |
