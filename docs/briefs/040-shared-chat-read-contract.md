# 040 — Shared chat read contract

**Status / date / responsible writer:** ACCEPTED LOCALLY / 2026-09-19 / primary agent

**Purpose and user need:** Give web and React Native one framework-free, fail-closed contract for
authorized room summaries and message pages before either client receives a native chat runtime.

**Delivery focus:** This is C3 order 2 from 038. It closes only the data-boundary ambiguity:
validated server UUIDs, known and compatible-unknown message kinds, stable `(created_at,id)`
cursors, deterministic deduplication and exact account/choir/member scope guards. Network, cache,
Realtime, UI and database authority remain later slices.

**Starting evidence:** 038 found permissive parsing in `lib/chat.ts`, timestamp-only pagination,
minimal cache validators and no versioned shared read shape. 039 at `7a6a78e` now clears stale
process memory but does not validate incoming rows. Product/status record is `bb8b86d`; the only
unrelated dirty path is `supabase/.temp/cli-latest`.

**Current work card:** Complete. Hostile or malformed room/message rows cannot become a shared read
model; a syntactically compatible future message kind remains explicitly `unsupported` instead of
being dropped. Stable cursor/order/dedup and account/choir/member scope guards pass in both
TypeScript projects. Next C3 work is authority/Realtime foundation, subject to its own schema,
resource and hosted-operation boundaries.

**Resources:** Start snapshot: 15,606,000 KiB (~14.9 GiB) free; `.next` and coverage are absent.
No dependency, database, simulator or native build is planned. Root `pnpm check` may create about
489 MiB `.next`; run one heavy process and remove exact generated outputs after evidence, keeping
the 10 GiB floor.

**Allowed files / modules:**

- `lib/chat-read-contract.ts` — framework-free shared scope, row, cursor and merge contract.
- `lib/chat-read-contract.test.ts` — exhaustive root contract/failure evidence.
- `apps/mobile/src/chat/__tests__/chat-read-contract.test.ts` — direct shared-import proof in RN.
- This brief and, after acceptance, plan/MIGRATION/active-context/handoff status records.

**Sources / existing patterns:**

- [038](038-native-chat-feature-inventory.md) — feature map, blockers and required C3 order.
- [039](039-chat-tenant-memory-teardown.md) — accepted lifecycle boundary and next selection.
- `lib/chat.ts` and `lib/chat-cache.ts` — current RPC/message shapes and unsafe normalization.
- `lib/native-push-registration.ts` — pure exact-input, scope-guard and redacted-decision pattern.
- Mobile `@shared/*` imports and Jest mapping — existing one-source TypeScript contract pattern.

**Migration start check:**

- Read: `AGENTS.md`, handoff, active context, plan controls/C3, 038–039, transition guide/work
  cycle/template, `MIGRATION.md`, relevant decisions, current chat source/cache and shared patterns.
- Boundary: shared pure TypeScript only. Chat remains native-owned; web and future RN networking
  may consume this contract later. No current query, UI or server behavior changes.
- Preserve: room/DM types, membership summary, message/reply/sender display data, deleted/edited
  flags, metadata needed for future kinds and chronological display. Unknown compatible message
  kinds stay explicit and visible; malformed identity/scope/date/count/shape fails closed.
- Authority/writer: one primary writer; local source/tests/commits are authorized. No hosted query,
  schema/migration, Edge, provider, credential, real data/account, deploy, CI, hardware or release.
- Required proof: hostile/malformed inputs, known and compatible-unknown kinds, UUID/date/count
  boundaries, `(created_at,id)` cursor/order/dedup, stale account/choir/member scope, direct mobile
  import, root/mobile gates, cleanup/disk floor. Roll back the product commit.

**Out of scope:**

- Adopting the contract in `lib/chat.ts`, changing PostgREST/RPC queries or persisting chat data.
- RLS/index/publication/private Realtime repair, local/hosted Supabase or fixtures.
- Native room list/read UI, send/retry, reactions/polls/receipts, media or administration.
- Claiming an unknown message kind is renderable as its full feature; only a visible unsupported
  fallback descriptor is accepted until that client version understands it.

**Risk / authority / rollback:** Over-strict validation can hide legitimate existing rows; overly
permissive normalization can treat attacker-controlled identity, invalid dates or arbitrary
objects as server data. Keep required display fields explicit, accept only own plain-object keys,
bound strings/arrays/counts and distinguish compatible unknown type from malformed type. This pure
contract has no side effects; rollback removes its product commit.

**Small implementation steps:**

1. Define immutable scope/read models, reasoned parse decisions and stable cursor/merge helpers.
2. Add root hostile/boundary/order tests and one mobile direct-import compatibility suite.
3. Run focused and full gates, self-review the API, remove exact outputs and update records.

**Done definition:**

- [x] Valid room summaries/messages normalize to a framework-free shared model.
- [x] Malformed/hostile rows fail closed; future syntactically compatible kinds remain explicit.
- [x] Stable cursor, same-timestamp ID ordering, deduplication and stale-scope refusal pass.
- [x] Root focused tests and `pnpm check`, plus mobile typecheck/tests, pass.
- [x] Diff/API review, exact-output cleanup, 10 GiB floor and documentation gates pass.

**Optional subtask:** None. One writer; no delegation.

**Result record:**

| Date | Command / action | Environment | Result | Evidence / limit |
|---|---|---|---|---|
| 2026-09-19 | Source/resource preflight | local repository at `bb8b86d` | PASS | Shared import mapping/current row shapes verified; `.next`/coverage absent; 15,606,000 KiB free; no runtime/download planned. |
| 2026-09-19 | First root focused contract run | local Vitest | PASS | 1 file / 25 tests passed. |
| 2026-09-19 | First combined root/mobile lint invocation | local ESLint | FAIL | Contract tests passed, but the command included the intentionally root-ignored `apps/mobile/` path under `--max-warnings=0`. The resulting ignored-file warning stopped the chain; no source failure or criterion was suppressed. |
| 2026-09-19 | Correct project-boundary focused gates | root ESLint/typecheck; mobile typecheck/Jest | PASS | Root contract lint/typecheck passed; the direct mobile shared import passed 1 suite / 2 tests. |
| 2026-09-19 | Self-review and focused reruns | local source/Vitest/Jest | PASS | Preserved multiline content and nullable legacy slug without trusting slug as authority; refused ambiguous to-one relations and sender/reply identity disagreement. Final root focused suite passed 29 tests; mobile direct-import suite passed 2. Self-review only, not independent review. |
| 2026-09-19 | Mobile `pnpm check` | `apps/mobile`, product candidate `2dfe6ab` | PASS | Typecheck plus 37 suites / 218 tests passed. Existing SafeAreaView/punycode deprecation warnings remain unrelated and non-blocking. No native build/runtime/device evidence. |
| 2026-09-19 | Root `pnpm check` after final repair | local repository, product `2dfe6ab` | PASS | Lint/typecheck, 58 test files / 571 tests, configured coverage, service-worker syntax and Next production build passed. |
| 2026-09-19 | API/diff review | three product/test files | PASS | 573-line pure module stays below the repository review signal; no network/storage/logging/imported framework. Decisions return safe reason/field labels only, scope includes account+choir+member, and unknown type fallback does not claim feature rendering. |
| 2026-09-19 | Generated-output cleanup and disk recheck | local filesystem | PASS | Removed exact `.next` (490 MiB) and `coverage` (332 KiB). 15,624,884 KiB (~14.9 GiB) remained free; unrelated `supabase/.temp/cli-latest` stayed unstaged. |
| 2026-09-19 | Documentation consistency gate | five changed Markdown files | PASS | 116 local links resolve with zero missing; stale 040 pending/next-shared-read markers are absent; `git diff --check` passes. |

**Delivery:** Planning commit `3e5ab21`; product/test commit `2dfe6ab`; this acceptance/status
record follows separately. Rollback is the product commit only. Next: authority/Realtime foundation
after a fresh DB/resource/authority preflight; no migration or live operation is implied here.

## Mandatory acceptance evidence

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| Valid room/message models and compatible-unknown type fallback | yes | PASS | 2026-09-19, `2dfe6ab`, 29 root focused tests + 2 mobile tests | Pure parser accepts current RPC relation encoding and marks compatible future kinds unsupported; no renderer claim. |
| Hostile/malformed identity, shape, time and count refusal | yes | PASS | 2026-09-19, `2dfe6ab`, focused hostile matrix | Invalid UUID/date/count/JSON/type/relation/room and duplicate authority rows reject the entire item/page. |
| Stable cursor, deterministic order/dedup and stale-scope refusal | yes | PASS | 2026-09-19, `2dfe6ab`, focused cursor/scope tests | Microsecond timestamp plus UUID tie-break passes; later same-ID snapshot wins; account, choir and member all bind work. |
| Mobile direct import, mobile gate and root gate | yes | PASS | 2026-09-19, local | Mobile 37 suites/218 tests; root 58 files/571 tests plus production build. |
| API/diff review, cleanup, disk floor and records | yes | PASS | 2026-09-19, local source/filesystem/docs | Three scoped files committed; outputs removed; ~14.9 GiB free; 116 local links and diff check pass; unrelated marker preserved. |
| Network/DB/RLS/Realtime/native runtime/device/hosted | N/A — pure contract only | N/A | not executed | Required in C3 orders 3–4. |
