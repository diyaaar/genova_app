# WF-011 — Release candidate and dependency preflight

**Status/date/writer:** LOCAL PREFLIGHT ACCEPTED / 2026-09-25 / primary agent.

**Observable result:** The exact local release candidate, deployed/remote baseline, full changed
surface and DB → Edge → web/mobile promotion order are fixed without pushing or changing a hosted
system.

**Delivery focus:** Close queue item 1's local source-control uncertainty before provider or hosted
work. This brief does not make the candidate deployed: candidate remote CI, hosted schema state,
backup/restore, provider setup, deployment and live acceptance remain later evidence gates.

**Start evidence:** `main`/HEAD was `12a236f`; the accepted product/schema/test revision immediately
below it was `53c258f`. Direct `git ls-remote` returned GitHub `main` at `a13f696`, 174 linear commits
behind HEAD. Only the user-owned `supabase/.temp/cli-latest` marker was dirty. About 38 GiB was free.

**Current work card:** (1) identify the immutable source and remote/live base, (2) classify the full
gap and dependency order, (3) record exact stop gates and handoff. Exit: all required local evidence
rows pass, links/diff are clean and no external mutation occurs.

**Resources:** Documentation/read-only inspection only; no build, database, simulator, download or
provider runtime. Existing Chrome session was used read-only to inspect Vercel. No account setting,
credential, message or file was changed.

## Allowed files and authority

- This brief, the delivery plan, private R2 runbook, handoff and active/progress context.
- Read repository/Git/remote/live-host metadata. The user authorized continuing local preparation
  and using the signed-in Chrome session when needed.
- No GitHub push, CI dispatch, hosted DB query/migration, Edge/Vercel deploy, provider activation,
  credential creation, real data/file operation, email, account setting, device or store action.
- Rollback is one documentation revert. Preserve the unrelated CLI marker unstaged.

## Transition start check

- Read `AGENTS.md`, the handoff, active context, transition guide, work cycle, brief template,
  controlled queue and private R2 runbook. This is one local release-source outcome, not a product
  implementation or publication.
- Native/WebView ownership and shared contracts are unchanged. Source inspection covers web,
  mobile, migrations, Edge Functions, CI and release flags; no product file is edited.
- Required checks: exact Git identities and ancestry, full gap inventory, live Vercel revision,
  dependency/flag review, documentation links, consistency, scoped diff and `git diff --check`.
  Candidate remote CI and every hosted/runtime layer are explicitly separate.

## Frozen candidate and baseline

| Item | Exact value | Meaning |
|---|---|---|
| Candidate source | `12a236f87306a9cf96d3231ede315b2893c22ca3` | Immutable HEAD for any candidate branch; its deployable product/schema/test payload is `53c258f`. |
| Candidate product payload | `53c258f29143693400307c6c6d4291d971edca7d` | Locally accepted 065 product/schema/test revision. `12a236f` only adds its acceptance records. |
| GitHub `main` | `a13f696da8c731e9af2a2bce473d4f4ae4a81587` | Direct read-only remote result on 25 September. It is the merge base and 174 commits behind the candidate. |
| Vercel production | `a13f696da8c731e9af2a2bce473d4f4ae4a81587`, Ready | Read in the signed-in Vercel project `genesi-nova-choirs-projects/genova-app`; production created 8 September 2026. |
| Working tree | only `supabase/.temp/cli-latest` modified | User-owned marker; excluded from this task and any future candidate staging. |

The prior infrastructure note's `5e7416a` value is historical and must not be reused as current.
Vercel and GitHub now agree on `a13f696` as the deployed/source baseline. The candidate is not on a
remote, so exact-candidate GitHub CI is **NOT RUN** and cannot be claimed from local tests.

## Full gap and dependency classification

The candidate gap is linear and contains **544 changed files, 63,525 additions and 10,829
deletions**. This is not a safe unreviewed bulk push. Its release-relevant surfaces are:

| Layer | Candidate delta | Dependency / release consequence |
|---|---|---|
| CI and dependencies | Existing three-job CI covers root quality/security, browser regression and native checks. Root adds `aws4fetch`; mobile lock/package revisions include the accepted RN/PDF/audio/WebView/chat work. | Run the existing workflow on the exact candidate branch before `main`. A local pass does not replace remote jobs. |
| Database | 16 new forward migrations with matching rollback files: `024`, `041`–`046`, `048`, `053`–`060`, `063`, `065`. | Reconcile the hosted migration ledger after backup/restore proof; apply only absent migrations in filename order. Refusal is a stop. Git revert is not data rollback. |
| Edge | 13 private-file/upload/lifecycle functions for repertoire, assignment, review, comments and chat; `supabase/config.toml` records their method-specific auth boundary. | Compatible schema, provider secrets and disabled/legacy modes precede exact-slug deploy and probes. Never deploy every repository function as a shortcut. |
| Web/shared | Annotation safe-save, protected repertoire files, WebView bridge, durable chat mutations/status and private-storage adapters. | Chat/annotation DB authority and required Edge functions precede the web build. R2 client flags remain false until copy/cutover acceptance. |
| Mobile | Native repertoire/PDF/audio, WebView bridge, notifications and chat list/send/actions/stars. | Backend compatibility precedes any installed beta. Android device acceptance is later; iOS remains grouped at candidate integration unless a platform-sensitive change requires it earlier. |
| R2 activation | `053`–`060` schemas/functions plus deterministic `063` inventory, `064` manifest/copy contract and dormant `065` activation RPC. | Provider/copy/cutover stages remain governed by the private R2 runbook. Installing `065` does not authorize invoking it. |

## Promotion order and stop gates

1. **Freeze and verify source:** use `12a236f` exactly. Push it first only to an explicitly approved
   candidate branch, not directly to `main`; this is expected to start GitHub CI and may create a
   Vercel preview. Stop unless all three CI jobs pass for that SHA. Any new product commit creates a
   new candidate and invalidates this identity.
2. **Prove the hosted base:** verify Supabase project `hievmwwctjjlhmssoxsu`, take a fresh backup and
   demonstrate an isolated restore. Read the hosted migration ledger and schema hashes; do not infer
   them from Git or local acceptance.
3. **Stage DB in order:** apply absent `024`, `041`–`046`, `048`, then `053`–`060`, `063`, `065`.
   Run their accepted forward/down/refusal matrices in the isolated restore first. On production,
   apply forward migrations only; every prerequisite or hash refusal stops release work.
4. **Stage provider and Edge dormant:** after the owner's provider choice/authority, create the one
   private bucket/token and set server secrets. Keep storage modes `legacy` and every server/client
   upload flag false. Deploy only the 13 manifest functions and prove legacy, disabled, unauthorized,
   wrong-tenant and missing-object responses on their hosted URLs.
5. **Promote web without cutover:** after DB/Edge probes and candidate CI pass, fast-forward `main`
   to the exact candidate. Verify Vercel reaches Ready for the same SHA, then exercise the live web
   smoke/refusal matrix. Missing `NEXT_PUBLIC_*_R2_*` values are fail-closed because every client
   adapter enables only on exact string `true`; a server mode defaults to `legacy`. This does not
   eliminate the short old-client compatibility window, so DB/Edge and web promotion stay in one
   controlled release window.
6. **Copy and activate separately:** run the approved real inventory → verified manifest → bounded
   copy → exact journal → `065` reconciliation chain. Only after acceptance may the relevant server
   mode move through `mixed` and the separately built client flag turn on. Preserve Drive and R2
   sources through beta.
7. **Build/install beta later:** produce the signed Android candidate from the same Git SHA only
   after hosted compatibility passes. Device, distribution and both-store evidence remain distinct.

This ordering deliberately avoids a direct 174-commit `main` push: Vercel production follows
`main`, while CI also starts on push. A candidate branch supplies remote CI evidence before the
production fast-forward, but creating that branch/preview remains an explicitly approved external
release action.

## Test lineage and remaining evidence

- The last root/mobile source change was already covered by [WF-010](WF-010-project-health-check.md):
  root lint/typecheck/90 files/797 tests/service-worker/build and mobile 49 suites/288 tests passed
  on 25 September. Between WF-010 revision `7963405` and candidate HEAD, only 065 SQL/test-support
  plus records changed; no root or mobile runtime source changed.
- [065](065-private-r2-activation-reconciliation.md) separately passed its disposable PostgreSQL 17
  forward/refusal/down/reapply acceptance at `53c258f`.
- Browser E2E UI, exact-candidate remote CI, hosted backup/restore/schema, hosted Edge/provider,
  live application, real data/object, device and store layers remain **NOT RUN**. None is inferred
  from the local evidence above.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? | Status | Evidence and limit |
|---|---|---|---|
| Exact candidate, remote base, ancestry and dirty ownership are fixed | yes | **PASS** | 2026-09-25 local Git + direct `ls-remote`; SHA values above; 174 linear commits; CLI marker excluded. |
| Current live production revision is proved independently | yes | **PASS** | 2026-09-25 signed-in Chrome, Vercel deployment list: production Ready at full SHA `a13f696`. Read-only inspection. |
| Full gap is classified across CI/dependency, DB, Edge, web/shared and mobile | yes | **PASS** | `git diff`/`dirstat`/path and config inspection; 544 files, 16 migrations, 13 Edge functions and the changed client surfaces recorded. Self-review only. |
| Promotion order prevents client-before-backend and unreviewed main push | yes | **PASS** | Candidate branch CI → hosted base/DB → dormant Edge → web/main → copy/activation → beta; every external step retains its gate. |
| R2 defaults and client flags fail closed | yes | **PASS** | Source inspection: server modes default `legacy`; server/client writes require exact enabled flags; runbook still forbids test endpoints hosted. Real hosted probe remains separate. |
| Documentation links, consistency, scope and diff are clean | yes | **PASS** | Final local link scan and `git diff --check`; only owned documentation will be committed. |
| Candidate remote CI and external release/runtime evidence | no — subsequent gated action | **NOT RUN** | Candidate is not remote. No push/CI dispatch, DB/provider/deploy, real data, device or store action occurred. |

Required FAIL or NOT RUN would keep this local preflight open. Self-review is not independent review.

## Result and next authority boundary

Queue item 1's local source/dependency uncertainty is closed at the immutable candidate above;
remote CI and production promotion remain open release evidence. The next healthy path is the
approved candidate-branch CI/preview plus provider/hosted preparation, not additional local feature
work and not a direct push to `main`. Before provider setup, the owner must select `EU jurisdiction`
(recommended in the runbook) or `Automatic` and explicitly authorize Cloudflare R2 activation,
private bucket creation and least-privilege token creation. The Gmail spelling supplied in the
latest request (`genesinova.chori@gmail.com`) differs from the signed-in/profile and repository
record (`genesinova.choir@gmail.com`); resolve that identity before any account or email action.
