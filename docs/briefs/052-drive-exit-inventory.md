# 052 — Drive-exit source inventory and first integration contract

**Status/date/writer:** DOCUMENTATION ACCEPTED / 2026-09-20 / primary agent.

**Outcome:** Identify every first-party Drive file path before implementing private R2 reads,
so a working PDF does not falsely imply that uploads, historical audio or chat are Drive-free.
This is a source inventory and execution contract, not a migration or provider acceptance.

**Start/preflight:** `main/f33ee91`; product `22a19d6`/051 accepted. Only unrelated
`supabase/.temp/cli-latest` is dirty; leave it unstaged. Previous goal turn was progress
(051 repaired, tested, committed and cleaned). 21,307,160 KiB (~20.32 GiB) free. No new install,
downloaded media, build, DB copy, VM or simulator; documentation allocation only (<100 KiB).

**Read/start check:** AGENTS, handoff/active context, guide/work cycle/template, current delivery
sequence/resource controls, MIGRATION, decisions #14/#28–31, infrastructure note, 018 runtime
entrypoint/runner and 042's isolated-schema evidence boundaries. Cloudflare R2 and Supabase skills
(including Postgres RLS guidance) informed provider/security constraints. One writer; only this
brief, the next scoped brief and minimal status indexes are writable. No product/schema change.
Existing native/WebView ownership, 004/010 open gates and all original features remain unchanged.

## File families and source owners

These are code-path findings, not counts of current hosted rows or Drive objects. Historical
4 September size measurements must not be promoted to current storage/billing evidence.

| Family / durable references | Current writer and reader | Required preservation / exit work |
|---|---|---|
| Repertoire PDF, cover, audio, MIDI/other: `repertoire_files.id`, `song_id`, `drive_file_id`, links, name/MIME/size; `repertoire.drive_folder_id` | [web helper](../../lib/drive.ts), [Drive manager](../../supabase/functions/drive-manager-v2/index.ts) `init_song_folder`, `upload_song_file`, `delete_file`; [Edge read](../../supabase/functions/repertoire-file/handler.ts), [web URL helper](../../lib/drive-file-url.ts), native catalogue/reader/audio | Keep file UUIDs: [annotations FK](../../supabase/migrations/20260416_repertoire_pdf_annotations.sql) uses them. Private R2 PDF/audio reads first; then server-owned uploads/deletes and folder-free creation. Preserve unsupported MIME rejection (#14), covers/partitions and exact source bytes. |
| Current assignment submissions: `assignment_submissions` file/link columns and member/assignment association | [upload route](../../app/api/assignment-submissions/upload/route.ts) stages in private Supabase `assignment-submissions`, calls Drive `upload_submission_from_storage`, retains Storage on failure; [legacy access](../../lib/server/drive-file-access.ts), [proxy](../../app/api/drive-file/[id]/route.ts) | Preserve assigned-member submit, locked/inactive refusal, owner/chef/section access and resubmission. Replace Drive staging round-trip with private object upload/commit; no new Next route for future native assignments. Existing route becomes an adapter to Edge. |
| Submission history: `assignment_submission_history` file/link columns, reviewer audio, source submission/member/assignment IDs | Upload archives snapshot; [assignment UI](<../../app/(main)/odevler/[id]/page.tsx>) reads history and plays attachments; history/audit JSON also retains old IDs | Migrate every retained version, not just current rows. Old immutable objects remain referenced; audit history is not rewritten to current bytes. Legacy access helper has no history-table lookup: add explicit history authorization, never broad cross-table access by raw ID. |
| Visible review audio: `assignment_submissions.reviewer_audio_drive_file_id`; hidden/private review audio: `assignment_submission_private_notes` | [review route](../../app/api/assignment-submissions/review/route.ts) invokes `upload_assignment_review_audio`; hide/update routes move or snapshot fields; legacy helper checks visible vs private | Preserve visible student/reviewer access, private reviewer-only access, same-section limits and hide/unhide/history semantics. Private files cannot use public R2 links or generic choir-only permission. |
| Repertoire comment audio: `repertoire_song_comments.audio_drive_file_id`, name/MIME/size, target voice group | Drive `create_song_comment` / `delete_song_comment`, [comment UI](../../components/repertuvar/ChefCommentSection.tsx), legacy helper | Keep creator/chef delete and target-group visibility, rich text and audio independently; preserve parent song authorization. No Drive OAuth dependency for text-only comments. |
| Chat images, single/multiple message attachments: `chat_messages.metadata_json` contains `url(s)`, `drive_file_id(s)`, `web_view_link(s)` | [chat helper](../../lib/chat.ts) `sendImageMessage`, Drive `upload_chat_image`, [gallery](../../components/chat/ImageGalleryViewer.tsx) | Parse both old metadata shapes, preserve order/replies and message IDs. Replace public image URLs with room-authorized private attachment references/renewable access. Validate actual content and accessibility on web/native before cutover. Unknown/user-supplied external URLs are inventoried separately, not blindly fetched. |
| Chat room avatars: `chat_rooms.avatar_url` | `lib/chat.ts:updateRoomAvatar` uses same Drive image uploader but saves only URL | Include URL-only references; raw file-ID column scanning misses these. Resolve only recognized Drive URL forms, retain room access, do not publish an R2 bucket. |
| Folder/list/delete compatibility: song/assignment/member folders, `init_*`, `list_files`, legacy helper `get_file`/`deleteDriveObject` | Drive manager and web helpers | Replace folder-as-readiness assumptions with actual product metadata. Unsupported helper actions are not a mandate to rebuild a file browser. Detect actual callers; remove production Drive credential requirement only after all first-party active callers are gone. |
| Existing non-Drive objects: `chorister-profiles`, `announcements-images`, assignment fallback Storage | [profile writer](../../app/api/profile-photo/route.ts), [rich-text writer](../../components/RichTextEditor.tsx), upload/fallback above | Supabase stays; no blanket migration merely for single-provider appearance. Include their sizes/egress in total budget. Preserve links in rich text, profiles and announcements; content may include legacy external links needing an approved data scan. |
| Browser/native caches and old identifiers | [offline helpers](../../lib/repertuvar/offline.ts), [Service Worker](../../public/sw.js), [URL hook](../../hooks/useProtectedDriveFileUrl.ts), native private cache | Browser keys still use `drive_file_id`; retain stable legacy aliases during transition. New provider-neutral IDs must work through those adapters without interpreting them as Google IDs. Never reset file UUIDs/annotation references; prove account/choir cleanup and byte-version invalidation. |

## Verified blockers that determine implementation order

1. **Read is not write:** `repertoire-file` only understands Drive or `storage://`; its
   service buffers the complete upstream body even for Range/HEAD. R2 must stream bounded ranges
   and keep existing ticket/role/choir checks, content guards and client-facing response contract.
2. **Empty folders gate valid songs:** both `lib/repertuvar/queries.ts:fetchRepertoireRows` and
   `apps/mobile/src/repertoire/catalog-gateway.ts` filter on `drive_folder_id`. An R2-only new song
   would disappear without a coordinated readiness change; do not globally expose unfinished legacy
   songs as an incidental fix. `getProtectedRepertoireFileUrl` also requires legacy file ID today.
3. **Current upload paths create public links:** Drive manager calls `setFilePublicReadable`
   for repertoire, comment audio, review audio and chat images. This source evidence is not a
   fresh hosted ACL audit. New R2 writes must be private. Revoking old public Drive links is an
   explicit live action, required before claiming privacy remediation, not automatic source deletion.
4. **History can lose its bytes:** `upsertAssignmentSubmission` deletes old Drive file
   before replacement upload/upsert; the web route archives the prior row later. Migration cannot
   recover already-missing originals by rewriting history. Missing objects are reported, and
   replacement uploads must preserve versions before any eventual approved retention cleanup.
5. **The existing migration goes the opposite way:** `migrate-storage` calls
   `migrate_submission_from_storage` (Storage -> Drive), then removes source Storage. It must not
   run after R2 cutover. Drive manager also obtains a Google token before its action switch,
   including text-only/folder actions; changing only a download URL does not remove dependency.
6. **Legacy rights are not uniform:** private reviewer audio, historical versions, assigned songs,
   target voice groups and chat rooms have different checks. The legacy file helper does not cover
   chat or history. A global `fileId -> signed URL` endpoint without attachment-owner authorization
   would widen access. Preserve/refine concrete checks at each source owner.

## Chosen preparation boundary (no hosted schema decision applied)

Start with [053](053-private-r2-repertoire-read.md): one existing repertoire file UUID resolves to
a verified private R2 object, read through the current Edge ticket contract. Use an additive,
server-owned repertoire location record rather than smuggling `r2://` into client-controlled Drive
link columns. Bind location to the existing file and choir; retain originals and old fields for
compatibility/rollback. Local DDL must prove constraints, denial of client writes and exact down
behavior before any live proposal. Other attachment families follow their authorization owners;
do not build a speculative universal media platform first.

Provider modes are explicit: legacy compatibility before migration; mixed only during approved
copy/cutover; R2-required for completed repertoire rollout. A corrupt/incomplete mapped object or
provider failure is a visible refusal, never silent fallback to a public Drive link. A missing
mapping may use legacy only in the declared mixed mode; R2-required denies it.

R2 requests are signed only on the server using a pinned maintained S3-compatible signer, exact
configured account/bucket and validated object key. Do not implement cryptography anew. Fetch
credentials cannot be sent to redirects, arbitrary URLs, web bundles or native public env vars.
No public bucket, custom domain or additional Worker service is needed for the first read adapter.
Use streaming Edge proxy initially to retain native/web same-endpoint GET/HEAD/Range compatibility;
this still has Supabase transfer/compute cost. Direct short-lived provider URLs are a later measured
optimization only if required by budget and accepted with equivalent client/security evidence.

Cloudflare's [S3 API](https://developers.cloudflare.com/r2/api/s3/api/) documents `auto` region and
GET/HEAD/Range compatibility; [presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
are operation-specific bearer capabilities, not a replacement for product authorization.
[aws4fetch](https://developers.cloudflare.com/r2/examples/aws/aws4fetch/) is a documented compact
signer option. Region hint versus [jurisdiction](https://developers.cloudflare.com/r2/reference/data-location/)
must be selected before bucket creation; no location chosen here. [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
does not prove total infrastructure <=$5. Actual hosting plan, egress, R2 activation/bills and quotas
are unverified. [Supabase secret guidance](https://supabase.com/docs/guides/functions/secrets)
keeps provider credentials server-only. Changelog index scanned: recent management-logs, extension,
gateway and Realtime changes do not require changes for this document-only inventory; recheck relevant
runtime versions when provisioning. No version update is authorized by this review.

## Four delivery batches, not an open-ended feature queue

1. **Repertoire read proof — 053:** additive trusted mapping, private R2 adapter, streamed
   PDF/audio HTTP/Range and refusal proof early. Local service proof is separate from real R2 and
   hardware; failure changes the next action, not the acceptance definition.
2. **Drive-free writes and remaining file families:** repertoire creation/upload/delete and
   catalogue readiness; submission/version/review/comment and chat/avatar integration through
   existing ownership, with web adapters. Group coherent flows; no new chat feature expansion.
3. **Controlled copy/cutover:** fresh DB backup/restore, both shared-project impacts, approved
   source reference/object inventory, resumable copy manifest, new-upload destination switch,
   content verification, controlled release and post-cutover reconciliation. Keep source files.
4. **Operational Android beta:** current backend + real private provider + approved phone flow,
   visible feature matrix and rollback, then preserved complete scope and both-store gates.

Copy manifest must identify choir, source owner/row/slot/version, legacy ID/location, destination
object/key, byte count, SHA-256, MIME, attempts/status and verification timestamp. Compare actual
destination bytes (not multipart ETag as checksum). Only verified objects may become active.
Resume skips matching verified copies, never overwrites a mismatched object; failed/absent/oversize
objects remain explicit. No bulk local mirror: stream or bounded one-file scratch under disk floor.
Account/bucket prefix is allowlisted. Freeze relevant writes briefly or reconcile post-copy changes
before cutover; never mix snapshots silently. Downgrade must preserve R2-only new uploads and
histories: stop new writes before rolling back readers that cannot understand them. Git revert is
not data rollback. Source deletion and public-link revocation need their own exact-target approval.

## Acceptance and authority

| Criterion | Required? | Status | Date/revision/evidence | Limit |
|---|---|---|---|---|
| File families, read/write owners and legacy traps inventoried | yes | PASS | 2026-09-20, `f33ee91`, source paths above and scoped repository search | No current provider object count or ACL/billing claim. |
| Earliest private PDF/audio implementation scoped with migration/rollback | yes | PASS | 053 contract + four batches above | Preparation, not implemented R2 access. |
| Permission and resource boundary explicit | yes | PASS | Source-only; 21,307,160 KiB free preflight | No provider/account/data/credential action, install or runtime. |
| Links, scope consistency, self-review, diff | yes | PASS | Local link verifier + `git diff --check`; separate 052 documentation commit | Not independent review; no product test needed for documents. |
| Live inventory, mapping/schema, R2 request, upload, copy, cutover, device | no — later authorized execution | NOT RUN | No external operation | Still required by full product goal. |

**Pending owner input:** Cloudflare/R2 account availability asked without requesting secrets.
No reply is needed to implement 053 locally. Provider activation/region, credentials, paid steps,
real-data reads/copy, DB migration, deployment and device execution require their exact approvals.
Budget preference does not authorize billing. Prepare those requests after the exact local candidate.

**Delivery/next:** Commit this inventory and 053 contract as `052: map Drive exit and scope private
R2 read integration`. Next implement 053; do not rerun accepted 018–051 or create infrastructure
merely to repeat their evidence. No temporary outputs created by this document-only work.
