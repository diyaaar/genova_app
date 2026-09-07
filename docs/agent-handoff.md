# Genova — agent handoff

Snapshot: 7 September 2026, updated from `main` at `3986f35` after the live 008 release,
the first round of controlled product acceptance, and the local 011 fix. Verify the receiving
checkout; conversation history is not required.
This file is an entry point and source index, not a second roadmap or authorization grant.

## Entry and source order

Read [AGENTS](../AGENTS.md), then follow the complete [migration guide](gecis-rehberi.md)
and [working cycle](ai-calisma-duzeni.md): all six memory-bank files, [MIGRATION](../MIGRATION.md),
[decisions](../KARARLAR.md), [delivery plan](mobil-teslim-plani.md), active brief and relevant
code/evidence. Record the start-check in the brief before changing anything. Use the
[brief template](briefs/_TEMPLATE.md) and retain one writer per checkout.

Write agent records in English and user updates/product copy in Turkish. Original Turkish
decisions remain authoritative. Evidence belongs in its brief; indexes link to it.

## Objective and accepted decisions

Ship the existing choir product on iOS and Android while preserving the working web.
The first product milestone is installed sign-in → choir selection → repertoire → PDF and
existing annotations → sign-out, then chief/chorister device pilot. It is not yet achieved.

The [decisions](../KARARLAR.md) and [delivery plan](mobil-teslim-plani.md) retain the reasons:

- #7–8: React Native + Expo, settled by the 002 spike; same repository. `spike/` is disposable
  research, not product code. Shared TypeScript still needs platform-dependency inspection.
- #2/#4: preserve behavior/data rather than pixel parity. The single annotation contract is
  [annotation-types.ts](../lib/repertuvar/annotation-types.ts); no separate schema mirror.
- #16/#18: server-verified session-bound active choir; a saved client preference is only a hint.
  Choir creation belongs to a separate platform operator, not every choir chief.
- #21: invitation acceptance → 004 native sign-in/selection → repertoire/PDF → device pilot;
  limits before store release. Independent authorized 004 local work can proceed while 010
  is blocked. Limits/hosting/commercial administration do not automatically delay the pilot.
- #22: English agent records, Turkish user updates, dated acceptance evidence instead of scores.
- #17: the owner's accepted old-account risk stays historical; do not reopen mass recovery or
  claim those accounts were secured. See the original decision for details.

Permanent WebView boundaries in MIGRATION remain: announcements, choristers, profile/change
requests and attendance. No rewrite of these screens; the session bridge is separate work.

**Latest owner steering, recorded in [004](briefs/004-rn-kabuk-ve-giris.md#handoff-start-check-and-next-task-contract--7-september-2026):**
the owner again postponed real-device testing on 7 September and asked for this handoff and a
reasoned next step. Do not ask to resume it as the automatic next action. The earlier instruction
not to re-scope 004 stands; required hardware criteria stay NOT RUN, not moved to the pilot.

## Current state by verification layer

**004 native product area — partial, 24 of 27 required criteria PASS.** Expo workspace at
`apps/mobile/`, sign-in/session adapter, zero/single/multiple membership handling,
server-verified selection, cache clearing and sign-out. Shared 005 logic lives in
[choir-context-core.ts](../lib/choir-context-core.ts); the web module keeps its public
exports. Native gate, iOS simulator, Android emulator and a green remote CI run are recorded.
The [mandatory table](briefs/004-rn-kabuk-ve-giris.md#mandatory-acceptance-evidence) is
authoritative. Three criteria stay NOT RUN: hardware keychain, the real-phone real-account
flow (**deferred by the owner — do not raise it as the next action**), and live 010 acceptance.

**Live as of 7 September 2026.** 010 took 008 to production in the required DB → Edge → web
order and the [step-by-step record](briefs/010-008-canli-yayin-ve-kabul.md) carries the
evidence for each: fresh backup with a proven restore, a fresh-restore acceptance run that
first failed and exposed a real gap in the backup, the live migration, the Edge deploy with
four security checks, and the web release on `6b6d9a4` with CI run #21 and a matching Vercel
production deployment. A controlled product acceptance then created a test choir, invited a
test account, delivered a real verification email, accepted the invitation and refused a
second acceptance of the same link.

**010 is not closed.** Its
[acceptance evidence table](briefs/010-008-canli-yayin-ve-kabul.md#kabul-kanıt-tablosu--7-eylül-2026)
lists three open criteria: live domain verification (neither agent environment can reach
`app.genesinovachoir.com`), the revoked-link and wrong-account negative paths live, and
cleanup of the test data. Cleanup needs its own confirmation at execution time.

**Historically deployed, revisited here:**

| Area | Recorded state and source | Limit |
|---|---|---|
| 003/005 | [Tenant isolation](briefs/003-dogrulama.md), [session-bound choir](briefs/005-coklu-uyelik-aktif-koro.md) deployed | The 010 round exercised a real second membership and a live `set_active_choir`; that is now observed, not implied |
| 006 | [Unauthorized bootstrap/write paths closed](briefs/006-uyelik-yonetimi-guvenlik-kapisi.md) | Owner accepted remaining old-account risk |
| 007 | **Complete.** Operator allow-list filled and the [authenticated success path accepted](briefs/007-operator-kontrollu-koro-olusturma.md#authenticated-başarı-yolu-kabul-edildi--7-eylül-2026) | The accepted creation is the test choir; it is on the cleanup list |
| 008 | Deployed and accepted live for creation, acceptance and the single-use refusal | Revoked-link and wrong-account refusals are proven in isolation and in the hosted SQL test, not yet through the live product path |
| 009 | [SMTP/return URL and signed reply forwarding accepted](briefs/009-auth-eposta-ve-yanit.md); **real Auth email delivery now verified** for recovery and new-user verification | Delivery times were not measured |

**Fixed live, after the release:** [012](briefs/012-coklu-uyelik-secim-kilidi.md) closes a
multi-membership lockout that the 010 round exposed. `list_my_choirs` computed `is_current`
with `=` against a function that returns null when nothing is selected yet, so every row came
back with a null boolean, the shared client contract rejected the list, and a member of two
choirs was shown "no accessible choir membership" instead of the picker. Function body only,
verified live before and after; no redeploy was needed. Its regression test file is written
but has not been executed.

**Local, not deployed:** [011](briefs/011-davet-donusu-ve-sifre-sifirlama.md) fixes two dead
ends the live round exposed — the verification round trip losing the invitation, and a
"forgot password" link leading to a page nothing could ever reach. Partial at 8 of 12 required
criteria: 19 unit tests pass, but the repository gate was not run here and two redirect URLs
must be allowed in the Auth settings before the fix has any effect in production.

**Not started:** repertoire/PDF, which waits on 004 acceptance. Hosting/Drive exit is
[separate preparation](altyapi-2026-09-04.md); Vercel remains the verified live host and
Railway preparation is not a completed move.

## Tests actually run — historical evidence index

No product test was rerun to prepare this handoff. Read the linked records for exact output.
Product/native/shared/CI sources were locally confirmed unchanged since `dc5f7a6`; later commits
record evidence and status. This applicability check is not a new test run.

| Date / revision | Environment and command/scenario | Result and limitation | Evidence |
|---|---|---|---|
| 6 Sep, `3009afe` | Linux ARM VM, native `npx tsc --noEmit && npm test` | 4 suites / 35 PASS; isolated doubles | [004](briefs/004-rn-kabuk-ve-giris.md) |
| 6 Sep, `c91886c` | Owner's macOS, clean `npm ci`, native gate; root `pnpm check` | Native 35 PASS; web 190 tests and build PASS. Owner-reported historical output; 10 moderate npm advisories unresolved | [004](briefs/004-rn-kabuk-ve-giris.md) |
| 6 Sep, `3009afe` | Extracted Linux web copy: lint/type/coverage/service-worker checks | PASS; build blocked there by font-fetch egress, later passed on macOS | [004](briefs/004-rn-kabuk-ve-giris.md) |
| 6 Sep, `dc5f7a6` | Linux export with `--no-bytecode`; macOS Expo Go then own `expo run:ios` build | Metro resolution fixed. Owner reported four scenarios on own iOS simulator build: rejected login, single choir, session relaunch, sign-out. Not agent-observed hardware | [004](briefs/004-rn-kabuk-ve-giris.md) |
| 7 Sep, `10b6f9f` | Direct macOS 26.5.1 arm64, Node 24.13.1/npm 11.8.0; native type/test/bundle chain | PASS: 35 tests, 660-module iOS Hermes export. Existing install, dotenv disabled; no device/live test | [Transcript](briefs/004-native-gate-2026-09-07.md) |
| 7 Sep, `6d64d16` | Direct macOS, Java 17, Expo Android prebuild + Gradle ARM64 debug build; dedicated API 36 emulator | PASS: build 160 tasks, own APK installed/launched, signed-out screen and empty-form validation visually/XML verified. Synthetic loopback settings; no real account | [Android evidence and screenshots](briefs/004-android-build-2026-09-07.md) |
| 7 Sep, `08f41dc` | GitHub Actions run #20 on `ci/004-native-check`, then run #21 on `main` at `6b6d9a4` | PASS: `quality`, `browser`, `mobile` all green on both a `pull_request` and a `push` event | [004 CI record](briefs/004-rn-kabuk-ve-giris.md#ci-run-19-result--7-september-2026) |
| 7 Sep, live project | `psql -f supabase/tests/008_choir_invitations.sql` against production, inside a rolled-back transaction | Exit code 0; row counts identical before and after, no fixture leaked | [010 step 4](briefs/010-008-canli-yayin-ve-kabul.md#hosted-test-canlıda-geçti) |
| 7 Sep, restored copy | `supabase/test-support/010_step3_runner.sh` on a fresh PostgreSQL 17 restore | First run FAILED 003/006/007 — `pg_dump` carries no role attributes, so `BYPASSRLS` was lost and a tenant check passed vacuously. Passed after reproducing the live role attributes. The most load-bearing finding of the release | [010 step 3](briefs/010-008-canli-yayin-ve-kabul.md#adım-3-sonucu--taze-restore-kabulü-geçti-7-eylül-2026) |
| 7 Sep, live product | Operator creates choir, chief invites, recipient registers, verifies email, accepts; link reopened afterwards | PASS end to end; the reopened link was refused and the database confirmed no second acceptance or membership | [010 step 7](briefs/010-008-canli-yayin-ve-kabul.md#adım-7--kontrollü-ürün-kabulü-ilk-tur-7-eylül-2026) |
| 7 Sep, `3986f35` | Isolated container, `vitest run --environment node` on `lib/invite-token-store.test.ts` and `lib/auth-recovery.test.ts` | 19/19 PASS. Limit: vitest 5.0.0 in a scratch container, not the repository's pinned vitest 4 and not the repository gate | [011](briefs/011-davet-donusu-ve-sifre-sifirlama.md#mandatory-acceptance-evidence) |

Remote CI and the live invitation/membership flow have since passed, so the open 004 criteria
are now three: **hardware keychain/keystore, the real-phone real-account flow, and the parts of
live 010 acceptance that are still open**. Emulator success is not hardware/real-account
evidence. Every review recorded here is self-review; no independent review or receiving-agent
test is claimed.

## Environment, artifacts, failures and risks

- Direct macOS is usable. Existing Java 17 and Android SDK are under Homebrew; Android Studio
  is absent but not required by the proven command-line path. Exact environment variables,
  commands and versions are in the Android evidence record; do not reinstall from scratch.
- Existing macOS `apps/mobile/node_modules` must not be overwritten by a Linux install sharing
  this folder. Product npm lockfile is separate from the root web pnpm lockfile.
- Owner-owned `.env` was not read/printed/modified; local exports and Android launch disabled
  dotenv and used synthetic settings. Never capture secrets or real sessions into evidence.
- Ignored output exists: `apps/mobile/ios/`, `android/`, `.expo/`, and the own Android APK.
  APK hash was rechecked at handoff and matches the Android record. It is a debug artifact,
  not a release/store build. Keep original iOS/user artifacts intact.
- Task-created reusable resources: SDK emulator/API 36 ARM64 system image and dedicated
  `~/.android/avd/genova004_api36.avd`. Task Metro/emulator were stopped; handoff check found
  no Metro 8081 listener or emulator process. Do not open a physical device or existing account.
- Resolved Android failures: default AVD userdata exceeded free disk; runtime partition-size
  override succeeded. Metro initially listened only on IPv6 loopback; documented LAN/IPv4
  setup resolved script loading. Missing `devices.xml` diagnostic did not prevent AVD creation.
  See the evidence's failure sequence; no generated source was hand-edited.
- Remaining warnings: npm advisories not audited away, Gradle/SDK deprecations, and automatic
  system-UI feature warning. No source regression was fixed in these documentation follow-ups.
  Basic emulator launch does not prove full Android behavior, lifecycle, accessibility or parity.
- Earlier Linux delete/lock limitations are historical. An empty stale HEAD lock was
  quarantined after checking no Git writer was active; no general lock deletion recipe.
- 010 records disagree historically about CLI availability; access was not rechecked here.
  Treat current MCP/CLI/network status as unknown, not a verified blocker or authorization.
  Shared DB changes still require fresh backup/restore, both-project impact and DB → Edge → web.

## Checkout and ownership

Branch `main`, HEAD `3986f35` after this update, worktree otherwise clean apart from
`supabase/.temp/cli-latest`, a CLI cache artifact left unstaged on purpose. This agent owns
every edit recorded here. `main` was pushed once during 010 step 6 (`0389242..6b6d9a4`) with
explicit standing authorization and in the required order; the commits after `6b6d9a4` are
evidence records and the local 011 fix, and they are **not pushed**.

A practical repository quirk: this checkout sits in a folder that denies file deletion to the
agent's shell, so git cannot clear its own `HEAD.lock`/`index.lock`. Move them into
`.git/_stale_locks/` before a git write when a "cannot lock ref" error appears. That folder
holds only quarantined junk and can be deleted by the owner at any time.

## Authority

Standing authorization from the owner: proceed without asking, one bounded piece at a time,
provided the rules are followed and results are reported honestly with evidence. That covers
local implementation, local commits, reading live state, and the live 010 steps already
carried out.

Still requiring explicit confirmation at execution time: **the 010 step 8 cleanup**, because it
deletes rows; any spending; and anything touching the real choir `Genesi Nova`. Hardware/real-phone
testing was postponed by the owner — do not raise it as the next action. A proposal in a
document is not permission to execute it, and no unrun test may be recorded as passed.

Housekeeping the owner should do when this work ends: revoke the GitHub token in
`.env.local.github`.

## Next bounded task

Three things are open, in the order they can be done.

**1. Owner-only, short.** Run `pnpm check` at the repository root for 011, and add
`https://app.genesinovachoir.com/invite` and `https://app.genesinovachoir.com/auth/recovery`
to the Supabase Auth redirect allow-list. Without the second, 011's fix silently does nothing.
Also open the live domain once and confirm it serves `6b6d9a4`, which closes 010's fifth
criterion.

**2. The two remaining live negative paths.** A revoked invitation and a wrong-account
acceptance, both refused through the live product. Each needs a chief session and a recipient
session; the tokens used in the first round lived in temporary files that no longer exist, so
they must be obtained again. The database logic behind both is already proven live by the
hosted SQL test, so what these add is the product path.

**3. 010 step 8 — cleanup, on explicit confirmation.** Delete the test choir's
`choir_member_roles`, `choir_members`, `roles` and `choirs` rows, the
`genova_007.choir_creation_audit` row, the 008 invitation row, and the
`ali.duran@orbibarobotics.com` Auth user. **Preserve** the real choir `genesi-nova` and its 29
members, the `alidiyarduran35@gmail.com` membership `ff249bd2-…` with its `Partisyon Şefi`
role, and that Auth user, who is both a real member and the platform operator. Re-verify the
counts and the invitation endpoint afterwards and record the result in 008 and 010.

Only after 010 closes does 004 reach 25 of 27, with the two owner-deferred criteria remaining.
Repertoire/PDF still waits for that.

## Copyable startup prompt

> Work in `/Users/alidiyarduran/Antigravity/genovakorist`. Read `AGENTS.md`, then follow
> `docs/gecis-rehberi.md` and `docs/ai-calisma-duzeni.md` completely, using
> `docs/agent-handoff.md` as the entry point. Do not assume access to earlier conversations.
> Verify branch, HEAD, worktree state and which evidence still applies. Follow decision #21
> and preserve the native/WebView boundaries.
>
> Current state: 008 is live and 010 carried it there, but 010 is **not closed** — read its
> acceptance evidence table and treat its three open criteria as the live work. 004 stands at
> 24 of 27; its three unrun criteria stay unrun. Brief 011 is local and partial and needs the
> repository gate plus two Auth redirect URLs before it means anything in production.
> Real-device testing was postponed by me and must not be raised as the next action.
> Do not start repertoire/PDF.
>
> I have given standing authorization to proceed without asking, one bounded piece at a time,
> as long as you follow the rules and report honestly with dated evidence. That does not
> extend to deleting data: the 010 cleanup needs my confirmation when you are about to run it.
> No spending. Never record an unrun test as passed, never replace evidence with a self-score,
> and keep a required FAIL or NOT RUN visible rather than closing the brief. Keep agent records
> in English and your updates to me short and in Turkish.
