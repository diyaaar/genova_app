# Genova — agent handoff

Updated 20 September 2026 under [WF-008](briefs/WF-008-android-first-delivery-reset.md).
This is the current entry point; dated acceptance remains in individual briefs.

## Read and verify

1. Read [AGENTS](../AGENTS.md), [active context](../memory-bank/activeContext.md) and
   [the current delivery priority](mobil-teslim-plani.md#current-delivery-priority--20-september-2026).
2. Read [051](briefs/051-native-chat-starred-messages.md) before touching its owned unfinished
   code. Use [the guide](gecis-rehberi.md) and [work cycle](ai-calisma-duzeni.md).
3. Verify Git ownership, disk and active goal. Do not repeat accepted work or rebuild environments
   merely because the model/session changed.

## Current checkout and ownership

- Planning base: `d8dd8e3` (051). Last accepted product: `9edda60` (050); verify current HEAD.
- Owned unfinished 051: ChatScreen/action-panel and tests; AppRoot/tenant-cleanup tests; new
  star gateway/transport/hook/panel and tests under `apps/mobile/src/chat/`.
- Unrelated `supabase/.temp/cli-latest` remains unstaged. Stage only owned task paths.
- Latest 051 focused run after serialization change: 43 PASS / 2 FAIL. Earlier full mobile
  48/272, root 65/602/build and platform exports predate that change and are not final acceptance.
- Next action: review/fix 051's synchronization and lifecycle/state concerns, then its required
  final gates or an explicit unfinished checkpoint. Do not start another chat feature by default.

## Delivery decisions

- Same product, Android-first usable beta, then full preserved scope and both-store release.
  A few days is the owner's delivery target, not a verified final-product/store-publication date.
- Retain Supabase DB/Auth/Realtime/Edge; private R2 is the Drive-exit preparation target.
  Existing hosting stays. Railway migration is not on the current path.
- Prefer <=$5/month total recurring infrastructure. Actual usage must be checked; no new paid
  plan/provider operation is authorized by this budget preference.
- First five choir members free, additional members billable. Individual sales deferred.
  Initial invoicing remains manual/web; price, period and seat-count lifecycle remain undecided.
- Web onboarding/payment preference does not waive mobile privacy, deletion or store review.
- After 051: protected storage/read integration -> operational Android beta -> complete features/
  release obligations -> stable two-platform acceptance -> approved distribution and operations.

## Acceptance and resources

- 018–050 have dated local evidence; 033/C1 is locally accepted, including owner password restore.
  Their boundaries are in their briefs, not inferred hosted/runtime acceptance.
- 004 remains 25/27 with hardware postponed; 010 remains 6/7 with two live-product refusals open.
  Do not recreate deleted fixtures without applicable authority.
- Native annotation choices in [023](briefs/023-annotation-write-contract-inventory.md),
  push transport in 036, retention, plan pricing/counting and release accounts remain open.
- Native chat still lacks accepted social/media/administration and some status/presence flows;
  C4/C5, native writing/sync/offline, release/lifecycle/security and stores remain outstanding.
- 21,340,568 KiB (~20.35 GiB) free at WF-008 preflight. Recheck before allocation.
  Previous .next, coverage and 051 export outputs were removed; no new runtime was started.
- One active result/one heavy process; >=10 GiB free; reassess after two failed approaches.
  Focused repair and code review precede final heavy gates. Android is the default runtime;
  iOS runs at integration/candidate gates or earlier when a platform-sensitive change requires it.
  Keep existing required checks and distinguish test, runtime, hosted, device and release proof.

## Authority and continuity

Local scoped implementation/tests/commits and owned cleanup remain authorized. Hosted data/schema,
provider activation/cutover, credentials, real accounts/email, spending, push/deploy/remote CI,
hardware and distribution retain applicable approval boundaries. Prepare concrete work before
asking for the exact missing choice/authority. Historical account/token risks remain unresolved.
Do not mark the full goal complete at beta, planning or local-test acceptance.
The [revised objective](mobil-teslim-plani.md#revised-goal-text) is canonical; WF-008 records its
application-goal creation receipt.
