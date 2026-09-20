# 051 — Native chat starred-message state and room panel

**Status / date / responsible writer:** PLANNED / 2026-09-20 / primary agent

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

- [ ] Loaded messages show only the current member's authoritative star state; exact acknowledged
      add/remove toggles it and repeated/refused/lost responses never silently invent state.
- [ ] The current-room panel pages at most 40 strict authorized rows per request with stable order,
      dedup, empty/error/refresh/older states and no hidden/deleted/inaccessible content.
- [ ] Member/choir/room/message mismatch, malformed nested row, late room/tenant callback and tenant
      clear fail closed; no Realtime or offline mutation guarantee is implied.
- [ ] Focused tests, mobile `npx tsc --noEmit && npm test`, root `pnpm check`, sequential iOS/Android
      Expo bundles, diff review, cleanup and >=10 GiB free-space check pass.
- [ ] Migration controls and separate product/evidence commits are recorded; hosted, real-account,
      socket, simulator/device and release layers remain explicitly NOT RUN.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-20 | Source/ownership/resource preflight | local product `9edda60`, records `d8cca11` | PASS | Only unrelated CLI marker is dirty; 21,371,364 KiB free. 042 policies/index/unique key, web star behavior and native strict read/action patterns exist. No runtime/build/download started. |
| 2026-09-20 | Scope and publication review | local schema/migrations/source | PASS | Stars are own-member and accessible-message constrained, but not in 046's declared Realtime tables. The brief therefore requires snapshots/refresh and no socket claim. Hosted state was not inspected. |

**Delivery:** Pending planning commit, product/test commit and separate acceptance-record commit.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Strict own-member star snapshot/toggle contract | yes | NOT RUN | pending focused contract/adapter/gateway tests | Exact scope/room/message binding, returned-row acknowledgement, malformed/refused/lost/repeated cases required. |
| Bounded native indicator/toggle and room panel | yes | NOT RUN | pending React Native renderer tests | Stable 40-row paging/dedup, empty/error/refresh/older and accessible actions required. |
| Room/tenant lifecycle and late-result refusal | yes | NOT RUN | pending focused lifecycle tests | Last trusted state may remain visibly stale; other room/tenant state must never appear. |
| Mobile/root compatibility and iOS/Android bundle resolution | yes | NOT RUN | pending local gates | Exports are not simulator/device/runtime evidence. |
| Diff/authority/order/accessibility review, cleanup and records | yes | NOT RUN | pending self-review | Self-review is not independent review. |
| Hosted 042 queries/writes, real account/data, socket, simulator/hardware/provider/deploy/release | no — separately approved later gates | NOT RUN | no external authority | Blocks deployed/runtime/device claims, not bounded local implementation evidence. |
