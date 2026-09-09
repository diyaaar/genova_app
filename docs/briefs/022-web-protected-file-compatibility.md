# 022 — Web protected-file compatibility acceptance

Prepared: 2026-09-09. Status: **LOCAL ACCEPTANCE COMPLETE** at code/test commit `fb4a6a2`.
Single writer and self-reviewer: main agent; no independent review is claimed. This is
delivery-plan package A3.

## Outcome and delivery focus

Prove, and repair only where actual evidence requires it, that the current production-mode web
repertoire uses the shared protected-file route safely for PDF, audio and offline consumers against
the isolated local service. One synthetic multi-choir user must be able to view the protected score,
consume protected audio, use the explicit offline copy, recover from expiry or a failed download,
then switch choir and sign out without retaining the previous tenant's protected bytes or URLs.

This brief closes only local/synthetic browser compatibility. It does not prove hosted deployment,
Drive behavior, real accounts/data, remote CI, physical hardware, pixel parity or publication.

## Execution start check

- [x] Read [AGENTS](../../AGENTS.md), [handoff](../agent-handoff.md),
  [migration guide](../gecis-rehberi.md), [work cycle](../ai-calisma-duzeni.md), the six
  memory-bank indexes, [MIGRATION](../../MIGRATION.md), [decisions](../../KARARLAR.md),
  [delivery plan A3](../mobil-teslim-plani.md#a--turn-the-existing-read-implementation-into-runtime-evidence),
  [015](015-shared-protected-repertoire-file.md), [018](018-protected-file-runtime-acceptance.md)
  and [021](021-mobile-protected-file-runtime-acceptance.md).
- [x] Verified `main` at `a162eb2` with only the pre-existing, unowned
  `supabase/.temp/cli-latest` modification. It remains unstaged and outside 022. The main agent is
  the sole writer; no subagent is used.
- [x] The owner's continuing instruction authorizes local implementation, isolated synthetic
  service/browser work, tests and required local commits. It does not authorize hosted Supabase or
  Drive, real account/data, remote CI dispatch, push/deploy, spending, messages or hardware.
- [x] A2 completed only the mobile lifecycle. The current web client obtains a session before using
  its user-scoped ticket cache; its hook can expose an offline route, renew a protected-file ticket
  and opportunistically seed the service worker. The service worker stores protected runtime and
  explicit offline responses by provider file ID. `AuthProvider` awaits all tenant-cache cleaners
  after server-side choir selection and before loading the new choir; sign-out clears tenant data
  before ending the session. These are reviewed code paths, not browser acceptance.
- [x] Existing focused tests cover shared ticket URL and small offline helpers but do not execute
  the hook, Service Worker, Cache Storage, repertoire PDF/audio consumers or tenant teardown in a
  real browser. `NODE_ENV=development` intentionally disables offline support, so acceptance must
  run from a production Next build rather than a development server.
- [x] Local Playwright package is `1.62.1`. Its managed Chromium binary is absent, but the installed
  `/Applications/Google Chrome.app` launched successfully through `@playwright/test` in headless
  mode. Actual browser availability must be rechecked in the final run; a DOM-only substitute does
  not satisfy the required browser rows.
- [x] The isolated service topology and source-copy protections from 018/021 remain the baseline.
  022 may create a dedicated disposable stack and synthetic PDF/audio/missing-object fixtures; it
  must not reuse a running task's mutable fixtures or call the hosted project.

## Allowed scope

- `lib/drive-file-url.ts`, `hooks/useProtectedDriveFileUrl.ts` and focused tests: ticket renewal,
  cancellation and safe fallback defects reproduced by the browser lifecycle.
- `lib/repertuvar/offline.ts`, `lib/shared-audio.ts`, `public/sw.js` and focused tests or the smallest
  testable helper needed to prove protected cache behavior. Do not replace the existing service
  worker or invent a second protected-file protocol.
- `components/repertuvar/` only for a PDF, audio or offline consumer defect reproduced in the actual
  browser. Preserve current web experience; pixel equality with native is not a goal.
- `supabase/test-support/022_*`: guarded fixture controller, deterministic synthetic audio bytes,
  browser runner and local orchestration. Reuse 018/021 patterns where safe. Runtime secrets belong
  only in ignored task-owned files or environment and must never enter logs, screenshots or commits.
- `docs/evidence/022-web-protected-file-compatibility/`, this brief and minimal roadmap,
  migration, memory and handoff indexes. Generated builds, browser profiles, logs and runtime output
  remain ignored.

## Preserved behavior and exclusions

- Preserve the shared repertoire identity, annotation and ticket contracts and existing native
  behavior. Do not add a Next.js API route, public bucket, service-role credential in the browser,
  parallel web-only file API or broad UI redesign.
- PDF and audio must use actual protected Storage-backed bytes through the current Edge route. A
  deterministic local synthetic audio object is allowed; local Storage is still not Drive proof.
- An already issued ticket remains a sessionless bearer URL until expiry. Choir-switch/sign-out
  acceptance therefore requires deleting browser-held URLs and all protected runtime/offline/audio
  caches; it does not invent server-side revocation or claim offline revocation is enforceable.
- Explicit offline availability must continue to be user initiated. A transient runtime cache is not
  silently promoted into a persistent offline product promise. Expiry renewal must not expose stale
  bytes from another tenant.
- No hosted query/write, deployment, remote CI, real user/data, real Drive, email/message, spending,
  physical device, 010 fixture recreation or closure of 004's two postponed hardware rows.

## Risk, authority and rollback

- Guard the Supabase URL as loopback HTTP, JWT issuer as `supabase-demo`, exact disposable project
  and container labels, and source database as the dedicated PostgreSQL 17 test copy before fixture
  mutation. Browser code receives only the local public URL/anon key and one ephemeral synthetic
  password, never the service key.
- Fixture cleanup runs on success and failure. Compare the source database hash and disposable
  target baseline; remove only 022 users, rows, Storage objects, browser profile/cache and runtime.
- Roll back the owned code/test commit followed by its documentation commit. Unknown targets,
  non-loopback configuration, changed source baseline, unexplained unrelated worktree changes,
  inability to use a real production browser or need for hosted/real data stops acceptance.

## Implementation and verification sequence

1. Create the dedicated guarded 022 runtime by reusing the smallest safe 018/021 local topology.
   Prepare two choirs, one multi-membership user, an assigned renderable PDF, supported synthetic
   audio, one missing/upstream-failure reference and deterministic sizes/checksums.
2. Add focused unit or integration coverage only for boundaries that can be usefully isolated:
   user-scoped ticket reuse/renewal, abort/stale request handling, offline status/clear and consumer
   error behavior. Keep the actual browser as the authority for Service Worker and Cache Storage.
3. Build and start the real Next application in production mode against loopback Supabase. In Chrome,
   sign in through the product, load repertoire, render/fetch the exact PDF, attach/play or inspect the
   actual protected audio, and create/read the explicit offline copy through `/offline-drive/`.
4. Force expiry/renewal and one failed download through the actual service boundary. Verify retry
   obtains a new ticket and correct bytes, while permitted same-tenant offline fallback remains
   explicit and a missing/failed object produces a bounded user-visible failure without leakage.
5. Switch to choir B and sign out. Inspect the UI, active session, in-memory ticket cache,
   local/session storage, service worker state and all protected Cache Storage namespaces. Prove A's
   PDF/audio/offline bytes and URLs are absent before B's empty/denied state is used.
6. Run focused checks, service-worker syntax, root `pnpm check`, production build/start browser
   acceptance, guarded fixture cleanup/source hash comparison, owned diff and link/consistency checks.
7. Commit product/test changes and evidence records separately. Mark A3 complete only if every
   required row below passes; otherwise retain the exact failure and continue the bounded repair.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 022 and A3 open. Review is self-review unless an independent
review is actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Guarded fixture/runtime uses actual local Auth, current-choir RPC, RLS, Edge route and private Storage PDF/audio bytes; source and target baseline restore | yes | **PASS** | 2026-09-09, `fb4a6a2`; dedicated 022 prepare → final status → cleanup, Supabase CLI 2.117.0 / PostgreSQL major 17 | Two memberships, three annotations, exact PDF/WAV hashes; target baseline restored and source snapshot unchanged. Exact observed versions and local-only limits are in [evidence](../evidence/022-web-protected-file-compatibility/README.md) |
| Production-mode product browser signs in the synthetic multi-choir user and exposes only choir A's assigned protected PDF/audio consumers | yes | **PASS** | 2026-09-09, installed Chrome 152.0.7977.83 through Playwright 1.62.1 against production Next | Actual product Auth/choir/catalogue UI; no DOM or service double. Local synthetic account only |
| Actual protected PDF bytes render or are consumed by the existing viewer, and actual protected audio bytes reach the existing audio consumer with supported playback/range behavior | yes | **PASS** | 2026-09-09, product PDF canvas and shared audio player through Edge/private Storage | PDF 65,905 bytes / `39fc…d6a3`; WAV 160,044 bytes / `b43d…6127`; audio GET returned 206 after explicit play gesture |
| Explicit offline action stores and serves the authorized file through the real service worker; runtime and offline statuses remain distinct | yes | **PASS** | 2026-09-09, production Service Worker + Cache Storage + `/offline-drive/` | Exact PDF/audio bytes and hashes returned; explicit caches held 2 files / 1 metadata row, transient runtime caches 2 / 2. No general offline revocation claim |
| Expired/stale ticket or refused first request renews safely; failed/missing upstream download has bounded UI behavior without stale cross-tenant bytes or secret leakage | yes | **PASS** | 2026-09-09, near-expiry PDF ticket plus missing existing audio object | Fresh ticket POST was observed; missing object produced visible `022-korunan-440hz.wav indirilemedi (502)`. Tracked evidence contains no ticket, JWT, credential or Storage locator |
| Wrong-choir request is refused and choir switch removes every A-owned protected URL/PDF/audio/runtime/offline cache before B state is consumed | yes | **PASS** | 2026-09-09, actual switch to choir B plus authenticated Edge request | All four protected cache namespaces and old audio controls were absent; B catalogue empty; A file request under B returned 403 without locator disclosure |
| Sign-out clears protected caches, ticket state, choir preference and authenticated session even when repertoire consumers are no longer mounted | yes | **PASS** | 2026-09-09, product profile-menu sign-out + browser inspection | Login UI returned; protected caches, auth token, choir/offline preferences and player controls were empty |
| Focused tests, service-worker syntax, production browser run and root `pnpm check` pass without secret-bearing evidence | yes | **PASS** | 2026-09-09, `fb4a6a2`; root gate then guarded 022 build/browser run | Root: 38 files / 253 tests, lint/typecheck/SW/build PASS. Final guarded production build and browser matrix PASS. Native N/A: no shared/mobile source changed; hosted CI NOT RUN |
| Diff, fixture/runtime cleanup, links, separate commits and authority boundaries preserve 004/010 and historical acceptance | yes | **PASS** | 2026-09-09, `fb4a6a2` plus this evidence record | Synthetic Auth/rows/objects and stack removed; task runtime moved to Trash; task VM's orphan disk removed. CLI cache unstaged; 004 stays 25/27 and 010 stays 6/7 |

## Delivery

Local A3 acceptance is complete at code/test commit `fb4a6a2`; exact commands, versions, browser
captures, failure history, hashes and cleanup are in the linked evidence directory. Rollback is
that code/test commit followed by its separate evidence commit. No product repair was required:
the existing web path passed. A4 release preparation may proceed locally, but its external
execution and A5 hardware pilot remain gated; B1 is the next independently ready local design
package while those gates wait. Deployment, Drive, hosted/real-user behavior, remote CI and
offline authorization revocation remain unverified.
