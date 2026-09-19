# 035 — Native notification permission and tap runtime

**Status / date / responsible writer:** ACCEPTED LOCALLY / 2026-09-19 / primary agent

**Purpose and user need:** Add the first real native C2 consumer so a signed-in user can choose
notification permission and a cold/live notification tap can reach the canonical 034 destination
without trusting a supplied URL.

**Delivery focus:** This slice installs/configures the Expo native notifications module, presents
permission as an explicit user action, consumes initial and live tap responses through 034, clears
the consumed cold response, suppresses exact duplicates and routes only inside a server-confirmed
active-choir shell. Web-owned destinations open in the permanent WebView, repertoire opens the
native target song, and currently unavailable assignment destinations fail visibly. Native device
token registration, backend storage and provider delivery remain later C2 slices.

**Starting evidence:** 034 is accepted locally at product `6883b3b` and record `1898f69`.
`apps/mobile` has no notifications dependency or runtime. `AppRoot` owns auth-gated routing and
`RepertoireScreen` has no initial-song input. Current Expo SDK 57 metadata and the official Expo
Notifications reference both identify `expo-notifications ~57.0.20`; the reference requires a
native build for plugin changes and describes permission/channel ordering plus initial/live
response listeners. This brief does not infer native runtime proof from configuration.

**Current work card:** Observable result: under an authenticated active choir, user-initiated
permission and both initial/live synthetic tap responses exercise 034's canonical route decision,
dedupe and failure UI through mobile component tests and a production JS bundle. Next actions:
(1) add the aligned dependency/config and adapter; (2) integrate auth-gated routing/permission UI;
(3) run mobile/config/bundle gates, review, clean and record. Exit when all required rows pass and
binary/provider/device rows remain explicitly unrun.

**Resources:** Start snapshot: 14,530,904 KiB (~13.9 GiB) free after the transient App Store disk
anomaly stabilized; no 034 generated outputs/runtime remain. Existing mobile dependencies use
about 2.4 GiB. Estimated added dependency plus JS export peak is under 1 GiB. No native prebuild,
Pods, Xcode/Gradle build, simulator or VM is planned in this slice. Stop and clean exact owned
outputs if free space approaches 10 GiB.

**Allowed files / modules:**

- `apps/mobile/package.json`, `apps/mobile/package-lock.json`, `apps/mobile/app.json` — aligned
  notifications dependency and conservative config plugin/channel.
- `apps/mobile/App.tsx` — production gateway composition only.
- `apps/mobile/src/notifications/` — native gateway, auth-gated runtime hook and tests.
- `apps/mobile/src/ui/AppRoot.tsx`, `ShellScreen.tsx` and focused tests — permission/tap routing.
- `apps/mobile/src/repertoire/RepertoireScreen.tsx` and focused tests — exact accessible song
  selection from a validated notification destination.
- This brief and concise plan/handoff/status indexes after acceptance.

**Sources / existing patterns:**

- [034](034-notification-deep-link-contract.md) and `lib/notification-deep-link.ts` — sole payload
  and route authority.
- `apps/mobile/src/ui/AppRoot.tsx`, auth provider and WebView/repertoire screens — current screen
  ownership and server-confirmed active-choir boundary.
- [Expo Notifications official SDK reference](https://docs.expo.dev/versions/latest/sdk/notifications/)
  and installed SDK 57 bundled-module metadata — aligned
  package version, channel-before-permission rule, foreground handler, initial response, response
  listener and consumed-response clearing.
- `docs/mobil-teslim-plani.md` C2 row and `MIGRATION.md` — acceptance and provider limits.

**Migration start check:**

- Read: `AGENTS.md`, handoff, active context, plan C2/execution controls, 034, migration guide,
  current mobile shell/auth/repertoire and official Expo Notifications reference.
- Boundary: native permission and tap consumer only; shared contract/server payload semantics stay
  unchanged; no backend, token or provider work.
- Preserve: user-initiated permission, current route ownership, native-only refresh token, active
  choir remount/cache isolation, permanent WebView screens and foreground audio state.
- Authority/writer: one primary writer; local dependency/config/code/tests/commit authorized.
  `supabase/.temp/cli-latest` remains unrelated and unstaged.
- Required proof: mobile typecheck/Jest, Expo config resolution, production iOS JS export and
  source/isolation review. Native binary/runtime, remote push and hardware stay NOT RUN.

**Out of scope:**

- Device/Expo push-token acquisition, token persistence/refresh/unsubscribe backend, DB migration,
  FCM/APNs/Expo Push Service choice, credentials, provider sends and real recipients.
- Automatic permission prompts, settings-app launch, badge/inbox/background data tasks, custom
  sounds/icons, analytics or notification scheduling.
- Native prebuild, Pods, Xcode/Gradle binary build, simulator/device acceptance, EAS/CI, deploy,
  push, publication or spending.
- Making native assignments available or bypassing destination session/tenant/role checks.

**Risk / authority / rollback:** A stale cold response could replay after choir change, a duplicate
could navigate twice, or an unavailable route could silently fall back. The runtime processes taps
only inside the ready shell, clears the initial platform response after handling, keys duplicates
by 034's server UUID, remounts with the active choir and fails visibly for invalid/unavailable
destinations. Permission is requested only after a user press. Rollback is code/config/lockfile
only; no external state or token is created by tests.

**Small implementation steps:**

1. Install the SDK-aligned module and add a minimal production gateway/config.
2. Integrate permission state and 034 tap routing with explicit unavailable/invalid feedback and
   exact repertoire-song targeting.
3. Run focused/mobile/config/export gates, inspect bundle/source, clean generated output, record
   evidence and select the next C2 token-lifecycle slice.

**Done definition:**

- [x] Permission is never requested on mount; user press yields granted or explicit denied/error UI.
- [x] Initial and live tap responses use 034 data, clear the consumed initial response and suppress
      exact duplicates.
- [x] Web routes, exact accessible repertoire song and unavailable/invalid routes behave visibly
      under the current authenticated active choir.
- [x] Sign-out/unmount removes the tap listener; no token or provider call exists.
- [x] Mobile check, Expo config and production JS export pass; binary/runtime boundary stays open.
- [x] Diff/records/cleanup pass and free space remains at least 10 GiB.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source/dependency/official-reference inventory | local repo + official Expo docs | PASS | SDK 57 maps `expo-notifications` to `~57.0.20`; current app has no native consumer. Official reference says plugin changes need a rebuilt binary and documents channel/permission and tap APIs. |
| 2026-09-19 | Resource preflight | local filesystem | PASS | 14,530,904 KiB free; no native build/runtime planned; stop floor 10 GiB. |
| 2026-09-19 | `npx expo install expo-notifications` | local mobile workspace | PASS | Installed SDK-aligned `~57.0.20` plus three small dependencies. Installer reported 11 moderate audit findings; no automatic/force fix or downgrade was attempted. |
| 2026-09-19 | First typecheck and hook-test attempts | local uncommitted diff | FAIL | Initial typecheck exposed only overly narrow test-double inference. After correction, two hook-render approaches leaked React async `act` scope and destabilized later tests. Per the two-attempt rule, the routing/dedupe decision moved to a pure core rather than repeating the same harness. Required criteria stayed intact. |
| 2026-09-19 | Focused replacement matrix | local corrected diff | PASS | Gateway/channel/permission, pure tap resolver, shell, AppRoot and repertoire tests passed: 5 suites / 30 tests; final AppRoot additions passed 15/15. Cold/live routing, exact song, unavailable failure, user prompt/adapter error and sign-out cleanup are covered. |
| 2026-09-19 | `npm run check` | mobile workspace, product commit `04319e3` | PASS | TypeScript and 36 Jest suites / 216 tests passed. Existing punycode and SafeAreaView deprecation warnings remain; they are not new acceptance passes or runtime failures. |
| 2026-09-19 | Expo public config resolution | mobile workspace | PASS | `expo-notifications` resolved with `defaultChannel=genova-updates` and background remote notifications disabled. No credentials or native build. |
| 2026-09-19 | `npm run bundle:check` and bundle inspection | local iOS production JS export | PASS | 1,424 modules; 4.2 MB Hermes bundle. Strings confirm notification runtime inclusion; scans found no exact hosted endpoint, acceptance flag, VAPID private key, service role or refresh-token literal. Export is not a native binary. |
| 2026-09-19 | Token/provider source scan and self-review | product commit `04319e3` | PASS | No token getter, auto-registration enable, push API, provider or subscription call in product sources. Permission is user-triggered; ready-shell mount gates response consumption; initial response clears; sign-out removes listener; inaccessible targets fail visibly. Self-review is not independent review. |
| 2026-09-19 | Cleanup and disk check | local filesystem | PASS | Removed exact `.expo/bundle-check` output; no native build/runtime created. 12,091,576 KiB (~11.5 GiB) free; unrelated `supabase/.temp/cli-latest` remains unstaged. |
| 2026-09-19 | Acceptance-record consistency gate | five changed Markdown files | PASS | 91 local links checked with zero missing; no stale 035 pending marker, superseded product hash or test count remained; `git diff --check` passed. |

**Delivery:** Planning commit `ac769ce`; product commit `04319e3`; this acceptance record follows.
Rollback `04319e3` to remove the native consumer/config. Device-token account/choir lifecycle,
backend registration/unsubscribe, provider send and native binary/runtime evidence remain C2 work.
The next bounded step is an inventory and local contract for that token lifecycle; do not allocate a
DB/native runtime while the disk margin is this close to the floor.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| No mount-time prompt; explicit press handles granted, denied and adapter failure | yes | PASS | 2026-09-19, `04319e3`, gateway/shell/AppRoot tests | No mount request; user press denial and caught adapter error are explicit. Permission state only; no token acquisition. |
| Android channel is prepared before permission request; iOS authorization mapping accepts authorized/provisional/ephemeral | yes | PASS | 2026-09-19, `04319e3`, gateway tests + config review | Call order and all three iOS accepted states passed synthetically. Native OS prompt remains unproved without binary runtime. |
| Initial and live tap responses resolve through 034; consumed initial response is cleared | yes | PASS | 2026-09-19, `04319e3`, resolver/AppRoot tests | Both response paths use 034 data; exact cold response clears. Synthetic adapter evidence only. |
| Exact duplicates navigate once; invalid/hostile data fails visibly | yes | PASS | 2026-09-19, `04319e3`, pure resolver negative matrix | Same server UUID is suppressed; hostile URL is refused without reserving the identity. Persistence beyond the process is not claimed. |
| Web destinations and exact accessible repertoire song route under ready auth/choir; assignment unavailable is visible | yes | PASS | 2026-09-19, `04319e3`, AppRoot/Repertoire tests | Canonical WebView path and exact accessible song passed; inaccessible song and unavailable assignment show explicit errors. Data loaders retain authorization responsibility. |
| Unmount/sign-out removes listener and no token/provider call exists | yes | PASS | 2026-09-19, `04319e3`, AppRoot lifecycle test + source scan | Sign-out unsubscribes. No token getter, provider, backend push route or subscription call exists in app sources. |
| Mobile typecheck and Jest | yes | PASS | 2026-09-19, `04319e3`, `npm run check` | 36 suites / 216 tests. JS/unit/component evidence, not native binary. |
| Expo config and production iOS JS export resolve the module | yes | PASS | 2026-09-19, `04319e3`, Expo public config + `npm run bundle:check` | Plugin/channel resolved; 1,424-module production bundle included the notification runtime. Export is not native compile/runtime evidence. |
| Native binary permission/tap runtime, provider delivery, real recipient and hardware | N/A — outside this bounded slice | N/A | not executed | Required in later C2 acceptance; official reference requires a rebuilt binary for plugin effects. |
| Cleanup/disk floor/dirty ownership and record consistency | yes | PASS | 2026-09-19, exact path/status/disk checks plus record gates | Export absent; 12,091,576 KiB free; only unrelated temp marker dirty. Document link/status/diff checks passed before record commit. |
