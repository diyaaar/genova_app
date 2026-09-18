# Active context

Updated 18 September 2026. [WF-007](../docs/briefs/WF-007-bounded-execution-and-disk-budget.md)
owns resource controls; `5a9fb8f` fixes 033's reproduced session-startup loading failure.
The product SecureStore remains unchanged; runtime acceptance stays open.
The [handoff](../docs/agent-handoff.md) is the short entry; the
[delivery plan](../docs/mobil-teslim-plani.md#revised-goal-text) owns the revised objective,
dependencies and resource controls. Do not duplicate the historical brief narrative here.

## Current checkpoint

- Product revision: `5a9fb8f`. Recorded remote `a13f696`;
  no fetch/push/deploy. [Progress](progress.md) links dated historical acceptance.
- 033/C1 remains OPEN. Missing iOS feature/fault evidence and normal Android Release persist.
  See [033](../docs/briefs/033-composed-permanent-webview-runtime.md#current-checkpoint--18-september-2026).
- Real synthetic credential delivery and fixture-backed bundle scans passed in the interrupted
  run; unsigned iOS Release SecureStore failed. Memory-only storage/manual bundle substitutions
  were rejected and removed. Next: budget a native-only correctly signed Release startup check,
  without recreating the server stack first; preserve all remaining composed platform rows.
- Mobile typecheck and 33 suites/194 tests passed on 18 September. Root/export evidence remains
  historical, not rerun. New error/retry tests do not prove native signing or runtime acceptance.
- The unrelated `supabase/.temp/cli-latest` change stays unstaged.
- Cleanup: target/source baselines verified; runtime, generated iOS/web builds, exact 033
  simulator and Colima profile/data/context removed; owned service ports closed.
  Cleanup repeated on 18 September; free space measured 19.0 GiB. Recheck before allocating.
- Latest owner requirement: keep roughly 10 GB free; policy uses a conservative 10 GiB floor.
  One outcome, up to three actions, two unsuccessful approaches then causal reassessment,
  and a progress review every 60 active minutes. No new heavy environment in this repair.
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
