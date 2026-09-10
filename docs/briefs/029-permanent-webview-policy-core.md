# 029 — Framework-free permanent WebView policy core

Prepared: 2026-09-10. Status: **PLANNED / NOT RUN**. Single writer and self-reviewer: main agent;
no independent review is claimed.

## Outcome and delivery focus

Implement one dependency-free TypeScript policy module that both web and React Native can import
before a WebView exists. It must classify and canonicalize Genova app routes, validate version 1
bridge messages without side effects, reject replay/stale-tenant work, classify external HTTPS
destinations and produce diagnostics that cannot carry sensitive values. This closes the pure-policy
prerequisite of C1; it does not install, mount or simulate a WebView and it transports no session.

## Starting evidence

- Work starts from local `main` at 028 record commit `d5239c6`; the only observed unrelated change is
  the pre-existing `supabase/.temp/cli-latest`, which remains unowned and unstaged.
- [The 028 contract](../webview-bridge-contract.md) is the design authority: nine permanent web
  routes, native route families, exact-origin policy, v1 envelope/message types, redaction fields and
  the minimum pure vectors are specified. No runtime exists.
- Root Vitest excludes `apps/**`; mobile Jest resolves `@shared/*` to root `lib/*`. A small mobile
  contract test is therefore required to prove the shared source typechecks and executes in the RN
  test environment without duplicating it.
- Existing `lib/internalPageLinks.ts` has browser-link slug helpers, but its permissive cleanup is not
  an origin/security boundary. This package adds a separate fail-closed module instead of changing
  current browser behavior.

## Allowed files and ownership

- `lib/mobile-webview-bridge.ts` — framework-free route, URL, envelope, replay/epoch and diagnostic
  policy; no React, DOM, Next, Expo, Supabase or WebView imports.
- `lib/mobile-webview-bridge.test.ts` — exhaustive root pure-policy vectors.
- `apps/mobile/src/bridge/__tests__/mobile-webview-bridge.test.ts` — minimal RN/Jest import and
  contract-compatibility proof against the same root module.
- This brief for dated acceptance. After the code/test commit, only canonical status/evidence indexes
  named by the delivery workflow may change in the separate record commit.

## Sources and existing patterns

- `AGENTS.md`, `docs/gecis-rehberi.md`, `docs/ai-calisma-duzeni.md`, the six `memory-bank/` summaries,
  `MIGRATION.md`, `KARARLAR.md` and `docs/mobil-teslim-plani.md` — authority, ordering and evidence.
- [028 brief](028-permanent-webview-bridge-inventory.md) and
  [bridge contract](../webview-bridge-contract.md) — exact C1 ownership/protocol boundary.
- `vitest.config.ts`, `apps/mobile/package.json`, `apps/mobile/tsconfig.json` and existing shared-module
  tests — test discovery and `@shared` import pattern.
- Official primary sources linked in the 028 contract remain API-feasibility sources only; 029 does
  not claim or test WebView/Supabase runtime behavior.

## Migration start check

- Read instructions/evidence: the sources listed above and current source/test configurations.
- Single verifiable result: shared **common policy only**. Permanent pages remain web-owned; the
  module contains no UI, token refresh, server proof, storage, navigation side effect or backend.
- Preserved behavior/contract: regular-browser helpers are untouched; route ownership and v1 schemas
  follow 028; refresh token/active choir remain native-owned; availability is distinct from owner.
- Authority/files/writer: the user's continuing implementation request covers local reversible code,
  tests and commits. Main agent is the sole writer. No live/external/hardware authority is inferred.
- Tests/rollback/open limits: focused Vitest plus mobile Jest/typecheck and root `pnpm check`; revert the
  code/test commit to remove the module. WebView/browser/hosted/provider/hardware evidence is NOT RUN.

## Out of scope

- Installing `react-native-webview`, changing dependencies/lockfiles, mounting a native screen or
  implementing any web adapter, session/access-token transport, refresh, choir proof or cache clear.
- Calling Supabase, running a browser/WebView, changing RLS/DB/Edge, adding CSP, deployment, push/CI,
  real accounts/data, notification, file picker/download, password UI, hardware or release work.
- Rewriting current permanent pages or changing ordinary browser routes/link behavior.

## Risk, authority and rollback

- A false-positive route/message is a future security risk, so parsers reject ambiguity: controls,
  credentials, unexpected origin/port/query/fragment, encoded separator/traversal, extra keys,
  oversize input, invalid enum/path, wrong channel/version/instance/epoch and replay.
- Accepted parse results contain data but perform no side effect. Callers still own authorization,
  session proof, user confirmation, capability availability and execution.
- Diagnostics are constructed only from allowlisted bounded metadata; no API accepts a raw payload,
  URL, token, identifier, query or provider error for logging.
- If either client gate fails, keep 029 open and fix the shared source; do not fork/duplicate policy.
  Revert the product commit for code rollback. The 028 contract remains authoritative.

## Small implementation steps

1. Write failing pure vectors from the 028 minimum matrix, including all nine web routes, native
   ownership/availability, hostile URL forms, every v1 message type and external/redaction cases.
2. Implement the smallest dependency-free typed module: initial/navigation route policy, exact
   payload/envelope parser, bounded replay/tenant epoch guard and allowlisted diagnostics.
3. Add the mobile import proof; run focused tests, mobile typecheck/Jest, root `pnpm check`, diff review
   and secret-marker search. Repair implementation rather than weakening required vectors.
4. Record dated evidence and explicit NOT RUN layers; commit code/tests separately from records, then
   select the smallest ready 030 web-adapter slice.

## Definition of done

- [ ] All nine permanent routes and specified native/auth/unknown routes classify exactly; initial
  source and subsequent navigation use the same independently callable policy.
- [ ] Lookalike origin, scheme/port/userinfo, encoded separator/traversal, query/fragment, malformed
  UUID/date and overlong cases fail closed with stable reason codes.
- [ ] Every v1 message type accepts one exact payload and rejects malformed JSON/object/envelope,
  extra keys, wrong direction/channel/version/instance/epoch, duplicate ID and invalid payload.
- [ ] External policy returns canonical HTTPS plus display host only; diagnostics and their serialized
  forms never contain seeded secrets/IDs/full URLs/queries/provider errors.
- [ ] Epoch change rejects previously queued/message work and the bounded replay guard cannot grow
  without limit or share IDs across instances accidentally.
- [ ] The same root module passes both root Vitest and mobile Jest/TypeScript without framework imports.
- [ ] Migration guide checks, root `pnpm check`, mobile `npx tsc --noEmit && npm test`, diff review and
  scope/secret scan pass; all runtime/external layers remain explicitly NOT RUN.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 029 open. Review is self-review unless an independent review is
actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Exact web/native/auth/unknown route ownership, canonicalization and independent initial-source validation pass the full valid/hostile vector matrix | yes | **NOT RUN** | — | Root focused tests required |
| All v1 direction/type payloads accept exactly; malformed/extra/oversize/wrong-context/replay cases fail before a caller side effect | yes | **NOT RUN** | — | Root focused tests required; parser itself is side-effect free |
| External HTTPS classification exposes canonical URL to the caller but only a query-free display host; forbidden schemes/authority forms fail closed | yes | **NOT RUN** | — | Root focused tests required |
| Redacted diagnostic construction cannot serialize seeded access/refresh tokens, passwords, UUIDs, invitation URLs, queries or provider errors | yes | **NOT RUN** | — | Root focused tests and source review required |
| Bounded replay and tenant-epoch policy rejects duplicate, stale and pre-transition queued work while permitting a fresh instance/epoch | yes | **NOT RUN** | — | Deterministic root tests required |
| Shared module executes from both root and mobile without framework/WebView/Supabase imports or source duplication | yes | **NOT RUN** | — | Root focused tests plus mobile typecheck/Jest required |
| Root `pnpm check`, mobile `npx tsc --noEmit && npm test`, diff/scope/secret review pass; runtime and external layers remain correctly unclaimed | yes | **NOT RUN** | — | Full local gates required |

## Delivery boundary

029 may be marked complete only when all seven rows are PASS with dated local evidence. Even then it
proves pure policy only: dependency selection, embedded web, session/tenant proof, native callbacks,
browser regression, CSP, hosted service, real account, simulator/emulator composition, hardware,
accessibility and release remain NOT RUN. The next intended package is 030, not permission to execute
external work.
