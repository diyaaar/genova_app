# Active context

Updated 20 September 2026. [WF-008](../docs/briefs/WF-008-android-first-delivery-reset.md)
records the owner's approved delivery reset; the [delivery plan](../docs/mobil-teslim-plani.md)
owns priorities, the objective and resource/test controls. [Handoff](../docs/agent-handoff.md)
is the short startup source. Historical acceptance remains in briefs and [progress](progress.md).

## Current outcome

Deliver the same production product Android-first: usable beta soon, then complete the full
roadmap and both-store readiness/release. The beta is neither a disposable demo nor final success.
Resolve/checkpoint unfinished 051 first; then prioritize Drive-exit/private-storage read integration
and the actual Android user flow rather than continuing tiny chat features automatically.

## Latest owner choices

- Supabase DB/Auth/Realtime/Edge stay; private R2 is the selected preparation direction after the
  proposed storage separation. Railway hosting/database replacement is off the current path.
- Prefer total recurring infrastructure <=$5/month; no guaranteed bill or purchase authority.
- First five members per choir free; only additional members billable. No trial duration selected.
  Individual sales deferred from the first release; optional feature sales remain unspecified.
- Initial commercial administration/payment is on web; manual invoicing remains the v1 baseline.
  Mobile retains privacy/terms access, deletion entry and applicable store requirements.
- Android first for routine runtime and owner's phone test. Group iOS at integration/candidate
  acceptance, with earlier checks for platform-sensitive changes. Full release still needs both.
- Google Play account will be created; personal/company is undecided. Apple status unverified.
  Account-specific testing/review timelines are not under agent control.

## Exact work checkpoint

- Planning base `d8dd8e3`; last accepted product `9edda60`/050. Verify actual HEAD.
- Agent owns unfinished 051 changes in mobile chat and AppRoot/tests. Preserve them.
- Latest focused run after state serialization change: 43 PASS, 2 FAIL. Earlier full gate/export
  successes do not validate the latest revision. See [051](../docs/briefs/051-native-chat-starred-messages.md).
- Next bounded action: fix transport-start test synchronization and review unknown/panel-only star
  state, stale lifecycle callbacks and cursor handling; close with required evidence or explicitly
  checkpoint remaining failures, then proceed along the storage/read critical path.
- User-owned `supabase/.temp/cli-latest` stays unstaged.
- WF-008 documentation preflight: 21,340,568 KiB (~20.35 GiB) free. 051 build/export outputs removed.
  No runtime/build/install created by planning. Recheck before allocating.

## Remaining requirements and authority

004 remains 25/27 with postponed hardware. 010 remains 6/7; revoked-link/wrong-account live UI
refusals remain unproved and deleted fixtures must not be silently recreated. 018 history remains.
033/C1 and 034–050 local acceptance is preserved, without upgrading it to hosted/device evidence.
023 annotation decisions, 036 transport, commercial prices/member counting, retention policy,
provider region/accounts and controlled deployment/migration remain actionable decision gates.
Native write/sync/offline, remaining chat/C4/C5, provider delivery, plan/lifecycle/security,
two-platform acceptance, stores and operations remain in the full objective.
Existing local-work/cleanup authority persists; external/data/credential/spending/publication/device
boundaries persist. Ask only for a genuinely blocking choice after preparing concrete work.
