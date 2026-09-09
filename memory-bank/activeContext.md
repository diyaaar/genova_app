# Active context

Updated 9 September 2026 after the local 022 code/test commit `fb4a6a2`. The recorded
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
sign-out; mobile passed 73 tests/bundle. The real pilot is NOT RUN. Package
[018](../docs/briefs/018-protected-file-runtime-acceptance.md) then accepted the actual local
protected-file entrypoint through disposable Auth/RPC/RLS/Storage and HTTP at code/test commit
`0b3df6e`; root `pnpm check` passed 253 tests/build. It exposed and fixed proxy URL, Storage MIME
and Deno WebCrypto typing defects. No deploy, Drive, real account, CI or hardware result is
inferred. [019](../docs/briefs/019-ios-native-pdf-render-acceptance.md) accepted actual iOS
PDF-page-image and Skia output on an iPhone 17 / iOS 26.5 simulator at `2c64e5e`: pages 1/20/40,
base/150% overlay alignment, page-41 refusal, close cleanup and reopen passed; mobile remained
14 suites / 73 tests and the normal 1,314-module iOS export passed. Its alternate entry uses only
tracked fixtures. At that point A2 remained open for Android plus actual 018-service lifecycle
integration. Package
[020](../docs/briefs/020-android-native-pdf-render-acceptance.md) then accepted the same actual
PDF/Skia output on the API 36 arm64 Android emulator at `e2fe177`: pages 1/20/40, 150% alignment,
page-41 refusal, returned-image cleanup and reopen passed; mobile remained 14 suites / 73 tests,
normal Android export was 1,312 modules, and the affected iOS Release acceptance rebuild passed.
Expo Asset 57.0.16 prepares only the tracked fixture as a local file after an embedded-asset
`ENOENT`; product private-file handling is unchanged. Package
[021](../docs/briefs/021-mobile-protected-file-runtime-acceptance.md) then completed A2 locally at
`404a9ee`: the actual disposable Auth/RPC/RLS/Edge/private Storage route composed with default
mobile Auth, catalogue, private-file and native reader modules on iOS and Android. Real 401/retry,
fresh tickets, the exact 40-page render, reader removal/reopen, B-choir 403/empty catalogue and
sign-out session/preference cleanup passed. Fixture and source baselines were restored. Package
[022](../docs/briefs/022-web-protected-file-compatibility.md) then completed A3 locally at
`fb4a6a2`: production Chrome used the actual disposable Auth/RLS/Edge/private Storage path for
the current PDF, audio and explicit-offline consumers. Exact-byte/cache checks, ticket renewal,
visible missing-object 502, wrong-choir 403 and switch/sign-out teardown passed; no web product
repair was required. A1–A3 are complete locally. Release execution and hardware remain gated;
B1 annotation-write contract inventory is the next independently ready local package.

010's sixth
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
