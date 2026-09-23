# 059 — Private R2 repertoire comment audio lifecycle

**Status/date/writer:** READY / 2026-09-23 / unassigned.

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
| Comment/audio schema, authority and exact rollback | yes | NOT RUN | Isolated PostgreSQL 17 forward/down/refusal; chef/section/global/voice/wrong-voice/wrong-choir/hidden/delete/retry matrix and catalogue checks | Hosted migration separate. |
| Bounded private create/read/delete | yes | NOT RUN | Actual Edge HTTP + signed loopback provider; exact hash/readback, replay/reconciliation, Range and live ticket revocation; no orphan active row | Loopback is not real R2. |
| Web compatibility | yes | NOT RUN | Focused tests and production Chrome 412x915 text-only + audio create/play/hide/delete with zero Drive/public provider URL | No device inference. |
| Required gates and cleanup | yes | NOT RUN | Deno/SQL/runtime, root `pnpm check`, diff/secret/script/resource review; mobile only if shared/native code changes | iOS remains grouped unless platform-sensitive. |
| Hosted/provider/real-data/device | no — separate gate | NOT RUN | Controlled release/copy manifest later | Authority required. |

**Rollback:** down refuses accepted/private object or unresolved create/delete state. Hosted rollback
must preserve any R2-only comment and object manifest; Git revert is not data rollback. The result
record must name residual legacy reads and the next Drive family.
