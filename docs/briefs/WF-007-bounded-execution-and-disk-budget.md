# WF-007 — Bounded execution and disk budget

15 September 2026. Status: DOCUMENTATION AND OWNED CLEANUP ACCEPTED.
Single writer/self-reviewer: main agent. The product goal remains incomplete.

## Outcome and scope

Make the existing delivery loop follow small user outcomes with bounded retries, short
handoffs and measured disk use; safely remove the current owned disposable 033 environment.
The owner's current request revises instructions and the goal after reviewing the 20-hour
run; their earlier cleanup request remains applicable. This does not resume product work.

- Entry: `main / 692b286`, recorded `origin/main` 67 commits behind; no remote refresh.
- Existing dirty files: two incomplete 033 credential-config source/test edits and unrelated
  `supabase/.temp/cli-latest`. Preserve them unstaged; this documentation task does not accept
  or repair them. No duplicate worktree/install is needed for non-overlapping document edits.
- Sources read: AGENTS, handoff, guide, work cycle, six memory indexes, delivery plan, 033,
  023 decision references, and this thread's user messages and dated cleanup/build history.
  Product decisions, route ownership, 004/010 gates and A–E outcomes are unchanged.
- Observed: goal counter 71,709 seconds; 33 context compactions; 13 September cleanup was
  followed by a fresh environment. These are historical facts, not exact time attribution.
- Allowed edits: this brief; AGENTS; guide/work-cycle/template; delivery plan; handoff;
  KARARLAR for the owner's explicit disk decision;
  current 033 and relevant status indexes. Only short corrections outside primary instructions.
- Cleanup targets: owned `spike/033-runtime`, generated `apps/mobile/ios`, `.next`, exact
  `genova033-ios` simulator and `genova033` Colima profile/data/context. Inspect ownership,
  fixture/source baseline, active processes and actual allocated sizes before deleting.
- Excluded: product fixes, dependencies, real accounts/data, hosted services, CI, publication,
  hardware, global cache purges, other projects and private Codex state writes.
- Rollback: revert only this documentation commit; deleted generated outputs are reproducible,
  not Trash-recoverable. Do not recreate the environment merely to demonstrate rollback.

## Steps

1. Inspect history/current disk, prepare the short policy and revised goal; ask for a disk preference.
2. Clean exact owned artifacts using existing cleanup controls and record before/after evidence.
3. Align active instructions/status, validate links and failure walkthroughs, commit only documents.

## Mandatory acceptance evidence

| Criterion | Required? | Status | Date / environment / check | Evidence and limits |
|---|---|---|---|---|
| Revised loop defines one next result, retry/review limits and unchanged acceptance/authority | yes | PASS | 2026-09-15 document/self-review walkthrough | Work card, two-approach causal review, 60-minute progress check; all ten 033 criteria and all 26 earlier decisions preserved |
| Disk budget includes external task artifacts; cleanup and low-disk behavior are explicit | yes | PASS | 2026-09-15 owner reply, inventory and policy review | Conservative 10 GiB floor; projected peak, external VM/simulator storage, sequential heavy work, lifetime and cleanup checks; not an OS quota |
| Current 033 security/typecheck and cleanup records reflect actual state | yes | PASS | 2026-09-15 boolean bundle scan, existing typecheck evidence and diff | 033 gate corrected to FAIL; two old source edits remain incomplete; no new product pass |
| Exact owned cleanup, baseline and post-cleanup inventory verified | yes | PASS | 2026-09-15 existing runner exit 0 plus exact inventory | Receipt below; target/source baseline checks passed; no retained 033 runtime or global purge |
| Goal text prepared; actual application update or tool limitation stated honestly | yes | PASS | 2026-09-15 goal-tool schema and UI-access check | Revised text saved in the plan; application objective not editable with available tools, UI access denied; product goal left unfinished/usageLimited |
| Links, consistency, diff and ownership checks pass | yes | PASS | 2026-09-15 Node in-memory link/anchor check; git diff --check; self-review | 13 Markdown files / 206 local links, zero missing targets/anchors; 033 criteria and earlier decisions preserved; only owned docs staged; no product build |

## Resource and goal observations

- Before cleanup: filesystem available 7,623,272 KiB (about 7.3 GiB). Allocated owned
  targets: runtime 1,657,404 KiB; generated iOS 633,748 KiB; `.next` 466,160 KiB;
  Colima instance 1,148,344 KiB and separate data disk 6,072,480 KiB. VM configured
  capacity (20 GiB) is not allocated host usage. Simulator storage is additional.
- Goal tools expose creation and completion/blocked status, not objective editing.
  Native UI access to Codex was refused by the computer-use safety restriction.
  The existing goal remains unfinished and `usageLimited`; no private-state workaround.
- OpenAI Docs was consulted for instruction discovery, not a model benchmark or switch:
  [official AGENTS guidance](https://learn.chatgpt.com/docs/agent-configuration/agents-md).
  No measured Sol capacity or efficiency guarantee is claimed.

## Cleanup receipt — 15 September 2026

- Existing `033_composed_runtime_runner.sh cleanup` ran with exact owned runtime/context,
  loopback ports and `PGDATABASE=genova_008_test_restore`. It returned exit 0 with
  `PASS fixture_cleanup target_baseline=restored` and `PASS runtime_cleanup stack=stopped path=removed`;
  its source-hash equality gate passed before stack deletion. No hosted service was touched.
- Deleted simulator `CD046D8E-04FD-40FD-9157-4A1C147B83F2` after shutdown; removed only the
  `genova033` Colima profile including data through its supported delete command. Both completed.
- Confirmed `apps/mobile/ios` and `.next` are ignored, contain no tracked files and are not
  symlinks; deleted their generated contents. The runner already removed `spike/033-runtime`.
- Post-check: runtime, generated directories, simulator directory, profile directory, Lima
  instance and separate data disk all absent; no Colima profile or matching Docker context;
  no listener on 18033/18034/54321. Working dependencies, source DB, user files and global caches
  were retained. Outputs are reproducible; deleted fixture/runtime data is not Trash-recoverable.
- Available filesystem space rose from 7,623,272 to 24,726,128 KiB (7.3 -> 23.6 GiB).
  This is an observed filesystem delta, not an exact sum attributable solely to these deletions.
  No environment/build was recreated after cleanup.
- Owner's reply requested roughly 10 GB free; policy uses 10 GiB conservatively. The previously
  suggested 20 GB reserve and 5/10 GB temporary caps were not adopted.

## Instruction walkthrough (self-review)

| Scenario | Expected action checked against the edited instructions |
|---|---|
| Current 033 has three type errors and no runtime | Resume the two owned edits; fix config/runtime agreement before heavy setup; do not replay 018–032 |
| Filesystem has 7.3 GiB free | Clean owned artifacts and do low-allocation work; no build/download/VM creation |
| 23.6 GiB free, estimated extra peak 14 GiB | Refuse the proposed heavy batch because 9.6 GiB would remain; reduce peak or seek a concrete alternative |
| Same UI approach fails twice | Record evidence/cause; a further attempt requires a changed, evidence-backed approach; no identical rerun |
| Cleanup requested while a brief is incomplete | Capture redacted receipt, clean, keep failed/unrun criteria open and record exact next repair |
| Required C1 row or external/device authority absent | No C2 acceptance, live fixture or hardware substitution; prepare a concrete independent outcome or stop dependent work |
| Document-only update or fresh/compacted session | Short current entry and relevant links; no product build or full historical reread |

These are document walkthroughs, not a measured GPT-5.6 Sol execution trial or a disk quota test.

## Delivery

Short handoff: 364 -> 72 lines; active context: 142 -> 37 lines. Historical details remain in
the original linked briefs and Git history; no second archive or test framework was created.
Commit scope is these 13 Markdown files only. Two old product edits and CLI cache remain
unstaged. This implements the owner's instruction/resource revision and cleanup, not 033's fix.
Next product work is the 033 credential/typecheck repair in its current work card. Receiving
agents must read the revised controls; no model was switched or benchmarked in this task.
