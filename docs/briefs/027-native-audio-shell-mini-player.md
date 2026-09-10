# 027 — Native audio shell ownership and compact mini player

Prepared and locally accepted: 2026-09-10. Status: **COMPLETE LOCALLY**. Planning commit
`0c30e33`; code/test commit `dc25938`. Single writer and self-reviewer: main agent; no independent
review is claimed. This is the second bounded B4 package.

## Outcome and delivery focus

Keep one protected native audio session alive while an authenticated member moves from the full
audio view back through repertoire to the existing native shell, and expose that same owner through
an accessible compact foreground mini player. This closes B4's navigation-integration slice without
enabling background, lock-screen or hardware-dependent behavior.

## Execution start check

- [x] Read [AGENTS](../../AGENTS.md), [handoff](../agent-handoff.md),
  [migration guide](../gecis-rehberi.md), [work cycle](../ai-calisma-duzeni.md), the six memory-bank
  indexes, [MIGRATION](../../MIGRATION.md), [decisions](../../KARARLAR.md),
  [delivery plan B4](../mobil-teslim-plani.md#b--rehearsal-tools-without-breaking-the-shared-contract),
  [026](026-native-repertoire-audio-playback.md), the current native shell/repertoire/audio sources,
  and the web shared-audio/mini-player sources for behavior inventory only.
- [x] Verified `main` at `5fd1fad` with only the pre-existing, unowned
  `supabase/.temp/cli-latest` modification. It remains unstaged and outside 027. The main agent is
  the sole writer; no subagent is used.
- [x] Existing web behavior uses one shared `HTMLAudioElement` across route unmount and a floating
  player. Native 026 instead owns Expo Audio inside the full screen, so returning unmounts/stops it.
  The smallest native repair is one provider under the ready/authenticated shell, not a second
  player or a copied web store.
- [x] The owner's continuing direction authorizes local implementation, local tests,
  simulator/emulator execution and local commits. It does not authorize hosted Supabase changes,
  real accounts/data, push/deploy, remote CI, messages, spending or hardware.
- [x] UI guidance applied to this package: keep 44–48 point controls, semantic labels, a visible
  title/track/progress state, explicit disabled/error state, truncation for long names and the
  existing theme. Decorative motion is unnecessary.

## Allowed scope

- `apps/mobile/src/repertoire/`: extract 026 playback state/actions into one provider/controller;
  make the full player consume it; add one compact mini-player view and focused tests.
- `apps/mobile/src/ui/AppRoot.tsx`, `ShellScreen.tsx` and focused/flow tests: mount the owner only
  inside the authenticated ready shell, route repertoire → full player → repertoire/home, and dock
  the mini player without replacing the existing shell/navigation contract.
- `apps/mobile/src/repertoire/RepertoireScreen.tsx` and tests: emit an open-audio intent containing
  stable song identity/title/tracks instead of mounting a second owner; preserve catalogue/PDF paths.
- The 026 guarded loopback acceptance entry/tests only as needed to prove navigation persistence,
  same-player controls, close and tenant teardown in actual local Release apps.
- This brief and canonical handoff/MIGRATION/plan/memory records after acceptance.

## Runtime and UX contract

- Exactly one provider beneath the authenticated `ReadyShell` owns Expo Audio, the protected URL,
  request generation, timers, speed, selected track and progress. Full and compact views are
  projections of that owner; neither creates or replaces an independent player.
- Opening a song creates/replaces the shell session and loads its first supported track through the
  current protected-ticket gateway. Back from the full player preserves source, position, rate and
  play/pause state. Back from repertoire to home keeps the compact player available.
- Compact player shows song/track and current/duration state, offers labelled open, play/pause and
  close controls with 44-point targets, and mirrors loading/error/disabled state. Close pauses,
  invalidates work, clears the signed source and removes the compact surface.
- Expired-ticket play, track switch, retry, corrupt/unsupported data and stale completion retain
  026's fail-closed behavior. Navigation must not request a new ticket or reset position by itself.
- Choir switch, sign-out, external session loss and provider unmount clear the owner before another
  tenant can render. No compact player or signed URL may survive outside authenticated ready state.
- The package is foreground-only. Existing Expo config keeps background playback/recording and
  microphone permission disabled. App suspension/interruption, lock-screen controls and hardware
  audio-route behavior remain B5.

## Preserved behavior and exclusions

- Preserve web audio/mini-player behavior, active-content filtering, repertoire role/assignment
  visibility, PDF reader behavior, 026's protected ticket/file UUID contract and one-based
  annotation contracts.
- Do not add a navigation library, bottom-tab shell, WebView bridge, background audio, OS media
  session, lock-screen metadata, recording, persistent offline audio, waveform, analytics or new
  DB/RLS/Storage/Edge code.
- Do not use real accounts/data, deploy/push, dispatch remote CI, send messages, spend money or run
  hardware tests. Simulator/emulator evidence cannot close B5 or M1.

## Risk, authority and rollback

- Highest risks are accidentally mounting two native players, keeping a signed URL after auth/choir
  transition, navigation resetting playback, retrying stale work and making the mini surface cover
  essential shell actions. Provider ownership, tenant-cache ordering and actual Release navigation
  observations must address them.
- A single repeated test/build failure triggers diagnosis and a second identical failure triggers
  environment/cause reassessment; do not weaken acceptance or loop blindly.
- Rollback is the later 027 code/test commit, then this planning commit. It returns to 026's
  screen-owned player. Any required background capability, hosted change, hardware or product
  decision stops only that dependent criterion and remains NOT RUN.

## Implementation and verification sequence

1. Add focused tests for one provider owner, repertoire open intent, state continuity across both
   back steps, compact open/play/pause/close, expired ticket renewal and tenant/auth teardown.
2. Extract the 026 hook state/actions into a context/provider without changing protected-ticket or
   media error semantics; convert full and compact surfaces to consumers.
3. Lift the provider into the authenticated native shell, route the full view from repertoire and
   keep the compact surface outside the active child screen. Keep long-label and accessibility
   behavior explicit.
4. Run focused and full mobile type/tests, iOS bundle, Expo Doctor and exact local iOS/Android
   Release navigation acceptance with actual loopback WAV bytes. Inspect foreground/background
   configuration and the visual compact states.
5. Inspect the diff, run root `pnpm check` only if root/shared code changes, record each required
   criterion and update canonical status documents only after all local required rows pass.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 027 open. Review is self-review unless an independent review is
actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Repertoire opens a shell-owned audio session and full player without creating a second Expo Audio owner; PDF and catalogue routes remain unchanged | yes | **PASS** | 2026-09-10, `dc25938`; provider/repertoire/AppRoot source review and integration tests | `AudioPlaybackProvider` is the sole `useAudioPlayer` owner under authenticated `ReadyShell`; repertoire emits a stable session intent. Existing catalogue/PDF tests remained green. This is local code evidence, not a real account |
| Back to repertoire and then home preserves the same source, position, rate and play/pause state; navigation alone requests no fresh ticket | yes | **PASS** | 2026-09-10; iPhone 17 / iOS 26.5 simulator and API 36 arm64 emulator, exact alternate-entry Release apps | Both apps retained the same 0:10/0:10 source and 1.25x rate in repertoire and home mini views, then reopened full view at that state. The runtime event stayed on navigation rather than issuing ticket 3; integration tests also require one gateway open |
| Compact player mirrors song/track/time/loading/error state and its open/play/pause/close controls operate the same owner | yes | **PASS** | 2026-09-10, `dc25938`; 2 mini tests, shell flow test and both Release apps | Loading/disabled, playing/paused time, open, pause and close are projected from provider state. Eight platform screenshots and their scope are in [027 evidence](../evidence/027-native-audio-shell-mini-player/README.md) |
| Close, choir switch, sign-out, external session loss and provider unmount pause/remove source, invalidate stale work and remove the compact surface before tenant transition | yes | **PASS** | 2026-09-10, `dc25938`; tenant/provider tests, existing AuthStore ordering matrix, unmount test and Release clear action | Close and provider unmount call one owner clear/pause; AuthStore already clears the shared registry before choir RPC, sign-out and null-session transition. On both Release apps, tenant clear removed the mini surface and exposed `tenant clear PASS mini removed`. No real-account transition was run |
| Expiry renewal, track switch, retry and corrupt/unsupported media preserve 026's visible fail-closed semantics across full/compact navigation | yes | **PASS** | 2026-09-10, `dc25938`; 6 focused player tests plus iOS/Android Release observations | After ticket 1 expired, play requested ticket 2 before native playback on both platforms. Android corrupt bytes produced the bounded retry error and disabled controls; unsupported data produced a non-retryable error on both, mirrored by a disabled compact player. Denial/retry and stale completion are focused-test evidence, not hosted-provider evidence |
| Full and compact controls have semantic labels/roles, 44-point targets, visible disabled/pressed state, long-label truncation and usable safe-area docking | yes | **PASS** | 2026-09-10, `dc25938`; source/tests, accessibility trees and visual inspection of both Release apps | Full and compact controls use 44–48 point minimums, roles/labels, explicit pressed/disabled styles and one-line tail truncation. Repertoire/home/error/cleared states were inspected on both platforms. No hardware screen-reader or independent accessibility audit was run; React Native reports its built-in `SafeAreaView` deprecation as a non-failing test warning |
| Mobile typecheck/tests, iOS bundle, Expo Doctor and applicable local iOS/Android Release builds pass; background playback remains disabled and no web/shared regression is introduced | yes | **PASS** | 2026-09-10, `dc25938`; `npm run check`, normal iOS export, `npx expo-doctor`, iOS arm64 simulator `xcodebuild`, Android `assembleRelease`, manifest/config inspection | Mobile 21/21 suites and 104/104 tests; normal iOS export 1,330 modules; Expo Doctor 21/21; both exact Release builds installed/launched. Loopback served 160,044-byte WAV as iOS HTTP 206 Range and Android HTTP 200; no fatal/crash log match. Background playback/recording and microphone remain disabled. Root/shared code did not change, so root `pnpm check` is N/A rather than rerun |

## Delivery

027 is complete within its local foreground navigation scope. One provider beneath the authenticated
shell now owns the protected source, native player, rate, position, timers and tenant teardown. The
full and compact views consume that owner; repertoire only emits a stable song session. Navigation
does not reload or mint a new ticket, while close/auth boundaries invalidate and remove the source.

The deterministic loopback fixture retained 026's 160,044-byte WAV with SHA-256
`b43dde9816f8047e0c351a5a756f99d75433396ce8f4ac0b36dc1d825f26127e`; iOS exercised HTTP 206
Range reads and Android HTTP 200. Rollback order is this documentation record, code/test `dc25938`,
then planning `0c30e33`; reverting code returns to 026's screen-owned player. B4 foreground
navigation integration is now complete locally. Background/interruption/lock-screen/audio-route
behavior remains B5 and hardware-gated. No hosted migration, deployment, push, real account/data,
remote CI, hardware or independent review was performed or inferred. The next ready local package
is 028, a source-grounded C1 permanent-WebView bridge/route-ownership contract inventory before
implementation.
