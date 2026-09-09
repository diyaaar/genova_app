# 023 — Annotation-write contract and role/layer inventory

Prepared: 2026-09-09. Status: **DOCUMENTATION ACCEPTED**. Single writer and self-reviewer: main
agent; no independent review is claimed. This is delivery-plan package B1.

## Outcome and delivery focus

Produce one source-grounded, implementation-ready annotation-write contract that maps current
web, native, database and RLS behavior without silently turning historical behavior into a new
product decision. The record must identify what every role may see and mutate, row/layer identity,
snapshot/delete/version semantics, unknown/future-content handling, concurrency gaps and the exact
owner decisions required before B2 may add native writing.

This package is documentation and read-only inspection only. It does not change product code,
schema, policies, hosted data or the existing read path. A recommended safe default is not an
approved product decision unless existing authoritative behavior already determines it.

## Execution start check

- [x] Read [AGENTS](../../AGENTS.md), [handoff](../agent-handoff.md),
  [migration guide](../gecis-rehberi.md), [work cycle](../ai-calisma-duzeni.md), the six
  memory-bank indexes, [MIGRATION](../../MIGRATION.md), [decisions](../../KARARLAR.md),
  [delivery plan B1](../mobil-teslim-plani.md#b--rehearsal-tools-without-breaking-the-shared-contract),
  [013](013-native-repertoire-contract.md), [016](016-native-pdf-readonly-annotations.md),
  [021](021-mobile-protected-file-runtime-acceptance.md) and
  [022](022-web-protected-file-compatibility.md).
- [x] Verified `main` at `c901c46` with only the pre-existing, unowned
  `supabase/.temp/cli-latest` modification. It remains unstaged and outside 023. The main agent is
  the sole writer; no subagent is used.
- [x] The owner's continuing instruction authorizes local source review, read-only inspection,
  documentation and required local commits. It does not authorize hosted queries/writes, schema
  migration, real accounts/data, push/deploy, remote CI, messages, spending or hardware.
- [x] `lib/repertuvar/annotation-types.ts` remains the single shared item/layer contract. Current
  native code is read-only. Existing web writing saves one complete layer/page snapshot after a
  debounce; B2 must not copy that behavior until compatibility and loss boundaries are explicit.
- [x] Initial source review found two unsafe facts to preserve rather than normalize away: parsed
  unknown/future items are omitted from the in-memory layer and a later current web save can
  overwrite them; concurrent snapshot writers have no compare-and-set/version guard. These are
  inventory findings, not accepted write semantics.

## Allowed scope

- This brief: authoritative matrix, findings, proposed safe invariants, decision packet and dated
  evidence. Keep implementation details linked to sources instead of duplicating large code.
- Minimal updates to `docs/mobil-teslim-plani.md`, `MIGRATION.md`, `docs/agent-handoff.md` and the
  moving memory-bank indexes after actual acceptance or a named decision boundary.
- Read-only local inspection of TypeScript, migrations, tests and the dedicated PostgreSQL 17 test
  copy. Any query must target loopback and a `genova_*_test*` database; do not mutate it.

## Preserved behavior and exclusions

- Preserve the three stored layer kinds: `personal`, `shared_voice_group` and `shared_all`; four
  canonical voice groups; one row per file/page/layer owner or target; one-based PDF pages; and
  normalized coordinates. Do not introduce another native schema or transport.
- Separate visibility from mutation authority. A member seeing a shared layer does not imply edit
  authority. Database RLS is the final authority; UI role checks are affordances only.
- Do not declare whole-layer co-ownership, per-item authorship, last-write-wins, conflict merging,
  offline queue disposition or destructive handling of future content as approved unless an
  authoritative existing decision actually establishes it.
- No product/native implementation, SQL edit, local DB write, hosted Supabase access, deployment,
  real data/account, notification, remote CI or hardware. Do not close B2/B3 or infer live schema
  state from migrations or a restored local copy.

## Risk, authority and rollback

- The main risks are silent loss of unknown items, one writer overwriting another's shared layer,
  role checks using stale or wrong-choir identity, and delete-as-empty removing content that the
  writer never loaded. Every one must appear in the contract and failure matrix.
- This package is reverted by its documentation commits only. Unknown source/schema conflicts,
  inability to identify the effective migration order, a non-loopback DB target or a required new
  product choice stops contract closure; it does not justify a guessed implementation.

## Verified current contract

The labels below matter: **source fact** means current tracked code or migration text; **local
observation** means the PostgreSQL 17.11 restored test copy; **required invariant** is a no-loss or
authorization boundary for later implementation; **owner decision** is a product choice that is
not established merely by current code. None of these is a claim about the present hosted schema.

### Item and layer payload

`lib/repertuvar/annotation-types.ts` is the only shared item definition. Schema version 1 contains
five item kinds: pen, highlighter, arrow, rectangle and text. Every item has a bounded string ID
and legacy or six-digit hex color. Points and text positions are normalized to `[0,1]`; stroke and
text widths are positive normalized fractions capped at 1 by the parser. Database page numbers are
one-based. The native renderer alone converts them to zero-based page indexes.

The parser accepts only schema version 1 and known, finite shapes. It clamps points and reports a
skipped count for malformed, excess, unknown or future content. This is safe for display but not a
lossless round trip: raw skipped items and unknown row-level fields are not retained in either web
or native read models. Therefore a layer with any skipped content is **readable but not safely
writable** by the current clients.

| Stored layer | Logical row identity | Shape constraints | Current web edit affordance |
|---|---|---|---|
| `personal` | file + page + `owner_member_id` | owner required; voice target null | Every active member edits only their own layer |
| `shared_voice_group` | file + page + `target_voice_group` | owner null; one of Soprano/Alto/Tenor/Bass required | Chef: all groups. Section leader: own current group. Chorist: none |
| `shared_all` | file + page | owner and voice target null | Chef only |

The table also stores `song_id`, `choir_id`, schema version, creator/updater and timestamps.
`choir_id` is immutable and defaults to the server-confirmed active choir. Tenant-link enforcement
rejects foreign keys into another choir. It does **not** prove that `song_id` is the parent of the
selected `repertoire_file_id`; both may currently reference different songs in the same choir.

### Role, visibility and mutation authority

The effective local restored policies compose role-specific policies with restrictive
`tenant_isolation_003`. `current_choir_member_id`, voice group and role helpers resolve only the
membership in the verified active choir. UI flags only hide controls; RLS is the authority.

| Actor in active choir | Personal | Own voice-group shared | Other voice-group shared | Shared-all |
|---|---|---|---|---|
| Chorist | view/create/update/delete own | view only | no view or mutation | view only |
| Partisyon Şefi | view/create/update/delete own | view/create/update/delete | no view or mutation | view only |
| Şef | view/create/update/delete own; cannot view others' personal | view/create/update/delete | view/create/update/delete | view/create/update/delete |
| Authenticated user with no resolved active membership | no access | no access | no access | no access |
| Anonymous client | no RLS policy permits access | no access | no access | no access |

The restored table still has broad historical grants to `anon`, but its enabled RLS and absent
anonymous policies deny row access. Chef visibility calls a mojibake role alias in the restored
select policy; the current role helper deliberately treats that alias, `Sef` and `Şef` as the same
role. This is observed local compatibility, not a reason to add new malformed role values.

### Row lifecycle, audit and propagation

- Web `saveLayerSnapshot` first selects the logical row through RLS. A non-empty snapshot updates
  that row or inserts one; an empty snapshot deletes it. There is no soft delete or annotation
  history table. The client maintains at most 40 in-memory undo snapshots per layer/page only.
- The write payload trusts client-supplied `song_id`, file ID, page, layer and personal member ID.
  RLS and tenant triggers constrain tenant/role/owner, but the same-choir song/file relationship is
  not enforced. The client does not send `choir_id`.
- Insert defaults set `created_by`/`updated_by`; the trigger preserves creator and overwrites updater
  and `updated_at` on update. Current RLS does not require a caller-supplied `created_by` to equal
  the active member, so a crafted same-choir insert can spoof creator attribution. The ordinary web
  caller omits this field, but it is not a secure audit contract.
- Schema version describes payload format, not row revision. Although reads fetch `updated_at`,
  both clients discard it for write purposes. Updates and deletes filter only by row ID, return no
  affected row and do not distinguish a zero-row RLS/stale denial from success.
- Annotation writes do not bump `repertoire_cache_versions`. The detail page subscribes to
  repertoire metadata changes but not annotation changes. A second client therefore remains stale
  until a new annotation load; no current cross-client reconciliation exists.
- Native exposes only `load(fileId)` and never writes. It receives only rows allowed by RLS, maps
  valid layers by one-based page and reports skipped content.

### Current web save lifecycle and reproduced source defects

The web stage optimistically replaces the active in-memory layer, records undo, and schedules a
500 ms whole-snapshot save per file/page/layer key. The visible save state is global, not per key.
Source tracing proves these blocking defects without changing data:

1. **Wrong page with a cover:** display state uses `activePdfPageNumber` after subtracting the cover,
   but commit/undo/redo/clear queue `currentPage`. PDF page 1 is therefore written as page 2 whenever
   a cover occupies display page 1.
2. **Silent navigation loss:** unmount clears every pending save timer and resets the store without
   flushing or warning about `savePayloadRef`; an edit made within the debounce window disappears.
3. **Unknown-content loss:** load strips unsupported items, then any later snapshot write serializes
   only parsed known items. A mixed future/current layer can be destructively rewritten without an
   explicit refusal.
4. **Last-writer overwrite:** select then update has no row revision/CAS. Two authorized writers to
   the same shared layer replace one another's complete snapshots.
5. **False saved state:** update/delete do not assert an affected row. Permission loss, choir/session
   change or concurrent deletion can produce zero affected rows while the UI reports saved.
6. **Global status race:** independent layer timers share one save state; one success can clear the
   visible error from another layer, and failed payloads have no explicit retry/flush contract.

These are current implementation findings, not accepted semantics. The first five can lose or
misattribute data and must be repaired before native writing copies the path.

## Required safe baseline before B2

The smallest safe sequence is a new repair package before native editing:

1. Fix cover/page identity and make pending web saves flush or produce an explicit keep/discard
   decision before file navigation, tenant switch or sign-out. Never send a queued mutation under a
   newly selected choir.
2. Carry a raw-compatibility marker from read to write. If a row has an unsupported schema/item or
   cannot be losslessly represented, refuse mutation and preserve the server row unchanged.
3. Move mutation behind one shared server contract (Postgres RPC is the smallest fit) that derives
   active member/choir and song from the file, stamps secure audit fields, accepts an expected row
   revision and returns the written/deleted row. Zero-row or stale revision is a visible conflict,
   never success.
4. Keep B2 online-first and whole-layer. On a stale conflict, preserve the local unsaved snapshot
   and require an explicit user action; do not auto-merge or silently reload. B3 owns durable offline
   queueing and multi-client merge policy.
5. Add role/layer denial, cover-page, empty-delete, unsupported-content, stale-revision, interrupted
   save, choir switch and sign-out tests in an isolated restored database plus both clients as the
   affected scope requires.

## Owner decision packet

These decisions are new product semantics and remain unresolved until the owner chooses them. They
do not prevent the safety repair from beginning, but B2 cannot claim its final UX complete without
them.

| Decision | Recommended default | Consequence / boundary |
|---|---|---|
| Shared-layer authorship | Preserve today's one collective snapshot per page/voice or whole choir; any role already authorized by RLS may edit it. Do not add per-item authorship in B2 | Smallest compatible path. Per-author sublayers require schema, UI, visibility and migration design and must be a separate product decision |
| Stale-write experience | Reject stale save, keep the local snapshot visibly unsaved, offer reload and a copy/export escape hatch; never auto-merge | Prevents silent loss. Automatic item merge belongs to B3 after item identity/deletion semantics are designed |
| Pending save during choir switch/sign-out | Choir switch: block until save succeeds or the user explicitly discards. Sign-out: warn once, then explicit discard clears tenant data; never retain a cross-sign-out private draft | Preserves tenant isolation while making loss intentional. Background cross-tenant retry is forbidden |
| Empty-layer action | Keep “clear active page/layer” as row deletion, but require confirmation when the row was previously stored or shared | Retains current storage model. Recoverable deletion history is not present and would require additional schema |

Changing these recommendations is valid, but the selected result must be recorded before the
dependent behavior is implemented. Until then, the repair package uses fail-closed/no-loss behavior
and does not invent collaboration features.

## Implementation and verification sequence

1. Inventory the shared item parser/serializer, layer keys, web store/history/debounce, native
   source and rendered-layer behavior. Trace every read, insert, update and delete caller.
2. Reconstruct effective table constraints, indexes, triggers, grants and policies from ordered
   migrations; compare them read-only with the local PostgreSQL 17 test copy where available.
3. Build role × layer × action and lifecycle matrices. Separate source fact, locally observed
   schema, recommended invariant, owner decision and unknown/live-unverified state.
4. Specify compatibility-safe B2 prerequisites: refusal or lossless preservation for unsupported
   content, optimistic conflict token, tenant/session binding, idempotent delete/save behavior and
   explicit unsaved-work/error state. Do not choose ambiguous collaboration UX for the owner.
5. Review failure scenarios and links, run `git diff --check`, commit the final record separately,
   and route only actually unblocked work. B2 remains blocked by any required unresolved decision;
   independent packages may continue according to the delivery plan.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 023/B1 open. Review is self-review unless an independent review
is actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Shared item/layer shape, row identity, page/coordinate and parse/serialize behavior are mapped from current sources | yes | **PASS** | 2026-09-09, source trace at planning commit `cf44312` | Five schema-v1 items, three layers, one-based pages, normalized geometry and partial defensive parse are mapped. Display-safe parsing is explicitly not called lossless writing |
| Role × layer matrix covers view/create/update/delete for chorist, section leader and chef, with UI and RLS differences explicit | yes | **PASS** | 2026-09-09, web/native source plus ordered migration and local policy definitions | UI affordances and RLS authority are separate. Local restored schema only; hosted state NOT RUN |
| Empty snapshot/delete, audit fields, uniqueness, cache/version effects and tenant/session binding are mapped | yes | **PASS** | 2026-09-09, caller/store/trigger/index/helper inspection | Delete-as-empty, 40-entry local undo, audit spoof gap, missing song/file relation, no annotation version propagation and zero-row false success are recorded |
| Unknown item, unsupported schema version and mixed known/unknown round-trip cannot be silently declared writable | yes | **PASS** | 2026-09-09, parser → store → snapshot-save trace | Later implementation must retain a raw compatibility marker and refuse mutation when lossless representation is impossible |
| Concurrent writers, interrupted/debounced saves, navigation/switch/sign-out and stale responses have explicit current behavior and safe prerequisites | yes | **PASS** | 2026-09-09, workspace timer/history/save trace | Wrong cover-page identity, unmount loss, no CAS, global status race and required fail-closed baseline are explicit. B3 remains unimplemented |
| Every genuinely new product semantic is separated into a concise owner decision with recommendation and consequence | yes | **PASS** | 2026-09-09, four-row decision packet | Choices remain unresolved and visibly gate final B2 UX; no recommendation is recorded as approval |
| Local links, source references, status indexes and `git diff --check` pass; no product/schema/live change is included | yes | **PASS** | 2026-09-09, documentation gate and final self-review | Local links and diff check pass. Product tests N/A: the accepted brief and status indexes are documentation-only; no DB write or external action |

## Delivery

B1 is documentation-accepted after planning commit `cf44312`; this final evidence record is a
separate documentation commit. The effective-source evidence is tracked code, ordered migrations
and one read-only transaction against local `genova_008_test_restore` on PostgreSQL 17.11. Hosted
schema/behavior remains NOT RUN. Rollback is the final record commit followed by the planning
commit. B2 remains gated by the owner decisions above and by the current web data-loss defects.
Per the roadmap's blocker rule, the next bounded package is the smallest web annotation safety
repair; independent B4 audio work remains available if a decision gate later pauses B2.
