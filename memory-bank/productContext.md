# Ürün bağlamı

Kaynak: 4 Eylül 2026 tarihli yerel [geçiş kaydı](../MIGRATION.md) ve
[kararlar](../KARARLAR.md). Aşağıdakiler ürün amaçlarıdır, performans garantisi değildir.

## Kim, ne için kullanıyor?

- Şef kalemli tablette PDF üzerine anotasyon yazar; korist telefonda okur.
- Üyeler repertuvar ve seslere erişir, ödev teslim eder ve koro içi iletişim kurar.
- Yönetim/üyelik/koro sınırları aynı veri üzerinde çalışan web ve mobilde korunur.

## İlk doğrulanacak ürün akışı

Giriş → koro seçimi → repertuvar → PDF/mevcut anotasyon okuma → çıkış.
Şef ve korist pilotuyla cihazda doğrulanır; sonra yazma/ses/WebView ve mağaza adayı
[teslim planına](../docs/mobil-teslim-plani.md) göre tamamlanır.

## Deneyim hedefleri

- PDF açma, çizim, kaydırma ve ses dinleme temel akışlardır. Büyük dosya, zayıf ağ,
  süre dolmuş oturum ve erişim reddi durumlarında anlaşılır hata ve yeniden deneme gerekir.
- Şefin yazma yolu ile koristin okuma yolu ayrı doğrulanır. Tablet/stylus özellikleri
  simülatörde geçmiş sayılmaz; uygun gerçek cihaz kanıtı gerekir.
- Web ile mobilin piksel eşitliği değil, veri ve davranış sözleşmesi tutarlılığı hedeflenir.
- Koro/rol değişince veya çıkış yapınca özel PDF, ses ve anotasyon önbelleği sızmamalıdır.
- Türkçe ürün dili, dış örnekteki İngilizce kuralı nedeniyle değiştirilmez.

## Henüz sonuçlanmayanlar

008 davet/üyelik canlıda kabul edildi; 010'un iptal edilmiş bağlantı ve yanlış hesap
ürün retleri açık kaldı. Native 004 25/27'dir ve iki cihaz ölçütü ertelenmiştir.
Repertuvar/PDF, mağaza kabulü ve Drive'dan çıkış tamamlandı kabul edilmez.
Sağlayıcı/bölge/maliyet kararları
[altyapı kaydında](../docs/altyapi-2026-09-04.md), iş durumu
[progress.md](progress.md) içinde izlenir. Başka ürünlerin kullanıcıları veya
özellikleri Genova'ya kendiliğinden aktarılmaz.
