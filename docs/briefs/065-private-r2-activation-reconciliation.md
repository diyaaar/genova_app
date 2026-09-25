# 065 — Atomic private R2 activation and reconciliation

**Status/date/writer:** ACCEPTED LOCALLY / 2026-09-25 / primary agent.

**Observable result and user need:** After an authorized copy run has independently verified every
eligible legacy object, a release operator can activate one choir's complete private-storage
snapshot in one database transaction. A stale inventory, unresolved source, missing verified
journal row, conflicting destination, orphaned history or partial family request changes nothing.

**Delivery focus:** Bind [063's deterministic inventory](063-private-r2-copy-inventory-contract.md),
[064's approved manifest report](064-private-r2-manifest-preparation.md) and [062's verified copy
journal](062-bounded-private-r2-copy-executor.md) to the 053–060 product mappings. This is the last
local control-plane contract before provider/hosted rehearsal; it is not permission to run it on
Supabase or against real Google/R2 data.

**Start evidence:** `main/7963405`; only unrelated `supabase/.temp/cli-latest` is dirty. WF-010
records current root 90/797 and mobile 49/288 local passes, with browser E2E blocked before UI by
the missing Chromium binary. About 38 GiB is free. 062–064 are local/synthetic and explicitly leave
database activation unimplemented. The current queue names this contract as the next ready result.

**Current work card:**

- User benefit: copied private bytes cannot become visible through a half-applied or stale mapping.
- Next actions: define the service-only atomic RPC and audit rows; prove six-family activation,
  stale/orphan/conflict/partial refusal and idempotent replay on one disposable PostgreSQL clone;
  review, record and clean the clone.
- Exit: every required local row below passes, code/evidence commits are separate, and hosted,
  provider, real-data, source-cleanup, device and release rows remain NOT RUN.

**Resources:** SQL/source/tests and one disposable clone of `genova_008_test_restore`, estimated
below 350 MiB. Reuse installed PostgreSQL tools. No simulator, native build, provider download,
root build or browser install. Remove the clone after the final check and stay above 10 GiB.

## Allowed paths and contract

- One CLI-generated `supabase/migrations/*_private_r2_activation_065.sql` and matching
  `supabase/rollback/065_private_r2_activation_down.sql`.
- `supabase/tests/065_private_r2_activation.sql` and
  `supabase/test-support/065_private_r2_activation_runner.sh`.
- This brief; after acceptance only concise runbook/handoff/active/progress/plan/MIGRATION indexes.
- The RPC takes one request UUID, choir, private bucket, the exact 063 JSON snapshot, the 064 report
  and the latest verified 062 journal records. It recomputes the live inventory relationally,
  requires exact candidate coverage and zero unresolved rows, and records request/payload hashes.
- Activation is all-or-nothing across repertoire, assignment submission/review, repertoire comment,
  chat message images and room avatars. It inserts immutable verified mapping/version rows, swaps
  server-owned pointers/aliases and preserves legacy source identity in a private audit table.
- An exact replay returns the committed result; reuse of the request UUID with different payload or
  target refuses. `public`, `anon` and `authenticated` cannot call or inspect activation state.

## Transition start check

- Read: AGENTS, handoff/active context, WF-009/WF-010, current delivery controls, transition guide,
  work cycle/template, 052–064 contracts and the 053–060 destination schemas.
- One result: local activation/reconciliation contract. Preserve native/WebView ownership, current
  client reads, stable 063 IDs/keys, 062 hashes, old-client aliases and all open 004/010 criteria.
- One primary writer. Scoped local SQL/tests/docs/commits and owned clone cleanup are authorized.
  Hosted schema/data, provider activation, credentials, real manifests/journals, object copy,
  source ACL/delete, push/deploy, devices and stores are not authorized.
- Required checks: prerequisite refusal; role/search-path boundary; six-family atomic activation;
  stale snapshot, unresolved/orphan/conflict, partial journal, target/request conflict and replay;
  exact down/reapply; shell syntax, links, diff/security/resource review. No root/mobile rerun unless
  a shared code path changes.
- Rollback: code uses Git revert. Migration down refuses after any committed activation audit; live
  data/object rollback would require a separately authorized reverse reconciliation.

## Risks and stop conditions

- Never infer object existence from a manifest or 063 UUID. Only a latest `verified` 062 record with
  matching source, target, metadata and SHA-256 can activate.
- Do not activate a subset while another candidate or unresolved row remains. `already-private`
  and non-Drive storage are explicit non-blocking exclusions; every other excluded status blocks.
- Missing legacy parent/reviewer identity, target collision or source drift is a hard refusal.
  Database constraints are a final guard, not a reason to accept partial writes.
- Stop on dirty-path overlap, prerequisite/schema drift, a second failed design without new causal
  evidence, clone growth threatening the disk floor, or any need for real credentials/data.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? | Status | Proof required | Limit |
|---|---|---|---|---|
| Exact 063/064/062 binding and least privilege | yes | PASS | 2026-09-25 `53c258f`; current snapshot equality, report counts/status/exclusions/limits, 10 latest verified journal identities/hashes, fixed empty search path and service-only execution | Local synthetic input only. |
| Atomic six-family activation and replay | yes | PASS | Same run: repertoire, current/history assignment, four review owners, comment, message image and avatar mappings/pointers activate together; exact request replay returns the same result without a second audit | No provider object read. |
| Fail-closed reconciliation matrix | yes | PASS | Missing report field, null/missing journal identity, stale snapshot, active and hidden target conflicts, orphaned history, authenticated caller and changed replay all refuse; caught calls leave audit/product state unchanged | Self-review only. |
| Forward/down/reapply and cleanup | yes | PASS | Runner: missing 063 refuses; committed audit blocks down; clean down restores exact 063 schema hash; reapply passes; source unchanged and clone removed | Disposable PG17 clone. |
| Hosted/provider/real-data/source cleanup/device/release | no — later gate | NOT RUN | Separate owner-authorized run | Required before operational beta. |

Required FAIL or NOT RUN keeps 065 open. Local SQL acceptance is not a hosted migration, real R2
cutover, Drive exit, Android beta or store acceptance.

## Result and review

Product/schema/test commit: `53c258f` (`065: add atomic private storage activation`). The final
runner passed prerequisite refusal, exact snapshot/report/journal binding, all six families and all
accepted assignment source-owner shapes, exact replay, the stale/orphan/partial/target/role/change
refusal matrix, committed-audit down refusal, exact clean down/reapply and clone cleanup. The first
fixture used a shorthand Drive avatar URL that 063 classified as unsupported, so the fixture was
changed to the accepted `uc?export=download&id=...` form. A first down hash comparison also exposed
an over-escaped runner filter for PostgreSQL's random dump guard line; matching the accepted 063
runner pattern restored a real schema comparison. Neither issue changed production data.

No Cloudflare, Google, hosted Supabase, real file, push/deploy, device or store action ran. The RPC
is additive and dormant until the separately authorized runbook reaches verified real copy evidence.
The next local release task is the exact candidate/dependency preflight for the remote gap; R2 region
and account activation remain an owner choice before provider setup.
