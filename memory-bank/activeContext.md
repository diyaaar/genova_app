# Active context

Updated 8 September 2026 after the local 017 code/test commit `326aae9`. The recorded
remote `main` remains `a13f696`; no push or deployment was performed.
[Agent handoff](../docs/agent-handoff.md) is the fresh-session entry point and carries the
detail. This index is not test evidence and not live-state proof; follow its links.

## Where the work stands

The live release of invitation-based membership is done. [010](../docs/briefs/010-008-canli-yayin-ve-kabul.md)
took 008 to production in DB → Edge → web order, the flow was accepted end to end on the live
product with purpose-made test identities, and the fixture was cleaned up afterwards with the
owner's confirmation. **010 is six of seven**: the revoked-link and wrong-account refusals were
never exercised through the product, and the fixture that would do so no longer exists.

Two faults surfaced during that acceptance and both are fixed and live:
[011](../docs/briefs/011-davet-donusu-ve-sifre-sifirlama.md) (13/13, released as `f661ab2`)
restored the invitation across the email-verification round trip and gave the app the
self-service password reset it never had; [012](../docs/briefs/012-coklu-uyelik-secim-kilidi.md)
(10/10) stopped `list_my_choirs` returning a null `is_current`, which had locked every
multi-choir member out of the choir picker. Its SQL file now passes on the fixed function,
fails for the expected two-null-row assertion after the down-migration, and passes again
after restoration on an isolated PostgreSQL 17.11 copy. The reusable local guard is
`supabase/test-support/012_regression_runner.sh` at `5702bca`.

[004](../docs/briefs/004-rn-kabuk-ve-giris.md) is now **25 of 27**. The live-010 criterion
passed; the two that remain are hardware keychain and the real-phone flow, both postponed by
the owner. Do not make either the next agent's first action.

## Active work after 012

The owner authorized the local work-package sequence on 8 September. WF-005 reconciled the
stale roadmap records, 013 accepted the native repertoire contract, and 014 locally accepted
the shared pure catalogue core plus native catalogue. Root `pnpm check` passed with 211 tests;
the mobile gate passed 50 tests and the iOS bundle export. Package 015 then locally accepted a
shared protected repertoire-file ticket/Edge path and web adoption: root `pnpm check` passed
240 tests/build and the isolated PostgreSQL 17.11 role/tenant matrix passed with unchanged
fixtures. Deno compile/serve, Edge deploy, live product and provider integration are NOT RUN.
Package 016 then locally accepted private PDF download/render, basic zoom/scroll and read-only
annotations: root passed 244 tests/build; mobile passed 72 tests/bundle; Expo Doctor passed 21/21;
an iPhone 17 Pro simulator native build passed. The supplemental dependency audit remains FAIL
with 10 moderate Expo toolchain findings. Package 017 accepted one synthetic continuous flow
through sign-in, choir selection, catalogue, recovered 40-page PDF/annotation, tenant switch and
sign-out; mobile passed 73 tests/bundle. The real pilot is NOT RUN. The 013–017 local read-path
sequence is complete; with hardware postponed, the next safe local package is a bounded native
annotation-write brief. 010's sixth
criterion still needs a new production fixture and explicit authorization; 004's two hardware
criteria remain postponed.

## Preserved order and boundaries

[Decisions #21 and #23-#26](../KARARLAR.md) and the [delivery plan](../docs/mobil-teslim-plani.md).
004's acceptance gate is open and the owner has now started the local repertoire/PDF sequence.
RN + Expo, the shared annotation contract and the permanent WebView targets are unchanged.
The 005 client contract stays fail-closed by decision #24.

## Authority

Standing: local implementation, local commits, reading live state, running the repository
gates. Requiring approval every time: deleting live rows, any production release (push,
deploy, migration), anything touching `Genesi Nova`, real email, spending, and hardware
testing. Housekeeping the owner still owes: revoke the GitHub token in `.env.local.github`.
