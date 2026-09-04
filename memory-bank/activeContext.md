# Aktif bağlam

Güncelleme: 4 Eylül 2026. Kullanıcı 003 canlı geçişini açıkça yetkilendirdi;
koordineli web/Edge/DB yayını ve doğrulama aynı gün tamamlandı.

## Şimdiki odak

[003 kiracı şeması](../docs/briefs/003-kiraci-semasi.md) kapandı. `3878e1d` Vercel
Production'da; `20260903214901` canlı DB'de; `drive-manager-v2` v14 ACTIVE.
34/34 tablo sınırı, hosted iki-koro izolasyon testi ve oturumlu ŞEF üyesiyle temel
okuma akışları geçti. Ortak website canlı kaldı. Tam kanıt, yedek hash'i ve dürüst
sınırlar [003 doğrulama kaydında](../docs/briefs/003-dogrulama.md).

[004 RN kabuk ve native giriş hazırlık brief'i](../docs/briefs/004-rn-kabuk-ve-giris.md)
yalnız ilk native işin sınırını kayda alır; ürün kodu başlamadı. Mağazadan önceki
çok-korolu ürün brief/kararları kapanmadan bu aşama uygulanmaz.
Kalıcı WebView oturum köprüsü, push ve ses ayrı işlerdir.

[WF-001](../docs/briefs/WF-001-ai-calisma-duzeni.md): iki video, kaynak repo ve
13 ekran görüntüsündeki yöntem Genova'ya uyarlandı. Altı kısa hafıza dosyası,
güncel ajan kuralları ve tekrar kullanılabilir brief/devir/proje profili hazır.
Belge kontrolleri ve `pnpm check` geçti; ayrıntılı sonuç WF-001'de.
Bu iş ürün fazlarının numarasını veya `003`'ün durumunu değiştirmez.

## Korunan kararlar

RN + Expo, aynı depo, ortak anotasyon sözleşmesi ve kalıcı WebView sınırları korunur.
Eski Flutter talimatları aktif giriş noktalarından temizlenir; spike geçmişi silinmez.
Alt ajanlar sınırlandırılmış görevle çalışır; aynı çalışma ağacında tek yazıcı vardır.
Hafif model seçimi ile ajan sayısı farklıdır; ölçülmemiş tasarruf iddiası yapılmaz.

## Sonraki ürün işi için durma noktaları

- `003` kapandı; sonraki DB işi bunun üstüne yeni migration olarak kurulmalı. Geri
  dönüş gerekirse [003 doğrulama kaydındaki](../docs/briefs/003-dogrulama.md) web/Edge/DB
  sırası birlikte uygulanır.
- Sırayı sessizce mobil kabuğa atlama: çok-korolu ürün için gerekli
  küçük brief/kararları bitir. Native giriş/kabuk sınırı şimdiden
  [004 brief'inde](../docs/briefs/004-rn-kabuk-ve-giris.md) kayıtlıdır.
- Kullanıcı hosting ve PDF/ses deposu yönünü değerlendirmek istiyor.
  [Altyapı kaydı](../docs/altyapi-2026-09-04.md) staging hazırlığını anlatır;
  Drive'dan çıkış ve production taşıması tamamlanmış değildir.
- İlk açık ürün işi çok-korolu ürün karar/brief zinciridir. Genel yayın zamanlaması,
  çoklu üyelik ve dosya sağlayıcısı henüz kesinleşmiş karar sayılmaz; kendiliğinden DB göçü,
  DNS değişimi, ücretli plan veya push başlatma.

Tarihsel ayrıntılar [progress.md](progress.md)'deki kanıt bağlantılarındadır.
Devirde sadece değişen özet/bağlantıları güncelle; tüm dosyaları yeniden yazma.
