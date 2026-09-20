# 053 — Private R2 repertoire read integration

**Status/date/writer:** LOCAL ACCEPTANCE COMPLETE / 2026-09-21 / primary agent.

**Observable result:** Existing web/native protected file requests read the exact PDF/audio from
an authorized, verified private R2 mapping without sending keys to clients or buffering full files
for seek. Preserve file/annotation UUIDs and existing ticket response contract.

**Sources/start:** [052 inventory](052-drive-exit-inventory.md), [018 runtime](018-protected-file-runtime-acceptance.md),
[015 contract](015-shared-protected-repertoire-file.md), [021 composed read](021-mobile-protected-file-runtime-acceptance.md),
[022 web](022-web-protected-file-compatibility.md), decisions #14/#29 and delivery resource controls.
Starting product `22a19d6`; implementation commit `beb4842`. Single writer. 052 read the Cloudflare/Supabase
skills; implementation must revalidate applicable references and read Postgres security/index rules.

**Work card:** (1) inspect local schema/runtime availability and add/test server-owned mapping;
(2) wire maintained signer + streaming R2 reader into current authorized HTTP path and prove a
PDF/audio request early; (3) test refusal/compatibility, final gates, cleanup, record. No automatic
expansion into new uploads/chat/media administration. Failed required gates keep this brief open.

## Allowed scope

- `supabase/functions/repertoire-file/` and narrowly shared server-only R2 read helper under
  `supabase/functions/_shared/`; keep existing active-content guard and ticket contract.
- Additive repertoire-location migration, exact local rollback and 053 synthetic SQL/HTTP tests
  under `supabase/migrations/`, `supabase/tests/`, `supabase/test-support/`. Use existing guarded
  runtime patterns; do not rewrite the runtime framework. Migration filename via CLI only.
- Exact signer dependency/lock/config changes if required; pin version, measure allocation before
  install, no blanket dependency upgrade. No home-grown SigV4 implementation.
- Shared protected-file client and web/native consumer tests only for a demonstrated compatibility
  issue; no new server route in Next. Current clients should keep file UUID/ticket interfaces.
- This brief plus concise handoff/progress/MIGRATION/plan evidence indexes.

## Mapping and authorization requirements

Add a narrow server-owned location relation bound to `(file UUID, choir UUID)` for repertoire.
Store provider/bucket/immutable key, expected byte size/MIME/SHA-256 and verification/active state;
retain legacy columns and originals. Exact DDL depends on inspected current keys/constraints.
Reject cross-choir references, empty/invalid keys, duplicate active mappings and client-created
verification claims. RLS/table privileges deny anon/authenticated writes and unnecessary direct
location reads; existing file authorization stays with the authenticated file RLS query.
Service-role lookups must bind both file and choir, and may use only verified/active mappings.
Absence, query error and invalid mapping are distinct; errors never mean permission to use Drive.

The POST ticket uses real Auth user validation + current choir/file RLS as today; GET/HEAD validates
the signed ticket and exact file/choir before provider resolution. Do not claim instant per-user
revocation beyond the existing ticket contract; short-lived bearer behavior remains explicit.
No user-supplied provider URL/key/bucket or user_metadata-based authorization. Old clients can read
unchanged responses; no R2-only uploads until their separate write/compatibility gate exists.

Explicit modes: legacy compatibility, mixed migration, R2-required. Default preserves existing
deployments; mapped missing/corrupt/unverified objects fail visibly in mixed/required modes, never
fall back to public Drive. R2-required refuses unmapped files. Missing R2 config fails closed when
R2 is selected, without breaking deliberate legacy mode. Activation is not authorized here.

## Reader and verification

- Use a pinned supported S3 signer with server-only scoped credentials. Config restricts exact
  R2 account endpoint/jurisdiction and bucket; object key cannot escape tenant/file prefix or
  introduce query/fragment/path traversal. No credential-bearing redirect or arbitrary host fetch.
- Support GET/HEAD, normal/open-ended/suffix single ranges, 206/416 and correct length/range/MIME/
  disposition/no-store/nosniff/CORS. HEAD must not download object body. Stream GET/ranges with
  cancellation; validate upstream status/metadata, byte length and unexpected redirects.
- Never expose signed provider authorization, credentials, provider error bodies or private keys
  in client responses/logs. Enforce existing HTML/SVG/XML/JS rejection against both stored and
  upstream content types. Preserve #14 rather than making MusicXML inline-safe by assertion.
- Verify one deterministic PDF and WAV through actual HTTP composition as early as possible;
  compare full/ranged bytes and hashes, then denial/expiry/provider-failure paths. A mock transport
  proves adapter behavior only, not R2 compatibility. Real R2 acceptance is a distinct approval gate.

## Resources, release and rollback

Planning preflight 21,307,160 KiB free; implementation rechecked 21,294,040 KiB before allocation.
The pinned signer occupies 80 KiB installed. Implementation measured current
installed signer/runtime/DB/tool availability and additional peak **before** installation or runtime
start. Prefer existing local PostgreSQL + synthetic fixture; do not make a full real-data DB copy
without need. Exact DB/runtime/scratch targets and cleanup point go here before allocation.
Keep >=10 GiB, one heavy process. If runtime recreation exceeds budget, record it explicitly and
choose the smallest actual-service topology; do not rename injected tests as runtime proof.

Before schema work, capture/restore the allowed local baseline and prove forward/down/forward plus
source unchanged. Hosted work later requires fresh hosted backup/restore, both-project impact and
separate authority. Reader rollback restores mapping/mode compatibility without deleting objects;
after R2-only writes exist, an old Drive-only binary is not a safe rollback. Deployment order:
compatible schema -> secrets/private provider readiness -> Edge -> clients -> verified mapping
activation; any failed server/provider gate blocks its client release.

## Mandatory acceptance evidence

| Criterion | Required? | Status | Proof to collect | Limit |
|---|---|---|---|---|
| Verified mapping/tenant constraint, table privilege and client-write refusal | yes | **PASS** | 2026-09-21, `beb4842`; PostgreSQL 17 clone, exact forward/down/forward, cross-choir/unsafe-key/duplicate-active/client DML and immutable active metadata refusals | Hosted migration separate. |
| Private signed R2 adapter, exact target and secret/redirect refusal | yes | **PASS** | `aws4fetch@1.0.20`; 9 adapter cases plus actual signed loopback request; account/jurisdiction/bucket/key and explicit loopback-test guard asserted | Fake R2 is not provider acceptance. |
| Current Edge HTTP authorization -> mapping -> exact PDF/audio bytes/Range/HEAD | yes | **PASS** | Actual `Deno.serve` entrypoint: 69-byte PDF SHA-256 `cfa3181c…716ec6`, 48-byte WAV `eb2a1929…ffe002`, full/range/HEAD | Mock Auth/PostgREST and signed loopback S3 transport; real R2 remains NOT RUN. |
| Missing/corrupt/unverified mapping, wrong choir/role, expired ticket, active MIME, upstream/length/range failures | yes | **PASS** | 44 focused cases plus HTTP wrong-role/wrong-choir/expired/416/active MIME/length/unmapped matrix; `provider_hits=8`, Drive fallback 0 | No real-account/hardware inference. |
| Existing web/native contract and required final gates | yes | **PASS** | Unchanged ticket/client contract; final `pnpm check`: 66 files / 615 tests, coverage/service-worker/build PASS; Deno entrypoint check PASS | No mobile surface changed, so mobile/device rerun was not required. |
| Resource cleanup, scoped diff/security self-review, source baseline, split code/evidence commits | yes | **PASS** | `beb4842`; source DB hash/data unchanged; disposable DB/listeners removed; 473,572 KiB `.next` + 332 KiB coverage removed; final 21,355,504 KiB free | Self-review only; unrelated CLI marker unstaged. |
| Actual R2 account/region/credentials, hosted copy/cutover/deploy and phone | no — separate approved gates | NOT RUN | Prepared after local candidate | Required for operational beta, not local acceptance. |

**Out of scope:** New file upload/write APIs, all-data migration, client capability rewrites,
public buckets, new Worker service, paid/account activation, live schema/data/secret changes,
push/deploy/CI, source deletion/public ACL revocation, hardware. No new Next API route.

## Evaluation and bounded failures

The local result is an additive read candidate, not a production Drive exit. Default `legacy`
mode leaves current deployments unchanged; `mixed` selects a verified mapping and never falls back
after mapped failure; `r2-required` refuses unmapped files. `HEAD` performs provider `HEAD`, ranged
GET streams the exact provider range, and provider bodies/credentials are not copied into errors.
The mapping is tenant-bound, client-inaccessible and immutable after activation for identity and
verification metadata. Existing file UUIDs and ticket URLs remain unchanged.

Two initial schema-hash comparisons stopped before migration because PostgreSQL 18 `pg_dump`
emits random `\\restrict` guards; the runner now removes only those volatile lines before hashing.
The first standalone HTTP driver stopped before product execution because TSX CJS disallowed
top-level await; it was converted to an explicit promise exit. Adding the immutability trigger
exposed one down-order defect; the disposable target was removed, the function is now dropped
before its private schema, and the full round trip passes. None of these failures changed the
source database or left a listener/artifact.

**Result/next:** `beb4842` completes 053 locally. [054](054-private-r2-repertoire-upload.md) is the
next ready local package: one authorized repertoire PDF/audio upload is streamed to private R2,
verified, committed atomically to the existing file UUID/mapping contract and visible in both
catalogues without a Drive-folder requirement. Real provider activation, hosted schema/secrets,
copy/cutover, deployment and phone remain separate approvals.
