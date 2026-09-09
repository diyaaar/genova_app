# Genova — agent handoff

Snapshot: 9 September 2026. Packages 019 and 020 locally accepted actual iOS and Android
PDF-page-image/Skia output at code/test commits `2c64e5e` and `e2fe177`; this documentation commit
records 020's visual evidence. The canonical [delivery plan](mobil-teslim-plani.md) keeps A2 open
only for actual 018-service lifecycle integration on both local platforms, before A3 web compatibility.
The recorded remote `main` remains `a13f696`; no push or deployment was performed. Verify the receiving checkout
before trusting anything here; conversation history is not required and is not available.
This file is an entry point and a source index — not a second roadmap, and not an
authorization grant.

## Entry and source order

1. [`AGENTS.md`](../AGENTS.md) — repository configuration, git discipline, gates, accounts.
2. This file.
3. [`docs/gecis-rehberi.md`](gecis-rehberi.md) — migration guide; every migration task fills
   in its brief's start-check from it.
4. [`docs/ai-calisma-duzeni.md`](ai-calisma-duzeni.md) — working loop and memory ownership.
5. [`memory-bank/`](../memory-bank/) — six short files; `activeContext.md` and `progress.md`
   are the ones that move. They are an index, never proof.
6. The brief for the task at hand, under [`docs/briefs/`](briefs/).
7. [`KARARLAR.md`](../KARARLAR.md) for decisions, [`MIGRATION.md`](../MIGRATION.md) for the
   native/WebView ledger.

Records are written in English; user-facing updates and product copy stay Turkish. Older
Turkish briefs remain authoritative for their own subject.

## Objective and accepted decisions

The product is Genova, a live choir application at `app.genesinovachoir.com` (Next.js 15 on
Vercel, Supabase behind it), being extended with a React Native + Expo product app in the same
repository. The owner's objective for this stretch was to get **invitation-based membership
working on the live product**, because nothing else in the mobile plan can be accepted until a
real person can be invited into a choir and sign in.

Decisions that govern the work, with their reasons, live in [`KARARLAR.md`](../KARARLAR.md).
The ones a receiving agent must hold:

- **#21** — order of work: invitation acceptance → 004 native sign-in/choir selection →
  repertoire/PDF → device pilot; store limits last. Do not reorder to get around an open
  acceptance item.
- **#22** — English handoffs and dated evidence per acceptance item; a required FAIL or NOT RUN
  keeps a brief open, and a self-score never substitutes for a run.
- **#23** — 008 went live in DB → Edge → web order, with a proven backup first.
- **#24** — the null `is_current` was fixed in the database; the client contract stays
  fail-closed, because failing closed is what exposed the fault.
- **#25** — 011 released; the profile form deliberately keeps its current-password field, and
  the app gained a self-service reset instead.
- **#26** — the acceptance fixture was deleted, knowingly leaving 010's sixth criterion unfinished.

Two boundaries hold everywhere: the shared annotation contract in
`lib/repertuvar/annotation-types.ts` is the single source of truth for both clients, and screens
listed as permanently WebView in `MIGRATION.md` are not rewritten natively.

## Current state — completed, deployed, and unverified, kept apart

### Live and accepted

| Area | State | Source |
|---|---|---|
| 003 tenant schema | Deployed, hosted isolation tests passed | [003](briefs/003-dogrulama.md) |
| 005 multi-membership / active choir | Deployed. A real second membership was exercised on 8 September and then removed with the fixture | [005](briefs/005-coklu-uyelik-aktif-koro.md), [010](briefs/010-008-canli-yayin-ve-kabul.md) |
| 006 membership admin lockdown | Closed; the owner accepted the remaining risk on 27 old accounts under decision #17 | [006](briefs/006-uyelik-yonetimi-guvenlik-kapisi.md) |
| 007 operator-controlled choir creation | **Complete.** The authenticated success path was accepted live; the choir it created has since been cleaned up, which does not undo the acceptance | [007](briefs/007-operator-kontrollu-koro-olusturma.md) |
| 008 invitations | Deployed and accepted live for creation, acceptance and the single-use refusal. **Its two negative paths were never exercised through the product** | [008](briefs/008-davet-ve-uyelik.md), [010](briefs/010-008-canli-yayin-ve-kabul.md) |
| 009 Auth email | Complete; real verification and recovery delivery observed on 8 September. Delivery times were never measured | [009](briefs/009-auth-eposta-ve-yanit.md) |
| 011 invitation return + self-service reset | **Complete, 13/13,** released as `f661ab2` with all three CI jobs green | [011](briefs/011-davet-donusu-ve-sifre-sifirlama.md) |
| 012 multi-membership lockout fix | **Complete, 10/10.** Live and confirmed on the product; its SQL guard now passes on the fixed function and fails against the down-migration in an isolated PostgreSQL 17.11 copy | [012](briefs/012-coklu-uyelik-secim-kilidi.md) |

### Partial, with the gap named

| Area | State | What is missing |
|---|---|---|
| 004 native shell | **25 of 27 required criteria PASS** | Hardware keychain/keystore, and the real-phone real-account flow. Both were postponed by the owner — **do not raise either as the next action** |
| 010 live release and acceptance | **Six of seven criteria PASS**, including cleanup | The sixth: revoked-link and wrong-account refusals *through the live product*. Proven on the live database by the hosted SQL test and in isolation; never through the product, and the fixture is gone |

### Local-only progress, not deployed

013 defined the repertoire contract; 014 locally accepted the native catalogue; 015 locally
accepted the shared protected-file Edge path and web adoption; 016 locally accepted private PDF
download/render, basic zoom/scroll and read-only annotation overlays; 017 locally accepted the
continuous synthetic read flow. Package 018 then ran the actual Edge entrypoint through disposable
Auth/RPC/RLS/Storage and HTTP, fixing proxy URL, Storage MIME and Deno typing defects. The new Edge
function is still not deployed; Drive, live-product, real-account and hardware behavior remain NOT
RUN and web/native adoption must not be released before the function. Package 019 then used an
explicit fixture-only alternate entry to render actual iOS PDF bitmaps and Skia overlays on pages
1, 20 and 40, including zoom, invalid-page refusal, close cleanup and reopen. It does not prove
the 018 service-to-client lifecycle. Package 020 generalized that synthetic entry and accepted the
same actual output on the API 36 arm64 Android emulator. An Android embedded-asset `ENOENT` was
fixed by preparing the tracked fixture through exact Expo Asset 57.0.16; the product private-file
path was not changed. Both native-output packages remain simulator/emulator only.
Hosting/Drive exit is separate preparation ([altyapi](altyapi-2026-09-04.md)); Vercel remains
the verified live host and Railway preparation is not a completed move.

## Tests actually run

All product test rows below are historical evidence from their named revisions and environments.
WF-006 is documentation-only and reran no product tests; read each source for exact limitations.

| Date / revision | Environment, command or scenario | Result | Limitation |
|---|---|---|---|
| 9 Sep, `e2fe177` | Pixel 7 API 36 arm64 emulator; alternate-entry Android Release; actual PDF-page-image + Skia; mobile check, normal Android export and affected iOS rebuild | **PASS** — Android pages 1/20/40 at 1190 x 1684; base/150% annotations aligned; page 41 refused; close/reopen passed; 14 suites / 73 tests, 1,312-module normal Android bundle; iOS regression passed | Tracked synthetic fixtures only. Android Release private cache was not inspectable with `run-as`; returned image URI was deleted. No 018 service, live/provider/account, secure-storage, remote CI or hardware proof. Supplemental audit remains FAIL with the known 10 moderate toolchain findings |
| 9 Sep, `2c64e5e` | iPhone 17 / iOS 26.5 simulator; alternate-entry Release build; actual PDF-page-image + Skia; mobile check and normal iOS bundle | **PASS** — pages 1/20/40 returned 1190 x 1684 output; base/150% annotations visibly aligned; page 41 refused; close deleted output; reopen passed; 14 suites / 73 tests and 1,314-module normal bundle | Tracked synthetic fixtures and simulator only. No Android, 018 service gateway, live/Drive/account, secure-storage, remote CI or hardware proof |
| 9 Sep, `0b3df6e` | macOS task: guarded disposable Supabase stack; Deno check; actual HTTP Auth/RPC/RLS/Storage matrix; root `pnpm check` | **PASS** — actual entrypoint, ticket/checksum, authorization refusals, HEAD/ranges/416, MIME/upstream failures and cleanup; 38 files / 253 tests plus Next build | Synthetic local Storage only. No deploy, Drive, live/real account, remote CI or hardware evidence. One 8 MiB buffer observation is not a production performance claim |
| 8 Sep, `326aae9` | macOS task: isolated native product-flow component acceptance; full mobile gate and iOS bundle | **PASS** — signed-out through two-choir selection, catalogue, recovered synthetic 40-page PDF/annotation, tenant switch and sign-out; 14 suites / 73 tests; 1,314-module bundle | Auth/RPC/catalogue/PDF are injected fakes. Live Edge/provider/RLS/account and hardware are NOT RUN; no native rebuild was required or claimed |
| 8 Sep, `0bbe646` | macOS task: root `pnpm check`; mobile TypeScript/Jest/bundle/Expo Doctor; iOS simulator native build | **PASS** — root 37 files / 244 tests and Next build; mobile 13 suites / 72 tests; 1,314-module iOS export; Expo Doctor 21/21; product compiled/installed on iPhone 17 Pro simulator | Edge/provider/live account flow is NOT RUN. Native build used no Metro or real data; simulator is not hardware. Supplemental production-dependency audit remains **FAIL** with 10 moderate Expo toolchain findings |
| 8 Sep, `42fc8ff` | macOS task: root `pnpm check`; 015 focused tests; isolated PostgreSQL 17.11 runner | **PASS** — 37 files / 240 tests, build; 4 focused files / 32 tests; chef/leader/assigned/unassigned/no-selection/wrong-choir RLS matrix with unchanged hashes | Deno CLI absent. Deploy, provider integration, live product and native PDF are NOT RUN |
| 8 Sep, `9cec58d` | macOS task: root `pnpm check`; mobile type/test/iOS bundle | **PASS** — 34 files / 211 tests and build; 7 native suites / 50 tests; 666-module Hermes export | Fake/native gateway only. Device, live product, Edge and PDF are NOT RUN |
| 8 Sep, `5702bca` | Local PostgreSQL 17.11 at `127.0.0.1`, `genova_008_test_restore`; `PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=genova_008_test_restore PSQL_BIN=/opt/homebrew/opt/libpq/bin/psql bash supabase/test-support/012_regression_runner.sh` | **PASS** — SQL file exit 0 fixed; expected exit 3 with two null rows after down; exit 0 after restoring the fix; fixture-table snapshots unchanged | Isolated restored copy only, not production or a new live-product check. The complete 010 restore runner was not rerun; its new 012 call was syntax-checked |
| 8 Sep, `a13f696` | GitHub Actions, `push` on `main`, run [34165767148](https://github.com/genesinovachoir/genova_app/actions/runs/34165767148) | **PASS** — Quality and security, Browser regression, Native product checks | Historical CI evidence; later macOS root builds passed in 014–016. Recheck current tool availability |
| 8 Sep, `f661ab2` | Same workflow, run [34163714428](https://github.com/genesinovachoir/genova_app/actions/runs/34163714428) | **PASS** — 30 browser tests | Two earlier runs on this change were red; both were faults in the tests, detailed in [011](briefs/011-davet-donusu-ve-sifre-sifirlama.md) |
| 8 Sep, `3986f35` | Clean Linux install outside the connected folder: `pnpm lint`, `typecheck`, `test:coverage`, `test:service-worker` | **PASS** — 33 files / 206 tests | `pnpm build` could not run there: `next/font` cannot reach Google Fonts through either agent proxy. The owner ran the build on macOS and pasted its route table |
| 8 Sep, live DB | `list_my_choirs()` as the affected account, before and after the 012 fix, in rolled-back transactions | **PASS** — `null/null` became `false/false`; single-membership still `true`; one row current after a selection | Function-level. The product-level confirmation is the `active_choir_sessions` row the owner's own sign-in wrote |
| 8 Sep, live DB | 010 step 8 cleanup, single transaction | **PASS** — 12 rows removed, every counter back to the pre-010 baseline, each preserved item checked by name | Snapshot in `supabase/test-support/010_step8_pre_cleanup_snapshot.json` before deleting |
| 8 Sep, live product | Operator creates a choir → chief invites → recipient registers, verifies email, accepts → the link is reopened | **PASS** end to end; the reopened link was refused and the database confirmed no second acceptance | Owner-driven in a browser; the agent read the database, not the screen |
| 8 Sep, live product | `/invite` and `/auth/recovery` read through the browser pane on the owner's machine | **PASS** — the domain serves the release; `/auth/recovery` now offers the reset form | The commit hash is not readable client-side; the tie is behavioural |
| 7 Sep, live project | `psql -f supabase/tests/008_choir_invitations.sql` against production inside a rolled-back transaction | **PASS**, exit 0; row counts identical before and after | Covers the revoked and wrong-account refusals at the database level — this is why those are not unknown, only unproven through the product |
| 7 Sep, restored copy | `supabase/test-support/010_step3_runner.sh` on a fresh PostgreSQL 17 restore | **First run FAILED** 003/006/007; passed after reproducing the live role attributes | `pg_dump` carries no role attributes, so `BYPASSRLS` was lost and a tenant check passed vacuously. The most load-bearing finding of the release |
| 7 Sep, `10b6f9f` | Owner's macOS: `npx tsc --noEmit && npm test && npm run bundle:check` in `apps/mobile` | **PASS** — 35 tests, 660-module iOS export | Historical. No device, no live account |
| 7 Sep, `6d64d16` | Owner's macOS: Expo Android prebuild + Gradle debug build on a dedicated API 36 emulator | **PASS** — build installed and launched, signed-out screen verified | Historical. Emulator is not hardware; synthetic settings, no real account |

Every review recorded in this repository is **self-review**. No independent review and no
receiving-agent test is claimed anywhere.

## Failures, blockers, risks and unfinished changes

- **010's sixth criterion cannot be closed as things stand.** Closing it means creating a new
  test choir and invitation on production. That is a decision for the owner, not a chore to
  pick up.
- **012's former regression gap is closed locally.** The reusable runner checks green →
  expected red after down → restored green and is called by the existing restored-database
  acceptance path. It is not a new production or live-product run, and no CI run is claimed.
- **Environment results differ.** `next build` passed in this macOS task for 014 and 015; it was
  blocked by Google Fonts in earlier Linux agents. Playwright was not required or run for 014/015,
  and a local browser cannot prove an undeployed Edge function.
- **The 016 supplemental dependency audit is red.** `npm audit --omit=dev` reports 10 moderate
  findings in Expo CLI/config's `xcode` to `uuid` chain. Its complete automatic remedy proposes a
  breaking Expo 46 downgrade, so no force fix was applied. This does not invalidate the defined
  016 gates, but it remains an explicit dependency-maintenance risk.
- **CI log storage is unreachable** from the agent shells. Failures were diagnosed through the
  GitHub check-run **annotations** endpoint, which does return Playwright's failure text.
- **Historical Linux connected-folder limitation:** earlier agents could not delete Git locks.
  Do not apply that workaround automatically on macOS; first prove no active Git writer owns a
  lock and diagnose the current environment. Never move a live process's lock.
- **Historical external-release environment:** that agent lacked the SSH alias key. Its pushes went over
  HTTPS with the token in `.env.local.github`. **That token should be revoked** — its job is done.
- **`apps/mobile/node_modules` is a macOS install** shared through the connected folder. Never
  run an install against it from a Linux shell; copy the tree outside the folder instead, which
  is how the gate was run here.
- **Uncommitted and not ours:** `supabase/.temp/cli-latest` is modified (empty → `v2.116.0`).
  It is a Supabase CLI version cache the CLI rewrites on its own. It was left unstaged
  deliberately in every commit of this stretch. Do not commit it as part of unrelated work.

## Checkout and ownership

Branch `main`. Package 020 code/test is local commit `e2fe177`; this evidence update is
documentation-only. Local `origin/main` remains recorded at `a13f696`; packages 012–020 and
workflow records after it are local commits only. No remote refresh or push was attempted. The pre-existing
`supabase/.temp/cli-latest` change remains deliberately untouched.

The historical release record reports a single writer and owner approval for each production
step. WF-006 performed no production action and does not claim to re-audit those approvals. `main` was pushed twice with explicit authorization: the 010
step 6 release (`0389242..6b6d9a4`) and the 011 release plus its records
(`6b6d9a4..a13f696`), each after CI went green. Code and documentation were kept in separate
commits per `AGENTS.md`.

## Authority

**Standing:** local implementation, local commits, reading live state, and running the
repository gates. The owner has repeatedly said to proceed without asking inside those bounds,
provided results are reported honestly with dated evidence.

**Requires explicit approval, every time:**

- Any deletion of live rows.
- Any production release: push to `main`, deployment, Edge function deploy, migration.
- Anything touching the real choir `Genesi Nova` or its 29 members.
- Real email sends, spending, and any new account or credential.
- Hardware/real-phone testing — **postponed by the owner; do not propose it as the next step.**

A proposal written in a document is not permission to execute it. An unrun test is never
recorded as passed, and a required FAIL or NOT RUN keeps its brief open.

## Active bounded sequence

The 012 regression task is complete at local code/test commit `5702bca`; exact acceptance
evidence is in [012](briefs/012-coklu-uyelik-secim-kilidi.md). The reusable command is
`PGDATABASE=<dedicated-test-copy> bash supabase/test-support/012_regression_runner.sh`.
It refuses non-local or non-test-named targets, requires PostgreSQL 17 plus 003/005, proves the
expected down-migration failure, restores the fixed function and compares fixture-table
snapshots. It is also called by `supabase/test-support/010_step3_runner.sh` for future restored
database acceptance runs.

On 8 September the owner authorized local package execution; 013–017 reached their recorded
local acceptance. On 9 September the owner set the complete canonical plan as the continuing goal
and authorized the local execution loop within existing boundaries. Package 018 reached its
recorded local acceptance at `0b3df6e`; 019 and 020 accepted actual iOS and Android rendering at
`2c64e5e` and `e2fe177`, without any external or hardware action.

The canonical [delivery plan](mobil-teslim-plani.md) owns package dependencies, milestone gates,
local/external work selection and the execution loop. Do not duplicate its backlog here.
The next bounded implementation package remains plan A2: the actual 018 local-service
gateway/lifecycle on both local platforms. Open its brief from the current checkout before product
edits; 019/020's fixture-only screen cannot close that integration. A3
then checks existing web consumers. Independent later local work can continue under existing authority
while external/device gates remain pending, following the roadmap's dependency rules.
010 stays 6/7; 004 stays 25/27 and hardware remains postponed. Neither is the next action.

## Copyable startup prompt

> Work in `/Users/alidiyarduran/Antigravity/genovakorist`. Read `AGENTS.md`, then
> `docs/agent-handoff.md`, and follow `docs/gecis-rehberi.md` and `docs/ai-calisma-duzeni.md`
> with the six memory-bank indexes, relevant decisions and MIGRATION. Verify the actual branch,
> HEAD, working-tree ownership and applicable evidence; assume no access to previous chats.
>
> Read the canonical `docs/mobil-teslim-plani.md` for the long-term milestones and execution
> loop. Packages 019 and 020 are locally accepted at code/test commits `2c64e5e` and `e2fe177`;
> read their evidence and do not infer service integration, deploy, Drive, real-account, CI or
> hardware proof. The next bounded product task remains plan A2: open a brief for the verified 018
> local-service gateway/lifecycle on both local platforms.
>
> Preserve 013–020's historical local acceptance and distinguish it from deployment/Drive and
> unrun integration layers. Keep 004 at 25/27 and 010 at 6/7; hardware remains
> postponed and no new live fixture is authorized. Follow the plan one brief at a time and
> retain every required FAIL/NOT RUN. A fake or build cannot substitute for another layer.
>
> This prompt adds no authority. Push, remote CI dispatch, deploy, live migration/data changes,
> real accounts/data, email, credentials, spending and hardware need applicable explicit owner
> approval. Preserve unrelated changes, commit owned code and records separately, write agent
> records in English and user updates in Turkish. Product completion is not implied by a handoff.
