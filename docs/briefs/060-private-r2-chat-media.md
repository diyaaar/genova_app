# 060 — Private R2 chat image and room-avatar lifecycle

**Status/date/writer:** IN PROGRESS / 2026-09-23 / primary agent.

**Observable result:** A room member can send one ordered image message containing up to five
private images, every current room member can view/download it, its sender can delete it inside the
existing one-hour window, and a room admin can replace the room avatar without a new Drive write or
public provider URL. Legacy Drive/external image metadata remains readable during the mixed period.

**Delivery focus:** Close the last first-party active Drive media writer identified by
[052](052-drive-exit-inventory.md), so provider activation/copy/cutover—not an unconverted product
write—is the next Drive-exit boundary. This is one room-authorized private-media flow. It does not
add native chat-media UI, a general file service, new chat features or a live migration.

**Start checkpoint:** `main/948e324`; 059 product `879d4ec` and acceptance record are committed.
Only user-owned `supabase/.temp/cli-latest` is dirty. 40,837,368 KiB (~38.9 GiB) is available; no
task-owned build, simulator, VM or loopback service exists. A system PostgreSQL listener and the
pre-existing `genova_008_test_restore` source database are not task-owned and will be read only;
060 uses a separately named disposable copy and removes it after acceptance.

Source inspection confirms that `upload_chat_image` base64-buffers each image, creates a public
Drive ACL, and `sendImageMessage` uploads up to five objects before a direct client message insert.
`chat_messages.metadata_json` has both singular and array legacy shapes. The current delete RPC
clears metadata without provider reconciliation. Room avatar writes store only a public URL. These
are verified source facts; current hosted row/object counts and ACL state were not queried.

**Current work card:**

- User benefit: chat images and room avatars work through room-authorized private media without
  publishing an object or requiring Google for a new write.
- Next actions: add the exact reversible schema/RPC contract; implement streamed Edge/client read,
  write and delete/replace adapters; run SQL, signed loopback HTTP, focused web/Chrome and full gate.
- Exit: every required acceptance row below is PASS, product and evidence are separate 060 commits,
  generated output/listeners/disposable DB are removed, and hosted/provider/device layers stay
  explicitly NOT RUN.

**Resources:** Source/schema inspection and focused tests are low allocation. One PostgreSQL 17
copy (<200 MiB expected), one loopback S3 process and one production web server may run sequentially.
The final root build may allocate up to ~2 GiB based on the immediately preceding 059 gate, leaving
well above the 10 GiB floor. Remove the disposable DB, `.next`, coverage, browser captures and owned
listeners after their last dependent check. Do not download a provider SDK, emulator or native build.

## Allowed modules

- `supabase/migrations/*060*`, `supabase/rollback/*060*`, `supabase/tests/*060*`,
  `supabase/test-support/*060*`: immutable media/batch identities, room authorization, exact rollback
  and local acceptance.
- `supabase/functions/chat-media-*` plus the existing bounded R2 streaming helpers: upload batch,
  protected read ticket, message delete and avatar replacement reconciliation.
- `lib/chat*`, `lib/drive-file-url*`, `hooks/useChatRealtime*`, and chat image/avatar components and
  focused tests: feature-flagged web adapter, ephemeral protected URLs and legacy mixed reads.
- `lib/supabase.ts` only for the new public environment flag. Browser/native shared message contracts
  may be extended only when required for compatibility; no native screen implementation is included.
- This brief and the current concise handoff/active/progress/plan/MIGRATION records after acceptance.

## Sources and preserved behavior

- [052 inventory](052-drive-exit-inventory.md), [059 accepted pattern](059-private-r2-repertoire-comment-audio.md),
  [migration guide](../gecis-rehberi.md), [execution controls](../mobil-teslim-plani.md#bounded-execution-and-resource-controls),
  [decision 29](../../KARARLAR.md) and [infrastructure boundary](../altyapi-2026-09-04.md).
- `lib/chat.ts`, `lib/drive.ts`, `components/chat/{ChatRoom,MessageBubble,ImageGalleryViewer,
  MediaGalleryGrid,ChatRoomList,RoomInfoDrawer}.tsx`, `hooks/useChatRealtime.ts`, migrations 041,
  044–048 and the restored schema.
- Preserve one message ID and reply relation for an ordered batch of one to five images, optimistic
  display, legacy single/array metadata parsing, gallery/download, one-hour sender delete, per-user
  hide, room-member reads, admin-only avatar updates and DM/member avatars.
- Store only provider-neutral immutable version IDs in durable product metadata/pointers. Ticket URLs
  are ephemeral client material. Unknown external URLs stay external; do not import them as R2 data.

## Transition start check

- Read: AGENTS, handoff, active context, 052/059, guide/work cycle/template, execution controls,
  MIGRATION, decision 29, infrastructure note, source/RLS/migration and restored-schema evidence.
- Boundary: shared web/Edge/backend Drive-exit integration; native chat-media UI and store acceptance
  remain later. New server logic is Edge/RPC, not a new Next API route.
- Preserved behavior: the complete list immediately above, existing chat text/social/status flows,
  legacy Drive reads and current native message compatibility.
- Authority/ownership: one primary writer. The owner's continuing goal authorizes scoped reversible
  local implementation/tests/commits. Provider account/credentials, hosted migration/secret/flag,
  deploy, live-data inspection/copy, source ACL/delete, device and publication remain unauthorized.
- Required environments: exact local SQL forward/down/refusal; actual Deno HTTP against signed
  loopback S3; focused unit/integration; production Chrome 412x915; root `pnpm check`. Mobile gate is
  required only if shared/native source changes. Rollback must refuse unresolved/private objects.

## Contract and failure behavior

- A server-owned idempotent batch reserves exactly 1–5 immutable versions and their order before
  upload. Each request streams one normalized bounded image, verifies MIME/length/SHA-256 by provider
  readback, and only the complete batch atomically creates the image message. Replay returns the same
  message/version identities; payload/order/key reuse conflicts.
- Incomplete/failed batches are not visible as messages. Explicit abort removes only exact reserved
  keys. Lost responses reconcile by reservation + provider readback; no public URL or client-chosen
  object key is accepted. Objects are private and paths are bound to choir/room/batch/version.
- A protected content ticket is bound to user, choir and immutable version. Every content request
  live-rechecks active room membership and active message/avatar ownership before provider access;
  leaving a room or deleting/replacing media revokes an already-issued ticket.
- Message delete is DB-first and idempotent: it applies the existing sender/room/one-hour rule,
  atomically hides product metadata and records exact provider cleanup, then removes exact keys.
  Per-user hide never deletes shared media. Direct private-media identity mutation/deletion refuses.
- Avatar replacement is admin-only, commits the new version/pointer before deleting the prior private
  object, and reports cleanup-pending without reverting the usable new avatar. A legacy Drive avatar
  is retained during mixed mode and is never deleted by this package.
- Feature disabled/legacy mode keeps existing reads but refuses the new private write cleanly. A
  mapped corrupt/missing/private object fails closed; it never falls back to a public Drive URL.

## Out of scope

- R2 account/bucket/subscription/region choice, secrets, hosted schema or function deployment,
  production flags, real-user/provider data, copy manifest, cutover or Drive ACL/source deletion.
- Native chat image/avatar writing, offline media cache, sticker/file/poll expansion, link-preview
  imports, compression redesign, retention policy, push changes, iOS/Android builds or store work.
- Rewriting Supabase/RLS/Realtime/Edge onto Railway, moving unrelated Supabase Storage objects, or
  changing web/mobile visual parity.

## Rollback

Code/flag rollback restores legacy writers before hosted cutover. The SQL down path must exactly
restore prior chat delete behavior and refuse while any batch/delete/avatar cleanup or committed R2
version exists. Hosted rollback requires an object manifest and preservation/copy-back plan; Git
revert is not data rollback. Legacy Drive sources are untouched.

## Mandatory acceptance evidence

| Criterion | Required? | Status | Proof required | Limit |
|---|---|---|---|---|
| Schema, room authority and exact rollback | yes | NOT RUN | PostgreSQL 17 forward/down/refusal; sender/member/admin/non-member/wrong-choir/reply/order/direct-mutation matrix and prior-DDL restore | Hosted migration separate. |
| Bounded private batch/create/read/delete/replace | yes | NOT RUN | Actual Edge HTTP + signed loopback S3; 1/5 files, byte/hash/readback, replay/conflict, partial abort, lost response, Range, old-ticket revocation, exact delete and avatar replacement cleanup | Loopback is not real R2. |
| Web mixed compatibility | yes | NOT RUN | Focused tests and production Chrome 412x915 send/gallery/download/delete plus avatar replace; legacy singular/array/external reads; zero new Drive/public provider URL | No device inference. |
| Required gates, review and cleanup | yes | NOT RUN | Deno checks; focused tests; root `pnpm check`; security/lifecycle/race/diff/secret/resource review; mobile gate only if native/shared code changes | Self-review is not independent review. |
| Hosted/provider/real-data/device | no — separate gate | NOT RUN | Controlled release/copy/cutover evidence later | Explicit authority required. |

Required FAIL or NOT RUN keeps 060 open. Record exact commands, revisions, dates, environments and
limits in the result section; do not promote local loopback or Chrome to provider/device evidence.
