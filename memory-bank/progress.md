# İlerleme indeksi

8 Eylül 2026. Kaynak belgelerdeki tarihli sonuçlar aşağıda özetlenmiştir;
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
| 014 native repertoire catalogue | Local acceptance complete; 015 is active | [014](../docs/briefs/014-native-repertoire-catalogue.md); shared pure core and native catalogue passed root `pnpm check` (211 tests/build) and mobile type/test/bundle (50 tests, iOS export). Device, live product, protected-file, PDF and hardware are NOT RUN |

WF-003: mobil teslim planı ve yönerge incelemesi tamamlandı; ürün kodu başlamadı.
Kanıt: [WF-003](../docs/briefs/WF-003-mobil-teslim-odagi.md).

## Bilinen riskler

- Yeni uygulama sürümü ile eski canlı şemayı karıştırma. Web/Edge/DB beraber planlanır.
- Koro oluşturma/davet akışı ve kabul testleri hazır olmadan gerçek ikinci üyelik ekleme;
  005 altyapısı canlı olsa da üyelik yönetimi ayrı ürün işidir.
- 012's formerly unrun regression guard now passes on the fixed function and fails for
  the expected reason after the down-migration in an isolated PostgreSQL 17.11 copy.
  This is local database evidence, not a new live-product or production run.
- `next build` ve Playwright hiçbir ajan ortamında koşamıyor (Google Fonts ve Playwright
  indirmesi proxy tarafından kesiliyor). Bu iki kapı yalnız CI'da veya ürün sahibinin
  macOS'unda değerlendirilebilir; ajan ortamında "koşulmadı" yazılır, "geçti" değil.
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

## Latest handoff — 8 September 2026

[Current handoff](../docs/agent-handoff.md) records the completed 012 isolated-database
roundtrip and preserves the remaining open criteria: 010 is 6/7; 004 is 25/27 with both
device items postponed. The owner has now authorized the local repertoire/PDF sequence;
WF-005 and 013 are documentation-complete and 014 is locally accepted at product commit
`9cec58d`; 015 is the active local package. No push, deploy, production database operation,
real choir access, email or hardware test was performed for 014.
