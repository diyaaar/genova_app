# Active context

Updated 7 September 2026 from clean `main` at `01ce1f1`; handoff-only follow-up.
[Agent handoff](../docs/agent-handoff.md) is the fresh-session entry point. Follow AGENTS,
all six memory files and the migration guide; this index is not test or live-state proof.

## Current work and latest owner direction

[004 native shell](../docs/briefs/004-rn-kabuk-ve-giris.md) is locally implemented and
**partial/pending: 23/27 required PASS, four NOT RUN**. On 7 September the owner again
postponed real-device testing and requested a handoff and next-step analysis. Do not make
another phone-test question the next agent's automatic first action; no criteria were waived.

Native type/test/iOS bundle checks passed at `10b6f9f`; the own Android development build
ran on an isolated emulator at `6d64d16`. Detailed commands, screenshots and limits live in
004's linked evidence. The earlier absent-Android and 21/26 or 22/27 summaries are historical.
Hardware keychain, real-phone account flow, remote CI and live 010 remain unrun.

004's **CI execution-readiness proposal** was prepared on 7 September at `d9ab194` and is
recorded in the [brief](../docs/briefs/004-rn-kabuk-ve-giris.md#ci-execution-readiness-proposal--7-september-2026),
which stays authoritative; do not redo or restate it. Local read-only inspection only, no
remote operation, and no criterion changed. It concludes that every route to a remote run
needs at least one push, that a `main` push would publish the 008 invitation UI ahead of its
undeployed migration and Edge function, and that the `quality` job is predicted — by analysis,
not a test — to fail at `next build` for missing Supabase environment. Six remote facts stay
unknown. Work is paused on the owner's answer to a four-step approval request whose first two
steps write nothing: a `git fetch`, and an owner-side report of Vercel and branch-protection
settings. Do not push, branch, open a pull request, dispatch a run or change hosting.

7 Eylül eki: kullanıcı connector'ları yeniden bağladı. Supabase ve Railway artık doğru
`genesinovachoir` hesabında; salt okunur listelerle canlı projede 008 migration'ının ve
`choir-invitations` Edge fonksiyonunun **bulunmadığı** doğrulandı, yani 010'un önkoşulları
artık varsayım değil gözlem. Kullanıcının `git fetch`'i `origin/main`'in yerinde durduğunu,
`main`'in 24 commit önde olduğunu gösterdi. Vercel hâlâ canlı web projesini göstermiyor.
Erişimin açılması yayın yetkisi değildir: 010 bekliyor, ayrı yetki ve yedek/geri yükleme
kanıtı istiyor. Ayrıntı ve sınırlar
[004 erişim kaydında](../docs/briefs/004-rn-kabuk-ve-giris.md#access-re-check-after-the-owner-reconnected-the-connectors--7-september-2026).

## Preserved order and boundaries

[Decision #21](../KARARLAR.md) and the [delivery plan](../docs/mobil-teslim-plani.md):
invitation acceptance → native sign-in/selection → repertoire/PDF → device pilot;
limits before store release unless a measured pilot blocker justifies earlier work.
004 cannot close locally while the four required gates remain open. Do not start
repertoire/PDF, plan-limit or hosting work to bypass this acceptance boundary.

[008](../docs/briefs/008-davet-ve-uyelik.md) is locally verified, not deployed;
[010](../docs/briefs/010-008-canli-yayin-ve-kabul.md) remains pending separate authority.
Earlier live 003/005/006/007/009 evidence and limits are indexed in
[progress](progress.md), not reverified here. Real second membership/operator/choir creation
is not automatically authorized by deployed infrastructure. Old-account risk remains
accepted under decision #17; real Auth delivery is not proven by reply forwarding.

## Authority and handoff

Existing authority: local implementation/tests and required local commits for the documented
plan, one brief at a time. Latest request: handoff/analysis only. No push, remote PR/run,
deploy, production account/data work, email or spending; hardware remains deferred.
Single writer, preserve unrelated/generated user state. RN + Expo, shared annotation
contract and permanent WebView targets remain unchanged. Current source/test applicability,
artifact ownership, environment recovery and remaining risks are in the handoff and 004.
