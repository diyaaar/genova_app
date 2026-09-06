# Genova — agent handoff

Snapshot: 2026-09-06, prepared from repository records at `5d1b234` by WF-004.
Recheck the current checkout and applicable evidence before acting. This file is an
entry point, not a second roadmap, an authorization grant, or proof of live state.

## Start here

1. Read [AGENTS](../AGENTS.md), then follow the complete reading order in the
   [migration guide](gecis-rehberi.md), including all six memory-bank files.
2. Read the [delivery plan](mobil-teslim-plani.md), [decisions](../KARARLAR.md)
   (especially #21), and the active brief. Inspect relevant code before changing it.
3. Record branch, commit, worktree ownership, one outcome, allowed paths, preserved
   behavior, existing authorization, required tests and rollback in the brief.
4. Work through one brief at a time. Continue authorized routine work without asking
   again at every step. A complete roadmap is not one giant rewrite task.

Write new agent-facing handoffs and acceptance records in English. Keep user-facing
updates and product copy in Turkish unless requested otherwise. Existing Turkish
decisions remain authoritative: do not create parallel English copies of every file
or infer that English guarantees better reasoning or instruction compliance.

## Product goal and reasoning

Ship the existing choir product on iOS and Android while keeping the web working.
The first visible milestone is an installed app with sign-in, choir selection,
repertoire, PDF/existing-annotation reading, and sign-out, tested by a chief and a
chorister. RN + Expo is decided; `spike/` is disposable research, not the product.
The proposed product directory is `apps/mobile/`; confirm it in brief 004.

Isolation and membership foundations were needed because both clients use the same
data. The next priority is discovering actual mobile problems through a device
flow. Decision #21 removes plan-limit implementation as an automatic pilot prerequisite.
Limits still belong before store release; bring them forward only for a demonstrated
pilot blocker. Keep hosting/storage migration and expanded administration out of the
first-device path. Preserve the complete feature inventory in MIGRATION, including
permanent WebView screens. Shared TypeScript does not make DOM code native-compatible.

## Recorded status — not re-tested in this handoff

| Area | Recorded result | Still open / source |
|---|---|---|
| 003 / 005 | Tenant isolation and session-bound active choir deployed | Actual second membership remains controlled; [005](briefs/005-coklu-uyelik-aktif-koro.md) |
| 006 | Unauthorized bootstrap/write paths closed | User accepted the 27-account password/session risk; do not reopen mass recovery or call it fixed; [decision #17](../KARARLAR.md) |
| 007 | Choir creation DB/Edge deployed | Operator allow-list empty; actual authorized success not accepted; [007](briefs/007-operator-kontrollu-koro-olusturma.md) |
| 008 | Local invitation implementation, 155 tests, 20 browser tests and isolated SQL/concurrency/down evidence | Not deployed; browser Auth is mocked; [008](briefs/008-davet-ve-uyelik.md) |
| 009 | SMTP/Site URL configured; reply forwarding delivered to Gmail; exposed first key revoked, replacement active at last test; 190 tests/build recorded | Real Auth verification/recovery email delivery remains open; do not equate HTTP 200 or forwarding with Auth delivery; [009](briefs/009-auth-eposta-ve-yanit.md) |
| 010 | Exact 008 release/acceptance plan prepared | Fresh backup/restore, deployment and real acceptance remain; [010](briefs/010-008-canli-yayin-ve-kabul.md) |
| 004 / mobile | RN spike passed; product workspace not started | Native shell, PDF, pilot and store delivery remain; [004](briefs/004-rn-kabuk-ve-giris.md) |

The live web was last verified on Vercel; Railway is preparation, not a completed
hosting move. Drive migration is not complete. Company/publisher identity is deferred
to the relevant publication work, not a blocker for local native setup.

## Exact next actions

1. Reconcile 010 with current user authorization and live access. It deploys 008 in
   DB → Edge → web order; preserve its backup/restore and rollback requirements.
2. Production fixtures were proposed but not approved: `Genova 008 Test` and the
   operator-owned Gmail aliases `+008sef` / `+008korist`. Do not create, contact or
   delete them merely because they appear here. Existing users are not substitute fixtures.
3. At the last check, Genova MCP was unauthorized and direct DB IPv6 timed out.
   The correct account's CLI/browser worked for 009. Revalidate the supported access
   route and exact project; never switch to another organization's database.
4. If external permission/access blocks 010, keep it pending. Continue independent
   004 local implementation when authorized by the new user task, with isolated test
   doubles; mark live acceptance pending. Do not fabricate a successful 010 to proceed.
5. After 004 acceptance, write the repertoire/PDF reading brief. Follow the delivery
   plan through the device pilot, remaining required features/limits/storage, then
   store readiness. Each stage needs its own acceptance evidence.

## Acceptance discipline

Use the acceptance-evidence section in the [brief template](briefs/_TEMPLATE.md).
Before implementation, enumerate the required behaviors and failure cases. For each
criterion record PASS, FAIL, NOT RUN, or N/A with a specific reason. Every PASS must
point to dated evidence for the relevant code revision, environment and command or
manual scenario. A historical pass is not a new run. Scope changes may add criteria;
do not delete or waive failed criteria merely to obtain a green result.

- Run the applicable AGENTS gates and behavior tests. Fix regressions; do not suppress
  tests, weaken assertions or disable security controls to pass.
- Exercise denied roles/choirs, invalid inputs, expiry, concurrency, network failures
  and cache clearing when relevant. Happy-path tests alone do not cover these cases.
- Review your diff against the requirements and existing behavior after tests.
  Label this self-review. Never claim an independent review or spawn one implicitly.
- A required FAIL or NOT RUN leaves the brief partial/pending. Continue independent
  authorized work; a missing phone must not become a fabricated device result.
- Optional progress is `passed required criteria / all required criteria`, including
  unrun required criteria in the denominator. No subjective 8/10 score, code-quality
  percentage or average can override a required gate. N/A requires justification.
- On completion update the brief evidence and only affected memory/status indexes;
  commit with the brief ID. Separate production code and documentation commits.

The existing [CI workflow](../.github/workflows/ci.yml) defines `pnpm check`, a
production dependency audit, and Playwright regression jobs. This handoff neither
changes CI nor verifies a remote run or branch protection. CI does not prove live DB,
provider delivery, native devices, store approval, or compliance with every prose rule.
When 004 creates the native workspace, include reproducible native type/test commands
and appropriate CI integration in that implementation's reviewed scope.

## Judgment and authority boundaries

Use a smaller model for explicit, bounded implementation; do not silently redesign
authorization, schema, shared contracts or publication policy. Record the exact
question, inspected evidence, proposed solution and affected tests when stronger
review or a user decision is needed. Lack of a reviewer is not approval. An existing
approved design can be implemented within its scope; no need to re-approve each step.

Preserve one writer per checkout and unrelated changes. Secrets must never appear in
prompts, screenshots, command output, Git, or handoff records. Live Supabase is exactly
`hievmwwctjjlhmssoxsu`, shared with the choir website. Push can deploy. Existing
authorization persists, but deployment/data/spending authority cannot be inferred
from a planning document, model switch or the word "continue" without its context.

After two unsuccessful attempts using the same approach, reassess the cause and
sources; do not endlessly repeat commands. Continue on a supported alternative or
return a concrete blocker. Do not claim the project finished until all required
product and release gates, not just local code, have evidence.

## Copy into the new chat

Use this from the Genova project checkout:

> Continue the Genova mobile migration using `docs/agent-handoff.md` as the entry
> point. Read `AGENTS.md` and follow `docs/gecis-rehberi.md` completely. Follow
> decision #21 and the current delivery plan. Verify the checkout, recorded state
> and applicable evidence; do not assume access to the previous conversation.
> I authorize local implementation and testing of the documented mobile plan,
> one brief at a time, including the required local commits. Start by reviewing
> 010 readiness; if its live actions need missing permission/access, keep 010
> pending and proceed with independent 004 local work. This message does not grant
> new production deployment, real-account/data, email or spending authority.
> Use the mandatory acceptance-evidence records; never mark required unrun tests
> passed or replace evidence with a self-score. Preserve existing behavior and
> native/WebView boundaries. Keep agent records in English and my updates short
> and in Turkish. Begin with the checked current state and your first bounded task,
> then carry out authorized work through testing and handoff.
