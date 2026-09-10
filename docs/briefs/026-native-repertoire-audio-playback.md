# 026 — Native repertoire foreground audio playback

Prepared: 2026-09-10. Status: **PLANNED / NOT RUN**. Single writer and self-reviewer:
main agent; no independent review is claimed. This is the first bounded B4 package.

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
| Accessible audio files are filtered, stably ordered and labelled like web; PDF paths and MusicXML filtering remain unchanged | yes | **NOT RUN** | — | Unit/integration evidence required |
| Protected source uses current token + file UUID; newer selection cancels/invalidates stale work; retry gets a fresh ticket | yes | **NOT RUN** | — | Gateway and runtime request evidence required |
| One native foreground owner plays/pauses, switches tracks, seeks within actual duration and changes speed between 0.5x and 2x | yes | **NOT RUN** | — | Actual native decode/seek evidence required; component mocks alone are insufficient |
| Ticket loading, buffering/loading, denial, corrupt/unsupported media and retry are visible and recover safely | yes | **NOT RUN** | — | Failure-path tests plus native corrupt/unsupported observation required |
| Screen exit, choir switch, sign-out and external session loss stop/remove source and erase ticket state before tenant transition | yes | **NOT RUN** | — | Ordering and integration evidence required |
| Controls have semantic labels/roles, 44-point targets, visible disabled/pressed state and existing theme/safe-area behavior | yes | **NOT RUN** | — | Component/source review and local visual inspection required |
| Mobile typecheck/tests, iOS bundle, Expo Doctor and applicable local iOS/Android native builds pass with no web/shared regression | yes | **NOT RUN** | — | Exact commands/revisions required; hardware/live/remote CI remain outside 026 |

## Delivery

Not executed. On local acceptance, record separate code/test and documentation commits, remaining
risks, rollback order and the next ready B4 package. Do not convert simulator/emulator evidence into
hardware, background playback, hosted service or release proof.
