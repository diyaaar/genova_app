# Aktif bağlam

Güncelleme: 5 Eylül 2026. 003 tenant sınırı ve 005 çoklu üyelik/aktif koro
sözleşmesi canlıda.

## Şimdiki odak

[006 üyelik yönetimi güvenlik kapısı](../docs/briefs/006-uyelik-yonetimi-guvenlik-kapisi.md)
sıradaki zorunlu iştir. Canlıda eski toplu kullanıcı bootstrap fonksiyonu
`verify_jwt=false` ve sabit başlangıç parolalarıyla service-role yazısı yapıyor;
çağrılmadı. Üyelik/rol ana tablolarında authenticated doğrudan DML de rol ayrımı
olmadan açık. Önce fonksiyon erişimi, hesap riski ve bu DML yolları kapatılacak;
restrictive DB kilidi ve yerel geri dönüş/regresyon kanıtı hazır. Canlı
kapatma/oturum/parola/e-posta etkileri açık yetki olmadan uygulanmayacak; custom
SMTP olmadığı salt okunur panel kontrolünde doğrulandı.

[005 çoklu üyelik ve aktif koro](../docs/briefs/005-coklu-uyelik-aktif-koro.md)
tamamlandı ve canlıya alındı. DB `20260905003154`, Edge v15, web `0a2b94c`;
taze restore, hosted 005 + 003 izolasyonu ve tek üyelikli gerçek oturum duman testi geçti.
Gerçek ikinci üyelik/seçici ile canlı write/delete henüz denenmedi.

[004 RN kabuk ve native giriş hazırlık brief'i](../docs/briefs/004-rn-kabuk-ve-giris.md)
yalnız ilk native işin sınırını kayda alır; ürün kodu başlamadı. Çok-korolu ürünün
kalan küçük brief/kararları kapanmadan bu aşama uygulanmaz.
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

- 005 canlıdır. Gerçek ikinci üyelik, koro oluşturma ve davet/üyelik akışı ile kabul
  testleri tamamlanmadan eklenmez; altyapının varlığı ürün yönetim ekranı değildir.
- Şirket adı daha sonra eklenecek; 005 teknik kesimini veya RN kurulumunu engellemez.
  Mağaza/satıcı kimliği gereken adımlarda yeniden ele alınır.
- Sırayı sessizce mobil kabuğa atlama: çok-korolu ürünün kalan küçük brief/kararlarını
  bitir. Native sınır [004 brief'inde](../docs/briefs/004-rn-kabuk-ve-giris.md) kayıtlıdır.
- Kullanıcı hosting ve PDF/ses deposu yönünü değerlendirmek istiyor.
  [Altyapı kaydı](../docs/altyapi-2026-09-04.md) staging hazırlığını anlatır;
  Drive'dan çıkış ve production taşıması tamamlanmış değildir.
- İlk açık iş 006 güvenlik kapısıdır. Ardından koro oluşturma (`007`) ve
  davet/üyelik (`008`), sonra plan-limit ve dosya sağlayıcısı ayrı brief'lere
  bölünür; kendiliğinden DB göçü, DNS değişimi, ücretli plan veya push başlatılmaz.

Tarihsel ayrıntılar [progress.md](progress.md)'deki kanıt bağlantılarındadır.
Devirde sadece değişen özet/bağlantıları güncelle; tüm dosyaları yeniden yazma.
