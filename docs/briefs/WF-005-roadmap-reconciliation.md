# WF-005 — Reconcile delivery records before repertoire work

Date: 2026-09-08. Status: documentation accepted. Single writer: main agent.

## Outcome and authority

Bring the canonical roadmap, handoff and status indexes into agreement with the accepted
evidence before opening the native repertoire implementation. The owner authorized local
implementation, local commits, read-only live checks and repository gates. This brief does
not authorize a push, deployment, migration, production-data write or deletion, real choir
access, email, spending or hardware testing.

## Start check

- Verified local branch `main`, HEAD `50149cb48124965c23e92624e9206ae0b3d52013`, and
  remote `main` at `a13f696da8c731e9af2a2bce473d4f4ae4a81587` on 2026-09-08.
- The only pre-existing working-tree change is `supabase/.temp/cli-latest`; it is not owned
  by this task and will remain unstaged.
- Read root AGENTS, the handoff, migration guide, work cycle, all six memory-bank files,
  MIGRATION, KARARLAR, the delivery/store/infrastructure plans and briefs 004/007/010/012.
- A Chrome session under the Genesi Nova profile is open on the GitHub repository; its
  Supabase project tab is available for read-only checks. No browser write is part of this brief.
- Preserve: 007 complete with its operator allow-list record still present; 008 live; 010 at
  6/7 with two product-level negative paths NOT RUN; 011 and 012 complete/live; 004 at 25/27
  with both remaining hardware criteria postponed.
- Allowed files: this brief, roadmap/status/handoff documents and relevant memory-bank indexes.
- Excluded: production code, dependencies, CI configuration and all external writes.
- Validation: local Markdown links, targeted contradiction search, `git diff --check`, and
  manual scope review. Product tests are not required for documentation-only changes.
- Rollback: revert the WF-005 documentation commit; no external rollback is needed.

## Work packages recorded by this reconciliation

1. Establish the shared native repertoire contract and inventory in a dedicated brief.
2. Implement a native, choir-scoped repertoire catalogue against an isolated/testable boundary.
3. Add the smallest shared Edge file-access contract needed by both clients, with tenant and
   authorization tests before any live change.
4. Implement PDF rendering and read-only annotation display in the native product, preserving
   the shared TypeScript annotation contract and fail-closed behavior.
5. Run non-hardware local/platform gates and record real-device items as NOT RUN until the owner
   separately authorizes hardware testing.
6. Continue with write annotations, audio, permanent WebViews, chat, assignments/home,
   plan limits, storage migration and store readiness as separate briefs. Provider, live-data,
   spending and release actions retain their own authorization gates.

## Acceptance

- [x] Current 004, 007, 008/010, 011 and 012 states agree across canonical records.
- [x] The delivery plan names a substantial ordered backlog through store readiness without
  presenting estimates, provider choices or external writes as accepted facts.
- [x] Historical provider/store notes are visibly dated and require an official refresh before use.
- [x] The next bounded task is the native repertoire contract/inventory, not postponed hardware
  work and not 010 fixture recreation.
- [x] Documentation links, contradiction checks and diff checks pass; scope is documentation only.

## Evidence

| Required criterion | Status | Evidence / limits |
|---|---|---|
| Canonical status consistency | PASS | 2026-09-08 targeted search across handoff, MIGRATION, roadmap, active/progress/system indexes and 004/007 records. Current records agree: 004 25/27, 010 6/7, 011/012 complete, 007 accepted and its single operator row preserved. Older 23/27 text remains only as dated history inside 004. |
| Ordered delivery backlog | PASS | Delivery plan now carries 13 ordered stages through store readiness, with per-stage exit and excluded scope; no schedule estimate was promoted to a commitment. |
| Historical-rule boundary | PASS | Store and infrastructure records now label old price/quota/test-rule claims as dated and require official refresh before purchase or release work. No web research is claimed in this documentation pass. |
| Next bounded task | PASS | Handoff, MIGRATION and memory indexes route to the native repertoire contract/inventory. They explicitly retain 010 and postponed 004 gaps without selecting either. |
| Document integrity and scope | PASS | 2026-09-08 Node local-target check covered 11 changed/new Markdown files and 89 local links: zero missing. Targeted contradiction search and `git diff --check` passed. Diff review found documentation only, apart from the pre-existing unstaged Supabase CLI cache. |

No product, database, provider, CI, deployment, browser-flow or hardware test is claimed by
this brief. The Chrome and remote-revision observations are read-only start evidence, not a
release check. Final delivery is a documentation-only commit whose message contains WF-005;
there is no push or external write.
