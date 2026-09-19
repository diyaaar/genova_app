# 038 — Native chat feature and safety inventory

**Status / date / responsible writer:** IN PROGRESS / 2026-09-19 / primary agent

**Purpose and user need:** Fix an implementation-ready, feature-preserving sequence for native
chat so the first React Native room-list/read flow does not inherit unsafe room authority,
cross-tenant cache state or lossy Realtime behavior.

**Delivery focus:** This C3 document-only slice maps the current web chat, database contract,
Realtime/cache behavior and native adaptation boundary. It selects the earliest safe product
slice and preserves send/retry, media, reactions, polls, receipts, membership and administration
for later briefs rather than silently dropping them.

**Starting evidence:** C1 is accepted locally through 033. C2 has local contract evidence through
037, while schema/provider work is currently deferred. C3 has no native implementation. The web
surface is spread across `lib/chat.ts`, `lib/chat-cache.ts`, `hooks/useChatRealtime.ts`,
`store/useChatStore.ts`, `components/chat/` and the two chat routes. The repository's dated
7 September schema snapshot contains the deployed-at-that-date chat tables, policies, indexes and
publication state; no live schema query is authorized by this brief.

**Current work card:** Observable result: a reviewer can trace every current chat capability to
its data/authority boundary and a later native slice, while the first slice names all blockers and
failure evidence. Next actions: (1) inventory user behavior and dependencies; (2) audit room/RLS,
Realtime, cache and ordering boundaries; (3) record the split, validate the document and select the
next ready brief. Exit when all required document rows pass and no product/live claim is made.

**Resources:** Start snapshot: 12,095,892 KiB (~11.5 GiB) free; no generated web/native/DB output
is present. Document-only work has negligible peak allocation. Do not install dependencies, start
a database, build, allocate a simulator or create retained runtime output.

**Allowed files / modules:**

- This brief — authoritative C3 feature/safety inventory and sequential split.
- After acceptance only: `docs/mobil-teslim-plani.md`, `MIGRATION.md`,
  `memory-bank/activeContext.md`, `docs/agent-handoff.md` — concise status/link updates.
- Product, schema, migration, generated backup and test files are read-only in this slice.

**Sources / existing patterns:**

- `MIGRATION.md` and the delivery plan C3 row — native ownership and list/read-first sequence.
- `app/(main)/chat/`, `components/chat/`, `lib/chat.ts`, `lib/chat-cache.ts`,
  `hooks/useChatRealtime.ts`, `store/useChatStore.ts` — current web behavior.
- `backup_schema_2026-09-07.sql` plus chat/tenant migrations — dated schema, RLS, index and RPC
  evidence. The snapshot is repository evidence, not a fresh hosted-schema check.
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes),
  [Realtime authorization](https://supabase.com/docs/guides/realtime/authorization) and
  [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) —
  current official requirements for filtered changes, private Broadcast/Presence and RLS.

**Migration start check:**

- Read: `AGENTS.md`, handoff, active context, plan C3/resource controls, transition guide, work
  cycle, brief template, `MIGRATION.md`, current chat source and dated schema/migrations.
- Boundary: inventory only. Chat is native-owned; server authority remains Postgres/RLS and any
  later shared Edge/RPC path. Existing web behavior remains unchanged.
- Preserve: room types and membership, list/search/unread/hidden/mute, read/pagination, text and
  reply, optimistic retry, edit/delete/copy/star, reactions, polls, media/files/links/stickers,
  receipts/typing/presence, DM/group creation and room/member administration.
- Authority/writer: one primary writer; local document commits are authorized. No hosted query,
  migration, data write, provider, account, credential, deploy, CI, hardware or publication.
- Required proof: complete feature/data/safety trace; explicit blockers and later slices; local
  link/status/consistency checks and `git diff --check`. Revert the document commits to roll back.

**Out of scope:**

- React Native UI/adapters, shared chat contracts, web refactors or behavior fixes.
- RLS/index/RPC/Realtime policy changes, local or hosted Supabase, data fixtures and migrations.
- Google Drive replacement/upload, push delivery, native binaries, device tests or releases.
- Treating the dated schema backup as current hosted verification or existing web behavior as safe
  merely because it renders.

**Risk / authority / rollback:** An incomplete inventory could discard a current feature or make a
native client trust client-side room filtering. A broad inventory could also become an unbounded
rewrite plan. Group features by user outcome, name source authority and isolate the smallest safe
first slice. Document rollback is the two 038 commits; no product or external state changes.

**Small implementation steps:**

1. Trace the current list/read, mutation, media and administration surfaces to their data paths.
2. Record RLS/Realtime/cache/order blockers and split native delivery into bounded user flows.
3. Validate links, scope and status; record acceptance and the next single ready brief.

**Done definition:**

- [ ] Every current user-visible chat capability is preserved in a named native slice or marked as
      requiring an explicit product decision; no feature is silently removed.
- [ ] Tables/RPCs/Realtime/storage/cache and room/tenant authority are mapped with dated evidence,
      including inaccessible-room, choir-switch, reconnect, order, duplicate and offline cases.
- [ ] The first native product slice is small, observable and blocked from inheriting any known
      unsafe authority; later send/media/remaining features have explicit dependencies.
- [ ] Transition start/delivery controls and document-only link/status/diff gates pass.
- [ ] Diff is self-reviewed; no product/generated/unrelated file is changed, and concise status
      indexes identify the next ready work.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source and resource preflight | local repository | PASS | C1/C2 checkpoint, C3 sources, dated schema and official Supabase guidance identified; ~11.5 GiB free; no runtime allocated. |

**Delivery:** Pending inventory, document gate and record commit. Product/schema/live state remains
unchanged.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Current web feature preservation map | yes | NOT RUN | source trace in progress | Must cover list/read, mutations, media and room/member administration without silent deletion. |
| Data, RLS, Realtime, cache and ordering trace | yes | NOT RUN | repository schema/source review in progress | Hosted schema and real data remain outside authority. |
| Bounded native split and first-slice acceptance | yes | NOT RUN | pending synthesis | Must fail closed on room/tenant change and name later dependencies. |
| Local links, status consistency and `git diff --check` | yes | NOT RUN | pending final document gate | Document-only gate; no product build is required. |
| Product/schema/Realtime runtime/device/provider | N/A — inventory only | N/A | not executed | Required by later implementation and runtime briefs. |

