# 059 — Private R2 repertoire comment audio lifecycle

**Status/date/writer:** LOCAL ACCEPTANCE COMPLETE / 2026-09-23 / primary agent.

**Start checkpoint:** HEAD `45a0e45`; only user-owned `supabase/.temp/cli-latest` is dirty.
38,792,124 KiB (~37.0 GiB) free; no listener, simulator or disposable database remains. Source and
restored-schema inspection confirmed the Drive/base64/public-ACL path above and a schema-history
gap: `is_hidden` exists in the restored production snapshot but not in checked-in migrations. The
tenant-wide permissive policy also means UI filtering alone cannot protect hidden comments. 059
must add a restrictive live-visibility policy and actor-bound content recheck; it must not treat the
existing UI filter as authorization. No hosted lookup or mutation was performed.

**Observable result:** An authorized chef or same-section leader can publish a text-only comment or
a bounded private audio comment without Drive; only the existing target audience can read the audio,
and creator/chef deletion reaches a recoverable terminal state without a public provider URL or an
orphaned active row.

## Current work card

- **Dependency:** accepted 052–058, product `ce2b438`. Read AGENTS, handoff/active context,
  transition guide/work cycle, this brief, 052, 055 and the current comment UI/Drive actions/RLS.
- **Three actions:** establish exact comment/target/delete authority and provider-neutral identity;
  add bounded stream/create/read/delete plus web adapters; run SQL/runtime/browser/full gates,
  review, record and clean.
- **Exit:** audio create/read/delete and text-only create work without Drive in production Chrome;
  global/voice-group/hidden/wrong-tenant/revoked-ticket rules pass SQL and actual local HTTP. Required
  FAIL or NOT RUN keeps 059 open.

## Start evidence and contract

- `ChefCommentSection` currently reads/writes `repertoire_song_comments`, but audio create/delete is
  delegated through `lib/drive.ts` to `drive-manager-v2`. That path base64-buffers up to 20 MiB,
  requires a song Drive folder, makes the object public and deletes provider bytes before deleting
  the row. Text-only comments unnecessarily enter the same Google-token action boundary.
- Preserve comment UUID, rich-text sanitation, chef global target, section-leader own voice-group
  target, chronological display, creator edit/delete, chef hide/unhide and existing realtime
  invalidation. Audio comments remain non-editable unless exact source behavior proves otherwise.
- Add one immutable private audio identity linked to the comment and choir/song/creator. Server owns
  the R2 key. Stream exact allowlisted audio with size, SHA-256, provider readback and idempotent
  reconciliation. Never expose R2 credentials, provider URL or public bucket access.
- Read authorization is live on every content request: active current-choir member plus chef, global
  target, or matching voice group, and the comment must remain visible to that actor. Actor-bound
  tickets must stop before provider access after hide, target change, membership/role loss or delete.
  Comment audio bypasses offline repertoire caching.
- Text-only create/update/hide must not require R2 or Google. New audio create and delete belong in
  Edge/database authority; web becomes an adapter. Legacy Drive comment audio remains readable in
  mixed mode until controlled copy/cutover.
- Deletion must not repeat the current provider-first loss window. Use an explicit state/idempotent
  operation so retry can reconcile DB and object outcomes. No historical Drive object is deleted,
  copied or ACL-revoked in this package.

## Resources and authority

- Reuse PostgreSQL 17, Deno, loopback S3 provider and installed Chrome. One heavy process at a time;
  estimated additional workspace peak below 1 GiB. Preflight free space must stay >=10 GiB; remove
  disposable DB/build/coverage/browser output before delivery.
- Authorized: scoped local source/tests/migration/down/brief/status and commits. Not authorized:
  hosted schema/function/web release, provider activation/region/bucket/credentials, real data/files,
  spending, Drive deletion/ACL change, device or distribution.
- One writer. Preserve unrelated `supabase/.temp/cli-latest`. Stop on ambiguous hidden/voice-group
  visibility, non-recoverable delete, unbounded buffering, live secrets or disk floor.

## Expected file boundary

- `components/repertuvar/ChefCommentSection.tsx`, narrow `lib/` comment/protected-file adapters and
  focused tests.
- One `supabase/migrations/*059*`, exact `supabase/rollback/*059*`, SQL matrix and bounded runtime
  support under `supabase/test-support/`.
- Narrow `supabase/functions/repertoire-comment-*` entrypoints reusing accepted R2 stream/read
  primitives. Modify shared primitives only when the comment contract requires it and rerun every
  affected consumer test.
- This brief and minimal plan/handoff/memory/MIGRATION indexes. No chat, native assignment,
  retention-policy, bulk-copy or provider setup refactor.

## Mandatory acceptance evidence

| Criterion | Required? | Status | Proof required | Limit |
|---|---|---|---|---|
| Comment/audio schema, authority and exact rollback | yes | **PASS** | Isolated PostgreSQL 17 forward/down/refusal; chef/section/global/voice/wrong-voice/wrong-choir/hidden/delete/retry, legacy-audio orphan refusal and catalogue checks | Hosted migration separate. |
| Bounded private create/read/delete | yes | **PASS** | Actual Deno HTTP + signed loopback S3: exact SHA-256/readback, committed replay, failed-readback cleanup, lost-response reconciliation, Range, old-ticket live revocation, text create and exact-key delete/replay | Loopback is not real R2. |
| Web compatibility | yes | **PASS** | Focused 5 files/21 cases and production Chrome 412x915: text/audio create, private play, other-author hide/unhide, creator delete; 1 upload, 2 tickets, 1 content read, zero Drive/errors | No device inference. |
| Required gates and cleanup | yes | **PASS** | Deno check; SQL/runtime; root `pnpm check` 83 files/722 tests, SW syntax and production build; diff/script/resource review; generated output and listeners removed | No mobile/shared-native change; iOS remains grouped. |
| Hosted/provider/real-data/device | no — separate gate | NOT RUN | Controlled release/copy manifest later | Authority required. |

**Rollback:** down refuses accepted/private object or unresolved create/delete state. Hosted rollback
must preserve any R2-only comment and object manifest; Git revert is not data rollback. The result
record must name residual legacy reads and the next Drive family.

## Result

- Product commit `879d4ec` adds immutable private comment-audio versions, server-owned bounded
  upload/read/delete, actor-bound tickets with live target/hidden recheck and Google-free text
  creation. Comment audio never enters the offline repertoire cache. Legacy Drive audio remains a
  mixed-read/delete compatibility path and cannot be directly deleted into an orphaned object.
- SQL acceptance passed exact forward/down and unresolved-provider refusal without changing the
  source restore. The matrix covers chef/global, section leader/own voice, singer, wrong voice,
  wrong choir, hidden visibility, immutable identity, idempotent text/upload/delete and legacy
  audio direct-delete refusal. The restored production snapshot still exposes the pre-existing
  `is_hidden` migration-history gap; 059 fails closed if that column is absent.
- Actual local signed S3 HTTP passed SHA-256 readback, Range, replay, cleanup and live ticket
  revocation before provider access. Production Chrome passed the visible flow at 412x915 with
  zero Drive calls or page errors. Root gates passed 83 files/722 tests plus production build.
- Hosted schema/functions/flags, real R2, current live Drive objects/ACLs, deployment, real users,
  device and publication are **NOT RUN** and remain separate authority. Existing Drive objects are
  neither copied nor removed by this package.
- `.next`, coverage and browser screenshot left the workspace; disposable DB/listeners are gone.
  Free space after cleanup was 37,689,584 KiB (~35.9 GiB). The unrelated
  `supabase/.temp/cli-latest` remains unstaged.

**Next:** prepare the remaining Drive-owned chat image/message and room-avatar family as one
room-authorized private-media flow, then the controlled provider/copy/cutover package. Do not
activate a provider or inspect/copy live data without the applicable owner authority.
