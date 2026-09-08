# 013 — Native repertoire read-path contract and implementation split

Date: 2026-09-08. Status: documentation accepted. Single writer: main agent.

## Outcome and authority

Define one evidence-backed, implementation-ready contract for the native repertoire catalogue,
protected PDF access and read-only annotation display, then split the product work into bounded
packages. The owner authorized local implementation, local commits, read-only live checks and
repository gates. This brief does not authorize a push, deployment, migration, production-data
write or deletion, real choir access, email, spending or hardware testing.

## Start check

- Verified `main` at local HEAD `97a4452` after WF-005; remote `main` was independently verified
  at `a13f696` before that local documentation commit. The only unrelated working-tree change is
  `supabase/.temp/cli-latest`, which remains unstaged.
- Read root AGENTS, handoff, migration guide, work cycle, all six memory-bank files, MIGRATION,
  decisions, delivery plan, 002/004/010/012 and WF-005.
- Inspected the web catalogue/detail/workspace, shared annotation types, catalogue/cache/offline
  helpers, protected Drive token/proxy authorization, tenant migrations/tests, the 002 RN spike,
  and the complete `apps/mobile` shell and dependency set.
- Queried schema columns and RLS policy definitions in the isolated PostgreSQL 17.11 database
  `genova_008_test_restore`; no production database query or write was used for this contract.
- Chrome remains open under the Genesi Nova profile on the private GitHub repository. Its visible
  remote `main` was `a13f696`; that read-only observation is not a release or sync claim.
- Preserve the web UI, current active-choir fail-closed contract, permanent WebView list and
  `lib/repertuvar/annotation-types.ts` as the shared annotation source of truth.
- Allowed: this brief and status/handoff indexes needed to route the next package.
- Excluded: product code, dependencies, database changes, live calls and external writes.
- Validation: source-to-contract trace, implementation-boundary review, local Markdown links,
  contradiction search and `git diff --check`.

## Verified current system

### Native shell

`apps/mobile` contains authentication, secure session storage, zero/one/many membership
resolution, active-choir selection, a tenant-cache registry and the smallest ready shell. It has
no navigation, catalogue, file, PDF, Skia, gesture or offline dependency. `ShellScreen` explicitly
holds repertoire/PDF for the next brief. The native gate is TypeScript + Jest + iOS bundle export;
platform builds and hardware remain separate evidence.

### Catalogue and role behavior

The web catalogue reads `repertoire`, nested `repertoire_files` and tag joins, then reads tags and
the active member's `song_assignments`. It relies on authenticated RLS and `current_choir_id()`;
the client does not supply a trusted choir ID. The restored schema confirms `choir_id NOT NULL` and
the restrictive `tenant_isolation_003` policy on every catalogue table.

The initial native UX must match the current web behavior:

| Role scope | Catalogue shown by the client | Details/files |
|---|---|---|
| `chef` | Visible and hidden songs | All files allowed by RLS; management remains web-only in this package |
| `leader` | All rows returned by the active-choir policies | All active-choir files allowed by RLS |
| `chorist` | Only visible songs assigned to the active member | Only assigned, visible song files |

RLS is the authority even when the UI filters again. The restored policy set can also return an
unassigned visible song when it has no assignments at all; the web currently hides that row from
choristers, so native does the same until a separate product decision changes both clients.

`repertoire`, files, tags, song-tag relations, assignments and cache versions can be read directly
through the authenticated Supabase client. No new Next route or Edge function is needed merely to
list metadata. Direct queries must fail closed when the active choir is unresolved.

### Catalogue data contract

The pure shared layer will own these values without importing the initialized web Supabase client:

- `RepertoireFileType = 'sheet' | 'midi' | 'audio' | 'other'`.
- Song: `id`, `title`, nullable `composer`/`drive_folder_id`, `is_visible`, `created_at`, files,
  tags and derived assignment/part data.
- File: existing repository fields including `id`, `song_id`, name/type/partition, Drive ID and
  links, MIME, size, uploader and timestamps. Provider links are data, not authorization.
- Tag: `id`, `name`, nullable color, creator and timestamp.
- Catalogue: nullable server version/update time, fetch time, normalized songs/tags,
  `userParts` and deduplicated `assignedSongIds`.

Normalization and presentation filters must be pure functions with malformed/null join coverage.
The current `lib/supabase.ts` public types remain re-exported for web compatibility while their
pure definitions move behind a shared file. No DOM, browser storage or initialized client may
enter the native import graph.

### Cache and invalidation contract

- Native catalogue cache identity includes `choirId + memberId + roleScope`; it never uses an
  anonymous scope for authenticated private data.
- A server cache-version mismatch invalidates metadata. Realtime is an enhancement, not the only
  invalidation mechanism; foreground refresh remains required.
- Switching choir and signing out first invoke the existing native tenant-cache registry. The
  catalogue, protected-file references, downloaded PDFs and annotation rows register cleaners.
- Cache cleanup is defense in depth. Every network read is still authorized by RLS/Edge; a cleanup
  failure must not make another choir's data eligible for display.
- Offline file availability is outside the first read path. No service-worker cache code is ported
  to React Native.

### Protected file-access contract

The current web flow uses `/api/drive-file-token` plus `/api/drive-file/[id]`. A native app cannot
depend on a Next-only relative route, and AGENTS requires new server logic for a native screen to
live in an Edge Function used by both clients. Package 015 will therefore introduce the smallest
shared read-only Edge endpoint and migrate the web reader to it; it will not migrate uploads,
deletes, Drive contents or provider storage.

The endpoint contract is:

1. Require and verify the caller JWT; resolve `auth.uid()` and the server-confirmed active choir.
2. Accept a repository file ID, never a trusted choir/member/role or arbitrary provider path.
3. Resolve the file → song relationship inside the active tenant. Enforce hidden/assignment/role
   rules at the server and return the same generic refusal for absent and unauthorized records.
4. Permit only passive repertoire content for this path; keep the existing active-content deny,
   `nosniff`, private/no-store and safe filename behavior.
5. Support the byte/range and HEAD behavior the selected native PDF downloader actually needs.
   Expired/invalid authorization, upstream failure, missing file and bad range have explicit,
   non-sensitive responses.
6. Keep Drive/service credentials only on the server. A provider URL or object prefix is never an
   authorization result. Provider migration remains a later, separately authorized project.

The endpoint is not deployed in package 015 without explicit approval. Until it is live, a native
catalogue can be accepted locally with fake metadata but the real PDF route remains NOT RUN.

### PDF and read-only annotation contract

- The proven product architecture from spike 002 is PDF page → app-private bitmap → Skia overlay.
  The product package revalidates dependency versions rather than copying generated spike output.
- Sheet candidates are `file_type === 'sheet'`; PDF detection also checks MIME/name. Cover files
  (`file_type === 'other'`, partition `__cover__`) are not score sheets. Audio is later work.
- `lib/repertuvar/annotation-types.ts` remains the only shape/coordinate/color source. Page numbers
  in database rows are one-based; the tested native PDF renderer API uses zero-based indices, so
  conversion occurs at one named boundary and is unit tested.
- Only schema version 1 is rendered in this package. Rows with future schema versions and unknown
  item types are skipped with a non-blocking warning; they must never crash an older app.
- The current web loader checks only that `annotations_json` is an array, while the spike parser
  filters unknown types. Before native rendering, a shared defensive parser must validate each
  known shape sufficiently to render it safely, clamp normalized points and report skipped counts.
  Web and native then use the same parser.
- Read visibility comes from existing RLS: personal, shared-all and permitted voice-group layers.
  No annotation insert/update/delete is part of the read-only package.
- Corrupt/empty/large PDFs, no sheet, expired access, interrupted download, unknown annotation,
  page-render failure and choir switch all render explicit recoverable states. A blank stage is
  never treated as success.

## Bounded implementation packages

| Package | One verifiable outcome | Principal files | Required local evidence | External/hardware boundary |
|---|---|---|---|---|
| 014 | Native catalogue with shared pure types/filtering and fake-gateway UI tests | `lib/repertuvar/*-core.ts`, compatible web imports, `apps/mobile/src/repertoire/*`, shell/root tests | Root `pnpm check`; mobile type/test/bundle; malformed joins, role filters, zero/error/refresh, switch cleanup | No live data, deploy or device claim |
| 015 | Shared Edge protected-file read endpoint and web adoption | `supabase/functions/`, shared server core/tests, web file URL adapter | Auth/tenant/role/file/range/expiry tests; restored DB regression where needed; root gate | Deploy and live product checks need explicit approval |
| 016 | Native PDF download/render plus read-only annotations | native PDF/cache/render modules, shared defensive parser and tests | Root/mobile gates; synthetic 40-page/corrupt/unknown-type fixtures; own simulator/emulator build where available | Hardware smoothness/keychain/real account remain NOT RUN |
| 017 | Non-hardware end-to-end acceptance and pilot handoff | tests and evidence documents only unless a defect is found | Signed-out → selected choir → catalogue → synthetic PDF → annotation; cache isolation and recovery | Real users/content/devices, email, push and release separately authorized |

Later packages retain the roadmap order: annotation writes, audio, permanent WebView bridge,
chat, assignments/home, plan limits, controlled storage migration and store readiness. Each opens
only after the preceding package records its actual PASS/FAIL/NOT RUN evidence.

## Acceptance

- [x] Source and restored-schema inventory distinguishes implemented behavior from targets.
- [x] Catalogue DTO, role visibility, cache identity and tenant-failure behavior are explicit.
- [x] Protected file access has one Edge target contract shared by web/native, with security,
  range, provider and deployment boundaries explicit.
- [x] PDF/read-only annotation behavior preserves the shared type source and names defensive,
  compatibility and error behavior.
- [x] Packages 014–017 each have one outcome, file boundary, gates and honest external limits.
- [x] Documentation links, contradiction search, diff and scope review pass.

## Evidence

| Required criterion | Status | Evidence / limits |
|---|---|---|
| Current implementation inventory | PASS | 2026-09-08 source trace covered the two web routes, 3,520-line workspace, catalogue/cache/offline modules, file authorization/token/proxy, 002 spike and the full native shell/dependency list. Implemented and target behavior are separated above. |
| Catalogue and tenant contract | PASS | Isolated PostgreSQL 17.11 schema read found `choir_id NOT NULL` plus six `tenant_isolation_003` policies across the six catalogue/annotation tables. Existing role policies and web filters were compared; no production query was run. |
| Protected file contract | PASS | Current Next authorization and 331-line token/proxy path were traced through repertoire, comment audio, assignment review and submission cases. The new contract is limited to passive repertoire reads and names every retained refusal/header/range boundary. |
| PDF and annotation contract | PASS | `annotation-types.ts` has no imports and remains a pure shared TypeScript surface. The review confirmed the current web loader's array-only validation, spike 002's unknown-type filter, one-based DB pages, zero-based renderer pages and five absent native PDF dependencies. |
| Package split | PASS | Manual scope review: 014 catalogue, 015 Edge file read, 016 PDF/read-only annotations and 017 non-hardware acceptance each have one outcome and do not infer live, provider or hardware authorization. |
| Document integrity and scope | PASS | 2026-09-08 local check: one new Markdown file, zero file links and zero missing targets; targeted source assertions and `git diff --check` passed. Diff is this brief only, apart from the pre-existing unstaged Supabase CLI cache. |

No product, database, provider, CI, deployment, browser-flow or hardware test is claimed.
The restored-database queries were read-only metadata inspection, not a new behavioral regression
run and not live-state proof. Final delivery is a documentation-only `013:` commit; no push.
