# Genova — agent handoff

Snapshot: 7 September 2026, re-verified from `main` at `d9ab194` by the session that
prepared the CI execution-readiness proposal. This handoff is a documentation-only
follow-up commit. Verify the receiving checkout; conversation history is not required.
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

**Completed local work:** 004 Expo workspace at `apps/mobile/`, sign-in/session adapter,
zero/single/multiple membership handling, server-verified selection, cache clearing and sign-out.
Shared 005 logic lives in [choir-context-core.ts](../lib/choir-context-core.ts); the web module
retains its public exports. Native gate, iOS simulator and Android emulator evidence exist.
**004 remains partial: 23 of 27 required criteria PASS, four NOT RUN.** The
[mandatory table](briefs/004-rn-kabuk-ve-giris.md#mandatory-acceptance-evidence) is authoritative.
The old 21/26 summary was a counting error (actually 22/27); Android acceptance raised it to 23/27.

**Locally verified, not deployed:** [008 invitations](briefs/008-davet-ve-uyelik.md), with historical
155 unit/component tests, 20 browser tests and isolated SQL/concurrency/down evidence. Browser
Auth is mocked. Its live release and real Auth delivery remain [010](briefs/010-008-canli-yayin-ve-kabul.md).

**Historically deployed, not live-retested by this handoff:**

| Area | Recorded state and source | Limit |
|---|---|---|
| 003/005 | [Tenant isolation](briefs/003-dogrulama.md), [session-bound choir](briefs/005-coklu-uyelik-aktif-koro.md) deployed | Controlled real second membership not implied |
| 006 | [Unauthorized bootstrap/write paths closed](briefs/006-uyelik-yonetimi-guvenlik-kapisi.md) | Owner accepted remaining old-account risk |
| 007 | [Choir-creation DB/Edge deployed](briefs/007-operator-kontrollu-koro-olusturma.md) | Empty operator allow-list; no approved real creation success |
| 009 | [SMTP/return URL and signed reply forwarding accepted](briefs/009-auth-eposta-ve-yanit.md) | Real Auth verification/recovery delivery is not proven by inbound forwarding |

**Prepared/unverified:** native CI job exists but no recorded remote run for this revision;
010 live release not executed; hosting/Drive exit is [separate preparation](altyapi-2026-09-04.md).
Vercel is the historically verified live-web host; Railway preparation is not a completed move.
Repertoire/PDF brief has not started and cannot start before 004 acceptance.

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

The four open product criteria are: **hardware keychain/keystore, real-phone real-account
flow, actual remote CI, and live 010 invitation/membership acceptance**. Emulator success is
not hardware/real-account evidence. Self-review has been performed; no independent review
or receiving-agent test is claimed.

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

Entry: one worktree, `main` at `01ce1f1`, clean; no unrelated or unfinished source edits.
The main agent alone owns this handoff's edits: this file, 004 and relevant memory summaries.
Commit these documentation changes locally with `004`; no code commit is needed. Verify the
new HEAD/status when receiving; the snapshot hash intentionally identifies the pre-handoff tree.

Local `origin/main` was 21 commits behind at entry; no fetch or remote-state verification.
The range includes 008 web/Edge/migration, 009, native/shared code and documentation. The
latest evidence commits are `6d64d16` (native gate) and `01ce1f1` (Android acceptance).
Do not blindly push the accumulated `main` history to obtain a CI result.

## Authority

The user previously authorized local implementation/testing and required local commits for
the documented mobile plan, one brief at a time. The latest request authorizes this handoff
and next-step analysis; it does not start a release. Routine authorized local work does not
need repeated approval, but scope and acceptance restrictions remain.

Still requiring explicit authorization: any push, remote PR/run dispatch, deployment,
production account/data access or changes, live email, spending, and real operator/choir work.
Keep 010 pending. Hardware testing was postponed again; no reminder, scheduled retry or
assumption that it is now due. A proposal in a document is not permission to execute it.

## Next bounded task

**Done, awaiting the owner's decision:** the CI execution-readiness preparation asked for by
the [next-task contract](briefs/004-rn-kabuk-ve-giris.md#next-bounded-task-004-ci-execution-readiness-recommendation-not-execution-authority)
was completed on 7 September at `d9ab194`. The result is the
[CI execution-readiness proposal](briefs/004-rn-kabuk-ve-giris.md#ci-execution-readiness-proposal--7-september-2026),
which is the authoritative record; do not restate or redo it. No remote operation was
performed and no criterion changed.

Its findings in one line each: every route to a remote run needs at least one push, so there
is no zero-write option; a `main` push would publish the 008 invitation UI ahead of its
undeployed migration and Edge function, inverting 010's order; and the `quality` job is
predicted — by analysis, not by a test — to fail at `next build`, because it supplies none of
the Supabase environment that `playwright.config.ts` deliberately supplies to its own build.
Six remote facts stay unknown, the Vercel preview settings among them.

**Next action:** none that an agent may take alone. The proposal ends in a four-step approval
request, the first two steps of which write nothing: a `git fetch` to replace the two-day-old
cached `origin/main`, and an owner-side report of the Vercel and branch-protection settings.
Until the owner answers, this brief is paused with the preparation complete. Do not push,
open a branch or pull request, dispatch a run, or modify hosting.

Acceptance for that preparation, exact relevant files, stop conditions and the actual remote-CI
proof required are in 004. Successful proposal preparation does not change the product table.
If remote authorization remains absent, stop with the proposal complete. 010 is the separate
live route, not an automatic follow-on. Hardware stays deferred. No local-only path closes 004;
repertoire/PDF still waits for all required acceptance evidence.

## Copyable startup prompt

> Work in `/Users/alidiyarduran/Antigravity/genovakorist`. Read `AGENTS.md`, then follow
> `docs/gecis-rehberi.md` and `docs/ai-calisma-duzeni.md` completely, using
> `docs/agent-handoff.md` as the entry point. Do not assume access to earlier conversations.
> Verify branch, HEAD, worktree ownership and applicable evidence. Follow decision #21 and
> preserve MIGRATION's native/WebView boundaries. Brief 004 remains open at 23/27 PASS;
> real-device testing was postponed and must not be raised again as the next action. Keep its
> four unrun criteria intact, keep 010 pending and do not start repertoire/PDF.
> The 004 CI execution-readiness proposal is already prepared and is authoritative — read it,
> do not redo or restate it. Brief 004 is paused on my answer to its four-step approval
> request, so unless I have answered in this conversation, take no action on it: report the
> pending request and stop.
> This prompt grants no push, fetch, remote PR/run dispatch, deployment, production/account/
> data action, email, spending or hardware-test authority. Respect the recorded local-work
> authorization and its limits; do not infer additional permissions. Keep dated evidence and
> self-review honest, update only relevant records, and use Turkish user updates and English
> agent records. A handoff or proposal is not product acceptance.
