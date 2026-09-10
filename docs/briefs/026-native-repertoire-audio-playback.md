# 026 — Native repertoire foreground audio playback

Prepared and locally accepted: 2026-09-10. Status: **COMPLETE LOCALLY**. Planning commit
`e1b9615`; code/test commit `c30b3b1`. Single writer and self-reviewer: main agent; no independent
review is claimed. This is the first bounded B4 package.

## Outcome and delivery focus

Let an authenticated mobile member open an accessible song's audio files and play, pause, seek and
change playback speed in one foreground-owned native player, using the existing protected-file
ticket contract. This closes the first useful audio slice without changing web behavior or claiming
background, lock-screen, mini-player, offline-download or real-device acceptance.

## Execution start check

- [x] Read [AGENTS](../../AGENTS.md), [handoff](../agent-handoff.md),
  [migration guide](../gecis-rehberi.md), [work cycle](../ai-calisma-duzeni.md), the six
  memory-bank indexes, [MIGRATION](../../MIGRATION.md), [decisions](../../KARARLAR.md),
  [delivery plan B4](../mobil-teslim-plani.md#b--rehearsal-tools-without-breaking-the-shared-contract)
  and the completed A1–A3 protected-file briefs 015, 021 and 022.
- [x] Verified `main` at `e53b137` with only the pre-existing, unowned
  `supabase/.temp/cli-latest` modification. It remains unstaged and outside 026. The main agent is
  the sole writer; no subagent is used.
- [x] The owner's continuing direction authorizes local implementation, dependency installation,
  tests, local simulator/emulator execution and local commits. It does not authorize hosted
  Supabase changes, real data/accounts, push/deploy, remote CI, messages, spending or hardware.
- [x] The shared catalogue already carries `file_type: 'audio'`; the mobile repertoire currently
  exposes only score PDFs. Web uses one shared `HTMLAudioElement`, protected ticket URLs, ordered
  tracks, seek and 0.5–2x speed. Web route persistence belongs to its mini-player and is preserved.
- [x] Expo SDK 57 declares `expo-audio ~57.0.4`. The first slice is foreground-only, so no
  background playback plugin/configuration or lock-screen control is enabled.

## Allowed scope

- `apps/mobile/package.json` and lockfile: SDK-compatible `expo-audio` dependency only.
- `apps/mobile/src/repertoire/audio-contract.ts` and tests: audio filtering, stable track labels and
  ordering, time/seek/rate bounds and unsupported-format classification.
- `apps/mobile/src/repertoire/audio-source-gateway.ts` and tests: authenticated protected ticket
  acquisition, latest-request ownership, cancellation, fresh-ticket retry and private-state clear.
- `apps/mobile/src/repertoire/AudioPlayerScreen.tsx` plus the smallest framework-free controller or
  adapter and focused tests: one active foreground player, loading/error/retry, play/pause, seek,
  0.5–2x speed, track selection and teardown.
- `apps/mobile/src/repertoire/RepertoireScreen.tsx` and focused tests: expose accessible audio files
  without changing PDF behavior; only one reader/player route is active.
- Mobile test setup/mocks, a bounded local audio fixture/acceptance entry if required, this brief,
  evidence, delivery-plan/MIGRATION/handoff/memory indexes after acceptance.
- Shared protected-file client only if AbortSignal support cannot be kept inside the mobile gateway;
  any shared change requires focused root tests and root `pnpm check`.

## Runtime and UX contract

- Audio tracks are only accessible catalogue files with `file_type: 'audio'`. Label priority is
  trimmed `partition_label`, then the filename without its final extension. Created time followed by
  stable ID order matches existing web behavior. MusicXML/MIDI are not audio fallbacks.
- Opening a track requests a ticket using only the current session access token and repository file
  UUID. A newer selection or tenant clear cancels/invalidates the older request; stale completion
  cannot replace or start the current source.
- Exactly one foreground player owns playback. Track change stops/replaces the previous source.
  Screen exit, choir switch, sign-out and external session loss pause and remove the source and
  discard ticket state. No old-tenant URL may remain playable.
- The screen visibly distinguishes ticket loading, media buffering/loading, active/paused playback
  and bounded Turkish error/retry states. Retry requests a fresh ticket before replacing the source.
  Corrupt, unsupported or denied media never becomes a silent success.
- Play/pause, track selection, retry, back and speed controls have semantic roles/labels and at least
  a 44-point target. Seek exposes current/duration values and clamps to the loaded duration. Use the
  existing native theme and visible pressed/disabled states; no pixel parity with web is intended.
- Component unmount ends playback in 026. Continuing across navigation, background/interruptions,
  lock-screen controls and a compact mini-player belong to later B4/B5 packages.

## Preserved behavior and exclusions

- Preserve catalogue role/assignment filtering, PDF reader behavior, ticket endpoint/file binding,
  web audio and mini-player semantics, one-based annotation contracts and decision #14's active
  content filter.
- Do not add MusicXML/MIDI playback, recording, uploads, persistent offline audio, waveform,
  background mode, lock-screen metadata, OS media controls, analytics or a second player owner.
- Do not change DB/RLS/Storage/Edge schema or deploy the existing protected-file service. Do not use
  real accounts/data, send messages, push/deploy, run remote CI or claim hardware evidence.
- WAV may be used as a deterministic local acceptance fixture because the protected contract already
  served it in 022; product upload policy remains MP3-only and is not broadened by this fixture.

## Risk, authority and rollback

- Highest risks are stale ticket completion after track/tenant change, two simultaneous players,
  leaking a signed URL across sign-out, presenting a mocked seek as native decode proof and enabling
  accidental background behavior. Generation ownership, tenant-cache teardown and layered evidence
  must keep those claims separate.
- One fresh-ticket retry is user-driven or bounded per load error; repeated failure remains visible.
  Unsupported/corrupt data stops safely. A second identical failure triggers diagnosis, not a loop
  that weakens the acceptance.
- Rollback is the later 026 code/test commit, then this planning commit. Removing `expo-audio` and
  the native screen returns to the current PDF-only mobile surface; web and hosted systems remain
  unchanged.
- Any required hosted change, provider account, real data, hardware or background-audio authority
  stops that dependent criterion only and remains NOT RUN.

## Implementation and verification sequence

1. Unit-test the platform-free audio contract and a ticket source gateway with cancellation,
   same-file fresh retry, stale completion refusal and clear semantics.
2. Install the Expo-compatible audio module; inspect its SDK types, then implement one screen-owned
   player with a tenant-cache cleaner and deterministic component/controller seams.
3. Integrate audio entry into the repertoire catalogue while preserving PDF paths. Test accessible
   filtering, ordering, labels, all controls, visible failures/retry and route/tenant teardown.
4. Run focused tests, mobile `npm run check`, `npm run bundle:check`, Expo Doctor and both appropriate
   local native platform builds/acceptance. Use actual served audio bytes and a seek/range observation
   for native runtime evidence; keep a mocked-only result explicitly partial.
5. Inspect the diff, run root `pnpm check` if shared code changed, record evidence and update the
   canonical status documents only after every required local criterion passes.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 026 open. Review is self-review unless an independent review is
actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Accessible audio files are filtered, stably ordered and labelled like web; PDF paths and MusicXML filtering remain unchanged | yes | **PASS** | 2026-09-10, `c30b3b1`; `audio-contract` and repertoire integration tests | MP3/WAV audio ordering, label fallback, unsupported OGG, unchanged PDF route and audio route/back passed. This does not broaden the MP3 product upload policy |
| Protected source uses current token + file UUID; newer selection cancels/invalidates stale work; retry gets a fresh ticket | yes | **PASS** | 2026-09-10, `c30b3b1`; gateway/client tests and both local Release apps | AbortSignal and generation guard reject stale completion. Expired ticket 1 was replaced by ticket 2 before native playback on iOS and Android; local server received only the selected UUID plus synthetic ticket query |
| One native foreground owner plays/pauses, switches tracks, seeks within actual duration and changes speed between 0.5x and 2x | yes | **PASS** | 2026-09-10; iPhone 17 / iOS 26.5 simulator and API 36 arm64 emulator, exact alternate-entry Release builds | Both native decoders played the generated 10-second 440 Hz WAV. iOS visibly advanced to 0:02, seek returned to 0 and 1.25x was applied; Android visibly advanced/completed. Hook-owned source replacement releases the old player. This is simulator/emulator evidence, not hardware or audio-output quality proof |
| Ticket loading, buffering/loading, denial, corrupt/unsupported media and retry are visible and recover safely | yes | **PASS** | 2026-09-10, `c30b3b1`; 5 focused player tests plus Release runtime observations | Loading and ticket failures have Turkish states; corrupt 27-byte data produced the bounded retry state on both platforms, unsupported OGG produced a non-retryable format message, and no silent success was accepted. Denial is component/gateway evidence; no hosted account denial was run |
| Screen exit, choir switch, sign-out and external session loss stop/remove source and erase ticket state before tenant transition | yes | **PASS** | 2026-09-10, `c30b3b1`; repertoire back/unmount, tenant-cache and existing AuthStore ordering tests; Release clear action | Repertoire back unmounted the owner and called gateway clear; tenant clear paused the native owner, changed source to null and disabled controls at 0:00/0:00 on both platforms. AuthStore already invokes the same cleaner before choir RPC/sign-out/session-loss transition. No real-account transition was run |
| Controls have semantic labels/roles, 44-point targets, visible disabled/pressed state and existing theme/safe-area behavior | yes | **PASS** | 2026-09-10, `c30b3b1`; source review, component tests and local visual inspection of both Release apps | Radio track selector, adjustable seek and labelled buttons use 44–48 point targets, theme colors and explicit disabled/pressed styles. Playing, cleared, corrupt and unsupported states were visually inspected; no independent accessibility audit or hardware screen-reader run |
| Mobile typecheck/tests, iOS bundle, Expo Doctor and applicable local iOS/Android native builds pass with no web/shared regression | yes | **PASS** | 2026-09-10, `c30b3b1`; `npx tsc --noEmit && npm test -- --runInBand`, `npm run bundle:check`, `npx expo-doctor`, Android `assembleRelease`, iOS `xcodebuild` arm64 simulator, root `pnpm check` | Mobile 20/20 suites and 100/100 tests; focused post-review 2 suites/12 tests; 1,328-module iOS export; Expo Doctor 21/21; both Release builds installed/launched; root 42/42 files and 279/279 tests plus Next build. No hardware, hosted service, deploy, remote CI or production account |

## Delivery

026 is complete within its local foreground scope. The implementation adds SDK-compatible
`expo-audio`, a cancellable protected-ticket gateway, one source-owning native player and the
repertoire entry while preserving PDF and web behavior. The deterministic loopback fixture served
160,044-byte WAV data with SHA-256
`b43dde9816f8047e0c351a5a756f99d75433396ce8f4ac0b36dc1d825f26127e`; iOS exercised HTTP 206
Range reads and Android exercised full HTTP 200 reads. Tenant clear and unmount remove the source.

Rollback order is documentation record, code/test `c30b3b1`, then planning `e1b9615`; removing the
dependency/player restores the PDF-only mobile surface. Remaining B4 work is navigation-persistent
foreground ownership and compact mini-player integration. Background/interruption/lock-screen
behavior remains B5/hardware-gated. No hosted migration, deployment, Drive, real account/data,
remote CI, hardware or independent review was performed or inferred.
