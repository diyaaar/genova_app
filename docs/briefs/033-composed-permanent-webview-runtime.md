# 033 — Composed permanent-WebView local Release runtime

Prepared: 2026-09-12. Last executed: 2026-09-13. Status: **IN PROGRESS / REQUIRED
FAILURES OPEN**. Single writer and self-reviewer: main agent; no independent review is claimed.

## Outcome and delivery focus

Run the production-type web build and the real native permanent-WebView shell together on both a
Release iOS simulator and Release Android emulator, proving one synthetic native session through
the challenged embedded lease, every one of the nine permanent web route families, native exits,
session/tenant recovery and the accepted platform-capability lifecycle. This is the final local C1
composition package. It does not prove the hosted origin, a real account, physical hardware,
accessibility on hardware or a store candidate.

## Execution start check

- [x] Read [AGENTS](../../AGENTS.md), [handoff](../agent-handoff.md),
  [migration guide](../gecis-rehberi.md), [work cycle](../ai-calisma-duzeni.md), all six
  `memory-bank/` indexes, [MIGRATION](../../MIGRATION.md), [decisions](../../KARARLAR.md),
  [delivery plan C1](../mobil-teslim-plani.md#c--complete-the-mobile-experience-in-small-user-flows),
  the [bridge contract](../webview-bridge-contract.md) and briefs 030–032 with their current web,
  native and disposable-runtime sources.
- [x] Verified local `main` at `e77f316` with only the pre-existing, unowned
  `supabase/.temp/cli-latest` modification. It remains unstaged and outside 033. The main agent is
  the sole writer; no subagent is used.
- [x] Historical evidence is deliberately not promoted: 030 proved the dormant web peer under
  unit/jsdom/build checks, 031 proved the native shell under unit/build checks, and 032 proved
  platform capabilities in a separate guarded runtime. The peers have never completed their real
  handshake or rendered a tenant page together.
- [x] The owner's continuing direction authorizes local implementation, disposable synthetic
  services, simulator/emulator execution, cleanup and local commits. It does not authorize hosted
  Supabase, real accounts/data, physical devices, push/deploy, remote CI, messages or spending.

## Allowed scope

- `lib/embedded-web-runtime.ts`, `components/EmbeddedWebBridgeProvider.tsx` and focused tests: the
  smallest exact-loopback policy seam required for a production-type 033 web build. Normal builds
  must retain the exact production-origin policy and contain no active local endpoint.
- `apps/mobile/src/ui/AppRoot.tsx`, `apps/mobile/src/webview/NativeWebViewScreen.tsx`,
  `apps/mobile/src/auth/auth-store.ts` and focused tests only if composition exposes a missing
  injectable/configuration, observability or same-user token-refresh continuity seam. The normal
  entry and native ownership contract must remain unchanged.
- `apps/mobile/src/acceptance/` and `apps/mobile/app.json`: a compile-time guarded 033 entry,
  exact local configuration, redacted acceptance tracing and exact Android cleartext-loopback
  resource. Generated `ios/`, `android/`, `.expo/` and build outputs are never committed.
- `supabase/test-support/033_*`: a fail-closed disposable local-stack runner, synthetic fixtures,
  composed runtime driver and cleanup verification. Runtime state belongs only under ignored
  `spike/033-runtime`; secrets and generated evidence do not enter Git.
- This brief, canonical plan/MIGRATION/contract/handoff/memory indexes and a bounded evidence
  record after acceptance. Product code/tests and documentation/evidence use separate commits.

## Required composed topology

- The web peer is a successful Next production build served only from
  `http://127.0.0.1:18033`. It uses only a disposable local Supabase API at
  `http://127.0.0.1:54321` and a dedicated PostgreSQL 17 test copy as schema source. Every runner,
  config reader and Android network plugin refuses any different host, port, project ID, account
  suffix or owned runtime path before creating a client or building the acceptance entry.
- A compile-time acceptance flag may enable the exact local route policy in the web bundle and an
  alternate native entry may supply the exact local runtime config. Neither flag may be read from
  mutable page input, URL/query, persisted storage or a bridge message. Normal exports/builds must
  reject loopback and contain no 033 marker, endpoint, fixture identity or credential.
- Use two disposable synthetic users/roles where role preservation requires it and at least two
  synthetic choirs where tenant isolation requires it. The fixture owns every inserted row/object,
  records a baseline, and deletes only exact IDs/buckets/accounts that it created. Source database
  and hosted state remain read-only.
- Android reaches both loopback ports through explicit `adb reverse`; iOS simulator reaches the
  host loopback directly. A Release build, not Metro/Expo Go/debug mode, must run each platform.

## Required route and feature proof

- Complete the real `bridge.ready` → challenge → acknowledgement → native access lease → web user
  and server-current-choir proof before tenant content becomes visible. Assert that no refresh token,
  access token or fixture password appears in URL, bridge diagnostics, native logs, web logs,
  Web Storage, cookies, service workers, screenshots or committed artifacts.
- Load and identify all nine canonical route families in the same real native WebView boundary:
  `/announcements`, one `/announcements/<uuid>`, `/koristler`, one `/koristler/<uuid>`,
  `/koristler/davetler`, `/profil`, `/profil/duzenle`, `/profil/degisiklikler` and
  `/devamsizlik?date=YYYY-MM-DD`. Preserve current visible loading/empty/error/role states and
  perform representative real reads, mutations, Realtime invalidation and actual-file actions
  rather than proving only route titles.
- Exercise both a privileged admin/chef surface and a chorist-scoped surface. RLS/role refusal must
  stay visible and must not broaden data or enter a renewal loop. Tenant switch must blank before
  transition and the second choir must not observe the first choir's rows, WebView history,
  Realtime subscriptions, query/cache state, file cache or player state.
- From actual page controls/links, prove permanent-web navigation stays embedded; `/` exits to native
  home; `/repertuvar` exits to the existing native repertoire route; unavailable `/chat` and
  `/odevler` fail visibly without loading web; safe HTTPS requires native confirmation; HTTP,
  custom scheme, popup, credential-bearing and unknown same-origin navigation remain denied.
- Exercise header and platform back inside allowlisted web history and at its root. The first goes
  back only within permanent web history; the second exits to the recorded native route. A reload
  and one renderer restart must create a new locked instance and repeat proof before showing data.
- Trigger the accepted 032 capabilities from their real embedded page seams: native theme request,
  native password sheet (validation plus successful disposable-account change and restoration),
  exact invitation clipboard write, one constrained image selection/upload with cancellation or
  refusal coverage, and one protected PDF view/download with exact bytes, expiry/unauthorized
  refusal and ephemeral cleanup. No camera/microphone/broad-media permission may be added.
- Force near-expiry/renewal and first authenticated 401. New mutations freeze, one renewal is
  coalesced and the server-current choir is reproved. A second 401 or failed renewal clears the
  instance. Sign-out must cover/clear before native Auth completes and leave no credential,
  protected file, tenant cache, service worker, cookie or WebView history behind.

## Scope exclusions

- No hosted Supabase/Edge/Storage, provider console, real user/data, production domain or network
  request, physical device, push notification, background process, VoiceOver/TalkBack claim,
  remote CI, push/deploy, release signing, publication, spending or external message.
- No native rewrite of the permanent pages; no new product API/Edge endpoint merely for 033; no
  schema migration and no source-database mutation. The disposable runner may copy the current
  schema/functions into its isolated stack and add synthetic rows there.
- No broad UI cleanup, package upgrade, audit-force fix or unrelated refactor. Existing 004 hardware
  and 010 live-provider criteria remain open regardless of 033 results.

## Risk, authority and rollback

- Highest risks are accidentally enabling local cleartext in a normal build, leaking a credential
  into a bundle/log/URL, falsely accepting page routing without feature composition, cross-tenant
  state retention, and cleanup deleting non-owned data. Exact config guards, source/baseline hashes,
  tracked fixture IDs and post-cleanup scans are mandatory.
- If the disposable source copy, two-platform Release runtime, exact real-page capability trigger or
  cleanup cannot be proven, keep the affected required row `FAIL` or `NOT RUN`; do not replace it
  with unit or browser evidence.
- Roll back the product/test commit(s), then the planning/record commit(s). Runtime rollback is exact
  uninstall, simulator/emulator shutdown, reverse-port removal, local server/stack stop, fixture
  deletion and removal of ignored 033/generated native/build directories. Git revert is not runtime
  cleanup.

## Small implementation sequence

1. Add and unit-test the exact 033 web/native/runtime guards and any smallest injection seam; prove
   normal builds remain production-only before starting a local stack.
2. Build the fail-closed disposable stack/fixture/driver, verify source read-only and target baseline,
   then build the production-type web peer and both guarded Release native binaries.
3. Run the composed scenarios on iOS and Android, collect redacted machine-readable evidence, inspect
   logs/bundles/permissions/caches and rerun the root/mobile gates plus normal builds.
4. Tear down every 033 process, device, reverse, fixture, stack and generated directory; verify exact
   cleanup and source/target baselines before recording acceptance.
5. Review the diff against this brief, record PASS/FAIL/NOT RUN without self-scoring overrides, commit
   product/tests separately from evidence/status, and select the next ready plan package.

## Definition of done

- [x] Exact guards refuse hosted/non-loopback endpoints, non-synthetic identities, wrong project,
  wrong paths and missing flags; normal build/export contains no 033 marker or local endpoint.
- [ ] Both exact Release runtimes complete the challenged composed handshake and render every one of
  the nine route families with required role/read/write/Realtime/file evidence.
- [ ] Native route/external/back/theme/password/clipboard/image/protected-file boundaries complete
  from real embedded page actions, including the named refusal and cleanup cases.
- [ ] Renewal, first/second 401, reload, renderer restart, tenant switch and sign-out prove blanking,
  reproof, bounded failure and zero old-tenant credential/cache/history retention.
- [x] Local fixture/stack/source integrity and all runtime/generated-artifact cleanup checks pass.
- [ ] Root `pnpm check`; mobile `npm run check`; normal iOS/Android exports; Expo Doctor; guarded and
  normal exact Release builds; bundle/permission/secret scans all pass or remain explicit required
  failures.
- [x] Transition start/delivery checks, diff/scope review and canonical records are current; the only
  unrelated worktree entry remains unstaged.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 033 open. Review is self-review unless an independent review is
actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Exact local guards and normal-build isolation refuse every unowned endpoint/path/identity and exclude local flags, endpoints, credentials and cleartext policy from normal artifacts | yes | **PASS** | 2026-09-13, `d295c62`; config/plugin/unit suites; unflagged Expo exports and prebuild inspection | iOS HBC `2bcaa6825fcef34b7c5346a73ee43c7f363bda4511d7a92c4a8a150d8b8978cc`, Android HBC `91797b86d21cce5e89131bf6f52ea13d4214d33630ac504eb56c06c420c8c894`; neither bundle contained a 033 marker, loopback endpoint or synthetic identity. Normal Android manifest had no network-security/cleartext widening and removal directives for camera, microphone and broad media; iOS ATS was `false` with no camera/microphone usage text. |
| Production-type web build and actual native shell complete the challenged lease plus server-current user/choir/member proof before tenant render on Release iOS simulator | yes | **PASS** | 2026-09-13, Release iOS 26.5 simulator `genova033-ios`, production Next peer on exact loopback | The real permanent WebView completed the challenge/acknowledgement/lease and server-current tenant proof before rendering. This is simulator evidence only, not hardware or hosted-origin evidence. |
| The same composed handshake/proof completes on Release Android emulator through exact reverse ports | yes | **PASS** | 2026-09-13, Release Android API 36 emulator, exact `adb reverse` for 18033/54321 | The real shell and production-type web peer completed the challenged lease and tenant proof. Reverse rules and app were later removed. |
| All nine permanent route families render and preserve representative real reads, role variants, mutations, Realtime invalidation, visible errors and actual-file behavior on both platforms | yes | **FAIL** | 2026-09-13 composed run | Both platforms rendered all nine families; Android additionally covered representative reads, mutation/Realtime, role refusal and actual-file behavior. iOS route, tenant and role evidence exists, but the full mutation/Realtime/actual-file set was not completed there. Route visibility is not promoted to the missing feature proof. |
| Permanent navigation, native home/repertoire exits, unavailable native routes, HTTPS confirmation, denied URL classes, web-history back and root exit behave fail closed on both platforms | yes | **PASS** | 2026-09-13, Android UI driver plus isolated iOS XCUITest navigation case | Android hardware/header back and iOS header back stayed inside web history first and exited at root; native home/repertoire, unavailable chat/homework, confirmed/cancelled HTTPS and denied HTTP/custom/unknown/popup paths behaved as required. XCUITest is simulator evidence, not accessibility certification. |
| Real embedded page controls trigger theme, native password sheet, exact invitation clipboard, constrained image input/upload and protected PDF action; refusal/cancel/expiry/cleanup cases pass | yes | **FAIL** | 2026-09-13 composed run | Android completed the disposable password change/restore, clipboard, constrained image cancellation and exact-byte protected PDF/expiry/cleanup scenarios. iOS proved theme, native password validation, photo-picker cancellation and protected-file confirmation cancellation, but not successful password change/restore or exact-byte PDF open. |
| Near-expiry, first/second 401, reload, renderer restart, tenant switch and sign-out prove bounded renewal/reproof plus old-epoch/cache/history/credential cleanup | yes | **FAIL** | 2026-09-13 composed run | Android completed renewal, one 401 recovery, terminal failed renewal/sign-out, reload and cleanup. iOS completed reload, tenant switch and real WebContent termination with the fail-closed retry screen; retry-to-new-proof, 401 sequence and sign-out could not be activated reliably through the temporary UI harness and remain unproved. The sign-out ordering seam was corrected and unit-tested but is not substituted for iOS runtime evidence. |
| Disposable fixture ownership, source read-only hash, target baseline restoration, app/process/reverse/device/stack shutdown and generated-directory cleanup pass | yes | **PASS** | 2026-09-13, runner cleanup plus exact post-cleanup inventory | Fixture cleanup reported target baseline restored and the source snapshot matched before stack removal. Ports 18033/54321, app/device/reverse state, `spike/033-runtime`, generated mobile/build directories, Colima profile/context and its orphaned 5.8 GB disk were absent afterward. The runner's already-deleted temp-dir exit-hook defect was fixed in `d295c62` and its focused regression check passed; no second runtime was created merely to replay cleanup. |
| Root/mobile gates, normal exports, Expo Doctor, guarded and normal exact Release builds, permission/secret/bundle scans and `git diff --check` pass | yes | **NOT RUN** | 2026-09-13, `pnpm check`; mobile `npm run check`; Expo Doctor; normal exports/prebuild/iOS Release | Root: 55 files/466 tests and production build PASS. Mobile: 32 suites/178 tests PASS. Expo Doctor 21/21; normal iOS/Android exports, manifests, iOS Release and scans PASS. Guarded iOS/Android Release builds ran in the composed session. A current-source normal Android Release rebuild is NOT RUN because the temporary JDK was removed and no persistent JDK is installed; export/manifest evidence does not replace it. |
| Diff review finds no scope expansion or hidden weakening; repository records retain 004/010, hosted, hardware, accessibility, CI and publication boundaries | yes | **PASS** | 2026-09-13 self-review at `d295c62`; `git diff --check` | Changes are confined to the brief's guard, bridge continuity, acceptance runtime and disposable runner seams. `supabase/.temp/cli-latest` remains unstaged. 004 hardware, 010 live-provider, hosted-origin, CI, accessibility and publication evidence remain explicitly open. No independent review is claimed. |

## Delivery

- Product/test implementation: `d295c62` (`033: add composed permanent WebView runtime`). It adds
  exact compile-time loopback guards, a disposable composed entry/fixture/driver, early bootstrap
  injection, protected-file origin scoping, same-user token-refresh continuity and sign-out ordering.
- The local composed run materially proved both Release handshakes, all route families and the full
  Android scenario set, but required iOS feature/fault coverage and the current-source normal Android
  Release rebuild remain open above. Therefore 033 is not closed and the plan must not advance as if
  C1 composition were accepted.
- Every 033 runtime artifact has been removed. The next bounded execution must recreate an exact
  disposable runtime only when it is ready to finish the missing iOS rows, and must clean it again.
  A persistent or separately authorized JDK is required before the missing normal Android Release
  rebuild can be recorded. Hosted, physical-device, CI, accessibility and publication scopes remain
  unrun and unauthorized.
