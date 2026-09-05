# AI çalışma düzeni — ortak çekirdek v1.1

5 Eylül 2026. Genova profili [AGENTS.md](../AGENTS.md) ve
[hafıza dosyalarıdır](../memory-bank/projectbrief.md). Bu belge çalışma yöntemidir;
ürün mimarisini, kullanıcı yetkisini veya sağlayıcı ayarını kendiliğinden değiştirmez.

## 1. Küçük, kanıtlanabilir iş döngüsü

1. **Bağlam:** aktif talebi, çalışma ağacını, kısa hafızayı ve ilgili brief/kaynağı oku.
   Koddan ucuzca doğrulanabilecek eski notları kontrol et. İlgisiz tüm geçmişi yükleme.
2. **Sözleşme:** amaç, izinli alanlar, kapsam dışı, risk, kabul ve geri dönüşü yaz.
   Küçük işte kısa kayıt yeterli; yeni ve kapsamlı işte [brief](briefs/_TEMPLATE.md) kullan.
3. **Yetki:** açık uygulama isteği içinde olağan adımları ilerlet. Mimari/kapsam değişimi,
   para, canlı veri veya başka kişinin işi için gerekli yeni kararı kullanıcıya taşı.
   Her küçük adımda tekrar onay isteme; izin gerektiren adımı da tahminle geçme.
   Belirsizlikte önce kaynak/kod kontrolü yap. Kapsam içi geri alınabilir teknik
   seçimleri gerekçesiyle kaydet ve ilerle; sadece bağlı işi etkileyen dış kararı beklet.
4. **Uygulama:** tek hedef, küçük diff, açık modül sınırı. İlgisiz refactor yapma.
   Fonksiyon/dosya boyutu inceleme sinyalidir; körlemesine bölme gerekçesi değildir.
5. **Doğrulama:** riske uygun testleri çalıştır, diff'i incele, sonuç/ortam/sınırı kaydet.
   Kodun derlenmesi, kullanıcı akışının veya üretimin doğru çalıştığını tek başına göstermez.
6. **Devir:** kanıtı brief'e, kısa durum ve sonraki adımı hafızaya yaz; proje Git
   disiplinine uygun commit'le devret. Kullanıcıya sonuç ve açık kapıları kısa anlat.

Hata döngüsü: yeniden üretilebilir belirti → neden için kanıt → en küçük düzeltme →
regresyon testi. Aynı başarısız yaklaşımı sınırsız yineleme; iki sonuçsuz denemede
yöntemi/eksik bağlamı yeniden değerlendir. Bu, toplam iş için iki deneme sınırı değildir.

## 2. Hafıza düzeni ve güncelleme sahipliği

| Dosya | İçerik | Ne zaman güncellenir? |
|---|---|---|
| `projectbrief.md` | Amaç, kapsam, temel gereksinim, kapsam dışı | Onaylı ürün kapsamı değişince |
| `productContext.md` | Kullanıcı, problem, akış, deneyim hedefi | Ürün davranışı/amacı değişince |
| `systemPatterns.md` | Sınırlar, sözleşmeler, kaynak haritası | Onaylı mimari/sözleşme değişince |
| `techContext.md` | Teknoloji, ortam, gerçek test komutları | Araç/kurulum/kapı değişince |
| `activeContext.md` | Güncel odak, karar, engel, sonraki adım | Anlamlı ilerleme ve devirde |
| `progress.md` | Durum ve ayrıntılı kanıtın indeksi | İş/kabul durumu değişince |

Dosyalar kısa tutulur; ayrıntılı loglar, müşteri verileri ve sırlar burada tutulmaz.
Kapsamlı başlangıçta altı özeti oku, sonra yalnız gereken kaynaklara git. Her değişiklikte
altı dosyayı zorla değiştirme. Tarihli test kayıtlarını yeni koşulmuş gibi tarihleme.
Karar, ekran durumu ve test kanıtı kendi asıl belgesinde kalır; hafıza bağlantıyla yönlendirir.
Depo hafızası proje içindir; kişisel/global hafızaya yazmak ayrıca kullanıcı talebi gerektirir.
Bir aracın bu dosyaları otomatik okuduğunu varsayma; oturum girişinde açıkça yönlendir.

## 3. Göreve göre ajan ve model

Ana ajan kapsam/mimari/güvenlik/entegrasyon/son kabul sahibidir. Bağımsız alt iş varsa
[devir sözleşmesi](templates/ajan-devir.md) doldurulur; devir maliyeti kazançtan yüksekse
iş doğrudan yapılır. Ajan sayısını artırmak model maliyetini kendiliğinden azaltmaz.

- **Hafif model:** dosya/kanıt envanteri, belirli bağlantıyı kontrol etme, mekanik
  değişiklik önerisi, önceden tasarlanmış örneklerden test taslağı.
- **Dengeli uygulayıcı:** net sözleşmeli ve sınırlandırılmış modül işi.
- **Ana ajan:** yetki/RLS, ortak veri sözleşmesi, mimari ve yayın kararları; tüm çıktıların
  kabulü. Bir satırlık güvenlik değişikliğini düşük risk diye sınıflandırma.
- Gerçek model/araç erişimini doğrula; hafif model seçilemiyorsa eşdeğer tasarruf iddia etme.
  Model adı şablona kalıcı gömülmez. Açılmamış ajanı veya yapılmamış incelemeyi yapılmış yazma.
- Ortak ağaçta **tek yazıcı**. Okuma ajanı dosya/Git değiştirmez; build/test/cache üreten
  komutları bile yazıcıyla koordine eder. Kod için ayrı kopya veya sıralı commit'li devir gerekir.
- Ana ajan → alt ajan varsayılandır. Alt-alt ajan ancak açık ihtiyaç ve ana ajanın yazılı
  kapsam/derinlik sınırıyla açılır; kalan bütçe ve yetki sınırları büyümez.
- Eksik bağlam, yeni dosya ihtiyacı, sözleşme değişimi veya iki sonuçsuz deneme üst ajana
  dönüş nedenidir. Ana ajan kanıtı ve diff'i incelemeden sonucu kabul etmez.
- Kullanıcının verisi/sırları veya canlı erişimi alt göreve otomatik taşınmaz.
  Süre, tekrar ve gerçek kullanım ölçülmeden maliyet tasarrufu yüzdesi yazılmaz.

## 4. Doğrulama ve doküman kalitesi

Değişen katmanın temel kapısını ve riske uygun ek kanıtı seç. Salt belge değişiminde
ürün build/testini tekrarlama; bağlantı, kapsam ve tutarlılık kontrolü yap.
Kapsamda yeni değişiklik/hata yoksa geçmiş başarılı testleri yeniden çalıştırma.


| Değişen alan | Ek kanıt |
|---|---|
| Belge/yöntem | Bağlantılar, kaynak uyumu, çelişki/kapsam kontrolü, örnek oturum devri |
| UI / kullanıcı akışı | Birim + tarayıcı, ilgili erişilebilirlik ve görsel kontrol |
| API / yetki / kiracı | İzinli ve reddedilen rol/koro senaryoları; gerçek veri sınırı |
| Şema | Güncel yedek + geri yükleme + yerel migration/down + iki istemci/servis uyumu |
| PDF / ses / provider | Erişim, MIME, checksum, Range/seek, URL yenileme, ağ/cache/çıkış |
| Native | İlgili iOS/Android derlemesi ve gerçek cihaz özelliği testi |
| Yayın | Kaynak sürüm, deploy sonucu ve canlı üyeli temel akış; mağaza kabulü ayrı |

Her sonuç: **tarih + komut/işlem + ortam + sonuç + sınır** içerir. Kapsam dışı katmana
"çalıştırılmadı" yaz. Taklit servis, yerel DB ve gerçek provider testini birbirine karıştırma.
Performans iddiası varsa aynı koşullarda önce/sonra ölç; ölçmeden etkisiz veya hızlı deme.

Önemli ortak API/sözleşme açıklamasında kontrol et: amaç/sorumluluk, girdi/çıktı,
yetki, yan etki, hata/uyumluluk sınırı ve gerekiyorsa kullanım örneği. İsmi tekrar eden
yorum ekleme. Kaynaktaki 8/10 öz puan yerine bu maddelerin somut açıklanmasını incele.
Lint/test bastırma veya tüm uyarıları kapatma çözüm değildir; dar istisna gerekçeli ve testli olmalıdır.

## 5. Yeni projeye kurulum / mevcut projeye geçiş

**Yeni proje:** bu ortak çekirdeği ve brief/devir şablonlarını al. Önce
[proje profilini](templates/proje-profili.md) gerçek kaynaklarla doldur, altı hafıza
dosyasını projeye özel yaz ve giriş kurallarını bunlara bağla. Genova'nın hesaplarını,
domainlerini, test sayılarını, teknoloji ve mobil kararlarını kopyalama. Bir pilot işte
giriş → uygulama → test → devir zincirini dene; sonra proje standardı olarak kullan.

**Mevcut proje:** önce mevcut kurallar, kararlar, durum dosyaları, testler ve çalışma
ağacını envanterle. Eksik/çelişen alanları listele; çalışan mimariyi yeniden yazmadan
eşleştir. Var olan bir hafıza/karar sistemi varsa ikinci otorite yaratma. Onaylı kapsamda
küçük geçiş yap, eski kayıtları tarihsel olarak koru ve tek pilot brief ile doğrula.
Bu paket diğer projelere veya kişisel global skill'lere otomatik kurulmuş değildir.

## Kaynak ve uyarlama sınırı

İki video + [GitHub incelemesi](ai-calisma-yontemi-repo-incelemesi.md) + kullanıcının
13 ekran görüntüsü yaklaşım için referanstır. Ekranlar altı dosyanın rollerini doğrular;
kesilmiş satırlar tamamlanmış gibi aktarılmaz. Rust/WGPU kuralları, örneğin kendi
performans iddiaları ve hazır olmayan exporter Genova'ya taşınmadı. Kurallar burada
Genova için yeniden yazıldı; üçüncü taraf motor kodu kopyalanmadı.
Alt ajan/model iş bölümü kullanıcının ek önerisidir, video deposunda hazır bir sistem değildir.

## Teslim odağı

Bir brief tek doğrulanabilir sonuç taşır; bağlı akış birden fazla modüle dokunabilir.
Kabul için gerekli dar refactor brief'e yazılır. Her altyapı işi kullanıcı akışındaki
somut bir engeli kapatmalı. Genova önceliği [teslim planındadır](mobil-teslim-plani.md).
Kaynak yönergelere sayısal uyum, dosya sayısı veya ajan sayısı başarı ölçütü değildir.
