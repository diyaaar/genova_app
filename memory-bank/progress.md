# İlerleme indeksi

5 Eylül 2026. Kaynak belgelerdeki tarihli sonuçlar aşağıda özetlenmiştir;
buraya taşımak testin veya canlı ortam kontrolünün yeniden yapıldığı anlamına gelmez.

| İş | Durum | Kanıt / sınır |
|---|---|---|
| 001 Flutter repertuvar spike | Tarihsel deneme geçti | [001](../docs/briefs/001-repertuvar-spike.md); ürün mimarisi değil |
| 002 RN PDF/katman spike | Deneme geçti, RN kararı kesin | [002](../docs/briefs/002-rn-pdf-spike.md); ürün kurulumu ve tüm cihazlar değil |
| 003 kiracı şeması | Tamamlandı ve canlıda | [003 kanıtları](../docs/briefs/003-dogrulama.md); web `3878e1d`, Edge v14, hosted izolasyon ROLLBACK ve oturumlu duman testi geçti |
| 004 RN kabuk + native giriş | Hazırlık brief'i tamam; ürün kodu başlamadı | [004](../docs/briefs/004-rn-kabuk-ve-giris.md); önce çok-korolu ürün karar/brief'leri |
| 005 çoklu üyelik + aktif koro | Tamamlandı ve canlıda | [005](../docs/briefs/005-coklu-uyelik-aktif-koro.md); DB `20260905003154`, Edge v15, web `0a2b94c`; taze restore, hosted izolasyon ve oturumlu canlı duman testi geçti |
| Railway / Drive'dan çıkış | Araştırma ve ayrı staging hazırlığı | [Altyapı](../docs/altyapi-2026-09-04.md); uygulama yayını/veri taşıması yok |
| AI çalışma düzeni | Yerel kurulum/doğrulama tamamlandı | [WF-001](../docs/briefs/WF-001-ai-calisma-duzeni.md); 114 test geçti, ürün değişikliği yok |
| Geçiş ajanı yönlendirmesi | Yerel belge/doğrulama tamamlandı, ürün başlangıcında kullanıldı | [WF-002](../docs/briefs/WF-002-gecis-rehberi.md); 44 yerel bağlantı ve `pnpm check` geçti |
| Çok korolu ürün / RN ürün / mağazalar | Sıradaki: koro oluşturma ve davet/üyelik brief'leri; sonra plan-limit ve RN kabuk | [MIGRATION](../MIGRATION.md), [mağaza hattı](../docs/store-yayin.md) |

## Bilinen riskler

- Yeni uygulama sürümü ile eski canlı şemayı karıştırma. Web/Edge/DB beraber planlanır.
- Koro oluşturma/davet akışı ve kabul testleri hazır olmadan gerçek ikinci üyelik ekleme;
  005 altyapısı canlı olsa da üyelik yönetimi ayrı ürün işidir.
- Yedek alma, public DB geri yükleme ve tüm Auth/Storage/Drive kurtarma testi aynı şey değildir.
- Yerel birim/build sonuçları gerçek üye/şef oturumu, provider, Android/iOS ve mağaza
  kabulünü kanıtlamaz. Sonuçları katman ve ortam adıyla aktar.
- Eski karar belgelerindeki fiyat, süre ve mağaza kuralları tarihli varsayımlar olabilir.
  Ödeme/yayın kararı öncesinde resmi kaynakla güncelle; garanti olarak çoğaltma.

Hata geçmişi ayrı dev liste yerine ilgili brief/doğrulama kaydında tutulur:
belirti → neden/kanıt → düzeltme → regresyon testi → kalan risk.
