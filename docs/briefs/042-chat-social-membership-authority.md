# 042 — Chat social membership authority

**Status / date / responsible writer:** ACCEPTED LOCALLY / 2026-09-19 / primary agent

**Purpose and user need:** Stop same-choir users from reading or mutating reactions, polls, votes
and stars outside rooms they belong to, while preserving the current web member flows and
idempotent reaction/vote upserts.

**Delivery focus:** This is the second bounded part of C3 order 3. It repairs only
`chat_reactions`, `chat_polls`, `chat_poll_votes` and `chat_starred_messages`. Durable
`chat_message_status`, core message mutation rules, publication/private Broadcast/Presence and
native runtime remain separate sequential packages.

**Starting evidence:** 038 found broad permissive same-choir policies that override narrower room
checks. 041 at `cb4e7ec` locally repairs room-membership authority but does not change these four
tables. Current web uses reaction and vote `upsert`, own delete, poll creation by a message sender,
room-scoped reads and own stars. The local restored PostgreSQL 17 source confirms the dated policy
set and indexes; it is not fresh hosted evidence. Product/status record is `1bb9c17`; the unrelated
`supabase/.temp/cli-latest` remains unstaged.

**Current work card:** Observable result: only current room members can read the four social
surfaces; a member can add/remove only their own reaction/vote/star; only the current sender may
attach a poll to their message; no-op reaction/vote upserts remain compatible and identity-changing
updates refuse. Next actions: (1) add reversible policies, a no-op update guard and synthetic
two-room/two-choir matrix; (2) run forward/down/restored-forward on a disposable clone with 041
applied first; (3) run root compatibility, clean and record. Exit with all required rows passing or
leave the package open without a hosted operation.

**Resources:** 21,688,352 KiB (~20.7 GiB) free after 041 cleanup. Reuse the existing loopback
PostgreSQL 17 source `genova_008_test_restore`; clone only to a guarded disposable database, apply
041 as the sequential baseline and drop it after evidence. No Colima/Docker/download/native build
is required. Root build output must be removed after evidence; preserve the 10 GiB floor.

**Allowed files / modules:**

- `supabase/migrations/20260919193000_chat_social_membership_authority_042.sql` — forward repair,
  rollback metadata and no-op upsert guard.
- `supabase/rollback/042_chat_social_membership_authority_down.sql` — exact prior-policy/trigger
  restore to the post-041 baseline.
- `supabase/tests/042_chat_social_membership_authority.sql` — synthetic member/nonmember/room/choir
  matrix and current-web compatibility.
- `supabase/test-support/042_chat_social_membership_authority_runner.sh` — guarded local clone,
  041 prerequisite, roundtrip, baseline and cleanup.
- `lib/chat.ts` and focused tests only if the exact web calls expose a required compatibility
  repair; record any expansion before editing.
- This brief and, after acceptance, plan/MIGRATION/active-context/handoff records.

**Sources / existing patterns:**

- [038](038-native-chat-feature-inventory.md), [040](040-shared-chat-read-contract.md) and
  [041](041-chat-room-membership-authority.md) — feature order, shared read boundary and accepted
  room-membership authority prerequisite.
- `backup_schema_2026-09-07.sql`, tenant migration 003 and the restored local source — dated
  policies, keys, indexes and same-tenant triggers; not fresh hosted evidence.
- `lib/chat.ts`, `ChatRoom`, poll and starred-message components — reaction/vote upsert, poll
  creation, own delete/star and read behavior that must remain compatible.
- 041 migration/test/runner — reversible sequential local-clone pattern.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) — policy
  predicates use indexed message/poll/membership keys and server-derived current member/choir.

**Migration start check:**

- Read: `AGENTS.md`, handoff, active context, plan controls/C3, 038–041, transition guide/work
  cycle/template, dated schema/migration, all four tables' policies/indexes/keys and web callers.
  Supabase and Postgres best-practice skill instructions remain in use.
- Boundary: shared database authority DDL and synthetic local verification only. This is not
  durable receipts, core-message rules, full chat authority, Realtime or native implementation.
- Preserve: authorized room-member reads, reaction/vote idempotent upserts and own removal, poll
  creation by the current message sender, and own star add/list/remove.
- Authority/writer: one primary writer; local SQL/tests/commits and exact temporary DB/build cleanup
  are authorized. No hosted query/migration/write, deploy, CI, credential, real data/account,
  provider, hardware or publication. Hosted application later needs fresh backup/restore and
  explicit approval.
- Required proof: two rooms/two choirs with member/nonmember/current/other identity cases; no-op
  upsert compatibility; identity-changing update refusal; forward/down/restored-forward; exact
  policy/trigger/data restore; source/fixture baseline; root `pnpm check`; cleanup/disk floor.

**Out of scope:**

- `chat_message_status`, durable receipt semantics, typing or Presence.
- Core message edit/delete/time-window/delete-for-me rules and atomic poll/message creation.
- Poll closing/multiple-choice/anonymity business rules or changing current product behavior beyond
  room and actor authority.
- Realtime publication, `realtime.messages` policy, private channel/client changes or catch-up.
- Live schema comparison/application, new backup, production/web deploy or real-user fixtures.

**Risk / authority / rollback:** Removing broad policies without explicit authenticated replacements
could break web reads or PostgREST upserts. Keeping UPDATE broad would let users move a reaction or
vote to another message, poll, member or option. Use explicit room-membership policies and a trigger
that accepts only an exact no-op row update for current reaction/vote upserts. Local tests run in a
disposable clone; down restores exact captured policies and removes only 042 objects. Hosted
rollback is separately approved after fresh backup/restore proof.

**Small implementation steps:**

1. Capture prior policy definitions; replace broad paths with explicit authenticated room-member
   reads and actor-owned writes; add exact no-op update guards for reaction/vote upserts.
2. Prove all success/refusal paths and forward/down/restored-forward on a clone with 041 applied.
3. Run root compatibility, self-review DDL/query/index impact, clean outputs and update records.

**Done definition:**

- [x] Nonmembers cannot read or mutate reactions, polls, votes or stars in another room.
- [x] Room members retain reads, own add/remove/star and sender poll creation.
- [x] Reaction/vote no-op upserts pass; identity-changing or other-member writes refuse.
- [x] Forward/down/restored-forward, exact prior restore, source baseline and root gate pass.
- [x] Diff/DDL review, cleanup, disk floor and documentation gates pass; later slices stay open.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source/resource/ownership preflight | local repository at `1bb9c17`; restored loopback PostgreSQL 17 | PASS | 23 dated policies and supporting keys/indexes inspected read-only; 21,688,352 KiB free; no clone/build/runtime started. |
| 2026-09-19 | Guarded forward/down/restored-forward runner | loopback PostgreSQL 17, disposable `genova_042_test_restore`, 041 applied first | PASS | Final four-table room/member/actor matrix passed twice. Exact post-041 policies/triggers/indexes/data restored on down; source baseline stayed unchanged; target was dropped. Dated local source is not hosted evidence. |
| 2026-09-19 | Runner name/refusal guard | local shell | PASS | Shell syntax passed and an unsafe database name was refused before any database action. |
| 2026-09-19 | Root `pnpm check` | local repository, product `c58f4da` | PASS | Lint/typecheck, 58 test files / 571 tests, configured coverage, service-worker syntax and Next production build passed. |
| 2026-09-19 | DDL/query/index/diff review | four product/test files | PASS | Fifteen broad/duplicated policies become thirteen authenticated room/actor policies; security-definer helpers are auth-bound and public execution is revoked. Exact no-op upserts pass; two supporting read indexes were added. Self-review only. |
| 2026-09-19 | Generated-output/database cleanup | local filesystem/PostgreSQL | PASS | Disposable database is absent; exact `.next` (472,612 KiB) and `coverage` (332 KiB) were removed. 21,683,500 KiB (~20.7 GiB) remained free; unrelated CLI marker stayed unstaged. |
| 2026-09-19 | Documentation consistency gate | five changed Markdown files | PASS | 125 local links resolve with zero missing; stale 042 pending/next-secondary-RLS markers are absent; `git diff --check` passes. |

**Delivery:** Planning commit `467e08d`; product/test commit `c58f4da`; this acceptance/status
record follows separately. Rollback is the scoped down migration locally, or the product commit
before hosted application. Next: durable `chat_message_status` room/actor authority; core message
rules and publication/private Realtime remain later slices.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Room-member reads and nonmember/cross-room/cross-choir refusal on all four surfaces | yes | PASS | 2026-09-19, `c58f4da`, local SQL matrix | Every table is exercised across two rooms/two choirs; same-choir nonmember sees zero. |
| Own reaction/vote/star and sender-poll compatibility | yes | PASS | 2026-09-19, `c58f4da`, local SQL matrix | Own add/remove and current-sender poll creation pass; exact reaction/vote conflict upserts pass. |
| Other-member and identity-changing mutation refusal | yes | PASS | 2026-09-19, `c58f4da`, local SQL matrix | Other-member insert/delete and inaccessible-room writes refuse; reaction/vote changes raise 42501. |
| Forward/down/restored-forward, exact prior state and source baseline | yes | PASS | 2026-09-19, guarded local runner | Exact post-041 policy/trigger/index/data snapshots restore; second forward passes; source unchanged. |
| Root gate, review, cleanup, disk floor and records | yes | PASS | 2026-09-19, local source/filesystem/docs | Root 58 files/571 tests/build pass; DB/build outputs removed; ~20.7 GiB free; 125 links and diff check pass. |
| Message status/core message/Realtime/native runtime/hosted | N/A — later C3 slices | N/A | not executed | Explicitly remains open. |
