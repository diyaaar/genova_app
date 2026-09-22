# 058 — Private R2 assignment review audio lifecycle

**Status/date/writer:** READY / 2026-09-23 / primary agent.

**Observable result:** An authorized chef or same-section reviewer can attach or replace bounded
audio feedback on an assignment without Drive. Visible feedback remains readable by its chorist and
authorized reviewers; hidden feedback remains reviewer-only. Hide/unhide, note-only review,
resubmission history and retries preserve the exact accepted private object and never expose a
provider URL or delete the last accepted audio before a verified replacement is committed.

**Start:** Accepted 052–057, product `4049266`. Read AGENTS, handoff/active context, transition
guide/work cycle, this brief, existing review/update-note/hide-review routes and UI, private-note
RLS, 057 assignment version/ticket contract and Drive inventory. Verify worktree ownership, disk
and resources. Preserve `supabase/.temp/cli-latest`. No hosted/provider/real-data operation is
authorized.

## Bounded contract

- Add immutable provider-neutral review-audio identity and current pointers for visible submission,
  hidden private-note and retained submission-history states. A hide/unhide operation moves the
  trusted pointer and metadata atomically; it does not copy, rename, publish or delete provider
  bytes. A replacement verifies new bytes and commits the new pointer before retiring the prior
  pointer from current display. Retained versions remain for later retention policy.
- Stream the original browser file to one assignment-review Edge boundary. Keep provider keys and
  object keys server-owned; require exact size, server SHA-256, provider readback and idempotent
  retry/reconciliation. Accept only the audio forms already supported by the review UI/route unless
  exact source inspection justifies a narrower passive allowlist. Do not buffer/base64 the file in
  Next or recreate a Drive folder.
- Derive actor/current choir and review authority server-side. Chef may review the current choir;
  section leader remains limited to the matching active voice group. Visible reads follow current
  owner/reviewer rules; hidden/private reads exclude the submitter and unrelated reviewers. Version
  lookup is explicit by trusted row identity, not raw Drive/file-ID search across tables.
- Preserve existing review status, note history, hide/unhide, approve/revise, push and audit
  behavior. The web route may be a thin compatibility/notification adapter, but new storage and
  authority logic belongs under `supabase/functions/`. Legacy Drive review audio remains readable in
  mixed mode. Note-only review must not require R2 or Drive.
- Assignment submission deletion/retention, bulk legacy copy/cutover, comment audio, chat media,
  public ACL revocation and native assignment UI remain later packages. Do not delete historical
  review objects in this package.

## Acceptance

| Criterion | Required? | Initial status | Proof required | Limit |
|---|---|---|---|---|
| Immutable review-audio schema/RLS/RPC and exact rollback | yes | NOT RUN | Isolated PostgreSQL 17 forward/down; chef/section/owner/wrong-section/wrong-choir, visible/hidden/history/replacement/idempotency matrix | Hosted migration separate. |
| Bounded private upload/read and visibility transitions | yes | NOT RUN | Actual local Edge + signed loopback provider; hash/readback, retry/reconciliation, hide/unhide without object mutation and explicit visible/private/history reads | Loopback is not real R2. |
| Web review compatibility | yes | NOT RUN | Focused route/UI tests plus production Chrome attach/replace/hide/unhide/note-only/history; zero Drive/public provider URL on R2 path | No native/device inference. |
| Required final gates and cleanup | yes | NOT RUN | Deno/SQL/runtime, root `pnpm check`; mobile only if shared/native code changes; diff/secret/advisor/resource cleanup | iOS grouped unless platform-sensitive. |
| Hosted provider/schema/Edge/web, real review/account/device | no — separate gate | NOT RUN | Release manifest after local acceptance | Data/provider/deploy/device authority required. |

**Rollback/stop:** Code rollback must preserve readable R2-only review audio and hidden-state
authority. Down refuses any version/reconciliation row. Hosted rollback requires backup/restore and
an exact object manifest; Git revert is insufficient. Stop on ambiguous reviewer visibility,
current/history loss, unbounded buffering, live secrets or <10 GiB free. Required FAIL/NOT RUN
blocks local acceptance.
