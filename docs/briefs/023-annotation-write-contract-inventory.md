# 023 — Annotation-write contract and role/layer inventory

Prepared: 2026-09-09. Status: **PLANNED / IN PROGRESS**. Single writer and self-reviewer:
main agent; no independent review is claimed. This is delivery-plan package B1.

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
| Shared item/layer shape, row identity, page/coordinate and parse/serialize behavior are mapped from current sources | yes | **NOT RUN** | Source matrix and ordered migration review | Must distinguish defensive reading from safe round-trip writing |
| Role × layer matrix covers view/create/update/delete for chorist, section leader and chef, with UI and RLS differences explicit | yes | **NOT RUN** | Web/native/UI + SQL policy comparison | Migration text and local restored schema are not live-state proof |
| Empty snapshot/delete, audit fields, uniqueness, cache/version effects and tenant/session binding are mapped | yes | **NOT RUN** | Caller, trigger/index and active-choir review | Include zero-row RLS denial as well as exceptions where applicable |
| Unknown item, unsupported schema version and mixed known/unknown round-trip cannot be silently declared writable | yes | **NOT RUN** | Parser → store → save failure analysis | Preserve/refuse recommendation and exact B2 guard must be recorded |
| Concurrent writers, interrupted/debounced saves, navigation/switch/sign-out and stale responses have explicit current behavior and safe prerequisites | yes | **NOT RUN** | Lifecycle and failure matrix | Do not claim B3 conflict/offline behavior implemented |
| Every genuinely new product semantic is separated into a concise owner decision with recommendation and consequence | yes | **NOT RUN** | Decision packet | Required unresolved choices keep B2 blocked, not silently defaulted |
| Local links, source references, status indexes and `git diff --check` pass; no product/schema/live change is included | yes | **NOT RUN** | Documentation gate | Product tests N/A because this package changes documentation only |

## Delivery

No contract acceptance is claimed at planning time. The final record must name the planning and
evidence commits, effective-source limits, required owner decisions, rollback, and the next ready
package. A source inventory may complete even when B2 remains gated, but B1 itself closes only if
all required criteria above pass without representing a proposal as an approved semantic.
