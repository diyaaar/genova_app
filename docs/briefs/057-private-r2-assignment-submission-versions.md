# 057 — Private R2 assignment submission versions

**Status/date/writer:** LOCAL ACCEPTANCE COMPLETE / 2026-09-23 / primary agent.

## Start checkpoint — 22 September

- Read AGENTS, handoff/active context, transition guide/work cycle, 052/057 and the accepted
  053–056 private-file foundation. Verified HEAD `b41389b`; the unrelated
  `supabase/.temp/cli-latest` remains unstaged.
- Inspected the current assignment upload, Drive manager, Storage migration, protected-file access,
  submission/history RLS, detail UI and upload caller. The destructive ordering is confirmed: the
  legacy Drive function can delete the previous object before the web route archives its database
  snapshot, and the snapshot/update are not one transaction.
- Authorized paths: this brief/status; one 057 migration/down/SQL matrix; narrow assignment upload
  and protected-read Edge/client/UI paths; focused/runtime/browser tests. No provider, hosted schema,
  deploy, credential, real user/data or device operation is authorized.
- Four bounded actions: add immutable version/current-pointer transaction; stream and verify one
  private R2 upload; add explicit current/history ticket reads and web adoption; review, run required
  local gates, record and clean up. Reviewer audio, deletion/retention and bulk copy remain later.
- Free space 40,480,688 KiB (~38.61 GiB). Reuse existing PostgreSQL/Deno/browser tooling, one heavy
  process at a time, estimated peak below 1 GiB; remove disposable databases/build/coverage/browser
  output after evidence.

**Observable result:** An assigned active chorist can upload or resubmit a bounded private assignment
file without Drive. Every previously submitted file remains an immutable authorized history version
before the current pointer changes. The chorist and authorized reviewer can read current and history
bytes through explicit server-owned ownership checks; a failed upload/resubmit never deletes or
rewrites the last accepted version.

**Start:** Accepted 052 inventory and 053–056 private repertoire foundation. Read AGENTS, handoff/
active context, transition guide/work cycle, this brief, current assignment upload/review/history
routes and policies, 052's destructive-order finding and execution controls. Verify ownership/disk.
Preserve `supabase/.temp/cli-latest`. No hosted/provider/real-data operation is authorized.

## Bounded contract

- Add one assignment-file Edge boundary under `supabase/functions/`; web's existing upload route may
  become a thin compatibility adapter, but new authority/storage logic does not remain in Next. Reuse
  the bounded streaming/signing primitives without treating repertoire authorization as assignment
  authorization. No public provider URL or client-selected key.
- Model each accepted submission file as an immutable version with stable submission, assignment,
  member and choir ownership. Verify the new private object and commit its mapping/history snapshot
  in one database transaction before any current pointer changes. Never delete the previous object
  during resubmit; retention/deletion comes later under an approved policy.
- Derive actor/current choir server-side. Upload requires the exact active assigned member and an
  unlocked/active assignment. Read requires the owning chorist or current authorized chef/section
  reviewer according to existing visibility. History lookup is explicit by version ownership; no
  raw file-ID search across unrelated tables or choirs.
- Preserve notes, timestamps, withdrawn/locked semantics, review association and legacy Drive reads
  in mixed mode. Disable the current Storage→Drive migration action for new R2 records. Existing
  source Storage is not removed until verified commit; uncertain outcomes remain reconcilable.
- Reviewer audio/private notes, assignment deletion, bulk legacy copy/cutover and retention remain
  later coherent packages unless implementation proves they are inseparable from version safety.

## Acceptance

| Criterion | Required? | Initial status | Proof required | Limit |
|---|---|---|---|---|
| Immutable version schema/RLS/RPC and exact rollback | yes | **PASS** | 2026-09-22/23 isolated PostgreSQL 17 forward/down: owner/chef/same-section reviewer, wrong choir/section, lock/inactive/unassigned, competing reservations and exact down/refusal matrix | Hosted migration separate. |
| Bounded private upload/read and no destructive reorder | yes | **PASS** | Actual local Edge + signed loopback R2: WAV/generic binary upload/readback/replay, provider mismatch cleanup, lost-commit recovery, ticket/range read and raw-ID refusal | Loopback is not real R2. |
| Web assignment compatibility | yes | **PASS** | Focused 5 files/27 cases; final production Chrome 412x915 initial submit/resubmit/history, 2 notifications, 3 tickets, 2 reads and zero Drive calls/errors | No native/device inference. |
| Required final gates and cleanup | yes | **PASS** | Deno checks; SQL/runtime; root 74 files/694 tests/build; local catalogue advisor, diff/secret/script/process/DB/resource checks and owned-output cleanup | Android/iOS N/A: no native source/config/dependency change. |
| Hosted provider/schema/Edge/web, real submission/account/device | no — separate gate | NOT RUN | Release manifest after local acceptance | Data/provider/deploy/device authority required. |

**Rollback/stop:** Code rollback must preserve readable R2-only versions. Down refuses any version or
reconciliation row. Hosted rollback requires backup/restore and an exact object manifest; Git revert
is insufficient. Stop on ambiguous review authority, history loss, unbounded buffering, live secrets
or <10 GiB free. Required FAIL/NOT RUN blocks local acceptance.

## Acceptance record — 23 September 2026

- Product/test commit `4049266` adds immutable `assignment_submission_file_versions`, a stable
  current pointer, service-only reserve/commit/reconcile operations, direct bounded Edge streaming
  to private R2 and domain-separated assignment read tickets. A resubmit archives the full prior
  submission and its version pointer in the same transaction before switching current bytes; the
  old object is never deleted. Legacy Drive reads remain available in mixed mode, while legacy
  upload/delete/migration paths refuse or exclude a new R2-backed row.
- PostgreSQL 17 passed initial/resubmit history, owner/chef/same-section visibility, wrong-tenant and
  wrong-section refusal, active/lock/target checks, passive DOCX, concurrent reservation ordering,
  one-shot push claims, exact down and down refusal when reconciliation/object state exists. The
  source database was unchanged and disposable databases were removed. The local Supabase CLI
  advisor could not load its absent `pgsql_check` extension, so no CLI-advisor pass is claimed; an
  explicit catalogue audit passed invalid-index, unvalidated-constraint, forced-RLS,
  security-definer search-path, client-grant and immutable-trigger checks.
- Deno checked both new entrypoints. Signed loopback runtime passed exact server hash/readback and
  idempotent replay for WAV and generic passive binary, provider MIME mismatch cleanup, lost commit
  response recovery, authorized range reads and raw-ID refusal. Focused tests passed 5 files/27
  cases. Root `pnpm check` passed lint/types, 74 files/694 tests, service worker and production build.
- Final production Chrome at 412x915 passed private initial submit, resubmit and retained history:
  two compatibility notifications, three tickets, two private reads, zero Drive calls and zero page
  errors. The first two browser-harness attempts exposed stale modal/page-lifecycle timing; the
  bounded harness now uses separate initial/reload/resubmit lifecycles without weakening product
  behavior. No mobile source/config/dependency changed, so platform builds are N/A for this package.
- Affected-path secret patterns, script syntax, diff whitespace, ports and owned databases were
  clean. About 521 MiB build output, coverage and the screenshot were removed from the workspace
  and moved to Trash; measured free space remains 39,778,592 KiB (~37.94 GiB), above the 10 GiB
  stop floor. The unrelated `supabase/.temp/cli-latest` remains unstaged.

**Unverified boundary:** no hosted schema/function/web release, real R2/Drive object, credential,
real account/user/file or device was touched. Reviewer audio/private-note lifecycle, assignment
retention/deletion, legacy copy/cutover, comment/chat media and public Drive ACL revocation remain.
