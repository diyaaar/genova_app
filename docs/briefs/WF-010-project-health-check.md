# WF-010 — Local project health check

**Status/date/writer:** DOCUMENTATION ACCEPTED / 2026-09-25 / primary agent.

**Observable result:** A dated, Turkish Markdown report distinguishes inspected local code and
resources from historical acceptance and unverified live/device/store behavior.

**Current work card:** Inspect repository state, rules, implementation and disk footprint;
run bounded local quality gates; record findings, evidence layers and next three actions.
Exit: report link/consistency checks, scoped documentation commit and owned-output cleanup.

**Start evidence:** `main` at `1272415`; remote `main` at `a13f696` (171 local commits ahead);
only `supabase/.temp/cli-latest` is dirty and user-owned. `df -h .` reports 39 GiB free.
Repository is 4.3 GiB, primarily root/mobile dependencies (1.5/2.4 GiB). Existing native
simulator/AVD stores outside the repository are 9.8/2.2 GiB and ownership is unproven.

**Resources:** Existing installed dependencies are reused. Prior `pnpm check` and mobile tests
left no large build output. Estimated additional peak for one sequential web build/test batch is
under 3 GiB; measured free space leaves more than 10 GiB after that estimate. No downloads,
new VM or simulator boot. Remove only this audit's derived build/coverage output after checks;
do not remove existing dependencies, backups, simulators, logs or unknown files.

## Transition start check

- Read `AGENTS.md`, handoff, active context, WF-009, delivery controls, transition guide, work
  cycle, relevant MIGRATION/decisions and the brief template. Current task is a read-only product
  audit plus a documentation report, not permission for provider, DB, push, deploy or hardware.
- One result: evidence-backed health report. Native/WebView and shared contracts are inspected,
  not changed; no production source files may be edited.
- Allowed writes: this brief and `docs/reports/2026-09-25-proje-saglik-kontrolu.md`; generated
  local test/build outputs are temporary and owned by this audit. Single writer.
- Required local checks: Git/remote/diff, disk and large-file inventory, document consistency,
  installed root/mobile test gates within disk budget, report links and `git diff --check`.
  Real provider, deployed web, physical devices and stores are NOT RUN.
- Rollback: revert the documentation commit; test output is disposable. Preserve the unrelated
  CLI marker and existing user data.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? | Status | Evidence and limit |
|---|---|---|---|
| Report states current revision, local/remote gap and dirty ownership | yes | PASS | 2026-09-25 `git status`, direct `ls-remote`, ancestor count 171; live host still unknown. |
| Report separates current local tests, historical acceptance and unverified external layers | yes | PASS | Current root/mobile gates and failed E2E environment are distinguished from 004/010/064 historical or open evidence. |
| Repo and external disk footprint is measured; no unowned deletion | yes | PASS | `df`, `du`, tracked-size and simulator/AVD inventory; only this audit's `.next` (530 MiB), coverage and E2E results removed. About 40.2 million KiB remained free. |
| Rules/priorities and actual implementation are cross-checked with concrete discrepancies | yes | PASS | AGENTS, MIGRATION, handoff, current plan, last 15 commit scopes and local source checked; stale 051 and next-gate pointers named in report. Self-audit only. |
| Report links, consistency, scoped diff and retained free space verified | yes | PASS | 11 local Markdown links/zero missing; staged diff check and owned commit reviewed; unrelated CLI marker excluded. |
| Hosted/provider/device/store acceptance | no — outside audit | NOT RUN | No external mutation or runtime. |

Required FAIL or NOT RUN keeps this brief open. Self-review is not independent review.

## Result and handoff

- Web root `pnpm check` PASS on 2026-09-25: 90 files/797 tests, lint, typecheck,
  service-worker syntax and production build.
- Mobile `npm run typecheck && npm test -- --runInBand` PASS: 49 suites/288 tests.
- Supplementary `pnpm test:e2e` PARTIAL: 4/30 API cases PASS; 26 browser cases could not
  launch because Playwright's Chromium binary was absent. No app UI pass/fail is inferred;
  no browser was downloaded solely for this audit.
- Scoped report: [25 September project health check](../reports/2026-09-25-proje-saglik-kontrolu.md).
  No product, provider, hosted, user-data, device or publication mutation. Document self-review
  only; next product outcome remains the local activation/reconciliation brief.
- Only audit-generated `.next`, coverage and `test-results` were removed after use. Existing
  dependencies, global simulator/AVD data, SQL backups and unrelated CLI marker remain.
