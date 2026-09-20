# Active context

Updated 21 September 2026. [WF-008](../docs/briefs/WF-008-android-first-delivery-reset.md)
records the owner's approved delivery reset; the [delivery plan](../docs/mobil-teslim-plani.md)
owns priorities, the objective and resource/test controls. [Handoff](../docs/agent-handoff.md)
is the short startup source. Historical acceptance remains in briefs and [progress](progress.md).

## Current outcome

Deliver the same production product Android-first: usable beta soon, then complete the full
roadmap and both-store readiness/release. The beta is neither a disposable demo nor final success.
053 is now locally accepted; prioritize one Drive-free repertoire upload/catalogue flow
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

- Last accepted product `beb4842`/053. Verify actual HEAD; no unfinished product changes.
- 053 passes tenant/immutable mapping SQL forward/down/forward, 44 focused cases, actual signed
  loopback R2 through `Deno.serve`, and root 66/615/build. Detailed evidence:
  [053](../docs/briefs/053-private-r2-repertoire-read.md).
- [052](../docs/briefs/052-drive-exit-inventory.md) source inventory accepted; no files migrated.
  It maps uploads/reads/history/private audio/chat avatars/caches and three critical traps:
  Drive-folder catalogue filter, public-link creation, destructive replacement before history.
- Next implement [054](../docs/briefs/054-private-r2-repertoire-upload.md): one authorized,
  verified private PDF/audio upload plus web/native catalogue readiness without Drive folders.
- User-owned `supabase/.temp/cli-latest` stays unstaged.
- After 053: 21,355,504 KiB (~20.37 GiB) free. Build/coverage, disposable DB and loopback
  listeners removed; pinned signer is 80 KiB. No VM/simulator/device created.
- Cloudflare/R2 account availability asked without credentials. Local 054 can proceed without
  that answer; provider activation/region and real data/cutover remain separate approval gates.

## Remaining requirements and authority

004 remains 25/27 with postponed hardware. 010 remains 6/7; revoked-link/wrong-account live UI
refusals remain unproved and deleted fixtures must not be silently recreated. 018 history remains.
033/C1 and 034–051 local acceptance is preserved, without upgrading it to hosted/device evidence.
023 annotation decisions, 036 transport, commercial prices/member counting, retention policy,
provider region/accounts and controlled deployment/migration remain actionable decision gates.
Native write/sync/offline, remaining chat/C4/C5, provider delivery, plan/lifecycle/security,
two-platform acceptance, stores and operations remain in the full objective.
Existing local-work/cleanup authority persists; external/data/credential/spending/publication/device
boundaries persist. Ask only for a genuinely blocking choice after preparing concrete work.
