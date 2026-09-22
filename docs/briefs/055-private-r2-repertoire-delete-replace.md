# 055 — Private R2 repertoire delete and safe replacement

**Status/date/writer:** LOCAL ACCEPTANCE COMPLETE / 2026-09-22 / primary agent.

## Start checkpoint — 22 September

- Read AGENTS, handoff/active context, transition guide/work cycle, 052–055, the 053 mapping,
  054 upload transaction and current SongEdit/Drive callers. HEAD `5927c13`; sole unrelated dirty
  path `supabase/.temp/cli-latest` remains preserved.
- Authorized writers: this brief/status records; one 055 migration/down/SQL/runtime package;
  `supabase/functions/repertoire-file-lifecycle/` plus narrow shared auth/config helpers;
  `lib/repertuvar/`, `lib/drive.ts`, SongEdit caller/tests and browser acceptance.
- Three actions: implement exact DB-first removal + provider reconciliation; adopt delete and
  new-first replacement with an annotation guard; review and run focused then required gates.
- Free space 40,569,668 KiB. Reuse installed Node/Deno/PostgreSQL/signer/browser; estimated peak
  <1 GiB and one heavy process. Remove owned database/listeners/build/coverage/browser outputs.
- Technical boundary: explicit delete may remove annotations through the existing cascade after
  confirmation. Replacement performs a server check and a final locked check; an annotation race
  refuses retirement and leaves both valid file rows visible, never losing old data. R2-only song
  delete is supported; a mixed Drive/R2 song is refused until a later coordinated cutover flow.

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
| Tenant/role/exact-target/idempotent DB lifecycle and exact down | yes | **PASS** | Isolated PostgreSQL 17 forward/down/forward; privilege/tenant/role, mixed/101-file refusal, concurrent exact replay and rollback guard | Hosted migration separate. |
| Safe provider deletion and reconciliation | yes | **PASS** | Actual local Edge + signed loopback R2: success, replay, provider 5xx/pending cleanup/retry and DB-owned exact key | Loopback is not real R2. |
| Replacement ordering and annotation guard | yes | **PASS** | Focused ordering/refusal cases plus browser: annotated preflight stops upload; verified new file precedes old retirement | No silent annotation loss. |
| Web compatibility | yes | **PASS** | Production Chrome 412×915: annotated refusal, replacement and pending-cleanup delete; zero Drive calls/page errors | No device inference. |
| Final gates and cleanup | yes | **PASS** | Deno check; SQL/runtime; 42 focused cases; root 71 files/662 tests/build; 054 runtime regression; diff/secret/advisor/process/DB checks and cleanup | Mobile/iOS N/A: no shared/native source or dependency changed. |
| Hosted schema/Edge/web, real R2 delete or real user/device | no — separate gate | NOT RUN | Release manifest after local acceptance | Data/provider/deploy/device authority required. |

## Rollback and stop conditions

Code rollback may re-disable R2 lifecycle actions but cannot resurrect a deliberately deleted DB row
or provider object. The local down migration must refuse while reconciliation rows exist. A hosted
rollback needs a fresh backup/restore proof and exact object manifest; Git revert is insufficient.
After two failed approaches, record the cause and choose the smallest causal repair. Stop on an
unresolved annotation/version semantic, an unbounded delete surface, less than 10 GiB free or any
need for live/provider credentials. Required FAIL/NOT RUN prevents local acceptance.

## Acceptance record — 22 September 2026

- Product/test commit `dd21522` adds the service-only 055 lifecycle transaction, exact-target
  reconciliation rows, signed Edge DELETE, web adapter and existing SongEdit adoption. R2 file
  deletion removes the product row transactionally before provider cleanup; a provider uncertainty
  returns `deleted + cleanupPending` and remains retryable without exposing its key. R2-only song
  deletion is bounded to 100 objects. Mixed Drive/R2 songs and incomplete mappings refuse.
- Replacement checks annotations before upload and again under the deletion lock. It verifies and
  commits the new private file first. A final refusal keeps both valid rows, so the old file and its
  annotations survive. Explicit confirmed delete retains the existing annotation cascade semantics.
- PostgreSQL 17 passed forward/down/forward, service-only grants/forced RLS, exact choir/role/key,
  annotated/mixed/101-file refusal, same-target concurrency, source invariance and down refusal with
  pending cleanup. The disposable database was removed. Advisors exited zero with no error; the
  existing project-wide warnings are not claimed fixed by 055.
- Deno checked both Edge entrypoints and the 055 runtime. The first check caught a missing import
  introduced while extracting shared Auth; the import was restored before acceptance. Actual local
  HTTP passed signed DELETE, preflight, cleaned replay, provider failure/pending cleanup and retry
  with three provider requests. The refactored 054 PDF/WAV upload runtime also passed unchanged.
- Focused tests passed 4 files/42 cases. Root `pnpm check` passed lint, types, 71 files/662 tests,
  service worker and production build. Production Chrome at 412×915 passed annotated replacement
  refusal before upload, verified replacement, pending private cleanup wording, zero Drive calls
  and zero page errors. Mobile/iOS gates are N/A because no shared catalogue, native source,
  dependency or platform configuration changed.
- Secret-pattern scan found zero affected files; owned ports/databases were absent. About 464 MiB
  of rebuildable build/coverage/browser output was removed; 40,638,320 KiB (~38.76 GiB) remained
  free. `supabase/.temp/cli-latest` remains unrelated and unstaged.

**Unverified boundary:** no hosted schema/function/web release, R2 account/key/bucket/real object,
real user/device or Drive source was touched. Covers, MIDI/other and every non-repertoire file
family remain Drive-dependent; real provider activation/copy/cutover still needs exact authority.
