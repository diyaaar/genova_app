# 028 — Permanent WebView bridge and route-ownership inventory

Prepared: 2026-09-10. Status: **PLANNED / NOT RUN**. Single writer and self-reviewer: main agent;
no independent review is claimed. This is the first bounded C1 package and is documentation-only.

## Outcome and delivery focus

Produce one source-grounded contract that assigns every permanent-WebView route and cross-boundary
action to web or native ownership, and defines the minimum authenticated bridge, navigation,
failure and acceptance rules needed before installing or implementing a WebView. This closes the C1
inventory prerequisite without changing either product client.

## Execution start check

- [x] Read [AGENTS](../../AGENTS.md), [handoff](../agent-handoff.md),
  [migration guide](../gecis-rehberi.md), [work cycle](../ai-calisma-duzeni.md), the six memory-bank
  indexes, [MIGRATION](../../MIGRATION.md), [decisions](../../KARARLAR.md),
  [delivery plan C1](../mobil-teslim-plani.md#c--complete-the-mobile-experience-in-small-user-flows),
  the 027 handoff/acceptance, current native auth/shell sources and current permanent-WebView page,
  layout, auth, back-navigation, rich-link, mutation and file sources.
- [x] Verified `main` at `8e36ff7` with only the pre-existing, unowned
  `supabase/.temp/cli-latest` modification. It remains unstaged and outside 028. The main agent is
  the sole writer; no subagent is used.
- [x] `MIGRATION.md` fixes announcements, choristers, profile/change requests and attendance as
  permanent WebView surfaces. Current mobile has no direct `react-native-webview` dependency or
  bridge; web and native Supabase clients persist sessions in different storage systems.
- [x] The owner's continuing direction authorizes local source review, documentation, validation
  and local commits. It does not authorize dependency installation, product changes, hosted
  Supabase work, real accounts/data, push/deploy, remote CI, messages, spending or hardware.

## Allowed scope

- `docs/webview-bridge-contract.md`: route/action inventory, ownership rules, versioned message
  envelope, session/choir lifecycle, navigation/external-file policy, failure matrix, implementation
  split and future acceptance matrix.
- This brief plus canonical plan/MIGRATION/handoff/memory indexes after document acceptance.
- Read-only inspection of the named native/web sources and current primary documentation for the
  candidate WebView and Supabase session APIs. No package install, generated native project, app
  code, web code, DB/Edge code or live call.

## Required inventory contract

- Enumerate the exact route families and nested/detail/edit/review surfaces that remain web-owned;
  map every link from them to permanent web, current native or future native ownership.
- Preserve all current role filters, Realtime refresh, mutations, uploads/downloads, rich text,
  internal/external links, query parameters and visible loading/empty/error states. Inventory is not
  permission to remove or silently defer a behavior.
- Define one versioned, validated and allowlisted bridge. Tokens, refresh tokens, anon keys and
  personal data must never appear in URLs, query strings, bridge logs or analytics. Unknown origin,
  route or message versions fail closed.
- Native remains the top-level auth/active-choir owner. Any web session bootstrap must prove the
  current native user, server-confirmed active choir and expiry/refresh behavior before rendering
  tenant data; sign-out, choir switch and external session loss must blank/clear the WebView before
  another tenant or signed-out screen appears.
- Same-origin permanent routes stay inside the WebView. Native-owned routes exit through the native
  router. HTTPS external links leave through a user-visible system browser; non-HTTPS, popups,
  downloads and file-picker/camera actions are denied until explicitly mapped and tested.
- Native back first consumes safe WebView history within the allowed permanent route set, then exits
  to the recorded native return route. Web `/` fallback or client-side routing must not strand the
  user inside the web home. Expired/bootstrap failure shows a bounded retry or native sign-in path.

## Preserved behavior and exclusions

- Preserve 004 auth/choir fail-closed behavior, 013–027 repertoire/PDF/audio acceptance, 025's
  annotation-exit guard, web behavior and the permanent/native ownership recorded in MIGRATION.
- Do not install `react-native-webview`, select a final dependency version, create bridge code,
  rewrite permanent pages, add a new API/Edge route, change session storage, use injected test
  credentials or claim a working session handoff.
- Do not use real accounts/data, live Supabase, provider consoles, push/deploy, remote CI, external
  messages, spending or hardware. A design or official API document is not runtime evidence.

## Risk, authority and rollback

- Highest risks are token leakage, two independently refreshing sessions, wrong-choir rendering,
  stale web history after tenant change, arbitrary navigation/message execution, hidden external
  downloads/uploads and silently losing existing role-only actions.
- Record any unresolved security/product choice as a blocking implementation decision; do not pick a
  weaker transport merely to make the inventory complete. Current official documentation informs
  API feasibility but does not prove Genova runtime behavior.
- Rollback is the later inventory/acceptance commit, then this planning commit. No product or live
  rollback exists because 028 performs no product or external change.

## Implementation and verification sequence

1. Trace the permanent route families, page imports, role branches, reads/mutations, Realtime,
   uploads/downloads, internal/native links and current back/fallback behavior.
2. Compare native and web Auth/active-choir/session storage lifecycles; inspect current primary
   WebView and Supabase session API documentation only for the APIs the contract may rely on.
3. Write the route/action matrix, bridge envelope/state machine, allowlists, failure matrix,
   phased implementation boundary and exact future unit/integration/native/hosted/hardware gates.
4. Review for missing routes/actions, unsafe data transport, circular ownership or a claim promoted
   beyond its source. Validate local links, plan/MIGRATION consistency and `git diff --check`.
5. Record dated evidence and update canonical indexes only after every required documentation row
   passes; then select the smallest ready C1 implementation package.

## Mandatory acceptance evidence

Required FAIL or NOT RUN rows keep 028 open. Review is self-review unless an independent review is
actually performed.

| Criterion / expected behavior | Required? / N/A reason | Status | Date / revision / environment / command or scenario | Evidence and limits |
|---|---|---|---|---|
| Every permanent route family, nested route, role-only action, read/mutation/Realtime/file dependency and cross-boundary link is mapped to an owner and preservation rule | yes | **NOT RUN** | — | Source matrix required |
| Native auth/active-choir authority and a fail-closed web bootstrap/refresh/sign-out/tenant-change state machine are explicit, with no credential in URL/log/analytics | yes | **NOT RUN** | — | Contract and source/API comparison required |
| Versioned message envelope, origin/type/payload validation, route allowlists and unknown-message behavior are exact enough to unit test before a WebView is installed | yes | **NOT RUN** | — | Protocol table and test vectors required |
| Back/history, native-route exit, external URL, popup, download, upload/file-picker and expired-session behavior has one explicit safe owner and failure path | yes | **NOT RUN** | — | Navigation/capability matrix required |
| Theme/safe-area/accessibility/loading/error requirements and staged implementation/rollback/acceptance gates preserve existing web/native behavior | yes | **NOT RUN** | — | Future evidence matrix required; no runtime pass inferred |
| Repository records distinguish verified source facts, official API feasibility, proposed contract, unresolved decisions and runtime NOT RUN layers | yes | **NOT RUN** | — | Self-review required |
| Documentation links, route/plan/MIGRATION consistency and `git diff --check` pass with no product or unrelated change | yes | **NOT RUN** | — | Document gate required |

## Delivery

Not executed. On documentation acceptance, record the contract and updated canonical indexes in a
separate commit, preserve every runtime layer as NOT RUN and select the smallest ready implementation
brief. Do not install or implement the WebView inside 028.
