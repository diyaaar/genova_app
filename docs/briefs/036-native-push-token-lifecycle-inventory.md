# 036 — Native push token lifecycle inventory

**Status / date / responsible writer:** IN PROGRESS / 2026-09-19 / primary agent

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

**Small implementation steps:**

1. Trace current web/native/DB/provider fields, authority, side effects and cleanup.
2. Record lifecycle invariants, state transitions, compatibility order and the smallest owner
   transport choice without silently choosing credentials/account custody.
3. Run document gates, self-review against C2, record limits and update concise indexes.

**Done definition:**

- [ ] Current browser schema/RPC/sender and native auth/permission ownership are fully reconciled.
- [ ] Registration, rotation, choir switch, permission refusal, sign-out and stale-token cleanup
      each have identity, effect, retry and failure behavior.
- [ ] The transition keeps current web rows/clients working and prevents mixed-provider dispatch.
- [ ] The provider choice names current primary-source trade-offs and the exact owner decision.
- [ ] Migration start check and guide delivery checks are evidenced.
- [ ] Local links/status/consistency and `git diff --check` pass; no runtime/output was created.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source and primary-document inventory | local repository + official Expo/Supabase docs | PASS | Browser-only row/RPC/VAPID sender and native no-token boundary confirmed. Expo documents device/Expo token acquisition and runtime rotation listener; Supabase documents authenticated user Edge calls. No external state accessed. |
| 2026-09-19 | Supabase changelog relevance scan | official `changelog.md` | PASS | Current breaking-change entries reviewed; none changes this document-only lifecycle inventory. No schema/API implementation claim. |
| 2026-09-19 | Resource preflight | local filesystem | PASS | 12,089,420 KiB free; no build/runtime/download planned; 10 GiB stop floor retained. |

**Delivery:** Pending. No product/schema/provider revision exists. The next step after acceptance is
the smallest local contract or schema preparation permitted by the selected transport and resource
floor; provider credentials, delivery and hardware remain separately gated.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Current browser and native ownership/format inventory is complete | yes | NOT RUN | pending document review | Must prove native data cannot enter the current untyped sender path. |
| Account/member/choir/installation/token lifecycle and negative transitions are explicit | yes | NOT RUN | pending document review | Includes rotation races, switch, sign-out, refusal and retry. |
| Backward-compatible migration and dispatch order is explicit | yes | NOT RUN | pending document review | Existing browser rows and old web clients must remain usable. |
| Native transport decision packet uses current primary sources and exposes owner choice | yes | NOT RUN | pending document review | Recommendation is not permission to create accounts, credentials or spending. |
| Link/status/diff/resource checks and self-review | yes | NOT RUN | pending document gate | Self-review is not independent review. |
| Product code, schema, Edge runtime, provider delivery, real recipient and hardware | N/A — document-only inventory | N/A | not executed | Remain required in later C2 briefs. |
