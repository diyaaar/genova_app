# 046 — Private room Realtime authorization contract

**Status / date / responsible writer:** ACCEPTED LOCALLY / 2026-09-19 / primary agent

**Purpose and user need:** Prevent a browser that is not a current room member from joining chat
Broadcast/Presence topics, while keeping the current web room channel compatible with the shared
chat tables that Realtime actually consumes.

**Delivery focus:** Complete one bounded part of C3's Realtime foundation: a reversible
`realtime.messages` room-membership policy, deterministic publication membership for the three
already-authorized room event tables, explicit current JWT setup and `private: true` adoption on the
web room channel. Global room-list Realtime, trusted actor identity for ephemeral payloads,
reconnect snapshot recovery, status client adoption and React Native runtime remain separate work.

**Starting evidence:** Product `361ab7c` / records `0352dbc` accept 045. The room hook joins
`chat:<roomId>` without `private: true`, does not explicitly refresh the Realtime JWT before join,
and trusts caller-supplied typing/read-receipt member IDs. No repository migration manages policies
on `realtime.messages`. The local PostgreSQL 17 source has neither `realtime.messages` nor any
publication, so it cannot constitute a Supabase Realtime runtime; a task-owned fixture can prove
only SQL policy/publication behavior. The global list hook and delete-event limitations must not be
silently promoted into this room package. The unrelated `supabase/.temp/cli-latest` marker remains
unstaged.

**Current work card:** Observable result: a current room member can pass local read/write policy
checks for Broadcast/Presence on exactly `chat:<room UUID>`, while a same-choir nonmember,
cross-choir member, revoked member, anonymous role and malformed topic fail closed; the web room
hook sets the current guarded token before creating the stable private channel. Next actions:
(1) add reversible policy/publication SQL and its isolated matrix; (2) adopt/test explicit auth plus
private room config; (3) run focused/root gates, review, clean and record. Exit when every local
required row passes without claiming an actual socket or hosted setting.

**Resources:** 21,282,400 KiB (~20.3 GiB) free. Reuse loopback PostgreSQL 17 and
`genova_008_test_restore` with one disposable `genova_046_test_restore`; create only a minimal
task-owned Realtime schema/publication fixture inside that target because the source is not a full
Supabase runtime. No download, VM, native build or second checkout. Run one root build at a time;
remove the target and exact generated outputs and preserve the 10 GiB floor.

**Allowed files / modules:**

- `supabase/migrations/20260919221500_private_chat_realtime_046.sql`, matching down/test/runner.
- `lib/realtime.ts`, `lib/supabase.ts`, `hooks/useChatRealtime.ts` and focused tests for stable room
  topics, guarded JWT-before-join ordering, private config, cancellation and refusal.
- This brief; final plan, `MIGRATION.md`, active-context and handoff records after local acceptance.

**Sources / existing patterns:**

- [038 inventory](038-native-chat-feature-inventory.md#data-authority-and-runtime-map),
  [041](041-chat-room-membership-authority.md) and current room hook/auth lifecycle.
- [Supabase Realtime authorization](https://supabase.com/docs/guides/realtime/authorization):
  Broadcast/Presence access is expressed as `realtime.messages` RLS, `private: true` is required,
  policy results are cached for a connection and public access is a separate project setting.
- [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes): tables
  require `supabase_realtime` publication membership; delete old rows and RLS have distinct limits.

**Migration start check:**

- Read: `AGENTS.md`, handoff, active context, C3/resource controls, transition guide, work cycle,
  template, 038/041/045, current hook/Auth/data source and current official Realtime guidance.
- Boundary: shared Supabase policy/publication contract plus current web **room** adoption. Chat
  stays native-owned, and no Next API route or native UI is added.
- Preserve: message/reaction Postgres Changes handlers, typing/read-receipt/Presence display,
  browser and guarded embedded auth modes, channel cleanup and all durable chat authority from
  041–045. Ephemeral payload member IDs remain untrusted UX hints, not durable identity evidence.
- Authority/writer: one primary writer; scoped local SQL/code/tests/commits and exact cleanup are
  authorized. No hosted query/migration, Realtime setting change, deploy, CI, real account/data,
  credentials, provider, hardware, publication application or spending.
- Required proof: two-room/two-choir/member/nonmember/revocation/malformed-topic policy matrix;
  Broadcast and Presence read/write only; publication prior-state preservation and exact down;
  browser/embedded guarded auth-before-private-join contract; focused/root gates and cleanup.
- Unresolved boundary: the source clone lacks Supabase Realtime. The fixture is schema-contract
  evidence only. Actual WebSocket authorization, project “Allow public access”, JWT refresh on a
  live connection and hosted publication contents remain NOT RUN and block release, not this local
  contract acceptance.

**Out of scope:**

- The randomized `chat:global` room-list channel, `chat_rooms`/`chat_room_members` publication,
  membership-delete delivery or list resync. Delete events cannot be treated as ordinary RLS rows.
- Replacing caller-supplied typing/read-receipt/Presence identity, adopting durable status RPCs,
  reconnect catch-up/order/dedup or moving database changes to Broadcast triggers.
- React Native list/read UI, native socket/device proof, hosted settings/migration, deploy or push.
- Creating or changing Supabase-owned `realtime` tables/functions in the product migration; the
  local runner's minimal fixture is test support only.

**Risk / authority / rollback:** An overbroad topic rule leaks ephemeral room activity; a stale JWT
or cached authorization can preserve access until refresh/reconnect. The helper accepts only exact
room UUID topics and derives active member/choir through existing server authority. Policies cover
only Broadcast/Presence and no payload identity claim. Publication changes record prior membership
so down removes only tables added by 046. Product migration must refuse when Supabase-owned
Realtime prerequisites/publication are absent; the runner supplies them only after cloning. Revert
the product commit plus scoped down locally. Hosted down/application remains separately reviewed
and approved.

**Small implementation steps:**

1. Add the guarded helper, two RLS policies, publication-state record and exact roundtrip matrix.
2. Set the current browser/embedded token before creating the stable private room channel; test
   ordering, failure/cancellation and cleanup without opening a socket.
3. Run focused SQL/web and root gates; inspect security/data/lifecycle diff, clean and record.

**Done definition:**

- [x] Exact room-member Broadcast/Presence read/write passes; nonmember, cross-tenant, revoked,
      anonymous, malformed and unsupported-extension cases fail closed.
- [x] `chat_messages`, `chat_reactions` and `chat_message_status` publication membership is
      deterministic and down restores the fixture's exact prior publication/policy/API state.
- [x] Web room setup authenticates before channel creation, uses `private: true` and a stable exact
      room topic, and creates no channel after auth failure or effect cancellation.
- [x] Focused tests and root `pnpm check` pass; self-review, cleanup, disk/docs and live boundaries
      are recorded without calling the fixture a Realtime runtime.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source/resource/ownership preflight | local product `361ab7c`, records `0352dbc` | PASS | Only unrelated CLI marker is dirty; 21,282,400 KiB free. Room channel is public in source. Local PostgreSQL 17.11 reports `realtime.messages=absent`, publications=`none`; no runtime/build started. |
| 2026-09-19 | Official Realtime contract review | current Supabase documentation | PASS | Private Broadcast/Presence requires `realtime.messages` policies plus `private: true`; publication is required for Postgres Changes. Authorization caching and delete/RLS limits are retained as open boundaries. |
| 2026-09-19 | Guarded forward/down/re-forward runner | loopback PostgreSQL 17, disposable clone | PASS | Product migration first refused the non-Realtime clone without changes. With the runner-only contract fixture, member/two-room/two-choir/nonmember/revoked/anon/malformed/extension matrix passed twice; down restored exact policy/publication/API/data state, source stayed unchanged and target was removed. The local `wal_level` warning confirms this was not a logical-replication/socket runtime. |
| 2026-09-19 | Focused web gates | local Vitest/lint/typecheck | PASS | Three files / 14 tests pass. Stable UUID topic, token-before-join, ordinary and guarded embedded token selection, missing-session refusal, `private: true`, auth failure and cancellation are covered; focused lint and root typecheck pass. No socket was opened. |
| 2026-09-19 | Unsafe runner target guard | local shell | PASS | The first wrapper used zsh's reserved `status` variable and stopped before the runner result was printed; its exact temporary output was removed. The corrected wrapper confirms `PGDATABASE=postgres` refuses with status 2 before database action. |
| 2026-09-19 | Security/data/lifecycle/diff review | migration and room hook at `bed8032` | PASS | Exact canonical room topics only; active actor/choir/room membership is server-derived, policies cover only Broadcast/Presence, prior publication state is retained, and client creates no channel before guarded JWT setup. Caller-supplied ephemeral identity, cached authorization, global list/delete delivery and reconnect recovery remain explicit. Self-review only. |
| 2026-09-19 | Final root `pnpm check` | local product `bed8032` | PASS | Lint/typecheck, 62 test files/591 tests, coverage, service-worker syntax and Next production build pass. |
| 2026-09-19 | Cleanup/resource recheck | local filesystem/PostgreSQL | PASS | `.next` 472,996 KiB and coverage 332 KiB removed; disposable DB absent; 21,677,152 KiB (~20.7 GiB) free. Unrelated CLI marker remains unstaged. |
| 2026-09-19 | Documentation consistency gate | five changed Markdown files | PASS | Local links/anchors resolve with zero missing targets, stale 046 pending/next-private-room markers are absent and `git diff --check` passes. |

**Delivery:** Planning `14fa7a8`; product/test `bed8032`; this acceptance record follows.
Rollback is the scoped down plus product revert locally. Hosted application/down remains separately
reviewed and approved. Next ready package: adopt 043's durable delivered/read RPC in the current web
room, while global-list Realtime, reconnect recovery and native list/read remain separate.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Exact room-topic policy and refusal matrix | yes | PASS | 2026-09-19, `bed8032`, disposable PostgreSQL 17 fixture | Member Broadcast/Presence read/write passes; other-room/choir, nonmember, revoked, anon, malformed and unsupported extension refuse. Fixture is not a Realtime server join. |
| Publication prior-state preservation and forward/down/re-forward | yes | PASS | 2026-09-19, `bed8032`, guarded runner | Three event tables present forward; down restores the one prior fixture table exactly; source/target lifecycle passes. Product migration creates no Supabase-owned Realtime object. |
| Guarded JWT-before-private-room-join, failure and cancellation | yes | PASS | 2026-09-19, focused 3 files/14 tests | Ordinary/embedded token reaches Realtime before stable private channel creation; missing token, rejected auth and cancelled effect create no channel. No network/socket was used. |
| Root compatibility, diff review and cleanup | yes | PASS | 2026-09-19, product `bed8032`, local root | 62 files/591 tests/build pass; self-review complete; target/build outputs removed and ~20.7 GiB free. |
| Hosted migration/settings and real WebSocket authorization | no — separately approved release/runtime gate | NOT RUN | no hosted access authorized | Blocks deployed/private-Realtime and native-runtime claims, not this bounded local contract. |
