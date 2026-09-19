# Active context

Updated 19 September 2026. [WF-007](../docs/briefs/WF-007-bounded-execution-and-disk-budget.md)
owns resource controls; [042](../docs/briefs/042-chat-social-membership-authority.md) now owns C3's
second accepted authority repair after 038–041. Product `c58f4da` binds social rows to room/actor;
`cb4e7ec` closes arbitrary room self-join/membership escalation; `2dfe6ab` validates shared read
data; `7a6a78e` resets chat process memory; `b1d565f` remains the native
push registration protocol after [036](../docs/briefs/036-native-push-token-lifecycle-inventory.md)
fixed the lifecycle, `04319e3` added the permission/tap consumer and `6883b3b` added the C2 event
contract, following the final C1 product repair `69714b1`.
The product SecureStore remains unchanged; 033/C1 runtime acceptance is locally complete.
The [handoff](../docs/agent-handoff.md) is the short entry; the
[delivery plan](../docs/mobil-teslim-plani.md#revised-goal-text) owns the revised objective,
dependencies and resource controls. Do not duplicate the historical brief narrative here.

## Current checkpoint

- Product revision: `c58f4da`. Recorded remote `a13f696`;
  no fetch/push/deploy. [Progress](progress.md) links dated historical acceptance.
- 033/C1 is **ACCEPTED LOCALLY**. Guarded Android credential/session/sign-out, the bounded guarded
  iOS feature/fault batch and the owner-operated iOS password change/restore all pass. See
  [033](../docs/briefs/033-composed-permanent-webview-runtime.md#current-checkpoint--19-september-2026).
- Real synthetic credential delivery and fixture-backed bundle scans passed in the interrupted
  run; the unsigned build's SecureStore failure was repaired operationally by using Xcode's normal
  simulator signing. Current normal Release reached sign-in on first launch/relaunch with no
  keychain error. Memory-only storage/manual bundle substitutions remain rejected.
- Before patch alignment, normal arm64 Android Release, APK signature/alignment, merged manifest,
  permission/backup rules and bundle-isolation scans passed. It was not run on an emulator.
- Patch gates: mobile typecheck/33 suites/197 tests, root lint/typecheck/55 files/467 tests/build,
  normal exports/isolation and Doctor 21/21 PASS. Post-alignment normal signed iOS native build,
  signature/Info.plist/isolation and empty SecureStore startup/relaunch PASS; others NOT RUN.
- The unrelated `supabase/.temp/cli-latest` change stays unstaged.
- [034](../docs/briefs/034-notification-deep-link-contract.md) is **ACCEPTED LOCALLY**: all seven
  server event types derive C1-policy canonical destinations, assignment query drift is removed,
  malformed/override fields fail closed and the server-owned notification UUID is the duplicate
  key. Root 56 files / 488 tests, coverage, service-worker syntax and build pass. Provider/device
  delivery, permission and token lifecycle were not run.
- [035](../docs/briefs/035-native-notification-tap-runtime.md) is **ACCEPTED LOCALLY**: permission is
  user-triggered; authenticated initial/live taps reuse 034, clear/suppress duplicates, route exact
  WebView/access-controlled repertoire targets and fail visibly for unavailable/hostile targets.
  Mobile 36 suites/216 tests, Expo config and production iOS JS export pass. Native binary/runtime,
  token/backend/provider and real delivery remain unrun.
- [036](../docs/briefs/036-native-push-token-lifecycle-inventory.md) is **DOCUMENTATION ACCEPTED**:
  the browser table/RPC/VAPID sender cannot accept native tokens safely, so a separate native
  relation/transport path preserves web behavior. Account, current choir, installation, token
  generation/rotation, permission refusal, sign-out/offline revocation and stale-provider cleanup
  are specified. Expo-first is recommended; the owner transport choice remains open.
- [037](../docs/briefs/037-native-push-registration-protocol.md) is **ACCEPTED LOCALLY** at
  `b1d565f`: fail-closed v1 register/revoke/receipt shapes, explicit transport/platform,
  safe generation/current-scope guards and redacted diagnostics pass focused 52 tests and the full
  57-file/540-test root gate. It performs no token, network, storage, schema or provider action.
- [038](../docs/briefs/038-native-chat-feature-inventory.md) is **DOCUMENTATION ACCEPTED**: every
  current chat capability is assigned to a bounded C3 slice. The dated repository schema exposes
  self-expanded room membership/role, broad same-choir poll/reaction/star policies, public
  Broadcast/Presence, unstable pagination/retry and stale in-memory tenant state. This is not a
  live-schema check or authority remediation.
- [039](../docs/briefs/039-chat-tenant-memory-teardown.md) is **ACCEPTED LOCALLY** at `7a6a78e`:
  successful ordinary/embedded tenant teardown synchronously resets the real chat Zustand store;
  rejected sign-out preserves it. Focused 23 tests and the 57-file/542-test root gate pass. Exact
  489 MiB `.next`/332 KiB coverage outputs were removed, leaving 15,592,952 KiB free. Its then-next
  shared room/message contract is now accepted under 040; DB authority, Realtime and native runtime
  remain open.
- [040](../docs/briefs/040-shared-chat-read-contract.md) is **ACCEPTED LOCALLY** at `2dfe6ab`:
  framework-free room/message validators, compatible-unknown fallback, account/choir/member scope
  and microsecond `(created_at,id)` order/dedup pass 29 focused root tests, the mobile 37-suite/
  218-test gate and root 58-file/571-test gate. Exact 490 MiB `.next`/332 KiB coverage outputs were
  removed, leaving 15,624,884 KiB free. No current query, DB or native runtime adopts it yet.
- [041](../docs/briefs/041-chat-room-membership-authority.md) is **ACCEPTED LOCALLY** at `cb4e7ec`:
  creator/admin member management and own read/mute/hide preferences remain while arbitrary
  same-choir self-join, role escalation and membership reidentity refuse. Forward/down/re-forward
  pass on a disposable PostgreSQL 17 clone; root 58 files/571 tests/build pass. The target and exact
  build outputs were removed. This is dated local-schema evidence, not hosted application.
- [042](../docs/briefs/042-chat-social-membership-authority.md) is **ACCEPTED LOCALLY** at `c58f4da`:
  reactions, polls, votes and stars now require current room/actor authority; exact reaction/vote
  no-op upserts and current web flows remain. Two-room/two-choir forward/down/re-forward and root
  58 files/571 tests/build pass. Message status, core messages, poll anonymity and Realtime remain.
- Repaired guarded iOS Release passed attendance mutation, external Realtime invalidation, exact
  protected PDF cleanup, first/terminal second-401 with native retry, tenant isolation, WebView
  sign-out and cold-relaunch signed-out state. The owner then performed both native password
  submissions; the change showed visible success and a fresh one-use original fixture credential
  opened a new Auth session after restoration. The agent never handled either password.
- Current Android evidence: cached-toolchain guarded arm64 Release/signature/alignment/SDK/manifest
  and fixture-password scan PASS; fresh API 36 AVD consumed one credential, persisted SecureStore
  through cold restart, then WebView sign-out cleared native session and refused closed-channel reuse.
- Current normal Android Release/signature/alignment/SDK/ABI/manifest/SecureStore-backup/bundle
  isolation also PASS on post-alignment dependencies; all exact generated outputs were removed.
- Final cleanup: target baseline restored; runtime, generated native/web builds, exact app/simulators,
  wrapper and Colima profile/data/context removed; owned service ports closed. Final password-run
  recheck 18,478,116 KiB (~17.6 GiB). Shared caches/device pool were not purged. Recheck before allocating.
- Latest owner requirement: keep roughly 10 GB free; policy uses a conservative 10 GiB floor.
  One outcome, up to three actions, two unsuccessful approaches then causal reassessment,
  and a progress review every 60 active minutes. Expo patch failure resolved without exclusions.
  An orphan inactive task-owned 033 VM disk was removed before 041. After 041's exact DB/build
  cleanup, 21,683,500 KiB (~20.7 GiB) remained free. C2's adapter still awaits the Expo-vs-direct
  owner choice. C3 is accepted through 042's social authority slice; durable message-status
  authority is next, with core messages/publication/private Realtime/native runtime separate. Do not infer hosted DB,
  provider or device delivery from local tests.
- The revised goal is saved in the plan. The recreated application goal is active;
  objective editing is unavailable. It was not marked complete.

## Preserved boundaries

004: 25/27, hardware postponed. 010: 6/7, live product refusal paths still open; no new fixture.
M0/A1–A3 accepted locally; 018–032 historical acceptance remains. B2/B3 depend on
[023's four owner choices](../docs/briefs/023-annotation-write-contract-inventory.md#owner-decision-packet).
C2 token/provider delivery beyond accepted 034–037, C3 implementation beyond accepted 042,
C4–C5 and release/store work remain pending; C1
acceptance is local simulator/emulator evidence,
not hosted-provider, real-account, hardware or distribution acceptance.
Local-work authority persists within current scope. External actions, real data/accounts,
email, credentials, spending, CI dispatch, publication and hardware retain their gates.
Decision #17/account risk and historical GitHub-token revocation remain unresolved.
