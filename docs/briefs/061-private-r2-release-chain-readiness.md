# 061 — Private R2 release-chain readiness

**Status/date/writer:** ACCEPTED LOCALLY / 2026-09-23 / primary agent.

**Observable result:** The locally accepted 053–060 private-file stack has one machine-checked
production function-gateway contract, one exact ordered migration/down rehearsal, and one operator
runbook that can be executed later without guessing deploy order, flags, secrets, copy evidence or
rollback boundaries.

**Delivery focus:** Remove the final local release-configuration ambiguity before asking the owner
for Cloudflare/R2 activation and hosted execution authority. Source inspection found that
`supabase/config.toml` explicitly configures only `repertoire-file`, `repertoire-upload` and
`repertoire-file-lifecycle`; the newer assignment, comment and chat ticket endpoints are absent.
Ticket-only GET/HEAD requests cannot rely on the gateway's default user-JWT verification, so a
production deploy could reject an otherwise valid actor-bound ticket before handler authorization.
This package does not deploy or provision anything.

**Start checkpoint:** `main/1cf7345`; 060 product `bfe994d` and acceptance record are committed.
Only user-owned `supabase/.temp/cli-latest` is dirty. 40,837,836 KiB (~38.9 GiB) is available;
no owned listener, build output, simulator, VM or disposable database remains.

**Current work card:**

- User benefit: the private-file release can be staged in a deterministic order without breaking
  ticket downloads or discovering migration/config gaps on production.
- Next actions: declare every R2 Edge gateway contract and machine-check it; rehearse 053–060
  forward/down on a disposable PostgreSQL 17 copy; write and verify the operator manifest/runbook.
- Exit: all mandatory local rows below PASS, product/config and evidence are separate commits,
  generated resources are removed, and hosted/provider/real-data/device rows remain NOT RUN.

**Resources:** One disposable PostgreSQL 17 copy (<300 MiB expected) and one final root build
(~2 GiB peak based on 060) run sequentially. No provider SDK, native build, VM, simulator or data
download. Remove the DB, `.next` and coverage after their last dependent checks; stay above 10 GiB.

## Allowed modules

- `supabase/config.toml`: explicit gateway verification for the accepted private-file functions.
- `scripts/*061*` or one focused config test: machine-check function/config/release invariants.
- `supabase/test-support/*061*` and the narrow `053` down guard: disposable full-chain
  forward/down rehearsal and refusal to discard mapped provider state.
- `docs/private-r2-release-runbook.md`: exact release, copy evidence, rollback and approval gates.
- This brief plus concise handoff/active/progress/plan/MIGRATION records after acceptance.

## Sources and current facts

- [052 inventory](052-drive-exit-inventory.md) and accepted [053](053-private-r2-repertoire-read.md)
  through [060](060-private-r2-chat-media.md); product commits `beb4842`, `9459732`, `dd21522`,
  `d7c960b`, `4049266`, `ce2b438`, `879d4ec`, `bfe994d`.
- [Transition guide](../gecis-rehberi.md), [execution controls](../mobil-teslim-plani.md#bounded-execution-and-resource-controls),
  decision #29 and [infrastructure record](../altyapi-2026-09-04.md).
- Cloudflare's current [R2 pricing](https://developers.cloudflare.com/r2/pricing/) lists a Standard
  free tier of 10 GB-month, one million Class A and ten million Class B operations monthly; current
  live data/traffic is unknown, so this does not prove a <=$5 total bill. Standard has no minimum
  duration or retrieval fee. Infrequent Access is not selected.
- Cloudflare's [data-location documentation](https://developers.cloudflare.com/r2/reference/data-location/)
  says Automatic is recommended by default, while jurisdiction is immutable after bucket creation
  and `eu` guarantees storage/processing inside the EU. The owner must choose before provisioning;
  061 records but does not make that external choice.
- Cloudflare's [S3 setup](https://developers.cloudflare.com/r2/get-started/s3/) supports a
  bucket-scoped Object Read & Write token. Supabase documents separate
  [function deployment](https://supabase.com/docs/guides/functions/deploy),
  [secret management](https://supabase.com/docs/guides/functions/secrets) and
  [ordered migrations](https://supabase.com/docs/guides/deployment/database-migrations).

## Transition start check

- Read: AGENTS, current handoff/active context/plan, template, guide/work cycle, 052/057/060,
  decision #29, infrastructure record, current function entrypoints/config and official provider docs.
- Boundary: backend release configuration and operator evidence only. Native/WebView ownership,
  file contracts and accepted web behavior do not change.
- Preserve: legacy/mixed/R2-required modes, live actor authorization, ticket GET/HEAD/Range,
  stable IDs, immutable assignment history, no public R2 URL and fail-closed mapped objects.
- Authority/ownership: one primary writer. Local config/tests/docs/commits are authorized. Account
  login/creation, billing, bucket/token/secret, hosted backup/schema/function/web, live data/copy,
  flags, Drive ACL/delete, device, push and distribution remain unauthorized.
- Required environments: static config matrix; PostgreSQL 17 full-chain forward/down/refusal;
  Deno checks for every outgoing entrypoint; root `pnpm check`; document links/diff/resource cleanup.

## Contract and release order

- Every function is explicit in `config.toml`. Ticket-bearing file endpoints set gateway
  `verify_jwt = false` because their handlers distinguish POST user JWT from GET/HEAD signed tickets
  and live-recheck authorization. Other private-file endpoints may also disable gateway verification
  only when the handler itself always verifies a bearer and server-side database authority.
- Hosted order is backup/restore proof -> provider/bucket/token -> server secrets with flags off ->
  additive migrations -> functions -> disabled-path probes -> approved source inventory/copy ->
  verified mixed reads -> writers one family at a time -> reconciliation -> R2-required -> Android
  beta. Client flags never precede their schema/function dependencies.
- Copy uses the 052 manifest fields, bounded streaming and SHA-256 verification. Missing/mismatched
  sources remain explicit; no invented row, overwrite, broad ACL change or local mirror.
- Safe assignment-retention baseline is retain all immutable versions; 061 performs no delete.
  A future policy must define duration, account/choir deletion and legal needs before cleanup code.
- Rollback stops new writes first and preserves every R2-only version/object. Down scripts are used
  only when their refusal checks prove no lifecycle rows; Git revert is not database or object undo.

## Out of scope

- Cloudflare login/account/bucket/token, Supabase secret/DB/function/web deploy, live backup or row
  query, copy/cutover/flag flip, source ACL/delete, payment, device, store or user communication.
- A universal migration service, background queue, new file feature, native media UI, retention
  deletion, Railway move, pricing claim or production traffic/load test.

## Mandatory acceptance evidence

| Criterion | Required? | Status | Proof required | Limit |
|---|---|---|---|---|
| Explicit production function-gateway contract | yes | PASS | Focused Vitest 1 file / 3 tests discovers the exact 13 R2 entrypoints and checks every explicit handler-owned gateway contract in `supabase/config.toml` | Static/local; no hosted gateway inference. |
| Ordered full-chain schema rehearsal | yes | PASS | PostgreSQL 17 disposable copy applied prerequisites + 053–060, checked catalogues/refusals, rejected 053/054 down with unresolved provider state, then restored the exact baseline in 060→053 order | No live schema/data. |
| Operator release/copy/rollback runbook | yes | PASS | [Runbook](../private-r2-release-runbook.md) records exact revisions, migrations, 13 functions, secret/flag names, staged probes, manifest fields, stop/rollback and approval gates; local links pass | Plan is not execution authority. |
| Required code/document gates and cleanup | yes | PASS | 13 Deno entrypoints pass; root `pnpm check` passes 88 files / 735 tests, TypeScript and production build; diff/security/resource review passes; disposable DB/listeners/build/coverage removed | Self-review, not independent review. |
| Hosted/provider/real-data/device/release | no — separate gate | NOT RUN | Owner-authorized execution in a later brief | Required before operational beta. |

Required FAIL or NOT RUN keeps 061 open. Do not convert official pricing/free-tier documentation
into a guaranteed bill, and do not promote a disposable schema or static config check to hosted
function, provider, copy, device or beta evidence.

## Result and review

Product/config commit: `6acea76` (`061: harden private storage release chain`). Documentation is
recorded separately. The first schema rehearsal exposed the missing historic assignment-review
prerequisite; the second exposed trigger-created cache state in synthetic cleanup. After the
required two-approach reassessment, the runner declared the exact prerequisite and cleanup instead
of weakening comparison, and the next complete rehearsal passed.

The release-critical defect fixed here is gateway ordering: ticket GET/HEAD requests for assignment,
comment and chat files would otherwise depend on default user-JWT verification and could be rejected
before their signed ticket reached the handler. All thirteen handlers now have explicit gateway
configuration and retain their own method-specific bearer/ticket/live-authority checks.

Cloudflare account access, billing activation, bucket/jurisdiction/token, Supabase hosted backup,
schema/functions/secrets, real inventory/copy/cutover, web flags, Android hardware and distribution
were not run. The next owner decision is EU jurisdiction (recommended for guaranteed EU processing)
or Automatic, plus explicit provider-activation authority within the stated budget preference.
