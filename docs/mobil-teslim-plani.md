# Genova — long-term mobile delivery plan and execution directive

Updated 2026-09-09 after local 021 mobile service-lifecycle acceptance; originally prepared under
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
| M0: local read foundation | Catalogue, ticket and reader units compose without tenant leakage | **COMPLETE locally:** 013–021; actual local Auth/RLS/Edge/Storage and iOS/Android protected-file lifecycle passed |
| M1: operational read pilot | Approved chef/chorist accounts read protected content on approved iOS/Android hardware; refusal, cleanup and relaunch work | NOT RUN; hardware postponed, new Edge path not deployed |
| M2: rehearsal tools | Compatible annotation writes, recoverable sync, useful audio and stable navigation | Future packages; no implementation acceptance claimed |
| M3: wider mobile product | Permanent WebView integration plus native chat, assignments and home, with feature preservation | Future packages; store feature selection follows pilot findings |
| M4: release candidate | Multi-choir limits, data lifecycle, provider exit, security/accessibility and distribution requirements pass | Future packages; no current store eligibility claim |
| M5: released and operable | Approved beta/public release verified at actual destination; support and recovery exercised | NOT RUN; publication and spending remain separately gated |

Decision #21 keeps the pilot ahead of store limits and major infrastructure work. The owner's
8 September direction permits independent local work while user/device tests wait. This does
not accept M1 or allow a blocked release to advance. No feature is silently removed: each feature
inventory must map existing behavior to preserved/shared/adapted/deferred, its owner and evidence.
Deferral from a release candidate needs an explicit owner decision and remains visible.

## Baseline and evidence ownership

Start from [agent-handoff](agent-handoff.md), then verify the checkout. At this update:
`main / 404a9ee`, recorded remote `a13f696`, with an unrelated unstaged CLI cache. These are
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

Package keys below express dependencies, not preassigned brief numbers. Packages 018 and 021
closed A1 and A2 locally; open each next implementation brief from the current checkout and
[brief template](briefs/_TEMPLATE.md). A row with several user outcomes must be split into
sequential briefs. Source paths are starting points, not authority for a broad rewrite.

### A — Turn the existing read implementation into runtime evidence

| Package / dependency | Bounded outcome and relevant sources | Acceptance, including failure cases | Authority / stop |
|---|---|---|---|
| A1 / 015–017 local evidence | **018 COMPLETE locally:** protected-file runtime acceptance. `supabase/functions/repertoire-file/`, shared protected-file client, `supabase/test-support/` | Actual Deno entrypoint and HTTP route passed with synthetic PDF checksum; JWT/current-choir/RLS composition; bad/expired ticket, denied choir, HEAD/206/416, MIME and upstream failure; fixture/source baseline unchanged | Code/test `0b3df6e`; exact evidence and local-only limits in [018](briefs/018-protected-file-runtime-acceptance.md). Deploy, Drive, real accounts and hardware remain unverified |
| A2 / A1 | **COMPLETE locally:** [019](briefs/019-ios-native-pdf-render-acceptance.md), [020](briefs/020-android-native-pdf-render-acceptance.md) and [021](briefs/021-mobile-protected-file-runtime-acceptance.md); final service lifecycle at `404a9ee`. `apps/mobile/src/repertoire/`, `apps/mobile/src/ui/`, native configuration | Actual local Auth/RPC/RLS/Edge/private Storage composed with both Release apps: first 401, UI retry, fresh ticket, exact 40-page download/render, reader exit/reopen, tenant clear, B-choir 403/empty catalogue and sign-out session/preference cleanup passed | Local/synthetic simulator+emulator only. M1, deploy, Drive, real accounts, device durability and hardware remain unverified |
| A3 / A1–A2 | Web compatibility with the new file route. `hooks/useProtectedDriveFileUrl.ts`, `lib/drive-file-url.ts`, `components/repertuvar/` | Local browser PDF, existing audio and offline consumers; refresh/expiry, wrong choir, sign-out and failed download. Verify existing behavior, not pixel equality | Local browser + isolated service. No live route call or remote CI without authority |
| A4 / A1–A3 | Controlled service/client release and read pilot readiness; release brief based on 015 and 017 | Exact outgoing commits and hosting triggers; Edge deployed/configured before calling web; approved synthetic fixture roles; service and actual domain checks; rollback rehearsal before release | Prepare locally; external execution gated. Failed deployment blocks client rollout; hardware pilot remains separate |
| A5 / A4 + explicit device authority | M1 device pilot; use 017's checklist and 004's remaining rows | Chef + chorist on both platforms, real rendering/permissions/network/relaunch/secure storage; error and isolation cases with build/device evidence | Postponed. Do not close 004 with emulator evidence or force this as the next user action |

A1–A3 are the immediate local critical path. After they pass, independent local B work may
continue if A4/A5 await approval, with M1 visibly pending. A2 cannot replace A1's real local
service boundary with a fake and call the integration complete. If local Auth/RLS cannot be
provisioned, preserve the failing/unrun layer and solve that bounded environment issue first.

### B — Rehearsal tools without breaking the shared contract

| Package / dependency | Bounded outcome and relevant sources | Acceptance, including failure cases | Authority / stop |
|---|---|---|---|
| B1 / A1–A3 | Annotation-write contract and role/layer inventory. `lib/repertuvar/annotation-types.ts`, `lib/repertuvar/annotations.ts`, native annotation source | Existing personal/shared visibility, ownership, edit/delete and version behavior mapped; unknown/future fields are preserved or writing is refused; no silent destructive parse-and-save | Local design; owner resolves new product semantics before dependent implementation |
| B2 / B1 | One native annotation editing/save path, then additional tools in separate briefs. Native reader/overlay, shared schema and authorized data path | Web writes → native reads and native writes → web reads; coordinates/page indexing/undo/redo; denied writes; stale session/choir switch; interrupted save visible; no dropped unknown content | Local isolated writes only; shared-schema changes require old-client compatibility, not a parallel schema |
| B3 / B2 | Recoverable annotation sync/offline queue under an explicit conflict contract | Retry idempotence; two clients editing; reconnect and process restart; revoked permission; tenant-scoped queue and sign-out disposition; no silent last-writer data loss | Conflict policy and unsaved-work UX decided before implementation. No hardware durability claim from fakes |
| B4 / A3, read contract | Native audio playback/seek, then mini-player integration. `lib/shared-audio.ts`, repertoire consumers, `apps/mobile/` | Actual local audio bytes, seek/range, expiry renewal, cancellation; one active playback owner; switch/sign-out stops and clears; corrupt/unsupported format states | Local first. MIDI/MusicXML support is inventoried separately; decision #14 active-content filter stays |
| B5 / B2–B4 + device authority | Stylus/gesture and audio lifecycle acceptance | Pressure/palm rejection, layout alignment, long-score memory and latency; interruptions/background/lock-screen and permission denial on real devices; measured before/after for performance claims | Hardware/provider capability and background behavior remain NOT RUN until actual execution |

Persistent offline library/user controls are a separate brief after B3/B4: explicit download,
storage budget/eviction, stale authorization policy, version/checksum, cancellation and cleanup.
Do not assume permission revocation can be enforced while a device is offline; decide and record
that product/security boundary before shipping. Offline support is not implied by a cache.

### C — Complete the mobile experience in small user flows

| Package / dependency | Bounded outcome and relevant sources | Acceptance, including failure cases | Authority / stop |
|---|---|---|---|
| C1 / stable A read flow | Shell navigation/theme and permanent WebView bridge, separate briefs. `apps/mobile/src/ui/`, `MIGRATION.md`, existing auth code | Correct native/WebView route ownership; shared session and active choir; logout everywhere; external URL allowlist, back navigation, accessibility, attachments and expired-session recovery | No native rewrites of announcements, chorists, profile/change requests or attendance; no token in URLs/logs |
| C2 / C1 | Notification/deep-link contract, then native delivery. `lib/server/push-notifications.ts`, current subscribe/unsubscribe routes | Correct account/device token lifecycle; permission refusal; foreground/background tap routing; destination rechecks tenant/role; unsubscribe/sign-out; duplicate delivery handling | Local payload tests first. Provider keys, push delivery and real recipients separately authorized |
| C3 / C1 + chat inventory | Native chat, split list/read → send/retry → media/remaining features. `lib/chat.ts`, `components/chat/`, native adapters | Preserve rooms/memberships, messages, receipts/reactions/polls and other inventoried features; RLS on every read/write; realtime reconnect/order/dedup; offline retry; inaccessible room and choir switch | Inventory before scope. Dart UI and Socket.IO from the old reference app are not reusable RN/Supabase code |
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

## Agent execution loop

Use the existing [work cycle](ai-calisma-duzeni.md); this section defines Genova's task selection
and evidence transitions, not a second agent framework or scheduler.

1. **Orient:** read AGENTS → handoff → guide/work cycle → six short memory indexes → current
   brief, decisions and relevant code. Verify branch, HEAD, dirty ownership, tools and current
   permission. Old Linux/macOS limitations are observations, not universal commands.
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
8. **Choose the next iteration:** continue only within active user authorization and a ready brief.
   A blocked task stays visible. Select an independent allowed package only if its dependency is
   genuinely absent; do not bypass A1–A3 by calling a dependent feature independent.
9. **Checkpoint:** before context/agent handoff, commit coherent owned work, record unfinished
   ownership, exact next action, tests/limits and pending approvals. The receiving agent re-verifies.
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
those iterations. **Next bounded implementation task: A3 web compatibility with the new file
route.** A2 closed locally in [021](briefs/021-mobile-protected-file-runtime-acceptance.md) at
code/test commit `404a9ee`, building on [019](briefs/019-ios-native-pdf-render-acceptance.md) and
[020](briefs/020-android-native-pdf-render-acceptance.md). The A3 brief must verify existing PDF,
audio and offline consumers plus refresh/expiry, wrong-choir, sign-out and failed-download behavior
against an isolated service. 013–021's historical local acceptance, 004/010 open criteria and the
postponed hardware pilot remain unchanged.
