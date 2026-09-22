# 056 — Private R2 repertoire cover lifecycle

**Status/date/writer:** LOCAL ACCEPTANCE COMPLETE / 2026-09-22 / primary agent.

## Start checkpoint — 22 September

- Read AGENTS, handoff/active context, transition guide/work cycle, 052–056, protected-file
  validation and current cover caller/predicates. HEAD `bd40978`; unrelated
  `supabase/.temp/cli-latest` stays unstaged.
- Authorized paths: this brief/status; one 056 migration/down/SQL compatibility test; narrow 054
  upload stream/metadata, web upload/cover caller, protected-file and focused/runtime/browser tests.
- Three actions: define exact cover metadata/magic contract; adopt existing cover caller and private
  read/lifecycle; review then run affected integration/final gates.
- Free space 40,618,244 KiB. Reuse existing runtimes/provider/browser; estimated peak <1 GiB, one
  heavy process. Remove owned build/coverage/browser/database/listener output after evidence.
- Existing active caller accepts PDF plus JPG/JPEG, PNG, WebP, GIF, BMP and AVIF. 056 narrows MIME
  and magic bytes to those forms; no generic `image/*`, SVG, arbitrary `other` or MIDI expansion.

**Observable result:** A current choir manager can upload, view, replace and delete a passive
PDF/raster song cover through private R2 without creating a Drive folder or public URL. Cover bytes
use the existing protected-file ticket, exact content verification and 055 cleanup lifecycle; web
catalogue/edit views preserve the current `__cover__` behavior and mobile catalogue data remains
compatible.

**Start:** Accepted 053–055, product `dd21522`. Read AGENTS, handoff/active context, transition
guide/work cycle, 052–056, protected-file MIME refusal, current cover predicates/callers and the
execution controls. Verify worktree ownership/disk/resources. Preserve `supabase/.temp/cli-latest`.

## Bounded contract

- Extend the existing 054 upload handler; no new client provider path or Next API route. Accept only
  `fileType=other` with the exact cover partition marker and an allowlisted passive PDF/raster MIME.
  Verify magic bytes, exact size and server-computed SHA-256 on upload and readback. SVG/XML/HTML,
  polyglot-active extensions, unsupported/ambiguous MIME and renamed content refuse.
- Keep the private key, 053 mapping and 055 exact-target cleanup. A replacement commits the new
  cover before retiring the old one; provider cleanup uncertainty is visible and retryable. Legacy
  Drive covers continue unchanged in mixed mode; mixed replacement never silently deletes both.
- Make `uploadSongFile(..., 'other', '__cover__')` use R2 only for the exact allowed cover contract.
  Other `other` and MIDI callers remain legacy/refused until inventoried; do not broaden arbitrary
  file upload. Web catalogue thumbnails continue through protected access and never use an R2 URL.
- No non-cover MIDI/other, assignments/history/review audio, comments, chat/avatar, bulk copy,
  public ACL revocation, hosted release or source deletion in this package.

## Acceptance

| Criterion | Required? | Initial status | Proof required | Limit |
|---|---|---|---|---|
| Exact passive cover validation and tenant/role authorization | yes | **PASS** | 2026-09-22 focused handler/web + isolated SQL: PDF/JPEG/PNG/WebP/GIF/BMP/AVIF signatures; SVG, null/MIME-extension mismatch, forged/truncated bytes denied | Header validation is not malware scanning. |
| Private upload/read/replace/delete composition | yes | **PASS** | Actual local Edge + signed loopback PDF/WAV/PNG upload/readback/replay; 055 lifecycle regression and Chrome replace/delete | Loopback is not real R2. |
| Web and catalogue compatibility | yes | **PASS** | Production Chrome cover add/replace/delete, 2 private tickets/2 reads, zero Drive/public URL/errors; mobile catalogue/reader 2 suites/12 cases | No device inference. |
| Final gates and cleanup | yes | **PASS** | Deno checks; SQL forward/down/refusal; focused 3 files/45 cases; root 71 files/674 tests/build; advisor/diff/secret/process/DB checks and cleanup | Android/iOS build N/A: no native source/config/dependency change. |
| Hosted provider/schema/Edge/web, real file/account/device | no — separate gate | NOT RUN | Release manifest after local acceptance | Provider/data/deploy/device authority required. |

**Rollback/stop:** Roll back the cover client only while no R2-only cover depends on it. Schema
rollback follows 053–055 ordering and never deletes an object. Stop on ambiguous content validation,
public URL need, unbounded memory, live credentials or <10 GiB free. Required FAIL/NOT RUN blocks
local acceptance.

## Acceptance record — 22 September 2026

- Product/test commit `d7c960b` extends only the exact `other + __cover__` contract. The Edge and
  service-only 056 wrapper require matching allowlisted extension/MIME, then constant-memory magic,
  size and SHA-256 verification. The 054 transaction still owns commit/cleanup and 055 owns exact
  deletion; arbitrary `other`, MIDI and active web content remain unavailable.
- PostgreSQL 17 passed service-only privilege, manager/song scope, metadata rejection,
  reserve/pending/commit/replay, active 053 mapping, exact down and down refusal while a cover upload
  record exists. The first matrix run exposed SQL three-valued handling of JSON null; validation now
  coalesces absent/null type, partition and MIME to refusal, and the regression passes. Disposable
  databases were removed. Advisors exited zero with no new error; historical project warnings remain.
- Deno checked upload/read entrypoints. Actual signed loopback runtime passed PDF, WAV and 16-byte
  PNG upload/readback/replay with server hashes and eleven provider requests. Focused web/handler/
  protected-URL tests passed 3 files/45 cases. Root `pnpm check` passed lint, types, 71 files/674
  tests, service worker and production build. Mobile catalogue/reader regression passed 2 suites/
  12 cases; no native source or bundle changed.
- The first browser fixture had no file and was correctly hidden by 054 catalogue readiness. The
  fixture was corrected with an existing private score rather than weakening product behavior.
  Production Chrome at 412×915 then passed private cover add/replace/delete, two protected tickets,
  two private content reads, zero Drive calls/public provider URLs and zero page errors.
- Secret-pattern scan found zero affected files; ports and owned databases were absent. About
  464 MiB of rebuildable build/coverage/screenshot output was removed; 40,492,424 KiB (~38.62 GiB)
  remained free. `supabase/.temp/cli-latest` remains unrelated and unstaged.

**Unverified boundary:** no hosted schema/function/web release, real R2/Drive object, account,
credential, user or device was touched. Assignments/history/review audio, comment audio, chat media/
avatars, inactive MIDI/other callers, copy/cutover and public ACL revocation remain Drive-exit work.
