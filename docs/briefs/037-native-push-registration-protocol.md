# 037 — Native push registration protocol

**Status / date / responsible writer:** ACCEPTED LOCALLY / 2026-09-19 / primary agent

**Purpose and user need:** Add one framework-free, provider-neutral wire contract that lets the
future native client and Edge registration path exchange only validated registration/revocation
data without carrying account, choir or credential authority.

**Delivery focus:** This C2 slice turns 036's accepted lifecycle inventory into executable local
validation. It covers versioned register/revoke/receipt shapes, transport/platform compatibility,
monotonic generations, stale-scope comparison and secret-safe diagnostic summaries. It never
acquires a device token, calls a backend or selects Expo versus direct FCM/APNs.

**Starting evidence:** 036 is documentation-accepted at record `1456495`. The current mobile app
has no token getter/listener or backend registration, and there is no native schema/Edge path.
The worktree contains only the unrelated `supabase/.temp/cli-latest` modification. Existing 034
shows the repository pattern for a framework-free, fail-closed shared contract and coverage gate.

**Current work card:** Observable result: untrusted native push registration messages either
normalize to the exact v1 contract or fail with a non-sensitive reason, while logging helpers can
never return token, revocation secret, account or tenant identifiers. Next actions: (1) implement
the contract and negative matrix; (2) run focused and full root gates; (3) review, clean, record
and select the next ready C2 slice. Exit when every required local row passes and no runtime/
provider/schema claim is made.

**Resources:** Start snapshot: 12,078,044 KiB (~11.5 GiB) free; `.next` and coverage are absent,
and no native/DB runtime is retained. No dependency or download is planned. The known root gate
generated about 461 MiB `.next`; run only one heavy process, monitor the 10 GiB floor, then remove
exact `.next` and coverage outputs. Do not allocate a simulator, native build or local database.

**Allowed files / modules:**

- `lib/native-push-registration.ts` — framework-free v1 messages, parsing, generation/scope and
  redacted diagnostic surface.
- `lib/native-push-registration.test.ts` — valid, hostile, malformed, stale and redaction matrix.
- `vitest.config.ts` — include this critical contract in the existing root coverage gate.
- This brief and, after acceptance, `docs/mobil-teslim-plani.md`, `MIGRATION.md`,
  `memory-bank/activeContext.md`, `docs/agent-handoff.md` — bounded evidence/status only.

**Sources / existing patterns:**

- [036](036-native-push-token-lifecycle-inventory.md) — lifecycle, compatibility and provider
  boundary authority.
- `lib/notification-deep-link.ts` and tests — framework-free untrusted-input/refusal pattern.
- `lib/mobile-webview-bridge.ts` — versioned protocol and credential-field refusal pattern.
- [Expo Notifications SDK](https://docs.expo.dev/versions/latest/sdk/notifications/) — token types
  and rotation listener limit; no provider API is called here.
- Supabase security/RLS and Postgres schema guidance reviewed in 036 — server derives account and
  tenant; the wire contract must not accept them.

**Migration start check:**

- Read: `AGENTS.md`, handoff, active context, plan C2/execution controls, 036, migration guide,
  work cycle, shared contract patterns, current native auth/notification sources and official
  Expo/Supabase references already refreshed for 036.
- Boundary: shared pure TypeScript only. Native will later own token acquisition; Edge/DB will
  later own authenticated account/member/choir derivation. No UI, WebView, sender or persistence.
- Preserve: browser Web Push path; 034 event/deep-link contract; 035 explicit permission/tap flow;
  native-only refresh token; server-confirmed active choir; 036 separate relation/transport choice.
- Authority/writer: one primary writer; local code/tests/commits are authorized. No DB/provider/
  account/credential/deploy/CI/hardware action. Preserve the unrelated temp marker unstaged.
- Required proof: focused Vitest, lint/typecheck and root `pnpm check`; diff/security/redaction
  review; exact generated-output cleanup and disk floor. Revert the product commit to roll back.

**Out of scope:**

- Token acquisition/listener, permission UI changes, Expo project ID, installation/secret storage,
  mobile coordinator, network gateway, retry queue or sign-out integration.
- Migration/RPC/Edge/sender/provider code, local/hosted Supabase, credentials, receipts, sends,
  recipients, native binary/runtime, hardware, remote CI, deployment, push or spending.
- Exact provider-token format inference, lease duration or choosing Expo versus direct FCM/APNs.

**Risk / authority / rollback:** The contract could accidentally accept caller-owned user/choir
fields, alter opaque token bytes, allow an older delayed generation, mix APNs with Android/FCM
with iOS, or leak sensitive material through diagnostics. V1 uses exact keys, fixed application,
explicit transport/platform/environment, bounded opaque secrets and safe integers; account/choir/
member/access/refresh fields are not part of any accepted shape. Rollback is code-only.

**Small implementation steps:**

1. Define v1 register, revoke and receipt parsers plus current-scope/generation helpers.
2. Add positive/negative/redaction tests and include the module in coverage.
3. Run focused/full gates, self-review, clean exact outputs and record limits.

**Done definition:**

- [x] Valid register/revoke/receipt messages normalize without modifying opaque token/secret bytes.
- [x] Unknown/version/field/type/UUID/generation/transport-platform/application/environment and
      overlong/control/whitespace-bearing sensitive values fail closed.
- [x] User/member/choir/access/refresh or arbitrary extra fields cannot cross the wire contract.
- [x] Generation/scope helpers reject stale auth/choir/installation work and overflow.
- [x] Diagnostic summaries contain no token, revocation secret, account, choir, member or
      installation identifier.
- [x] Focused tests and root `pnpm check` pass; diff/records/cleanup/disk floor pass.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Contract-source/resource preflight | local repository at `1456495` | PASS | 036 and existing shared protocol patterns read; 12,078,044 KiB free; no dependency/runtime planned. |
| 2026-09-19 | First focused contract run | local uncommitted product diff | PASS | 1 file / 51 tests. Register/revoke/receipt, transports, hostile fields, scope/generation and diagnostic redaction passed. |
| 2026-09-19 | Product self-review and inherited-field hardening | local uncommitted product diff | PASS | Required keys now use own-property checks so an attacker-controlled prototype cannot supply protocol fields; one regression was added. No acceptance criterion was weakened. Self-review is not independent review. |
| 2026-09-19 | Focused test with global coverage configuration | local corrected diff | FAIL | The 52 contract tests passed and the new module reached 92.62% statements, 92.85% branches, 100% functions/lines, but the one-file run left all other configured critical modules at zero and therefore failed global thresholds. The same partial-coverage approach was not repeated; the required full gate followed. |
| 2026-09-19 | Focused lint and root typecheck | local corrected diff | PASS | New contract/test/config lint passed with zero warnings; root TypeScript passed. |
| 2026-09-19 | `pnpm check` | local content committed as `b1d565f` | PASS | Lint/typecheck; 57 test files / 540 tests; coverage 90.98% statements, 84.98% branches, 97.80% functions and 96.79% lines; Service Worker syntax and Next production build passed. Local code proof only. |
| 2026-09-19 | Network/provider/secret surface review | product commit `b1d565f` | PASS | No fetch, Supabase client, token getter/listener, console logging, service key or provider call exists. Exact v1 keys refuse caller identity/credential fields; diagnostic output omits all sensitive/identity values. |
| 2026-09-19 | Generated-output cleanup and disk check | local filesystem | PASS | Removed exact task-owned `.next` (472,560 KiB) and coverage (332 KiB); 12,092,896 KiB (~11.5 GiB) free. No dependency/native/DB runtime created; unrelated temp marker remains unstaged. |
| 2026-09-19 | Acceptance-record consistency gate | five changed Markdown files | PASS | 102 local links, zero missing; no stale 037 pending marker; owned outputs absent and `git diff --check` passed. |

**Delivery:** Planning commit `f330b5d`; product commit `b1d565f`; this acceptance record follows.
Rollback `b1d565f` to remove the pure protocol and coverage entry. Schema/Edge/mobile/provider work
remains outside this slice. The next C2 schema/runtime brief is not resource-ready near the 10 GiB
floor and the transport adapter awaits the 036 owner choice; select another dependency-ready local
package rather than manufacturing DB/provider evidence.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Exact valid v1 register/revoke/receipt normalization | yes | PASS | 2026-09-19, `b1d565f`, focused/full tests | Expo iOS/Android, APNs/iOS and FCM/Android accepted; UUIDs normalize while opaque token/secret values remain exact. |
| Malformed/hostile/unknown/oversized input fails closed without identity authority | yes | PASS | 2026-09-19, `b1d565f`, negative matrix | Version/action/keys/types/UUID/generation/pair/application/environment/token/secret/time and inherited fields refuse without fallback. User/member/choir/access/refresh and arbitrary extras cannot cross. |
| Generation and current-scope stale-work guards | yes | PASS | 2026-09-19, `b1d565f`, scope/generation tests | Exact normalized scope passes; different user/choir/installation and older/newer generation fail; unsafe increment returns null. No persistent queue exists. |
| Diagnostic output is secret/identity safe | yes | PASS | 2026-09-19, `b1d565f`, serialized redaction tests | Accepted and hostile rejected input expose no token, revocation secret, user/member/choir/installation/registration value or key. |
| Focused tests and root shared/web gate | yes | PASS | 2026-09-19, `b1d565f`, focused test + `pnpm check` | Focused 52 tests; full 57 files / 540 tests, coverage thresholds, SW syntax and build. Local code proof only. |
| Diff review, output cleanup, free-space floor and record consistency | yes | PASS | 2026-09-19, commit/disk/status/document checks | Product diff self-reviewed; exact outputs removed; 12,092,896 KiB free; 102 links and status/diff checks pass. Self-review is not independent review. |
| DB/Edge/mobile runtime/provider/real recipient/hardware | N/A — pure protocol slice | N/A | not executed | Required in later C2 briefs. |
