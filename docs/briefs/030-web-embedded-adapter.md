# 030 — Dormant web embedded adapter

Prepared: 2026-09-10. Status: **READY FOR LOCAL IMPLEMENTATION**. Single writer and reviewer: main
agent; no independent review is claimed.

## Outcome and delivery focus

Add a dormant, browser-safe embedded runtime around the nine permanent web route families. A valid
non-secret WebView bootstrap must lock tenant content, complete the version 1 challenge, verify the
explicit access token and exact server-current choir/member without persisting a session, and only
then render the existing page. The adapter must also own renewal freeze, synchronous clear, cache and
Realtime teardown, cross-boundary navigation commands and native-owned session/theme/password
capabilities while leaving an ordinary browser on its existing auth and navigation path.

This closes only the **web half** of C1. It does not install or mount a native WebView, construct a
native lease, run a device/simulator, deploy a hosted build or prove actual platform file/password
capabilities.

## Starting evidence

- Work starts from local `main` at 029 record commit `3b4467d`; the only observed unrelated change is
  the pre-existing `supabase/.temp/cli-latest`, which remains unowned and unstaged.
- [The 028 bridge contract](../webview-bridge-contract.md) owns the exact route matrix, v1 message
  schemas, challenge, server proof, renewal, clearing, navigation and accessibility behavior.
  [029](029-permanent-webview-policy-core.md) accepted the framework-free policy at code/test revision
  `4289da4`; no runtime or credential transport exists yet.
- Current `AuthProvider` owns browser session, member/role and active-choir state. Permanent page
  dependencies contain direct `supabase.auth.getSession` calls; main layout redirects a null session
  and renders browser shell components. These are integration gaps, not permission to simplify the
  feature-preservation matrix.
- Installed web `@supabase/supabase-js` is 2.112.4. Its client-level `accessToken` callback supplies
  Data API, Storage, Functions and Realtime but intentionally makes that configured client's Auth
  namespace unavailable. Official current docs confirm `auth.getUser(jwt)` performs a server request
  and accepts an explicit JWT; `persistSession`, `autoRefreshToken` and `detectSessionInUrl` are
  separately configurable.
- The current React Native WebView reference documents string-only web-to-native `postMessage`, and
  `injectedJavaScriptObject` is read through `window.ReactNativeWebView.injectedObjectJson()` and is
  visible to every frame. Bootstrap therefore contains no secret; native-to-web event normalization
  remains dormant until package 031 supplies the native peer.

## Allowed files and ownership

- `lib/embedded-web-runtime.ts` and focused tests — framework-free bootstrap, in-memory lease,
  explicit user/choir/member proof, request freeze and teardown state.
- `lib/supabase.ts`, `lib/web-auth-capability.ts` and focused tests — separate ordinary-browser and
  embedded data/auth capabilities; fail-closed embedded fetch and Realtime token lifecycle.
- `components/EmbeddedWebBridgeProvider.tsx` and focused tests — locked/error UI, hydration, exact v1
  message wiring, renewal/clear, navigation/capability requests and document-level interception.
- `components/AppProviders.tsx`, `components/AuthProvider.tsx` and focused tests — provider ordering,
  server-proved embedded identity/member adoption and browser parity.
- `app/(main)/layout.tsx`, its focused tests, `hooks/useBackOrHome.ts` and tests — embedded shell
  suppression, authenticated gate and web-history/native-exit split across all nine route families.
- Permanent-page dependencies enumerated by the 028 inventory may change only to replace direct
  bearer/session acquisition with `web-auth-capability`; browser sign-in/recovery remains explicitly
  browser-owned.
- `app/(main)/profil/page.tsx`, `app/(main)/profil/duzenle/page.tsx` and focused tests — native-owned
  sign-out/theme/password requests in embedded mode, with the existing browser forms unchanged.
- This brief for dated acceptance. After the code/test commit, only canonical status/evidence files
  required by the delivery workflow may change in the separate record commit.

No dependency, lockfile, native app, database, migration, Edge Function, service-worker or deployment
file is allowed in this package.

## Sources and existing patterns

- `AGENTS.md`, `docs/gecis-rehberi.md`, `docs/ai-calisma-duzeni.md`, the six `memory-bank/` summaries,
  `MIGRATION.md`, `KARARLAR.md` and `docs/mobil-teslim-plani.md` — authority, order and evidence.
- [028 brief](028-permanent-webview-bridge-inventory.md), [bridge contract](../webview-bridge-contract.md)
  and [029 brief](029-permanent-webview-policy-core.md) — C1 contract and accepted parser boundary.
- `components/AuthProvider.tsx`, `components/AppProviders.tsx`, `app/(main)/layout.tsx`,
  `hooks/useBackOrHome.ts`, the permanent-page feature matrix and current direct auth-call inventory —
  behavior that must be preserved.
- Official React Native WebView Reference/Guide and current Supabase JavaScript initialization,
  `getUser(jwt)`, Realtime and JWT documentation; installed package source is used to verify the exact
  2.112.4 signatures. Current Supabase changelog has no applicable hosted-client breaking change.
- UI/UX rules selected for this package: no blank loading state, `role=status`/`role=alert`, explicit
  retry and close recovery, visible focus, readable existing theme tokens and reduced-motion support.

## Migration start check

- Read instructions/evidence: the sources above and relevant current source/test configuration.
- Single verifiable result: dormant **web embedded adapter** only. Existing permanent pages remain
  web-owned; native owns refresh token, active-choir selection, outer shell and secure commands.
- Preserved behavior/contract: ordinary browser uses the existing persisted Supabase session, login,
  choir selection/switch, shell, history/query fallbacks, writes, rich links and password form.
- Authority/files/writer: continuing local implementation request covers reversible code, tests and
  commits. Main agent is sole writer. No live Supabase, real account/data, native install, external
  launch, hardware, hosted, push, CI, spend or message authority is inferred.
- Tests/rollback/open limits: focused Vitest/jsdom plus full `pnpm check`; revert the product commit to
  remove the dormant adapter. Native WebView, hosted CSP/runtime, provider, simulator, hardware and
  actual accessibility evidence are NOT RUN.

## Required architecture and invariants

1. **Early isolation.** A valid exact bootstrap switches imported data calls to a non-persisting
   embedded Supabase client before tenant children render. Missing/invalid bootstrap is ordinary
   browser mode; a detected but invalid or untrusted embedded state never falls back to browser
   cookies/session.
2. **Secret-free bootstrap.** Only exact `{ channel, instanceId, tenantEpoch }` is parsed from
   `injectedObjectJson()` in the top frame. Token, user, member, choir, route or capability data is
   forbidden there and no bootstrap/lease value enters URL, storage, log, analytics or error copy.
3. **One challenge, then proof.** Web sends `bridge.ready`, accepts one current challenge, acknowledges
   it, then accepts `context.apply`. A non-persisting verifier calls `getUser(accessToken)`; a separate
   candidate data client calls the shared choir-context query. Token user, exactly one server-current
   membership, choir and member must match the envelope before the live lease and children exist.
4. **One data capability.** Embedded Data API/RPC/Storage/Functions/Realtime obtain the current
   module-local access token; its Auth namespace is never used. Existing helpers acquire bearer/user
   through an environment-neutral capability. Browser Auth APIs remain on the browser client.
5. **Bounded renewal.** Before the expiry safety window or after the first authenticated 401, new
   mutations fail closed and one coalesced `context.renew.request` is emitted. Reads may continue only
   while the old lease is valid. A newer proved lease resumes work; timeout, second 401, stale/older
   lease or mismatch clears terminally rather than loops.
6. **Synchronous tenant blanking.** `context.clear`, sign-out/identity/choir transition or invalidation
   removes the lease and unmounts children before asynchronous Query, protected-file, Realtime,
   listener/timer and embedded cache teardown. Old-epoch work/messages cannot restore content.
7. **Boundary navigation.** Allowlisted permanent links stay in the web history. Native-owned routes,
   external HTTPS, protected file actions and invitation clipboard use exact bridge requests; denied
   URLs stay put with a redacted visible error. Back uses only validated permanent history, otherwise
   requests native exit. Ordinary browser behavior is unchanged.
8. **Native-owned controls.** Embedded layout suppresses `TopBar`, `BottomNav`, `FloatingMiniPlayer`
   and `NotificationPrompt`. Profile sign-out/theme and profile-edit password control emit exact bridge
   messages; no password field or refresh token crosses the adapter.

## Out of scope

- Installing `react-native-webview`, native message handlers/state machine, native secure password
  sheet, native file picker/download, platform manifests/permissions or native screen/navigation work.
- Changing Supabase schema/RLS/Storage/Edge, querying a live project, using a real token/account,
  changing browser auth semantics or adding a refresh-token owner in web.
- Hosted CSP observation, deployment, push/CI, production/browser E2E, simulator/emulator, hardware,
  notification delivery, system-browser opening, clipboard/file side effects or accessibility claims.
- Simplifying permanent page reads/writes/roles/errors, migrating those pages to native, or taking
  ownership of native home/repertoire/chat/assignments.

## Risk, authority and rollback

- The primary risk is cross-tenant/browser-session fallback. Embedded detection is fail closed, proof
  binds user/choir/member/epoch, and children never mount before proof. Server RLS remains necessary;
  client proof does not replace it.
- A bearer callback can otherwise silently fall back to the publishable key. Embedded network calls
  refuse missing/expired leases, and mutations additionally refuse renewal/frozen state.
- Global client selection is module-local to the hydrated browser process. Server rendering remains
  on the ordinary client; tests prove no bootstrap/no window does not activate embedded mode.
- Event normalization listens only while the provider is mounted, verifies top frame and delegates
  exact envelope/source/replay/epoch checks to 029 before effects. Repeated invalid input is bounded.
- Revert the product commit for code rollback. If ordinary browser parity, isolation or teardown
  cannot be proved locally, keep 030 open and do not proceed to native package 031.

## Small implementation steps

1. Add failing pure tests for exact bootstrap, memory-only lease, expiry/freeze, explicit user and
   server-current membership match/mismatch, and stale async proof. Implement the runtime without DOM.
2. Split browser/embedded Supabase capabilities with an injectable test seam; adapt every inventoried
   direct bearer call and prove ordinary browser behavior plus embedded no-session/no-storage behavior.
3. Add the provider locked/error shell and CSP-compatible listeners. Test challenge, proof, renewal,
   clear, stale/replay/source failures, retry/close and redacted visible output.
4. Integrate AuthProvider/main layout/back/profile capabilities. Parameterize page-level layout tests
   across all nine permanent route families; test shell suppression and ordinary browser parity.
5. Run focused tests, source inventory guard, full `pnpm check`, diff/scope/secret review. Repair the
   implementation rather than weakening required failure vectors.
6. Record dated evidence and explicit NOT RUN layers; commit code/tests separately from records, then
   select package 031 only if every required local row is PASS.

## Definition of done

- [ ] Exact bootstrap enters locked embedded mode without a secret, URL/storage/log write or browser
  session read; absent bootstrap preserves ordinary browser behavior.
- [ ] Challenge ordering, exact v1 validation/replay/epoch binding and explicit-token user plus exact
  server-current choir/member proof gate all tenant rendering.
- [ ] Embedded Data/Storage/Functions/Realtime use the current memory lease; every inventoried bearer
  consumer uses the environment-neutral capability; browser Auth remains functional and separate.
- [ ] Renewal freezes mutations and coalesces once; accepted newer proof resumes; timeout, second 401,
  expiry, mismatch, stale work and context clear synchronously blank and fully tear down.
- [ ] All nine route families render their existing child behind the same gate, suppress duplicate
  shell, preserve permanent history, and emit exact native/external/file/back requests when embedded.
- [ ] Embedded profile sign-out/theme/password controls are native-owned; ordinary browser shell,
  sign-in/selection/switch, navigation/rich links, writes and password form retain current behavior.
- [ ] Locked/error UI is nonblank, announces status/error, has visible-focus retry/close paths and
  respects reduced motion; manual VoiceOver/TalkBack remains honestly NOT RUN.
- [ ] Focused tests, direct-auth source guard, full `pnpm check`, diff/scope/secret scan pass; native,
  hosted, provider, real-account, simulator, hardware and release layers remain explicitly NOT RUN.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 030 open. Review is self-review unless an independent review is
actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Bootstrap is exact and secret-free; embedded content locks before any browser session/data read while no-bootstrap browser behavior is unchanged | yes | **NOT RUN** | Planned local Vitest/jsdom | Must include top-frame, invalid JSON/extra key, invalid route and storage/URL/log spies |
| Challenge and v1 message order plus explicit-token user and exact server-current choir/member proof gate tenant rendering; mismatch/stale/replay inputs have no side effect | yes | **NOT RUN** | Planned deterministic unit/integration tests | Synthetic doubles only; no real token or hosted Supabase call |
| Embedded Data API/Storage/Functions/Realtime and all inventoried bearer consumers use only the current in-memory lease; browser Auth is separate and unchanged | yes | **NOT RUN** | Planned focused client/call-site tests and source inventory guard | No provider network call; installed client behavior tested locally |
| Renewal coalesces, freezes mutations and resumes only after newer proof; timeout/second 401/expiry/clear synchronously blank and remove lease, Query/protected/Realtime/listener state | yes | **NOT RUN** | Planned fake-clock lifecycle tests | Renderer/process/device lifecycle remains future native proof |
| Nine permanent route families share the embedded gate, preserve child behavior, suppress duplicate shell and route back/native/external/file/clipboard boundaries exactly | yes | **NOT RUN** | Planned parameterized page/layout and navigation tests | No actual WebView, picker, clipboard, system browser or native navigation |
| Embedded profile sign-out/theme/password requests contain no refresh token/password; ordinary browser shell/auth/navigation/writes/password form regressions pass | yes | **NOT RUN** | Planned component tests plus full root regression | Existing RLS/provider and real browser behavior remain outside jsdom proof |
| Locked/error/recovery surfaces are nonblank and accessible in source/jsdom; full root gate and final security/scope review pass | yes | **NOT RUN** | Planned focused accessibility assertions and `pnpm check` | Manual assistive technology, hosted CSP and runtime accessibility NOT RUN |

## Delivery boundary

030 is not accepted at planning time. Every required row is NOT RUN. Local implementation may start;
native package 031 must not consume this adapter as accepted until the code/test revision and separate
dated record prove every row PASS under the stated local boundary.
