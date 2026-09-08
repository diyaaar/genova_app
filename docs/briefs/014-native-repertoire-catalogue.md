# 014 — Shared catalogue core and native repertoire catalogue

Date: 2026-09-08. Status: local acceptance complete. Single writer: main agent.

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

- [x] Shared catalogue imports are platform-free; current web imports and behavior remain compatible.
- [x] Pure tests cover normalization, role scope, chorist visibility, search/tag filtering and
  scope identity without treating UI filtering as authorization.
- [x] Native gateway tests cover source mapping, cache hit, forced refresh, choir-separated keys,
  malformed/error behavior and cleanup.
- [x] Native UI tests cover loading, populated, empty, error/retry, refresh, search/tag, back and active-
  choir shell integration; no live client is used.
- [x] Choir switch/sign-out invokes registered catalogue cleanup before another tenant can load.
- [x] Root and mobile gates pass. Device, live product, Edge/PDF and hardware remain NOT RUN.
- [x] Code and evidence records are separate 014 commits; unrelated work is not staged.

## Evidence

| Required criterion | Status | Evidence / limits |
|---|---|---|
| Shared core and web compatibility | PASS | 2026-09-08: `lib/repertuvar/catalog-core.ts` has no client, browser, Next or native import. Existing web exports remain available through `lib/supabase.ts`; root lint, TypeScript, 211 tests and production build passed. |
| Pure catalogue rules | PASS | 2026-09-08: 5 Vitest cases passed for join normalization including removal of transport fields, Turkish role precedence, chorist visibility/assignment, search/tag narrowing and choir/member/role scope identity. |
| Native gateway and cache isolation | PASS | 2026-09-08: Jest covers mapping, cache hit, force refresh, version invalidation, choir separation, role-scope change, malformed version, missing folder, source failure and registered cleanup. Cache lookup uses the exact `choirId + memberId + roleScope` key. |
| Native catalogue UI | PASS | 2026-09-08: component tests cover loading/populated/empty/no-result/error/retry/refresh/search/tag and shell open/back. The gateway is injected; no network or live client was used. |
| Tenant cleanup | PASS | 2026-09-08: existing auth-store tests prove cleanup precedes choir-switch RPC and runs on sign-out; the new gateway registration test proves that boundary clears catalogue state. |
| Repository/mobile gates | PASS | 2026-09-08: root `pnpm check` passed (34 files / 211 tests plus lint, typecheck, service-worker syntax and Next build). Mobile `npx tsc --noEmit && npm test -- --runInBand && npm run bundle:check` passed (7 suites / 50 tests; iOS export, 666 modules, 2.2 MB Hermes bundle). Device, live product, Edge/PDF, provider and hardware tests are **NOT RUN** and are not claimed by this local package. |
| Commit and scope discipline | PASS | Planning commit `007d1eb` preceded product work; product code is separate commit `9cec58d`. This evidence update is documentation-only. Six changed Markdown files contained 65 local links and zero missing targets; contradiction search and `git diff --check` passed. The pre-existing `supabase/.temp/cli-latest` change remains unstaged. No push or external write was performed. |

Local acceptance closes only package 014. It does not prove real-account RLS behavior, protected
file access, PDF rendering, a device build, hardware behavior, deployment or the live product.
