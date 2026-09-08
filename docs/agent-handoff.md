# Genova — agent handoff

Snapshot: 8 September 2026. The completed 012 code/test evidence is local commit `5702bca`.
At task start, local `main` was `03ea87d`, one commit ahead of the local `origin/main` ref at
`a13f696`; no remote refresh, push or deployment was performed. Verify the receiving checkout
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

### Not started

Repertoire/PDF, which decision #21 put behind 004's acceptance. **That gate is now open.**
Hosting/Drive exit is separate preparation ([altyapi](altyapi-2026-09-04.md)); Vercel remains
the verified live host and Railway preparation is not a completed move.

## Tests actually run

Only the new 012 local database row was run in this receiving task. Every other row is
historical; read its linked record for exact output and limitations.

| Date / revision | Environment, command or scenario | Result | Limitation |
|---|---|---|---|
| 8 Sep, `5702bca` | Local PostgreSQL 17.11 at `127.0.0.1`, `genova_008_test_restore`; `PGHOST=127.0.0.1 PGPORT=5432 PGDATABASE=genova_008_test_restore PSQL_BIN=/opt/homebrew/opt/libpq/bin/psql bash supabase/test-support/012_regression_runner.sh` | **PASS** — SQL file exit 0 fixed; expected exit 3 with two null rows after down; exit 0 after restoring the fix; fixture-table snapshots unchanged | Isolated restored copy only, not production or a new live-product check. The complete 010 restore runner was not rerun; its new 012 call was syntax-checked |
| 8 Sep, `a13f696` | GitHub Actions, `push` on `main`, run [34165767148](https://github.com/genesinovachoir/genova_app/actions/runs/34165767148) | **PASS** — Quality and security, Browser regression, Native product checks | The authoritative environment for `next build` and Playwright; neither agent shell can run either |
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
- **`next build` and Playwright cannot run in either agent environment.** Google Fonts is
  blocked at the proxy, and Playwright browser downloads are blocked too. CI is the only place
  those two gates can be evaluated; the owner's macOS is the other place for the build.
- **CI log storage is unreachable** from the agent shells. Failures were diagnosed through the
  GitHub check-run **annotations** endpoint, which does return Playwright's failure text.
- **The connected folder denies file deletion to the agent shell**, so git cannot clear its own
  `HEAD.lock` / `index.lock`. Move them into `.git/_stale_locks/` before a git write when
  "cannot lock ref" appears. That folder holds only quarantined junk and the owner can delete it.
- **`origin` is an SSH alias the agent shell has no key for.** Pushes in this stretch went over
  HTTPS with the token in `.env.local.github`. **That token should be revoked** — its job is done.
- **`apps/mobile/node_modules` is a macOS install** shared through the connected folder. Never
  run an install against it from a Linux shell; copy the tree outside the folder instead, which
  is how the gate was run here.
- **Uncommitted and not ours:** `supabase/.temp/cli-latest` is modified (empty → `v2.116.0`).
  It is a Supabase CLI version cache the CLI rewrites on its own. It was left unstaged
  deliberately in every commit of this stretch. Do not commit it as part of unrelated work.

## Checkout and ownership

Branch `main`. At the receiving task's start, HEAD was `03ea87d`; it contained the handoff
documentation commit on top of local `origin/main` at `a13f696`. The 012 runner was then
committed locally as `5702bca`. No remote refresh or push was attempted. The pre-existing
`supabase/.temp/cli-latest` change remains deliberately untouched.

Every commit in this stretch was written by a single agent, this one, and the owner approved
each production step as it came. `main` was pushed twice with explicit authorization: the 010
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

## Completed bounded task and next decision

The 012 regression task is complete at local code/test commit `5702bca`; exact acceptance
evidence is in [012](briefs/012-coklu-uyelik-secim-kilidi.md). The reusable command is
`PGDATABASE=<dedicated-test-copy> bash supabase/test-support/012_regression_runner.sh`.
It refuses non-local or non-test-named targets, requires PostgreSQL 17 plus 003/005, proves the
expected down-migration failure, restores the fixed function and compares fixture-table
snapshots. It is also called by `supabase/test-support/010_step3_runner.sh` for future restored
database acceptance runs.

There is no newly authorized product task in this handoff. Preserve the remaining gaps rather
than choosing around them: 010 is still 6/7 and needs a new production fixture plus explicit
owner approval; 004 is 25/27 and both device items are postponed. Repertoire/PDF is unblocked
but starts only when the owner names it as the next bounded task.

## Copyable startup prompt

> Work in `/Users/alidiyarduran/Antigravity/genovakorist`. Read `AGENTS.md`, then
> `docs/agent-handoff.md`, then follow `docs/gecis-rehberi.md` and
> `docs/ai-calisma-duzeni.md` in the order the handoff lists. Do not assume you can see
> earlier conversations. Verify the branch, HEAD, working tree and which recorded evidence
> still applies before acting.
>
> State to hold: 008 is live and was accepted on the product, but `010` is **not closed** —
> its sixth criterion, the revoked-link and wrong-account refusals through the live product,
> is NOT RUN and the fixture that would exercise it was cleaned up. 004 stands at 25 of 27;
> its two unrun criteria are hardware keychain and the real-phone flow, both postponed by me —
> do not raise either as the next action. 011 and 012 are live. Repertoire/PDF is unblocked
> but is not your task unless I say so.
>
> Verify the local 012 evidence and current checkout rather than rerunning or reopening it by
> assumption. 012 is complete locally at `5702bca`: its SQL file passed on the fixed function,
> failed for the expected reason after the down-migration, and passed after restoration on an
> isolated PostgreSQL 17.11 copy, with fixture snapshots unchanged. Do not choose a new product
> task until I name one.
>
> Authorization: local implementation, local commits, reading live state, and running the
> repository gates. **Not** authorized: pushing, deploying, migrating, deleting live rows,
> touching the real choir `Genesi Nova`, sending email, spending, or hardware testing. Ask me
> for any of those. Never record an unrun test as passed, never replace evidence with a
> self-score, and leave a required FAIL or NOT RUN visible rather than closing a brief around
> it. Keep agent records in English and your updates to me short and in Turkish.
