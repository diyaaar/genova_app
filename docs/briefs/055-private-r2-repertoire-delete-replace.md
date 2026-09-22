# 055 — Private R2 repertoire delete and safe replacement

**Status/date/writer:** READY / 2026-09-22 / primary agent.

**Observable result:** A current choir manager can delete an R2-backed repertoire file or song
without Drive, and can replace audio or an annotation-free PDF only after the new private object is
fully verified. The old database reference disappears atomically before best-effort private-object
cleanup, so a provider failure can leave only an inaccessible reconciliation record, not a visible
broken file or a cross-tenant object. Existing PDF annotations are never silently discarded by a
replacement.

**Start:** Accepted 054 product `9459732` plus its documentation commit. Read AGENTS, handoff,
active context, 052–054, current delete/replace callers, annotation ownership and the execution
controls. Verify exact dirty ownership, >=10 GiB free and no owned listener/database. One writer;
preserve `supabase/.temp/cli-latest`. No provider, hosted schema or real-data action is authorized.

## Bounded contract

- Extend the server-owned repertoire lifecycle under `supabase/functions/`; do not add a Next API
  route and do not expose bucket/key/credentials to web or native clients. Reuse 054 authorization,
  exact-target validation, private bucket and retry/reconciliation rules rather than cloning them.
- Add only the operational fields/RPC needed for idempotent file and song deletion. The database
  transaction first proves active choir + manager + exact file/song ownership, records the private
  object identity in the service-only reconciliation table and removes the product row. Provider
  DELETE then cleans that recorded exact key. A missing object is success; any other uncertain
  result remains private and retryable, never reconstructed from caller-supplied paths.
- Replacement is upload-new -> verify/commit-new -> retire-old. Audio may follow that path. PDF
  replacement must first prove no annotation row references the old file; otherwise refuse visibly
  until a later version-aware annotation decision. Never delete the old row/object before the new
  file is committed. Preserve file IDs for migration/copy; ordinary explicit replacement may create
  a new file ID as the existing product does, but must invalidate affected catalogue/cache state.
- Song deletion enumerates only server-owned active R2 locations for that exact choir/song, records
  a bounded cleanup batch, then deletes the song through the existing FK lifecycle. If the batch is
  above the defined safe limit, refuse and require bounded reconciliation rather than buffering an
  unbounded list. Mixed legacy files remain on their existing Drive deletion path until cutover.
- Web adopts the endpoint behind the existing release flag. R2 actions never fall back to Drive;
  legacy actions continue unchanged. Keep current confirmation/countdown UX and make cleanup-pending
  wording accurate without claiming provider erasure. Native has no manager file UI in this package.
- Covers, MIDI/other, submissions/history/review audio, comments, chat/avatar, public Drive ACL
  revocation, bulk copy and source deletion remain later packages. No annotation schema or UX choice
  is invented here.

## Failure and acceptance matrix

| Criterion | Required? | Initial status | Proof required | Limit |
|---|---|---|---|---|
| Tenant/role/exact-target/idempotent DB lifecycle and exact down | yes | NOT RUN | Isolated PostgreSQL 17 forward/down/forward; wrong choir/song/file, revoked role, duplicate/concurrent request and bounded song batch | Hosted migration separate. |
| Safe provider deletion and reconciliation | yes | NOT RUN | Actual local Edge + signed loopback R2: success/404, timeout/lost response/5xx, retry and no caller-selected key | Loopback is not real R2. |
| Replacement ordering and annotation guard | yes | NOT RUN | New verified file remains on failed retirement; old stays until new commit; annotated PDF refusal; audio and annotation-free PDF success | No silent annotation loss. |
| Web compatibility | yes | NOT RUN | Focused adapter/UI tests plus production-browser file/song delete and replace matrix; legacy Drive calls unchanged and R2 path makes zero Drive calls | No device inference. |
| Final gates and cleanup | yes | NOT RUN | Deno check, SQL/runtime, root `pnpm check`, relevant mobile regression only if shared catalogue changes, diff/secret/advisor checks and owned cleanup | iOS grouped unless platform-sensitive. |
| Hosted schema/Edge/web, real R2 delete or real user/device | no — separate gate | NOT RUN | Release manifest after local acceptance | Data/provider/deploy/device authority required. |

## Rollback and stop conditions

Code rollback may re-disable R2 lifecycle actions but cannot resurrect a deliberately deleted DB row
or provider object. The local down migration must refuse while reconciliation rows exist. A hosted
rollback needs a fresh backup/restore proof and exact object manifest; Git revert is insufficient.
After two failed approaches, record the cause and choose the smallest causal repair. Stop on an
unresolved annotation/version semantic, an unbounded delete surface, less than 10 GiB free or any
need for live/provider credentials. Required FAIL/NOT RUN prevents local acceptance.
