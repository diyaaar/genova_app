# 042 — Chat social membership authority

**Status / date / responsible writer:** IN PROGRESS / 2026-09-19 / primary agent

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
- Poll closing/multiple-choice business rules or changing current product behavior beyond room and
  actor authority.
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

- [ ] Nonmembers cannot read or mutate reactions, polls, votes or stars in another room.
- [ ] Room members retain reads, own add/remove/star and sender poll creation.
- [ ] Reaction/vote no-op upserts pass; identity-changing or other-member writes refuse.
- [ ] Forward/down/restored-forward, exact prior restore, source baseline and root gate pass.
- [ ] Diff/DDL review, cleanup, disk floor and documentation gates pass; later slices stay open.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source/resource/ownership preflight | local repository at `1bb9c17`; restored loopback PostgreSQL 17 | PASS | 23 dated policies and supporting keys/indexes inspected read-only; 21,688,352 KiB free; no clone/build/runtime started. |

**Delivery:** Pending migration/test implementation and acceptance record.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Room-member reads and nonmember/cross-room/cross-choir refusal on all four surfaces | yes | NOT RUN | pending local SQL matrix | Must exercise every table, not infer from one helper. |
| Own reaction/vote/star and sender-poll compatibility | yes | NOT RUN | pending local SQL matrix | Includes PostgREST-style no-op upsert conflict behavior. |
| Other-member and identity-changing mutation refusal | yes | NOT RUN | pending local SQL matrix | Reaction/vote row identity must be immutable. |
| Forward/down/restored-forward, exact prior state and source baseline | yes | NOT RUN | pending guarded runner | Disposable post-041 baseline only. |
| Root gate, review, cleanup, disk floor and records | yes | NOT RUN | pending | Preserve unrelated CLI marker unstaged. |
| Message status/core message/Realtime/native runtime/hosted | N/A — later C3 slices | N/A | not executed | Explicitly remains open. |
