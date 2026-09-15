# Active context

Updated 15 September 2026. [WF-007](../docs/briefs/WF-007-bounded-execution-and-disk-budget.md)
revises execution instructions and records cleanup. Product progress is unchanged.
The [handoff](../docs/agent-handoff.md) is the short entry; the
[delivery plan](../docs/mobil-teslim-plani.md#revised-goal-text) owns the revised objective,
dependencies and resource controls. Do not duplicate the historical brief narrative here.

## Current checkpoint

- Product revision: `692b286`; workflow-only commits follow. Recorded remote `a13f696`;
  no fetch/push/deploy. [Progress](progress.md) links dated historical acceptance.
- 033/C1 remains OPEN. Missing iOS feature/fault evidence and normal Android Release persist.
  See [033](../docs/briefs/033-composed-permanent-webview-runtime.md#current-checkpoint--15-september-2026).
- Two owned uncommitted credential-config source/test edits are incomplete: runtime still
  references removed password fields. TypeScript had three errors on 15 September.
  Synthetic passwords were confirmed in the old local acceptance bundle before its removal.
  Fixing the credential channel and passing affected checks is the next product outcome.
- The unrelated `supabase/.temp/cli-latest` change stays unstaged.
- Cleanup: target/source baselines verified; runtime, generated iOS/web builds, exact 033
  simulator and Colima profile/data/context removed; owned service ports closed.
  Free space measured 23.6 GiB after cleanup. Recheck before allocating.
- Latest owner requirement: keep roughly 10 GB free; policy uses a conservative 10 GiB floor.
  One outcome, up to three actions, two unsuccessful approaches then causal reassessment,
  and a progress review every 60 active minutes. No environment recreation for this doc task.
- The revised goal is saved in the plan. The application goal is still `usageLimited`;
  objective editing is unavailable and UI access was denied. It was not marked complete.

## Preserved boundaries

004: 25/27, hardware postponed. 010: 6/7, live product refusal paths still open; no new fixture.
M0/A1–A3 accepted locally; 018–032 historical acceptance remains. B2/B3 depend on
[023's four owner choices](../docs/briefs/023-annotation-write-contract-inventory.md#owner-decision-packet).
C2–C5 and release/store work remain pending; no C1 acceptance is inferred.
Local-work authority persists within current scope. External actions, real data/accounts,
email, credentials, spending, CI dispatch, publication and hardware retain their gates.
Decision #17/account risk and historical GitHub-token revocation remain unresolved.
