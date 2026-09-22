# 056 — Private R2 repertoire cover lifecycle

**Status/date/writer:** READY / 2026-09-22 / primary agent.

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
| Exact passive cover validation and tenant/role authorization | yes | NOT RUN | Focused handler/web cases plus SQL compatibility; PDF/JPEG/PNG/WebP/GIF/BMP/AVIF success as supported, active/renamed/truncated/oversize denial | Do not claim malware scanning. |
| Private upload/read/replace/delete composition | yes | NOT RUN | Actual local Edge + signed loopback provider, protected GET, new-first replace and 055 cleanup/retry | Loopback is not real R2. |
| Web and catalogue compatibility | yes | NOT RUN | Production Chrome cover add/replace/delete, private thumbnail, zero Drive/public URL; focused shared/mobile catalogue regression | No device inference. |
| Final gates and cleanup | yes | NOT RUN | Deno check, relevant SQL/runtime, root `pnpm check`, mobile type/tests if shared source changes, Android export only if native bundle changes, diff/secret/advisor/resource cleanup | iOS grouped unless platform-sensitive. |
| Hosted provider/schema/Edge/web, real file/account/device | no — separate gate | NOT RUN | Release manifest after local acceptance | Provider/data/deploy/device authority required. |

**Rollback/stop:** Roll back the cover client only while no R2-only cover depends on it. Schema
rollback follows 053–055 ordering and never deletes an object. Stop on ambiguous content validation,
public URL need, unbounded memory, live credentials or <10 GiB free. Required FAIL/NOT RUN blocks
local acceptance.
