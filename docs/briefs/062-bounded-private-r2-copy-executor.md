# 062 — Bounded private R2 copy executor

**Status/date/writer:** ACCEPTED LOCALLY / 2026-09-23 / primary agent.

**Observable result and user need:** An operator can take an approved, external JSONL manifest and
copy one bounded batch of legacy Google Drive objects to the exact private R2 keys without a local
file mirror, then independently re-read destination bytes and record resumable SHA-256 evidence.

**Delivery focus:** Close the data-plane implementation gap between [061's release runbook](../private-r2-release-runbook.md)
and an authorized real copy. This package accepts manifest validation, constant-memory transfer,
destination verification and refusal/resume behavior. Live inventory generation, provider setup,
database activation/reconciliation and source ACL/delete remain later approved steps.

**Start evidence:** `main/ce7cbfe`; product/config `6acea76`. Only user-owned
`supabase/.temp/cli-latest` is dirty. 40,775,456 KiB (~38.9 GiB) was free after 061 cleanup. The
runbook requires a separately reviewed bounded executor. Cloudflare documents S3-compatible
GET/HEAD/PUT and warns that multipart ETags are not full-content checksums; Supabase Edge Functions
have bounded wall-clock/memory, so this one-time operator transfer is a local Node command rather
than a long background Edge request. No external account or credential is currently authorized.

**Current work card:**

- User benefit: Drive exit can later copy exact bytes safely without filling the Mac or silently
  replacing an unexpected destination object.
- Next actions: implement the manifest/journal core; connect fixed Google Drive and signed private
  R2 transports; run focused mocked HTTP/stream/resume/refusal acceptance and the root gate.
- Exit: all required local rows below pass, code/evidence commits are separate, generated output is
  removed, and provider/hosted/real-data/device rows remain NOT RUN.

**Resources:** Source/tests only plus the final root build (~2 GiB peak based on 061). Runtime tests
use bounded synthetic streams under 2 MiB and temporary files removed by the test. No database,
provider SDK install, VM, simulator, native build or media download. Remove `.next`, coverage and
test temp output after the last dependent check; stay above 10 GiB.

## Allowed paths

- `scripts/private-r2-copy-core.ts`: manifest, journal, streaming hash/verification and copy state.
- `scripts/private-r2-copy.ts`: explicit operator CLI, Google OAuth/Drive read and signed R2 adapter.
- `scripts/private-r2-copy*.test.ts`: focused local behavior and transport tests.
- `docs/private-r2-release-runbook.md`: invocation/authority/evidence handoff after acceptance.
- This brief and concise handoff/active/progress/plan/MIGRATION records after acceptance.

## Sources and preserved boundaries

- [052](052-drive-exit-inventory.md) owns file families and required manifest fields; [053](053-private-r2-repertoire-read.md)
  through [060](060-private-r2-chat-media.md) own destination keys and authorization contracts.
- [061](061-private-r2-release-chain-readiness.md) owns release order and approval gates. Its exact
  project, account, bucket and jurisdiction checks remain prerequisites for a real run.
- Reuse the existing pinned `aws4fetch@1.0.20`, safe R2 target builder and length-preserving upload
  transport; install no package. The operator journal contains IDs/metadata but no URL token or key.
- Every input row identifies project, choir, family, owner table/row/slot/version, Drive file ID,
  exact destination bucket/key, byte count, file name and MIME. SHA-256 may be supplied or is
  established by the first verified copy. Stable IDs and object-key contracts are not invented by
  the executor.
- Resume re-verifies a matching destination digest. An existing destination without accepted
  evidence is compared with source bytes and adopted only when equal; a mismatch is a hard refusal,
  never overwrite/delete. Redirect, missing/trashed/Google-native, wrong size/MIME, oversize,
  partial stream, non-2xx provider response and target-prefix mismatch remain explicit failures.
- Real execution requires two positive controls: bounded item/byte limits and exact target
  confirmation. Raw manifests/journals must be absolute, private files outside the repository.

## Transition start check

- Read: AGENTS, handoff, active context, plan controls, transition guide/work cycle, 052, 061,
  accepted destination migrations/transports, decision #29, current Supabase changelog and official
  Cloudflare R2/Supabase runtime documentation.
- Boundary: local operator copy data plane only; no schema, Edge deploy, web/native behavior or
  source/destination live operation changes.
- Preserve: private bucket, allowlisted tenant key, source bytes, stable product identities,
  constant memory/backpressure, no redirect, actual destination SHA-256, resumability and refusal.
- Authority/ownership: one primary writer. Local source/tests/docs/commits and owned cleanup are
  authorized. Account login/activation, billing, credentials, hosted reads/writes, real manifests,
  copy/activation, ACL/delete, device and distribution are unauthorized.
- Required environments: focused Vitest unit/runtime HTTP tests, CLI validation/usage refusal,
  TypeScript/root `pnpm check`, diff/security/resource review and cleanup.

## Out of scope

- Live Cloudflare/Supabase/Google access, credential entry, real IDs/bytes, bucket/token creation,
  DB migration/RPC, inventory SQL, activation/cutover, source mutation/deletion or public-link revoke.
- Automatic retries after an uncertain partial PUT, multipart uploads, public/presigned client URLs,
  a queue/scheduler, Edge background copy, retention policy, feature work or provider abstraction.

## Risk, rollback and stop rules

- Code rollback is Git revert. A real future run cannot be undone by Git: verified R2 objects and
  journals are preserved until DB reconciliation; exact deletion needs separate authority.
- Stop before allocation below 10 GiB, wrong target confirmation, manifest duplicate/conflict,
  journal tamper/change, source metadata drift, redirect, target pre-existence mismatch, short/long
  stream, digest mismatch or unapproved environment. Never print secret values or bearer URLs.
- One failed item is journaled and stops the batch. A retry is a new explicit attempt against the
  same immutable manifest fingerprint; no automatic overwrite or blind provider retry.

## Mandatory acceptance evidence

| Criterion | Required? | Status | Proof required | Limit |
|---|---|---|---|---|
| Manifest and execution boundary | yes | PASS | Focused Vitest checks exact six-family schema/fingerprint, owner/slot/key shapes, duplicates, journal binding, private external paths, exact target confirmation and item/byte caps | Synthetic inputs only. |
| Constant-memory copy and independent verification | yes | PASS | 1.25 MiB/20-chunk stream plus actual local OAuth Drive GET and signed S3 HEAD/PUT/GET; source and separately re-read destination length/MIME/SHA-256 agree | Mock HTTP R2/Drive, not real providers. |
| Resume and fail-closed matrix | yes | PASS | 38 focused cases: copied/adopted/resumed; verified-missing, mismatch, redirects, missing/trashed/native, size/MIME/hash/partial, provider failure, cancellation, duplicates and batch stop/refusal | No provider deletion or retry inference. |
| Required gates and cleanup | yes | PASS | CLI validate and pre-approval refusal pass; root `pnpm check` passes lint, TypeScript, 89 files / 773 tests, service worker syntax and production build; diff/security/resource review passes; outputs removed | Self-review, not independent review. |
| Provider/hosted/real-data/DB/device/release | no — later gate | NOT RUN | Owner-authorized run in a later brief | Required before operational beta. |

Required FAIL or NOT RUN keeps 062 open. A mocked S3/Drive loopback is not real R2, Google, hosted
Supabase, copied production data, database cutover, Android beta or store acceptance.

## Result and review

Product/test commit: `e4a4c23` (`062: add bounded private storage copy executor`). The first focused
run passed 28/30; its two failures were test assertions comparing equal typed arrays created in
different JavaScript realms, not byte-transfer failures. Converting those assertions to numeric byte
arrays fixed the test evidence; later review added full journal-to-manifest binding, verified-target
loss refusal, transport cancellation, pending-first batch ordering and accurate remaining counts.
The final focused suite passed 38/38 and the complete root gate passed 89 files / 773 tests/build.

The command loads no `.env`, prints only bounded status/error codes, never accepts provider secrets
as arguments, and writes the journal only after exact target approval. Real manifest generation,
Cloudflare/Google/Supabase access, provider billing, hosted DB/Edge changes, object copy, activation,
source ACL/delete, Android device and release were not run. 062 advances the local release package;
it does not advance operational Drive exit or beta acceptance. Final cleanup found no owned
`genova-062-*` temp directory or copy/test process, removed `.next` and coverage, and measured
40,783,000 KiB (~38.9 GiB) free. The unrelated `supabase/.temp/cli-latest` remains unstaged.
