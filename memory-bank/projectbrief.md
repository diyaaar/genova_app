# Proje özeti — Genova

Son karşılaştırma: 6 Eylül 2026, kullanıcı yönü ve yerel karar/durum belgeleri.

Genova, şef ve koristlerin repertuvar, PDF/anotasyon, ses, sohbet, ödev ve koro
işlerini yürüttüğü uygulamadır. Hedef, mevcut web'i koruyarak çok korolu ürünü
App Store ve Google Play'de yayımlanabilir mobil istemciyle tamamlamaktır.
Bu hedef, mağaza yayınının veya çok korolu ürünün tamamlandığı anlamına gelmez.

## Kapsam ve sınırlar

- React Native + Expo; mevcut web ile aynı depo ve ortak TypeScript sözleşmeleri.
- İlk teslim (karar #21): minimum davet kabulü sonrası telefonda giriş → koro seçimi →
  repertuvar/PDF okuma. Pilot ardından mağaza adayı; [plan](../docs/mobil-teslim-plani.md).
  Çok korolu ürün mağazadan önce kalır; gelişmiş ticari yönetim ilk cihazı bekletmez.
  Plan-limit somut pilot engeli yoksa pilot sonrasında, mağaza öncesinde tamamlanır.
- Kalıcı WebView ekranları korunur; tüm ekranları native yapmak hedef değildir.
- PDF ve seslerin production'da Drive bağımlılığından çıkarılması istenmiştir;
  sağlayıcı geçişi ayrı, henüz tamamlanmamış bir iştir.
- Otomatik faturalama v1 kapsamı dışında. Mağaza uygunluğu, faturalama tercihinden
  otomatik çıkarılamaz; yayın brief'inde güncel resmi kurallarla doğrulanmalıdır.
- Yeni yöntem, ürünün baştan yazılması veya teknoloji kararının açılması değildir.

## Asıl kaynaklar

- Ürün/teknoloji kararları: [KARARLAR.md](../KARARLAR.md).
- Ekranlar, geçiş sırası ve durum: [MIGRATION.md](../MIGRATION.md).
- Görev kapsamı ve kabul: [brief şablonu](../docs/briefs/_TEMPLATE.md).
- Mevcut odak: [activeContext.md](activeContext.md).

Her iş kendi kabul kapısıyla kapanır. Yerel test, canlı yayın ve mağaza kabulü
ayrı sonuçlardır; biri diğerinin kanıtı değildir.
