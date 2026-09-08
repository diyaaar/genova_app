# 017 — Non-hardware native read-flow acceptance and pilot handoff

Date: 2026-09-08. Status: active. Single writer: main agent.

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

- [ ] One component-level scenario crosses signed-out, selection-required, ready shell, catalogue,
  retry, synthetic 40-page PDF, annotation, choir switch and sign-out states.
- [ ] The scenario proves cache-clear ordering and absence of choir A data after choir B is active.
- [ ] It proves the PDF state is nonblank, the annotation is visible and native annotation writes
  are absent; exact fake/live boundaries are asserted and recorded.
- [ ] Focused and full mobile gates pass; the iOS bundle exports; any applicable root gate passes.
- [ ] A pilot handoff lists device/account/data prerequisites and leaves every unrun live/provider/
  hardware criterion as NOT RUN rather than converting local evidence into pilot acceptance.
- [ ] Code/test and evidence records are separate 017 commits; local links, status consistency,
  scope and `git diff --check` pass without staging unrelated work.

## Evidence

| Required criterion | Status | Evidence / limits |
|---|---|---|
| Continuous isolated read flow | NOT RUN | Acceptance scenario pending. |
| Tenant isolation and cleanup ordering | NOT RUN | Acceptance assertions pending. |
| Nonblank PDF, annotation and read-only boundary | NOT RUN | Acceptance assertions pending. |
| Mobile and repository gates | NOT RUN | Focused/full gates pending. |
| Pilot handoff | NOT RUN | Evidence handoff pending; hardware remains excluded. |
| Commit, scope and document integrity | NOT RUN | Planning commit pending. |
| Live/provider/device acceptance | NOT RUN | Not authorized and cannot be inferred from local fakes. |
