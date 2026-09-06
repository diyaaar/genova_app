# Genova — çalışan mobil ürüne teslim planı

5 Eylül 2026. Kullanıcı, önerilen yönü ve proje kurallarının buna göre düzenlenmesini
onayladı. Bu kayıt planlama kapsamıdır; ürün kodu veya canlı işlem yapılmış sayılmaz.
6 Eylül güncellemesi: pilot önceliği ve İngilizce ajan devri onaylandı.
Güncel karar: [KARARLAR #21–22](../KARARLAR.md); #19'un eski sırası tarihseldir.
Durum: [MIGRATION](../MIGRATION.md).

## Hedef ve ilk başarı

İlk somut hedef: telefonda kurulu ürün uygulamasında **giriş → koro seçimi →
repertuvar → PDF ve mevcut anotasyonları okuma → çıkış** akışını çalıştırmak.
Bir şef ve bir koristin pilot denemesiyle doğrulanır. Bu, mağaza yayını değildir.
Web çalışmaya devam eder. Çok korolu ürün mağazadan önce tamamlanır; ticari
yönetimin tüm ayrıntıları ilk cihaz denemesinin önkoşulu değildir.

## Doğrulanmış başlangıç

- 001/002 teknik spike'lar geçti; Expo ürün çalışma alanı henüz yok.
- 003/005 canlı: koro izolasyonu, çoklu üyelik ve oturuma bağlı aktif koro.
- 006 eski yetkisiz oluşturma/yazı yollarını kapattı. 27 hesabın kabul edilmiş
  parola riski giderilmiş sayılmaz; yeni davetlerde ortak başlangıç parolası kullanılmaz.
- 007 DB ve Edge canlı; allow-list boş, authenticated Edge başarı kabulü açık.
- 008 davet/üyelik yerel paketi hazır; canlı kabul bekliyor. 009 ile Auth SMTP,
  production dönüş adresi ve yanıt aktarımı canlıda kabul edildi. Gerçek Auth
  doğrulama e-postası teslimi açık; temel plan-limit başlamadı.
- Railway ayrı hazırlık ortamı; Drive dosyaları production'dan taşınmış değil.

## Sıra, sınır ve kabul

Her satır gerektiğinde küçük brief'lere ayrılır. Bir sonraki adıma geçiş somut kabul
kanıtıyla olur; brief numarası kronolojik sıra anlamına gelmez.

| Sıra | İş ve kapsam | Çıkış ölçütü | Bilinçli ertelenen |
|---|---|---|---|
| 1 | 008: minimum davet/üyelik. Şef kendi korosuna davet oluşturur/iptal eder; doğrulanmış alıcı kabul eder. Mevcut ve yeni Auth kullanıcısı yolu açıkça tanımlanır. | Süreli, tek kullanımlık, doğru alıcıya bağlı davet; atomik üyelik; tekrar/iptal/yanlış hesap/yanlış koro reddi. Rol yükseltme kapalı, iki koro izolasyonu testli. | Toplu aktarım, gelişmiş yönetim paneli, otomatik kampanya e-postaları. |
| 2 | 004: aynı depoda Expo ürün alanı, güvenli giriş, üyelik çözümü, koro seçimi ve en küçük kabuk. | Tek üyelik otomatik; çok üyelikte seçim zorunlu; sıfır üyelikte anlaşılır ekran; uygulama yeniden açılınca oturum doğru; koro değişimi/çıkışta özel cache temizlenir. iOS/Android derlemesi, en az bir gerçek telefon denemesi. | Push, player, beş boş sekme, tüm WebView ekranları. |
| 3 | Repertuvar okuma brief'i: liste, yetkili PDF erişimi, zoom/kaydırma ve mevcut anotasyonların ortak TS sözleşmesiyle gösterimi. | Girişten PDF okumaya kesintisiz cihaz akışı; büyük/bozuk PDF, zayıf ağ, süresi dolan URL, bilinmeyen anotasyon ve koro değişimi testli. | Yeni çizim araçları, tüm repertuvar yönetimi, toplu refactor. |
| 4 | Küçük pilot: şef + korist, temsilî içerik, iOS ve Android. | Görev tamamlanabiliyor; engelleyici hatalar kapalı; açılış süresi/bellek/çökme gözlemleri cihaz, dosya ve ağla birlikte kayıtlı. | Kanıtsız performans yüzdesi veya genel yayın iddiası. |
| 5 | Minimum plan-limit brief'i: elle atanabilen plan ve sunucuda üyelik/depolama kullanım sınırı. Somut pilot engeli kanıtlanırsa gerekli en küçük parça öne alınır. | Limit sınırında ve eşzamanlı işlemde aşım reddi; tekrar/başarısız işlem kullanım sayısını bozmaz; mevcut koroya engel oluşturmayan geçiş doğrulanır. Mağazadan önce tamamlanır. | Ödeme, fatura motoru, yükseltme ekranı, gelişmiş raporlama. |
| 6 | Pilot bulgularıyla ayrı brief'ler: tablet/stylus yazma, ses, güvenli WebView köprüsü; dosya deposu geçişi. | Web/mobile anotasyon uyumu; gerçek kalem/avuç testi; ses seek/yenileme; ortak çıkış; taşıma checksum/izin/geri dönüşü. | Çalışan alanları sırf yeni kurala uydurmak için baştan yazma. |
| 7 | Mağaza adayı: gerekli özellikler, gizlilik/hesap silme/demo, yayın kimliği, erişilebilirlik ve cihaz regresyonu. | Sürüm ve dağıtım doğrulanmış; güncel hesap bazlı Apple/Play gereklilikleri tamam; beta ve genel yayın ayrı kayıtlı. | Mağaza kabulünü build sonucundan çıkarma. |

## Küçük işlerin başlangıç kararları

- 008 başlamadan mevcut üyelik/onay modelini koddan doğrula. Davet rolünü varsayılan
  `Korist` ile sınırla; Şef devri ayrı iş olsun. Token saklama, süre, tekrar gönderme,
  e-posta/deep-link ve atomiklik sözleşmesini brief'e yaz. Gerçek e-posta gönderimi
  için alıcı ve işlem yetkisini ayrıca doğrula; yerel tasarım/test bunu beklemez.
- Plan-limit sayıları eski maliyet belgesinden alınmaz. Mevcut kullanım salt okunur
  ölçülür; önerilen eşikler ve mevcut koro geçişi somutlaştırılır. Üyelikte bekleyen
  davetin kota hesabı, dosyalarda rezervasyon/tamamlama/iptal davranışı açıklanır.
- 004'te önerilen ürün yolu `apps/mobile/`; kesin workspace/paket yöneticisi ve
  sürümler kurulum başında doğrulanır. Ortak kod yalnız gerçek iki istemci ihtiyacında
  çıkarılır; Next/DOM bağımlılığı native pakete sızmaz.
- Repertuvar brief'i mevcut yetkili dosya yolunu inceler. Mobilde erişilebilir ortak
  sunucu sözleşmesi yoksa yalnız gereken yol uyarlanır. İstemciye Drive sırları verilmez.
- Gerçek operatör ve ikinci koro ataması 007 kabulü için ayrı veri işlemidir.
  İzole test kullanıcılarıyla geliştirme bu kimlik kararını beklemek zorunda değildir.

## İşin büyümesini önleme

Her yeni altyapı işi şu soruyu yanıtlar: **Hangi cihaz akışını veya yayın kapısını
engelliyor, mevcut çözüm neden yetmiyor, en küçük giderim nedir?** Yanıt yoksa
ilk mobil akışın önüne alınmaz. 008/010 kabulünden sonra 004'e geçilir; plan-limit
ilk cihaz denemesini otomatik bekletmez. 010 dış erişim/yetki nedeniyle beklerse,
uygulama yetkisi kapsamında 004'ün bağımsız yerel işleri izole testlerle ilerleyebilir.
010 ve gerçek kullanıcı kabulü açık kalır; yerel ilerleme canlı kabul yerine yazılmaz.

Railway tercihi korunur; Cloudflare karşılaştırması veya genel hosting taşıması ilk
telefon denemesini bloke etmez. Drive'dan çıkış ürün hedefidir: pilot verisiyle boyut,
erişim ve maliyet ölçülüp ayrı göç yapılır. Mağaza adayından önce bu hedef kapatılır
veya kullanıcı tarafından açıkça yeniden kapsamlandırılır. Hiçbir dosya kendiliğinden silinmez.

Chat, ödev ve ana sayfanın native hedefi korunur. Pilot sonrasında mağaza adayında
hangilerinin gerektiği özellik envanteriyle belirlenir; ertelenen özellik sessizce kaldırılmaz.
Kalıcı WebView ekranları için oturum/navigasyon/erişilebilirlik yine kabul gerektirir.

## Takip ve test

- Her brief: kullanıcıya görünen sonuç, bağımlılık, izinli modüller, en küçük kabul,
  ertelenenler ve sonraki tek adım. Uygulama dosyalarının sayısı başarı ölçütü değildir.
- Web/ortak kod değişiminde `pnpm check`; RN değişiminde ürün testleri ve ilgili
  platform kontrolü; DB/Edge değişiminde izin/izolasyon/geri dönüş kabulü.
- Salt belge değişiminde bağlantı, çelişki ve diff kontrolü yeterlidir.
- Cihaz kanıtı: build/commit, platform/cihaz, senaryo, beklenen/gerçekleşen sonuç,
  hata ve tekrar adımı. Simülatör gerçek stylus/arka plan ses kanıtı değildir.
- Takvim garantisi verilmez. İlk cihaz akışından sonra ölçülen süre ve pilot
  bulgularıyla teslim tahmini güncellenir; eski 4–5 ay tahmini aktif taahhüt değildir.

## Açık kararların doğru zamanı

Şimdi: 008/010 kabulü ve 004 kurulumu. Kurulumda: çalışma alanı/sürümler.
Plan-limit: somut pilot engeli yoksa pilot sonrasında, mağaza öncesinde.
İlk gerçek koro işleminde: operatör/kurucu kimliği. Pilot sonrasında: ölçülmüş
dosya sağlayıcısı ve mağaza adayının özellik kapsamı. Yayında: şirket/yayın hesabı
kimliği ve güncel mağaza koşulları. Bu belge bunları verilmiş karar gibi uydurmaz.
