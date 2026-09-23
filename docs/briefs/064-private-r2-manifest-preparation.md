# 064 — Verified private R2 manifest preparation

**Status/date/writer:** ACCEPTED LOCALLY / 2026-09-23 / primary agent.

**Observable result and user need:** An authorized operator can transform one exact 063 inventory
snapshot into a private 062 copy manifest using current Google Drive metadata, while preserving a
sidecar report for every excluded/unresolved row and without downloading media bytes or touching R2.

**Delivery focus:** Close the remaining manual control-plane gap between [063's deterministic
inventory](063-private-r2-copy-inventory-contract.md) and [062's bounded copy executor](062-bounded-private-r2-copy-executor.md).
The accepted local result is a fail-closed metadata-only preparation command and pure contract,
not a real Google query, R2 activation, object copy or database activation.

**Start evidence:** `main/f920593`; accepted product/schema/test `a69a936`/063. Only unrelated
`supabase/.temp/cli-latest` is dirty. 40,737,716 KiB (~38.9 GiB) is free. 063 intentionally emits
stored hints/status rather than a manifest; 062 forbids hand-edited identities and requires exact
name/MIME/length. The current Google Drive `files.get` contract exposes metadata by ID and supports
shared-drive requests; Google-native documents are not blob copy candidates. No real account,
credential, hosted row or provider action is authorized.

**Current work card:**

- User benefit: after approval, the release operator can produce a complete, review-bound copy
  manifest without hand-editing live identifiers or silently dropping broken legacy references.
- Next actions: implement exact inventory/parser/enrichment/report core; add an external-private-path
  CLI using the existing OAuth metadata adapter; run focused failure/atomic-output and root gates.
- Exit: required local rows pass, source/docs commits are separate, generated build/test output is
  removed, and Google/R2/hosted/copy/device/release remain NOT RUN.

**Resources:** New source/tests/docs below 200 KiB. Focused tests use synthetic metadata and private
temporary text files below 2 MiB. One final root gate may peak near 2 GiB based on 062; current
headroom remains above the 10 GiB floor. No DB clone, media download, VM or simulator. Remove
`.next`, coverage and test temp output after the final dependent check.

## Allowed paths

- `scripts/private-r2-manifest-core.ts`: exact 063 row parsing, fingerprint, status policy,
  metadata reconciliation, six-family limits and 062 manifest/report composition.
- `scripts/private-r2-manifest.ts`: operator CLI, private external files, exact snapshot approval,
  metadata-only Google adapter and atomic manifest/report publication.
- `scripts/private-r2-manifest.test.ts`: pure, filesystem, refusal and bounded preparation proof.
- Minimal reuse/export adjustments in `scripts/private-r2-copy.ts` or core only when required;
  accepted 062 copy/verification behavior and manifest schema must remain unchanged.
- This brief; after acceptance the runbook and concise handoff/active/progress/plan/MIGRATION indexes.

## Contract

- Input is JSONL exported directly from one call to
  `private_r2_copy_inventory_063(choir_id,bucket)`, with exact snake-case keys. All rows must share
  one choir/bucket, have unique item/source/destination identities where representable, and pass
  the 063 family/owner/slot/status rules. The stable normalized SHA-256 fingerprint binds approval.
- `ready-for-provider-metadata` and `needs-provider-metadata` with recognized Drive IDs and valid
  destination keys are candidates. Every other accepted 063 status is retained item-by-item in the
  report and omitted from the copy manifest. Nothing is silently relabeled as resolved.
- Fetch metadata sequentially through the existing fixed HTTPS OAuth/Drive adapter. Refuse redirect,
  missing/trashed/Google-native objects, wrong returned ID, unsafe name/MIME, family MIME/size
  violations, stored non-null hint drift, duplicates and any item/total-byte cap breach. Do not use
  `alt=media`, read file bytes or request R2 credentials.
- The final 062 JSONL manifest uses the 063 item/choir/family/owner/row/slot/version/Drive ID and
  destination bucket/key unchanged, with current provider name/MIME/length. No SHA-256 is invented;
  062 establishes it by copying and independently reading destination bytes.
- Require absolute `0600` inventory input outside the repository, two distinct absent external
  output paths, exact CLI confirmation and matching `GENOVA_PRIVATE_R2_MANIFEST_APPROVED` value:
  `<project>/<choir>/<bucket>/<inventory-fingerprint>`. Secrets are environment-only.
- Publish report then manifest from same-directory `0600` temp files with no-overwrite hard links;
  final manifest is published last. Any validation/metadata/output failure cleans owned temps and
  leaves no final manifest.
  The report binds inventory fingerprint, manifest SHA-256, counts, excluded identities/statuses,
  unresolved count, limits and timestamp. It contains no token or credential.
- Preparation is all-or-nothing for the candidate set. `--max-items` must cover every candidate;
  provider metadata total must stay within `--max-total-bytes`. Use a larger explicit bounded run,
  not partial manifests that could be mistaken for full inventory coverage.

## Transition start check

- Read: AGENTS, handoff/active context, plan controls, transition guide/work cycle/template, 052,
  061–063, current runbook and accepted 062 parser/OAuth adapter/tests. Cloudflare skill and official
  Google Drive/OAuth documentation were reviewed; the Supabase skill is unavailable in this session,
  so repository SQL acceptance remains authoritative and no live Supabase work is attempted.
- Boundary: local operator preparation only. No schema, Edge/web/native behavior, R2 request, media
  read, copy, activation or source change. Preserve stable 063 IDs/keys and exact 062 manifest rules.
- Authority/ownership: one primary writer. Scoped local source/tests/docs/commits and owned cleanup
  are authorized. Real inventory/Google metadata, credentials, hosted/provider/spend/deploy/copy,
  device and distribution remain unauthorized.
- Required environments: focused Vitest including filesystem atomicity and CLI pre-approval refusal;
  root `pnpm check` because shared TypeScript scripts change; links/diff/security/resource review.

## Out of scope

- Querying/exporting a real 063 inventory, Google OAuth/account access, provider activation/token,
  R2 HEAD/PUT/GET, byte SHA-256, object copy, mapping/version insertion, cutover, source ACL/delete,
  retention repair, Android runtime, release or store work.
- Automatically resolving unsupported URLs, Storage aliases, missing references, orphan parents,
  over-limit chat batches, private conflicts/aliases or product retention policy.

## Risk, rollback and stop rules

- A manifest can drive external writes. Exact identity preservation, provider hint reconciliation,
  complete status reporting and last-step atomic publication are required; no best-effort output.
- Stop on wrong approval fingerprint, private-path/permission failure, existing output, metadata
  mismatch, unsafe family content, cap breach, redirect/provider failure, disk floor or need for real
  data. Never print raw inventory, file IDs, token responses or secrets in CLI status/errors.
- Code rollback is Git revert. Local tests remove their temp directory. A future real manifest/report
  are evidence and must be preserved, not Git-reverted or overwritten; copy remains separately gated.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? | Status | Proof required | Limit |
|---|---|---|---|---|
| Exact 063 input and six-family 062 output | yes | PASS | 2026-09-23, `792195b`, focused Vitest 24/24: exact keys, one choir/bucket, both candidate statuses, every family/owner/slot/key, deterministic fingerprint/order and 062 parser acceptance | Synthetic inventory only. |
| Honest metadata/status reconciliation | yes | PASS | Same suite: current metadata fills missing hints; non-null hint drift, trash/native/unsafe/family MIME/size/duplicate and cap cases fail; every excluded row appears in the report | Mock metadata only; missing/provider HTTP behavior remains inherited 062 coverage. |
| Private authorization and atomic artifacts | yes | PASS | Same suite: external `0600` input/output, repository/permissive/conflicting path refusal, exact dual approval, no overwrite, no final output after failure, report hash and secret non-disclosure | Temporary local text only. |
| Bounds, CLI and integration gates | yes | PASS | Item/total-byte all-or-nothing tests, metadata-only port, actual CLI pre-approval refusal; root `pnpm check`: lint, typecheck, 90 files/797 tests, service-worker syntax and production build | No real OAuth/R2/DB/device. |
| Cleanup and records | yes | PASS | `.next`, coverage and temp fixtures removed; 7 changed docs/193 local links/zero missing, `git diff --check` and security/diff review pass; 40,744,080 KiB (~38.9 GiB) free; separate contract/source/docs commits | `supabase/.temp/cli-latest` remains unrelated. |
| Real inventory/Google/R2/copy/activation/device/release | no — later authority | NOT RUN | Separate owner-authorized execution | Still required before operational beta/full goal. |

Required FAIL or NOT RUN keeps 064 open. A mocked metadata request or valid local manifest is not a
real source inventory, copied byte, Drive exit, Android beta or full product release.

**Delivery:** Commit this contract separately as `064: define verified manifest preparation`, then
implement only the allowed source/tests. The external request remains EU-vs-Automatic plus explicit
R2 activation authority; real inventory/Google metadata and copy require their separate approvals.

## Result and review

Contract commit: `cc68e86`. Source/test commit: `792195b`
(`064: add verified manifest preparation`). The accepted command validates an exact private 063
JSONL snapshot without provider access, binds the operator's CLI and environment approval to its
stable fingerprint, then sequentially requests metadata only for eligible rows. It produces a
private 062 manifest plus a report that retains every excluded status and binds the manifest hash.
No media bytes are downloaded and no R2 or database adapter is present in the preparation core.

The first focused run passed 22/23: an assignment-review PDF was correctly rejected by the stricter
family-MIME rule before the more general stored-MIME-drift rule. The test was corrected to the
actual fail-closed precedence; no product behavior or acceptance requirement was weakened. A first
typecheck then exposed the existing Drive adapter's `getMetadata` method name and the repository's
required `NODE_ENV` augmentation on `ProcessEnv`; the CLI now wraps only the metadata method and
uses a narrower read-only environment type. Focused tests then passed 24/24 and the full root gate
passed 90 files/797 tests plus build.

No real 063 inventory, Google account/OAuth request, R2 account/bucket/token/object, hosted
Supabase row/schema/function, copied byte, mapping activation, device or release was used. Generated
build/coverage/test output was removed. The next critical gate remains the owner's R2 jurisdiction
and explicit provider-activation authority; real inventory preparation and copy are separately
authorized stages after backup/restore.
