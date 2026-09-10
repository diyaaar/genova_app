# 027 — Native audio shell ownership and compact mini player

Prepared: 2026-09-10. Status: **PLANNED / NOT RUN**. Single writer and self-reviewer: main agent;
no independent review is claimed. This is the second bounded B4 package.

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
| Repertoire opens a shell-owned audio session and full player without creating a second Expo Audio owner; PDF and catalogue routes remain unchanged | yes | **NOT RUN** | — | Provider/integration evidence required |
| Back to repertoire and then home preserves the same source, position, rate and play/pause state; navigation alone requests no fresh ticket | yes | **NOT RUN** | — | Flow test plus actual native observation required |
| Compact player mirrors song/track/time/loading/error state and its open/play/pause/close controls operate the same owner | yes | **NOT RUN** | — | Component plus native runtime evidence required |
| Close, choir switch, sign-out, external session loss and provider unmount pause/remove source, invalidate stale work and remove the compact surface before tenant transition | yes | **NOT RUN** | — | Ordering/integration and actual clear evidence required |
| Expiry renewal, track switch, retry and corrupt/unsupported media preserve 026's visible fail-closed semantics across full/compact navigation | yes | **NOT RUN** | — | Focused failure tests and native corrupt/unsupported observation required |
| Full and compact controls have semantic labels/roles, 44-point targets, visible disabled/pressed state, long-label truncation and usable safe-area docking | yes | **NOT RUN** | — | Source/test review and local visual inspection required |
| Mobile typecheck/tests, iOS bundle, Expo Doctor and applicable local iOS/Android Release builds pass; background playback remains disabled and no web/shared regression is introduced | yes | **NOT RUN** | — | Exact commands/revisions required; root gate required only if root/shared code changes |

## Delivery

Not executed. On local acceptance, record separate code/test and documentation commits, remaining
risks, rollback order and the next ready package. Do not convert foreground simulator/emulator
navigation into background, lock-screen, hardware, hosted-service or release proof.
