# WF-008 — Android-first product delivery reset

**Status / date / writer:** DOCUMENTATION ACCEPTED / 2026-09-20 / primary agent

**Outcome:** Replace feature-by-feature drift with one Android-first delivery sequence toward
the same production product and its eventual two-store release. A usable beta is an intermediate
release, not a disposable demo or completion of the full roadmap.

**Starting evidence:** Owner approved Android first, retaining Supabase when appropriate,
separate storage, a preferred $5/month infrastructure budget, web onboarding/payment preference,
five free members per choir with only additional members billable, and deferring individual sales.
The immediately preceding R2 recommendation is adopted as the implementation target, not as
account activation, spending or production migration authority. The old application goal was
absent when inspected. HEAD was `d8dd8e3`; unfinished 051 product edits remain agent-owned;
`supabase/.temp/cli-latest` remains unrelated and unstaged.

**Work card:** (1) Record decisions and release/test priorities; (2) reconcile current handoff and
051's failing checkpoint; (3) validate documentation and create the replacement full-scope goal.
Exit: consistent sources and an actual goal-tool receipt, without claiming product acceptance.

**Resources:** 21,340,568 KiB free at inspection, approximately 20.35 GiB. Documentation only;
no environment, installation or build required. No new temporary output retained.

**Allowed files:** AGENTS.md, KARARLAR.md, MIGRATION.md, delivery plan, store/infrastructure
records, short handoff and active/progress indexes, this brief and 051's checkpoint only.
No product edits in this planning task. Preserve all owned unfinished source files.

**Start check:** Read AGENTS, handoff/active context, delivery execution controls, transition
guide, work cycle and brief template; inspect current Git/disk/goal state. Relevant primary
sources are 023's unresolved annotation choices, 051 and infrastructure/store records.
One writer; existing native/WebView ownership, shared annotations, live web and tenant boundaries
remain. Rollback is this documentation commit; no database rollback is involved.

**Decisions and remaining choices:** Decision #28 and the delivery plan own the new order and
commercial scope. Member price, billing interval, billable-member lifecycle, optional-feature
catalogue/prices, annotation choices in 023, push transport, retention policy, provider region,
developer account identity and release authority remain unresolved. Do not turn these into a
large questionnaire: inspect existing behavior and ask only the choice that blocks the next flow.
Do not invent paid feature restrictions or revoke existing access to create a free plan.

**Known 051 checkpoint:** Earlier mobile 48 suites/272 tests, root 65 files/602 tests/build and
both exports passed before a later state-queue change. Latest focused run after that change:
43 tests PASS, 2 FAIL. Both failures involve test synchronization with the new queued transport;
that is a diagnosis to verify, not acceptance. Panel-only stars, unknown-vs-unstarred initial
state, lifecycle cancellation and strict cursor handling also need final review before closure.
Do not reuse pre-change green results as final evidence. Generated .next, coverage and both 051
export folders were already removed; sources remain. Complete or explicitly checkpoint 051,
then select the storage/read integration path, not automatically a new chat subfeature.

## Evidence

| Criterion | Required? | Status | Evidence / limits |
|---|---|---|---|
| User choices mapped to one delivery plan with beta and store exits | yes | PASS | 20 Sep: decisions #28–31, current delivery sequence and canonical objective reviewed; full A–E scope retained |
| Android-first tests retain two-platform release acceptance and 004/010 gaps | yes | PASS | 20 Sep: AGENTS/plan retain required gates and platform-sensitive early checks; beta does not complete the goal |
| Budget, provider and payments are not mistaken for live authority or store approval | yes | PASS | 20 Sep: $5 preference, R2 preparation and store-policy limits explicit; no provider or monetary action |
| Links, diff and state consistency | yes | PASS | 20 Sep: 11 files / 189 local links / zero missing; git diff --check clean; handoff 65 lines, active context 52 lines |
| Replacement application goal created with full scope | yes | PASS | 20 Sep: get_goal returned null before creation; create_goal returned active for thread 01a08299-0d2a-7571-82f0-55b5544c67bf with the exact canonical objective; no token budget supplied |
| Product, provider, device or publication acceptance | N/A: planning only | N/A | No new product tests or external mutations |

Review is self-review. Do not mark the overall product complete when this planning brief closes.

**Delivery:** Documentation-only commit; 051 product edits and the unrelated CLI cache are not
included. No heavy tests rerun for planning. No generated outputs added. Next: resolve/checkpoint
051 as recorded, then private-storage/read integration. The overall product goal remains active.
