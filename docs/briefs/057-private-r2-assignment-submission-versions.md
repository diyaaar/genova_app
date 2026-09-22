# 057 — Private R2 assignment submission versions

**Status/date/writer:** READY / 2026-09-22 / primary agent.

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
| Immutable version schema/RLS/RPC and exact rollback | yes | NOT RUN | Isolated PostgreSQL 17 forward/down/forward; owner/reviewer/section/choir/lock/inactive/concurrent resubmit matrix | Hosted migration separate. |
| Bounded private upload/read and no destructive reorder | yes | NOT RUN | Actual local Edge + signed loopback provider; verify-before-current, previous version retained, retry/reconciliation and explicit history read | Loopback is not real R2. |
| Web assignment compatibility | yes | NOT RUN | Focused route/UI tests plus production Chrome initial submit/resubmit/history/failure; zero Drive/public URL for R2 path | No native/device inference. |
| Required final gates and cleanup | yes | NOT RUN | Deno/SQL/runtime, root `pnpm check`; mobile only if shared/native assignment code changes; diff/secret/advisor/resource cleanup | iOS grouped unless platform-sensitive. |
| Hosted provider/schema/Edge/web, real submission/account/device | no — separate gate | NOT RUN | Release manifest after local acceptance | Data/provider/deploy/device authority required. |

**Rollback/stop:** Code rollback must preserve readable R2-only versions. Down refuses any version or
reconciliation row. Hosted rollback requires backup/restore and an exact object manifest; Git revert
is insufficient. Stop on ambiguous review authority, history loss, unbounded buffering, live secrets
or <10 GiB free. Required FAIL/NOT RUN blocks local acceptance.
