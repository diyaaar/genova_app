# 033 — Composed permanent-WebView local Release runtime

Prepared: 2026-09-12. Runtime last attempted: 2026-09-15; checkpoint, cleanup and mobile repair verified
2026-09-18 under WF-007 controls. Status: **IN PROGRESS / REQUIRED
FAILURES OPEN**. Single writer and self-reviewer: main agent; no independent review is claimed.

## Current checkpoint — 18 September 2026

This checkpoint supersedes the current-state statements in the dated sections below.
Entry: `main / 61c7ae2`; owned unfinished changes were the three ephemeral-storage acceptance
files from the interrupted run. `supabase/.temp/cli-latest` is unrelated and remains unstaged.
Read AGENTS, handoff, active context, this brief, plan controls, migration guide/work cycle,
and the relevant MIGRATION and AuthStore/provider/UI sources. No independent reviewer.

**Active result:** recover from the reproduced native session-storage startup error without
remaining on the loading screen or replacing the product's secure session storage.
Allowed paths: `apps/mobile/src/auth/auth-store.ts`, `types.ts`, their tests,
`apps/mobile/src/ui/AppRoot.tsx` and its existing tests; remove the owned ephemeral acceptance
workaround and expose the same error/retry in the existing 033 acceptance entry. No new dependency.
Up to three actions: (1) clean owned runtime and discard the substitute storage path;
(2) reproduce and fix startup rejection/retry with focused regressions and the mobile gate;
(3) record limits and identify the next genuine SecureStore Release check within measured disk limits.
Exit: visible generic error, tenant content/leases refused, explicit retry uses the real session
gateway, stale startup completion cannot revive a stopped/signed-out store. Runtime acceptance
stays open until the real SecureStore/platform scenarios pass; unit tests do not close C1.

**Cleanup receipt (18 September):** available disk started at 5,283,452 KiB. Owned allocation:
runtime 98,956 KiB, generated iOS 633,748 KiB, `.next` 472,116 KiB, Colima instance 1,469,184 KiB,
VM data 6,084,748 KiB, simulator 3,194,840 KiB. Stopped/deleted only simulator
`22BE7D41-9071-46AD-A91F-67FB7E50A86C`, ignored/untracked iOS and web outputs.
Reconnected an exact loopback tunnel solely to clean the already-running disposable stack.
Existing runner returned `PASS fixture_cleanup target_baseline=restored` and
`PASS runtime_cleanup stack=stopped path=removed`; its source-hash equality gate passed.
Stopped the tunnel and deleted the exact `genova033` profile/data with the supported CLI.
All listed paths, Docker context and listeners 18033/18034/54321/54322 are now absent.
Available disk after cleanup: 20,016,892 KiB (19.1 GiB); other applications can change this.
Deleted outputs are reproducible, not Trash-recoverable; source DB and working dependencies remain.

**Evidence review of the interrupted 15 September run:** `61c7ae2` committed exact loopback
tunnelling, redacted stack startup and Edge-container recovery. Actual single-use credential
delivery and local Auth succeeded for both synthetic roles using the native HTTP header shape.
Node fetch's browser-style `sec-fetch-*` header was correctly refused. The genuine fixture-backed
iOS export excluded both passwords (SHA-256
`c9714ebfa25b7a5488a26ded03a45c5ed9c0a6c9badde300fdc147ef7aef781f`); the original Release bundle
scan also passed (`69b0cd9f81b8c6390ca5c700cbf76fd62385f10f8cfbd3defb97f2cf204f6d82`).
The unsigned simulator Release then failed SecureStore with `ERR_KEY_CHAIN` / missing entitlement.
Two manually supplied entitlement variants failed launch; ad-hoc without entitlements launched
but kept the same storage failure. Do not repeat these approaches or manually patch build outputs.
The later in-memory session substitute and manually replaced JS bundle rendered the WebView but
are diagnostic evidence only, not product SecureStore/session-lifecycle acceptance. Discard that
uncommitted workaround. Native UI clicks worked; WebView scrolling/keyboard attempts did not prove
the missing feature cases. Read the documented UI API before another interaction attempt.
The build's peak crossed the disk floor (10,167,244 KiB available); deleting DerivedData immediately
restored headroom. A future build needs a measured larger reserve and in-build monitoring.

**Bounded repair completed at `5a9fb8f` (18 September):** restored the real acceptance client
and removed the uncommitted in-memory storage files. Session reads now contain both rejected
promises and returned errors, expose a generic message, deny tenant rendering/leases and retry
the same real gateway explicitly. A startup generation invalidates delayed reads after stop or
sign-out. Product and 033 UI expose retry; no SecureStore implementation/dependency was changed.

| Repair criterion | Required | Result | Evidence / boundary |
|---|---|---|---|
| Reproduce the loading failure and late-read revival before fixing | yes | PASS | 18 September: new focused suite had 5 failures/35 passes on original code; UI stayed at `loading-screen`, storage rejection escaped, and delayed reads revived stopped/signed-out state |
| Generic error, refused lease, explicit gateway retry and stale-read invalidation | yes | PASS | New AuthStore regressions; returned error with session data is also refused; retry registers exactly one listener |
| Actual product UI shows error/retry before tenant content | yes | PASS | AppRoot renderer regression: private diagnostic absent, no shell on error, retry restores server-confirmed fixture choir; mocked renderer, not native runtime |
| Required mobile source gate | yes | PASS | `npx tsc --noEmit && npm test -- --runInBand`: 33 suites/194 tests, exit 0; existing SafeAreaView/punycode/npm-config warnings remain |
| Real SecureStore in current signed Release and remaining composed rows | yes | NOT RUN | No native build, simulator or disposable server was created for this repair; C1 remains open |

**Next active result:** genuine SecureStore startup in a Release simulator app, without memory
fallback or manual bundle replacement. Up to three actions: (1) size the native-only build phase
and verify the generated Xcode signing settings; (2) build with Xcode's simulator signing enabled,
inspect resulting entitlements and run actual storage startup; (3) retain only the proved app for
the next composed check if its combined resource budget passes, otherwise remove owned outputs.
The installed Expo CLI's `run/ios/XcodeBuild.js` does not disable simulator signing; SecureStore's
installed config plugin does not add custom iOS keychain entitlements. This supports changing the
previous `CODE_SIGNING_ALLOWED=NO` approach, not claiming a successful new runtime.
Preflight: 19,906,236 KiB free before lightweight tests, 19,888,764 KiB after. Existing `.expo`
is 12 KiB; no download/build/runtime allocation occurred. Historical VM+simulator+web+runtime+iOS
allocation totals 11,953,592 KiB, exceeding the current ~9.0 GiB usable headroom even before a
native build. Therefore do not recreate them together. A build-only peak and later reduced
runtime peak must each be demonstrated to fit; unknown size is not permission to allocate.
Root gates/exports were not rerun for this mobile-only repair. No push, deploy, live data or
physical-device operation occurred. Self-review only; 004/010 and every required 033 row remain.
Documentation validation: 144 local file links across the six changed records resolved;
current checkpoint anchors and state boundaries were reviewed, and `git diff --check` passed.
The handoff is 77 lines and active context 40; unrelated CLI cache remains unstaged.

## Historical checkpoint — 15 September 2026

This checkpoint supersedes stale current-state claims below; dated historical results remain.
Product revision is `ec5b19a`. The credential repair is committed: no fixture password is a public
build variable, and the acceptance app requests one selected synthetic identity from the exact
single-use `127.0.0.1:18034/credentials` process. The server reads only the mode-0600 owned fixture,
binds loopback, rejects browser/wrong-host/wrong-identity requests, atomically consumes one success,
closes after delivery or expiry and logs no credential. Native code passes the returned password
directly to Auth without retaining it in component state; abort, sign-out and generic-error paths
remain fail closed.

Before cleanup, a boolean-only scan confirmed literal synthetic password assignments for both
033 password variables in the local iOS acceptance bundle (SHA-256
`3a8a33b23ae4b91c29221604fd14e0dd0ab82483fb455feb0990c2013a592e03`).
The earlier general secret-scan PASS cannot support current acceptance. Normal-build isolation
is separate historical evidence; no hosted credential exposure is established by this finding.
A client anon/publishable key is not a password or service-role secret; classify scan findings
by sensitivity as well as the acceptance build's explicit isolation contract. Never print values.

**Next bounded result:** validate the repaired channel against the real disposable fixture and
guarded Release app, then finish only the still-missing/invalidated 033 rows.
Up to three next actions:
1. Recreate one owned local stack/fixture after a fresh disk/tool inventory; exercise the actual
   one-use server and scan the real guarded bundle without printing fixture values.
2. Run the missing iOS feature/fault scenarios, using semantic controls and rearming the tiny
   credential process before each new identity. Do not replay already-valid navigation evidence.
3. Run the required current normal Android Release plus only invalidated Android credential/sign-out
   checks, then capture cleanup/source-baseline proof and remove every owned output.

Failed approaches to preserve: unreliable text/coordinate iOS activation -> semantic sign-out
label fixed at `692b286`; recreated runtime then exposed public-build passwords -> incomplete
credential-channel repair. Do not repeat UI attempts or rebuild the stack before that repair.

**Resource checkpoint:** [WF-007](WF-007-bounded-execution-and-disk-budget.md) cleaned the
recreated runtime, target fixtures, generated iOS/web outputs, exact simulator, Colima profile,
data disk and Docker context. Source/target baselines passed; ports 18033/18034/54321 closed.
Free space measured 23.5 GiB after the repair gates and their generated outputs were cleaned. No
runtime is retained. Before recreation, inventory
all internal/external artifacts and estimated peak use against the plan's 10 GiB free-space floor.
The next normal Android Release needs an available compatible JDK within that resource/authority
scope; a permanent installation is not itself an acceptance requirement.

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
- Android reaches all three loopback ports through explicit `adb reverse`; iOS simulator reaches the
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
- [x] Credential-repair product diff/gates and canonical records are current at `ec5b19a`;
  only the unrelated CLI cache remains unstaged at this checkpoint.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 033 open. Review is self-review unless an independent review is
actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Exact local guards and normal-build isolation refuse every unowned endpoint/path/identity and exclude local flags, endpoints, credentials and cleartext policy from normal artifacts | yes | **PASS** | 2026-09-15, `ec5b19a`; config/client/plugin and single-use server tests; fresh unflagged iOS/Android exports | 24 focused mobile cases and four server cases passed, including concurrent one-use, wrong identity, hosted/path/host/browser and abort/error refusals. Fresh normal iOS HBC `7b5bee531df7522ffcf35c15f447af23e55052b755ba469acdad90280f8e6876` and Android HBC `6f028b0fd0998dacc962c066f381c2641637839948547c3b3c684038d2011226` contained no 033 marker, local endpoint or synthetic identity. Historical manifest/permission inspection remains applicable; current prebuild/Release inspection is still required below. |
| Production-type web build and actual native shell complete the challenged lease plus server-current user/choir/member proof before tenant render on Release iOS simulator | yes | **PASS** | 2026-09-13, Release iOS 26.5 simulator `genova033-ios`, production Next peer on exact loopback | The real permanent WebView completed the challenge/acknowledgement/lease and server-current tenant proof before rendering. This is simulator evidence only, not hardware or hosted-origin evidence. |
| The same composed handshake/proof completes on Release Android emulator through exact reverse ports | yes | **PASS** | 2026-09-13, Release Android API 36 emulator, exact `adb reverse` for 18033/54321 | The real shell and production-type web peer completed the challenged lease and tenant proof. Reverse rules and app were later removed. |
| All nine permanent route families render and preserve representative real reads, role variants, mutations, Realtime invalidation, visible errors and actual-file behavior on both platforms | yes | **FAIL** | 2026-09-13 composed run | Both platforms rendered all nine families; Android additionally covered representative reads, mutation/Realtime, role refusal and actual-file behavior. iOS route, tenant and role evidence exists, but the full mutation/Realtime/actual-file set was not completed there. Route visibility is not promoted to the missing feature proof. |
| Permanent navigation, native home/repertoire exits, unavailable native routes, HTTPS confirmation, denied URL classes, web-history back and root exit behave fail closed on both platforms | yes | **PASS** | 2026-09-13, Android UI driver plus isolated iOS XCUITest navigation case | Android hardware/header back and iOS header back stayed inside web history first and exited at root; native home/repertoire, unavailable chat/homework, confirmed/cancelled HTTPS and denied HTTP/custom/unknown/popup paths behaved as required. XCUITest is simulator evidence, not accessibility certification. |
| Real embedded page controls trigger theme, native password sheet, exact invitation clipboard, constrained image input/upload and protected PDF action; refusal/cancel/expiry/cleanup cases pass | yes | **FAIL** | 2026-09-13 composed run | Android completed the disposable password change/restore, clipboard, constrained image cancellation and exact-byte protected PDF/expiry/cleanup scenarios. iOS proved theme, native password validation, photo-picker cancellation and protected-file confirmation cancellation, but not successful password change/restore or exact-byte PDF open. |
| Near-expiry, first/second 401, reload, renderer restart, tenant switch and sign-out prove bounded renewal/reproof plus old-epoch/cache/history/credential cleanup | yes | **FAIL** | 2026-09-13 composed run | Android completed renewal, one 401 recovery, terminal failed renewal/sign-out, reload and cleanup. iOS completed reload, tenant switch and real WebContent termination with the fail-closed retry screen; retry-to-new-proof, 401 sequence and sign-out could not be activated reliably through the temporary UI harness and remain unproved. The sign-out ordering seam was corrected and unit-tested but is not substituted for iOS runtime evidence. |
| Disposable fixture ownership, source read-only hash, target baseline restoration, app/process/reverse/device/stack shutdown and generated-directory cleanup pass | yes | **PASS** | 2026-09-15, existing 033 cleanup runner and exact post-cleanup inventory; earlier 2026-09-13 cleanup was followed by recreation | Target baseline restored, source snapshot matched, stack/runtime removed; generated iOS/web outputs, exact simulator, Colima profile/data/context absent; ports 18033/18034/54321 closed. Free space 23.6 GiB. WF-007 owns the detailed receipt. No new runtime was created for this cleanup. |
| Root/mobile gates, normal exports, Expo Doctor, guarded and normal exact Release builds, permission/secret/bundle scans and `git diff --check` pass | yes | **FAIL** | 2026-09-15, repair revision `ec5b19a`; historical runtime gates on 2026-09-13 | Mobile passed 33 suites/189 tests plus typecheck; root `pnpm check` passed 55 files/467 tests, coverage, service-worker syntax and production build. Fresh normal iOS/Android exports passed isolation scans. A guarded source-check iOS HBC (`c926fd5dd9e33f8a54912580d672872ca62bc913ba024d5954fb1c26f26d420d`) contained the exact credential endpoint and neither obsolete password variable nor test credential. This does not replace a real fixture-backed guarded bundle scan. Expo Doctor, current guarded Releases and required normal Android Release remain NOT RUN, so this required row stays FAIL. |
| Diff review finds no scope expansion or hidden weakening; repository records retain 004/010, hosted, hardware, accessibility, CI and publication boundaries | yes | **PASS** | 2026-09-15 self-review at `ec5b19a`; affected/full gates and `git diff --check` | The repair is confined to 033 acceptance config/runtime/tests and its existing fixture/runner/Android driver. It adds no dependency, schema, hosted endpoint or general framework. `supabase/.temp/cli-latest` remains unstaged. 004 hardware, 010 live-provider, hosted-origin, CI, accessibility and publication evidence remain explicitly open. No independent review is claimed. |

## Delivery

- Product/test implementation: `d295c62` (`033: add composed permanent WebView runtime`). It adds
  exact compile-time loopback guards, a disposable composed entry/fixture/driver, early bootstrap
  injection, protected-file origin scoping, same-user token-refresh continuity and sign-out ordering.
- Credential correction: `ec5b19a` (`033: replace bundled acceptance passwords`). It replaces the
  two public password variables with an exact, expiring, single-use loopback delivery and a visible
  rearm/retry path. Source, unit, root and normal-export gates above passed; no runtime result is
  inferred from them.
- The local composed run materially proved both Release handshakes, all route families and the full
  Android scenario set, but required iOS feature/fault coverage and the current-source normal Android
  Release rebuild remain open above. Therefore 033 is not closed and the plan must not advance as if
  C1 composition were accepted.
- The 15 September cleanup removed the recreated owned runtime; the correction's `.next`, coverage
  and Expo export outputs were also removed. Apply the resource preflight before runtime recreation,
  then run only the missing or invalidated rows listed in the current work card. The normal
  Android Release needs a compatible available JDK; permanence is not a gate. Hosted,
  physical-device, CI, accessibility and publication scopes remain separately gated.
