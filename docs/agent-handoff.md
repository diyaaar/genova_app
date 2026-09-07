# Genova — agent handoff

Snapshot: 7 September 2026, direct macOS verification at `10b6f9f` on `main`.
This follow-up changes documentation only; historical device/live evidence retains its date.
Recheck the current checkout and applicable evidence before acting. This file is an
entry point and a source index, not a second roadmap, an authorization grant, or proof
of live state. Where it summarizes another record, that record wins.

## Start here

1. Read [AGENTS](../AGENTS.md), then follow the complete reading order in the
   [migration guide](gecis-rehberi.md), including all six memory-bank files, and the
   [working cycle](ai-calisma-duzeni.md).
2. Read the [delivery plan](mobil-teslim-plani.md), [decisions](../KARARLAR.md)
   (especially #21 and #22), and the active brief. Inspect relevant code before changing it.
3. Record branch, commit, worktree ownership, one outcome, allowed paths, preserved
   behavior, existing authorization, required tests and rollback in the brief.
4. Work through one brief at a time. Continue authorized routine work without asking
   again at every step. A complete roadmap is not one giant rewrite task.

Write new agent-facing handoffs and acceptance records in English. Keep user-facing
updates and product copy in Turkish. Existing Turkish decisions remain authoritative:
do not create parallel English copies of every file or infer that English guarantees
better reasoning or instruction compliance.

## What the user wants, and why

Ship the existing choir product on iOS and Android while keeping the web working. The
first visible milestone is an installed app with sign-in, choir selection, repertoire,
PDF/existing-annotation reading, and sign-out, tested by a chief and a chorister on real
devices. RN + Expo is decided; `spike/` is disposable research, not the product.

The reasoning behind the order: isolation and membership foundations came first because
both clients share one database. The current priority is discovering actual mobile
problems through a device flow, which is why plan limits were removed from the automatic
pre-native path. Hosting/storage migration and expanded administration stay out of the
first-device path. The complete feature inventory in [MIGRATION](../MIGRATION.md),
including permanent WebView screens, is preserved. Shared TypeScript does not make DOM
code native-compatible.

## Accepted decisions in force

Full list and reasons in [KARARLAR](../KARARLAR.md); the ones that shape current work:

- **#7 / #8 — React Native + Expo**, settled by the 002 spike. Not reopened.
- **#2 — pixel parity with the web is not a goal.** Data and behavior contracts are.
- **#4 — the annotation JSON schema is one shared contract**
  ([annotation-types.ts](../lib/repertuvar/annotation-types.ts)); no Dart mirror.
- **#16 / #18 — the active choir is resolved server-side** from `auth.uid()` and the JWT
  session; a client preference is only a recall hint. New choirs are created only by a
  separate platform operator.
- **#21 — invitation acceptance → 004 native sign-in/choir selection → repertoire/PDF →
  device pilot; limits before store release.** If 010 is externally blocked, independent
  authorized 004 local work may proceed without claiming live acceptance.
- **#22 — English agent handoffs and acceptance records, Turkish user updates, evidence
  instead of subjective scores.**
- **#17 — the password/session risk of 27 old accounts was accepted by the owner.** Do not
  reopen mass recovery and do not report those accounts as secured.

Two decisions taken by the owner in the 6 September session, recorded here because they
change what a receiving agent should do, and not yet promoted to `KARARLAR.md`:

- The **real-device test was postponed**, although the owner has an Android phone.
- The owner explicitly asked that **004's criteria not be re-scoped** to accommodate that.
  The real-phone and device-keychain criteria therefore stay NOT RUN in place instead of
  moving to the pilot stage, and 004 stays partial by the owner's own choice.

## Work status — kept separate on purpose

### Deployed and live (verified earlier, not re-tested in this handoff)

| Area | Recorded result | Still open / source |
|---|---|---|
| 003 / 005 | Tenant isolation and session-bound active choir deployed | An actual second membership remains controlled; [005](briefs/005-coklu-uyelik-aktif-koro.md) |
| 006 | Unauthorized bootstrap/write paths closed | Owner accepted the 27-account password/session risk; [decision #17](../KARARLAR.md) |
| 007 | Choir creation DB/Edge deployed | Operator allow-list empty; no authorized success path accepted; [007](briefs/007-operator-kontrollu-koro-olusturma.md) |
| 009 | SMTP/Site URL configured, reply forwarding delivered, exposed key revoked | Real Auth verification/recovery delivery still unproven; [009](briefs/009-auth-eposta-ve-yanit.md) |

The live web was last verified on Vercel; Railway is preparation, not a completed hosting
move. Drive migration is not complete.

### Implemented locally and verified locally, never deployed

| Area | State | Source |
|---|---|---|
| 008 invitations/membership | Local package: 155 tests, 20 browser tests, isolated SQL/concurrency/down evidence. Browser Auth is mocked | [008](briefs/008-davet-ve-uyelik.md) |
| 004 native shell | `apps/mobile/` Expo SDK 57 workspace with sign-in, secure chunked session storage, zero/single/multi membership resolution, server-verified choir selection, per-choir cache clearing and sign-out. **23 of 27 required criteria PASS, 4 NOT RUN, so 004 is partial/pending** | [004](briefs/004-rn-kabuk-ve-giris.md) |

The 005 active-choir contract now lives in [`lib/choir-context-core.ts`](../lib/choir-context-core.ts)
and is imported by both clients. [`lib/choir-context.ts`](../lib/choir-context.ts) keeps its
previous public API and adds `isChoirId` and `ChoirContextClient`; no export was removed,
and the web behavior is unchanged.

### Prepared but unverified

| Area | State | Source |
|---|---|---|
| 010 live release of 008 | Exact release/acceptance plan written; no live action ever started | [010](briefs/010-008-canli-yayin-ve-kabul.md) |
| Native CI job | `.github/workflows/ci.yml` gained a `mobile` job running `npm ci`, `npx tsc --noEmit`, `npm test`, `npm run bundle:check`. Configuration only — it has never executed remotely | [ci.yml](../.github/workflows/ci.yml) |
| Android build | Own debug APK built and launched on dedicated API 36 ARM64 emulator at `6d64d16`; synthetic settings, no real account | [Evidence](briefs/004-android-build-2026-09-07.md) |
| Hosting / Drive exit | Research and separate staging preparation only | [infrastructure record](altyapi-2026-09-04.md) |

## Latest local verification — 7 September 2026

At `10b6f9f`, the main agent directly ran `npx tsc --noEmit && npm test && npm run bundle:check`
in `apps/mobile` on macOS 26.5.1 arm64, Node v24.13.1 / npm 11.8.0. All passed: silent
TypeScript, 4 suites / 35 tests, 660-module iOS Hermes bytecode export. Existing dependencies
were reused with `CI=1 EXPO_NO_DOTENV=1 EXPO_OFFLINE=1`; no app launch or live environment
values were used. Evidence and limits are in the [004 table](briefs/004-rn-kabuk-ve-giris.md)
and [captured output](briefs/004-native-gate-2026-09-07.md).

The old 21/26 summary was a counting error: the committed table already held 22 PASS and
five NOT RUN rows. No criterion or required flag changed. The rerun refreshes existing PASS
evidence and does not close 004. The current read-only prerequisite check found no generated
Android project, Android Studio at its conventional application path or default Android SDK.

## Historical tests actually run on 6 September 2026

Full per-criterion evidence is in the [004 brief](briefs/004-rn-kabuk-ve-giris.md); this is
the index. Environments: **MACOS** = the owner's machine (darwin-arm64), **NATIVE-VM** =
the agent's Linux VM (linux-arm64) sharing the same folder, **WEB-LINUX** = a cloud Linux
container running an extracted copy of the source.

| Revision | Environment | Command | Result | Limit |
|---|---|---|---|---|
| `3009afe` | NATIVE-VM | `npx tsc --noEmit && npm test` in `apps/mobile` | PASS, 4 suites / 35 tests | Isolated doubles only; no live Supabase |
| `c91886c` | MACOS | `rm -rf node_modules && npm ci` then the same gate | PASS, 1118 packages, 35 tests | This is the command the CI job uses; npm reported 10 moderate advisories, not addressed |
| `c91886c` | MACOS | `pnpm check` at the root | PASS end to end, incl. `next build` and 32 files / 190 tests | Coverage measures only the configured files |
| `3009afe` | WEB-LINUX | `pnpm lint`, `pnpm typecheck`, `pnpm test:coverage`, `pnpm test:service-worker` | PASS | `pnpm build` could not run there: egress blocks the `next/font` fetch |
| `dc5f7a6` | NATIVE-VM | `npx expo export --platform ios --no-bytecode --clear` | PASS, 660 modules, shared RPC names present in the bundle | Bytecode step needs an x64 hermesc, unavailable on this ARM VM |
| `dc5f7a6` | MACOS | `npx expo start --clear`, then four flow scenarios in Expo Go | PASS, 798 modules bundled | Expo Go is a generic host app, not this project's build |
| `dc5f7a6` | MACOS | `npx expo run:ios`, then the same four scenarios repeated | PASS; the project's own build launched on the iOS Simulator (iPhone 17 Pro, iOS 26.5) | Simulator only; no hardware, so keychain scope and real-device behavior stay unproven |

The four scenarios were: rejected sign-in, automatic single-membership choir, session
restored after a full relaunch, and sign-out returning to the login screen. They were run
manually by the owner, who reported the results; the agent did not observe the device.

**Not run, and not to be reported otherwise:** real-hardware keychain verification, the
Android development build, the real-phone scenario, any remote CI execution, and every
live 010 action.

## Open blockers and risks

- **004 cannot close on the current authority and prerequisites.** The four open criteria
  concern hardware keychain, real-phone account flow, remote CI and live acceptance. Do not start
  the repertoire/PDF brief before 004 is accepted.
- **010 is blocked twice over:** the session that prepared this handoff had no live
  deployment authority, and Supabase MCP was unauthorized with no CLI installed. At the
  last check direct DB IPv6 reached a timeout; revalidate the supported access route and
  the exact project before any live step.
- **Production fixtures were proposed but never approved:** `Genova 008 Test` and the
  operator-owned Gmail aliases `+008sef` / `+008korist`. Do not create, contact or delete
  them merely because they appear in a document. Existing users are not substitute fixtures.
- **`apps/mobile/node_modules` is shared between macOS and the agent's Linux VM** over the
  same folder, and each platform's install invalidates the other's. macOS is the
  authoritative install; an agent must not run `npm install` there. A jest "preset not
  found" error in the Linux VM is this collision, not a code defect.
- **Historical Linux VM limitation: the connected folder denied deletion.** `pnpm` and
  `git` cannot remove their own lock
  and temp files, so `pnpm check` fails in that VM and git leaves stale `.lock` files. The
  workaround in use is renaming them into `.git/_stale_locks/`, which is untracked. A
  session using that VM should recheck its permission boundary. The 7 September run is
  directly on macOS; no Linux install was needed. Its commit encountered an empty
  `HEAD.lock` dating from 6 September 22:52. After checking that no Git process was
  active, the main agent quarantined it under `.git/_stale_locks/` and retried.
- **Unit tests could not catch a resolver misconfiguration.** `metro.config.js` once
  disabled hierarchical lookup and broke `expo-asset`; `npm run bundle:check` now guards
  that class of bug in CI. Assume other native-only failure modes exist that the current
  suite does not cover.
- **Shared-database risk is unchanged:** schema work needs a fresh backup, restore
  evidence, both-project impact and a web/Edge/DB ordering. A git revert is not a data
  rollback.

## Existing authorization, and what still needs approval

Granted and still in force, from the owner's own message in this session: local
implementation, local testing and the required local commits for the documented mobile
plan, one brief at a time.

The same message explicitly withheld, and nothing since has granted: production
deployment, real-account or real-data actions, email sending, and spending. Concretely,
each of these still needs a fresh, explicit approval:

- `git push` of any kind. `main` is well ahead of `origin/main` — check the exact figure
  with `git rev-list --left-right --count origin/main...main` rather than trusting a number
  written here — and a push can trigger a Vercel production deployment. This is also what
  blocks the CI-run criterion.
- Any 010 step: backup, restore, DB migration, Edge deploy, fixture accounts, real Auth
  email delivery.
- Any paid service, including EAS builds.
- Assigning a real platform operator or creating a real choir.

Authorization does not transfer through a planning document, a model change, or the word
"continue" without its context.

## Unfinished changes and ownership

The working tree at entry (`10b6f9f`) was clean, with one `main` worktree and no inherited
edits. The main agent is the only writer. The 7 September follow-up is a local documentation
commit (native evidence and affected status indexes), with no production-code change or push.
The local `origin/main` reference was 19 commits behind at entry; this is not a fetched remote
snapshot. Verify the current status and commit rather than inferring them from this record.

Untracked but present on the owner's machine, all correctly gitignored, all owned by the
owner rather than by any agent:

- `apps/mobile/.env` — the two public `EXPO_PUBLIC_*` Supabase values, created by the owner.
  Not read, printed or committed in this follow-up; ask the owner for configuration if missing.
- `apps/mobile/node_modules`, `apps/mobile/ios/`, `apps/mobile/.expo/` — generated output.
- `.git/_stale_locks/` — quarantined git lock files, safe to delete.

## The next bounded task

**Brief:** [004](briefs/004-rn-kabuk-ve-giris.md), which stays open. Do not write the
repertoire/PDF brief yet; the delivery plan puts it after 004 acceptance.

**Completed first action:** the native gate and `bundle:check` passed at `10b6f9f` on
7 September, with direct macOS output in the brief. Do not rerun it simply because a new
session begins; rerun when product/configuration changes or an unresolved failure warrants it.

**Android next action completed:** at `6d64d16`, reused the Homebrew SDK/JDK, added
emulator/API 36 ARM64 image, built the own debug APK and verified the signed-out screen
and empty-form validation on dedicated AVD `genova004_api36`. See the
[Android record](briefs/004-android-build-2026-09-07.md) for commands, launch failures
resolved, screenshots, hash and synthetic-only scope. Generated files remain ignored.

**Next decision:** ask whether the owner wants to resume the postponed hardware check.
Do not assume it is due. Real-account/data use needs explicit authorization for the exact
scenario. Four criteria remain NOT RUN: hardware keychain, real-phone account flow,
remote CI (push not authorized) and live 010. Repertoire/PDF remains blocked on 004 acceptance.

**Relevant files:** `apps/mobile/src/auth/auth-store.ts` holds every acceptance rule and is
where behavior changes belong; `apps/mobile/src/auth/AuthProvider.tsx` is a thin React
binding with no rules of its own; `apps/mobile/src/ui/AppRoot.tsx` maps auth phase to
screen; `apps/mobile/src/auth/secure-storage.ts` and `choir-preference.ts` wrap the
keychain; [`lib/choir-context-core.ts`](../lib/choir-context-core.ts) is the shared 005
contract and changing it affects the live web.

**Acceptance criteria:** the mandatory evidence table in the
[004 brief](briefs/004-rn-kabuk-ve-giris.md). Update statuses there with dated evidence;
do not add a summary table elsewhere.

**Blocked in parallel, not to be started on assumption:** [010](briefs/010-008-canli-yayin-ve-kabul.md)
needs live access and authority; the CI-run criterion needs a push.

## Acceptance discipline

Use the acceptance-evidence section in the [brief template](briefs/_TEMPLATE.md). Before
implementation, enumerate the required behaviors and failure cases. For each criterion
record PASS, FAIL, NOT RUN, or N/A with a specific reason. Every PASS must point to dated
evidence for the relevant code revision, environment and command or manual scenario. A
historical pass is not a new run. Scope changes may add criteria; do not delete or waive
failed criteria merely to obtain a green result, and do not re-scope a criterion the owner
has asked you to leave in place.

- Run the applicable AGENTS gates and behavior tests. Fix regressions; do not suppress
  tests, weaken assertions or disable security controls to pass.
- Exercise denied roles/choirs, invalid inputs, expiry, concurrency, network failures and
  cache clearing when relevant. Happy-path tests alone do not cover these cases.
- Review your diff against the requirements and existing behavior after tests. Label this
  self-review. Never claim an independent review or spawn one implicitly.
- A required FAIL or NOT RUN leaves the brief partial/pending. Continue independent
  authorized work; a missing phone must not become a fabricated device result.
- Optional progress is `passed required criteria / all required criteria`, including unrun
  required criteria in the denominator. No subjective score, code-quality percentage or
  average can override a required gate. N/A requires justification.
- On completion update the brief evidence and only affected memory/status indexes; commit
  with the brief ID. Separate production code and documentation commits.

The existing [CI workflow](../.github/workflows/ci.yml) defines `pnpm check`, a production
dependency audit, Playwright regression, and now the native `mobile` job. This handoff
neither verifies a remote run nor branch protection. CI does not prove live DB, provider
delivery, native devices, store approval, or compliance with every prose rule.

## Judgment and authority boundaries

Use a smaller model for explicit, bounded implementation; do not silently redesign
authorization, schema, shared contracts or publication policy. Record the exact question,
inspected evidence, proposed solution and affected tests when stronger review or a user
decision is needed. Lack of a reviewer is not approval. An existing approved design can be
implemented within its scope; no need to re-approve each step.

Preserve one writer per checkout and unrelated changes. Secrets must never appear in
prompts, screenshots, command output, Git, or handoff records. Live Supabase is exactly
`hievmwwctjjlhmssoxsu`, shared with the choir website. Push can deploy.

After two unsuccessful attempts using the same approach, reassess the cause and sources;
do not endlessly repeat commands. Continue on a supported alternative or return a concrete
blocker. Do not claim the project finished until all required product and release gates,
not just local code, have evidence.

## Copy into the new chat

Use this from the Genova project checkout:

> Continue the Genova mobile migration. Read `AGENTS.md`, then follow
> `docs/gecis-rehberi.md` and `docs/ai-calisma-duzeni.md` completely, and use
> `docs/agent-handoff.md` as the entry point. Follow decision #21 and the current delivery
> plan. Verify the checkout, recorded state and applicable evidence yourself; do not assume
> access to any previous conversation.
> Brief 004 is open with 23 of 27 required criteria passed. Android build/emulator
> acceptance passed at `6d64d16`; real hardware, remote CI and 010 remain open. The native gate and bundle check passed on macOS at `10b6f9f`
> on 7 September; verify the evidence and source changes before deciding to rerun. Next,
> ask whether the postponed hardware check should resume; do not assume it is due. Do not begin
> the repertoire/PDF brief before 004 is accepted, and keep 010 pending.
> I authorize local implementation, local testing and the required local commits for the
> documented mobile plan, one brief at a time. This message grants no production
> deployment, push, real-account or real-data, email or spending authority; ask me before
> any of those, and ask before assuming the postponed real-device test is due.
> Use the mandatory acceptance-evidence records; never mark a required unrun test passed,
> replace evidence with a self-score, or re-scope a criterion to close a brief. Preserve
> existing behavior and the native/WebView boundaries in `MIGRATION.md`. Keep agent records
> in English and my updates short and in Turkish.

## Android follow-up — 7 September 2026

Supersedes the earlier conventional-path prerequisite snapshot: SDK/JDK were already installed
under Homebrew. Android emulator acceptance now passed; historical five-gap and absent-Android
statements above describe the earlier run only. The main agent used synthetic loopback settings
with dotenv disabled and stopped its Metro/emulator after evidence capture. The dedicated AVD,
SDK additions and ignored `apps/mobile/android/` remain for reuse. No product source changed.
Current evidence: [Android acceptance](briefs/004-android-build-2026-09-07.md), [004](briefs/004-rn-kabuk-ve-giris.md).
