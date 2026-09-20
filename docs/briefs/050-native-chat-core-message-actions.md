# 050 — Native chat core message actions

**Status / date / responsible writer:** ACCEPTED LOCALLY / 2026-09-20 / primary agent

**Purpose and user need:** Let an authorized native chat member copy or hide a visible message and
let its sender edit or delete it for everyone through the existing server-authoritative rules,
without optimistic loss, stale-tenant UI writes or exposing raw backend errors.

**Delivery focus:** This is the first coherent family in C3 order 6 after 049. It adopts 044's
authenticated edit/delete-for-everyone/hide-for-self RPCs and the installed Expo clipboard inside
the native room. The client presents the one-hour/ownership rule as a usability hint, but the server
remains authoritative and every mutation is reflected only after a validated acknowledgement.
Stars, reactions, polls, receipts, typing, Presence, media and room administration stay separate.

**Starting evidence:** Product `2118182` / records `148bf80` accept native list/read and protected
text/reply/link send/retry. Migration 044 defines sender-only text edit, sender-only one-hour global
delete and per-member hide RPCs returning UUID acknowledgements; the web already calls them. Native
has an injected read/send boundary and `expo-clipboard`, but only exposes Reply on server messages.
The official Supabase JavaScript RPC shape and current changelog were reviewed during 049. The
hosted target, real RPC behavior and device clipboard remain unverified. Only the unrelated
`supabase/.temp/cli-latest` is dirty.

**Current work card:** Observable result: in one authorized native room, an accessible action panel
copies visible content, edits eligible own text, confirms global delete or hides a message only for
the current member; failures preserve the last trusted message state. Next actions: (1) add a strict
action transport/coordinator and focused refusal tests; (2) compose accessible action/edit/confirm
UI with stale-room guards; (3) run mobile/root/bundle gates, clean and record. Exit only when every
local required criterion passes or a required failure remains explicit.

**Resources:** Start snapshot: 21,373,724 KiB (~20.4 GiB) free; no retained `.next`, coverage,
bundle, VM, simulator or DB runtime. Reuse installed dependencies and accepted 044 source. Estimated
peak is under 1 GiB for sequential tests, root build and exports. Remove exact `.next`, coverage and
`apps/mobile/.expo/bundle-check-050-*` after their last check; keep >=10 GiB and one heavy process.

**Allowed files / modules:**

- `apps/mobile/src/chat/` — action contract/coordinator, Supabase adapter, native room composition
  and focused tests. Keep read/send responsibilities separate.
- Existing mobile clipboard capability export and shell/acceptance doubles only if required for
  dependency injection or tenant invalidation; no new dependency.
- This brief and, after acceptance, plan/MIGRATION/active-context/handoff status records.

**Sources / existing patterns:**

- [038 inventory](038-native-chat-feature-inventory.md#sequential-c3-delivery-split),
  [044 authority](044-chat-core-message-mutation-authority.md),
  [048 read](048-native-chat-list-read.md) and [049 send](049-native-chat-text-send-retry.md).
- `20260919201500_chat_core_message_authority_044.sql`, existing web RPC wrappers/context actions,
  native read scope/message parser and the injected Expo clipboard writer.
- Current official Supabase JavaScript `rpc` reference and changelog review recorded in 049.

**Migration start check:**

- Read: `AGENTS.md`, handoff, active context, plan C3/resource controls, transition guide/work
  cycle/template, 038/044/048/049, 044 SQL/web callers and native chat/clipboard source.
- Boundary: native copy plus core edit/global-delete/self-hide only. No reaction/star/poll/status,
  ephemeral social state, media or room management. Server logic remains 044's RPCs; no route,
  schema, direct message update or web behavior change.
- Preserve: sender/text/deleted/time eligibility hints, server authority on every mutation,
  explicit confirmation for destructive actions, exact current room/account/choir/member scope,
  trusted state on refusal and refreshed/local state only after acknowledgement.
- Authority/writer: one primary writer. Scoped local source/tests/exports/commits and exact cleanup
  are authorized. No hosted query/RPC/migration, real account/data, deploy, push, CI, provider,
  credential, simulator/hardware, distribution, publication or spending.
- Required proof: exact RPC names/parameters and UUID acknowledgement validation; other sender,
  deleted/non-text/expired, malformed response and backend refusal; hide/copy/edit/delete UI,
  confirmation/cancel, clipboard failure, repeated tap serialization, room/tenant change and late
  result refusal; mobile/root/sequential bundle gates. Historical 044 SQL is not rerun or promoted
  to hosted evidence.

**Out of scope:**

- Reply/send queue changes, star/reaction/poll/status/typing/Presence and message-info delivery.
- Image/file/sticker mutation, uploads, gallery/list, DM/group or room/member administration.
- Undo/recovery product design, background actions, general offline mutation queue or claiming a
  clipboard/mock/export result as physical-device/runtime proof.
- Schema changes, hosted 044 application/calls, real socket/account/data, simulator/device,
  deploy/push/release or web visual changes.

**Risk / authority / rollback:** Client clocks and ownership checks cannot grant mutation authority;
they only shape controls. A stale success could alter a new room, repeated taps could issue duplicate
destructive calls and a malformed UUID could be mistaken for success. Serialize an action, bind its
result to the current scope/room/message, validate exact acknowledgements, require confirmation and
keep last trusted UI state on every refusal. Clipboard receives only the user-selected visible text.
Revert the product commit for client rollback; no DB down is needed.

**Small implementation steps:**

1. Add/test the strict action transport/coordinator and injected clipboard boundary.
2. Add/test the accessible message action, edit and destructive-confirmation UI with stale guards.
3. Run focused/full/root/export gates; review authority/lifecycle/accessibility, clean and record.

**Done definition:**

- [x] Copy, sender text edit, confirmed global delete and current-member hide expose only their
      valid native controls and update visible state only after accepted local acknowledgements.
- [x] Malformed/wrong-message acknowledgement, backend refusal, expired/other-sender/deleted/type,
      clipboard failure, repeated action and stale room/tenant results fail visibly and safely.
- [x] No direct table message update or client authority is added; exact 044 RPC shapes, UUID
      acknowledgement parsing and tenant invalidation pass focused tests.
- [x] Focused tests, mobile `npx tsc --noEmit && npm test`, root `pnpm check`, sequential iOS/Android
      Expo bundles, diff review, cleanup and >=10 GiB free-space check pass.
- [x] Migration start/delivery controls and separate product/evidence commits are recorded; hosted,
      socket, real-account, simulator/device and release layers remain explicitly NOT RUN.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-20 | Source/ownership/resource preflight | local product `2118182`, records `148bf80` | PASS | Only unrelated CLI marker is dirty; 21,373,724 KiB free. 044 RPCs, web adoption, parsed native messages and installed clipboard exist. No runtime/build/download started. |
| 2026-09-20 | Scope selection and current API review | local source plus 049 official Supabase review | PASS | Order 6 was split at the core action family. Existing authenticated RPC calls return UUIDs; stars/reactions/polls/Presence remain later. No hosted target was read or changed. |
| 2026-09-20 | Two-attempt reassessment | focused gateway/renderer tests | PASS after repair | Attempt 1 waited one microtask before the serialized action began; attempt 2 used an ambiguous text selector because the open panel repeats the message. Tests were corrected to the actual async queue and stable UI identity without weakening behavior. |
| 2026-09-20 | Action coordinator and native UX focused acceptance | local product `9edda60` | PASS | Four suites / 32 tests cover exact RPC/UUID boundaries, copy/edit/global-delete/self-hide, sender/type/deleted/expiry hints, confirmation/cancel, clipboard/backend errors, duplicate in-flight action, tenant clear and late room result. |
| 2026-09-20 | Full mobile and root compatibility gates | local Node 24, product `9edda60` | PASS | Mobile TypeScript plus 45 suites / 256 tests pass. Root lint/typecheck, 65 files / 602 tests, service-worker syntax and Next production build pass. Existing SafeAreaView/punycode warnings remain non-failing and visible. |
| 2026-09-20 | Sequential bundle resolution and cleanup | local Expo export, product `9edda60` | PASS | iOS and Android each resolve 1,434 modules / 4.3 MB. Both bundle directories, root `.next` and coverage are removed; 21,370,328 KiB (~20.4 GiB) remains free. Bundles are not simulator/device execution. |
| 2026-09-20 | Authority/lifecycle/accessibility self-review | local product diff | PASS | Native uses only 044's three RPCs and the selected visible text clipboard call; there is no direct message update, service credential, schema or new dependency. Results bind to scope/room/message, destructive actions confirm and refusal preserves trusted state. Self-review is not independent review. |
| 2026-09-20 | Acceptance-record consistency gate | five changed Markdown files | PASS | 158 local file links resolve with zero missing; stale 050 pending/next-core-action markers are absent and `git diff --check` passes. Only the unrelated CLI marker remains outside the document set. |

**Delivery:** Planning commit `535db15`; product/tests `9edda60`; this separate acceptance/status
record follows. No hosted DB/RPC/socket, real account/data, simulator/device, deploy, push or release
was run. The next ready bounded order-6 family is native per-member starred-message state; reactions,
polls, receipts and ephemeral social state remain separate.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Strict 044 action/acknowledgement boundary | yes | PASS | 2026-09-20, `9edda60`, focused coordinator/adapter tests | Exact three RPC shapes, UUID/message binding, malformed/wrong result, backend refusal and identical in-flight dedup pass. |
| Native copy/edit/delete/hide UX | yes | PASS | 2026-09-20, `9edda60`, React Native renderer | Accessible action/edit panels, sender/time/type hints, destructive confirmation/cancel and clipboard/backend errors pass; state changes only after accepted acknowledgement. |
| Room/tenant lifecycle and late-result refusal | yes | PASS | 2026-09-20, `9edda60`, focused lifecycle tests | Room departure ignores late results; tenant clear invalidates the coordinator and injected/default gateways participate in cache teardown. |
| Mobile/root compatibility and iOS/Android bundle resolution | yes | PASS | 2026-09-20, `9edda60`, local gates | Mobile 45/256, root 65/602/build and sequential 1,434-module iOS/Android exports pass. Exports are not simulator/device/runtime evidence. |
| Diff/authority/accessibility review, cleanup and records | yes | PASS | 2026-09-20, `9edda60`, local self-review | Exact outputs removed, 21,370,328 KiB free; only unrelated CLI marker remains dirty. Self-review is not independent review. |
| Hosted 044 RPC, real account/data, socket, simulator/hardware/provider/deploy/release | no — separately approved later gates | NOT RUN | no external authority | Blocks deployed/runtime/device claims, not bounded local implementation evidence. |
