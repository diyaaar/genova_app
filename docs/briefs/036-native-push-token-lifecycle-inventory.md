# 036 — Native push token lifecycle inventory

**Status / date / responsible writer:** DOCUMENTATION ACCEPTED / 2026-09-19 / primary agent

**Purpose and user need:** Define the smallest safe account, choir, installation and token
lifecycle for native push before any native token is acquired or written into the browser-only
subscription path.

**Delivery focus:** This document-only C2 slice reconciles the accepted 034 payload contract and
035 permission/tap consumer with the current Web Push table, RPCs and VAPID sender. It must leave
one provider-neutral lifecycle contract, an exact compatibility boundary and a small owner choice
for the native transport. Product code, schema and provider execution are later briefs.

**Starting evidence:** At record commit `385c3ba`, the worktree has only the unrelated
`supabase/.temp/cli-latest` modification. The current `push_subscriptions` row stores a browser
endpoint plus `p256dh` and `auth`; the active-choir RPC safely moves that endpoint only within the
same authenticated account. `lib/server/push-notifications.ts` reads every row as Web Push and
sends it with VAPID. The mobile application has permission and tap APIs but deliberately has no
token getter, backend registration or provider. `apps/mobile/app.json` has no EAS project ID.
These are source facts, not hosted schema, provider or device evidence.

**Current work card:** Observable result: a reviewed lifecycle matrix prevents a native token
from being confused with a browser endpoint and specifies registration, rotation, choir switch,
permission refusal, sign-out and stale-provider cleanup. Next actions: (1) inventory all current
client/DB/sender ownership; (2) write the provider-neutral contract and owner decision packet;
(3) validate links/status/diff, record and select the next authorized slice. Exit when every
required document criterion passes and provider/schema/runtime rows remain explicitly unrun.

**Resources:** Start snapshot: 12,089,420 KiB (~11.5 GiB) free; task-owned `.next`, coverage,
native build, simulator profile and DB runtime are absent, while the retained mobile dependency
tree is unchanged. This document-only slice has negligible expected peak and creates no runtime,
download or build. The 10 GiB floor prohibits allocating a native or local DB runtime here.

**Allowed files / modules:**

- This brief — authoritative inventory, lifecycle contract, decision packet and evidence.
- After acceptance only: `docs/mobil-teslim-plani.md`, `MIGRATION.md`,
  `memory-bank/activeContext.md` and `docs/agent-handoff.md` — concise status links.

**Sources / existing patterns:**

- [034](034-notification-deep-link-contract.md) and
  [035](035-native-notification-tap-runtime.md) — accepted payload, duplicate and consumer limits.
- `supabase/migrations/20260418_push_subscriptions.sql` and
  `20260905003154_multi_membership_active_choir_005.sql` — current browser row and authenticated
  active-choir upsert/delete rules.
- `app/api/push/`, `components/NotificationPrompt.tsx`, `public/sw.js` and
  `lib/server/push-notifications.ts` — current Web Push lifecycle and VAPID sender.
- `apps/mobile/src/auth/`, `apps/mobile/src/notifications/` and `apps/mobile/app.json` — native
  ready-shell identity, permission/tap boundary and configuration facts.
- [Expo Notifications SDK](https://docs.expo.dev/versions/latest/sdk/notifications/),
  [Expo Push Service FAQ](https://docs.expo.dev/push-notifications/faq/),
  [Expo sending guidance](https://docs.expo.dev/push-notifications/sending-notifications/) and
  [Supabase Edge authentication](https://supabase.com/docs/guides/functions/auth) — current
  primary-source token rotation, transport, receipt and authenticated-function requirements.

**Migration start check:**

- Read: `AGENTS.md`, handoff, active context, plan C2/execution controls, migration guide, work
  cycle, brief template, decisions, 034–035, current browser/native push and auth sources, current
  Expo and Supabase primary documentation and the Supabase changelog.
- Boundary: document the shared lifecycle and compatibility split only. Native remains the token
  owner; server registration belongs in an authenticated Edge path; Web Push remains operational.
- Preserve: seven 034 event meanings and canonical destinations; current browser subscription,
  VAPID delivery and unsubscribe; native-only refresh token; server-confirmed active choir; no
  automatic permission prompt; destination authorization recheck and exact delivery dedupe.
- Authority/writer: one primary writer. Continuing scope authorizes local documents and commits;
  it does not authorize DB/Edge/provider writes, credentials, real accounts, push delivery,
  deployment, CI, hardware or spending. Preserve the unrelated temp marker unstaged.
- Required proof: complete source-to-owner matrix, lifecycle/failure table, backward-compatible
  transition order and explicit decision boundary; local link/status/diff checks. Roll back the
  document commit only. No product gate is relevant because no product file may change.

**Out of scope:**

- Calling `getDevicePushTokenAsync` or `getExpoPushTokenAsync`, adding a token listener, creating
  an installation identifier, storing a token or invoking a registration endpoint.
- Schema/RPC/Edge changes, a local or hosted Supabase runtime, provider credentials, EAS project
  setup, FCM/APNs/Expo sends, receipts, real recipients, native build, simulator/device or hardware.
- Replacing or weakening the browser Web Push path, changing notification event content/routes,
  logging raw tokens, adding analytics, background tasks or an inbox.

**Risk / authority / rollback:** A native row inserted into the current table would be selected by
the VAPID sender and parsed as `{ endpoint, p256dh, auth }`; weakening those fields or overloading
`endpoint` would therefore create a mixed-transport failure. A token can also move between an
account's choirs, rotate while running or outlive local permission/account state. The contract
must bind each active token to one authenticated account, current membership and app installation,
keep the transport explicit, replace old tokens atomically and make deactivation idempotent.
Document rollback removes no external state. Any later schema rollback must preserve old web rows
and old clients; Git revert alone will not restore data.

## Current ownership and compatibility inventory

| Layer | Current authority and behavior | Native compatibility consequence |
|---|---|---|
| Browser permission/client | `NotificationPrompt` runs only in the ordinary web shell. After explicit browser permission it creates or refreshes a Service Worker `PushSubscription`; denial attempts backend delete and browser unsubscribe. | The payload is a browser endpoint plus `p256dh` and `auth`. It is not a native APNs, FCM or Expo token. |
| Web registration route | The Next subscribe route verifies a bearer token and forwards only endpoint/key data to the active-choir RPC. The unsubscribe route verifies the caller and deletes that endpoint across the caller's memberships. | These routes remain a web compatibility path. A native client must not fake their JSON shape or add a new Next route. |
| Database/RPC | `push_subscriptions` requires non-null `endpoint`, `p256dh` and `auth`. The 005 RPC derives the active choir/member, serializes by endpoint, moves only the same account's endpoint and refuses a cross-account claim. | These ownership rules are reusable, but the physical row is Web Push-specific. Making the keys nullable would let invalid mixed rows reach the current sender. |
| Server sender | Every selected row is converted unconditionally to a Web Push object and passed to the VAPID library. A 404/410 removes the endpoint. | The sender has no transport discriminator. Native rows in this table would be misrouted even if insertion succeeded. |
| Shared event/tap | 034 derives seven canonical destinations and one delivery UUID; 035 consumes cold/live taps only inside the authenticated ready shell and rechecks destination availability. | Payload meaning, destination authorization and dedupe remain shared. They do not register or authorize a device token. |
| Native auth/permission | `AuthStore` owns the verified session/current choir. The notification gateway creates Android channel state, requests permission only on user action and exposes no token API. | Registration may start only when both permission and the current `ready` auth generation are valid. Refresh tokens never enter registration payloads. |

**Compatibility decision:** use a separate native registration relation (working name
`native_push_registrations`) rather than weakening or overloading `push_subscriptions`. The native
sender selects only that relation and an explicit transport. The current web routes, schema, RPC,
Service Worker and VAPID sender remain unchanged until their own tested consolidation is useful.
This is a transport boundary, not duplicated notification meaning: both senders consume the same
034 payload contract.

## Provider-neutral native registration contract

The later schema/Edge brief may choose physical names, but it must preserve these semantics:

| Field / authority | Contract |
|---|---|
| Caller account | Derived only from the verified Supabase user JWT. Client-supplied user IDs are refused. |
| Choir/member | Derived from `current_choir_id()` / `current_choir_member_id()` at registration or rebind time. Client-supplied choir/member IDs are refused. |
| Installation | A random app-install identifier stored locally; it scopes one physical app installation but grants no authority. App-data reset/reinstall creates a new identifier. |
| Transport | Required discriminator: initially either `expo`, or the direct pair `apns` / `fcm`; never inferred from token text or platform. `web_push` stays in the existing table. |
| Application/environment | Exact mobile application identifier and the provider environment needed to prevent a development token entering production dispatch. Values come from trusted build/runtime configuration and are allowlisted server-side. |
| Token | Stored as provider delivery data, never placed in URLs, analytics, ordinary logs or error text. A unique token cannot be claimed by another account without a valid same-installation transfer/revocation proof. |
| Generation | A monotonically increasing installation-local generation accompanies registration. The server refuses an older generation so a delayed retry cannot replace a newly rotated token. |
| Membership binding | At most one active row per account + app + installation + transport. A successful choir switch atomically rebinds that row to the newly server-confirmed member/choir; it does not fan one active installation across all choirs. |
| State/lease | Active/disabled state, created/updated/last-confirmed timestamps and a bounded lease are server-owned. Lease duration is a later implementation constant, not invented in this inventory. |
| Revocation proof | Registration returns a random rotatable revocation secret; only its hash is stored server-side and the clear value is held in device secure storage. It permits idempotent cleanup after local auth has already ended without treating installation ID or raw token as authorization. |

The authenticated Edge registration endpoint uses an RLS-scoped user client or an equally strict
RPC that re-derives ownership. A privileged client is not needed for ordinary registration. A
separate revocation operation may run without a user JWT only when it verifies the opaque
revocation secret; it may disable that exact registration and do nothing else. Both paths return
generic errors and never echo tokens or secrets. The new relation must enable RLS even if direct
table grants are withheld; indexes cover each foreign key, active member fanout and ownership
predicate. Transport/platform/state values use checked constraints, token and installation
uniqueness back atomic `INSERT ... ON CONFLICT`, and token/installation ownership changes serialize
under one transaction-level lock. If a `security definer` RPC is necessary, it has an empty fixed
search path, explicit `auth.uid()` checks and revoked default execution before the minimum role
grant. These are later migration acceptance requirements, not evidence that a migration exists.

## Lifecycle and failure matrix

| Trigger | Required client/server effect | Failure and retry rule |
|---|---|---|
| App mounts; permission is undetermined | Read permission for UI only. Do not acquire a token, register or prompt. | No retry queue or backend row is created. |
| User grants permission under a ready session/choir | Prepare Android channel first; acquire the selected transport token; serialize one registration for the current auth generation. Server derives account/member/choir and returns registration/revocation receipt. | Acquisition/network failure is visible but does not break sign-in. Retry with bounded backoff only while permission, user, choir and generation remain current; reacquire rather than persist a raw access token. |
| User denies, or later system permission check is denied | Do not acquire a token. If a receipt exists, disable the exact server registration, call native unregister, dismiss displayed Genova notifications and clear the local active receipt only after preserving any needed revocation retry. | Backend offline must not block local disable. Retain only the bounded revocation receipt for retry; never retain an access token. Native unregister behavior still needs binary/device proof. |
| Provider rotates the token while running | Listener queues the new token after any earlier registration task, increments generation and atomically replaces the old token for this installation. | Do not call a token getter from inside the listener. Older/delayed generation is refused; exact duplicate token/generation is idempotent. |
| Active choir switch succeeds | Pause new registration work during selection. Rebind the same installation to the server-confirmed new membership after the auth store reaches `ready`; old-choir dispatch stops atomically. | A failed switch keeps the previous binding. A late old-choir request is discarded by the client generation and refused by the server generation/current-choir check. |
| Sign-out | Attempt authenticated server disable, then locally unregister and dismiss displayed notifications before/alongside clearing session state. Sign-out itself is never blocked by network failure. | If authenticated disable fails, retain the revocation receipt and retry its exact unauthenticated disable when connectivity returns. No signed-out tap may enter a tenant screen. |
| A different account signs in on the same installation | The prior account registration must be disabled using its retained revocation receipt before the new authenticated claim. A new account cannot take the row by presenting only installation ID/token. | If cleanup cannot be proved, fail registration visibly rather than hijack; local app use continues without remote push. |
| App is uninstalled or provider reports an invalid device | No client cleanup can be assumed. Sender receipt processing disables `DeviceNotRegistered`/equivalent tokens; an unrefreshed lease also expires. | Provider receipt success is not user receipt. Temporary provider/HTTP failures use bounded backoff; permanent token errors disable, not retry forever. |
| Duplicate delivery/tap | Sender reuses the one 034 delivery UUID for retries of the same logical notification; client suppresses that exact tap duplicate. | A new logical event gets a new UUID. Provider ticket IDs are operational metadata, not the product dedupe key. |

## Backward-compatible implementation order

1. Add and locally verify the separate native registration schema/RPC or Edge contract, including
   denied account/choir, token collision, old generation, rebind, revoke and restore/down evidence.
   Do not change the browser table or sender.
2. Add the authenticated native Edge path and secret-bound exact revocation path; test actual local
   entrypoints and error responses. Deploying either remains a separately approved operation.
3. Add the mobile coordinator behind 035's explicit permission action. It may acquire/register only
   after the server path and selected build configuration exist; sign-out/permission cleanup ships
   in the same client slice, not later.
4. Add a transport-specific server adapter that reads only native registrations and emits the 034
   payload. Keep VAPID fanout independent; one transport failure must not roll back the product
   mutation or suppress another transport.
5. Add provider ticket/receipt processing, permanent-token deactivation, bounded retries and
   redacted observability before calling delivery reliable.
6. Prove provider delivery/tap/sign-out/rotation on approved real builds and recipients. Only then
   reconcile optional shared abstractions; never delete the working web path during initial rollout.

## Owner decision packet — native transport

| Option | What changes | Benefit | Cost / open boundary |
|---|---|---|---|
| **Expo Push Service — recommended first channel** | Mobile uses `getExpoPushTokenAsync` with an explicit EAS project ID; server sends through Expo and checks tickets/receipts. | One native token/send surface for iOS and Android; matches the current Expo application. Expo currently documents no send fee and a 600 notifications/second/project limit. | Expo becomes an additional processor and has no SLA. Expo/EAS project ownership, APNs/FCM credentials, enhanced push security and provider execution need explicit owner scope. `DeviceNotRegistered` receipts must disable tokens. |
| Direct FCM + APNs | Mobile uses `getDevicePushTokenAsync`; server owns two provider adapters and credential sets. | No Expo delivery relay and more direct provider control; Expo client library remains usable. | Larger credential, environment, sender, retry/receipt and two-platform test matrix. It does not remove APNs/FCM credential or native-build requirements. |

Recommendation is Expo Push Service for the first bounded native channel, while keeping `transport`
explicit so a later provider exit does not change the account/choir/installation contract. This
recommendation is not authorization to create an Expo project, upload credentials, send messages
or spend. The owner decision required before the transport adapter/credential brief is:
**Expo Push Service first, or direct FCM + APNs?** Provider-neutral client/core and schema design
may continue locally without that answer; token acquisition and sender implementation may not.

**Small implementation steps:**

1. Trace current web/native/DB/provider fields, authority, side effects and cleanup.
2. Record lifecycle invariants, state transitions, compatibility order and the smallest owner
   transport choice without silently choosing credentials/account custody.
3. Run document gates, self-review against C2, record limits and update concise indexes.

**Done definition:**

- [x] Current browser schema/RPC/sender and native auth/permission ownership are fully reconciled.
- [x] Registration, rotation, choir switch, permission refusal, sign-out and stale-token cleanup
      each have identity, effect, retry and failure behavior.
- [x] The transition keeps current web rows/clients working and prevents mixed-provider dispatch.
- [x] The provider choice names current primary-source trade-offs and the exact owner decision.
- [x] Migration start check and guide delivery checks are evidenced.
- [x] Local links/status/consistency and `git diff --check` pass; no runtime/output was created.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source and primary-document inventory | local repository + official Expo/Supabase docs | PASS | Browser-only row/RPC/VAPID sender and native no-token boundary confirmed. Expo documents device/Expo token acquisition and runtime rotation listener; Supabase documents authenticated user Edge calls. No external state accessed. |
| 2026-09-19 | Supabase changelog relevance scan | official `changelog.md` | PASS | Current breaking-change entries reviewed; none changes this document-only lifecycle inventory. No schema/API implementation claim. |
| 2026-09-19 | Resource preflight | local filesystem | PASS | 12,089,420 KiB free; no build/runtime/download planned; 10 GiB stop floor retained. |
| 2026-09-19 | Source-to-contract assertions | local repository after planning commit `eecf50d` | PASS | Required browser fields, active-choir RPC, cross-account refusal, unconditional VAPID selection, absence of native token APIs and absence of EAS project ID all matched the recorded inventory. |
| 2026-09-19 | Lifecycle/schema security self-review | local document + Supabase Postgres guidance | PASS | Separate transport table preserves web compatibility; later migration requirements now include RLS, least privilege, checked constraints, indexed foreign keys/ownership lookups, atomic upsert and serialized ownership change. No migration was created or run. |
| 2026-09-19 | Provider decision comparison | current official Expo SDK/FAQ/sending guidance | PASS | Expo token rotation listener, Expo-vs-device token APIs, free documented send service, 600/s project limit, receipt cleanup and no-SLA boundary recorded. Recommendation does not grant account/credential/provider authority. |
| 2026-09-19 | Document link/status/diff/resource gate | five changed Markdown files | PASS | 99 local links resolve with zero missing; no stale 036 pending marker; `git diff --check` passes; no generated runtime/output exists and free space remains above 10 GiB. |

**Delivery:** Planning commit `eecf50d`; this documentation acceptance record follows. No
product/schema/provider revision exists. The next ready local step is a provider-neutral registration
protocol/core that cannot acquire a token; the transport adapter waits for the owner choice. A local
DB/native runtime is not allocated near the disk floor. Provider credentials, delivery and hardware
remain separately gated.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Current browser and native ownership/format inventory is complete | yes | PASS | 2026-09-19, source assertions after `eecf50d` | Native data cannot enter the current browser RPC/table/sender; no runtime or hosted-schema inference. |
| Account/member/choir/installation/token lifecycle and negative transitions are explicit | yes | PASS | 2026-09-19, lifecycle matrix self-review | Covers rotation races, switch, sign-out/offline revocation, different account, refusal, uninstall, retry and duplicate delivery. It is a contract, not runtime proof. |
| Backward-compatible migration and dispatch order is explicit | yes | PASS | 2026-09-19, compatibility/order review | Separate native relation and sender preserve existing browser rows/clients; later migration still requires full DB gates. |
| Native transport decision packet uses current primary sources and exposes owner choice | yes | PASS | 2026-09-19, official Expo SDK/FAQ/sending docs | Expo-first recommendation and direct FCM/APNs alternative recorded; choice and external authority remain open. |
| Link/status/diff/resource checks and self-review | yes | PASS | 2026-09-19, local document gate | Links/status/diff pass; no runtime/output created; free space stays above floor. Self-review is not independent review. |
| Product code, schema, Edge runtime, provider delivery, real recipient and hardware | N/A — document-only inventory | N/A | not executed | Remain required in later C2 briefs. |
