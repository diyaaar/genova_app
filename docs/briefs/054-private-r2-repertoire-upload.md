# 054 — Private R2 repertoire upload and catalogue readiness

**Status/date/writer:** LOCAL ACCEPTANCE COMPLETE / 2026-09-22 / primary agent.

## Start checkpoint — 21 September

- Read handoff, active context, execution controls, transition guide/work cycle, relevant
  decisions/MIGRATION, 053 mapping/read sources and current web/native upload/catalogue callers.
  HEAD `8e6f7c1`; sole unrelated dirty path `supabase/.temp/cli-latest` is preserved.
- Authorized paths: this brief/status records; 054 migration/down/SQL/runtime tests;
  `supabase/functions/repertoire-upload/`, narrow R2 helper/config changes;
  `lib/repertuvar/`, `lib/drive.ts`, AddSong/SongEdit upload callers and native catalogue/tests.
- Three actions: implement atomic upload reservation/verification/cleanup; connect existing web
  callers and shared catalogue readiness; review and execute required acceptance gates.
- Free space 21,133,028 KiB. Reuse installed Deno, signer, Node and local PostgreSQL 17.
  Estimated peak <2 GiB (disposable database <100 MiB, root build <600 MiB, one Android export
  <300 MiB and bounded test data). Delete owned DB/listeners/build/export/coverage after evidence.
- Keep the existing SongEdit 100 MiB ceiling. FileUploadModal's 20 MB hint is not a separate
  server limit; reconcile the active caller text without reducing supported SongEdit uploads.
- Current official references checked: Supabase changelog/Edge limits and Cloudflare S3/aws4fetch.
  Stream server upload and readback with incremental hashing. Retrying a still-running upload
  returns a pending/conflict result; no time-based automatic takeover. An uncertain DB commit
  must be resolved atomically before deleting an object, or left explicit for reconciliation.

### Runtime diagnostic checkpoint

The first two HTTP probes failed before accepting an upload: the provider observed 69 bytes but
no Content-Length. Deno fetch drops that header for a streaming request body; signing was valid.
Reassessed the transport instead of repeating a build: use Deno's Node-compatible HTTP request
for signed PUT with backpressure and exact length, retaining fetch for GET/DELETE. This keeps
memory bounded without a full-file buffer or local mirror. Validate via the same actual endpoint.

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
- Use `choirs/<choir UUID>/repertoire/<file UUID>/content` and the configured private
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
| Atomic reservation/commit, tenant/role/idempotency and exact rollback | yes | **PASS** | 2026-09-22 isolated PostgreSQL 17 forward/down/forward, service-only privilege, role/tenant and concurrent reserve matrix | Hosted migration separate. |
| Exact signed private upload, bounded stream, read-back hash/MIME/length and owned cleanup | yes | **PASS** | Actual local `Deno.serve` + signed loopback provider: 69-byte PDF and 48-byte WAV, exact SHA-256, nine signed requests | Loopback provider is not real R2. |
| Web upload adapter and web/native catalogue readiness parity | yes | **PASS** | 38 focused cases; mobile 49 suites/288 tests; 1,438-module Android export; production Chrome 412×915 reload/resume and R2-only catalogue | No device/provider inference. |
| Failure matrix | yes | **PASS** | Wrong role/choir/song, duplicate/conflicting retry, size/content/MIME/redirect/readback, provider/commit/cleanup uncertainty and no-Drive fallback cases | Reconciliation states deliberately retain uncertain objects. |
| Required final gates and cleanup | yes | **PASS** | Deno `--no-config` check; SQL/runtime; root 69 files/648 tests/build; mobile gate/export; diff/secret/listener/database checks; owned output cleanup | iOS grouped because no platform-specific/native dependency change; no hardware. |
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

## Acceptance record — 22 September 2026

- Product/test commit `9459732` adds a server-owned Edge upload, service-only PostgreSQL
  transaction, exact down migration, bounded original-`File` streaming, server-computed SHA-256,
  private readback verification, retry/reconciliation state and folder-free web/native catalogue.
  Clients receive only the committed file row; provider key, URL and credentials remain server-side.
- The isolated PostgreSQL runner passed forward/role/tenant/idempotency checks, exact down,
  restored-forward, one-lease/one-pending concurrent reserve and down-refusal with unreconciled
  records. Its owned database was removed. Database advisors exited successfully with no error;
  existing project-wide RLS-initplan/permissive-policy/search-path warnings remain historical and
  are not claimed fixed by 054.
- The actual local HTTP composition passed PDF/WAV upload, signed PUT/GET, exact byte/hash readback,
  replay, wrong-song denial, MIME cleanup and lost-commit response recovery. The first two probes
  exposed Deno fetch stripping streaming `Content-Length`; after the required reassessment, the
  PUT transport changed to the Node-compatible backpressure path and passed. No full-file local
  copy or client-side hashing remains.
- A plain Deno 2.9 check initially inherited root Next.js `baseUrl` and failed on TypeScript 6's
  deprecation gate. `deno check --no-config` then checked the Edge entrypoint and runtime source;
  no product config was weakened. Focused tests passed 4 files/38 cases. Root `pnpm check` passed
  lint, types, 69 files/648 tests, service worker and the production build.
- Mobile typecheck plus 49 suites/288 tests and the Android export (1,438 modules, 4.4 MB bundle)
  passed after the shared readiness predicate changed. Production Chrome at 412×915 passed new
  song creation, failed upload, reload/reselect with the same song/retry identities, private-only
  catalogue visibility, zero Drive calls and zero page errors. The first selector was ambiguous;
  the final acceptance targeted the form submission contract rather than a duplicate label.
- Secret-pattern scan found zero affected files; ports 4174/8000/18055 and owned 054 databases
  were absent after testing. Generated build, coverage, Android-export and screenshot evidence is
  rebuildable and removed after recording (about 529 MiB reclaimed); 40,593,796 KiB remained free.
  `supabase/.temp/cli-latest` remains unrelated/unstaged.
- The first documentation link checker over-normalized GitHub heading slugs and the second had a
  checker-only regex syntax error. After the two non-mutating failures, the check was reduced to
  GitHub's relevant heading transformation; 184 local links/anchors and `git diff --check` passed.

**Unverified boundary:** no Cloudflare account/bucket/region, bill, secret, hosted schema, Edge/web
deployment, real file, phone or user account was touched. R2 replacement/delete and all other Drive
file families remain blocked from private-write use rather than silently falling back.
