# 044 — Core chat message mutation authority

**Status / date / responsible writer:** IN PROGRESS / 2026-09-19 / primary agent

**Purpose and user need:** Make edit, delete-for-everyone and delete-for-me actually work under
server authority without letting clients rewrite message identity, shared metadata or time rules.

**Delivery focus:** Complete the core-message mutation part of C3 order 3. Introduce server-owned
edit/delete RPCs, a per-member hidden-message relation and web adoption. Sending remains direct but
is tightened for authenticated room membership and same-room replies. Idempotent send/retry,
publication/private Realtime, native list/read and media/poll semantics remain later packages.

**Starting evidence:** Dated RLS lets a sender update every mutable `chat_messages` column and has
no `WITH CHECK`; the one-hour edit/delete rule exists only in `MessageContextMenu`. `deleteMessageForMe`
attempts to append a member ID into shared `metadata_json`, fails for non-senders under current RLS,
and no read path filters that metadata. 041–043 locally establish room/social/status authority.
Product/status checkpoint is `1434464` / `eb45b41`; unrelated CLI marker stays unstaged.

**Current work card:** Observable result: a room member can hide a message only for self; the sender
can edit an undeleted text message or delete any own message for everyone only within one hour;
identity/room/sender/type/reply/created time and shared metadata cannot be rewritten through direct
UPDATE. Web uses the RPCs and hidden rows disappear from authorized reads. Next: reversible schema/
RPC/policy + local matrix, web adapter tests, root/mobile-relevant gates, cleanup and records.

**Resources:** 21,680,196 KiB (~20.7 GiB) free. Reuse loopback PostgreSQL 17 with one disposable
clone and prerequisites 041–043; no Colima/download/native build. One root build at a time; remove
generated output and preserve 10 GiB.

**Allowed files / modules:**

- `supabase/migrations/20260919201500_chat_core_message_authority_044.sql`, matching down/test/runner.
- `lib/chat.ts` and focused tests for edit/delete/hide RPC adoption.
- This brief and final plan/MIGRATION/active-context/handoff records.

**Required design:**

- Remove direct authenticated message UPDATE authority. SECURITY DEFINER RPCs derive current
  member/choir and server time, verify room membership, sender, message state/type and one-hour age.
- `hide_chat_message_for_self` inserts an idempotent `(message_id, member_id)` record; it never
  mutates shared message content/metadata. Message SELECT excludes only the current member's hidden
  rows while other room members retain the message.
- Tightened INSERT keeps current web send/poll/image/sticker shapes, rejects foreign sender/room,
  and requires any reply target to be in the same room/choir.
- Down restores exact prior policies/API state and removes only 044 relation/helpers.

**Authority/boundaries:** One writer. Local code/SQL/tests/commits and exact cleanup are authorized.
No hosted query/migration, deploy, CI, credentials, real account/data, provider, hardware or
publication. This is not send idempotency, file security, poll anonymity, Realtime privacy or native
runtime acceptance. Hosted application later needs fresh backup/restore and explicit approval.

**Required proof:** Sender/member/nonmember/two-room/two-choir matrix; 59:59 success and expired
boundary refusal; non-text edit, deleted edit, other-sender and direct UPDATE refusal; same-room
reply success/cross-room reply refusal; per-member hide isolation/idempotency; exact forward/down/
re-forward and source baseline; focused web adapter behavior; root gate; cleanup and doc checks.

**Done definition:**

- [ ] Edit/delete-everyone are sender-only, server-timed, one-hour bounded and field constrained.
- [ ] Delete-for-me uses per-member server state and affects no other member/shared message field.
- [ ] Send/reply membership and same-room identity checks pass; direct UPDATE/refusal matrix passes.
- [ ] Web adapters use RPCs; focused and root gates pass without feature loss.
- [ ] Roundtrip, cleanup, disk/docs gates pass; later hosted/Realtime/native work stays explicit.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Action | Result | Evidence / limit |
|---|---|---|---|
| 2026-09-19 | Source/resource/ownership preflight | PASS | Current UI/RLS/data path inspected; delete-for-me has no working per-user read filter and hour rule is client-only. 21,680,196 KiB free; no clone/build started. |

**Delivery:** Pending implementation and acceptance record.

## Mandatory acceptance evidence

| Criterion | Required? | Status | Evidence / limit |
|---|---|---|---|
| Sender edit/delete one-hour and constrained fields | yes | NOT RUN | Pending local SQL matrix. |
| Per-member hide isolation and idempotency | yes | NOT RUN | Pending relation/RLS/RPC matrix and web adoption. |
| Send/reply/direct-update/foreign authority refusals | yes | NOT RUN | Pending two-room/two-choir matrix. |
| Web focused/root compatibility and full roundtrip cleanup | yes | NOT RUN | Pending. |
| Send idempotency/Realtime/native/hosted/media semantics | later slices | N/A | Explicitly not executed. |
