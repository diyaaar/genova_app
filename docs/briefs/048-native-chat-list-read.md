# 048 — Native chat room list and read flow

**Status / date / responsible writer:** ACCEPTED LOCALLY / 2026-09-20 / primary agent

**Purpose and user need:** Let an authenticated mobile member open Chat, see only the current
membership's rooms and read a stable, refreshable message history without retaining another tenant's
data or trusting Realtime payloads as authority.

**Delivery focus:** This is C3 order 4 from 038 and the first user-visible native chat slice. It
composes the accepted 040 read contract with a memory-only React Native gateway and list/room UI.
Realtime is only an invalidation signal: initial subscribe, reconnect and message changes cause a
fresh authorized snapshot. Text send, reactions/polls/status detail, typing/Presence, media upload
and room administration remain later slices.

**Starting evidence:** Product `3c563d1` contains the accepted shared read, membership, social,
status, mutation, text-send and private-room foundations through 047; records are at `028c957`.
`apps/mobile/src/chat/` currently has only a direct-import contract test, and the shell exposes no
Chat route. The room summary RPC and message RLS exist. Migration history publishes
`chat_messages`, but the dated index is only `(room_id, created_at desc)` while the accepted cursor
also orders by `id`. Official Supabase guidance says tables must be in `supabase_realtime`, events
are checked per subscriber, and DELETE cannot rely on RLS; this slice therefore consumes only
INSERT/UPDATE invalidations and always re-reads authoritative snapshots.

**Current work card:** Observable result: from the ready native shell, the current member can search
and refresh rooms, open one authorized room, page older messages and recover from reconnect without
seeing stale choir data. Next actions: (1) add the exact read index and memory gateway/source;
(2) compose accessible list/room UI and lifecycle invalidation; (3) run local DB, mobile/root and
bundle gates, clean owned outputs and record limits. Exit only when required local criteria pass or
a failed gate remains recorded.

**Resources:** Start snapshot: 21,407,308 KiB (~20.4 GiB) free; `.next` and coverage are absent and
`apps/mobile/.expo` is 28 KiB. Existing mobile dependencies are retained. Estimated additional peak:
up to 4 GiB for one task-owned PostgreSQL/Colima profile plus under 1 GiB for sequential tests and
Expo bundles. Use only `genova048`, dedicated `genova_048_test*` databases and generated `.next`,
coverage or `apps/mobile/.expo/bundle-check*`; stop and clean before crossing the 10 GiB floor. One
heavy process at a time. No new dependency download is planned.

**Allowed files / modules:**

- `supabase/migrations/*048*`, `supabase/rollback/048_*`, `supabase/tests/048_*` and
  `supabase/test-support/048_*` — exact stable read index, reversible local proof and cleanup.
- `apps/mobile/src/chat/` — memory gateway, Supabase source, list/read UI and focused tests.
- `apps/mobile/src/ui/AppRoot.tsx`, `apps/mobile/src/ui/ShellScreen.tsx` and their tests — compose the
  native route without changing permanent WebView ownership.
- This brief and, after acceptance, plan/MIGRATION/active-context/handoff status records.

**Sources / existing patterns:**

- [038](038-native-chat-feature-inventory.md), [040](040-shared-chat-read-contract.md),
  [041](041-chat-room-membership-authority.md), [046](046-private-room-realtime-authorization.md)
  and [047](047-durable-chat-status-web-adoption.md) — split, contracts and authorization limits.
- `lib/chat-read-contract.ts`, `lib/chat.ts`, `hooks/useChatRealtime.ts` — validated shapes, current
  queries and historical web behavior; the web hook is not copied as native authority.
- Mobile auth tenant-cache, repertoire gateway and screen patterns — scope invalidation, injection,
  loading/error/refresh and shell composition.
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes) — current
  publication, RLS, filtering, reconnect-invalidation and DELETE limits.

**Migration start check:**

- Read: `AGENTS.md`, handoff, active context, plan C3/resource controls, transition guide, work
  cycle, brief template, `MIGRATION.md`, 038/040–047, relevant mobile auth/shell/gateway patterns,
  chat source/schema migrations and current official Supabase Postgres Changes guidance.
- Boundary: Chat remains native-owned; server authorization remains the accepted RPC/RLS surface.
  Shared 040 models stay framework-free. Realtime payloads only request a full reload and never add
  a room/message directly. Permanent WebView routes and web UI remain unchanged.
- Preserve: current-member room list, DM title fallback, last-message/unread/hidden resurfacing,
  stable `(created_at,id)` pagination/dedup, deleted/edited/reply and unsupported-kind display,
  search, empty/error/manual refresh, reconnect snapshot and synchronous tenant teardown.
- Authority/writer: one primary writer. Local source, migration, isolated DB, tests, bundles and
  commits are authorized. No hosted query/migration, real account/data, provider, credential,
  deploy, push, CI, hardware, distribution or publication.
- Required proof: exact index forward/down/re-forward and order/cursor matrix; gateway malformed,
  stale-scope, inaccessible/revoked-room, duplicate/out-of-order/reconnect behavior; rendered native
  list/read/loading/empty/error/search/page/back/teardown flows; mobile and root gates; sequential
  iOS/Android Expo bundles; exact cleanup and disk recheck. The bundles are not simulator/device
  evidence. Rollback is the DB down file plus the product commit.

**Out of scope:**

- Text/reply/link send, offline persistence, edit/delete/hide, stars/reactions/polls/status detail,
  typing, Presence, media/files/stickers, DM/group creation or member/room administration.
- Publishing `chat_room_members` DELETE events or treating delete payloads as authorization. A
  manual/foreground/reconnect refresh closes revoked access from a fresh RPC/query result.
- Persistent chat cache, notification deep-link addition, new dependencies, web visual changes,
  hosted schema application, real socket claim, simulator/hardware acceptance or store release.

**Risk / authority / rollback:** A stale asynchronous read could paint another choir, raw Realtime
could bypass validation, and a cursor with timestamp alone could skip equal-time messages. Bind all
work to account+choir+member, invalidate in-flight generations on clear/switch, parse every row with
040 and reload after every signal. Refuse opening a room absent from a fresh authorized list. The
new index is additive and has an exact local down path; app rollback is the product commit. If two
approaches fail, stop the heavy runtime and reassess before another allocation.

**Small implementation steps:**

1. Add and locally roundtrip the stable read index; implement validated memory-only source/gateway.
2. Compose accessible room list and read screens with snapshot invalidation, paging and teardown.
3. Run focused/full/bundle gates, self-review semantics and diff, clean exact outputs and update the
   acceptance/index records in a separate documentation commit.

**Done definition:**

- [x] Ready-shell Chat opens an authorized searchable list with loading, empty, error and refresh.
- [x] One listed room opens chronological messages, visible compatibility fallbacks and stable older
      paging; inaccessible/revoked room returns safely to the list.
- [x] Realtime INSERT/UPDATE and reconnect are invalidation-only; fresh snapshots deduplicate/order
      results, offline state is visible and later refresh recovers.
- [x] Choir switch/sign-out/unmount synchronously clear memory and invalidate late reads.
- [x] Exact index roundtrip, focused tests, mobile `npx tsc --noEmit && npm test`, root `pnpm check`
      and sequential iOS/Android Expo bundles pass; outputs are removed and >=10 GiB remains.
- [x] Start/delivery controls, self-review, external NOT RUN boundaries and concise records pass.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-20 | Source/ownership/resource preflight | local product `3c563d1`, records `028c957` | PASS | Only unrelated CLI marker is dirty; 21,407,308 KiB free. Shared parser and native shell seams exist; no native gateway/UI. Existing publication covers messages, not room/member rows; DELETE is deliberately not used. No runtime/build started. |
| 2026-09-20 | Early focused implementation gates and causal reassessment | local mobile Jest/TypeScript | FAIL | Initial command-path/type issues and later async renderer/mock sequencing failures were corrected without exclusions. After two unsuccessful approaches the work stopped expanding, reviewed lifecycle/order causes, kept one gateway/screen outcome and added serialized snapshots plus stale-scope guards before continuing. No failed result is promoted to evidence. |
| 2026-09-20 | Final focused gate | local product `dc86d5d`, mobile TypeScript/Jest | PASS | TypeScript and five focused files / 31 tests pass. The matrix covers malformed rows, hidden resurfacing, DM titles, stable paging/dedup/order, inaccessible room, serialized reconnect snapshots, late callback refusal, scope clear, server-time RPC shape, invalidation-only Realtime and rendered list/read/search/empty/error/offline/refresh/revocation behavior. |
| 2026-09-20 | Stable index/RPC forward, down and re-forward | task-owned `genova048` Colima; loopback PostgreSQL 17; synthetic fixture only | PASS | `048_chat_read_order_runner.sh` refused missing 046 state before changes, then passed exact index/cursor order, authenticated server-time read mark, nonmember refusal, down restoration, re-forward and source/target removal. PostgreSQL warned that local `wal_level` cannot stream logical changes; no socket claim is made. |
| 2026-09-20 | Full mobile gate | local product `dc86d5d` | PASS | `npx tsc --noEmit && npm test -- --runInBand`: 40 suites / 232 tests. Existing SafeAreaView and Node punycode deprecation warnings remain non-failing and were not suppressed. |
| 2026-09-20 | Root compatibility gate | local product `dc86d5d` | PASS | Final `pnpm check`: lint/typecheck, 65 test files / 601 tests with coverage, service-worker syntax and Next production build pass. |
| 2026-09-20 | Sequential bundle resolution | local Expo export, product `dc86d5d` | PASS | Final iOS export resolves 1,428 modules / 4.2 MB; after its exact removal, Android resolves 1,428 modules / 4.3 MB. These are JavaScript bundle checks, not simulator/device execution. |
| 2026-09-20 | Semantics/lifecycle/accessibility/diff review | product `dc86d5d` | PASS | Self-review found and repaired two acceptance gaps: failed refresh now retains the last authorized snapshot, and stopped same-scope subscriptions reject late callbacks; list/room connection state is separate and the shell scope is stable. Realtime payloads remain untrusted, room access refreshes before message reads, server derives read actor/time and all controls have labels/roles. Self-review is not independent review. |
| 2026-09-20 | Exact cleanup/resource recheck | local filesystem | PASS | PostgreSQL container and `genova048` profile/data, disposable databases, `.next`, coverage and both bundle directories were removed. 21,364,736 KiB (~20.4 GiB) free; sources/lockfiles/shared caches retained and the unrelated CLI marker remains unstaged. |
| 2026-09-20 | Documentation consistency gate | five changed Markdown files | PASS | New local targets exist, stale “native list/read next” markers are absent, 004/010 and external NOT RUN boundaries remain explicit, and `git diff --check` passes. |

**Delivery:** Planning `3810d87`; product/schema/tests `dc86d5d`; this acceptance record follows.
Revert `dc86d5d` for the app/schema/test rollback; the migration also has the guarded local down
file. Next ready C3 outcome is a separately briefed native text/reply/link send-and-retry slice;
social, Presence, media and room administration remain later work.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Stable read index and cursor/order roundtrip | yes | PASS | 2026-09-20, `dc86d5d`, isolated PostgreSQL 17 runner | Missing prerequisite refuses without residue; forward/down/re-forward, same-time `(created_at,id)` order, server-time RPC authority, data/index restoration and disposable DB cleanup pass. Hosted apply remains separate. |
| Validated scoped gateway and Realtime snapshot recovery | yes | PASS | 2026-09-20, focused gateway/adapter tests | Raw INSERT/UPDATE events and reconnect only invalidate; every snapshot is parsed. Serialization prevents older overwrite; stale scope, stopped callback and revoked/inaccessible room refuse. No real socket ran. |
| Native list/read UI and failure/lifecycle behavior | yes | PASS | 2026-09-20, React Native renderer tests | Search/list/read/page/back/loading/empty/error/offline/retry, compatibility fallbacks, retained snapshots, revocation and injected tenant teardown pass. No send control or persisted chat cache was added. |
| Mobile/root compatibility and iOS/Android bundle resolution | yes | PASS | 2026-09-20, `dc86d5d`, local gates | Mobile 40/232, root 65/601/build and sequential 1,428-module exports pass. Bundle output is not simulator/device/runtime evidence. |
| Diff/API/accessibility review, cleanup and records | yes | PASS | 2026-09-20, local self-review | Approved files only; controls have roles/labels, refresh failure retains trusted content, all exact outputs/runtime data are removed and ~20.4 GiB remains. Self-review is not independent review. |
| Hosted DB/socket, real account/data, simulator/hardware/provider/deploy/release | no — separately approved later gates | NOT RUN | no external authority | Blocks deployed/runtime/device claims, not bounded local implementation evidence. |
