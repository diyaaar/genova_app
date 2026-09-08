# 015 — Shared protected repertoire-file read path

Date: 2026-09-08. Status: local acceptance complete. Single writer: main agent.

## Outcome and authority

Add one read-only Supabase Edge endpoint that authorizes a repository repertoire-file ID in
the caller's server-confirmed active choir, issues a short-lived signed read ticket and serves
the passive file with safe HEAD/range behavior. Move the web repertoire reader to the same
ticket contract and provide a platform-free client seam for the later native PDF package.

This package is local-only. It does not authorize a push, Edge deployment, database migration,
production-data access, real choir access, email, spending or hardware testing.

## Start check

- Verified `main` at local HEAD `329952f`; recorded remote `main` is still `a13f696`.
- The only pre-existing working-tree change is `supabase/.temp/cli-latest`; leave it unstaged.
- Read the repository source order, [013](013-native-repertoire-contract.md), accepted
  [014](014-native-repertoire-catalogue.md), current web token/proxy routes and tests, server
  tenant/auth helpers, Edge handler patterns, function configuration and isolated RLS policies.
- Chrome remains open in the `Genesi Nova` profile on the private repository and the correct
  Supabase project `hievmwwctjjlhmssoxsu`. Browser state is read-only evidence, not write authority.
- The isolated PostgreSQL 17.11 database `genova_008_test_restore` confirms active-choir
  restrictive policies plus role/assignment SELECT policies on `repertoire` and
  `repertoire_files`. No production query was used for this start check.
- Preserve the current active-content deny list, `nosniff`, private/no-store, safe filename,
  assignment/visibility rules and generic absent/unauthorized refusal. RLS remains authoritative.
- Allowed production files: a new function under `supabase/functions/repertoire-file/`, its
  pure/testable modules and tests; `supabase/config.toml`; the smallest platform-free ticket
  client and web URL adapter/tests; local SQL policy regression and safe local runner if needed.
- Allowed records: this brief, MIGRATION, handoff and active/progress indexes.
- Excluded: uploads/deletes, assignment/comment files, Drive or Storage migration, catalogue UI,
  PDF rendering, annotations, new dependencies, live calls and every external write.
- Required gates: focused handler/client tests; isolated PostgreSQL RLS matrix with rollback and
  unchanged-fixture proof; root `pnpm check`; diff/scope review. Deno CLI is not currently
  available, so a Deno command cannot be claimed unless the environment changes.
- Rollback: revert the 015 code commit, then the separate 015 evidence commit. No external
  rollback is needed because this package is not deployed.

## Contract and implementation slices

1. Add a platform-neutral ticket request helper. It sends the current user JWT and repository
   `repertoire_files.id` to a configured Edge endpoint, validates the returned absolute URL and
   expiry, and contains no initialized client, DOM, Next or React Native import.
2. Add a testable Edge handler with injected Auth/database/ticket/provider seams. `POST` validates
   a bounded JSON body, verifies the JWT, explicitly resolves `current_choir_id()`, and queries
   `repertoire_files` through the same user-scoped client so active-choir and role/assignment RLS
   decide visibility. Missing and unauthorized rows receive the same response.
3. Sign only the server-resolved repository file ID, active choir ID and a short expiry with Web
   Crypto. `GET` reloads provider/display metadata by that signed pair, so no provider ID/path,
   MIME or filename is exposed in the ticket. Caller-supplied choir, role, member or provider
   metadata is never trusted or copied into it.
4. `GET` and `HEAD` verify signature, expiry and bound file ID before provider access. Reject
   active web content both before and after provider MIME resolution. Return full or one-range
   passive content with correct 200/206/416 headers, private/no-store, `nosniff`, safe inline
   filename and non-sensitive 4xx/5xx messages. CORS exposes only the required methods/headers.
5. Keep Drive retrieval and an already-recorded `storage://bucket/path` location behind injected
   provider adapters. Service credentials stay in the Edge entrypoint and are used only after the
   user-scoped authorization result. Do not add upload/delete or provider-migration behavior.
6. Change the web protected-file URL adapter to request this Edge ticket by repository file ID.
   Keep its cache user-scoped, recheck the current session before cache use and preserve auth-change
   cleanup. The old Next routes remain temporarily as release rollback compatibility but are no
   longer the repertoire reader's target.
7. Add an isolated SQL test for chef, section-leader, assigned-visible chorist, unassigned/hidden
   chorist, wrong-choir selection and no-active-choir outcomes. The runner must refuse non-local or
   non-test-named databases, execute in a transaction and prove tracked fixture tables unchanged.

## Acceptance

- [x] Transport and ticket tests cover method/body/auth/file-ID validation, signature tampering,
  expiry and file-ID binding without leaking credentials or provider locations in errors.
- [x] Authorization tests cover server-confirmed active choir, RLS-returned file acceptance,
  generic absent/unauthorized refusal, active-content denial and provider access only after auth.
- [x] Content tests cover GET/HEAD, full/open/suffix ranges, malformed/unsatisfiable ranges,
  upstream/storage failure, MIME recheck, headers and safe filename behavior.
- [x] Web adapter uses repository file IDs and the shared Edge ticket helper; user-scoped cache,
  session recheck, expiry refresh, error text and auth cleanup remain tested.
- [x] Isolated PostgreSQL 17.11 acceptance proves the role/assignment/tenant matrix and leaves
  tracked fixture data unchanged. No production database operation occurs.
- [x] Root `pnpm check` passes. Deno CLI, deploy, live product, native PDF, provider migration,
  device and hardware checks remain NOT RUN unless separately and actually run.
- [x] Planning, product code and evidence records are separate 015 commits; unrelated work is not staged.

## Evidence

| Required criterion | Status | Evidence / limits |
|---|---|---|
| Ticket transport and integrity | PASS | 2026-09-08: Web Crypto ticket tests prove exact repository-file/choir/expiry payload, tamper and secret mismatch rejection, expiry boundary and malformed-input refusal. The ticket contains no provider ID/path or credential. Handler transport tests cover method, bearer, body-size, JSON shape and UUID refusal. |
| Authorization and refusal behavior | PASS | 2026-09-08: handler tests prove JWT failure, exact file/choir binding, one 403 message for absent/unauthorized/mismatched issuance, active-content denial before minting, invalid ticket refusal before DB/provider calls and provider access only after ticket-bound lookup. The Edge adapter explicitly calls `getUser`, `current_choir_id()` and a user-RLS file query. |
| Content, range and provider behavior | PASS | 2026-09-08: handler tests cover full GET; HEAD; closed/open/suffix ranges; five malformed/unsatisfiable ranges; Drive and Storage selection; malformed Storage location; missing row; provider failure; post-provider active MIME denial; CORS; no-store/nosniff/referrer policy; length/range headers and filename encoding. Provider errors are not reflected. |
| Shared client and web adoption | PASS | 2026-09-08: platform-free client tests cover repository UUID-only body, bearer header, HTTPS/local-development endpoint rules, same-origin/path/file binding, expiry and server errors. Web cache tests cover user separation, session recheck, 30-second refresh and cleanup. Repertoire workspace hooks, audio tracks and offline sync now use the Edge ticket; direct provider fallback was removed. Legacy Next routes remain for non-repertoire consumers and rollback compatibility. |
| Isolated database matrix | PASS | 2026-09-08: `PGDATABASE=genova_008_test_restore bash supabase/test-support/015_repertoire_file_runner.sh` passed on PostgreSQL 17.11 for chef, section leader, assigned-visible chorist, unassigned chorist, unresolved multi-membership and wrong-choir selection. Before/after hashes of ten tracked fixture tables matched. The guard separately refused database `postgres` and host `localhost` with exit 2. |
| Repository and environment gates | PASS | 2026-09-08: focused suite passed 4 files / 32 tests. Root `pnpm check` passed lint, TypeScript, 37 files / 240 tests, service-worker syntax and Next production build. Deno CLI is absent, so a Deno-specific compile/serve check is **NOT RUN**. Edge deploy, live product, provider integration, native PDF, device and hardware are **NOT RUN**. |
| Commit and scope discipline | PASS | Planning commit `baae510` preceded product work; product code/test commit is `42fc8ff`; this evidence update is documentation-only. Seven changed Markdown files contained 76 local links and zero missing targets; contradiction search and `git diff --check` passed. The pre-existing `supabase/.temp/cli-latest` remains unstaged. No push, deploy, migration, production-data query/write or other external write occurred. |

Local acceptance closes package 015 only. A release must deploy/configure the Edge function before
shipping the web commit that targets it, then verify authenticated ticket issuance and passive
GET/HEAD/range behavior without touching the real choir unless separately authorized.
