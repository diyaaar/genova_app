# 014 — Shared catalogue core and native repertoire catalogue

Date: 2026-09-08. Status: in progress. Single writer: main agent.

## Outcome and authority

Add a native, active-choir repertoire catalogue backed by shared pure TypeScript
normalization/filter rules and a testable Supabase gateway. This package is local-only: no
production data, real choir, push, deployment, migration, email, spending or hardware test.

## Start check

- Verified `main` at `2210496`; remote `main` remains separately recorded at `a13f696`.
- The only pre-existing working-tree change is `supabase/.temp/cli-latest`; leave it unstaged.
- Read the source order in the handoff and [013](013-native-repertoire-contract.md).
- Preserve the web catalogue UI and its public imports, 005 fail-closed active choir behavior,
  RLS as the authorization authority, and the shared annotation contract.
- Allowed production files: pure catalogue modules/tests under `lib/repertuvar`, compatible
  type re-exports/imports in `lib/supabase.ts` and `lib/repertuvar/{cache,queries}.ts`, and
  catalogue/gateway/UI/tests under `apps/mobile/src` plus the smallest shell/root wiring.
- Allowed records: this brief, MIGRATION, handoff and active/progress indexes.
- Excluded: dependencies, PDF/Skia/files, annotations, web visual changes, Supabase migrations,
  Edge functions, live calls and external writes.
- Required gates: focused root/mobile tests during work; root `pnpm check`; in `apps/mobile`,
  `npx tsc --noEmit && npm test && npm run bundle:check`; diff/scope review.
- Rollback: revert the 014 code commit, then the separate 014 evidence commit. No external
  rollback is needed.

## Implementation slices

1. Extract the existing repertoire DTOs and normalization into a platform-free module while
   preserving `lib/supabase.ts` exports for every current web consumer.
2. Add pure role and catalogue filtering rules: chef/leader see their RLS-returned rows;
   chorists see only visible assigned songs; search and tag filters cannot widen access.
3. Add a structural native source and high-level gateway. The Supabase adapter relies on the
   authenticated active-choir RLS context, does not trust a client choir ID for authorization,
   and caches only under `choirId + memberId + roleScope`.
4. Register catalogue cache cleanup with the existing tenant-cache registry. Foreground/retry
   refresh can bypass metadata cache; errors never fall back to another scope.
5. Replace the shell note with an explicit catalogue entry. Implement loading, empty, error,
   retry, refresh, search, tag, assignment-part and back/switch/sign-out paths without adding a
   navigation dependency.

## Acceptance

- [ ] Shared catalogue imports are platform-free; current web imports and behavior remain compatible.
- [ ] Pure tests cover normalization, role scope, chorist visibility, search/tag filtering and
  scope identity without treating UI filtering as authorization.
- [ ] Native gateway tests cover source mapping, cache hit, forced refresh, choir-separated keys,
  malformed/error behavior and cleanup.
- [ ] Native UI tests cover loading, populated, empty, error/retry, search/tag, back and active-
  choir shell integration; no live client is used.
- [ ] Choir switch/sign-out invokes registered catalogue cleanup before another tenant can load.
- [ ] Root and mobile gates pass. Device, live product, Edge/PDF and hardware remain NOT RUN.
- [ ] Code and evidence records are separate 014 commits; unrelated work is not staged.

## Evidence

| Required criterion | Status | Evidence / limits |
|---|---|---|
| Shared core and web compatibility | NOT RUN | Pending implementation and root gate. |
| Pure catalogue rules | NOT RUN | Pending focused tests. |
| Native gateway and cache isolation | NOT RUN | Pending focused tests. |
| Native catalogue UI | NOT RUN | Pending component tests. |
| Tenant cleanup | NOT RUN | Pending store/integration test. |
| Repository/mobile gates | NOT RUN | Pending full local commands. |
| Commit and scope discipline | NOT RUN | Planning brief will be committed before product changes. |
