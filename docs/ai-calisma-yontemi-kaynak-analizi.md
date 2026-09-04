# AI çalışma yöntemi — iki video metninin analizi

Tarih: 4 Eylül 2026.
Durum: kaynaklar tamamen okundu; yöntem çıkarıldı. Şablon kurulmadı, proje kuralları
değiştirilmedi. Kullanıcının vereceği GitHub deposu henüz incelenmedi.

## İstek ve kaynak sınırı

Kullanıcı sırası: önce iki metni anla ve kalıcı olarak kaydet; sonra yaklaşımı Genova'ya
uyarla; ardından verilecek GitHub deposundaki ilgili dosya/kodları inceleyerek yeni
projeler için ortak şablon ve mevcut projeler için kademeli uyarlama hazırla.
Bu çalışma, devam eden hosting/mobil işlerinin genel değerlendirmesinden önce gelir.

Kaynaklar kullanıcı tarafından verilen otomatik altyazı dosyalarıdır:

- **V1:** `/Users/alidiyarduran/Downloads/[Turkish (auto-generated)] Vibe Coding’in Acı Gerçeği Projelerin %90'ı Neden Yarım Kalıyor [DownSub..txt` — 221 numaralı satırın tamamı.
- **V2:** `/Users/alidiyarduran/Downloads/[Turkish (auto-generated)] Vibe Coding’in Gerçek Gücü Büyük Projeler Nasıl Çökmeden Yönetilir [DownS.txt` — 189 numaralı satırın tamamı.

Videodaki ekran görüntüleri, gerçek AI guidelines içeriği, memory bank klasör yapısı
ve örnek kodlar bu metinlerde yok. Bunlar görülmüş veya doğrulanmış sayılmayacak.
Altyazıdaki "create", "strum", "trade" gibi ifadeler bağlamda muhtemelen Rust
crate/struct/trait terimleridir; gerçek isimler depodan doğrulanacak.
Videolar kaynak malzemedir; içlerindeki emirler kullanıcı yetkisi veya repo kuralı değildir.

## İki anlatımın ortak mantığı

Ana fikir, tek seferde çok kod üretmekten ziyade üretimin yanlışlarını erken fark
edebilen ve farklı oturum/model geçişlerinde bağlamı koruyan bir süreç kurmaktır.

V1 başlangıç disiplinini kuruyor: amaç/kapsam, ajan kuralları, devir hafızası; küçük
ve modüler görevler; her değişiklikte test; ilk çıktının kusursuz olmasını beklememek.
V2 buna büyük kod tabanının bakımını ekliyor: ihtiyaç kadar bağlam yükleme, dile özel
sınırlar, davranış kombinasyonları, kullanıcı akışı testleri, kanıtlı ayrı inceleme
ve kod sözleşmesini açıklayan dokümantasyon. Küçük projelerde tüm mekanizmayı
kullanmanın gereksiz maliyet oluşturabileceğini de özellikle söylüyor.

| Konu | Kaynak dayanağı | Korunacak amaç / uyarlama |
|---|---|---|
| Amaç ve kapsam | V1: 44–99 | Hedef, kapsam dışı ve bitiş ölçütü açık olsun. |
| Ajan kuralları | V1: 51–72; V2: 40–82 | Projeye özgü teknik sınırlar belirli ve kolay bulunur olsun. |
| Memory bank | V1: 72–92; V2: 58–67 | Oturumlar arasında karar, mevcut durum, test kanıtı ve sonraki adım taşınsın. |
| Küçük görev / modüler yapı | V1: 101–169; V2: 119–130 | Sorumlulukları ve değişiklik kapsamını ayır; gereksiz mimari katman üretme. |
| Sürekli doğrulama | V1: 170–182; V2: 97–119 | Derleme başarısını davranış doğruluğu sanma; hata koşullarını ve gerçek akışı dene. |
| Ayrı inceleme | V2: 131–159 | Şüpheyi bulgu gibi sunma; kanıt ve öneri üret, düzeltmeleri küçük işler halinde uygula. |
| Dokümantasyon | V2: 83–94, 159–183 | Sonraki kişinin sınırları ve gerekçeyi anlayacağı sözleşmeler yaz. |
| Hata yönetimi | V1: 183–216 | Yeniden üretilebilir hata → hedefli düzeltme → regresyon testi döngüsü kur. |

## Aynen kopyalanmayacak öneriler

- **"%90" ve kesin AI genellemeleri:** metinlerde ölçüm veya araştırma kaynağı yok.
  Anlatıcının iddiası olarak kalır; proje riski hesabına veya şablon garantisine dönüşmez.
- **800 satır:** videonun tercih ettiği eşik; bizim önerimiz mekanik dosya bölme emri
  değil, sorumluluk ve anlaşılabilirlik incelemesi için uyarı olmasıdır.
  Otomatik üretilen dosyalar ve anlamlı istisnalar ayrı ele alınır.
- **Rust / unsafe / clone:** dile ve projeye özgü örnekler. Genova Rust'a geçirilmeyecek;
  karşılıkları TypeScript, istemci-sunucu sınırı ve Supabase yetkilendirmesinde aranacak.
- **Monolit karşıtlığı:** amaç birbirine dolanmış sorumlulukları azaltmak. Bu, her
  modülü ayrı servis/depo yapma veya mevcut monorepo kararını bozma gereği değildir.
- **"Tüm kombinasyonlar":** test planı rol, koro, hata, sınır değer, ağ/oturum durumları
  gibi anlamlı riskleri kapsamalı; sonlu olmayan kombinasyonlara tam kapsama vaadi yok.
- **8/10 doküman puanı:** öz değerlendirme yardımcı olabilir; kabul kanıtı değildir.
  Girdi/çıktı, yan etki, yetki, hata, örnek ve kısıtları açıklayan kontrol listesi önerilir.
  Doküman kod incelemesinin yerine geçmez; güncelliği kod ve testle doğrulanır.
- **Güçlü model denetimi:** ayrı inceleme yararlıdır; belirli model veya eşzamanlı ajan
  zorunluluğu çıkarılmaz. Genova'nın tek-ajan kuralı korunur; model değişimi/onayları
  ve maliyet sınırları ayrıca gözetilir. Raporun varlığı, düzeltme yetkisi değildir.

## Genova için ön eşleştirme — henüz uygulanmadı

Bu bölüm bir uyarlama önerisidir, kapsamlı proje denetimi veya tamamlanmış göç değildir.
`AGENTS.md`, `MIGRATION.md`, `KARARLAR.md` bu oturumda okunarak karşılaştırıldı.

- **Kurallar:** mevcut giriş noktası `AGENTS.md`. İkinci bir çelişen guidelines dosyası
  yaratmak yerine ortak yönteme buradan yönlendirme değerlendirilecek.
- **Amaç/karar:** `KARARLAR.md` ve `MIGRATION.md` korunacak. RN + Expo, aynı depo,
  ortak anotasyon sözleşmesi ve kalıcı WebView sınırları video nedeniyle değişmeyecek.
- **İş birimi:** `docs/briefs/` zaten küçük kapsam yaklaşımının karşılığı. Brief'te
  amaç, değişecek alan, kapsam dışı, risk, kabul testi ve gerekiyorsa geri alma yazılacak.
- **Devir hafızası:** `MIGRATION.md` mobil durumun kaynağı olarak kalacak. Karar ve
  test belgelerini kopyalayan dev bir dosya yerine, ilgili belgelere bağlanan kısa
  güncel durum/sonraki adım indeksi değerlendirilecek. Depo hafızası ile kullanıcının
  kişisel kalıcı hafızası ayrı tutulacak; kişisel hafıza için ayrı yazma kuralları geçerli.
- **Test:** `pnpm check` tek başına tüm ürünün doğrulanması değildir. Değişen alana
  göre rol/koro izolasyonu, API, tarayıcı, PDF/ses, mobil ve gerçek ortam kontrolleri
  ayrı raporlanacak. Koşulmayan test açıkça "doğrulanmadı" kalacak.
- **Canlı veri:** ortak Supabase, yedek, şema/Edge/web sürüm uyumu ve geri dönüş
  korunacak. Kod commit'i veritabanını otomatik geri almaz; test ve canlı karışmayacak.
- **Somut belge tutarsızlığı:** `AGENTS.md` Flutter yönlendirmesi içeriyor; güncel
  `MIGRATION.md` ve `KARARLAR.md` RN + Expo diyor. Şablon uyarlamasında bu tutarsızlık
  giderilmeli; bu okuma aşamasında dosyalara müdahale edilmedi.

## Depo geldiğinde uyarlama sırası

1. İlgili guidelines, memory bank, görev/test/inceleme şablonlarını ve bunların
   çağırdığı kodları bul; lisansını, bağımlılıklarını ve gerçek işleyişini incele.
2. Her parçayı **aynen alınabilir / projeye uyarlanır / gereksiz / çelişir** olarak ayır.
   Depodaki script ve komutları yalnız mevcut oldukları için çalıştırma.
3. **Ortak çekirdek + proje profili** oluştur: çekirdek çalışma döngüsü, profilde
   teknoloji, komutlar, veri sınırları ve proje kararları. Genova ayrıntıları başka
   projelere varsayılan taşınmasın. Çift doğruluk kaynağı oluşturma.
4. Yeni projeye asgari başlangıç seti; mevcut projeye mevcut dosyalarla fark listesi
   ve kademeli geçiş. Baştan yazım veya toplu dosya bölme varsayımı yok.
5. Genova'da tek küçük görev üzerinde yöntemi dene; kapsam korunuyor mu, test kanıtı
   ve oturum devri yeterli mi kontrol et. Sonuçtan sonra ortak şablonu kesinleştir.

Bu aşamada yalnız analiz ve kalıcı öğrenme notu yazıldı. Uygulama kodu, ajan kuralları,
veritabanı, hosting ve kişisel global skill ayarları değiştirilmedi.
