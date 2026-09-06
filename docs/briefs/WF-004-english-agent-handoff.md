# WF-004 — English agent handoff and pilot-first delivery

Date: 2026-09-06. Status: documentation accepted. Single writer: main agent.

## Outcome and authority

Prepare a reviewable English handoff for a new, less capable model, with explicit
acceptance evidence and the approved mobile-pilot priority. The user approved this
documentation work and requested English. This is not authorization to deploy 008,
create/delete production test identities, send email, or start paid services.

## Start check

- Clean `main` at `5d1b234`; Git identity is `genesinovachoir`.
- Read: root AGENTS, all six memory-bank files, AI work cycle, migration guide,
  MIGRATION, KARARLAR, delivery plan, 004/008/010, relevant 009 evidence, existing
  handoff/brief templates and `.github/workflows/ci.yml`.
- Preserve RN + Expo, shared annotation contract, native/WebView boundaries,
  existing production status, historical evidence and accepted account-risk decision.
- Allowed: this brief, English handoff, existing instruction/templates, delivery
  plan, decision/status files and relevant brief next-step references.
- Excluded: product code, dependencies, CI configuration, remote writes and global memory.
- Validation: local Markdown links, decision/status consistency, handoff scenario
  review, `git diff --check`. No product tests required for documentation only.
- Rollback: revert this documentation commit; no database or external rollback needed.

## Implementation

1. Record decision #21: minimum invitation acceptance, then native shell/PDF/pilot;
   limits remain pre-store work unless a measured pilot blocker requires them earlier.
2. Add an English handoff that routes to existing authoritative records and contains
   a copyable start message, status boundaries, first actions and escalation rules.
3. Require evidence per acceptance criterion; distinguish self-review from independent
   review. Preserve existing automated CI and explicitly state its unverified boundaries.
4. Update the active indexes and check a simulated next-session entry.

## Acceptance

- [x] English handoff is reachable from AGENTS and the migration guide.
- [x] Active roadmap/004/008/010/memory references agree with decision #21.
- [x] Required failures/not-run checks prevent closure; scores cannot override them.
- [x] Current CI coverage is described without claiming new enforcement or a live run.
- [x] Startup, blocked-live-work and failed-test scenarios lead to the intended action.
- [x] Links and diff pass; documentation ready for the WF-004 commit; no product or remote change.

## Evidence

All checks below: 2026-09-06, local documentation changes based on `5d1b234`.

| Required criterion | Status | Evidence / limits |
|---|---|---|
| Discoverable English entry point | PASS | Links from AGENTS and migration guide resolve to the handoff; startup message routes back to authoritative files. |
| Consistent priority | PASS | Reviewed roadmap rows, #21, MIGRATION, 004/008/010 next steps and affected memory files. Targeted `rg` leaves only explicitly historical pre-limit wording in 004. |
| Evidence prevents false closure | PASS | AGENTS, work cycle and brief template require evidence and retain required FAIL / NOT RUN; self-review is labeled separately. |
| CI described accurately | PASS | Read existing quality/audit/browser jobs; handoff states config is not a successful remote run or branch protection. Native CI belongs to 004 implementation. |
| Handoff scenarios | PASS | Manual self-review: startup reads sources; blocked 010 permits only independent authorized 004 work; failed device/test gate stays pending; high-risk redesign returns a concrete review question. No second model was run. |
| Document integrity and scope | PASS | Node local-link check: 16 Markdown files, 107 local links, zero missing targets; `git diff --check` passed. Diff limited to instructions, plans, templates and memory indexes. |

Prior tests remain historical; no new device, database, provider, CI or model-performance
test is claimed. No automatic enforcement of every prose rule was added. Final delivery
is the documentation-only commit whose message contains WF-004; no push or deployment.
