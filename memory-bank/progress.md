# İlerleme indeksi

9 Eylül 2026. Kaynak belgelerdeki tarihli sonuçlar aşağıda özetlenmiştir;
buraya taşımak testin veya canlı ortam kontrolünün yeniden yapıldığı anlamına gelmez.

| İş | Durum | Kanıt / sınır |
|---|---|---|
| 008 minimum davet/üyelik | Canlıda ve kabul edildi; iki olumsuz yol ürün üzerinde denenmedi | [008](../docs/briefs/008-davet-ve-uyelik.md), [010](../docs/briefs/010-008-canli-yayin-ve-kabul.md); canlı oluşturma, kabul ve tek kullanımlık reddi geçti. İptal edilmiş bağlantı ve yanlış hesap yalnız DB düzeyinde kanıtlı; fikstür temizlendiği için ürün yolu artık koşulamaz |
| 009 Auth e-postası ve yanıt aktarımı | Tamamlandı; canlı yönlendirme ve anahtar temizliği geçti | [009](../docs/briefs/009-auth-eposta-ve-yanit.md); SMTP/Site URL düzeltildi, Edge v3 aktif, 190 test/build, canlı teslim/tekrar ve silme sonrası Gmail kabulü geçti. Gerçek Auth doğrulama ve kurtarma teslimi 8 Eylül'de ayrıca gözlendi |
| 001 Flutter repertuvar spike | Tarihsel deneme geçti | [001](../docs/briefs/001-repertuvar-spike.md); ürün mimarisi değil |
| 002 RN PDF/katman spike | Deneme geçti, RN kararı kesin | [002](../docs/briefs/002-rn-pdf-spike.md); ürün kurulumu ve tüm cihazlar değil |
| 003 kiracı şeması | Tamamlandı ve canlıda | [003 kanıtları](../docs/briefs/003-dogrulama.md); web `3878e1d`, Edge v14, hosted izolasyon ROLLBACK ve oturumlu duman testi geçti |
| 004 native shell | Partial: 25/27 required PASS, iki NOT RUN (ikisi de sahip tarafından ertelendi) | [004 evidence](../docs/briefs/004-rn-kabuk-ve-giris.md): native gate at `10b6f9f`; own Android build/emulator at `6d64d16`; historical iOS simulator acceptance. Remote CI and live 010 acceptance passed on 7-8 September. Hardware keychain and the real-phone account flow remain open and were postponed by the owner |
| 005 çoklu üyelik + aktif koro | Tamamlandı ve canlıda | [005](../docs/briefs/005-coklu-uyelik-aktif-koro.md); DB `20260905003154`, Edge v15, web `0a2b94c`; taze restore, hosted izolasyon ve oturumlu canlı duman testi geçti |
| 006 üyelik yönetimi güvenlik kapısı | Kapatıldı; kalan 27 hesap riski ürün sahibi tarafından kabul edildi | [006](../docs/briefs/006-uyelik-yonetimi-guvenlik-kapisi.md); eski public bootstrap silindi, 15 restrictive politika ve hosted 003/005/006 testleri geçti. Toplu parola/oturum düzeltmesi ve e-posta bilinçli olarak yapılmadı; bu hesapların güvenli olduğu anlamına gelmez |
| 007 operatör kontrollü koro oluşturma | Tamamlandı; authenticated başarı yolu canlıda kabul edildi | [007](../docs/briefs/007-operator-kontrollu-koro-olusturma.md); taze backup/restore, DB `20260905160539`, Edge v1 ve hosted 003/005/006/007 geçti. Allow-list dolduruldu ve RPC canlıda gerçek operatör JWT'siyle koro oluşturdu. Oluşturulan test korosu 010'un 8. adımında silindi; kabul kaydı geçerli |
| Railway / Drive'dan çıkış | Araştırma ve ayrı staging hazırlığı | [Altyapı](../docs/altyapi-2026-09-04.md); uygulama yayını/veri taşıması yok |
| AI çalışma düzeni | Yerel kurulum/doğrulama tamamlandı | [WF-001](../docs/briefs/WF-001-ai-calisma-duzeni.md); 114 test geçti, ürün değişikliği yok |
| Geçiş ajanı yönlendirmesi | Yerel belge/doğrulama tamamlandı, ürün başlangıcında kullanıldı | [WF-002](../docs/briefs/WF-002-gecis-rehberi.md); 44 yerel bağlantı ve `pnpm check` geçti |
| Çok korolu ürün / RN ürün / mağazalar | 008 ve 012 tamamlandı; 010 6/7 açık, 004 25/27 ve iki cihaz ölçütü ertelendi. Yerel repertuvar/PDF paketleri 8 Eylül'de başlatıldı | [MIGRATION](../MIGRATION.md), [mobil teslim planı](../docs/mobil-teslim-plani.md), [handoff](../docs/agent-handoff.md) |
| English agent handoff / pilot priority | Documentation accepted: 16 files / 107 local links, diff and scenario self-review passed | [WF-004](../docs/briefs/WF-004-english-agent-handoff.md), [handoff](../docs/agent-handoff.md); no product, CI configuration or remote changes; receiving model not tested |

| 010 canlı yayın ve kabul | 7/7 ölçütten **6'sı geçti**; altıncı açık kaldı | [010](../docs/briefs/010-008-canli-yayin-ve-kabul.md); yedek + kanıtlanmış restore, taze restore kabulü (ilk koşu başarısız, sebep `pg_dump`'ın rol niteliklerini taşımaması), canlı migration, Edge güvenlik kontrolleri, web yayını, uçtan uca ürün kabulü ve temizlik. Açık: iptal edilmiş bağlantı ve yanlış hesap yollarının **ürün üzerinden** reddi |
| 011 davet dönüşü ve şifre sıfırlama | Tamamlandı (13/13) ve yayında | [011](../docs/briefs/011-davet-donusu-ve-sifre-sifirlama.md); `f661ab2`, üç CI işi yeşil, 30 tarayıcı testi. Doğrulama dönüşü artık `/invite`'a düşüyor; uygulamada ilk kez kendi kendine parola sıfırlama var |
| 012 çoklu üyelikte seçim kilidi | Complete (10/10); live fix plus local regression guard | [012](../docs/briefs/012-coklu-uyelik-secim-kilidi.md); the defect was reproduced live, fixed with `is not distinct from`, and confirmed on the product. On 8 Sep, commit `5702bca` ran the SQL file on an isolated PostgreSQL 17.11 copy: exit 0 fixed, expected exit 3 after down with two null rows, exit 0 after restoring the fix; full fixture-table snapshots were unchanged. No production action in that run. |
| 013 native repertoire contract | Documentation accepted | [013](../docs/briefs/013-native-repertoire-contract.md); source and isolated-schema inventory fixed catalogue, cache, protected-file, PDF and read-only annotation boundaries. No product/live/provider/hardware action was claimed |
| 014 native repertoire catalogue | Local acceptance complete | [014](../docs/briefs/014-native-repertoire-catalogue.md); shared pure core and native catalogue passed root `pnpm check` (211 tests/build) and mobile type/test/bundle (50 tests, iOS export). Device, live product, protected-file, PDF and hardware are NOT RUN |
| 015 shared protected repertoire file | Local acceptance complete | [015](../docs/briefs/015-shared-protected-repertoire-file.md); signed Edge ticket/GET/HEAD/range core, web adoption and isolated role/tenant matrix passed. Root gate: 37 files / 240 tests/build. Deno compile/serve, deploy and live provider/product are NOT RUN |
| 016 native PDF and read-only annotations | Local acceptance complete | [016](../docs/briefs/016-native-pdf-readonly-annotations.md); private download, bounded 40-page rendering, basic zoom/scroll, shared defensive parser and read-only overlays passed root 244 tests/build, mobile 72 tests/bundle, Expo Doctor 21/21 and an iOS simulator native build. Live Edge/provider/account/hardware are NOT RUN; supplemental dependency audit FAIL remains visible |
| 017 non-hardware read-flow acceptance | Local acceptance complete; real pilot NOT RUN | [017](../docs/briefs/017-non-hardware-read-flow-acceptance.md); one synthetic component flow passed signed-out, two-choir selection, catalogue, recovered 40-page PDF/annotation, cache ordering, tenant switch and sign-out. Full mobile gate: 14 suites / 73 tests plus iOS bundle. Live/provider/RLS/account/device evidence is not inferred |
| 018 protected-file runtime acceptance | Local acceptance complete | [018](../docs/briefs/018-protected-file-runtime-acceptance.md), code/test `0b3df6e`; actual Edge entrypoint passed disposable Auth/RPC/RLS/Storage and HTTP ticket/checksum/range/failure matrix. Root gate: 38 files / 253 tests and build. Local Storage only; deploy, Drive, real accounts, CI and hardware are NOT RUN |

WF-003: mobil teslim planı ve yönerge incelemesi tamamlandı; ürün kodu başlamadı.
Kanıt: [WF-003](../docs/briefs/WF-003-mobil-teslim-odagi.md).

## Bilinen riskler

- Yeni uygulama sürümü ile eski canlı şemayı karıştırma. Web/Edge/DB beraber planlanır.
- Koro oluşturma/davet akışı ve kabul testleri hazır olmadan gerçek ikinci üyelik ekleme;
  005 altyapısı canlı olsa da üyelik yönetimi ayrı ürün işidir.
- 012's formerly unrun regression guard now passes on the fixed function and fails for
  the expected reason after the down-migration in an isolated PostgreSQL 17.11 copy.
  This is local database evidence, not a new live-product or production run.
- `next build` bu macOS görevinde 014 ve 015 için geçti. Önceki Linux ajan ortamlarında
  Google Fonts proxy tarafından kesilmişti; ortam sonucu diğer ortama taşınmaz. Playwright
  014/015'te koşulmadı ve canlı olmayan Edge yolunu zaten kanıtlayamaz.
- Eski `create-choir-users` fonksiyonunu çağırma veya sabit kimlik bilgilerini
  repo/log/devir metnine taşıma. 27 hesabın parola/oturum riski ürün sahibi kararıyla
  kabul edildi; bunu giderilmiş güvenlik sonucu olarak raporlama.
- Yedek alma, public DB geri yükleme ve tüm Auth/Storage/Drive kurtarma testi aynı şey değildir.
- Yerel birim/build sonuçları gerçek üye/şef oturumu, provider, Android/iOS ve mağaza
  kabulünü kanıtlamaz. Sonuçları katman ve ortam adıyla aktar.
- Eski karar belgelerindeki fiyat, süre ve mağaza kuralları tarihli varsayımlar olabilir.
  Ödeme/yayın kararı öncesinde resmi kaynakla güncelle; garanti olarak çoğaltma.

Hata geçmişi ayrı dev liste yerine ilgili brief/doğrulama kaydında tutulur:
belirti → neden/kanıt → düzeltme → regresyon testi → kalan risk.

## Latest handoff — 9 September 2026

[Current handoff](../docs/agent-handoff.md) records the completed 012 isolated-database
roundtrip and preserves the remaining open criteria: 010 is 6/7; 004 is 25/27 with both
device items postponed. The owner has now authorized the local repertoire/PDF sequence;
WF-005 and 013 are documentation-complete; 014, 015 and 016 are locally accepted at product commits
`9cec58d`, `42fc8ff` and `0bbe646`; 017 is locally accepted at `326aae9`; 018 is locally
accepted at `0b3df6e`. The [canonical long-term plan](../docs/mobil-teslim-plani.md) now routes
to A2 actual native PDF/Skia rendering, then A3 web compatibility, before annotation writes.
No push, deploy, production database operation, Drive call, real choir access, email, remote CI
or hardware test was performed for 018.

WF-006: long-term plan and execution directive prepared; acceptance evidence belongs in
[WF-006](../docs/briefs/WF-006-long-term-execution-plan.md). Future milestone outcomes are unrun.
