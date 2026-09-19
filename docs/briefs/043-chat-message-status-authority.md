# 043 — Durable chat message-status authority

**Status / date / responsible writer:** IN PROGRESS / 2026-09-19 / primary agent

**Purpose and user need:** Give delivered/read status a room-authorized, actor-bound and
server-timestamped write path without trusting caller identity or mutable client timestamps.

**Delivery focus:** This is the third bounded C3 order-3 authority slice. It repairs only
`chat_message_status` and introduces one idempotent database RPC. Core message edit/delete rules,
adoption by web/native clients, Broadcast/Presence privacy and Realtime publication/catch-up remain
separate packages.

**Starting evidence:** 038 found that message-status writes are same-choir/own-member only, not
message-room bound, and updates lack `WITH CHECK` or monotonic field guards. Repository search shows
no current table writer: web reads details only for its own message, while live read receipts are
caller-identified public-channel Broadcast. 041–042 locally repair prerequisite room and social
authority. The restored PostgreSQL 17 source is dated evidence, not fresh hosted state. Product is
`c58f4da`; status record is `c6e33d1`; the unrelated CLI marker remains unstaged.

**Current work card:** Observable result: authenticated room members can idempotently mark their own
status `delivered` then `read` through a server-clock RPC; repeated or late delivered calls never
regress timestamps; direct table writes, wrong-room/cross-choir/nonmember/other-identity writes and
invalid status values refuse. A sender can read all statuses for their own message; another room
member can read only their own row. Next: reversible DDL + matrix, guarded roundtrip after 041–042,
root gate, cleanup and record. No hosted operation.

**Resources:** 21,682,484 KiB (~20.7 GiB) free. Reuse the loopback PostgreSQL 17 source and one
guarded disposable clone; apply 041–042 as prerequisites and drop the clone. No download, Colima,
native build or provider is needed. Remove root build output after evidence; keep 10 GiB free.

**Allowed files / modules:**

- `supabase/migrations/20260919194500_chat_message_status_authority_043.sql`
- `supabase/rollback/043_chat_message_status_authority_down.sql`
- `supabase/tests/043_chat_message_status_authority.sql`
- `supabase/test-support/043_chat_message_status_authority_runner.sh`
- `lib/chat.ts` and focused tests only if current read compatibility requires a scoped repair.
- This brief and, after acceptance, concise plan/MIGRATION/active-context/handoff records.

**Sources / existing patterns:** [038](038-native-chat-feature-inventory.md),
[041](041-chat-room-membership-authority.md), [042](042-chat-social-membership-authority.md), dated
schema/003, `lib/chat.ts`, `MessageInfoModal`, `useChatRealtime`, and the 042 reversible runner.
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) remains the
policy reference.

**Migration start check:**

- Read relevant instructions/status/plan, 038–042, all status schema/policies/indexes/FKs, current
  callers and Broadcast behavior. Supabase/Postgres best-practice instructions remain in use.
- Preserve sender-only message-info UI and authorized own status meaning. Replace dormant direct
  writes with one authenticated RPC using server identity/time; do not claim client adoption.
- One primary writer. Local SQL/tests/commits and exact cleanup are authorized. No hosted query or
  migration, deploy, CI, credentials, real data/account, provider, hardware or publication.
- Proof: sender/reader/nonmember/two-room/two-choir matrix; direct-write refusal; delivered/read
  monotonic idempotency; invalid input; exact forward/down/re-forward and source baseline; root
  gate; cleanup and documentation checks.

**Out of scope:** client adoption, automatic delivery semantics, offline receipt queue, core message
mutation/time-window/delete-for-me, public-channel replacement, publication/private Realtime,
hosted state/application and native runtime/device acceptance.

**Risk / authority / rollback:** A permissive UPDATE can move a row or forge/regress times; a read
policy can expose every member's behavior to non-senders. Remove direct write policies, bind the RPC
to current room membership/member and server time, and expose all rows only to the message sender
while preserving own-row visibility. Down restores exact dated policies and removes only 043 API
objects. Hosted rollback remains separately approved.

**Done definition:**

- [ ] RPC writes only the current member in an accessible message room with server timestamps.
- [ ] Delivered/read transitions are idempotent and monotonic; direct/invalid/foreign writes refuse.
- [ ] Sender reads all message statuses; other members only own; nonmember/cross boundaries refuse.
- [ ] Forward/down/re-forward, exact prior state, source/root gates, cleanup and records pass.
- [ ] Hosted/client/Realtime/native boundaries remain explicit.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source/caller/resource preflight | repository at `c6e33d1`; restored loopback PostgreSQL 17 | PASS | Current web has one sender-only detail reader and no status-table writer; public Broadcast remains non-durable. 21,682,484 KiB free; no clone/build started. |

**Delivery:** Pending migration/test implementation and acceptance record.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Evidence and limit |
|---|---|---|---|
| Server-time own delivered/read RPC and idempotent monotonic progression | yes | NOT RUN | Pending local SQL matrix. |
| Direct/invalid/other-identity/inaccessible-room/cross-choir refusal | yes | NOT RUN | Pending two-room/two-choir matrix. |
| Sender-all versus member-own read visibility | yes | NOT RUN | Must preserve current sender info flow without room-wide disclosure. |
| Forward/down/re-forward, exact restore, source/root gates and cleanup | yes | NOT RUN | Disposable post-042 baseline only. |
| Client adoption/core messages/Realtime/native/hosted | N/A — later slices | N/A | Explicitly not executed. |
