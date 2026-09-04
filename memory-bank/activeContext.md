# Aktif bağlam

Güncelleme: 4 Eylül 2026. Kullanıcı geçişe başlanmasını onayladı; bu kayıttaki
canlı preflight aynı gün Supabase projesinde yeniden sorgulandı.

## Şimdiki odak

[003 kiracı şeması](../docs/briefs/003-kiraci-semasi.md): canlı ön kontrol yenilendi.
Taze `public + auth` mantıksal yedeği alındı ve izole PostgreSQL 17'ye geri yüklendi;
34 hedef tablo / 165 tenant politikası / 3 global website politikası canlıda migration
ile eşleşiyor. `003` canlıda hâlâ uygulanmadı. Ayrıntı ve hash'ler
[003 doğrulama kaydında](../docs/briefs/003-dogrulama.md).

Aynı taze arşivde local migration → izolasyon → down zinciri geçti: 37 public tablo
ve 28 Auth kullanıcısı geri yüklendi; 34 tablo/165 politika izolasyonunda sızıntı
görülmedi; down sonrası `choirs` ve `choir_id` temizlendi. Bu yerel kanıt, hosted
transaction ve gerçek üye akışının yerine geçmez.

Yerel `main`, 003 SQL'i ile web API/Edge Function uyarlamalarını içeriyor; bu
değişiklikler henüz `origin/main`e veya üretime taşınmadı. Bu nedenle push, deploy
veya canlı DDL kendiliğinden başlatılmadı. Sonraki anlamlı adım, tek bakım aralığında
koordineli web/Edge/DB yayın yetkisi ve sonra hosted izolasyon + gerçek üyeli akış
kanıtıdır.

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

- `003` için yedek/geri yükleme/preflight kapısı güncel; canlı göç/yayın/üyeli akış
  kapıları açık. Önce [003 doğrulama kaydını](../docs/briefs/003-dogrulama.md) ve
  güncel ortamı tekrar kontrol et.
- Kullanıcı hosting ve PDF/ses deposu yönünü değerlendirmek istiyor.
  [Altyapı kaydı](../docs/altyapi-2026-09-04.md) staging hazırlığını anlatır;
  Drive'dan çıkış ve production taşıması tamamlanmış değildir.
- İlk açık ürün işi 003'ün canlı geçiş kapılarıdır. Genel yayın zamanlaması, çoklu
  üyelik ve dosya sağlayıcısı henüz kesinleşmiş karar sayılmaz; kendiliğinden DB göçü,
  DNS değişimi, ücretli plan veya push başlatma.

Tarihsel ayrıntılar [progress.md](progress.md)'deki kanıt bağlantılarındadır.
Devirde sadece değişen özet/bağlantıları güncelle; tüm dosyaları yeniden yazma.
