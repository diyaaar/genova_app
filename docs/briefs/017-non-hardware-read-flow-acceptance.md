# 017 — Non-hardware native read-flow acceptance and pilot handoff

Date: 2026-09-08. Status: local acceptance complete. Single writer: main agent.

## Outcome and authority

Prove the locally implemented native read path as one continuous, isolated product scenario:
signed out, sign in, server-required choir selection, active-choir shell, repertoire catalogue,
protected synthetic score, rendered page and read-only annotation, then recovery, tenant switch and
sign out. Produce an exact pilot handoff without running or implying the postponed real-device flow.

The owner authorized local implementation, local commits, read-only live-state inspection and
repository gates. This package does not authorize push, deployment, migration, production-data
access or deletion, the real `Genesi Nova` choir, email, spending or hardware testing.

## Start check

- Verified branch `main` at local HEAD `115d720`; recorded `origin/main` remains `a13f696` and was
  not refreshed or changed. The only working-tree change is the unrelated
  `supabase/.temp/cli-latest`, which remains unstaged and outside this package.
- Followed [AGENTS](../../AGENTS.md), the [handoff](../agent-handoff.md),
  [migration guide](../gecis-rehberi.md), [work cycle](../ai-calisma-duzeni.md), the six
  `memory-bank` indexes, [MIGRATION](../../MIGRATION.md), the [delivery plan](../mobil-teslim-plani.md)
  and the package split in [013](013-native-repertoire-contract.md).
- Accepted prerequisites are local-only: [014](014-native-repertoire-catalogue.md),
  [015](015-shared-protected-repertoire-file.md) and
  [016](016-native-pdf-readonly-annotations.md). Package 015's Edge path is not deployed, so no
  live provider/product claim can be made from this scenario.
- Chrome remains open in the Genesi Nova profile on the private repository and the correct Supabase
  project. No browser or external write belongs to this package.
- The test must use only fake auth/RPC/catalogue/ticket/PDF boundaries, the tracked synthetic
  fixture and in-memory identities. It must not initialize the real Supabase client, use a real
  account, fetch a provider file or touch device secure storage.
- Allowed product files: one integration acceptance test and the smallest defect fix exposed by it.
  Allowed records: this brief, pilot handoff and canonical status/handoff indexes.
- Required gates: the focused acceptance scenario, full mobile TypeScript/Jest and iOS bundle,
  root `pnpm check` if shared or root code changes, local links, contradiction review and
  `git diff --check`. A native rebuild is not required because 017 adds no native dependency or
  source; 016's dated simulator build remains historical evidence only.
- Rollback: revert any 017 test/defect commit, then the separate evidence commit. No external
  rollback exists because this package performs no external write.

## Scenario contract

1. Start with no session. Enter synthetic credentials and prove that auth success alone does not
   open data; a synthetic auth-state event and server membership response drive the next state.
2. Return two synthetic memberships with no current choir. The product must stay fail-closed at
   the chooser until one membership is activated through the RPC boundary.
3. In choir A, open the shell and catalogue, select only the catalogue-returned PDF score, recover
   from one explicit reader failure, then show page 1 of a 40-page synthetic document with a
   schema-v1 annotation and no writable annotation action.
4. Return through the catalogue, request a choir switch and prove registered private caches clear
   before the active-choir RPC and before choir B catalogue data can load. Choir A content must not
   remain visible in choir B.
5. Sign out from choir B and prove the product returns to the signed-out screen and clears the
   current tenant cache. Failed/blank states cannot be counted as successful passage.
6. Keep all boundaries named in the evidence: fake auth/RPC/data/rendering is not live RLS, Edge,
   provider, device, keychain, real-account or hardware proof.

## Acceptance

- [x] One component-level scenario crosses signed-out, selection-required, ready shell, catalogue,
  retry, synthetic 40-page PDF, annotation, choir switch and sign-out states.
- [x] The scenario proves cache-clear ordering and absence of choir A data after choir B is active.
- [x] It proves the PDF state is nonblank, the annotation is visible and native annotation writes
  are absent; exact fake/live boundaries are asserted and recorded.
- [x] Focused and full mobile gates pass; the iOS bundle exports; any applicable root gate passes.
- [x] A pilot handoff lists device/account/data prerequisites and leaves every unrun live/provider/
  hardware criterion as NOT RUN rather than converting local evidence into pilot acceptance.
- [x] Code/test and evidence records are separate 017 commits; local links, status consistency,
  scope and `git diff --check` pass without staging unrelated work.

## Pilot handoff — prepared, not executed

The following is an execution checklist, not authority and not evidence that any item ran.

### Prerequisites requiring separate owner approval

1. Choose dedicated pilot identities and a disposable test choir that is not the real
   `Genesi Nova` choir. Creating users, memberships, invitations or content is a live-data action.
2. Deploy package 015's `repertoire-file` Edge function before any web/native build that calls it,
   then verify its exact project, secrets, function configuration and rollback. Push/deploy remains
   a separate action from the local commits.
3. Provide one passive test PDF and schema-v1 annotation set in the pilot choir with expected
   visibility for a chorist and a chef. Do not copy real choir content without explicit scope.
4. Select the real iOS and Android devices, builds and distribution route. Installation, hardware
   keychain/keystore, stylus, memory, background and real-network behavior are device evidence.

### Required pilot scenarios

- For each approved identity/device: signed out to sign in, zero/one/many membership handling,
  server-confirmed choir selection, catalogue, protected PDF, page 1/middle/last, annotation
  visibility, zoom/scroll, back navigation, choir switch, relaunch and sign out.
- Separately exercise expired/denied ticket, interrupted download, corrupt/oversized PDF, page
  render failure, offline/weak network, and no-score states. A blank stage is FAIL.
- Prove old-choir catalogue, file, rendered pages and annotations are absent after switch/sign-out.
  Record expected and actual behavior with timestamp, platform/build and account role.
- Keep package 010's revoked-link/wrong-account product refusals separate; they require their own
  new production fixture and authorization and are not repaired or closed by this pilot.

### Evidence format

Every row must be dated `PASS`, `FAIL`, `NOT RUN` or `N/A`, with device/build, account role,
scenario, actual result and limitation. Hardware keychain and the real-phone flow remain the two
open 004 criteria. No local test, simulator build or self-review can change those rows.

## Evidence

| Required criterion | Status | Evidence / limits |
|---|---|---|
| Continuous isolated read flow | PASS | 2026-09-08: `ProductReadFlow.acceptance.test.tsx` crossed signed-out credentials, an explicit auth-state event, two memberships with no current choir, server activation, choir A shell/catalogue, one visible reader failure plus retry, page 1 of 40 with annotation, return navigation, choir B switch and sign-out. It uses only synthetic identities and injected boundaries. |
| Tenant isolation and cleanup ordering | PASS | The test records calls and proves exactly one catalogue and reader clear occurs before `set_active_choir`; choir B loads only afterward and shows an empty catalogue with no choir A title. Sign-out again runs both cleaners exactly once. The acceptance exposed and fixed duplicate-owner cleanup registration by reference-counting cleaner ownership and keeping injected gateways registered at `AppRoot` lifetime. |
| Nonblank PDF, annotation and read-only boundary | PASS | The first synthetic open fails visibly and no page is present; retry renders `score-reader-page-1`, counter `1 / 40` and the tracked fixture's text annotation. No `Kalem` action or gateway `save` member exists. Rendering, ticket and data are fakes; this is not provider/RLS/native-module proof. |
| Mobile and repository gates | PASS | 2026-09-08: focused scenario passed 1/1. Full `npm run check` passed TypeScript plus 14 suites / 73 tests. `npm run bundle:check` exported a 1,314-module, 3.9 MB iOS Hermes bundle. Root `pnpm check`, Expo Doctor and a native rebuild are N/A for 017 because no root/shared code, dependency, build setting or native source changed; their 016 results remain dated evidence, not reruns. |
| Pilot handoff | PASS | The prepared checklist above names required live-data/deploy/device approvals, both roles/platforms, main/error/isolation scenarios and evidence fields. Execution remains NOT RUN. 010 stays 6/7; 004 stays 25/27. |
| Commit, scope and document integrity | PASS | Planning commit `402c3c7` preceded code/test commit `326aae9`; this evidence update is documentation-only. Eight changed Markdown files contained 98 local links and zero missing targets; targeted 004/010/016/017 status search and `git diff --check` passed. The unrelated `supabase/.temp/cli-latest` remains unstaged. |
| Live/provider/device acceptance | NOT RUN | Not authorized and cannot be inferred from local fakes. |

Package 017 closes the locally authorized 013–017 read-path sequence only. The mobile read path is
not live because package 015 is not deployed, and no real user, content, device or hardware pilot
was run.
