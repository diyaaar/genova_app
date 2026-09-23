# 063 — Service-only private R2 copy inventory contract

**Status/date/writer:** CONTRACT READY / 2026-09-23 / primary agent.

**Observable result and user need:** An authorized release operator can query one choir's legacy
file references as a deterministic, read-only inventory across all six accepted copy families,
including explicit incomplete, non-Drive and already-private rows, without exposing that inventory
to application users or pretending that database metadata is verified Google object metadata.

**Delivery focus:** Close the control-plane gap before [062's bounded copy executor](062-bounded-private-r2-copy-executor.md).
The smallest acceptance is a service-role-only PostgreSQL function whose stable source/destination
identities can be enriched into the external 062 JSONL manifest during a later authorized hosted
inventory. This package does not read Google/R2, generate a real manifest, copy bytes or activate
any mapping.

**Start evidence:** `main/c98ed7d`; product/test `e4a4c23`/062 accepted. Only user-owned
`supabase/.temp/cli-latest` is dirty and remains unstaged. 40,787,220 KiB (~38.9 GiB) is free.
The restored local base confirms the legacy columns named by 052; 053–060 add the private target
tables/pointers but do not inventory old references. Supabase CLI 2.107.0 documents `migration new`.
No owner reply yet authorizes provider activation, credentials, hosted DB/data reads or real copy.

**Current work card:**

- User benefit: the later approved migration has a complete, reviewable source list instead of an
  ad-hoc query that can omit history, hidden review audio or URL-only chat avatars.
- Next actions: define/test the exact inventory rows and service-only grant; prove all families,
  metadata gaps and refusal behavior on one disposable PostgreSQL clone; record/clean/commit.
- Exit: every required local row below passes, forward/down are exact, the clone is removed and
  hosted/provider/real-data/copy/activation remain NOT RUN.

**Resources:** Source/tests/docs only plus one disposable clone of `genova_008_test_restore`,
estimated below 300 MiB. Do not start a simulator, native build, provider download or root web build.
Use one PostgreSQL test clone, remove it after the final dependent check, and remain above 10 GiB.

## Allowed paths

- One CLI-generated `supabase/migrations/*_private_r2_copy_inventory_063.sql`: deterministic,
  read-only inventory function and private helpers.
- `supabase/rollback/063_private_r2_copy_inventory_down.sql`: exact refusal-aware down path.
- `supabase/tests/063_private_r2_copy_inventory.sql`: fixture/family/status/grant assertions.
- `supabase/test-support/063_private_r2_copy_inventory_runner.sh`: disposable-clone acceptance.
- This brief; after acceptance only concise runbook, handoff, active/progress/plan/MIGRATION indexes.

## Contract

- Input is one non-null choir UUID and one validated private bucket name. Output is stable ordered
  rows, never provider requests or writes. Each row includes family, owner table/row/slot/version,
  legacy reference and recognized Drive ID when present, stored name/MIME/length, deterministic
  item/version or batch identities, exact 053–060 destination key, and a machine-readable status.
- Enumerate repertoire files; current and historical assignment submissions; visible, private,
  public-history and private-history review audio; repertoire comment audio; both single/array chat
  image metadata; and URL-only room avatars. Preserve chat image order. A duplicate reference in
  distinct product slots remains distinct inventory; the copy/activation stage decides dedupe.
- Recognize only direct Drive IDs and the existing first-party `drive.google.com/file/d/...` or
  `drive.google.com/uc?...id=...` URL forms. `sb_` Storage aliases, external URLs, malformed IDs,
  missing stored metadata, orphaned history activation parents and current R2 aliases are visible
  status rows, not silently selected as copy-ready.
- Database size/MIME/name are untrusted hints. Even a structurally ready row requires Google
  metadata verification before it becomes a 062 manifest entry. The function emits no SHA-256.
- Stable UUIDs are derived only for migration identity; they are not proof of object existence.
  Destination paths exactly match 053–060. The later activation package must consume the same IDs
  or refuse; 063 itself inserts/updates/deletes no product row.
- The callable public function is `SECURITY DEFINER`, fixed empty `search_path`, exact-schema
  references, and executable only by `service_role`. `public`, `anon` and `authenticated` receive
  no schema/helper/function access. Invalid choir/bucket is rejected before reading.

## Transition start check

- Read: AGENTS, handoff/active context, plan controls, transition guide/work cycle/template, 052,
  061/062 and 053–060 schemas; current chat metadata writer/parser and assignment history/private
  review behavior; current Supabase changelog and Postgres privilege/RLS/constraint guidance.
- Boundary: shared backend schema, no web/native UI or runtime change. Existing public data paths,
  stable product row IDs, role authorization and 062's manifest validation stay unchanged.
- Authority/ownership: one primary writer. Scoped local SQL/tests/docs/commits and owned cleanup are
  authorized. Hosted reads/writes, backup/migration/deploy, real IDs/manifest, provider/billing,
  credentials, copy/cutover/source ACL/delete, hardware and distribution remain unauthorized.
- Required environments: disposable PostgreSQL clone with 053–060 prerequisites; forward, fixture
  matrix, role grants/refusals, volatility/read-only review, exact down/reapply, shell syntax, links,
  diff/security/resource review. No root `pnpm check`: no web/shared TypeScript/build path changes.

## Out of scope

- Provider activation/jurisdiction choice, hosted backup/read/schema/deploy, OAuth/R2 credentials,
  Google metadata enrichment, real JSONL/journal, object copy, activation/reconciliation or source
  mutation. No generalized media framework, client endpoint, admin UI, billing or feature work.
- Resolving orphaned historical assignment activation or retention policy. 063 must report those
  conditions; the later activation brief owns the smallest compatible schema/transaction.

## Risk, rollback and stop rules

- A missing family or a row incorrectly labeled copy-ready can cause irreversible release gaps.
  Test every owner/shape plus malformed/external/storage/R2/missing-metadata/orphan cases.
- Security-definer search-path or default-execute mistakes can expose identifiers. Exact privilege
  assertions are required for `public`, `anon`, `authenticated` and `service_role`.
- Down refuses if an unexpected dependent object exists. Code rollback is Git revert; the local DB
  clone is disposable. No live rollback exists because no hosted action is authorized.
- Stop on dirty-path overlap, prerequisite drift, clone growth threatening the floor, a second
  failed design approach without new evidence, or any need for real credentials/data.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? | Status | Proof required | Limit |
|---|---|---|---|---|
| Six-family complete ordered inventory | yes | NOT RUN | Local fixtures cover every accepted owner/slot, chat single/array order and room-avatar URL extraction | Synthetic rows only. |
| Honest classification and exact destination identity | yes | NOT RUN | Ready-hint, missing metadata, non-Drive/unsupported, malformed/orphan and already-private cases; deterministic IDs/keys stable across repeated calls | No provider verification or SHA-256. |
| Read-only and least privilege | yes | NOT RUN | Repeated call leaves product/private tables unchanged; volatility/body review; only service role executes; invalid choir/bucket and other roles refuse | Self-review, not hosted abuse test. |
| Forward/down/reapply and prerequisite refusal | yes | NOT RUN | Disposable PG17 clone applies 053–063, tests, exact down, absence, reapply; wrong baseline refuses closed | Not hosted migration/restore evidence. |
| Required local gates and cleanup | yes | NOT RUN | Runner/shell syntax, doc links, `git diff --check`, final diff/security/resource review; clone/output removed, free space measured | No root/mobile build needed. |
| Hosted/provider/real-data/copy/activation/device/release | no — later authority | NOT RUN | Separate approved brief/run | Still required for operational beta/full goal. |

Required FAIL or NOT RUN keeps 063 open. Passing local SQL is not current hosted inventory, copied
data, Drive exit, Android beta or store acceptance.

**Delivery:** Commit this contract separately as `063: define private copy inventory contract`.
Then generate the migration with the inspected CLI, implement only the allowed paths, and keep the
next external request unchanged: choose EU jurisdiction or Automatic and explicitly authorize R2
activation; hosted/data operations remain separately gated.
