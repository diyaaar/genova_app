# 031 — Native permanent-WebView shell

Prepared and accepted locally: 2026-09-11. Status: **LOCALLY ACCEPTED** at product code/test
revision `0217ac8`. Single writer and reviewer: main agent; no independent review is claimed.

## Outcome and delivery focus

Install the Expo 57-compatible WebView and add one native shell that mounts only canonical permanent
web routes after native validation, completes the version 1 challenge with the current native session
and server-confirmed active choir, and owns route/external/back/theme handling with redacted
diagnostics. The shell must remain locked or visibly failed until the web peer proves the lease.

This closes only the locally built **native half** of the C1 bridge. It does not prove a composed web
runtime, hosted origin/CSP, real account/provider, sensitive password/clipboard/file capabilities,
simulator/emulator behavior or hardware behavior. Those stay in 032, 033 and hosted/device acceptance.

## Starting evidence

- Work starts from local `main` at 030 record commit `dd57229`; the only observed unrelated change is
  the pre-existing `supabase/.temp/cli-latest`, which remains unowned and unstaged.
- [The permanent-WebView contract](../webview-bridge-contract.md) fixes the v1 envelope, route matrix,
  native refresh-token ownership, challenge order, tenant clearing, failure behavior and split into
  packages 029–033. [029](029-permanent-webview-policy-core.md) accepted the shared parser/guard at
  `4289da4`; [030](030-web-embedded-adapter.md) accepted the dormant web peer at `c7d09d3`.
- Native `AuthStore` exposes data only after a server-current membership is resolved and already clears
  tenant caches before identity/choir/sign-out transitions. Its current auth surface reads sessions but
  does not yet expose a serialized near-expiry refresh/lease operation.
- `AppRoot` currently owns a small authenticated `home | repertoire | audio` state machine. Home and
  repertoire are implemented native destinations; chat and assignments remain unavailable. There is
  no WebView screen, route entry, dependency, native theme preference or external confirmation yet.
- Expo SDK 57's current official WebView page recommends `react-native-webview` **13.16.1** and its
  bundled-module manifest agrees. The tagged package declares React and React Native wildcard peers.
  The tagged reference documents `injectedJavaScriptObject`, string-only messaging, navigation/error/
  process callbacks, `incognito` and ref commands; it explicitly says Android does not invoke
  `onShouldStartLoadWithRequest` for the initial load.
- A cryptographically random instance/message/challenge source is required. Expo SDK 57 bundles
  `expo-crypto ~57.0.2`; it may be installed only for this bounded native bridge purpose.

## Allowed files and ownership

- `apps/mobile/package.json` and `apps/mobile/package-lock.json` — exact Expo-compatible WebView and,
  if used, Expo Crypto dependencies only.
- `apps/mobile/src/webview/` and focused tests — environment/initial-route policy, CSPRNG identifiers,
  framework-free native state machine, native WebView component, theme preference and redacted logs.
- `apps/mobile/src/auth/types.ts`, `auth-store.ts`, `AuthProvider.tsx`, test doubles and focused tests —
  one serialized bridge-lease read/refresh operation bound to the ready user/current membership.
- `apps/mobile/src/ui/AppRoot.tsx`, `ShellScreen.tsx`, `theme.ts` and focused tests — web-owned entries,
  native route exits and one authenticated WebView shell. Existing repertoire/audio behavior remains.
- `apps/mobile/src/test/setup.ts` — a WebView test double only.
- This brief for dated evidence. After the product commit, only canonical status/evidence documents
  required by the delivery workflow may change in the separate record commit.

No root web adapter/shared contract, database, migration, Edge Function, Storage, native manifest
permission, generated `ios/` or `android/`, deployment or provider file is allowed in this package.

## Sources and existing patterns

- `AGENTS.md`, [transition guide](../gecis-rehberi.md), `docs/ai-calisma-duzeni.md`, the six
  `memory-bank/` summaries, `MIGRATION.md`, `KARARLAR.md` and
  [mobile delivery plan](../mobil-teslim-plani.md) — authority, order and evidence rules.
- [028](028-permanent-webview-bridge-inventory.md),
  [bridge contract](../webview-bridge-contract.md), [029](029-permanent-webview-policy-core.md) and
  [030](030-web-embedded-adapter.md) — exact C1 ownership, protocol and accepted peer behavior.
- `apps/mobile/src/auth/`, `apps/mobile/src/ui/AppRoot.tsx`, `ShellScreen.tsx`, tenant-cache registry and
  existing tests — session/current-choir ownership, transition ordering and native route patterns.
- Official Expo SDK 57 WebView reference:
  <https://docs.expo.dev/versions/v57.0.0/sdk/webview/>; tagged React Native WebView 13.16.1
  [reference](https://github.com/react-native-webview/react-native-webview/blob/v13.16.1/docs/Reference.md),
  [guide](https://github.com/react-native-webview/react-native-webview/blob/v13.16.1/docs/Guide.md) and
  [package](https://github.com/react-native-webview/react-native-webview/blob/v13.16.1/package.json).
- Native UI rules retained from the selected design guidance: nonblank locked/error states, explicit
  retry/close, semantic labels/states, 48-point Android-safe targets, visible focus/pressed state and no
  motion-only feedback. Manual assistive-technology proof remains out of scope.

## Migration start check

- Read instructions/evidence: the sources above and current mobile package, auth, shell, bridge tests,
  release-gate records and installed Expo bundled-module manifest.
- Single verifiable result: locally compiled **native permanent-WebView shell** only. Web continues to
  own the nine permanent route families; native owns session refresh, active choir, outer controls and
  currently implemented home/repertoire routes.
- Preserved behavior/contract: existing sign-in/current-choir gate, tenant clearing, native repertoire,
  PDF/audio and compact player; no refresh token/password/file byte/invitation token may cross or be
  logged. The accepted 029 schemas and 030 web peer are not changed.
- Authority/files/writer: continuing local implementation request covers reversible dependencies,
  code, tests and commits. Main agent is sole writer. No live Supabase, hosted web, real account/data,
  system external launch during acceptance, sensitive platform capability, push, deploy, CI, hardware,
  spend or message authority is inferred.
- Tests/rollback/open limits: focused Jest plus full mobile check, both platform exports, Expo Doctor,
  generated-project inspection and exact local iOS/Android Release compilation. Revert the product
  commit to remove the shell/dependencies. Composed WebView, hosted CSP/provider, simulator/emulator,
  hardware, accessibility and 032 capabilities remain NOT RUN.

## Required architecture and invariants

1. **Validate before mount.** Production origin is exactly `https://app.genesinovachoir.com`; a
   loopback origin is accepted only from an explicit development configuration and is impossible in a
   release path. The initial absolute URL must be a canonical web-owned route before `WebView` exists.
2. **Secret-free container.** `injectedJavaScriptObject` contains only channel, fresh instance ID and
   monotonically advanced tenant epoch. Source URL/headers, cookies, bootstrap, diagnostics and theme
   state contain no access/refresh token or tenant identifiers. Incognito/nonshared storage is enabled;
   release debugging, popups, mixed content and file-origin access are disabled.
3. **Ordered handshake.** One valid same-source `bridge.ready` gets one fresh challenge. Only its exact
   one-time acknowledgement may trigger a native lease. Native serializes session refresh when missing
   or near expiry, rechecks ready user/current member and sends only access token, expiry, user, choir
   and member. Refresh token never leaves the native Supabase client.
4. **Epoch-safe lifecycle.** Every instance/retry/identity/choir/sign-out/process transition invalidates
   queued work. Native covers the WebView before sending clear; stale refreshes/messages cannot revive
   it. Renewal is coalesced and must yield a newer valid lease; missing/mismatched session, timeout,
   repeated invalid input or process failure ends in a bounded visible state.
5. **One route policy everywhere.** Initial source, message source, navigation request, navigation-state
   callback and popup target all use the shared parser. Permanent routes remain inside. Home/repertoire
   exit to the existing native shell; chat/assignments return `route-unavailable`. Unknown, auth,
   noncanonical, scheme/port/credential-bearing and denied external destinations never load.
6. **Native outer navigation.** Header/hardware back calls web `goBack` only after a current-epoch
   `navigation.state` says the accepted permanent history can go back; otherwise it returns to native.
   iOS browser gestures stay disabled until composed runtime acceptance proves the history boundary.
7. **External confirmation.** An accepted HTTPS external target is stopped, reduced to a normalized
   host in an accessible native confirmation, and opened only after the user's explicit action. Tests
   inject the launcher; they do not contact a system browser.
8. **Theme and deferred commands.** Native persists `light | dark | system`, resolves system changes,
   styles its own WebView chrome and sends `theme.apply` only after web readiness. Password, invitation
   clipboard and file requests return stable `capability-unavailable` results until 032; no partial side
   effect or payload logging occurs.
9. **Redacted evidence.** Diagnostics pass through the 029 allowlist and contain only direction, type,
   outcome, reason code and route family. UI copy never echoes raw URL/query, IDs, token or provider
   error.

## Out of scope

- Changing the web adapter or shared protocol; adding a second refresh owner; WebView cookies/session
  persistence; sending secrets through URLs, headers, injection, logs or analytics.
- Native password form, gallery/camera picker, invitation clipboard, protected file view/download or
  platform permission changes. These belong to 032; camera remains disabled.
- Serving/composing the web build, feature acceptance across all nine route families, hosted CSP,
  deployment, push/CI, production provider/account/RLS or real external launch.
- Simulator/emulator runtime, keyboard, VoiceOver/TalkBack, process-death runtime and hardware proof;
  033 and hosted/device acceptance own these layers.
- Rewriting any permanent route in native, implementing chat/assignments/home features, changing
  repertoire/audio/PDF meaning or broad native-theme refactoring outside the WebView chrome.

## Risk, authority and rollback

- Highest risks are leaking a refresh token, trusting a message source without route validation,
  navigation escape on Android's unobserved initial request, stale refresh completion across choir
  change, and presenting a successful compile as actual WebView runtime proof.
- Three invalid messages, a handshake timeout, a non-new renewal, a renderer termination or a session/
  tenant mismatch closes the instance visibly. One explicit retry creates a fresh instance/epoch; a
  repeated build/test failure triggers diagnosis rather than relaxed checks.
- Rollback order is the later 031 code/test commit, then this planning commit. Revert removes the route
  entries, native shell and dependencies; generated native projects are never committed.
- Any need for hosted changes, real data/account, sensitive platform access or hardware stops only that
  dependent layer and remains NOT RUN.

## Small implementation steps

1. Add pure failing tests for initial/dev/release policy, state-machine order, replay/source/epoch
   rejection, coalesced lease refresh, clear races, redacted diagnostics and route decisions.
2. Install exact Expo-selected dependencies and implement the session-bound lease method plus
   framework-free controller. Verify actual installed types before wiring the component.
3. Build the nonpersistent WebView shell, accessible chrome/recovery/external confirmation and
   theme/deferred command handlers; integrate bounded web entries with the existing native shell.
4. Run focused and full mobile tests, both normal platform exports, Expo Doctor, clean prebuild to a
   temporary/generated path and exact iOS/Android Release compilation. Inspect resolved dependency,
   entitlements/manifests, release-debugging/storage/permission posture and bundle for forbidden sinks.
5. Review diff/scope/secret and run root `pnpm check` only if root/shared product code changed. Record
   dated evidence and explicit NOT RUN layers; commit product and acceptance records separately.

## Definition of done

- [x] Expo-selected WebView resolves/builds on SDK 57/RN 0.86; production/dev initial-origin policy is
  exact and a rejected initial source never mounts.
- [x] Challenge/ack/context and renewal/clear state transitions are source/replay/instance/epoch bound;
  native refresh is serialized and no refresh token crosses any boundary.
- [x] Permanent/native/unavailable/external/auth/unknown navigation, popup and back cases stop or route
  exactly, with an explicit external-host confirmation and no real launch in automated acceptance.
- [x] Theme preference/resolution and WebView chrome work; 032 commands fail visibly with stable codes;
  process/load/session failures have bounded retry/close and redacted diagnostics.
- [x] Existing native auth/choir/repertoire/PDF/audio/mini-player behavior remains green; accessibility
  semantics/target sizes are source/test-verified without claiming manual screen-reader proof.
- [x] `npm run check`, both platform exports, `npx expo-doctor`, exact iOS/Android Release builds,
  dependency/config/security scans and `git diff --check` pass on the final product content.
- [x] Diff review finds no out-of-scope change; canonical handoff/status/evidence records are updated in
  a separate commit while 004 remains 25/27 and 010 remains 6/7.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 031 open. Review is self-review unless an independent review is
actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Exact Expo-compatible dependency resolves and both native Release projects compile; invalid production/dev initial origin or route never mounts | yes | **PASS** | 2026-09-11, `0217ac8`; Expo 57/RN 0.86; focused config/component tests, normal exports, clean prebuild, Android API 36 arm64 Release and iOS arm64-simulator Release | `react-native-webview` 13.16.1 and `expo-crypto` 57.0.2 resolved; iOS 1,351-module and Android 1,349-module exports, generated autolinking and both exact Release builds passed. Initial path is classified before mount; loopback override is dev-only. Generated outputs were deleted after hashing/inspection. No runtime launch or hardware proof |
| Challenge/ack/context, refresh/renew/clear and retry/process lifecycle are source/replay/instance/epoch bound; only an access-token lease crosses | yes | **PASS** | 2026-09-11, `0217ac8`; auth-store and framework-free controller tests | Fresh challenge, exact acknowledgement, source/replay/epoch guards, one native refresh, newer renewal, stale tenant refusal, cover-before-clear and process/timeout failure passed. Context serialization contains access token, expiry, user, choir and member only; test-only injected `refreshToken` was absent from the outbound message. Synthetic sessions only; no provider/account call |
| Permanent/native/unavailable/external/auth/unknown navigation plus popup and back handling obey one parser; external launch requires normalized-host confirmation | yes | **PASS** | 2026-09-11, `0217ac8`; controller and WebView component tests plus installed 13.16.1 source/type inspection | Shared classifier handles validated initial source, every callback and popup target; permanent routes remain web, current home/repertoire exit native, chat/assignments return stable unavailable, invalid/auth/scheme cases close visibly. RNCWebView's own whitelist is deliberately `*` so it cannot bypass the callback through automatic `Linking`; the shared parser is the exact allowlist. External tests use a no-op launcher and require a normalized-host confirmation; no system browser opened |
| Theme preference/system resolution and native chrome work; password/clipboard/file requests return stable unavailable results without side effects | yes | **PASS** | 2026-09-11, `0217ac8`; theme/controller/component tests | SecureStore preference and system resolution, native chrome and post-proof `theme.apply` passed. Password, invitation clipboard and file requests return `capability-unavailable`; injected file controls are disabled. Actual password manager, clipboard and protected-file platform behavior remain 032 |
| Load/HTTP/process/session/message failures are nonblank, bounded and redacted; controls expose accessible roles/labels/states and safe target sizes | yes | **PASS** | 2026-09-11, `0217ac8`; Jest/source/config review | Locked, loading, error, retry, close and external-confirmation surfaces are nonblank; malformed-message limit, timeout, 401/5xx, renderer termination and file attempt close visibly. Diagnostics contain only the 029 allowlist. Roles/labels/states and 48-point controls are source/test verified. React Native's existing `SafeAreaView` deprecation warning remains; manual VoiceOver/TalkBack, keyboard and actual process termination are NOT RUN |
| Existing auth/choir/repertoire/PDF/audio/mini-player regressions and tenant-clear ordering remain green | yes | **PASS** | 2026-09-11, `0217ac8`; `npm run check` | Mobile TypeScript and all 26 suites / 126 tests passed, including auth/choir, cache clear, repertoire, PDF/Skia, annotations, audio, mini-player and product read flow. This is local deterministic regression evidence, not a service or device rerun |
| Full mobile type/tests, both platform exports, Expo Doctor, exact iOS/Android Release builds and final diff/config/secret review pass | yes | **PASS** | 2026-09-11, `0217ac8`; mobile check, Expo exports/Doctor/prebuild, Gradle/Xcode, manifest/bundle/dependency/diff scans | `npm run check` passed 26/126; exports passed; Expo Doctor passed 21/21; Android arm64 Release produced a 44 MB APK with SHA-256 `237437bf845acaff405566985b9f0121bc7d956e5f6034198ced1165400368fe`; iOS Release executable SHA-256 was `0ae66481895f7fe8b1bebdbf762e8d1762efeed61f0e2f1e3b479e7cc5ba786d`. ATS disallows arbitrary loads; no camera/microphone permission was added. Change-scoped dependency review found neither added package introduces an advisory; repository-wide `npm audit --omit=dev` remains nonzero with 10 moderate, 0 high/critical pre-existing Expo/xcode/uuid-chain findings and was not auto-fixed. Root product code did not change, so root `pnpm check` is N/A. Hosted/provider, simulator/emulator execution, hardware, CI, push/deploy and independent review are NOT RUN |

## Delivery boundary

031 is locally accepted at `0217ac8` under the bounded evidence above. This proves the native shell,
policy wiring and exact Release compilation only; it does not prove the dormant 030 web peer and 031
native peer together in a browser engine. Package 032 may now implement the explicitly deferred
password/clipboard/file platform capabilities, followed by 033 composed local C1 acceptance. Keep 004
hardware acceptance at 25/27 and 010's open criterion at 6/7.
