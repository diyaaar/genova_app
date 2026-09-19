# Active context

Updated 19 September 2026. [WF-007](../docs/briefs/WF-007-bounded-execution-and-disk-budget.md)
owns resource controls; `69714b1` contains the final agent-operable iOS feature/fault repair after
the Expo alignment `851e9cd` and early-401 repair `6a5769a`.
The product SecureStore remains unchanged; runtime acceptance stays open.
The [handoff](../docs/agent-handoff.md) is the short entry; the
[delivery plan](../docs/mobil-teslim-plani.md#revised-goal-text) owns the revised objective,
dependencies and resource controls. Do not duplicate the historical brief narrative here.

## Current checkpoint

- Product revision: `69714b1`. Recorded remote `a13f696`;
  no fetch/push/deploy. [Progress](progress.md) links dated historical acceptance.
- 033/C1 remains OPEN. Guarded Android credential/session/sign-out and the bounded guarded iOS
  feature/fault batch now pass. Only successful iOS password change/restore through user UI hand-off persists. See
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
- Repaired guarded iOS Release passed attendance mutation, external Realtime invalidation, exact
  protected PDF cleanup, first/terminal second-401 with native retry, tenant isolation, WebView
  sign-out and cold-relaunch signed-out state. Password change/restore requires user UI hand-off.
- Current Android evidence: cached-toolchain guarded arm64 Release/signature/alignment/SDK/manifest
  and fixture-password scan PASS; fresh API 36 AVD consumed one credential, persisted SecureStore
  through cold restart, then WebView sign-out cleared native session and refused closed-channel reuse.
- Current normal Android Release/signature/alignment/SDK/ABI/manifest/SecureStore-backup/bundle
  isolation also PASS on post-alignment dependencies; all exact generated outputs were removed.
- Final cleanup: target baseline restored; runtime, generated native/web builds, exact app/AVD,
  wrapper and Colima profile/data/context removed; owned service ports closed. Final available
  latest recheck 25,688,468 KiB (~24.5 GiB). Shared caches/device pool were not purged. Recheck before allocating.
- Latest owner requirement: keep roughly 10 GB free; policy uses a conservative 10 GiB floor.
  One outcome, up to three actions, two unsuccessful approaches then causal reassessment,
  and a progress review every 60 active minutes. Expo patch failure resolved without exclusions.
  Next: only the bounded successful iOS password change/restore user hand-off; do not replay passed
  Android/iOS scenarios and never enter or submit the user's new password.
- The revised goal is saved in the plan. The recreated application goal is active;
  objective editing is unavailable. It was not marked complete.

## Preserved boundaries

004: 25/27, hardware postponed. 010: 6/7, live product refusal paths still open; no new fixture.
M0/A1–A3 accepted locally; 018–032 historical acceptance remains. B2/B3 depend on
[023's four owner choices](../docs/briefs/023-annotation-write-contract-inventory.md#owner-decision-packet).
C2–C5 and release/store work remain pending; no C1 acceptance is inferred.
Local-work authority persists within current scope. External actions, real data/accounts,
email, credentials, spending, CI dispatch, publication and hardware retain their gates.
Decision #17/account risk and historical GitHub-token revocation remain unresolved.
