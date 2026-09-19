# Genova — agent handoff

Updated 19 September 2026 under [040](briefs/040-shared-chat-read-contract.md).
This is a short entry point, not another backlog or acceptance record.

## Entry and source order

1. Read [AGENTS](../AGENTS.md), [active context](../memory-bank/activeContext.md) and
   [040](briefs/040-shared-chat-read-contract.md).
2. Read the [revised goal and execution controls](mobil-teslim-plani.md#revised-goal-text).
   Use the [guide](gecis-rehberi.md) and [work cycle](ai-calisma-duzeni.md) once per session;
   load other indexes, decisions and source only as relevant/changed.
3. Verify Git ownership, current free space, tools and remaining evidence before acting.
   Follow the owner's latest request. Do not replay accepted work or recreate old runtimes
   merely because the previous conversation was compacted.

## Checkout and ownership

Current local product HEAD: `2dfe6ab`; `7a6a78e` contains the chat tenant teardown,
`b1d565f` contains the native registration protocol,
`04319e3` contains the native tap consumer and `6883b3b`
contains the C2 shared event contract. Recorded `origin/main` is `a13f696`; no fetch/push/deploy
was performed.
`supabase/.temp/cli-latest` is unrelated CLI cache; keep it unstaged.
Do not create a second checkout/install solely to avoid these known dirty paths.

## Current state

- M0/A1–A3 local read foundation accepted; 018–032 accepted their bounded local scopes.
  Historical detail: [progress index](../memory-bank/progress.md) and linked briefs.
- 033/C1 **ACCEPTED LOCALLY**: both local Release handshakes/routes, the agent-operable Android/iOS
  composed scenarios and the owner-operated iOS password change/restore now pass. The agent never
  entered, inspected or submitted either password; a fresh original-fixture sign-in proved restore.
- 034's shared notification/deep-link contract is **ACCEPTED LOCALLY** at `6883b3b`: seven server
  event types derive canonical C1-policy destinations, assignment query drift is removed, hostile
  route overrides fail closed and one server UUID identifies exact duplicate delivery. This is not
  permission, token lifecycle, provider delivery, real-recipient or device evidence.
- 035's native permission/tap consumer is **ACCEPTED LOCALLY** at `04319e3`: no mount-time prompt;
  authenticated cold/live taps reuse 034; exact WebView/repertoire, duplicate, hostile/unavailable
  and sign-out cleanup paths pass under 36 suites/216 tests and a production JS export. Native
  binary/OS prompt, device token/backend/provider and real delivery remain unrun.
- [036](briefs/036-native-push-token-lifecycle-inventory.md) is **DOCUMENTATION ACCEPTED**: the
  current Web Push-only table/RPC/VAPID sender is kept separate from a native registration
  relation; account/choir/installation/token rotation, sign-out/offline revocation and compatible
  rollout are fixed as later acceptance requirements. Expo Push Service is the recommended first
  transport, but the owner choice and all account/credential/provider actions remain open.
- [037](briefs/037-native-push-registration-protocol.md) is **ACCEPTED LOCALLY** at `b1d565f`:
  exact v1 register/revoke/receipt parsing, transport/platform compatibility, stale scope/
  generation refusal and secret-safe diagnostics pass 57 files/540 tests and the root build.
  It has no token getter, network, schema, Edge, provider or runtime behavior.
- [038](briefs/038-native-chat-feature-inventory.md) is **DOCUMENTATION ACCEPTED**: it preserves
  every current chat capability across a seven-step C3 split and records dated room-authority,
  RLS, Realtime, cache, order and retry blockers. No live schema was queried and no defect was
  remediated.
- [039](briefs/039-chat-tenant-memory-teardown.md) is **ACCEPTED LOCALLY** at `7a6a78e`: successful
  ordinary and embedded tenant teardown reset the real process-wide chat store synchronously;
  failed ordinary sign-out preserves it. The 57-file/542-test root gate passes and exact generated
  outputs are cleaned.
- [040](briefs/040-shared-chat-read-contract.md) is **ACCEPTED LOCALLY** at `2dfe6ab`: strict shared
  room/message models, compatible-unknown fallback, account/choir/member scope and microsecond
  cursor/order/dedup pass mobile 37 suites/218 tests and root 58 files/571 tests. It has no network,
  cache, DB or UI behavior. Authority/Realtime foundation is next behind fresh DB/resource gates.
- `ec5b19a` replaces public passwords with one-use loopback delivery; real delivery/scans passed.
  Reject memory-only storage/manual bundle substitution and repeated manual-signing guesses.
- `5a9fb8f` fixes startup error/retry and late reads. Normally signed iOS Release passed real
  SecureStore startup/relaunch; full feature acceptance remains with 033.
- Before patch alignment, offline normal arm64 Android Release, signature/alignment, SDK 24/36, manifest,
  SecureStore backup rules and bundle isolation passed. No emulator/runtime result is inferred.
- `6a5769a` fixes reproduced early-401 renewal: challenged requests force real native refresh,
  preserving initial non-forced leases and stale-work guards. Typecheck/33 suites/197 tests PASS.
  Repaired guarded iOS Release passed early-401 recovery and persisted SecureStore relaunch on
  the real disposable services. `69714b1` then passes real attendance mutation, Realtime invalidation,
  exact PDF cleanup, terminal second-401/native retry, tenant isolation and WebView sign-out on iOS.
- Final 19 September password-run cleanup restored the disposable target baseline and removed the
  exact runtime, generated native/web builds, app/simulators, wrapper and Colima profile/data/context;
  all four ports closed. Latest available: 18,478,116 KiB (~17.6 GiB).
  Sources/dependencies/shared caches preserved.
  Recheck before allocating; this snapshot is not a continuing guarantee.
- M1 hardware is postponed. M2 native writing/sync needs the four
  [023 owner choices](briefs/023-annotation-write-contract-inventory.md#owner-decision-packet).
  C2 delivery beyond 034–037, C3–C5, release candidate and stores remain pending. Dependencies live
  only in the plan.

## Active bounded sequence

`851e9cd` aligns three direct/four required transitive Expo patches. Mobile 197/root 467 tests,
root build, exports/isolation, Doctor 21/21, normal signed iOS startup/relaunch and guarded Android
credential/session/sign-out plus normal Android Release/isolation PASS. `69714b1` adds the passing
guarded iOS feature/fault batch and final root 467-test/build gate. The owner-operated password
change/restore closes 033 without product changes. `6883b3b` accepts 034's shared seven-event
contract under the 56-file/488-test root gate. `04319e3` accepts 035's native permission/tap
consumer under 36 suites/216 tests, config and production JS export. 036 documentation-accepts the
separate native registration lifecycle; `b1d565f` then accepts its pure provider-neutral v1
protocol under 57 files/540 tests and the root build. Its exact outputs were removed with about
12.1 million KiB free. C2 schema/runtime is not resource-ready near the floor and the transport
adapter awaits the Expo-vs-direct owner choice. 038 accepts the C3 inventory; `7a6a78e`/039 accepts
tenant-memory teardown and `2dfe6ab`/040 accepts the shared read contract. After cleanup,
15,624,884 KiB is free. Chat RLS/Realtime migration,
provider keys, real delivery/recipients and hardware remain gated.
The 023 owner choices still gate final native-writing UX.
The revised goal text is in the plan; the application's recreated goal is active (19 September).

## Authority

Existing local implementation, focused tests, required gates and owned local commits continue
within the latest user scope. Cleanup of identified disposable task artifacts is authorized.
Push/deploy, remote CI dispatch, hosted migrations/data writes, real accounts/data/email,
credentials, spending and physical-device work need applicable explicit authorization.
Preserve existing approval; ask only for a genuinely new operation/choice.
004 remains 25/27 with two postponed hardware checks; 010 remains 6/7 with revoked-link and
wrong-account refusals unproved through the live product. Do not recreate its live fixture.
Decisions #17 and #21–26, the shared annotation contract and MIGRATION route ownership remain.
Historical GitHub token revocation is still pending; never read/print its value to check it.
Known dependency-audit findings remain open; no force downgrade or blanket security relaxation.

## Copyable startup prompt

> Work in /Users/alidiyarduran/Antigravity/genovakorist. Read AGENTS.md, this short handoff,
> memory-bank/activeContext.md, brief 040 and the revised goal/resource controls in
> docs/mobil-teslim-plani.md. Verify current state. Resume the exact next owned outcome,
> preserve the 10 GiB free-space floor and all acceptance/approval boundaries, capture small
> redacted evidence, clean owned artifacts and continue only to a ready bounded task.
