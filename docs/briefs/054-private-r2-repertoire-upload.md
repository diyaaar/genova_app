# 054 — Private R2 repertoire upload and catalogue readiness

**Status/date/writer:** READY FOR LOCAL IMPLEMENTATION / 2026-09-21 / primary agent.

**Observable result:** An authenticated authorized repertoire manager can create one PDF/audio file
for an existing choir/song through server-owned Edge logic. Bytes reach the exact private R2 key,
are read back and verified, and the file row plus inactive-to-active 053 mapping commit atomically.
The existing web and native catalogues then show the song without requiring `drive_folder_id`.
Legacy repertoire remains readable and no public provider URL or credential reaches a client.

**Start:** Product `beb4842`; 053 local acceptance and [052 inventory](052-drive-exit-inventory.md).
Read AGENTS, handoff/active context, transition guide, 053, the current upload/caller sources and
current Cloudflare/Supabase references before editing. Verify worktree ownership and disk. One
writer; leave `supabase/.temp/cli-latest` unstaged. This package does not authorize provider or live
schema activation.

## Bounded scope and contract

- Add one Edge write entrypoint under `supabase/functions/` plus the smallest shared R2 PUT/GET/
  cleanup helpers; no new Next API route. Adopt the existing web action through a narrow adapter.
  Native has no repertoire-upload UI in this package.
- Add only the schema/RPC/idempotency fields needed to reserve and atomically commit an existing
  song's new file plus 053 mapping. Migration name comes from the Supabase CLI; exact down and an
  isolated forward/down/forward test are mandatory. Preserve file UUIDs and legacy columns.
- Accept passive PDF/audio only, bounded by an inspected existing product limit. Authorize from
  real Auth user + active choir + current server-owned repertoire role; caller-supplied choir,
  role, verification or provider location grants nothing. Cross-song/choir writes fail closed.
- Stream upload with bounded byte counting; do not base64 or retain a local full-file mirror.
  Read the provider object back server-side, verify exact length/MIME/SHA-256, then activate.
  A retry key must return the same committed result or a conflict, never duplicate bytes/rows.
- Use `choirs/<choir UUID>/repertoire/<file UUID>/<opaque safe name>` and the configured private
  bucket only. Provider redirect, path traversal, wrong bucket, size drift, active content and
  hash mismatch fail without DB activation. If commit fails, remove only the task-owned uncommitted
  object; a failed cleanup remains explicit for reconciliation.
- Catalogue readiness becomes `legacy drive_folder_id OR at least one accessible file row` (or an
  equivalently proven server-owned predicate), applied consistently to web and native. Do not
  expose all empty legacy songs and do not make clients read private location rows.
- Deletion, replacement/history, comments, submissions/review audio, chat/avatar, bulk copy,
  public Drive ACL revocation and source deletion remain later packages. Do not rebuild them here.

## Acceptance and resource gates

| Criterion | Required? | Status | Proof to collect | Limit |
|---|---|---|---|---|
| Atomic reservation/commit, tenant/role/idempotency and exact rollback | yes | NOT RUN | Isolated PostgreSQL 17 forward/down/forward and denied-role/concurrency matrix | Hosted migration separate. |
| Exact signed private upload, bounded stream, read-back hash/MIME/length and owned cleanup | yes | NOT RUN | Maintained signer tests plus actual local Edge + signed loopback provider PDF/WAV | Mock provider is not real R2. |
| Web upload adapter and web/native catalogue readiness parity | yes | NOT RUN | Focused web/shared/mobile tests; R2-only complete song visible, empty legacy song hidden | No device/provider inference. |
| Failure matrix | yes | NOT RUN | Wrong role/choir/song, duplicate retry conflict, oversized/truncated/active MIME, redirect/provider/commit/cleanup failures | No silent Drive fallback or orphan claim. |
| Required final gates and cleanup | yes | NOT RUN | Deno check; SQL/runtime; `pnpm check`; mobile typecheck/tests and Android export if mobile query changes; exact disk/process cleanup | iOS only if platform-sensitive; no hardware. |
| Actual R2/account/CORS/secrets, hosted migration/deploy and real upload | no — separate gate | NOT RUN | Prepared release manifest after local acceptance | Spending/live/data/device approval required. |

**Resources/stop:** Start from 21,355,504 KiB free. Reuse installed `aws4fetch@1.0.20`, local
PostgreSQL and the lightweight 053 loopback runtime; no Docker/simulator unless a demonstrated gate
requires it. One heavy process, >=10 GiB. After two failed approaches, record cause and reassess.
Remove task databases/listeners/build/coverage/export outputs. Required FAIL/NOT RUN blocks closure.

**Rollback/release:** Code rollback restores the prior upload caller only while no R2-only writes
exist. Schema down is local-only until separately approved. A real rollout must order compatible
schema -> private provider/secrets -> Edge write/read -> web client -> verified canary; readers stay
mixed until reconciliation. Never roll an R2-writing client back to a Drive-only server. Keep source
Drive files and task-owned R2 objects until later approved retention/cutover rules exist.
