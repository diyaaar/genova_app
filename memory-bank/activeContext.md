# Active context

Updated 18 September 2026. [WF-007](../docs/briefs/WF-007-bounded-execution-and-disk-budget.md)
owns resource controls; `6a5769a` fixes 033's reproduced early-401 refresh failure.
The product SecureStore remains unchanged; runtime acceptance stays open.
The [handoff](../docs/agent-handoff.md) is the short entry; the
[delivery plan](../docs/mobil-teslim-plani.md#revised-goal-text) owns the revised objective,
dependencies and resource controls. Do not duplicate the historical brief narrative here.

## Current checkpoint

- Product revision: `6a5769a`. Recorded remote `a13f696`;
  no fetch/push/deploy. [Progress](progress.md) links dated historical acceptance.
- 033/C1 remains OPEN. Missing iOS feature/fault evidence and invalidated Android runtime checks persist.
  See [033](../docs/briefs/033-composed-permanent-webview-runtime.md#current-checkpoint--18-september-2026).
- Real synthetic credential delivery and fixture-backed bundle scans passed in the interrupted
  run; the unsigned build's SecureStore failure was repaired operationally by using Xcode's normal
  simulator signing. Current normal Release reached sign-in on first launch/relaunch with no
  keychain error. Memory-only storage/manual bundle substitutions remain rejected.
- Current offline normal arm64 Android Release, APK signature/alignment, merged manifest,
  permission/backup rules and bundle-isolation scans passed. It was not run on an emulator.
- Mobile typecheck and 33 suites/197 tests passed on 18 September. Root/export evidence remains
  historical, not rerun. New error/retry tests do not prove native signing or runtime acceptance.
- The unrelated `supabase/.temp/cli-latest` change stays unstaged.
- Repaired guarded iOS Release passed early-401 forced refresh/reproof and persisted actual
  SecureStore relaunch against disposable services. Revoked refresh ended signed-out; full
  ordering/cache cleanup is not inferred. Password change/restore requires user UI hand-off.
- Final cleanup: target/source baselines verified; runtime, generated iOS/web builds, exact 033
  simulator and Colima profile/data/context removed; owned service ports closed.
  Native projects/builds/apps, exact simulator, screenshots and 6,073,416 KiB Colima data removed.
  Actual free space measured 25,830,536 KiB (~24.6 GiB); previous stale 021 disk remains removed.
  Shared caches/device pool were not purged. Recheck before allocating.
- Latest owner requirement: keep roughly 10 GB free; policy uses a conservative 10 GiB floor.
  One outcome, up to three actions, two unsuccessful approaches then causal reassessment,
  and a progress review every 60 active minutes. Current cached Expo Doctor FAIL 20/21: three
  Expo patch mismatches. Next: exact patch assessment/preflight/alignment and required gates;
  no SDK migration/check exclusion or runtime recreation merely to replay passed checks.
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
