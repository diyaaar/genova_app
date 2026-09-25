# Genova proje sağlık kontrolü — 25 Eylül 2026

## Kısa hüküm

**Yerel kod tabanı çalışır durumda; teslim zinciri henüz sağlıklı bir yayın durumunda değil.**
Bugün web ve mobil tip/test kapıları geçti. Buna karşılık gerçek R2/hosted geçişi, Android telefon
betası, iki mağaza ve canlı sürüm eşlemesi doğrulanmadı. 171 yerel commit GitHub `main` dalında
yok. Bu bir öz-denetimdir; bağımsız inceleme veya üretim kabulü değildir.

## Kapsam ve gözlenen durum

- Yerel çalışma ağacı: `main/1272415` (denetim başlamadan önceki HEAD). 25 Eylül'de doğrudan
  `git ls-remote origin refs/heads/main` sonucu `a13f696da8c731e9af2a2bce473d4f4ae4a81587`;
  yerel dal 171 commit ileride. Fark 537 dosya, 62.372 ekleme ve 10.829 silme. Canlı web
  dağıtımının commit kimliği, uzak CI sonucu ve uygulama mağazası dağıtımı **doğrulanmadı**.
- Başlangıçta tek ilgisiz kirli yol `supabase/.temp/cli-latest` idi; içeriği değiştirilmedi ve
  hiçbir zaman sahnelenmedi. Bu rapor ile [WF-010](../briefs/WF-010-project-health-check.md)
  denetimin kendi belge çıktılarıdır.
- İnceleme yerel kaynak, Git, dosya sistemi ve yerel testlerle sınırlı kaldı. Canlı Supabase,
  Cloudflare, Google Drive, gerçek kullanıcı, cihaz, push, deploy veya mağaza işlemi yapılmadı.

## Neler yapıldı; ürün ne durumda?

| Alan | Doğrudan kaynak/kanıtla görülen ilerleme | Açık kabul sınırı |
|---|---|---|
| Çok koro/giriş | [MIGRATION](../../MIGRATION.md) ve brief kayıtlarında 003/005/007/008/011/012'nin geçmiş canlı kabulü; RN giriş ve koro seçimi mevcut. | 004'ün gerçek donanım yolları 25/27; 010'un iki canlı davet reddi hâlâ açık. Bugün yeniden canlı test edilmedi. |
| Okuma/repertuvar | 018–022 yerel korumalı okuma, gerçek yerel servis ve native PDF/web uyumluluğu; 023–027 anotasyon temeli ve foreground ses; 052–060 altı özel dosya ailesinin R2 okuma/yazma yolu için kod ve göçler. | Native anotasyon yazma/güvenli senkronizasyon/çevrimdışı akış ve gerçek cihaz pilotu bitmedi. Yerel R2 kodu production cutover değildir. |
| Mobil kabuk/WebView | 028–033 köprü, oturum, rol/dosya ve bileşik yaşam döngüsü; 034–037 bildirim sözleşmesi/tap yolu. | Gerçek native push kaydı/teslimi, yetkili telefon ve imzalı beta kabulü yok. |
| Chat, ödevler, ana sayfa | 038–051 chat yetki/okuma/gönderme/temel eylemler ve yıldız yerel kabulü; web'de ödev/ana sayfa mevcut. | Native chat'in medya, yönetim, bazı sosyal/presence akışları; native ödevler/ana sayfa açık. |
| Drive'dan çıkış/yayın | 053–060 özel R2 erişim kodu; 061–064 yerel yayın zinciri, altı aile envanteri, sınırlı kopyalama ve manifest hazırlığı. [WF-009](../briefs/WF-009-controlled-delivery-execution-queue.md) sekiz kapılı sırayı kaydetti. | Hesap/bucket/token, hosted şema/Edge, gerçek envanter/kopya, aktivasyon/geri dönüş ve Drive bağımlılığını kaldırma **NOT RUN**. Eksik yerel aktivasyon/uzlaştırma işlemi sıradaki uygulama işi. |
| Ticari/mağaza | [Kararlar](../../KARARLAR.md) #28–31 Android-first aynı ürün, Supabase + özel R2, ilk beş üye ücretsiz ve web ticaret yönünü belirliyor. | Ücret/üye sayma yaşam döngüsü, hesap-veri silme, iki platform cihaz kabulü, mağaza hesapları ve yayın kanıtı açık. Beta bitiş hedefi değildir. |

## Bugünkü doğrulamalar

| Katman | Sonuç | Kanıt ve anlamı |
|---|---|---|
| Web/ortak kod | **PASS** | 25 Eylül `pnpm check`: lint, TypeScript, 90 test dosyası/797 test, servis çalışanı sözdizimi ve Next üretim derlemesi geçti. Bu E2E/canlı DB/deploy değildir. |
| RN mobil | **PASS** | `apps/mobile` altında `npm run typecheck && npm test -- --runInBand`: 49 paket/288 test geçti. `SafeAreaView` ve Node `punycode` kullanımına ilişkin uyarılar var; test başarısızlığı değiller, yükseltme borcu. |
| Web tarayıcı E2E | **KISMÎ / ortam engeli** | `pnpm test:e2e`: 30 testin 4 API testi geçti; 26 arayüz testi, gereken Playwright Chromium başlatılabilir dosyası bulunmadığı için uygulama adımına ulaşmadan başarısız oldu. Bu, arayüzün geçtiğini de bozuk olduğunu da kanıtlamaz. Denetim için yeni tarayıcı indirilmedi. |
| Gerçek servis/cihaz/yayın | **NOT RUN** | Hosted DB/Edge/R2/Google; fiziksel Android/iOS, imzalı beta, canlı web ve mağazalar bu denetimde çalıştırılmadı. Eski brief'lerin tarihli kanıtları bugünkü test sayılmaz. |

## Ajan kurallarına uyum

Temel kurallar [AGENTS.md](../../AGENTS.md), [geçiş rehberi](../gecis-rehberi.md),
[çalışma düzeni](../ai-calisma-duzeni.md) ve [teslim planının kaynak sınırlarında](../mobil-teslim-plani.md#bounded-execution-and-resource-controls):
tek doğrulanabilir brief sonucu, tek yazıcı, küçük/ayrı kod-belge commit'leri, gerekli yerel
kapılar, 10 GiB boş alan tabanı, Android-first/iOS'u kilometre taşlarında gruplama ve canlı
işlemler için ayrı yetki. Son 15 commitin dosya kapsamı incelendi: 061–064 uygulama ve kabul
belgeleri ayrı commit'lerde; WF-009 belge commit'i. Bugünkü denetim hiçbir push/hosted işlem
yapmadı ve ilgisiz kirli dosyayı sahnelemedi. Bu gözlem tüm tarihsel commitlerin kusursuz
olduğunu kanıtlamaz.

**Uyumsuz/güncellenecek işaretler:** `AGENTS.md`'deki “051'i çöz” yönlendirmesi 051 kabulünden
önceki sıra; `MIGRATION.md` chat tablosu yıldızı hâlâ bekliyor gösteriyor ve “sıradaki kritik
kapı R2 kararı” ifadesi, sağlayıcı beklerken yapılabilecek yerel aktivasyon işlemini atlıyor.
Güncel [handoff](../agent-handoff.md), [aktif bağlam](../../memory-bank/activeContext.md) ve
[kontrollü sıra](../mobil-teslim-plani.md#controlled-execution-queue--24-september-2026) daha doğru.
Handoff/aktif bağlam 80/67 satırla hedeflenen 80 satır sınırında. Handoff'un 051 için 287 test
sayısı tarihsel; bugünkü toplam 288. Bu belge kaymaları yeni ajanı yanlış işe yönlendirebilir.

## Disk, büyük dosyalar ve yerel güvenlik

| Yer | 25 Eylül ölçümü | Değerlendirme |
|---|---:|---|
| Dosya sisteminde kullanılabilir alan | yaklaşık 38–39 GiB | 10 GiB çalışma tabanının üstünde. Testler sırasında da altına inilmedi. |
| Proje klasörü | 4,3 GiB | Büyük kısmı kurulu bağımlılık; kopya repo/build yığını bulunmadı. |
| Kök `node_modules` / mobil `node_modules` | 1,5 / 2,4 GiB | Mevcut çalışan kurulum; “geçici çöp” diye silinmemeli. |
| `.git` / `docs` / `.venv` | 296 MiB / 6,7 MiB / 27 MiB | Kaynak geçmişi ve küçük kayıtlar; depoyu şişiren kanıt görselleri yok. |
| Proje kökündeki tarihli SQL yedekleri | yaklaşık 2 MiB | Git tarafından yok sayılıyor; iki yedekte veri ifadeleri bulundu. Körlemesine silinmemeli. |
| Depo dışı CoreSimulator / Genova Android AVD | 9,8 / 2,2 GiB | Asıl büyük kalıcı alan burada. Üç iPhone simülatör verisi yaklaşık 3,0/3,0/3,4 GiB; sahiplik/başka proje ihtiyacı doğrulanmadan silinmedi. Android AVD `genova004_api36` proje ilişkili görünüyor, fakat tekrar kullanım kararı yok. |
| Bu denetimde üretilen `.next`, coverage, E2E sonuçları | en yüksek 530 MiB + küçük raporlar | Son kontrollerden sonra kaldırıldı; yeni tarayıcı/VM/AVD kurulmadı. |

**İzin riski:** `.env`, `.env.local` ve `.env.local.github` `-rw-rw-rw-` (herkes yazabilir);
`apps/mobile/.env` ve veri içerebilen SQL yedekleri `-rw-r--r--` (herkes okuyabilir).
Bu dosyalar Git'e dahil değil; içerikleri rapora alınmadı. Yine de yerel kullanıcılar veya
çalışan süreçler açısından yetki gereğinden geniş. Sahiplik ve kullanım kontrolü sonrası
gizli yapılandırma/yedekler için en az yetkili dosya izinleri ayrı, küçük bir güvenlik işi
olarak düzeltilmeli. Dosya izinleri bu salt denetimde değiştirilmedi.

## Öncelikli sonraki üç sonuç

1. **Yayın kaynağını sabitle:** 171 commitlik farkı aday paketler halinde incele; uzaktaki CI
   ve canlı web'in kesin sürümünü doğrula. DB → Edge → web sırasını ve eski istemci uyumunu
   belirlemeden toplu push yapma.
2. **Yerel kritik boşluğu kapat:** 063 envanteri ve 062 doğrulanmış kopya günlüğüne bağlı,
   yanlış/yarım aile etkinleştirmesini reddeden aktivasyon-uzlaştırma işlemini bir brief'te
   uygula; izole veritabanında down/ret testleriyle kanıtla. Aynı küçük iş kuyruğunda eski
   ajan yönlendirmelerini düzelt ve yerel gizli dosya izinlerini sahipliği doğrulayarak ele al.
3. **Dış kabulü sırayla aç:** Ürün sahibinin R2 EU/Automatic seçimi ve hesap/harcama yetkisi,
   sonra güncel yedek + geri yükleme, hosted geçiş, sınırlı gerçek kopya/geri dönüş, imzalı
   Android telefon betası. Kalan native özellikler ve iki mağaza ayrı kabul kapılarıdır;
   bütçe ve tarih kanıtsız vaat edilmez.

Bu rapor yalnız bugünkü yerel denetimin anlık görüntüsüdür. Sonraki kod değişikliği, test
ortamı, uzak yayın veya cihaz sonucu bu tabloyu yeniden doğrulamayı gerektirir.
