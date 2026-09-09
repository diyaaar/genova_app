# 024 — Server-authoritative annotation mutation and safe-save contract

Prepared and executed: 2026-09-09. Status: **LOCAL ACCEPTANCE COMPLETE** at code/test commit
`1755803`. This documentation-only update records the evidence. Single writer and self-reviewer:
main agent; no independent review is claimed. This is the first bounded repair after B1.

## Outcome and delivery focus

Introduce a server-authoritative, revision-checked web data adapter beside the current
select-then-write compatibility path and carry lossless-write metadata through the read adapter. This
package closes the database-side causes of silent stale overwrite, false zero-row success, spoofed
audit identity and mismatched same-choir song/file references before any native writer is added.

This is not the complete B2 editing experience. Package 025 must still adopt the safe adapter in
the workspace lifecycle and repair cover-page addressing, interrupted/debounced saves, per-key
status and tenant-exit behavior. Until then, current web editing remains unsafe and B2 remains open.

## Execution start check

- [x] Read [AGENTS](../../AGENTS.md), [handoff](../agent-handoff.md),
  [migration guide](../gecis-rehberi.md), [work cycle](../ai-calisma-duzeni.md), the six
  memory-bank indexes, [MIGRATION](../../MIGRATION.md), [decisions](../../KARARLAR.md),
  [delivery plan B](../mobil-teslim-plani.md#b--rehearsal-tools-without-breaking-the-shared-contract),
  [003](003-kiraci-semasi.md), [005](005-coklu-uyelik-aktif-koro.md),
  [012](012-coklu-uyelik-secim-kilidi.md), [016](016-native-pdf-readonly-annotations.md),
  [021](021-mobile-protected-file-runtime-acceptance.md),
  [022](022-web-protected-file-compatibility.md) and the accepted
  [023 contract inventory](023-annotation-write-contract-inventory.md).
- [x] Verified `main` at `bbc747eeefe6`. The only pre-existing change is the unowned
  `supabase/.temp/cli-latest` cache; it remains unstaged and outside 024. The main agent is the sole
  writer and no subagent is used.
- [x] The owner's continuing direction authorizes local implementation, isolated tests and local
  commits. It does not authorize a hosted query/migration, real data/account, push/deploy, remote
  CI, message, spending or hardware action.
- [x] Current source evidence: `saveLayerSnapshot` trusts client song/member identity, selects then
  updates/deletes without a revision or returned row, and can report a zero-row mutation as saved.
  Reads retain neither row revision nor per-layer compatibility. The table trigger only fills
  `created_by` when null and therefore permits a crafted caller to supply another same-choir
  creator. These are defects, not accepted behavior.
- [x] Local tools available at planning time: Node `v24.13.1`, pnpm `11.9.0`, Homebrew PostgreSQL
  `17.11`, and loopback source database `genova_008_test_restore`. No migration has been applied;
  the source copy must remain untouched.

## Allowed scope

- One forward migration under `supabase/migrations/` and its exact matching down migration under
  `supabase/rollback/`: revision token, secure relation/audit trigger and one narrow authenticated
  snapshot-mutation RPC.
- `supabase/tests/` and `supabase/test-support/`: 024-owned fixtures and a guarded runner against a
  dedicated PostgreSQL 17 copy. It must prove forward → failure cases → down → forward and compare
  source/fixture baselines.
- `lib/repertuvar/annotations.ts`, its focused tests and only the annotation row typing in
  `lib/supabase.ts`: lossless-read metadata, expected-revision input/result and stable error mapping.
- The shared parser in `lib/repertuvar/annotation-types.ts` only if a test proves a missing pure
  compatibility predicate. Do not create a second annotation item schema in SQL, web or native.
- This brief for execution evidence; status indexes only in the later documentation commit after
  actual acceptance.

## Contract to implement

- Add a positive `revision bigint` to every annotation row. Existing rows begin at 1. Every direct
  or RPC update increments exactly once in the table trigger, so older clients remain readable and
  cannot freeze or choose a revision value.
- The trigger derives `song_id` and `choir_id` from `repertoire_file_id`, stamps the authenticated
  active member as creator/updater, preserves the original creator on updates and refuses a missing
  file. Service-role maintenance with no authenticated member may preserve explicitly supplied
  audit values; authenticated callers may not spoof them.
- Expose one authenticated RPC for a complete layer/page snapshot. Its caller supplies file, page,
  layer, optional voice target, schema version, JSON array and expected revision. It never accepts
  song, choir, member, row or audit identity.
- `expected_revision = null` means “the logical row must not exist”; a positive value means “the
  logical row must exist at exactly this revision.” Non-empty content inserts/updates; an empty
  array deletes. Duplicate creation, missing/stale rows and zero-row mutations return a stable
  conflict, never success.
- The RPC executes with the caller's RLS identity, verifies the file is visible in the active choir
  and explicitly checks the existing personal/voice/shared-all mutation matrix. Anonymous,
  unresolved/wrong-choir, wrong-role and invalid layer/page/schema inputs fail closed.
- Reads expose per-layer row ID, revision and `writableWithoutLoss`. Any unsupported schema/item,
  truncation or malformed payload marks only that layer non-writable while retaining its defensive
  display items. The save adapter refuses such a layer before the RPC is called.
- This package remains online-first and whole-layer. It adds no merge, offline queue, delete
  confirmation, authorship or background cross-tenant retry behavior and does not treat any 023
  recommendation as owner approval.

## Preserved behavior and exclusions

- Preserve three layer kinds, four voice groups, one-based pages, normalized geometry, schema-v1
  shared item shapes, current RLS visibility and native read-only behavior.
- Existing personal/shared logical uniqueness remains. Direct old-client writes may continue after
  the migration but receive server-derived relation/audit fields and a bumped revision; they are
  not represented as conflict-safe.
- No `RepertoireWorkspace`, `AuthProvider`, native UI/gateway, Edge function, realtime/cache,
  offline, audio, WebView or visual change in 024. Package 025 owns client lifecycle adoption.
- No live backup/migration, hosted schema assertion, deploy, real fixture/user, Drive/provider,
  remote CI or hardware. The migration is prepared and tested locally only; production sequence
  remains a separately authorized package with current backup and restore proof.

## Risk, authority and rollback

- The principal risk is a `SECURITY DEFINER` function bypassing RLS or leaking row existence. Use
  invoker semantics unless an isolated test proves they cannot satisfy the contract; revoke public
  and anonymous execution explicitly either way. Every role and wrong-tenant denial is mandatory.
- A migration must refuse an existing mismatched song/file row rather than silently rewriting
  historical data. The dedicated test copy may use synthetic transaction-scoped fixtures only.
- Down migration must remove the RPC/revision behavior and restore the exact prior trigger function,
  grants and column shape. The runner must then reapply 024 before completion so its disposable
  target ends at the forward state; the source database and unrelated CLI cache remain unchanged.
- Any need to mutate the restored source, contact hosted Supabase, weaken RLS, overwrite unknown
  content or choose a pending owner semantic stops this package.

## Implementation and verification sequence

1. Record the effective local table/function/policy/grant definitions and source baseline. Create a
   dedicated `genova_024_test*` copy from the loopback restored source; never apply 024 to the source.
2. Write forward/down SQL with advisory/timeout guards, reversible metadata where required, narrow
   grants and explicit comments. Add transactional SQL fixtures for chef, section leader, chorist,
   unresolved session and a second choir.
3. Prove personal/own-voice/all-role success plus wrong-role/wrong-voice/wrong-choir/anonymous
   refusal; insert/update/delete revision transitions; stale/duplicate/missing conflict; server
   relation/audit derivation; direct-write revision compatibility; and down/forward restoration.
4. Update the web annotation data adapter to parse per-layer write metadata, refuse lossy layers,
   expose the RPC-only safe-save entry point and return the new revision/deletion result. Keep the
   current workspace entry point explicitly marked for 025 removal. Unit-test malformed results,
   unsupported content, error mapping and exact RPC arguments.
5. Run focused TypeScript tests, the guarded PostgreSQL runner and root `pnpm check`. Inspect the
   complete diff, commit code/test separately, then record acceptance and route to package 025.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 024 open. Review is self-review unless an independent review is
actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Forward migration refuses pre-existing file/song mismatch, adds positive revision, derives file/song/choir and secure audit fields, and grants only the intended RPC surface | yes | **PASS** | 2026-09-09, `1755803`; guarded runner on `genova_024_mismatch_test` and `genova_024_test_restore`, PostgreSQL 17.11 | Deliberate mismatch failed with the expected preflight error and left no partial 024 schema. RPC execution is authenticated-only. Hosted state NOT RUN |
| Chef, section leader and chorist permitted layer mutations pass; wrong role/voice/choir, unresolved session and anonymous cases fail without row change or existence leak | yes | **PASS** | 2026-09-09, transactional `024_repertoire_pdf_annotation_safe_save.sql` | Chorist personal, leader own-Alto and chef shared-all/other-voice passed. Chorist shared, leader other-voice/all, wrong-choir, unresolved and anonymous paths failed. Existing versus missing foreign file both return permission denial for authenticated direct callers |
| Insert/update/delete obey absence-or-exact-revision CAS; duplicate create, stale update/delete and missing row cannot report success | yes | **PASS** | 2026-09-09, same PostgreSQL 17.11 role/revision matrix | Absence insert returned 1, exact update returned 2, stale update/delete and duplicate create preserved the row, exact delete removed it, and a positive-revision missing delete conflicted. Whole-layer local SQL only; no merge claim |
| Existing direct writes receive server-derived relation/audit and revision increment, while the down migration restores the prior trigger/column/function/grants and forward reapplies cleanly | yes | **PASS** | 2026-09-09 20:30 UTC, guarded forward → down → forward runner | Crafted direct insert/update could not retain spoofed song/creator/updater/revision. Down restored the exact prior trigger hash and removed RPC/column/private schema; forward and SQL matrix passed again. Stable source/target table hashes matched |
| Web read adapter exposes row/revision/lossless metadata per logical layer; unsupported/malformed/future content is displayed defensively but refused before mutation | yes | **PASS** | 2026-09-09, focused Vitest; 2 files / 16 tests | Exact schema-v1 rows are writable. Unknown item, future field, future schema, clamped value and invalid revision are read defensively but blocked. Current workspace does not consume this metadata until 025 |
| Web save adapter sends no song/choir/member/audit identity, supplies expected revision, parses the returned revision/deletion result and maps conflict/permission errors visibly | yes | **PASS** | 2026-09-09, `annotations.test.ts` | Exact RPC arguments/result parsing, delete result, client-side loss refusal, conflict, permission, invalid request, missing RPC and malformed response passed. This new safe entry point is not yet called by the workspace |
| Root `pnpm check`, SQL guard, diff review and cleanup pass; no product UI/native/live/external change is included | yes | **PASS** | 2026-09-09, macOS; Node 24.13.1, pnpm 11.9.0; final root gate and SQL runner | Lint/type passed; 39 files / 262 tests, coverage thresholds, Service Worker syntax and Next 15.5.25 production build passed. Dedicated 15 MB target and mismatch databases were removed after source equality; only the unowned CLI cache remains |

## Delivery

Planning is separate commit `a4d770a`; schema/adapter/tests are code/test commit `1755803`. This
documentation-only update completes 024 locally. Rollback is this evidence update, then `1755803`,
then the planning commit; a database rollback uses the tested 024 down migration only after a
separately authorized deployment. No hosted query, migration or release was performed.

The current workspace still calls the explicitly marked compatibility save path and therefore
retains cover-page, debounce/unmount, zero-row and status-race defects. The next bounded package is
025 workspace safe-save lifecycle adoption. B2, hosted schema, web release and native writing remain
open; none is inferred from this local foundation.
