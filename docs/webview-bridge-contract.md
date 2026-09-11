# Permanent WebView bridge contract

Date: 2026-09-10. Inventory revision: brief 028. This document is the C1 design authority for
embedding the routes that `MIGRATION.md` assigns permanently to the web client. It is not runtime,
hosted, device, dependency-compatibility or release evidence.

## Evidence legend and result

- **Verified project fact** means the statement was traced to the current repository at the 028
  planning revision. It can drift when those sources change.
- **Official API feasibility** means a primary vendor source documents an API shape. It does not
  prove the installed Genova application uses it correctly on either platform.
- **Required contract** is the implementation rule selected by this inventory.
- **Unresolved / future proof** names work that cannot be promoted to PASS by this document.
- **Runtime NOT RUN** means no WebView dependency was installed and no embedded route was run.

Result: the permanent route boundary and a fail-closed implementation architecture are now exact
enough to split into tested packages. Native remains the sole Supabase refresh-token and active-choir
owner. The embedded page receives only a short-lived access-token lease in memory after an
origin-checked challenge; no refresh token leaves native storage. This choice avoids two clients
trying to consume the same single-use refresh token.

## Current facts and API feasibility

### Repository facts

1. `MIGRATION.md` permanently assigns announcements, choristers, profile/change requests and
   attendance to WebView. Repertoire is already native; chat, assignments and home are future native
   surfaces. This is the product end state, not a temporary fallback.
2. The permanent surface is exactly nine current Next routes totalling 4,636 source lines:
   `announcements`, announcement detail, `koristler`, chorister detail, invitations, profile, profile
   edit, profile-change requests and attendance. The approximate counts in `MIGRATION.md` are planning
   signals, not a substitute for this source inventory.
3. The browser client in [`lib/supabase.ts`](../lib/supabase.ts) uses Supabase's default browser
   session persistence. [`components/AuthProvider.tsx`](../components/AuthProvider.tsx) owns that
   session, loads and server-activates choir context, loads member/roles, subscribes to changes and
   clears query/file/feature caches on identity, choir and sign-out transitions.
4. The native client in
   [`apps/mobile/src/auth/supabase-client.ts`](../apps/mobile/src/auth/supabase-client.ts) separately
   persists its session in chunked Expo SecureStore with automatic refresh enabled and URL session
   detection disabled. [`AuthStore`](../apps/mobile/src/auth/auth-store.ts) exposes data screens only
   after `loadMyChoirs` returns a server-confirmed active choir and clears tenant caches before an
   identity or choir transition.
5. Therefore a shared WebView session does not exist today. Loading a permanent route as-is would let
   the web `AuthProvider` find no browser session and redirect to `/login`; copying an access or refresh
   token into the initial URL would violate C1.
6. `apps/mobile/package.json` does not declare `react-native-webview`. Its lockfile mention is only an
   optional peer edge, and the package is not installed as a direct dependency.
7. The current Next configuration has no repository-defined Content Security Policy header. A strict,
   tested production CSP is a hosted-WebView acceptance prerequisite because the embedded page must
   briefly hold a bearer access token in JavaScript memory.
8. Current permanent pages have no page-level integration tests. Existing relevant tests cover only
   smaller helpers (`richText`, choir context, notification cache, profile-change normalization and
   one attendance API route). Feature-preservation acceptance must therefore add route-level tests; a
   green existing root gate alone would be indirect evidence.

### Official feasibility, not Genova acceptance

- The official React Native WebView [reference](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md)
  documents string-only web-to-native `postMessage`/`onMessage`, native-to-web commands, navigation
  state, `onShouldStartLoadWithRequest`, exact-origin patterns, popup interception, loading/error
  renderers and process-termination callbacks. Its current event type also includes the source URL on
  a message. Android does not call `onShouldStartLoadWithRequest` for the initial load, so Genova must
  validate its initial URL before mounting rather than rely on the callback.
- The official [guide](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Guide.md)
  says custom source headers apply to the initial load, not automatically to later navigation. It also
  documents platform-specific file-input, download and back behavior. A source header is consequently
  not a durable session bridge for Supabase fetch, Storage, Realtime or nested navigation.
- Supabase [`setSession`](https://supabase.com/docs/reference/javascript/auth-setsession) requires both
  access and refresh tokens and may refresh an expired session. Supabase's
  [Auth overview](https://supabase.com/docs/reference/javascript/auth) states that a refresh token is
  single-use. Sharing that refresh token with two automatic refresh owners is rejected by this
  contract.
- Supabase documents a client-level
  [`accessToken` provider](https://supabase.com/docs/guides/auth/jwts) for authenticated Data API,
  Storage, Realtime and Functions calls. Both installed Genova versions (`2.112.4` web and `2.115.0`
  mobile) expose that provider and `realtime.setAuth`; a local construction probe also confirmed that
  configuring it intentionally makes the client's `auth` namespace unavailable. Embedded code must
  therefore use a separate auth verifier/command adapter rather than accidentally calling
  `supabase.auth.*` on the data client.
- `injectedJavaScriptBeforeContentLoaded` is documented as not fully reliable on Android, and
  `injectedJavaScriptObject` exposes its value to all frames. Genova will use neither to carry a
  credential. Sensitive context travels only after hydration through the WebView message channel.

## Route ownership and canonicalization

The native parser receives a relative path or a fully parsed URL, never string-prefix-matches an
unparsed URL. It rejects credentials in the authority, non-default ports, encoded path separators,
control characters, duplicate sensitive parameters, fragments on app routes and decoded paths that
do not round-trip to their canonical form. Production origin is exactly
`https://app.genesinovachoir.com`; a loopback/development origin is supplied explicitly by a local
test configuration and can never be present in a release build.

| Route family | Owner | Embedded query contract | Cross-boundary rule |
|---|---|---|---|
| `/announcements` | permanent web | none | Remains inside the current WebView |
| `/announcements/<uuid>` | permanent web | none | UUID detail remains inside; malformed/unknown identifiers show the existing not-found/error state |
| `/koristler` | permanent web | none | Remains inside; server/role scope is unchanged |
| `/koristler/<uuid>` | permanent web | none | Remains inside; assignment links exit to native |
| `/koristler/davetler` | permanent web | none | Remains inside; only current active-choir admin may use it |
| `/profil` | permanent web | none | Page remains web; native shell owns surrounding navigation/theme/session actions |
| `/profil/duzenle` | permanent web | none | Form remains web; sensitive password action opens a native-owned secure sheet |
| `/profil/degisiklikler` | permanent web | none | Chorist/admin variants remain web |
| `/devamsizlik` | permanent web | optional single `date=YYYY-MM-DD` | Remains inside; invalid or duplicate date is rejected/canonicalized without loading data |
| `/` | native | defined by future C5 | Web navigation is stopped and native home is opened |
| `/repertuvar` and descendants | native | native repertoire contract | Web navigation is stopped and routed to the existing native feature |
| `/chat` and descendants | future native C3 | C3 inventory | Until C3 acceptance, a bridge request fails visibly as unavailable; it never falls through to web |
| `/odevler` and descendants | future native C4 | C4 inventory, including `aid`, `mid`, `returnTo` | Until C4 acceptance, a bridge request fails visibly as unavailable; the WebView does not take ownership |
| `/login`, `/invite`, `/reset-password`, `/auth/*` | native/auth entry policy | none in embedded mode | Never loaded in the authenticated WebView. Native signs in/selects choir; invitation/recovery receive separate deep-link contracts |
| any other same-origin path | no owner | none | Fail closed, stop loading, show a bounded native error and record only a route-family rejection code |

Embedded launch metadata such as `fromNotification` and `returnTo` belongs to the native navigation
stack and is not appended to the WebView URL. Regular browsers retain their current query/history
behavior. A web-owned route can request a native-owned route and include a validated native return
intent; the WebView URL itself never carries that return state.

### Links authored inside rich text

The current sanitizer preserves root-relative links and `http`/`https` external links. The editor can
author profile routes plus dynamic repertoire and assignment routes. In embedded mode:

- a canonical permanent route stays in the WebView;
- a native route emits `navigation.native.request` and the browser navigation is cancelled;
- an `https` external URL emits `navigation.external.request`, shows its normalized host in a native
  confirmation, then opens the system browser;
- `http`, credential-bearing URLs, non-default ports, protocol-relative URLs, custom schemes,
  `javascript`, `data`, `blob`, `file`, popups and unknown same-origin paths are denied visibly;
- external rich-text behavior in a normal browser is unchanged.

This deliberately preserves arbitrary author-supplied HTTPS destinations without silently treating
them as trusted app origins. The allowlist is the exact app origin/path set and the `https` external
scheme; user confirmation is the boundary for arbitrary external hosts.

## Permanent feature preservation matrix

The bridge is a container integration, not permission to simplify these pages. Server RLS and current
role logic remain authoritative even when a control is hidden.

| Surface | Reads and role meaning to preserve | Writes/capabilities to preserve | Realtime, links and visible states to preserve |
|---|---|---|---|
| Announcement list/detail | `announcements`; hidden-item visibility for admins and the creating section leader; member-targeted content | publish, edit, hide/show and delete through current APIs; creator/admin distinctions; member/voice targeting | announcement invalidation; rich text/images; detail/list links; loading, empty, not-found and mutation errors |
| Announcement editor | active-choir members filtered by admin/section-leader voice scope; repertoire/assignment link suggestions | sanitized rich content; 5 MB JPEG/PNG/GIF/WebP image upload to `announcements-images`; create/update | keyboard/editor focus, upload progress/error, disabled submit and cross-boundary rich links |
| Chorister overview/detail | current `korist-performance` calculation over members, roles, rehearsals, invitees, attendance, assignments, targets and submissions; admin/section-leader/voice scope | authorized manual attendance update | all eight table invalidations; search/filter/empty/error; social HTTPS links; native assignment exit; submission file action |
| Invitations | active choir plus admin role; last 100 invitation statuses | create and revoke through `choir-invitations`; copy the one-time invitation link | loading/empty/error/retry/busy states; invitation token may enter OS clipboard but never bridge logs, analytics or persisted WebView storage |
| Profile | current member, active choir and canonical role display | native-owned sign-out and theme commands from existing web controls | current menu/focus/visible data; no duplicate web shell navigation, mini player or notification permission prompt |
| Profile edit | member fields and repertoire favorites | 5 MB image upload through `/api/profile-photo`; submit/update change request; native secure password-change sheet performs old-password reauthentication and update | validations, progress/toasts, success return to profile, keyboard and file-input behavior |
| Profile-change requests | own requests for chorists; choir-wide pending/done review for admins; members/repertoire display data and dependency ordering | approve/reject through current review API, including blocking-request behavior | request Realtime invalidation; loading/empty/error, photo comparison modal and accessible close/focus behavior |
| Attendance | month rehearsals/invitees/attendance, pending approvals and continuity RPC; existing admin/section-leader creator scope | finalize past attendance, approve, manual update; create/update/delete rehearsal through `EventFormModal` | three-table invalidation; `date` deep link; optimistic rollback, participant/error/empty states, rich notes and the editor's image/file capability |
| Main web layout while embedded | auth/member/role/tenant providers needed by page content | none of the browser-only shell actions | native owns top/bottom navigation, safe area, theme, mini audio and future notifications; embedded mode suppresses `TopBar`, `BottomNav`, `FloatingMiniPlayer`, `NotificationPrompt` and browser home fallback only |

Direct calls to `supabase.auth.getSession`, `signOut`, `signInWithPassword` or `updateUser` in these
dependencies must be replaced by an environment-neutral auth capability, while regular-browser
behavior remains byte-for-byte equivalent at its public interface. The inventory found these direct
auth dependencies in announcement mutations, event mutations, protected file URL creation, profile
photo/change-request APIs, profile review and password/sign-out behavior. Missing one is a required
integration failure.

## Version 1 bridge protocol

### Envelope and validation

Every message is one JSON string no larger than 16 KiB and has exactly this outer shape:

```ts
interface BridgeEnvelope<TType extends string, TPayload> {
  channel: 'genova.mobile.webview';
  version: 1;
  id: string;           // 16-64 URL-safe random characters, unique per WebView instance
  instanceId: string;   // native-generated correlation value from the non-secret bootstrap object
  tenantEpoch: number;  // non-negative integer; changes before every identity/choir clear
  type: TType;
  payload: TPayload;
}
```

Validation order is fixed: message byte limit → JSON object/no array → exact channel/version and
known keys → source event URL exact origin plus currently allowed web route → instance ID and tenant
epoch → unique message ID → known type → exact payload schema and per-field limits → side effect.
Failure stops before the side effect. Unknown versions/types, stale epochs, duplicates and malformed
payloads return or display only a stable error code; payloads are never echoed.

The native log allowlist is `direction`, `type`, `outcome`, stable `reasonCode` and route *family*.
It excludes message body, access token, invitation link, password values, user/member/choir IDs,
full URLs, query strings and free-form server errors. Analytics receive no bridge payload or failure
body. Release builds disable WebView debugging.

### Handshake and messages

| Direction and type | Exact payload | Owner/effect |
|---|---|---|
| W→N `bridge.ready` | `{ supportedVersions: [1], routeFamily: WebRouteFamily }` | Trusted locked page echoes the non-secret instance/epoch bootstrap and announces hydration. No tenant data is visible |
| N→W `bridge.challenge` | `{ nonce: string }` | Per-load 128-bit random challenge; contains no credential |
| W→N `bridge.challenge.ack` | `{ nonce: string }` | Exact one-time acknowledgement enables context delivery |
| N→W `context.apply` | `{ accessToken, expiresAt, userId, choirId, memberId }` | Sensitive in-memory lease. No refresh token and no persistence |
| N→W `context.clear` | `{ reason: 'sign-out'|'choir-switch'|'identity-change'|'expired'|'process-restart'|'native-stop' }` | Synchronously blanks content, clears token/query/Realtime/DOM state and acknowledges before teardown |
| W→N `context.renew.request` | `{ reason: 'expiring'|'unauthorized' }` | Native serializes one refresh/lease check; bounded duplicate requests coalesce |
| W→N `navigation.state` | `{ routeFamily, canGoBackWithinWeb: boolean }` | Native records only validated web history state |
| W→N `navigation.native.request` | `{ path: string }` | Native parser validates and opens a currently implemented native route or returns `route-unavailable` |
| W→N `navigation.external.request` | `{ url: string }` | Native validates HTTPS, confirms normalized host, then invokes the system browser |
| W→N `navigation.exit.request` | `{ reason: 'back-root'|'close'|'auth-required' }` | Exits to the recorded native return route; never loads web `/` |
| W→N `auth.sign-out.request` | `{}` | Native blanks/unmounts the WebView, then runs native sign-out |
| W→N `auth.password.open` | `{}` | Native presents a secure password-change sheet; no password crosses the bridge |
| W→N `theme.set.request` | `{ scheme: 'light'|'dark'|'system' }` | Native persists/applies theme, then broadcasts `theme.apply` |
| N→W `theme.apply` | `{ resolved: 'light'|'dark', preference: 'light'|'dark'|'system' }` | Embedded page updates existing theme variables without owning the system setting |
| W→N `clipboard.write.request` | `{ kind: 'invitation-link', text: string }` | Exact validated invite URL is written after user action; sensitive body is never logged |
| W→N `file.open.request` | `{ url, disposition: 'view'|'download', fileName?, mimeType? }` | Denied by default until the platform capability package validates the URL and file class |
| N→W `command.result` | `{ requestId, ok, code }` | Stable bounded result; never includes a credential, password or raw provider error |
| either `bridge.error` | `{ requestId?, code }` | Protocol error only; at most one response per request ID |

Native supplies only `{ channel, instanceId, tenantEpoch }` through
`injectedJavaScriptObject` so the first `bridge.ready` can use the standard envelope; those values are
correlation metadata, not authentication. Sensitive native-to-web delivery uses the WebView ref's
message command after the challenge acknowledgement, not a source URL, initial request header,
cookie, injected object or interpolated script. The web adapter normalizes the platform-specific
message event and accepts it only in the top frame. The web-to-native handler additionally validates
`event.nativeEvent.url`; the envelope is not trusted merely because it arrived through `onMessage`.

`auth.password.open` is the selected preservation path because the configured access-token data
client has no Auth namespace and sending old/new passwords through a general page message adds an
avoidable secret-bearing message type. The native sheet must preserve the existing old-password,
minimum-eight-character, equality and changed-password validations, use the native Supabase auth
client for reauthentication/update, expose accessible progress/error/success states and never log or
persist the fields. This is a narrow authentication capability, not a native rewrite of the profile
screen.

## Session and tenant state machine

The WebView component exists only while native `AuthStore.phase === 'ready'` and an active choir is
present. Its tenant key is `userId:choirId:tenantEpoch`; the key changes before a tenant transition.

1. **Locked load.** Native validates the configured origin and canonical web launch route before
   mounting, creates the instance/epoch values and exposes only those non-secret values through the
   WebView bootstrap object. The web entry detects the bridge without a URL flag and renders only a
   neutral locked loading/error shell; regular browser auth remains unchanged.
2. **Challenge.** The trusted route sends `bridge.ready`; native returns a fresh challenge. No access
   token is sent until the matching one-time acknowledgement arrives from the same allowed URL.
3. **Native lease.** Native reads its current Supabase session. User ID must match `AuthStore`; if the
   access token is missing or within the refresh safety window, only native calls `refreshSession`.
   It sends the access token and expiry but never the refresh token.
4. **Server proof.** Web stores the access token only in a module-local in-memory lease, verifies it
   with a non-persisting explicit-token auth verifier, constructs a separate data client using the
   `accessToken` callback, then calls the shared choir-context query. Exactly one server-current choir,
   user, choir and member IDs must match the native context. Only then may page children render.
5. **Running.** Data API, RPC, Storage, Functions and Realtime use the current lease. API helpers ask
   the environment-neutral token provider rather than `auth.getSession`. Realtime receives the new
   token explicitly after every accepted lease.
6. **Renewing.** Before the lease safety window or after the first authenticated 401, web stops new
   mutations and coalesces one `context.renew.request`. Native refreshes/reads the session and sends a
   newer lease. Web repeats the server choir proof before resuming. A second 401 or timeout is terminal
   for that WebView instance, not an infinite retry.
7. **Clearing.** Sign-out, identity change, choir switch, session loss, process termination or native
   stop increments `tenantEpoch` and blanks/unmounts the view before asynchronous transition work.
   Web clears token memory, React Query, Realtime channels, protected URL caches, timers/listeners,
   clipboard staging and any embedded service worker/cache. Late responses/messages fail the epoch
   check. A failed choir switch can remount the old choir only after native reconfirms it with the
   server and creates a fresh epoch.
8. **Reload/recovery.** A page reload or renderer-process restart returns to Locked load and requires a
   new challenge and server proof. There is no permanent-WebView offline session: if a fresh lease and
   active choir cannot be proved, a visible bounded retry and native sign-in/close action replace the
   tenant page.

The embedded Supabase client uses no auth persistence, URL detection, shared cookies or refresh
token. Embedded mode does not register the web notification/service worker. The WebView is
non-persistent/incognito for tenant content; static-asset caching choices can be relaxed only after a
test proves no response/session/tenant data survives sign-out or choir switch.

## Navigation, back and capability rules

### Back/history

- Native holds the launch return route separately from the WebView URL.
- A validated `navigation.state` may permit native hardware/header back to call WebView `goBack` only
  while the prior entry is another allowlisted permanent route in the same tenant epoch.
- Web `useBackOrHome`, `SwipeBack`, links and browser history must use an embedded adapter: first go
  back within the allowlisted permanent history; at its root emit `navigation.exit.request`.
- Existing browser behavior (`returnTo`, notification fallback, same-origin history and `/`) remains
  unchanged outside embedded mode. Embedded mode never replaces to web `/`.
- iOS gesture and Android hardware-back behavior need separate runtime proof. A raw `canGoBack` flag
  alone is insufficient because history may contain a denied or native-owned URL.

### Popups and external navigation

React Native WebView 13.16.1 opens destinations excluded by its `originWhitelist` through
`Linking.openURL` before the application's navigation callback can decide. The native shell therefore
sets that library prop to `*` only to force every scheme through the callback; it is **not** the trust
allowlist. The shared exact-origin/path parser is the sole allowlist and is applied before the initial
mount, in `onShouldStartLoadWithRequest`, navigation-state changes and `onOpenWindow`. Popups are never
created. A target-blank HTTPS link is cancelled and converted into the external confirmation flow.
Any disagreement between handlers fails closed. Package 031 tests this installed-library boundary.

### Uploads, downloads and clipboard

- File bytes never travel in a JSON bridge message. Announcement/editor and profile image inputs use
  the platform WebView's single-file picker only after an implementation package proves supported
  MIME filtering, 5 MB rejection, cancellation, permission refusal, keyboard/focus recovery and
  actual upload on both platforms.
- Camera capture remains denied until its permission copy, manifest/plist entries and denial/retry
  behavior are explicitly accepted. Gallery selection must not silently grant camera access.
- `onFileDownload`, download navigation and protected submission URLs route to `file.open.request`.
  Native validates the URL again, preserves short-lived ticket expiry, displays filename/type and
  requires an explicit user action. No download is claimed until byte identity, cancellation,
  unauthorized/expired response and cleanup pass. Google Drive exit work remains D4; C1 must not add
  a second permanent file cache.
- Invitation copy uses the native clipboard command when embedded. Clipboard failure leaves the
  existing selectable link and visible manual-copy message. The one-time invite token is expected in
  the user-visible field/clipboard only; it is never cached or logged.

## UI, accessibility and failure behavior

Native owns the safe-area wrapper, top-level route title/back/close controls, theme and mini player.
The web page owns its existing forms, tables/cards, dialogs and page-level loading/empty/error states.
Embedded layout suppresses duplicate web top/bottom navigation and notification prompts without
changing regular-browser layout. Native interactive controls use at least 44×44 pt on iOS and 48×48
dp on Android, expose roles/labels/state, support dynamic text and do not convey state by color alone.
WebView focus, screen-reader order, zoom policy, keyboard avoidance, file inputs, modal focus return
and error announcements require VoiceOver/TalkBack/manual keyboard checks; current source presence of
some ARIA labels is not broad accessibility proof.

| Failure | Required result |
|---|---|
| initial origin/route invalid | WebView never mounts; native shows `route-not-allowed` with close |
| handshake timeout/version mismatch | tenant content stays blank; one retry recreates the instance, then close/update guidance |
| malformed, duplicate or stale message | no side effect; stable redacted error; repeated abuse tears down the instance |
| token absent/near expiry and refresh fails | clear/unmount; native signed-out or explicit retry state; no web login redirect |
| token user or server-current choir mismatch | immediate epoch clear, cache/channel teardown and native context error; never render either tenant |
| first authenticated 401 | freeze mutations and request one renewal; second 401 clears the instance |
| role/RLS 403 or not found | preserve the page's visible denied/not-found behavior; do not refresh-loop or broaden access |
| network/HTTP/render failure | explicit error with one bounded retry and native close; no stale tenant fallback |
| renderer process killed | discard instance/lease/history and restart locked; never merely reload stale DOM |
| native route not implemented | visible `route-unavailable`; remain on the current safe page |
| external/popup/custom-scheme URL denied | no navigation; show normalized reason without echoing query/credential data |
| file picker unsupported/denied/cancelled | no upload and no partial form mutation; restore focus with visible status |
| protected file expired/unauthorized | no system-browser fallback to an error body; renew once or show retry |
| password sheet validation/provider failure | keep fields only in the sheet, show accessible error, make no profile/page session change |
| choir switch or sign-out during request | blank before transition; abort/ignore old-epoch work; new tenant starts from locked load |

## Implementation packages and rollout order

1. **029 — framework-free policy core.** Add shared TypeScript route classification,
   canonicalization, envelope schemas, redacted diagnostics and exhaustive pure test vectors. No
   WebView package or credential transport.
2. **030 — web embedded adapter.** Add bridge detection/locked shell, in-memory access-token provider,
   explicit-token user and active-choir proof, browser/embedded auth-capability split, web navigation
   adapter, cache/Realtime teardown and dormant CSP-compatible message wiring. Add page-level feature
   tests and prove regular-browser behavior with `pnpm check`. No hosted deployment.
3. **031 — native WebView shell.** Select a version compatible with Expo 57/RN 0.86 after current
   primary-source and actual install/build checks; install it, add the challenge/state machine,
   native route/external/back/theme handlers and redacted diagnostics. Run mobile type/tests, doctor,
   exports and both exact Release builds.
4. **032 — sensitive/platform capabilities.** Native password sheet, gallery-only file input,
   invitation clipboard and protected file view/download acceptance, including denial and cleanup.
   Camera stays off until explicitly accepted.
5. **033 — composed local C1 acceptance.** Serve the production-type web build locally and compose
   native session → all nine web routes → native route exits on both Release simulator/emulator
   runtimes with synthetic tenants/roles and actual files. This remains non-hardware and non-hosted.
6. **Hosted/device acceptance.** Deploy order is compatible web first, then native candidate. Exact
   production origin, CSP, real authorized roles, session refresh, files, keyboard, accessibility,
   process death and both hardware platforms remain separate approval/evidence gates.

The dormant web adapter must tolerate ordinary browsers and older clients. Native refuses a web
capability/version it does not understand. Rolling back native removes the WebView entry; rolling
back the dormant web adapter cannot precede every dependent native build. No package may claim C1
complete while a required preservation row or runtime layer is FAIL/NOT RUN.

## Mandatory future evidence

| Layer | Required proof | Current status |
|---|---|---|
| shared policy unit | valid/invalid route, URL, query, envelope, size, version, duplicate, epoch and redaction vectors | **PASS locally — [029](briefs/029-permanent-webview-policy-core.md), `4289da4`; pure policy only** |
| web unit/integration | locked-before-proof, explicit-token user/choir match, renewal, teardown, all auth call-site adapters and nine route families | **NOT RUN** |
| regular browser regression | existing login, choir selection/switch, all permanent writes, rich links and browser back remain unchanged | **NOT RUN** |
| CSP/security | release header observed; no unsafe credential sink, URL/query/log/analytics/storage/service-worker token; popup/origin/message attacks fail closed | **NOT RUN** |
| native component | dependency compatibility, initial/subsequent navigation, challenge, renewal, epoch teardown, back/theme/external/error/process restart | **NOT RUN** |
| platform capability | gallery upload, cancellation/refusal, clipboard/manual fallback, protected file view/download/expiry and native password sheet | **NOT RUN** |
| composed local Release | every permanent route and native exit on iOS simulator plus Android emulator against production-type local web and synthetic tenants | **NOT RUN** |
| hosted | deployed web capability/CSP and authorized hosted session/RLS/Realtime/API behavior on exact domain | **NOT RUN — separate authority** |
| hardware/accessibility | approved devices, file providers/camera policy, keyboard, VoiceOver/TalkBack, process/background behavior | **NOT RUN — postponed/separate authority** |
| publication | signed candidate, store review and installed public build | **NOT RUN — release authority** |

### Minimum pure test vectors for 029

- accept each exact web route, a canonical UUID detail and one valid attendance date;
- reject lookalike hosts, subdomains, userinfo, ports, HTTP in release, encoded slash/backslash,
  duplicate/unknown queries, fragments, traversal and overlong input;
- classify `/`, repertoire, chat and assignments as native with availability separate from ownership;
- reject login/auth/invite/recovery and unknown same-origin routes;
- accept one message for every v1 non-capability type and reject arrays, extra keys, wrong channel,
  wrong version, bad IDs, oversize strings, stale epoch, duplicate ID and invalid payload enum/path;
- prove redacted diagnostics never contain seeded access/refresh tokens, UUIDs, invitation URL,
  password, query string or provider error;
- prove a tenant-epoch increment invalidates queued navigation/context/command work;
- prove external policy accepts canonical HTTPS only and returns a display host without URL query;
- prove initial-source validation is callable independently of WebView callbacks.

## Review boundary

This inventory used repository source inspection, current vendor documentation and local package
construction probes only. It did not install a dependency, change product code, call Supabase,
authenticate an account, run a browser/WebView, deploy, push, dispatch CI, spend money or use
hardware. Those layers remain exactly as marked above.
