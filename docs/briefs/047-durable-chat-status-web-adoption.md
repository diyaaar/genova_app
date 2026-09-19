# 047 — Durable chat delivered/read web adoption

**Status / date / responsible writer:** IN PROGRESS / 2026-09-19 / primary agent

**Purpose and user need:** Make the current web room record and display durable delivered/read
state through 043's server-authorized RPC instead of treating an untrusted Broadcast payload as a
read receipt.

**Delivery focus:** Adopt `mark_chat_message_status` in the current web room with explicit semantics:
an inbound server message is **delivered** when this client has it in memory and **read** only while
the room document is visible and focused. Serialize writes, deduplicate monotonic upgrades in one
room scope, retry after a later activity/online signal, remove Broadcast read receipts, consume
authorized status-table changes for sender bubbles and hydrate persisted read state on reload.
Native adoption, offline-persisted receipt queues and global list delivery remain later packages.

**Starting evidence:** Product `bed8032` / records `82a3129` accept 046. The web writes only
`chat_room_members.last_read_at`; it never calls 043's RPC. Entering a room broadcasts a
caller-supplied member ID, and any received `read_receipt` marks every own bubble blue in process
memory. `MessageInfoModal` reads the durable table, so it normally shows no rows. The table is now
declared in 046's publication contract, but current source has no status Postgres Changes handler.
The unrelated `supabase/.temp/cli-latest` marker remains unstaged.

**Current work card:** Observable result: receiving/loading another member's server message queues
one monotonic durable status write; a hidden/unfocused room writes delivered, later active focus
upgrades to read, failures retry only on a later trigger, and sender bubbles/info derive from durable
rows rather than Broadcast. Next actions: (1) add a scoped one-at-a-time status coordinator and RPC
adapter; (2) adopt it in room snapshot/visibility/Realtime/UI paths; (3) run focused/root gates,
review, clean and record. Exit when all local required rows pass.

**Resources:** 21,677,152 KiB (~20.7 GiB) free. No DB clone, download, native build, VM or second
checkout. Reuse 043/046's recorded SQL evidence; run focused web tests and one root build, remove
exact `.next`/coverage outputs, and preserve the 10 GiB floor.

**Allowed files / modules:**

- `lib/chat.ts` and a focused framework-free status coordinator/test.
- One focused client hook/test, `hooks/useChatRealtime.ts` and its existing test.
- `components/chat/ChatRoom.tsx`, `MessageInfoModal.tsx` and focused tests only as required for
  adoption, persisted hydration and visible failure behavior.
- This brief; final plan, `MIGRATION.md`, active-context and handoff records after acceptance.

**Sources / existing patterns:**

- [043 durable authority](043-chat-message-status-authority.md),
  [046 private room contract](046-private-room-realtime-authorization.md), current room/snapshot/
  Realtime/info source and `lib/chat-mutations.test.ts`.
- 043 is the authority for actor, room, monotonic transition and server time; the client never
  writes member IDs or timestamps.

**Migration start check:**

- Read: `AGENTS.md`, handoff, active context, C3/resource controls, transition guide/work cycle,
  038/043/046 and current room/store/status/info source. No new migration is required.
- Boundary: current web room and shared framework-free coordinator only. Chat stays native-owned;
  this package does not implement React Native UI or a new server route.
- Preserve: room unread update, message snapshot/cache, sender bubble icons, info modal, typing and
  Presence. Replace only the false Broadcast receipt authority. Typing/Presence identity remains an
  explicitly untrusted ephemeral hint under 046's room-membership boundary.
- Authority/writer: one primary writer; scoped local code/tests/commits and exact cleanup are
  authorized. No hosted query/migration, socket/provider, deploy, CI, real account/data,
  credentials, hardware, publication change or spending.
- Required proof: own/temp exclusion; hidden delivered then focused read; monotonic dedup and one
  in-flight write; retry after failure without busy loop; room/member scope reset; no Broadcast
  receipt; authorized status event and reload hydration; info error is not shown as empty; root gate.

**Out of scope:**

- Claiming provider/device delivery, background OS delivery, exactly-once receipt writes or a
  persisted offline receipt queue. The RPC is idempotent; the client queue is process-memory only.
- Global chat-list delivery, app-wide status collection, reconnect snapshot recovery or native
  receipt adoption.
- Trusted actor identity for typing/Presence, private global channel/delete-event work, hosted
  application/socket verification or project Realtime settings.
- Changing 043 schema/RPC semantics, direct status-table writes or client timestamps.

**Risk / authority / rollback:** Marking all fetched history read while a background tab is hidden
creates false receipts; firing one effect per render creates request storms; retaining queue state
across a tenant switch can write the wrong scope. Activity requires visible + focused; hidden data
is at most delivered. The coordinator accepts only server UUID messages from other senders,
serializes, upgrades delivered→read only, pauses a failed ID until a later flush and resets on exact
member/room scope. Server RPC rechecks current authority/time. Revert the product commit to restore
the prior Broadcast-only UX; no data rollback is required because durable monotonic receipts remain
valid observations.

**Small implementation steps:**

1. Add/test the RPC adapter, eligible-message planner and scope-safe serialized status queue.
2. Adopt room activity writes, persisted read hydration and status changes; remove read Broadcast
   and make info-load failure visible/retryable.
3. Run focused/root gates; inspect semantics/lifecycle/diff, clean and record.

**Done definition:**

- [ ] Inbound server messages write delivered/read according to activity; own/temp rows never write.
- [ ] Dedup, monotonic upgrade, serialization, later-trigger retry and scope reset pass focused tests.
- [ ] Broadcast read receipt is absent; durable table events/reload drive sender read state and info
      errors are visibly distinct from no rows.
- [ ] Focused tests and root `pnpm check` pass; self-review, cleanup, disk/docs and external
      boundaries are recorded.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source/resource/ownership preflight | local product `bed8032`, records `82a3129` | PASS | Only unrelated CLI marker is dirty; 21,677,152 KiB free. Direct `last_read_at` plus Broadcast-only bubble state reproduced; 043 RPC/info reader exist but no client writer/status event handler. No runtime/build started. |

**Delivery:** Pending planning commit, product/test commit and separate acceptance-record commit.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Activity semantics, eligibility, monotonic dedup and serialized retry | yes | NOT RUN | pending focused unit/hook tests | Must distinguish delivered/read from provider guarantees. |
| Durable RPC/event/reload adoption and Broadcast removal | yes | NOT RUN | pending focused adapter/Realtime/UI tests | Existing 043 SQL authority is historical local evidence, not rerun here. |
| Info empty/error behavior and compatibility | yes | NOT RUN | pending focused component test | Failure must not be rendered as “Henüz bilgi yok”. |
| Root compatibility, diff review and cleanup | yes | NOT RUN | pending local root gate | Self-review only; exact generated outputs must be removed. |
| Hosted/native/provider/socket runtime | no — separately approved later gate | NOT RUN | no external authority | Blocks deployed/native receipt claims, not this bounded local web adoption. |
