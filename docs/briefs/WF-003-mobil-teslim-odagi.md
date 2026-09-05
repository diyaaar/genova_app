# WF-003 — Mobil teslim odağı ve kural incelemesi

5 Eylül 2026. Kapsam: plan ve yönergeler; tek yazıcı ana ajan.
Başlangıç: temiz `main`, `0389242`. Kullanıcı önerilen mobil odağı ve ilgili
proje dosyalarının düzenlenmesini istedi. Ürün uygulaması/yayın bu işin kapsamı değil.

## Kaynak ve başlangıç kontrolü

AGENTS, altı hafıza özeti, MIGRATION, KARARLAR, çalışma döngüsü, geçiş rehberi,
004 brief'i, brief/devir/profil şablonları ve video/repo analizleri okundu.
GitHub guidelines'ın analizdeki sabit sürümü yeniden açıldı. Videolar bu turda
yeniden oynatılmadı; önceki kaynak analizi ve konuşmadaki ekran görüntüleri kullanıldı.
İzinli alan: bu brief, mobil teslim planı, AGENTS/MIGRATION/KARARLAR,
004 brief'i, yöntem/rehber/şablonlar, repo incelemesine tarihli ek ve ilgili hafıza.
Geri dönüş: belge commit'ini geri alma. Canlı veri ve üretim kodu değişmez.

## İnceleme: ne korunuyor, ne düzeltiliyor?

| Bulgu | Karar / gerekçe |
|---|---|
| Modülerlik, kısa hafıza, brief, somut test ve tek yazıcı | Korunur. Sorumluluk ve oturum devrini anlaşılır tutar. |
| Kaynakta 800/100 satır, 8/10 puan, Rust/İngilizce zorunluluğu | Önceki Genova uyarlaması zaten yumuşatmış; korunur. Mekanik bölme/öz puan/Türkçe UI yasağı ürün doğruluğunu ölçmez. |
| Kaynağa %99 uyum hedefi | Amaçlara sadakat esas; kural satırı yüzdesi kabul ölçütü değil. Kaynak motorun gereksinimi Genova gereksinimi değildir. |
| Bir oturumda bir ekran | Bir brief'te tek doğrulanabilir sonuç. Giriş/koro seçimi gibi bağlı akış birkaç modül gerektirebilir; oturum sınırı teknik sınır değildir. |
| Tüm ticari ürün bitmeden native'e başlama | Minimum davet/limit sonrası cihaz akışı. Gelişmiş ticari panelin bitmesini beklemek mobil riski geç keşfettirir. |
| Her değişiklikte tam test paketi | Değişen katmana göre zorunlu kapı. Salt belge için build tekrarı yerine bağlantı/tutarlılık kontrolü. |
| Belirsizlikte her defasında kullanıcıya dön | Önce kanıt ara; kapsam içi geri alınabilir teknik kararı kaydet ve ilerle. Yeni ürün/para/veri yetkisi gerekiyorsa sor. |
| Mevcut mimari mutlak, her modül değişimi yasak | Mevcut davranışı koru; brief'in kabulü için gerekli sınırlı refactor gerekçesiyle yapılabilir. İlgisiz yeniden yazım yasak kalır. |
| Aynı commit'te belge/kod vs ayrı commit kuralı | Ayrı ama birlikte devredilen kod/belge commit'leri. Çelişen MIGRATION başlığı düzeltildi. |
| Chat UI hazır, TS aynen gider, WebView kayıpsız | Doğrulanmış sonuç gibi kullanılmaz; platform bağımlılıkları ve kullanıcı akışı test edilir. |
| Manuel fatura kesin mağaza muafiyeti | Kesin ifade kaldırıldı. Yayın brief'inde güncel hesap/ürün koşulları doğrulanır. Bu tur hukuki/mağaza uygunluk kararı verilmedi. |

## Teslim kapısı

- [x] [Kapsamlı plan](../mobil-teslim-plani.md): bağımlılık, sonuç, test, ertelenenler ve açık kararlar.
- [x] Giriş kuralları, karar/durum kaydı, 004 ve şablonlar plana bağlandı.
- [x] Yerel bağlantı, eski engelleyici ifadeler ve diff kontrolü geçti.
- [x] Yalnız belge teslimi hazır; uygulama ve canlı işlem yapılmadı.

Doğrulama: 16 değişen/yeni Markdown dosyasında 96 yerel bağlantı, sıfır kırık
bağlantı; `git diff --check` temiz. 004'teki eski 003 engeli, beş boş sekme şartı,
MIGRATION'daki yanlış chat durumu ve çelişen commit kuralı kontrol edildi.
Üretim kodu değişmedi; yeni belge kapısına göre ürün build/testleri tekrarlanmadı.
Kaynak karşılaştırması yalnız sabit guidelines sürümüyle sınırlı; tüm motor
kodu veya güncel mağaza uygunluğu denetlenmiş sayılmaz.

Sonraki iş: 008 minimum davet/üyelik brief'ini mevcut kod sözleşmesiyle hazırlayıp
uygulamak. Bu plan tamamlanmış 008 veya tamamlanmış mobil ürün değildir.
