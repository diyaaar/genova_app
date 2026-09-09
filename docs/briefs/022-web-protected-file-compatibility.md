# 022 — Web protected-file compatibility acceptance

Prepared: 2026-09-09. Status: **PLANNED / NOT RUN**. Single writer and self-reviewer:
main agent; no independent review is claimed. This is delivery-plan package A3.

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
| Guarded fixture/runtime uses actual local Auth, current-choir RPC, RLS, Edge route and private Storage PDF/audio bytes; source and target baseline restore | yes | **NOT RUN** | Run dedicated 022 prepare → browser matrix → cleanup | Must record exact service versions, fixture sizes/hashes and local-only boundary |
| Production-mode product browser signs in the synthetic multi-choir user and exposes only choir A's assigned protected PDF/audio consumers | yes | **NOT RUN** | Actual local Chrome through `@playwright/test` | DOM mocks or direct service calls do not satisfy this row |
| Actual protected PDF bytes render or are consumed by the existing viewer, and actual protected audio bytes reach the existing audio consumer with supported playback/range behavior | yes | **NOT RUN** | Product UI + Edge/Storage network evidence | Record exact bytes/checksums; autoplay policy may require an explicit browser gesture but is not a reason to skip the audio consumer |
| Explicit offline action stores and serves the authorized file through the real service worker; runtime and offline statuses remain distinct | yes | **NOT RUN** | Production Service Worker + Cache Storage + `/offline-drive/` | Must not infer from helper tests or claim general offline authorization revocation |
| Expired/stale ticket or refused first request renews safely; failed/missing upstream download has bounded UI behavior without stale cross-tenant bytes or secret leakage | yes | **NOT RUN** | Actual HTTP/browser retry and failure scenarios | Same-tenant offline fallback, if retained, must be observed and distinguished from tenant isolation |
| Wrong-choir request is refused and choir switch removes every A-owned protected URL/PDF/audio/runtime/offline cache before B state is consumed | yes | **NOT RUN** | Actual RPC/RLS/Edge + browser storage/cache inspection | Existing issued-ticket expiry contract remains unchanged; browser teardown is the acceptance boundary |
| Sign-out clears protected caches, ticket state, choir preference and authenticated session even when repertoire consumers are no longer mounted | yes | **NOT RUN** | Product sign-out + browser storage/cache/session inspection | Must include all protected service-worker cache namespaces and audio state |
| Focused tests, service-worker syntax, production browser run and root `pnpm check` pass without secret-bearing evidence | yes | **NOT RUN** | Root and guarded 022 commands | Native gates N/A unless shared/mobile source changes; hosted/remote CI remains NOT RUN outside this brief |
| Diff, fixture/runtime cleanup, links, separate commits and authority boundaries preserve 004/010 and historical acceptance | yes | **NOT RUN** | Final self-review | 004 remains 25/27 and 010 remains 6/7; unrelated CLI cache stays unstaged |

## Delivery

No acceptance is claimed at planning time. The final record must name the code/test commit, separate
evidence commit, rollback order, exact retained limitations and next ready package. A3 cannot be
closed by helper tests alone or by reusing A2's mobile evidence.
