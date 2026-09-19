# 035 — Native notification permission and tap runtime

**Status / date / responsible writer:** IN PROGRESS / 2026-09-19 / primary agent

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
- Expo Notifications official SDK reference and installed SDK 57 bundled-module metadata — aligned
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

- [ ] Permission is never requested on mount; user press yields granted or explicit denied/error UI.
- [ ] Initial and live tap responses use 034 data, clear the consumed initial response and suppress
      exact duplicates.
- [ ] Web routes, exact accessible repertoire song and unavailable/invalid routes behave visibly
      under the current authenticated active choir.
- [ ] Sign-out/unmount removes the tap listener; no token or provider call exists.
- [ ] Mobile check, Expo config and production JS export pass; binary/runtime boundary stays open.
- [ ] Diff/records/cleanup pass and free space remains at least 10 GiB.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source/dependency/official-reference inventory | local repo + official Expo docs | PASS | SDK 57 maps `expo-notifications` to `~57.0.20`; current app has no native consumer. Official reference says plugin changes need a rebuilt binary and documents channel/permission and tap APIs. |
| 2026-09-19 | Resource preflight | local filesystem | PASS | 14,530,904 KiB free; no native build/runtime planned; stop floor 10 GiB. |

**Delivery:** Pending implementation, evidence, cleanup and separate product/record commits.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| No mount-time prompt; explicit press handles granted, denied and adapter failure | yes | NOT RUN | focused mobile tests pending | Permission state only; no token acquisition. |
| Android channel is prepared before permission request; iOS authorization mapping accepts authorized/provisional/ephemeral | yes | NOT RUN | gateway tests/config review pending | Native OS prompt remains unproved without binary runtime. |
| Initial and live tap responses resolve through 034; consumed initial response is cleared | yes | NOT RUN | runtime/component tests pending | Synthetic adapter evidence only. |
| Exact duplicates navigate once; invalid/hostile data fails visibly | yes | NOT RUN | negative/duplicate tests pending | Persistence beyond the process is not claimed. |
| Web destinations and exact accessible repertoire song route under ready auth/choir; assignment unavailable is visible | yes | NOT RUN | AppRoot/Repertoire tests pending | Destination data loaders retain authorization responsibility. |
| Unmount/sign-out removes listener and no token/provider call exists | yes | NOT RUN | lifecycle test + source scan pending | Backend token lifecycle remains later C2 work. |
| Mobile typecheck and Jest | yes | NOT RUN | `npm run check` pending | JS/unit/component evidence, not native binary. |
| Expo config and production iOS JS export resolve the module | yes | NOT RUN | config + `npm run bundle:check` pending | Export is not native compile/runtime evidence. |
| Native binary permission/tap runtime, provider delivery, real recipient and hardware | N/A — outside this bounded slice | N/A | not executed | Required in later C2 acceptance; official reference requires a rebuilt binary for plugin effects. |
| Cleanup/disk floor/dirty ownership and record consistency | yes | NOT RUN | post-gate checks pending | Remove export output; preserve unrelated temp marker. |
