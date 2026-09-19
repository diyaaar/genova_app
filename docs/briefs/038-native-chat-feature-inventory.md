# 038 — Native chat feature and safety inventory

**Status / date / responsible writer:** DOCUMENTATION ACCEPTED / 2026-09-19 / primary agent

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

## Current capability preservation map

| User capability | Current web behavior and source | Native treatment / dependency |
|---|---|---|
| Room list and discovery | `get_chat_rooms_for_member` returns membership, room, last message, unread/member counts and previews; the UI sorts by activity, searches name/description, shows DM identity, unread count, mute/hidden state and online avatars. A hidden room resurfaces after newer activity. | First read slice preserves authorized room list, DM names, last-message meaning, unread/empty/error/refresh and hidden-room resurfacing. Search may remain on loaded rooms. Online avatars wait for authorized Presence. |
| Room resolution and reading | A slug or UUID is resolved through `chat_room_members`; the newest 40 messages, sender/reply relations, reactions, stars and members are fetched, reversed for display and older pages load on upward scroll. Entering updates `last_read_at`. | First read slice uses a canonical room ID obtained only through current-membership authority. It preserves reply/deleted/edited/media/poll/sticker display semantics even when their write controls arrive later. Pagination must use a stable `(created_at, id)` cursor and deduplicate by server ID. |
| Live room and list state | Postgres Changes supplies message/reaction mutations; Broadcast supplies typing/read receipts; Presence supplies online members. The list also subscribes to room and current-membership changes. | Postgres Changes is reconciled with a fresh authorized snapshot after subscribe/reconnect and choir change. Broadcast/Presence stays deferred until private topic authorization is proved. No Realtime event is an authorization source. |
| Text, reply and offline retry | Text/reply/link-preview sends are optimistic. Pending text is stored in browser `localStorage`, retried once when the room mounts online and marked failed on error. | Later send/retry slice requires a server-recognized idempotency key, explicit pending/failed/retry/cancel UI, process-restart recovery and account/choir-scoped teardown. A lost response must not create a duplicate message. |
| Message actions | Reply, copy, star, reactions, message info, edit, delete-for-everyone and delete-for-me are exposed. The one-hour edit/delete rule is UI-only; delete-for-me mutates shared message metadata. | Later mutation slice moves time/ownership and per-user deletion authority server-side, preserves concurrent updates and proves refusal for other sender/room/choir. Copy uses native clipboard capability. |
| Polls, receipts and social signals | Poll create/vote/remove, reaction add/remove, star panels, delivered/read detail, typing and Presence are separate UI paths. | Later social slice preserves each feature only after room-scoped RLS, private topic authorization and authoritative receipt semantics. Current Broadcast receipt is not accepted as durable status evidence. |
| Images, files, links and stickers | Up to five images are base64-uploaded through the Drive path and made public; room avatar uses the same path. Gallery, link preview/list, derived file list and emoji stickers are rendered. The TypeScript union includes `file`, while the dated DB check constraint does not. | Media slice waits for the shared file/upload contract and Drive-exit direction. It must preserve upload failure/cancel/retry, MIME/size/access, expired authorization and cleanup; public URLs are not copied as the native security model. Sticker/poll rendering remains in read compatibility. |
| DM/group and room administration | Users create DM/custom rooms, reuse a discovered two-person DM, add/remove members, change admin/member role, rename/describe/avatar, mute/hide/leave and archive custom rooms. Creation is multi-step and non-atomic. | Final room-management slice uses server-atomic create/add and server-enforced role transitions. Duplicate DM races, last-admin/leave behavior, archived rooms and unauthorized member discovery need explicit acceptance. |
| Cache and lifecycle | Browser cache holds room summaries, up to 120 messages, members, stars and pending text in plain `localStorage`, keyed by member/room. Auth/embedded tenant teardown calls `clearChatCaches` and clears query state, but no call to `useChatStore.reset()` was found. | First read slice is memory-only unless a later storage brief defines protected content retention. Every snapshot/queue includes account + server-confirmed choir + member + room scope and is synchronously discarded on switch/sign-out/revocation. |
| Navigation and accessibility | `/chat` and `/chat/[slug]`, swipe-back, scroll-to-message, long-press/context menus, overlays, safe-area input and partial labels exist. Several icon/menu controls rely on visual context or DOM behavior. | Native list/read must cover screen-reader names/order, dynamic type, focus/back behavior, reduced motion, empty/loading/error states and accessible deleted/media/reply descriptions. Web gestures are behavior references, not reusable RN UI. |

No row above authorizes a feature cut. A store-candidate exclusion would require an explicit owner
decision and a reconciliation update; deferral here only sequences implementation.

## Data, authority and runtime map

| Surface | Repository evidence | Required native contract |
|---|---|---|
| Room summary | Security-invoker `get_chat_rooms_for_member(p_member_id)` first proves the supplied member belongs to `auth.uid()`, then reads memberships/rooms/messages. The RPC has no stable versioned response contract in shared code. | Server-derived active choir/member; exact validated summary shape; malformed rows fail closed; no caller-selected account/choir authority. |
| Core read | `chat_rooms`, `chat_room_members`, `chat_messages`; indexes include membership by member/room and messages `(room_id, created_at desc)`. | Membership/RLS on every room and message read; stable cursor adds `id` tie-break and matching index before runtime acceptance. |
| Secondary read/write | `chat_message_status`, `chat_reactions`, `chat_polls`, `chat_poll_votes`, `chat_starred_messages`, `chat_notification_preferences`. Each has `choir_id`; the dated snapshot has supporting single-column indexes but not every compound authorization/query path. | Room membership is checked through the related message/room for every operation; member identity is server-derived; query/index review accompanies the eventual migration. |
| Tenant linkage | 003 added non-null `choir_id`, a restrictive active-choir policy and trigger-enforced same-tenant foreign references. 005 made `current_chat_member_id()` an alias of the verified active-choir member. | Keep active-choir selection as the outer boundary, but do not confuse same-choir with same-room authorization. Switch/revocation invalidates all reads, channels and local state. |
| Realtime database events | Migration history adds `chat_messages`, `chat_reactions` and `chat_message_status` to `supabase_realtime`. The hook also subscribes to `chat_rooms` and `chat_room_members`, but the repository has no matching publication evidence for those two tables. | Verify publication at the actual target before claiming list updates. Filter by room/member where supported, rely on RLS for visibility, and resync snapshots on reconnect because delivery alone is not a complete ordered log. |
| Broadcast and Presence | `chat:${roomId}` is created without `private: true`; no repository policy on `realtime.messages` was found. Typing, read receipt and online state use caller-supplied member IDs. Hosted “Allow public access” state is unknown. | Private channel plus `realtime.messages` RLS tied to current room membership; server/auth-derived displayed identity; teardown on JWT/choir/member change. Until then these signals stay out of the accepted native slice. |
| Browser persistence | `localStorage` stores message bodies and pending content; cache parsers validate only a minimal shape. Cleanup is wired into both normal and embedded auth lifecycle. | No persisted native chat content in the first slice. A later offline queue defines storage protection, size/retention, schema version, corruption handling and exact teardown. |
| Media | `uploadChatImage` sends base64 to the existing Drive action, whose contract explicitly makes the file public. | Shared authorized upload/fetch/delete contract, stable file identity, MIME/size checks and provider-exit compatibility before native media send. |

## Blocking safety findings

These are repository findings against `backup_schema_2026-09-07.sql`; they are not a claim that a
fresh hosted schema was inspected. The next database brief must compare the actual authorized
target before applying any repair.

1. **Room authority can be self-expanded.** `Add room members` permits `member_id =
   current_chat_member_id()` without proving an invitation or existing room authority. `Update own
   membership` constrains the row owner but not mutable columns, so role and room linkage are not
   protected at the policy boundary. A client-side room list cannot repair either defect.
2. **Broad permissive policies override narrower room checks inside the active choir.** `Allow all
   read` exists on polls, votes and reactions; broad insert/delete policies also exist for polls,
   votes and reactions. `Members can manage their own stars` is actually `true` within the choir,
   not member-owned or room-scoped. The restrictive 003 policy prevents cross-choir access but does
   not add room membership.
3. **Some product rules are UI-only or internally inconsistent.** The one-hour edit/delete rule is
   not enforced in RLS/server code. Delete-for-me attempts to update shared message metadata even
   for messages whose sender-only update policy should refuse the current user. Direct multi-table
   room/poll creation can leave partial state. `file` exists in TypeScript but not in the dated DB
   `message_type` constraint.
4. **Realtime does not yet prove private room membership or lossless recovery.** Broadcast and
   Presence are public-channel calls in source; caller IDs are trusted. The hook does not perform a
   fresh authoritative catch-up after reconnection. Room/member subscriptions lack matching dated
   publication evidence, and broad reaction visibility can expose unrelated same-choir events.
5. **Message order and retry are not durable contracts.** Older-page lookup uses only
   `created_at < before`, so equal timestamps can be skipped. Optimistic temp IDs are not sent to
   the server; an accepted insert followed by a lost response can be retried as a second message.
6. **In-memory tenant teardown is incomplete.** Auth lifecycle clears chat `localStorage` and query
   state but does not call the available Zustand `reset()`. Room resolution consults that global
   store before its membership query, so stale prior-choir room metadata/IDs can be selected after
   a switch even though subsequent RLS reads should refuse the underlying rows.
7. **Coverage is too narrow for migration claims.** The only chat-specific automated file found is
   `lib/chat-cache.test.ts` with four cache/merge cases. There is no current automated acceptance
   for RLS negatives, RPC parsing, Realtime reconnect/order, UI behavior or send idempotency.

These findings block native runtime acceptance, not the bounded shared read-contract preparation.
They also remain web risks; a later repair must run web compatibility checks rather than changing
the native path alone.

## Sequential C3 delivery split

| Order | Observable bounded outcome | Required acceptance and dependency |
|---|---|---|
| 1 — tenant-memory teardown repair (next ready) | Normal and embedded auth lifecycle synchronously reset the chat store together with cache/query state, so a prior choir room cannot resolve from memory after switch/sign-out. | Focused lifecycle regression plus root gate; no DB/runtime/native allocation. The repair is shared web safety, not native-chat completion. |
| 2 — shared read contract | Framework-free validators for room summaries/messages, exact message kinds, server IDs, stable cursor and current account/choir/member scope. No network or persistence. | Hostile/malformed rows refuse; unknown compatible message kinds remain visibly representable; `(created_at,id)` order/dedup and stale-scope guards pass focused tests and root gate. This can proceed without DB/runtime allocation. |
| 3 — authority and Realtime foundation | Remove broad/self-escalating RLS paths, constrain mutable fields/atomic operations, add required compound indexes/publication and private room-topic authorization. | Local migration up/down plus two-role/two-room/two-choir negative matrix; dated backup/restore and web compatibility. Requires resource preflight and later hosted migration authority. |
| 4 — native list/read flow | Authenticated current member sees only authorized rooms, opens one room, pages/read-refreshes messages and clears on choir switch/sign-out. Memory-only cache for this slice. | Empty/error/offline-visible state; inaccessible slug/UUID; stable pagination, reconnect catch-up, duplicate/out-of-order events, revoked membership and tenant teardown on iOS/Android appropriate local runtime. No send controls yet. |
| 5 — text send/retry | Text/reply/link send with idempotent server acknowledgement and a bounded offline queue. | Lost response, retry, restart, cancel, duplicate event, permission revocation and choir switch; no silent loss or duplicate send. Persistent queue protection/retention is explicit. |
| 6 — message/social features | Edit/delete-for-me/delete-for-all/copy/star, reactions, polls, durable receipts, typing and Presence. | Server-enforced time/ownership/room rules, concurrency, private topics, denial and web/native interop. Each coherent mutation family may be a separate brief. |
| 7 — media and remaining room features | Images/avatar, gallery/files/links/stickers, then DM/group creation and room/member administration. | Shared authorized file contract and provider plan; upload resume/cancel/cleanup; atomic room operations, role refusal, duplicate DM, archive/leave/last-admin and full feature reconciliation. |

The split deliberately keeps Online/typing, writes and persistent offline state out of the first
read UI without deleting them from C3. If the database runtime remains unsafe under the 10 GiB
floor after order 2, select another document/pure-contract package instead of claiming order 3.

**Done definition:**

- [x] Every current user-visible chat capability is preserved in a named native slice or marked as
      requiring an explicit product decision; no feature is silently removed.
- [x] Tables/RPCs/Realtime/storage/cache and room/tenant authority are mapped with dated evidence,
      including inaccessible-room, choir-switch, reconnect, order, duplicate and offline cases.
- [x] The first native product slice is small, observable and blocked from inheriting any known
      unsafe authority; later send/media/remaining features have explicit dependencies.
- [x] Transition start/delivery controls and document-only link/status/diff gates pass.
- [x] Diff is self-reviewed; no product/generated/unrelated file is changed, and concise status
      indexes identify the next ready work.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source and resource preflight | local repository | PASS | C1/C2 checkpoint, C3 sources, dated schema and official Supabase guidance identified; ~11.5 GiB free; no runtime allocated. |
| 2026-09-19 | Web capability trace | local source at product `b1d565f` | PASS | List/read, send/retry, message/social, media and room-administration behavior traced across routes, 20 chat components, shared library/cache, store and Realtime hooks. All capabilities land in one of seven preserved slices. |
| 2026-09-19 | Dated data/authority audit | repository schema snapshot and migrations | PASS | Nine chat tables, summary RPC, active-choir helpers, indexes/publication and RLS reviewed. Seven blocker groups recorded; no hosted schema query or runtime assertion was made. |
| 2026-09-19 | Official Realtime/RLS guidance review | current Supabase documentation | PASS | Postgres Changes remains subject to table RLS; private Broadcast/Presence requires `realtime.messages` policies and `private: true`. Current source proves neither private-room boundary. |
| 2026-09-19 | Self-review and selection correction | local document diff | PASS | Review found that auth teardown clears cache/query state but not the chat Zustand store. The next slice was corrected from general read-contract work to the smaller tenant-memory repair. Self-review is not independent review. |
| 2026-09-19 | Document consistency/resource gate | five changed Markdown files | PASS | 106 local links resolve with zero missing; no stale 038 in-progress/next-inventory marker; `git diff --check` passes; 12,093,008 KiB (~11.5 GiB) free. No runtime/output was created. |

**Delivery:** Planning commit `d5e26be`; this acceptance/status record follows. Product/schema/live
state remains unchanged. The next bounded product brief repairs chat store teardown in normal and
embedded tenant lifecycle before the shared read contract. Revert the two 038 document commits to
roll back this inventory.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Current web feature preservation map | yes | PASS | 2026-09-19, local source at product `b1d565f` | Ten capability groups map to seven sequential slices; no store-candidate exclusion was invented. |
| Data, RLS, Realtime, cache and ordering trace | yes | PASS | 2026-09-19, dated schema/migrations and current source | Nine tables, RPC, RLS/publication/cache/Drive paths and seven blocker groups recorded. Hosted schema and real data remain unverified. |
| Bounded native split and first-slice acceptance | yes | PASS | 2026-09-19, 038 document review | Tenant-memory repair is next, then shared read contract/authority/list-read/send/social/media. Unsafe RLS or public topics cannot be inherited as acceptance. |
| Local links, status consistency and `git diff --check` | yes | PASS | 2026-09-19, five Markdown files | 106 local links, zero missing; status/next-work search and diff check pass; no product/generated file changed. |
| Product/schema/Realtime runtime/device/provider | N/A — inventory only | N/A | not executed | Required by later implementation and runtime briefs. |
