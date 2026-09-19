# 045 — Idempotent chat text send and bounded retry

**Status / date / responsible writer:** ACCEPTED LOCALLY / 2026-09-19 / primary agent

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

- [x] Same key + same accepted payload returns one server ID after lost acknowledgement/retry;
      mismatched reuse and unauthorized scopes fail closed.
- [x] Web persists before send, restores after reload, exposes retry/cancel and reconciles duplicate
      acknowledgement/event without duplicate bubbles or silent removal.
- [x] Queue keys include account/choir/member/room; seven-day expiry, 50-item cap, failed writes and
      tenant teardown have explicit tested behavior and no confidentiality overclaim.
- [x] Exact forward/down/re-forward/source checks, focused tests and root `pnpm check` pass.
- [x] Diff/security/UX review, cleanup, disk/docs gates and later boundaries are recorded.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source/resource/ownership preflight | local product `621147e`, records `2891e51` | PASS | Direct insert + unkeyed mount retry/no controls reproduced in source. Existing source DB present, disposable target absent, 21,647,120 KiB free; no runtime/build started. |
| 2026-09-19 | First SQL matrix run | disposable PostgreSQL 17 clone | FAIL | The test itself queried the intentionally private send-key table while still under `authenticated`; PostgreSQL refused the query. No product criterion was weakened and the target was removed by the runner trap. |
| 2026-09-19 | Corrected forward/down/re-forward matrix | loopback PostgreSQL 17; 041–044 applied first | PASS | Same key/payload returns one ID/row, immutable hash survives later edit, mismatch/metadata/reply/nonmember/cross-choir/revoked-member paths refuse, sender-scoped same UUID is independent. Down restores exact post-044 API/schema/policy/data, source unchanged, target removed. |
| 2026-09-19 | Reload duplicate design review and repair | product source/self-review | PASS | The accepted server key is also exposed on its message row; fresh/cached snapshots reconcile and remove the matching temp item before render. Private mapping retains the immutable request hash. |
| 2026-09-19 | Focused web gates | local Vitest/lint/typecheck | PASS | Three files / 15 tests pass: RPC/no-key adapter, account/choir scope, TTL/capacity/write refusal/legacy migration, snapshot/ack dedup and retry/cancel controls. Focused lint and root typecheck pass. |
| 2026-09-19 | Unsafe runner target guard | local shell | PASS | `PGDATABASE=postgres` refuses with status 2 before database action; runner syntax and executable mode pass. |
| 2026-09-19 | Security/data/UX/diff review | migration, queue and web adoption | PASS | RPC derives actor/choir/room, fixes search path, hashes canonical payload and exposes no internal mapping privileges. Client persists before network, server metadata excludes local flags, failed bubbles show retry/cancel and seven-day retention. Self-review only. |
| 2026-09-19 | Final root `pnpm check` | local product `361ab7c` | PASS | Lint/typecheck, 60 test files/582 tests, coverage, service-worker syntax and Next production build pass. |
| 2026-09-19 | Cleanup/resource recheck | local filesystem/PostgreSQL | PASS | First direct-delete formulation was tool-refused before action; safe exact deletion removed `.next` 472,900 KiB and coverage 332 KiB. Disposable DB absent; 21,635,476 KiB (~20.6 GiB) free; CLI marker remains unstaged. |
| 2026-09-19 | Documentation consistency gate | five changed Markdown files | PASS | 136 local links resolve with zero missing targets/anchors; stale 045 pending/next-idempotency markers are absent and `git diff --check` passes. |

**Delivery:** Planning `339ac6e`; product/test `361ab7c`; this acceptance record follows.
Rollback is the scoped down plus product revert locally. A hosted down would discard retry mappings
and the message correlation column, so it remains a separately reviewed/approved data operation.
Next ready foundation: private room Realtime authorization/publication; status client adoption and
native list/read remain separate later packages.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Server idempotency and payload mismatch refusal | yes | PASS | 2026-09-19, `361ab7c`, loopback PostgreSQL 17 | One message/ID for repeated exact payload; changed room/content/reply/metadata refuses and the immutable hash survives edit. |
| Sender/member/room/choir/reply/revocation refusal | yes | PASS | 2026-09-19, local SQL matrix | Server-derived actor/choir plus room/reply membership matrix passes; revoked member cannot receive even an existing acknowledgement. |
| Queue scope, persistence, retention, capacity and write failure | yes | PASS | 2026-09-19, focused Vitest | Account/choir/member/room key, reload, seven-day TTL, 50 cap, quota refusal and legacy explicit-failure migration pass. Plain localStorage remains non-confidential. |
| Retry/cancel and duplicate acknowledgement/event reconciliation | yes | PASS | 2026-09-19, focused Vitest and diff review | Failed sender bubble exposes both actions; temp/server ID and fresh-snapshot mutation-key paths each collapse to one row. |
| Forward/down/re-forward, root compatibility and cleanup | yes | PASS | 2026-09-19, `361ab7c`, local only | Exact SQL roundtrip, 60/582/build, target/output removal and disk floor pass. Hosted/native/provider/device layers remain NOT RUN. |
