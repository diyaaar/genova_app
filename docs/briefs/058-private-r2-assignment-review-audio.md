# 058 — Private R2 assignment review audio lifecycle

**Status/date/writer:** LOCAL ACCEPTANCE COMPLETE / 2026-09-23 / primary agent.

## Start checkpoint — 23 September

- Read AGENTS, handoff/active context, transition guide/work cycle, 052/057/058, current review,
  update-note, hide-review, Drive upload/access, private-note/history policies and R2 skill guidance.
  Verified HEAD `a1bfeff`; unrelated `supabase/.temp/cli-latest` remains unstaged.
- Current review audio buffers up to 20 MiB into base64 in Next, creates/uses Drive folders and makes
  the object public. Review mutation is split across provider upload, private-note upsert, public
  submission update and audit insert. Hide/unhide is also a multi-write route.
- A hidden review is absent from owner-visible submission fields. On 057 resubmit the private row is
  deleted while only public fields enter owner-readable history, so hidden note/audio cannot safely
  be copied into that table and currently loses its database reference. 058 must retain it in a
  separate reviewer-only history snapshot; putting hidden content in owner-readable history is
  forbidden.
- Authorized paths: this brief/status; one 058 migration/down/SQL matrix; narrow review-audio Edge,
  shared ticket/client/UI and review/hide/update compatibility; focused/runtime/browser tests. No
  provider, hosted schema, deploy, credentials, real user/data or device action is authorized.
- Four bounded actions: add immutable review audio and private-history authority; stream/verify and
  atomically commit review state; adopt visible/private/history protected reads and compatibility;
  review, run local gates, record and clean. Reuse existing runtimes, one heavy process, peak below
  1 GiB. Free space is 39,778,592 KiB (~37.94 GiB), above the 10 GiB stop floor.

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
- Retain a hidden review across submission resubmit in a reviewer-only snapshot linked to the public
  history row. The owner-readable history row may store only visible review fields. Direct RLS/API
  access by the submitter must not reveal hidden note text, audio identity or metadata.
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
| Immutable review-audio schema/RLS/RPC and exact rollback | yes | **PASS** | Isolated PostgreSQL 17 forward/down/refusal; chef/section/owner/wrong-section/wrong-choir, visible/hidden/history/replacement/idempotency and live-ticket revocation matrix | Hosted migration separate. |
| Bounded private upload/read and visibility transitions | yes | **PASS** | Actual local Edge + signed loopback provider; exact hash/readback, replay/reconciliation, actor-bound read, Range and post-hide old-ticket refusal before provider access | Loopback is not real R2. |
| Web review compatibility | yes | **PASS** | Focused 6 files/39 cases plus production Chrome 412x915 attach/replace/hide/unhide/note-only/private-history; 2 uploads/notifications/tickets, 1 read, zero Drive/error | No native/device inference. |
| Required final gates and cleanup | yes | **PASS** | Deno/SQL/runtime; root `pnpm check` 79 files/708 tests/service-worker/build; diff/secret/script/port/resource review and owned-output cleanup | Mobile N/A: no native/shared-mobile source changed. |
| Hosted provider/schema/Edge/web, real review/account/device | no — separate gate | NOT RUN | Release manifest after local acceptance | Data/provider/deploy/device authority required. |

**Rollback/stop:** Code rollback must preserve readable R2-only review audio and hidden-state
authority. Down refuses any version/reconciliation row. Hosted rollback requires backup/restore and
an exact object manifest; Git revert is insufficient. Stop on ambiguous reviewer visibility,
current/history loss, unbounded buffering, live secrets or <10 GiB free. Required FAIL/NOT RUN
blocks local acceptance.

## Acceptance record — 23 September 2026

- Product/test commit `ce2b438` adds immutable private review-audio versions, atomic visible/private
  pointer transitions, reviewer-only hidden history and service-only notification claims. The web
  streams bounded audio directly to the Edge boundary; legacy Drive reads and note-only review stay
  compatible while new R2 audio never receives a public provider URL.
- PostgreSQL 17 passed exact forward/down and non-empty rollback refusal, upload/replace/retry,
  owner/chef/same-section/wrong-section/wrong-choir, visible/hidden/private-history and one-shot
  notification checks. A hidden resubmit stores its note/audio only in reviewer-readable history;
  the submitter cannot select either the private snapshot or its immutable version.
- Code review found two gaps after the first green run: an issued read ticket could have survived a
  later hide, and the generic offline cache could have retained formerly visible review audio. The
  accepted revision binds tickets to the actor and rechecks current database visibility on every
  content request; the same old ticket is refused before R2 after hide. Review audio bypasses the
  offline cache. Focused tests then passed 6 files/39 cases and both Edge entrypoints type-checked.
- Actual Deno HTTP with a signed loopback S3 provider passed exact upload/readback SHA-256,
  idempotent replay, failed verification cleanup, lost-commit recovery, authorized Range read,
  raw-ID refusal and post-hide old-ticket refusal without a provider request. Production Chrome at
  412x915 passed two private audio reviews, replacement, chef hide/unhide, note-only review and
  reviewer-only retained history with two notification claims and zero Drive calls/page errors.
- Final root `pnpm check` passed lint/types, 79 files/708 tests, service-worker syntax and production
  build. No mobile source/config/dependency changed, so Android/iOS builds are N/A for this package.
  Build, coverage and browser screenshot outputs were removed from the workspace; listeners and
  disposable databases are gone. 38,792,124 KiB (~37.0 GiB) remained free. The unrelated
  `supabase/.temp/cli-latest` stayed unstaged.

**Unverified boundary:** no hosted schema/function/web release, real R2/Drive object, credential,
real account/user/file, push delivery or device was touched. Existing Drive review objects were not
copied or revoked. Assignment retention/deletion, comment/chat media, controlled copy/cutover and
provider/device release remain required.
