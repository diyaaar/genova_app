# Aktif bağlam

Güncelleme: 5 Eylül 2026. 003 canlıda kalıyor; 005 çoklu üyelik/aktif koro
sözleşmesi yerelde tamamlandı ve canlı kesim bekliyor.

## Şimdiki odak

[005 çoklu üyelik ve aktif koro](../docs/briefs/005-coklu-uyelik-aktif-koro.md)
yerelde tamamlandı. `7b86a57`; Auth `session_id` tabanlı sunucu seçimi, seçim kapısı,
Next/Edge tenant çözümü ve cache ayrımı eklendi. 4 Eylül gerçek yedek kopyasında
izolasyon/down/roundtrip, 126 birim testi, 16/16 Playwright ve `pnpm check` geçti.
Edge için ayrı Deno check yapılmadı. Canlı Supabase/Edge/web değiştirilmedi.

[004 RN kabuk ve native giriş hazırlık brief'i](../docs/briefs/004-rn-kabuk-ve-giris.md)
yalnız ilk native işin sınırını kayda alır; ürün kodu başlamadı. 005 canlı kesimi ve
çok-korolu ürünün kalan küçük brief/kararları kapanmadan bu aşama uygulanmaz.
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

- 005 canlı değildir. Önce `supabase-genesinova` yeniden yetkilendirilmeli; doğru
  project-ref, taze mantıksal yedek ve izole restore kanıtından sonra DB → Edge/web
  kesimi birlikte yürütülmelidir. Yeni çoklu üyelik ancak yeni istemciler canlıyken eklenir.
- Şirket adı daha sonra eklenecek; 005 teknik kesimini veya RN kurulumunu engellemez.
  Mağaza/satıcı kimliği gereken adımlarda yeniden ele alınır.
- Sırayı sessizce mobil kabuğa atlama: 005 canlı doğrulaması ve çok-korolu ürünün
  kalan küçük brief/kararlarını bitir. Native sınır [004 brief'inde](../docs/briefs/004-rn-kabuk-ve-giris.md) kayıtlıdır.
- Kullanıcı hosting ve PDF/ses deposu yönünü değerlendirmek istiyor.
  [Altyapı kaydı](../docs/altyapi-2026-09-04.md) staging hazırlığını anlatır;
  Drive'dan çıkış ve production taşıması tamamlanmış değildir.
- İlk açık ürün işi 005 canlı kesim ön kontrolüdür. Ardından koro oluşturma,
  davet/üyelik, plan-limit ve dosya sağlayıcısı ayrı brief'lere bölünür; kendiliğinden
  DB göçü, DNS değişimi, ücretli plan veya push başlatılmaz.

Tarihsel ayrıntılar [progress.md](progress.md)'deki kanıt bağlantılarındadır.
Devirde sadece değişen özet/bağlantıları güncelle; tüm dosyaları yeniden yazma.
