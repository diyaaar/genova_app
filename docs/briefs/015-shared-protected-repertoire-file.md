# 015 — Shared protected repertoire-file read path

Date: 2026-09-08. Status: in progress. Single writer: main agent.

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
3. Sign only server-resolved file metadata with Web Crypto and a short expiry. The ticket binds
   the repository file ID, provider ID/location, safe display metadata and expiry; caller-supplied
   choir, role, member, MIME, filename or provider path is never trusted or copied into it.
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

- [ ] Transport and ticket tests cover method/body/auth/file-ID validation, signature tampering,
  expiry and file-ID binding without leaking credentials or provider locations in errors.
- [ ] Authorization tests cover server-confirmed active choir, RLS-returned file acceptance,
  generic absent/unauthorized refusal, active-content denial and provider access only after auth.
- [ ] Content tests cover GET/HEAD, full/open/suffix ranges, malformed/unsatisfiable ranges,
  upstream/storage failure, MIME recheck, headers and safe filename behavior.
- [ ] Web adapter uses repository file IDs and the shared Edge ticket helper; user-scoped cache,
  session recheck, expiry refresh, error text and auth cleanup remain tested.
- [ ] Isolated PostgreSQL 17.11 acceptance proves the role/assignment/tenant matrix and leaves
  tracked fixture data unchanged. No production database operation occurs.
- [ ] Root `pnpm check` passes. Deno CLI, deploy, live product, native PDF, provider migration,
  device and hardware checks remain NOT RUN unless separately and actually run.
- [ ] Planning, product code and evidence records are separate 015 commits; unrelated work is not staged.

## Evidence

| Required criterion | Status | Evidence / limits |
|---|---|---|
| Ticket transport and integrity | NOT RUN | Pending implementation and focused tests. |
| Authorization and refusal behavior | NOT RUN | Pending handler and isolated-RLS tests. |
| Content, range and provider behavior | NOT RUN | Pending pure handler/provider tests. |
| Shared client and web adoption | NOT RUN | Pending adapter implementation and tests. |
| Isolated database matrix | NOT RUN | Pending rollback-safe local run. |
| Repository and environment gates | NOT RUN | Pending root gate and scope review. |
| Commit and scope discipline | NOT RUN | This planning brief will be committed before product changes. |
