# Genova — long-term mobile delivery plan and execution directive

Execution controls updated 2026-09-15 under
[WF-007](briefs/WF-007-bounded-execution-and-disk-budget.md) after the owner's disk-pressure
and delivery-focus review. Local C1 acceptance is complete at 033; C2's shared contract is accepted
at 034, the first native permission/tap consumer at 035 and the token lifecycle inventory at 036.
The provider-neutral registration protocol is accepted at 037. Schema/Edge and then the selected
transport remain; [038](briefs/038-native-chat-feature-inventory.md) accepts C3's bounded feature
and safety inventory. [039](briefs/039-chat-tenant-memory-teardown.md) accepts the first C3 repair;
[040](briefs/040-shared-chat-read-contract.md) accepts the shared room/message read contract.
[041](briefs/041-chat-room-membership-authority.md) accepts the first authority repair for room
membership; [042](briefs/042-chat-social-membership-authority.md) accepts room/actor authority for
reactions, polls, votes and stars. [043](briefs/043-chat-message-status-authority.md) accepts the
server-timestamped durable status authority. Core-message rules are next; client adoption and
publication/private Realtime remain later slices.
Originally prepared under
[WF-006](briefs/WF-006-long-term-execution-plan.md).
This is the canonical delivery sequence, extending the earlier 5–8 September plan. It is a
plan, not implementation evidence or an authorization grant. Agent instructions are English;
user updates and product copy remain Turkish. [Decisions](../KARARLAR.md) remain authoritative.

## Objective, milestones and preserved scope

Deliver a usable choir product while keeping the live web application working. The first
product milestone is an installed app's sign-in → server-confirmed choir selection → repertoire
→ protected PDF and existing annotations → sign-out, accepted by a chef and a chorist.
Local implementation, simulated acceptance, authorized pilot, beta distribution and public store
release are distinct outcomes. The ~80% native / ~20% permanent WebView target is an architecture
boundary, not a progress percentage. Screen ownership remains solely in [MIGRATION](../MIGRATION.md).

| Milestone | Observable exit | Current evidence |
|---|---|---|
| M0: local read foundation | Catalogue, ticket and reader units compose without tenant leakage | **COMPLETE locally:** 013–022; actual local Auth/RLS/Edge/Storage, iOS/Android lifecycle and production-browser web compatibility passed. 023 separately accepted the write-contract inventory |
| M1: operational read pilot | Approved chef/chorist accounts read protected content on approved iOS/Android hardware; refusal, cleanup and relaunch work | NOT RUN; hardware postponed, new Edge path not deployed |
| M2: rehearsal tools | Compatible annotation writes, recoverable sync, useful audio and stable navigation | 024 server/revision foundation, 025 web lifecycle and 026–027 foreground native audio/navigation accepted locally; native writing and recoverable sync remain open |
| M3: wider mobile product | Permanent WebView integration plus native chat, assignments and home, with feature preservation | C1 **COMPLETE locally:** 028–032 accepted the component/platform layers; 033 proved both composed handshakes, all route families, current iOS feature/fault, current guarded/normal Android and owner-operated iOS password change/restore. C2 is in progress through 037; C3 inventory/teardown/read contract plus room, social and durable-status authority are accepted through 043, while later authority/runtime slices and C4–C5 have not started |
| M4: release candidate | Multi-choir limits, data lifecycle, provider exit, security/accessibility and distribution requirements pass | Future packages; no current store eligibility claim |
| M5: released and operable | Approved beta/public release verified at actual destination; support and recovery exercised | NOT RUN; publication and spending remain separately gated |

Decision #21 keeps the pilot ahead of store limits and major infrastructure work. The owner's
8 September direction permits independent local work while user/device tests wait. This does
not accept M1 or allow a blocked release to advance. No feature is silently removed: each feature
inventory must map existing behavior to preserved/shared/adapted/deferred, its owner and evidence.
Deferral from a release candidate needs an explicit owner decision and remains visible.

## Baseline and evidence ownership

Start from [agent-handoff](agent-handoff.md), then verify the checkout. At this update:
product `main / 1434464`, recorded remote `a13f696`, with an unrelated unstaged CLI cache. These are
snapshot facts, not commands to reset a future checkout. Historical test details belong in their
briefs, not in a second copy here.

- [004](briefs/004-rn-kabuk-ve-giris.md): 25/27; hardware secure storage and real-phone flow
  remain NOT RUN and postponed. Do not ask whether hardware is due merely because a loop ends.
- [010](briefs/010-008-canli-yayin-ve-kabul.md): 6/7. Revoked-link and wrong-account refusals
  passed at SQL level, not through the live product. Deleted fixtures need separately approved
  recreation; never repeat cleanup before all intended cases and their evidence are captured.
- [012](briefs/012-coklu-uyelik-secim-kilidi.md): fixed/down/restored local regression is accepted.
- [013](briefs/013-native-repertoire-contract.md) owns the repertoire preservation inventory;
  [014](briefs/014-native-repertoire-catalogue.md),
  [015](briefs/015-shared-protected-repertoire-file.md),
  [016](briefs/016-native-pdf-readonly-annotations.md) and
  [017](briefs/017-non-hardware-read-flow-acceptance.md) own dated local acceptance.
- [018](briefs/018-protected-file-runtime-acceptance.md) locally ran the actual Deno entrypoint
  through disposable Auth/RPC/RLS/Storage and HTTP; no deployment, Drive, real account or hardware
  result is inferred. 016 compiled on an iOS simulator; 017 injects fake auth/data/rendering and
  cannot prove actual bitmap output. The older Android build predates the PDF dependencies.
- [019](briefs/019-ios-native-pdf-render-acceptance.md) locally rendered actual PDF-page-image
  bitmaps and Skia overlays on the current iOS simulator from tracked fixtures. Android and the
  018 service-to-client lifecycle remained unrun in that slice; 021 later completed it locally.
- [020](briefs/020-android-native-pdf-render-acceptance.md) locally rendered the same actual
  output on the current API 36 arm64 Android emulator and reran the affected iOS build. It keeps
  the fixture-only boundary; 021 later completed the 018 service-to-client lifecycle locally.
- [021](briefs/021-mobile-protected-file-runtime-acceptance.md) then composed the actual
  disposable 018 service with the real default mobile Auth, catalogue, private-file and native
  reader path on both local platforms. First-open refusal/retry, exact 40-page download/render,
  reader exit/reopen, tenant switch/403/empty catalogue and sign-out cleanup passed at `404a9ee`.
  This is local synthetic evidence, not M1, deployment, Drive, real accounts or hardware.
- [022](briefs/022-web-protected-file-compatibility.md) completed A3 locally at `fb4a6a2`.
  Production Chrome exercised the existing PDF, audio and explicit-offline consumers through the
  disposable protected-file service: exact bytes, ticket renewal, visible missing-object failure,
  wrong-choir refusal and tenant/sign-out cache teardown passed. No product repair was needed.
  Hosted routing, Drive, real accounts, deployment, remote CI and hardware remain unverified.
- [023](briefs/023-annotation-write-contract-inventory.md) documentation-accepted B1. It maps
  item/layer identity, role visibility and mutation, audit/version/delete semantics and the current
  web lifecycle. It found blocking loss risks (cover-page offset, cancelled debounce, unsupported
  item overwrite, no CAS and unchecked zero-row writes) and separates four owner decisions from
  the mandatory fail-closed repair baseline. No product, schema or live change was made.
- [024](briefs/024-annotation-mutation-safe-save-contract.md) locally accepted the first repair at
  `1755803`: positive revision/CAS, server-derived file/song/choir and audit identity, authenticated
  role/layer mutation, exact down/forward restoration and a lossless-read/safe-save web adapter.
  No hosted migration or release occurred.
- [025](briefs/025-web-annotation-safe-save-lifecycle.md) locally accepted web adoption at
  `42c2fbb`: PDF-page identity, lossless/revision metadata, per-key serialized retryable saves,
  pending remount overlay, unload warning and flush-before-switch/sign-out passed focused tests and
  the root 42-file/279-test build gate. The hosted RPC, real account/browser flow, release, native
  writing, persistent offline recovery and final owner UX choices remain open.
- [026](briefs/026-native-repertoire-audio-playback.md) locally accepted the first B4 slice at
  `c30b3b1`: current-session protected tickets, stale-request cancellation, one native foreground
  owner, play/pause/seek/0.5–2x speed, expiry renewal, corrupt/unsupported errors and tenant teardown
  passed unit/integration tests and actual iOS/Android Release decoding of deterministic local WAV
  bytes. That slice left navigation persistence, compact mini-player, background/interruptions,
  hardware, hosted service and release open; 027 below closes only the first two locally.
- [027](briefs/027-native-audio-shell-mini-player.md) locally completed foreground B4 navigation
  integration at `dc25938`: one provider beneath authenticated `ReadyShell` owns the player and
  signed source; full and compact views preserve source/position/rate through repertoire and home.
  Both local Release apps passed expiry renewal, real WAV playback, corrupt/unsupported failure and
  tenant teardown; [visual evidence](evidence/027-native-audio-shell-mini-player/README.md) is
  retained. Background/interruption/lock-screen/audio-route and hardware remain B5.
- [028](briefs/028-permanent-webview-bridge-inventory.md) and the
  [bridge contract](webview-bridge-contract.md) fixed all nine permanent route families, native-only
  refresh ownership and the challenged memory-only access lease. [029](briefs/029-permanent-webview-policy-core.md)
  accepted the shared pure policy at `4289da4`.
- [030](briefs/030-web-embedded-adapter.md) accepted the dormant web peer at `c7d09d3`; [031](briefs/031-native-webview-shell.md)
  accepted the native shell at `0217ac8`; [032](briefs/032-webview-platform-capabilities.md) accepted
  password, clipboard, constrained image and ephemeral protected-file capabilities at `fa2e4b7`.
  These are separately accepted local slices. [033](briefs/033-composed-permanent-webview-runtime.md)
  implemented the guarded composed runtime at `d295c62` and proved both local Release handshakes,
  all route families and the full historical Android scenario set. On 19 September the repaired
  one-use credential, persisted SecureStore relaunch, WebView-originated sign-out and guarded Android
  and normal Release checks passed on current dependencies. At `69714b1` the guarded iOS batch also
  passed actual attendance mutation, external Realtime invalidation, exact-byte protected PDF and
  cleanup, terminal second-401/native retry, tenant switch, WebView sign-out and signed-out relaunch.
  The owner-operated iOS password change/restore and fresh restored-value sign-in passed on
  19 September without exposing a password to the agent, closing 033/C1 locally.
  Hosted/provider/real-account/hardware/release acceptance is not inferred.
- [034](briefs/034-notification-deep-link-contract.md) and
  [035](briefs/035-native-notification-tap-runtime.md) accept the shared seven-event contract and
  the user-triggered permission/auth-gated tap consumer locally. [036](briefs/036-native-push-token-lifecycle-inventory.md)
  then documentation-accepts a separate native registration relation and the account/current-choir/
  installation/rotation/sign-out lifecycle. It recommends Expo Push Service first while retaining
  the owner's transport choice and every credential/provider/device boundary.
- [037](briefs/037-native-push-registration-protocol.md) accepts the provider-neutral v1
  register/revoke/receipt contract at `b1d565f`: exact keys, opaque sensitive values,
  transport/platform compatibility, stale identity/generation refusal and redacted diagnostics
  pass 57 files/540 tests and the root build. It creates no token, schema or provider evidence.
- 016's supplemental dependency audit remains FAIL (10 moderate toolchain findings at that
  revision). A dedicated investigation must determine applicability and safe remediation.
- Known account risk remains under decision #17; its acceptance is not remediation. A historical
  GitHub token revocation is pending in the handoff; do not read or copy credentials to check it.

## Work selection and authority

The owner's 9 September continuing request authorizes the local execution loop one bounded brief
at a time: select, implement, test, evaluate, record and move to the next ready local package.
Verify standing authority and the brief before each package. This does not authorize a different
account or any external, real-data, release, spending or hardware action.

| Class | Work that may be prepared or performed within existing scope | Boundary |
|---|---|---|
| Local | Source review, isolated synthetic tests, local code and required local commits | One scoped brief; preserve unrelated work; isolated restored copies retain their data restrictions |
| External read | Only the exact account/data and read-only scope previously authorized | Access availability is not real-account/real-data permission; otherwise ask |
| External write | Concrete release/migration/fixture/email/distribution plan may be prepared | Push, remote CI dispatch, deploy, live migration/data changes, real accounts/data, email, credentials and spending need explicit applicable approval |
| Hardware | Prepare test matrix and identify prerequisites | Postponed tests stay NOT RUN until the owner explicitly resumes them |

Before an external action present its exact revision, target account/project, resources, data
scope, steps, expected effects (including automatic hosting), cost if any, rollback and checks.
Approval must identify the operation; silence, elapsed time, a plan or an open browser is not
approval. Preserve any previously granted narrow authorization without asking twice for it.

## Ordered work packages

Package keys below express dependencies, not preassigned brief numbers. Packages 018, 021 and 022
closed A1, A2 and A3 locally; open each next implementation brief from the current checkout and
[brief template](briefs/_TEMPLATE.md). A row with several user outcomes must be split into
sequential briefs. Source paths are starting points, not authority for a broad rewrite.

### A — Turn the existing read implementation into runtime evidence

| Package / dependency | Bounded outcome and relevant sources | Acceptance, including failure cases | Authority / stop |
|---|---|---|---|
| A1 / 015–017 local evidence | **018 COMPLETE locally:** protected-file runtime acceptance. `supabase/functions/repertoire-file/`, shared protected-file client, `supabase/test-support/` | Actual Deno entrypoint and HTTP route passed with synthetic PDF checksum; JWT/current-choir/RLS composition; bad/expired ticket, denied choir, HEAD/206/416, MIME and upstream failure; fixture/source baseline unchanged | Code/test `0b3df6e`; exact evidence and local-only limits in [018](briefs/018-protected-file-runtime-acceptance.md). Deploy, Drive, real accounts and hardware remain unverified |
| A2 / A1 | **COMPLETE locally:** [019](briefs/019-ios-native-pdf-render-acceptance.md), [020](briefs/020-android-native-pdf-render-acceptance.md) and [021](briefs/021-mobile-protected-file-runtime-acceptance.md); final service lifecycle at `404a9ee`. `apps/mobile/src/repertoire/`, `apps/mobile/src/ui/`, native configuration | Actual local Auth/RPC/RLS/Edge/private Storage composed with both Release apps: first 401, UI retry, fresh ticket, exact 40-page download/render, reader exit/reopen, tenant clear, B-choir 403/empty catalogue and sign-out session/preference cleanup passed | Local/synthetic simulator+emulator only. M1, deploy, Drive, real accounts, device durability and hardware remain unverified |
| A3 / A1–A2 | **COMPLETE locally:** [022](briefs/022-web-protected-file-compatibility.md), code/test `fb4a6a2`. Existing web protected-file consumers plus guarded browser/runtime acceptance | Production Chrome passed exact PDF/audio bytes, Range playback, explicit offline Service Worker caches, ticket renewal, visible 502, wrong-choir 403 and switch/sign-out teardown | Local synthetic browser + isolated service only. No product repair, live route, Drive, deploy, real account or remote CI evidence |
| A4 / A1–A3 | Controlled service/client release and read pilot readiness; release brief based on 015 and 017 | Exact outgoing commits and hosting triggers; Edge deployed/configured before calling web; approved synthetic fixture roles; service and actual domain checks; rollback rehearsal before release | Prepare locally; external execution gated. Failed deployment blocks client rollout; hardware pilot remains separate |
| A5 / A4 + explicit device authority | M1 device pilot; use 017's checklist and 004's remaining rows | Chef + chorist on both platforms, real rendering/permissions/network/relaunch/secure storage; error and isolation cases with build/device evidence | Postponed. Do not close 004 with emulator evidence or force this as the next user action |

A1–A3 are the immediate local critical path. After they pass, independent local B work may
continue if A4/A5 await approval, with M1 visibly pending. A2 cannot replace A1's real local
service boundary with a fake and call the integration complete. If local Auth/RLS cannot be
provisioned, preserve the failing/unrun layer and solve that bounded environment issue first.

### B — Rehearsal tools without breaking the shared contract

| Package / dependency | Bounded outcome and relevant sources | Acceptance, including failure cases | Authority / stop |
|---|---|---|---|
| B1 / A1–A3 | **DOCUMENTATION ACCEPTED:** [023](briefs/023-annotation-write-contract-inventory.md). Shared item/layer, role/RLS, delete/audit/version, web lifecycle and native read-only boundaries mapped | Six current web safety defects recorded; unsupported content must be preserved/refused, stale writes must fail visibly and tenant exit cannot silently lose or replay a save | No product/schema/live change. Four new collaboration/UX semantics remain explicit owner decisions before final B2 UX |
| B2 / B1 | **IN PROGRESS:** [024](briefs/024-annotation-mutation-safe-save-contract.md) locally accepted the revision-safe server/adapter foundation and [025](briefs/025-web-annotation-safe-save-lifecycle.md) locally accepted web lifecycle adoption. Native editing and final owner UX decisions remain | Web writes → native reads and native writes → web reads; coordinates/page indexing/undo/redo; denied writes; stale session/choir switch; interrupted save visible; no dropped unknown content | 024/025 are local isolated SQL/unit/web acceptance only. Shared-schema changes require old-client compatibility, not a parallel schema; no hosted migration is authorized |
| B3 / B2 | Recoverable annotation sync/offline queue under an explicit conflict contract | Retry idempotence; two clients editing; reconnect and process restart; revoked permission; tenant-scoped queue and sign-out disposition; no silent last-writer data loss | Conflict policy and unsaved-work UX decided before implementation. No hardware durability claim from fakes |
| B4 / A3, read contract | **COMPLETE locally:** [026](briefs/026-native-repertoire-audio-playback.md) accepted protected foreground playback/seek at `c30b3b1`; [027](briefs/027-native-audio-shell-mini-player.md) accepted shell ownership and compact navigation persistence at `dc25938`. `lib/shared-audio.ts`, repertoire consumers, `apps/mobile/` | Actual local WAV bytes, iOS Range reads, expiry renewal, cancellation, one shell owner, repertoire/home state continuity, compact controls, tenant teardown and corrupt/unsupported states passed | Local simulator/emulator self-review only. MIDI/MusicXML support is inventoried separately; background/interruption/lock-screen/audio-route and hardware remain B5; decision #14 filter stays |
| B5 / B2–B4 + device authority | Stylus/gesture and audio lifecycle acceptance | Pressure/palm rejection, layout alignment, long-score memory and latency; interruptions/background/lock-screen and permission denial on real devices; measured before/after for performance claims | Hardware/provider capability and background behavior remain NOT RUN until actual execution |

Persistent offline library/user controls are a separate brief after B3/B4: explicit download,
storage budget/eviction, stale authorization policy, version/checksum, cancellation and cleanup.
Do not assume permission revocation can be enforced while a device is offline; decide and record
that product/security boundary before shipping. Offline support is not implied by a cache.

### C — Complete the mobile experience in small user flows

| Package / dependency | Bounded outcome and relevant sources | Acceptance, including failure cases | Authority / stop |
|---|---|---|---|
| C1 / stable A read flow | **COMPLETE locally:** [028](briefs/028-permanent-webview-bridge-inventory.md) fixes the [bridge contract](webview-bridge-contract.md); [029](briefs/029-permanent-webview-policy-core.md) accepted policy at `4289da4`; [030](briefs/030-web-embedded-adapter.md) accepted dormant web adapter at `c7d09d3`; [031](briefs/031-native-webview-shell.md) accepted native shell at `0217ac8`; [032](briefs/032-webview-platform-capabilities.md) accepted platform capabilities at `fa2e4b7`. [033](briefs/033-composed-permanent-webview-runtime.md) composes both clients; current dependency/native gates, iOS/Android composed scenarios and owner-operated iOS password change/restore pass through product `69714b1`. Preserve prior native/route/platform proof separately. `apps/mobile/src/ui/`, `MIGRATION.md`, auth | Correct native/WebView route ownership; shared access-token lease and server-confirmed active choir; logout everywhere; external URL allowlist, back navigation, accessibility, attachments and expired-session recovery | No native rewrites of permanent WebView routes; native alone owns refresh token; no token in URLs/logs; this is local simulator/emulator acceptance, not hosted/provider/real-account/hardware/distribution proof |
| C2 / C1 | [034](briefs/034-notification-deep-link-contract.md) accepts the shared seven-event contract at `6883b3b`; [035](briefs/035-native-notification-tap-runtime.md) accepts the user-initiated permission and auth-gated initial/live tap consumer at `04319e3`; [036](briefs/036-native-push-token-lifecycle-inventory.md) documentation-accepts the separate native registration lifecycle; [037](briefs/037-native-push-registration-protocol.md) accepts its fail-closed v1 wire protocol at `b1d565f`. Schema/Edge and the selected provider remain. | Correct account/device token lifecycle; permission refusal; foreground/background tap routing; destination rechecks tenant/role; unsubscribe/sign-out; duplicate delivery handling | 034–035 prove local payload/consumer behavior; 036 is design evidence and 037 pure contract evidence only. Expo-first is recommended but not selected. DB runtime is deferred near the disk floor. Native binary permission/tap, provider keys, push delivery, real recipients and hardware remain separately authorized |
| C3 / C1 + chat inventory | [038](briefs/038-native-chat-feature-inventory.md) maps the feature/safety split. [039](briefs/039-chat-tenant-memory-teardown.md) resets tenant state at `7a6a78e`; [040](briefs/040-shared-chat-read-contract.md) accepts shared read models/order at `2dfe6ab`; [041](briefs/041-chat-room-membership-authority.md) repairs room membership at `cb4e7ec`; [042](briefs/042-chat-social-membership-authority.md) binds reactions/polls/votes/stars at `c58f4da`; [043](briefs/043-chat-message-status-authority.md) adds sender/member-scoped, server-time status RPC at `1434464`. Core-message rules are next. `lib/chat.ts`, `components/chat/`, native adapters | Preserve rooms/memberships, messages, receipts/reactions/polls and every mapped feature; RLS on every read/write; private room topics; reconnect/order/dedup; idempotent offline retry; inaccessible room and choir switch | 039–043 repair memory/read and locally prove room/social/status authority only. Core-message rules and public Broadcast/Presence remain; 043 has no client adoption. No hosted schema/application, current-query adoption or native runtime claim. Dart UI and Socket.IO are not reusable RN/Supabase code |
| C4 / C1 + file/upload contract | Native assignments, split read → submission → review. `lib/assignment-scope.ts`, `app/(main)/odevler/`, existing assignment APIs | Existing role/deadline/lock/withdrawal/review rules; authorized upload completion, failed/resumed submission, hidden review, wrong tenant and audit behavior | Native server logic moves to shared Edge paths; web uses the same path. Any schema change requires DB gates |
| C5 / C1, C3–C4 as needed | Native home and performance views. Existing main pages, `lib/korist-performance.ts` | Same role/data meaning; empty/error/refresh and tenant change; counters cannot leak a prior choir; deep links resolve correctly | No new analytics product or silent change to calculations |

Do not treat these rows as full feature inventories. Each module brief must trace all current
web actions, API/Realtime dependencies, accessibility and file behavior before deciding its split.
A user-visible feature deferred from the store candidate needs an explicit decision, not removal
from an acceptance table. M3 is accepted only for the declared, reconciled feature set.

### D — Multi-choir release readiness, storage and lifecycle

These preparations may proceed independently when they do not divert the A critical path.
Execution order follows the actual dependency graph, not a forced wait for all of C.

| Package / dependency | Bounded outcome and relevant sources | Acceptance, including failure cases | Authority / stop |
|---|---|---|---|
| D1 / owner agrees new fixture | Finish 010's two live product refusals in its existing record | Revoked link and wrong account rejected through actual UI; no membership created; capture all intended cases before approved cleanup; baseline restored | Live fixture creation/account/email/cleanup each needs applicable scope. Do not create a replacement brief that hides criterion 6 |
| D2 / inventory + owner-defined limits | Minimum plan/limit contract, then server enforcement. Decisions #9–11, membership/file flows | Postgres-owned plan values; concurrent invitations/memberships/upload reservations; retry/release reservations; over-limit legacy choir and downgrade behavior; web/native cannot bypass | Values are owner decisions, not old cost estimates. DB backup/restore and rollout gates required; no automatic billing in v1 |
| D3 / current data inventory | Account deletion/retention/export policy and implementation, separated into briefs. `docs/store-yayin.md`, Auth and tenant relations | Cross-choir identity vs membership deletion; last-chef ownership; shared annotations/submissions/media retention; authenticated request and retry; private data no longer accessible; web/native entry points | Retention/legal text needs owner confirmation and current source review; real deletion never implied by local design |
| D4 / file contract + approved provider | Drive exit preparation → isolated migration rehearsal → approved cutover. `docs/altyapi-2026-09-04.md` | All file classes/versions inventoried; stable IDs and annotation links; checksums/visibility/Range/seek; new uploads, restartable copy, dual reads and actual restore/rollback; no orphan or cross-choir object access | Provider/account/region/cost chosen with fresh evidence. Copy, production cutover and source deletion separately approved |
| D5 / measured hosting need | Hosting compatibility rehearsal, then optional approved move. Existing infrastructure record and `.railway/` | Full resource plan has no unintended deletes; synthetic build/runtime, callbacks, streaming and domain rollback; preserve the working host until replacement acceptance | Railway preparation is not a move. Never bundle hosting/DNS and DB/file cutovers; spending and deployment separately gated |
| D6 / ongoing, before candidate | Dependency/security and recovery readiness in bounded briefs | Triage 016 audit at exact lockfile; safe fix and platform regression; auth/tenant/object access negative tests; no secrets in artifacts; restore rehearsal includes role attributes and required Auth/Storage scope | No force downgrade or blanket RLS relaxation. Known account risk and token revocation retain their recorded owner boundaries |

Drive exit remains a pre-store objective unless the owner explicitly changes it. No provider
price, store rule, release duration or throughput is asserted current by this plan. Refresh
primary official sources at the relevant decision, including account-specific conditions; retain
historical research in its original source. Do not restart vendor comparison for an unrelated task.

### E — Candidate, beta, public release and operations

| Package / dependency | Bounded outcome and relevant sources | Acceptance, including failure cases | Authority / stop |
|---|---|---|---|
| E1 / owner-selected scope + M1 | Candidate feature reconciliation and current store checklist. `docs/store-yayin.md`, MIGRATION and module inventories | No missing preserved feature is hidden; current Apple/Google/account rules checked; privacy/data disclosures match actual SDKs, permissions, retention and deletion; demo data plan; accessibility/manual usability | This plan is not legal/store approval. Owner supplies publisher identity and distribution scope; no invented fee/test timetable |
| E2 / E1 + selected C/D gates | Reproducible signed candidate and approved beta distribution | Exact revision/lockfiles/build identifiers; both platform release builds; deep links, restore/update, permissions and web/native compatibility; signed artifact provenance; crash/feedback route | Signing credentials, upload, remote build spend and tester communication need scope; debug build is not beta acceptance |
| E3 / actual beta evidence | Fix beta blockers one brief at a time; run cross-client regressions | Approved role/device/network matrix; no unresolved required failure; accessible nonblank PDF, tenant isolation, data safety, notifications/audio/offline as shipped; rollback executable | Time or number of briefs does not close a blocker; exclusions require owner decisions |
| E4 / E3 + explicit publication | Public store submission and actual availability verification | Final metadata/builds reviewed; submission outcome and store listing/install verified; production backend/client ordering; rollback or forward recovery for old installed clients | Submit, release and announcements are distinct operations. No automatic publication after a green test |
| E5 / E4 | Bounded post-release operations and next roadmap | Support ownership, crash/incident triage, backup/restore cadence, budget alerts, provider usage and compatibility policy; first maintenance exercise | Recurring automation/monitoring is created only when separately requested; no indefinite background loop from this document |

## Evidence gates and release discipline

Every brief fills mandatory rows before implementation, with failures and unrun required tests
retained. A local package can finish only when its defined local result is proved; the associated
provider/device/release milestone stays open. Never exclude a necessary runtime check solely
because a tool is absent. Do not reopen accepted unit evidence merely because time passed;
rerun when code, dependencies, environment or the asserted integration boundary changed.

| Changed layer | Required baseline and relevant additional proof |
|---|---|
| Documents | Local target/anchor validation, source/status consistency, scope and `git diff --check` |
| Web/shared code/dependencies/build | Root `pnpm check`; changed UI flows additionally use local browser/E2E and relevant accessibility checks |
| RN product | In `apps/mobile`: `npx tsc --noEmit && npm test`; bundle/build for changed platforms. The current `bundle:check` exports iOS only, not Android proof |
| Edge | Actual runtime/entrypoint/import configuration plus HTTP/auth/error tests, isolated permission matrix; injected handler tests alone do not verify deployment |
| DB | Dedicated isolated target, fixed/down/restored acceptance, denied roles and unchanged fixture checks; before live schema changes fresh backup + actual restore, role attributes, both projects and rollback |
| PDF/audio | Actual bytes and native output; MIME/size/checksum, range/seek, expiry, interruption, private storage and tenant cleanup; measure resource behavior before performance claims |
| Release/device | Exact revision, build/platform, role/scenario, expected/actual result and limits; hardware, provider, live UI, CI and store results each have their own rows |

Record date, source revision plus dirty-diff identity if any, command/scenario, environment,
artifact location without secrets, outcome and limitation. A self-review is not independent
review. Test counts and coverage apply only to their configured scope. Do not call 017's fake
rendering “real end-to-end”; do not convert a compiled native module into visual acceptance.

For changes that affect live consumers, prepare a release manifest listing all outgoing code and
record commits, migration/function/client dependencies, automatic hosting effects and rollback.
Deploy compatible server changes before their callers. Validate the exact target before every
approved external step; verify its result before the next. A failed Edge release stops the web
release. Reverting Git does not restore DB rows, files or installed mobile clients. Keep old-client
compatibility until an explicit supported-version policy permits retirement.

## Revised goal text

Deliver all outcomes in docs/mobil-teslim-plani.md through the earliest ready, bounded
user flow: select -> implement -> test -> evaluate -> record -> clean up -> continue.
Resume from the verified 033 checkpoint; preserve 018-032 historical acceptance, deferred
004 device tests, open 010 criteria, all existing product features and approval boundaries.
The credential repair is at `ec5b19a`, startup error/retry repair at `5a9fb8f`, and a current
Xcode-signed normal iOS Release passed SecureStore startup/read twice on 18 September.
`6a5769a` then repaired early-401 forced refresh; guarded iOS recovery and persisted SecureStore
relaunch passed against the disposable services. On 19 September the repaired guarded Android
one-use credential, persisted session and WebView-originated sign-out passed and were cleaned.
The post-alignment normal Android Release/isolation gate then passed and was cleaned. At `69714b1`
the remaining agent-operable guarded iOS mutation/Realtime/PDF/second-401/tenant/sign-out batch also
passed and was exactly cleaned. The owner then completed the two required iOS password submissions;
a fresh original-fixture sign-in proved restoration and the exact runtime was cleaned. Preserve 033
as accepted evidence and resume at the earliest ready bounded C2 notification/deep-link contract
slice rather than replaying C1. Follow the execution and resource controls
below: one active result, at most three next actions, causal reassessment after two failed
approaches, and a progress review every 60 minutes. Preserve at least 10 GiB of filesystem
free space; estimate peak allocation before downloads/builds, run heavy work sequentially,
and remove owned generated artifacts after use. Keep handoffs short and evidence in its
brief. Prepare concrete owner decisions/releases when gated; stop dependent work with the
exact missing condition. Never turn an unrun check into a pass or extend test infrastructure
without an identified product blocker. Continue within existing authority until completion
or a concrete dependency, resource or approval boundary.

This is the canonical revised objective. Repository edits do not themselves edit the Codex
goal card. WF-007 records whether the application update was possible; never complete the
unfinished product goal merely to replace its wording.

## Bounded execution and resource controls

These controls apply to the continuing goal, including work with GPT-5.6 Sol. They are
project workflow rules, not model-capacity claims or permission to change the selected model.

- **Work card:** in the current brief, name one observable user benefit or reproduced blocker,
  the exact paths, at most three next actions, required checks and the exit condition. Add a
  short checkpoint to a large existing brief; do not create a new brief for each diagnostic.
  New integration work proves one real client/server flow early, then expands the preserved
  feature matrix. Existing required acceptance rows remain intact.
- **Repetition:** record failure -> cause/evidence -> changed approach. After two unsuccessful
  approaches to the same criterion, stop repeating it and reassess. A further attempt needs
  new causal evidence and a bounded check; otherwise record the blocker and choose a genuinely
  independent ready task. Every 60 minutes of active work, state the new user outcome or
  evidence and what changes next. No new evidence means change method/scope within authority
  or checkpoint; it does not justify another identical build or environment rebuild.
- **Disk floor:** the owner requested roughly 10 GB free. Use a conservative **10 GiB available**
  filesystem floor (10,485,760 KiB reported by `df -k`), not advertised/purgeable capacity.
  Before downloads, installs, exports, builds or runtime setup, record current free space,
  existing owned usage, estimated additional peak allocation and cleanup targets. Proceed only
  if projected free space remains above the floor. If peak is unknown, first obtain a size
  estimate without downloading; unknown does not pass. Below the floor, do only owned cleanup
  and low-allocation inspection/source/document work; no large download/build/runtime start.
  Recheck free space during heavy work and after each phase. If actual growth threatens the
  floor, stop further allocation at the next safe boundary and clean owned output. This is an
  agent operating rule, not an OS-enforced quota; other applications can also consume disk.
- **Peak usage:** count task VM data disks, simulator/AVD storage, native build directories,
  temporary SDK/JDKs, database copies and caches outside the repo as well as inside it.
  Measure allocated bytes, not a VM's configured maximum. Use one owned runtime and one heavy
  build/platform at a time; reuse a valid installed toolchain. Record a reason before another
  export/rebuild; successful unchanged checks are historical evidence, not a reason to rerun.
- **Artifact lifetime:** keep one brief-local inventory: exact owned path/profile/device,
  measured size, purpose, last dependent check and removal point. Preserve source, lockfiles,
  existing working dependencies and essential redacted evidence. Remove large derived output
  after its last check; reuse within a planned check batch to avoid delete/recreate loops.
  On pause/handoff, stop owned services/devices and remove large disposable outputs unless a
  concrete same-task reuse step, short expiry and sufficient disk headroom are recorded.
  A user cleanup request or disk-floor breach overrides retention. Inspect residual VM disks,
  contexts and ports after cleanup; never purge global caches, other projects or unknown data.
- **Evidence and context:** keep dated results/hashes in the brief; keep only current status,
  dirty ownership, one next action and links in handoff/activeContext (aim <=80 lines each).
  Read relevant/changed sources rather than the whole archive. Redact secrets before tool
  output; scan actual artifacts using boolean matches/counts, never printing secret values.
  Do not store passwords in EXPO_PUBLIC_* or other public build variables. Document-only
  changes use link/consistency/diff checks, not product builds. Required product gates remain.
- **Delivery focus:** when a decision or external action blocks progress, prepare the concrete
  alternatives or release/rollback package and ask only for the missing choice/authority.
  Preserve previously granted approval. No new capability framework, general-purpose test
  runner, dependency upgrade, parallel agent/worktree or expanded matrix merely to keep busy.
  If no authorized outcome is ready, record the exact blocker and stop dependent execution.

## Agent execution loop

Use the existing [work cycle](ai-calisma-duzeni.md); this section defines Genova's task selection
and evidence transitions, not a second agent framework or scheduler.

1. **Orient:** read AGENTS → short handoff/activeContext → current brief and these controls;
   read guide/work cycle once and other memory, decisions and code only as relevant/changed.
   Verify branch, HEAD, dirty ownership, disk/tool availability and current permission.
   Old environment observations are not universal commands.
2. **Select:** take the earliest ready bounded outcome above. State its user benefit and concrete
   blocker. Check dependencies and evidence; prefer closing a known integration gap to adding
   an unrelated feature. If another agent has moved HEAD or owns changes, reconcile before writing.
3. **Contract:** create/update one brief with paths, preserved features, exclusions, acceptance
   matrix, actual environments and rollback. Do not start the whole roadmap as one task.
4. **Execute:** make the smallest authorized change. Unit-test a reproduced defect; then run its
   layer and integration gates. Keep real provider/device/user activity behind applicable approval.
5. **Evaluate:** required PASS for every row permits that brief's acceptance. FAIL means reproduce,
   diagnose and repair within scope. NOT RUN keeps the item open. After two unsuccessful approaches
   reassess cause/environment rather than repeat indefinitely; never weaken the test to advance.
6. **Review:** compare final diff to contract and feature inventory; check tenant/role, compatibility,
   lifecycle, native/WebView and publication effects. Repair contradictions and rerun affected checks.
7. **Record/commit:** evidence in the brief, screen state in MIGRATION, decision changes only in
   KARARLAR when actually accepted; concise active/progress indexes and handoff links. Separate code
   and documentation commits, both containing the brief identifier. Stage only owned paths.
   Finish owned cleanup and record actual free space before starting another heavy task.
8. **Choose the next iteration:** continue only within active user authorization and a ready brief.
   A blocked task stays visible. Select an independent allowed package only if its dependency is
   genuinely absent; do not bypass A1–A3 by calling a dependent feature independent.
9. **Checkpoint:** before context/agent handoff, commit coherent owned work, record unfinished
   ownership, exact next action, tests/limits and pending approvals. The receiving agent re-verifies.
   Include the short work card, failed approaches and artifact inventory; apply retention limits.
   If no authorized task is ready, provide the concrete blocker/approval request and stop; never
   busy-wait, repeatedly ask about postponed hardware or create an unrequested scheduled job.

User status updates should be short Turkish: the verified outcome, remaining uncertainty and next
bounded action. A status question steers the active work; a planning request does not execute the
plan. No subagent is required; any permitted delegation follows AGENTS' one-writer contract.

## Progress, prioritization and planning review

Track accepted user outcomes and unresolved gates per milestone, not a whole-product percentage
or a promise based on historical estimates. Before each milestone transition, review risk and
feature inventory; update the roadmap only for evidence or explicit decisions. For scheduling,
measure actual completed brief durations and pilot findings first; external approvals and hardware
availability remain unknown. Do not invent completion dates or costs.

If hardware remains deferred after A1–A3, local B/C design or implementation can progress in the
specified order; M1 and dependent release acceptance stay pending. If a verified security or data
loss issue blocks the current user flow, insert only its smallest repair brief with the evidence
and affected dependency. Plan limits or hosting move forward only for a demonstrated blocker or
an explicit change of priority. Report unavoidable unfinished work rather than declaring success.

The planning loop itself is finite: source audit → dependency/evidence draft → failure-scenario
review → link/consistency validation. [WF-006](briefs/WF-006-long-term-execution-plan.md) records
those iterations. A3 closed locally in [022](briefs/022-web-protected-file-compatibility.md) at
code/test commit `fb4a6a2`; the immediate local read critical path A1–A3 is complete. A4 may now be
prepared locally, but any release execution remains separately gated and A5 hardware stays
postponed. Package 024 accepted the server/revision and safe-adapter foundation locally at
`1755803`; package 025 accepted web lifecycle adoption at `42c2fbb`. Final B2/native-editing UX
remains gated by the four unresolved 023 owner choices and hosted rollout is separately gated.
Package 026 accepted the first B4 foreground native-audio slice at `c30b3b1`; package 027 completed
foreground B4 navigation integration at `dc25938` with one authenticated-shell owner and a compact
player that preserves source, position and rate across repertoire and home. Background,
interruption, lock-screen and audio-route behavior remains B5 and hardware-gated. With B2/B3 still
blocked by the four unresolved 023 owner semantics and B5/A5 hardware postponed, package 028 accepted
the permanent-WebView source, route, native-owned refresh-token/access-lease, capability and failure
contract without product changes. Package 029 then accepted the shared framework-free
route/message/replay/redaction policy at `4289da4` under root and mobile pure tests. Package 030 then
accepted the dormant web adapter at `c7d09d3`: locked bootstrap/proof, memory-only bearer, renewal
freeze, synchronous clear, browser parity, nine-route shell suppression and navigation/capability
seams passed the 55-file/462-test root gate and production build. Package 031 accepted the native
challenge/state machine, route/external/back/theme shell at `0217ac8`; package 032 accepted the
password, clipboard, constrained image and ephemeral-file capabilities at `fa2e4b7`. Package 033
implemented the guarded composition at `d295c62` and proved both Release handshakes, every route and
the historical Android scenario set. **19 September checkpoint: 033/C1 is accepted locally.**
The repaired Android credential/session/sign-out, guarded plus normal Release checks, the bounded
guarded iOS feature/fault batch and the owner-operated iOS password change/restore pass on current
dependencies through product `69714b1`. Package 034 then accepted the fail-closed seven-event
notification/deep-link contract at `6883b3b`, removed assignment query drift and exposed stable
duplicate identity. Package 035 accepted the user-initiated permission and authenticated initial/live
tap consumer at `04319e3` under 36 suites/216 tests plus production JS export; native binary and
provider/device delivery were not run. Package 036 then fixed the separate native token lifecycle
as documentation and package 037 accepted its provider-neutral registration protocol at `b1d565f`.
Package 038 documentation-accepts the C3 feature/data/safety inventory: it preserves every current
chat capability and records the dated RLS/Realtime/cache/order blockers. Package 039 accepts the
bounded process-memory teardown repair at `7a6a78e`; package 040 accepts the pure shared read
contract at `2dfe6ab`; package 041 locally accepts the room-membership authority repair at
`cb4e7ec`; package 042 accepts reactions/polls/votes/stars room/actor authority at `c58f4da`.
Package 043 accepts server-time durable message-status authority at `1434464`. Core-message rules
are next, followed separately by client adoption, publication/private Realtime and native runtime. See
[033's final checkpoint](briefs/033-composed-permanent-webview-runtime.md#current-checkpoint--19-september-2026).
013–032's historical local acceptance,
004/010 open criteria and the postponed hardware pilot remain unchanged.
