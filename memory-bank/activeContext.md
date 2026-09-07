# Active context

Updated 8 September 2026 from `main` at `a13f696`, in step with `origin/main`.
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
(9/10) stopped `list_my_choirs` returning a null `is_current`, which had locked every
multi-choir member out of the choir picker.

[004](../docs/briefs/004-rn-kabuk-ve-giris.md) is now **25 of 27**. The live-010 criterion
passed; the two that remain are hardware keychain and the real-phone flow, both postponed by
the owner. Do not make either the next agent's first action.

## Sharpest open risk

`supabase/tests/012_list_my_choirs_is_current.sql` has never been executed, and after the
cleanup the fault cannot be reproduced live either. It is the only guard on a defect that
locked a real member out of the product. Running it, and proving it fails against the
down-migration, is the [next bounded task](../docs/agent-handoff.md#next-bounded-task).

## Preserved order and boundaries

[Decisions #21 and #23-#26](../KARARLAR.md) and the [delivery plan](../docs/mobil-teslim-plani.md).
004's acceptance gate is open, so repertoire/PDF is no longer blocked — but it starts only when
the owner says so. RN + Expo, the shared annotation contract and the permanent WebView targets
are unchanged. The 005 client contract stays fail-closed by decision #24.

## Authority

Standing: local implementation, local commits, reading live state, running the repository
gates. Requiring approval every time: deleting live rows, any production release (push,
deploy, migration), anything touching `Genesi Nova`, real email, spending, and hardware
testing. Housekeeping the owner still owes: revoke the GitHub token in `.env.local.github`.
