# 037 — Native push registration protocol

**Status / date / responsible writer:** IN PROGRESS / 2026-09-19 / primary agent

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

- [ ] Valid register/revoke/receipt messages normalize without modifying opaque token/secret bytes.
- [ ] Unknown/version/field/type/UUID/generation/transport-platform/application/environment and
      overlong/control/whitespace-bearing sensitive values fail closed.
- [ ] User/member/choir/access/refresh or arbitrary extra fields cannot cross the wire contract.
- [ ] Generation/scope helpers reject stale auth/choir/installation work and overflow.
- [ ] Diagnostic summaries contain no token, revocation secret, account, choir, member or
      installation identifier.
- [ ] Focused tests and root `pnpm check` pass; diff/records/cleanup/disk floor pass.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Contract-source/resource preflight | local repository at `1456495` | PASS | 036 and existing shared protocol patterns read; 12,078,044 KiB free; no dependency/runtime planned. |

**Delivery:** Pending. No product revision exists yet. Schema/Edge/mobile/provider work remains
outside this slice; the next step will be selected only from passed evidence and current resources.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Exact valid v1 register/revoke/receipt normalization | yes | NOT RUN | pending implementation | Opaque values must be preserved byte-for-byte. |
| Malformed/hostile/unknown/oversized input fails closed without identity authority | yes | NOT RUN | pending implementation | Includes forbidden account/tenant/credential fields and cross-platform transport. |
| Generation and current-scope stale-work guards | yes | NOT RUN | pending implementation | Includes duplicate, older, newer and safe-integer overflow boundaries. |
| Diagnostic output is secret/identity safe | yes | NOT RUN | pending implementation | No raw token, revocation secret, user/member/choir/installation identifier. |
| Focused tests and root shared/web gate | yes | NOT RUN | pending local gates | Local code proof only. |
| Diff review, output cleanup, free-space floor and record consistency | yes | NOT RUN | pending final checks | Self-review is not independent review. |
| DB/Edge/mobile runtime/provider/real recipient/hardware | N/A — pure protocol slice | N/A | not executed | Required in later C2 briefs. |
