# 041 — Chat room-membership authority repair

**Status / date / responsible writer:** ACCEPTED LOCALLY / 2026-09-19 / primary agent

**Purpose and user need:** Stop an authenticated choir member from joining an arbitrary same-choir
room or changing membership authority fields while preserving creator/admin member management and
each member's own read/mute/hide preferences.

**Delivery focus:** This is the first bounded part of C3 order 3. It repairs only
`chat_room_members` insert/update authority and immutable identity fields. Broad reaction/poll/star
policies, message mutations, publication, private Broadcast/Presence and native runtime remain
sequential packages; they are not hidden or accepted here.

**Starting evidence:** 038 found that dated policy `Add room members` permits
`member_id = current_chat_member_id()` for any same-choir room, while `Update own membership` has
no `WITH CHECK` or column guard. Current web uses self updates for `nickname`, `last_read_at`,
`notifications_enabled` and `hidden_at`, creator/admin inserts for room members, and admin role
updates. 040 at `2dfe6ab` defines the read contract but does not change authority. Product/status
record is `b3bd07a`; the unrelated `supabase/.temp/cli-latest` remains unstaged.

**Current work card:** Observable result: same-choir non-members cannot self-join, a member cannot
self-promote or move/reidentify their membership, creator/admin add and admin role update still
work, and own preference updates still work. Next actions: (1) add reversible policy/trigger DDL and
a two-room/two-choir role matrix; (2) run guarded forward/down/restored-forward against a disposable
clone of the restored local PostgreSQL 17 source; (3) run web/root compatibility, clean and record.
Exit with all rows passing or leave the package open without any hosted operation.

**Resources:** Start after cleanup correction: 21,691,844 KiB (~20.7 GiB) free. A previously
unregistered, stopped `colima-genova033` data disk was found at 6,072,144 KiB and removed under the
owner's standing temporary-output cleanup request; no other Colima profile/cache was removed and
`.colima` now uses 24 KiB. The existing loopback PostgreSQL 17 source
`genova_008_test_restore` is 15,382,195 bytes. Use a guarded disposable database clone only;
no Colima/Docker/download/build is required. Drop the clone after evidence, then remove root build
outputs and preserve the 10 GiB floor.

**Allowed files / modules:**

- `supabase/migrations/20260919190000_chat_room_membership_authority_041.sql` — forward repair and
  rollback metadata.
- `supabase/rollback/041_chat_room_membership_authority_down.sql` — exact prior-policy restore.
- `supabase/tests/041_chat_room_membership_authority.sql` — synthetic role/room/choir matrix.
- `supabase/test-support/041_chat_room_membership_authority_runner.sh` — guarded local clone,
  roundtrip, baseline and cleanup.
- `lib/chat.ts` and focused tests only if the exact current creator/admin flow exposes a required
  compatibility repair; scope expansion must be recorded before editing.
- This brief and, after acceptance, plan/MIGRATION/active-context/handoff records.

**Sources / existing patterns:**

- [038](038-native-chat-feature-inventory.md) and [040](040-shared-chat-read-contract.md) — blocker,
  order and unchanged read/runtime boundaries.
- `backup_schema_2026-09-07.sql` and `20260903214901_tenant_schema_003.sql` — dated policies,
  current-choir/member helpers and same-tenant trigger contract; not fresh hosted evidence.
- `lib/chat.ts`, `ChatRoomList` and `RoomInfoDrawer` — current creator/admin/self-update behavior.
- 024 migration/test/runner — reversible local-clone and role-matrix pattern.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) — current
  official policy semantics. Policy predicates use indexed membership/room keys and server-derived
  current member/choir helpers; client identity is not authority.

**Migration start check:**

- Read: `AGENTS.md`, handoff, active context, plan controls/C3, 038–040, transition guide/work
  cycle/template, relevant decisions, dated schema/migration, all membership policies, callers and
  024's local migration pattern. Supabase and Postgres best-practice skill instructions were used.
- Boundary: shared database authority DDL and synthetic local verification only. Web behavior is
  preserved; native remains unimplemented. This is not the full chat authority/Realtime package.
- Preserve: room creator bootstrap/member add, admin add/remove/role update, self leave and own
  nickname/read/mute/hide updates, current-choir restrictive policy and tenant-link trigger.
- Authority/writer: one primary writer; local SQL/test/commits and owned temporary DB cleanup are
  authorized. No hosted query/migration/write, deploy, CI, credential, real data/account, provider,
  hardware or publication. A future hosted application needs fresh backup/restore and approval.
- Required proof: creator/admin/nonmember/self role matrix across two rooms/two choirs; immutable
  ID/room/member/choir/joined fields; policy/function/trigger forward state; exact down restore;
  restored-forward; source/fixture baseline; focused SQL, root `pnpm check`, cleanup/disk floor.

**Out of scope:**

- Reactions, polls, votes, stars, messages/status, one-hour rules or atomic room creation RPC.
- Realtime publication, `realtime.messages` policy, private channel/client changes or catch-up.
- Live schema comparison/application, new backup, production/web deploy or real-user fixtures.
- Treating local RLS success as proof that the hosted 7 September snapshot is still current.

**Risk / authority / rollback:** A policy-only repair could still let a self-update change `role`,
`room_id`, `member_id`, `choir_id`, `id` or `joined_at`; a trigger-only repair could preserve the
arbitrary self-add path. Use both fail-closed policies and a narrow update guard. Local tests run in
a disposable database cloned from the restored source, with transaction-local synthetic rows.
Rollback restores the captured prior policies and removes only 041 objects. Hosted rollback would
be a separately approved operation after fresh backup/restore proof.

**Small implementation steps:**

1. Store prior insert/update policy definitions, replace self-add/update paths and add the update
   guard without weakening existing restrictive tenant isolation.
2. Prove creator/admin/self and refusal cases, forward/down/restored-forward and source baseline in
   a guarded disposable local PostgreSQL 17 clone.
3. Run root compatibility, self-review DDL/API impact, clean exact outputs and update records.

**Done definition:**

- [x] Same-choir nonmember self-add and self role/identity escalation fail closed.
- [x] Creator/admin member management and own preference/read-state updates still pass.
- [x] Two-room/two-choir matrix, forward/down/restored-forward and exact prior restore pass.
- [x] Source/fixture baseline, root `pnpm check`, cleanup and 10 GiB floor pass.
- [x] Diff/DDL review and documentation gates pass; hosted/live/Realtime remain explicitly open.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source/resource/ownership preflight | local repository at `b3bd07a` | PASS | PostgreSQL 17 loopback source exists and is ~14.7 MiB; no DB clone/runtime started. Exact orphan `colima-genova033` disk (6,072,144 KiB) was inactive/unregistered and removed; free space rose to 21,691,844 KiB. |
| 2026-09-19 | Guarded forward/down/restored-forward runner | loopback PostgreSQL 17, disposable `genova_041_test_restore` cloned from `genova_008_test_restore` | PASS | Final role/room/choir matrix passed after the idempotent admin-role case was added. Exact prior policies/triggers/data restored on down; source baseline stayed unchanged; target was dropped. Dated local source is not fresh hosted evidence. |
| 2026-09-19 | Runner name/refusal guard | local shell | PASS | Shell syntax passed and an unsafe database name was refused before any database action. One earlier wrapper invocation used zsh's read-only `status` name and stopped before the runner; the corrected invocation passed. |
| 2026-09-19 | Root `pnpm check` | local repository, product `cb4e7ec` | PASS | Lint/typecheck, 58 test files / 571 tests, configured coverage, service-worker syntax and Next production build passed. |
| 2026-09-19 | DDL/API/diff review | four product/test files | PASS | Insert authority is creator/admin only; the trigger keeps identity immutable and separates member preferences from admin role writes. Existing indexed room/member keys are reused; forward and down are atomic. Self-review only, not independent review. |
| 2026-09-19 | Generated-output/database cleanup | local filesystem/PostgreSQL | PASS | Disposable database is absent; exact `.next` (472,608 KiB) and `coverage` (332 KiB) were removed. 21,684,548 KiB (~20.7 GiB) remained free; unrelated CLI marker stayed unstaged. |
| 2026-09-19 | Documentation consistency gate | five changed Markdown files | PASS | 120 local links resolve with zero missing; stale 041 pending/next-general-authority markers are absent; `git diff --check` passes. |

**Delivery:** Planning commit `87bea4b`; product/test commit `cb4e7ec`; this acceptance/status
record follows separately. Rollback is the scoped down migration locally, or the product commit
before hosted application. Next: a separate secondary-chat RLS package for reactions, polls,
votes, stars and message status; publication/private Realtime remains a later slice.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Nonmember self-add and member self-escalation/identity mutation refuse | yes | PASS | 2026-09-19, `cb4e7ec`, local two-room/two-choir SQL matrix | Same-choir and cross-choir self-add plus ID/room/member/choir/joined-at and role escalation refuse. |
| Creator/admin add/remove/role and own preference/read-state compatibility | yes | PASS | 2026-09-19, `cb4e7ec`, local SQL matrix | Creator multi-row bootstrap, admin add/remove/idempotent role writes, self leave and own nickname/read/mute/hide updates pass. |
| Forward/down/restored-forward and exact prior policy/trigger state | yes | PASS | 2026-09-19, guarded local runner | Atomic forward and down pass; exact prior policy/trigger snapshots restore; second forward passes. |
| Source/fixture baseline and root web/shared gate | yes | PASS | 2026-09-19, loopback PostgreSQL/root `pnpm check` | Source/fixture hashes unchanged; target removed; 58 files/571 tests and production build pass. |
| Diff/DDL review, cleanup, disk floor and records | yes | PASS | 2026-09-19, local source/filesystem/docs | Scoped four-file product commit; build outputs removed; ~20.7 GiB free; 120 local links and diff check pass; unrelated marker preserved. |
| Secondary chat RLS/Realtime/native runtime/hosted | N/A — later C3 slices | N/A | not executed | Explicitly remains open. |
