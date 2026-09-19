# 045 — Idempotent chat text send and bounded retry

**Status / date / responsible writer:** IN PROGRESS / 2026-09-19 / primary agent

**Purpose and user need:** Ensure a text, reply or link-preview message is stored once when the
network loses the acknowledgement, while giving the sender explicit retry and cancel controls.

**Delivery focus:** Complete C3 order 5's shared server contract and current web adoption for text
sends. Add a sender-scoped mutation key, one server RPC and a tenant-scoped bounded browser queue.
Sticker, poll, image/file upload, durable receipt adoption, private Realtime and React Native UI
remain later packages.

**Starting evidence:** Product `621147e` / records `2891e51` accept 044. `sendMessage` still inserts
directly and the web stores a temporary `ChatMessage` under a member/room-only localStorage key.
Mount retries once with no server-recognized key, has no retry/cancel controls and can create a
second row after an accepted insert whose response was lost. Tenant teardown clears chat caches,
but the queue has no age/count policy or explicit account/choir scope. The unrelated
`supabase/.temp/cli-latest` marker remains unstaged.

**Current work card:** Observable result: the same authenticated sender mutation key and identical
text payload always acknowledges the same server message; a changed payload, inaccessible room or
revoked membership refuses. Web reload restores a scoped pending/failed item, lets the sender retry
or cancel it, reconciles duplicate acknowledgements/events by server ID and never sends when the
durable queue write fails. Next actions: (1) implement reversible RPC/schema plus local matrix;
(2) adopt a seven-day, 50-item account/choir/member/room queue and explicit controls; (3) run focused
and root gates, review, clean and record. Exit only when all required rows pass.

**Resources:** 21,647,120 KiB (~20.6 GiB) free. Reuse loopback PostgreSQL 17 and the existing
`genova_008_test_restore` source with one disposable `genova_045_test_restore` clone; no download,
Colima, native build or second checkout. Run one root build at a time, remove the target and exact
generated outputs, and preserve the 10 GiB floor.

**Allowed files / modules:**

- `supabase/migrations/20260919213000_chat_text_send_idempotency_045.sql`, matching down/test/runner.
- `lib/chat.ts`, `lib/chat-cache.ts` and focused tests for the RPC and bounded queue contract.
- `components/chat/ChatRoom.tsx`, `components/chat/MessageBubble.tsx` and focused tests only as needed
  for retry/cancel/reconciliation adoption.
- This brief; final plan, `MIGRATION.md`, active-context and handoff records after product acceptance.

**Sources / existing patterns:**

- [038 inventory](038-native-chat-feature-inventory.md#sequential-c3-delivery-split) order 5 and its
  text/reply/offline preservation row.
- [044](044-chat-core-message-mutation-authority.md), its migration/runner and current chat source.
- [Supabase database functions](https://supabase.com/docs/guides/database/functions) and
  [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) for fixed search
  paths, explicit execution privileges and member-scoped data access.

**Migration start check:**

- Read: `AGENTS.md`, handoff, active context, plan C3/resource controls, transition guide, work
  cycle/template, 038/044, current chat/cache/store/Realtime source and dated schema.
- Boundary: shared Postgres authority plus current web text-send adoption. Chat remains native-owned;
  this brief does not build RN UI or move permanent server logic into a new Next route.
- Preserve: text/reply/link-preview content, optimistic display, reload recovery, other chat message
  kinds, existing edit/delete/hide behavior, and tenant teardown. Legacy pre-045 queued rows are
  shown failed for explicit user choice because they cannot be correlated to an old server insert.
- Authority/writer: one primary writer; scoped local SQL/code/tests/commits and exact cleanup are
  authorized. No hosted query/migration, deploy, CI, real account/data, credentials, provider,
  hardware, publication or spending.
- Required proof: same-key same-payload one row/one ID; mismatch, wrong sender/room/choir/reply and
  revoked membership refusal; down/re-forward and source unchanged; queue scope/TTL/capacity/write
  failure/reload/retry/cancel/duplicate reconciliation; focused and root gates; cleanup and docs.

**Out of scope:**

- Image/file/sticker/poll idempotency or upload recovery; message-status client adoption.
- Public-to-private Realtime changes, native list/read/send UI, push delivery or device runtime.
- Hosted schema/data, backup/deploy/publication, real users, credentials or live refusal claims.
- Claiming browser localStorage is encrypted/protected storage. Retained message text is plain local
  browser data, scoped and cleared on tenant transition, capped at 50 and expired after seven days.

**Risk / authority / rollback:** A weak key can deduplicate another payload; an unscoped queue can
leak text across tenants; deleting queue state before acknowledgement can silently lose a message.
The server compares the full accepted text/reply/metadata shape for key reuse, derives sender/choir,
and uses a unique sender/key index. The client persists before network, keeps failure state until
retry/cancel, and reconciles only the matching key. Down removes the RPC/index/nullable key while
preserving messages; reverting product and documentation commits is the code rollback. Any hosted
down would remove retry correlation and remains separately reviewed/approved.

**Small implementation steps:**

1. Add the nullable mutation key, exact idempotent text RPC, privileges and guarded roundtrip test.
2. Replace the legacy pending-message helpers with bounded scoped records and adopt send/retry/cancel.
3. Run focused SQL/web tests and `pnpm check`; inspect security/data/UI diffs, clean and record.

**Done definition:**

- [ ] Same key + same accepted payload returns one server ID after lost acknowledgement/retry;
      mismatched reuse and unauthorized scopes fail closed.
- [ ] Web persists before send, restores after reload, exposes retry/cancel and reconciles duplicate
      acknowledgement/event without duplicate bubbles or silent removal.
- [ ] Queue keys include account/choir/member/room; seven-day expiry, 50-item cap, failed writes and
      tenant teardown have explicit tested behavior and no confidentiality overclaim.
- [ ] Exact forward/down/re-forward/source checks, focused tests and root `pnpm check` pass.
- [ ] Diff/security/UX review, cleanup, disk/docs gates and later boundaries are recorded.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source/resource/ownership preflight | local product `621147e`, records `2891e51` | PASS | Direct insert + unkeyed mount retry/no controls reproduced in source. Existing source DB present, disposable target absent, 21,647,120 KiB free; no runtime/build started. |

**Delivery:** Pending implementation and acceptance records.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Server idempotency and payload mismatch refusal | yes | NOT RUN | Pending local SQL matrix | Must prove one row/ID and fail changed room/content/reply/metadata. |
| Sender/member/room/choir/reply/revocation refusal | yes | NOT RUN | Pending local SQL matrix | Server derives actor and current choir. |
| Queue scope, persistence, retention, capacity and write failure | yes | NOT RUN | Pending focused browser-unit tests | Plain localStorage limitation stays explicit. |
| Retry/cancel and duplicate acknowledgement/event reconciliation | yes | NOT RUN | Pending focused adapter/UI/store tests | No silent loss or duplicate bubble. |
| Forward/down/re-forward, root compatibility and cleanup | yes | NOT RUN | Pending | Hosted/native/provider/device layers remain unrun. |
