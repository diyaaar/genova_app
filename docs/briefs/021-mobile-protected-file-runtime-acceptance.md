# 021 — Mobile protected-file service lifecycle acceptance

Prepared: 2026-09-09. Status: **LOCAL ACCEPTANCE COMPLETE** at code/test commit `404a9ee`.
Single writer and self-reviewer: main agent; no independent review is claimed.
This is the final bounded slice of delivery-plan A2.

## Outcome and delivery focus

Prove the product's default mobile Auth, catalogue, protected-file, private-cache and native
PDF/Skia path works end to end against the actual isolated 018 service on both current local
platforms. The observable outcome is one synthetic multi-choir user signing in, reading a real
40-page protected score, recovering from a refused first open, leaving the reader, switching
choirs and signing out without retaining the previous choir's private score.

This closes only local/synthetic A2. It does not prove hosted deployment, Drive, real accounts,
physical hardware, secure-storage durability across a real device reboot, M1, 004 or 010.

## Execution start check

- [x] Read [AGENTS](../../AGENTS.md), [handoff](../agent-handoff.md),
  [migration guide](../gecis-rehberi.md), [work cycle](../ai-calisma-duzeni.md), the six
  memory-bank indexes, [MIGRATION](../../MIGRATION.md), [decisions](../../KARARLAR.md),
  [delivery plan A2](../mobil-teslim-plani.md#a--turn-the-existing-read-implementation-into-runtime-evidence),
  [017](017-non-hardware-read-flow-acceptance.md), [018](018-protected-file-runtime-acceptance.md),
  [019](019-ios-native-pdf-render-acceptance.md) and
  [020](020-android-native-pdf-render-acceptance.md).
- [x] Verified `main` at `592cafb` with only the pre-existing, unowned
  `supabase/.temp/cli-latest` modification. It stays unstaged and outside 021. The main agent is
  the sole writer; no subagent is used.
- [x] The owner's continuing instruction authorizes local implementation, simulator/emulator
  execution, tests and required local commits. It does not authorize hosted Supabase/Drive,
  real account/data, CI dispatch, push/deploy, spending, messages or physical hardware.
- [x] Existing boundaries: 018 passed the actual isolated Deno/Auth/RLS/Storage route but used a
  non-renderable 45-byte PDF and removed its fixtures in the same process. 019/020 passed the
  actual native renderer from a bundled 40-page fixture but bypassed Auth, service download and
  private score storage. 017 passed retry/switch/sign-out only with injected doubles. No one of
  these results proves the combined lifecycle.
- [x] Product path under test is the unchanged default `App.tsx` composition:
  `AuthProvider` and its secure session storage, `list_my_choirs`/`set_active_choir`, the native
  Supabase catalogue, `repertoire-file` ticket request, Expo private-file download, actual
  platform PDF renderer, Skia overlay, reader close and tenant-cache clearing. A test-only entry
  may expose sanitized cache/step evidence but must compose these production modules rather than
  replace them with fakes.
- [x] Revalidated and used a task-owned `genova-021-runtime` Supabase stack, the iPhone 17 /
  iOS 26.5 simulator and `genova004_api36` Android 16 / API 36 arm64 emulator. Android's exact
  `tcp:54321` reverse route was added only for the run and removed before teardown.
- [x] **2026-09-09 Expo environment scope expansion:** the first iOS Release build succeeded but
  opened to a fail-closed blank screen with `EXPO_PUBLIC_SUPABASE_URL` missing. Expo production
  replacement does not support the existing indirect `readClientConfigFromEnv(process.env)`
  object access. Permit a focused correction in `apps/mobile/src/auth/supabase-client.ts` that
  keeps the parser but passes direct, statically addressable public-variable properties. Apply the
  same direct access to the 021 entry's fixture variables. Preserve this failed run as evidence;
  do not treat it as service or UI acceptance.
- [x] **2026-09-09 SecureStore preference scope expansion:** two iOS sign-out runs reached the
  signed-out UI and cleared reader caches, but the explicit persistence check first timed out and
  then isolated Expo SecureStore's `Invalid key` rejection. The mobile preference adapter passed
  the shared web key `genova:active-choir:<uuid>` unchanged, while SecureStore permits only
  alphanumerics plus `.`, `-` and `_`; its existing catch silently made mobile recall a no-op.
  Permit a mobile-only, deterministic `genova.active-choir.<uuid>` key encoding plus a native-rule
  regression test. Keep web localStorage's shared key unchanged.
- [x] **2026-09-09 Android local-transport scope expansion:** the first API 36 Release launch
  reached the guarded entry but Android correctly rejected cleartext HTTP to `127.0.0.1` before
  Auth. Permit an Expo config plugin under `apps/mobile/src/acceptance/` plus its `app.json`
  registration. The plugin must be inert by default, fail unless the explicit 021 flag and public
  Supabase URL identify loopback, and generate a domain-scoped network-security resource only for
  the disposable acceptance build. A normal regenerated project must contain no cleartext opt-in.
  Preserve the refused launch as transport evidence; it is not service-path acceptance.

## Allowed scope

- `apps/mobile/src/acceptance/`: a guarded local-runtime entry and sanitized acceptance status;
  it may inject only the first-open failure trigger needed to exercise retry. It must use the real
  Auth store/client, catalogue, reader, file store, annotation source and native renderer.
- `apps/mobile/app.json`: register the inert-by-default local acceptance config plugin. It must not
  enable cleartext transport in an ordinary build.
- Focused `apps/mobile/src/auth/`, `apps/mobile/src/repertoire/` and shared client files only for a
  defect reproduced by the combined runtime. Default product behavior and server authorization
  must stay intact; scope expansion is recorded here before an edit.
- `supabase/test-support/021_*`: guarded fixture prepare/status/cleanup and local orchestration.
  Reuse 018's exact local topology and source-copy protections where possible. Secrets belong only
  in task-owned ignored runtime files or process environment and must never enter logs/evidence.
- `docs/evidence/021-mobile-protected-file-runtime/`, this brief and minimal roadmap,
  migration, memory and handoff indexes. Generated native projects/builds and local runtime output
  remain ignored.

## Preserved behavior and exclusions

- Keep `lib/repertuvar/annotation-types.ts` the shared schema contract and preserve existing web
  callers. Do not add a Next.js API route, parallel mobile file protocol, public bucket or
  service-role credential to the app.
- The only fixture content is the tracked 40-page synthetic score and synthetic annotations.
  Use two synthetic choirs and one local multi-membership account so cache isolation is observable.
- The initial failure must come from the actual service authorization boundary, then UI retry must
  obtain a fresh permitted ticket. Do not falsify service success with an injected byte response.
- An issued ticket is an intentionally sessionless, expiring bearer URL for GET/HEAD. Choir-switch
  acceptance therefore does not invent immediate ticket revocation. It requires the app to discard
  the old URL/file and proves that a new A-file ticket request is refused while choir B is active.
- No hosted Supabase/Drive call, real identity/data, push, deployment, migration, remote CI,
  payment, email/message, physical device or 010 fixture recreation. Emulator/simulator evidence
  cannot close 004 or M1.

## Risk, authority and rollback

- Guard the Supabase URL as loopback HTTP, service key issuer as `supabase-demo`, exact disposable
  project/container identity and source database as a dedicated PostgreSQL 17 test copy before any
  fixture write. Mobile receives only the local public URL/anon key and one ephemeral synthetic
  password; never the service key.
- Fixture cleanup runs on success and failure. Compare the source database hash and disposable
  target baseline; remove only 021 users, rows, objects, session values and Android reverse routes.
- Roll back the owned product/test commit followed by its documentation commit. Remove only the
  task-owned disposable stack/runtime. Unknown targets, non-loopback URLs, stale unrelated
  fixtures, changed source baseline or need for hosted/real data stop the operation.

## Implementation and verification sequence

1. Recreate the smallest disposable Supabase runtime with 018's guarded schema/runtime copy. Add
   one fixture controller that prepares two choirs, a multi-membership chorist, one assigned
   renderable PDF and supported read-only annotations; it emits secrets only to an ignored local
   environment file and retains fixtures until explicit cleanup.
2. Add a guarded alternate mobile entry that refuses non-loopback configuration, signs in with
   the ephemeral account and renders the actual product flow. No service-role key or fixture bytes
   are bundled. Keep `App.tsx`, `index.ts` and production defaults unchanged.
3. On iOS, prove first-open refusal, UI retry, actual 40-page protected download/render, annotation
   overlay, back/close cleanup, reopen, choir switch cleanup and sign-out cleanup. Inspect pixels,
   accessibility state and only sanitized private-cache state.
4. Repeat the same behavior on Android using an explicit temporary reverse route to loopback.
   Record transport configuration and remove it after the run. A platform-specific failure stays
   open rather than being inferred from iOS.
5. Run focused/unit regression, `npm run check`, normal iOS and Android exports, affected native
   Release builds and root `pnpm check` only if root/shared product code changes. Inspect hashes,
   crash logs, fixture/source baseline, owned diff and cleanup.
6. Commit product/test changes and evidence records separately. Update A2 only if every required
   row below passes on both platforms.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 021 and A2 open. Review is self-review unless an independent
review is actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Guarded fixture/runtime uses actual local Auth, current-choir RPC, RLS, Edge route and private Storage bytes; source and target baseline restore | yes | **PASS** | 2026-09-09, `404a9ee`; guarded `prepare` → final `status` → `cleanup` against `genova-021-runtime` and local PostgreSQL 17 copy | Actual Auth/RPC/RLS/Edge/private Storage passed with two memberships, three annotations and 65,905-byte object SHA-256 `39fc…d6a3`; target baseline restored and source hash unchanged. Local only |
| Default mobile session and catalogue path signs in one synthetic multi-choir user and exposes only its assigned score | yes | **PASS** | 2026-09-09, iPhone 17 / iOS 26.5 and Android API 36 arm64 Release runs | Real default Supabase client, Auth store, membership RPC and catalogue exposed choir A's one assignment and choir B's empty state; no Auth/catalogue doubles |
| A real refused first open shows the reader error and UI retry then obtains a fresh ticket, downloads the exact 40-page PDF and renders page 1 with actual native PDF/Skia | yes | **PASS** | 2026-09-09, both Release apps; [visual evidence](../evidence/021-mobile-protected-file-runtime/README.md) | Actual Edge 401 `Oturum geçersiz`, UI retry, fresh ticket, exact 65,905-byte download and visible page 1/40 overlay passed. Storage checksum and iOS cached file matched; Android Release's post-download private path was not externally inspectable |
| Reader exit removes the active private PDF; reopen succeeds without retained rendered images | yes | **PASS** | 2026-09-09, both platform sequences | In-app `File.exists` reported the score absent after each close and a second fresh-ticket open rendered again. iOS cache directory absence was independently inspected; Android `run-as` correctly refused the non-debuggable Release app |
| Choir switch clears prior score/catalogue state before server selection; the old local file is not reused, a new A-file ticket request is refused while B is active and B cannot see A's score | yes | **PASS** | 2026-09-09, both platform sequences | Banner ordering showed reader removal then tenant clear; actual new A ticket request under B returned 403 and the real B catalogue was visibly empty. Existing issued-ticket expiry contract is unchanged |
| Sign-out clears session preference and all protected-score cache even if the screen is no longer mounted | yes | **PASS** | 2026-09-09, both Release apps; explicit post-sign-out probe | Login UI returned; mobile preference read was null and `client.auth.getSession()` had no session after cache cleaners ran. This does not prove physical-device durability |
| Mobile checks, normal iOS/Android exports and affected native builds pass; no crash or secret-bearing evidence | yes | **PASS** | 2026-09-09, `npm run check`; normal exports; iOS/Android Release builds and bounded logs | 16 suites / 84 tests; normal 1,314-module iOS and 1,312-module Android bundles; both alternate Release apps compiled/launched; no fatal/crash marker or runtime credential in tracked diff/evidence. Root gate N/A because no root/shared product source changed |
| Diff, fixture/runtime cleanup, evidence links and separate commits preserve 004/010 and external authority boundaries | yes | **PASS** | 2026-09-09, `404a9ee` plus this evidence record | Product/test and documentation commits are separate; exact reverse route, fixture, stack, task emulator and Colima profile were removed. CLI cache remains unstaged; 004 stays 25/27 and 010 stays 6/7; no live/push/deploy/hardware action |

## Delivery

Local A2 acceptance is complete at product/test commit `404a9ee`; exact commands, versions,
failures, screenshots, hashes and cleanup are in the linked evidence directory. Rollback is this
product/test commit followed by its separate evidence commit. M1, hosted deployment/Drive,
real-account/device evidence, 004's two hardware rows and 010's remaining live-product row stay
open. The next ready local package is A3 web compatibility; it must receive its own brief before
product edits.
