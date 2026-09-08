# Genova — çalışan mobil ürüne teslim planı

5 Eylül 2026. Kullanıcı, önerilen yönü ve proje kurallarının buna göre düzenlenmesini
onayladı. Bu kayıt planlama kapsamıdır; ürün kodu veya canlı işlem yapılmış sayılmaz.
6 Eylül güncellemesi: pilot önceliği ve İngilizce ajan devri onaylandı.
8 Eylül güncellemesi: 008/011/012 canlı; 010 6/7; 004 25/27. Ürün sahibi repertuvar/PDF
ile başlayan yerel çalışma paketlerini yetkilendirdi. Dış yazılar yine ayrı onay ister.
Güncel karar: [KARARLAR #21–22](../KARARLAR.md); #19'un eski sırası tarihseldir.
Durum: [MIGRATION](../MIGRATION.md).

## Hedef ve ilk başarı

İlk somut hedef: telefonda kurulu ürün uygulamasında **giriş → koro seçimi →
repertuvar → PDF ve mevcut anotasyonları okuma → çıkış** akışını çalıştırmak.
Bir şef ve bir koristin pilot denemesiyle doğrulanır. Bu, mağaza yayını değildir.
Web çalışmaya devam eder. Çok korolu ürün mağazadan önce tamamlanır; ticari
yönetimin tüm ayrıntıları ilk cihaz denemesinin önkoşulu değildir.

## Doğrulanmış başlangıç

- 001/002 teknik spike'lar geçti.
- Expo product workspace exists at `apps/mobile/`. [004](briefs/004-rn-kabuk-ve-giris.md)
  is 25/27: CI and live invitation acceptance passed; hardware keychain/keystore and the
  real-phone flow are NOT RUN and postponed by the owner. They are not the next action.
- 003/005 canlı: koro izolasyonu, çoklu üyelik ve oturuma bağlı aktif koro.
- 006 eski yetkisiz oluşturma/yazı yollarını kapattı. 27 hesabın kabul edilmiş
  parola riski giderilmiş sayılmaz; yeni davetlerde ortak başlangıç parolası kullanılmaz.
- 007 DB ve Edge canlı; authenticated başarı yolu kabul edildi. Test korosu silindi,
  platform operator allow-list kaydı korundu.
- 008 canlı ve temel ürün kabulü geçti. 010 altı/yedi: iptal edilmiş bağlantı ve yanlış
  hesap reddi ürün üzerinden NOT RUN; fikstür temizlendi. 009 ve 011 tamamlandı.
- 012 canlı ve ürün üzerinde doğrulandı; down-migration'a karşı yerel izole regresyon
  kanıtı da geçti. Temel plan-limit başlamadı.
- Railway ayrı hazırlık ortamı; Drive dosyaları production'dan taşınmış değil.

## Sıra, sınır ve kabul

Her satır gerektiğinde küçük brief'lere ayrılır. Bir sonraki adıma geçiş somut kabul
kanıtıyla olur; brief numarası kronolojik sıra anlamına gelmez.

| Sıra | İş ve kapsam | Çıkış ölçütü | Bilinçli ertelenen |
|---|---|---|---|
| 1 | 008/010 minimum davet/üyelik | 008 canlı; 010'un altıncı ölçütü KISMÎ, iki ürün yolu NOT RUN. Bu açık kayıt korunur; yeniden fikstür kurmak ayrı canlı yetkidir. | Toplu aktarım, otomatik kampanya e-postaları. |
| 2 | 004 native giriş/koro seçimi | 25/27. İki cihaz ölçütü ertelendi; diğer katmanlar geçti. | Donanım ölçütlerini yerel/emülatör kanıtıyla kapatma. |
| 3 | Native repertuvar sözleşmesi ve envanteri | Liste, dosya erişimi, PDF, anotasyon ve cache sınırları kod/şema üzerinden tanımlı; sonraki uygulama brief'leri küçük ve testlenebilir. | Ürün kodu, canlı işlem, sağlayıcı göçü. |
| 4 | Native repertuvar kataloğu | Seçili koroya ait liste ve boş/yükleniyor/hata durumları izole testli; koro değişiminde eski veri gösterilmiyor. | PDF, çizim ve yönetim yazıları. |
| 5 | Ortak güvenli dosya erişimi | Web ve native aynı Edge sözleşmesini kullanır; auth, tenant, kapsam, MIME/range, süre sonu ve hata yolları izole DB/çekirdek testleriyle kanıtlı. | Canlı deploy/migration ve Drive taşıması. |
| 6 | PDF + salt okunur anotasyon | Sayfa görüntüsü, zoom/kaydırma ve mevcut anotasyonlar ortak TS sözleşmesiyle gösterilir; bilinmeyen tür fail-closed/uyumlu davranır. | Stylus yazımı, ses ve gerçek donanım kabulü. |
| 7 | Cihaz pilotu | Şef + korist akışı gerçek iOS/Android cihazlarda kanıtlanır; yalnız ayrı donanım yetkisi gelirse çalıştırılır. | Simülatörü gerçek cihaz sayma. |
| 8 | Yazma anotasyonları ve ses | Web/native şema uyumu, çevrimdışı/yeniden deneme, çakışma, ses seek ve arka plan davranışları ayrı brief'lerde testli. | Kanıtsız performans iddiası. |
| 9 | Kalıcı WebView köprüsü | Duyuru, korist, profil/değişiklik ve devamsızlık ekranlarında ortak oturum, çıkış, geri navigasyon ve dosya geçişi doğrulanır. | Bu ekranları native yeniden yazma. |
| 10 | Chat, ödevler ve ana sayfa | Her modül kendi veri/Realtime/push/sıfır-veri/hata sözleşmesiyle native olur; mevcut web korunur. | Tek brief'te toplu yeniden yazım. |
| 11 | Minimum plan-limit | Üyelik/depolama limitleri sunucuda ve eşzamanlılık altında doğru; mağazadan önce tamamlanır. | Otomatik ödeme/fatura motoru. |
| 12 | Drive'dan kontrollü çıkış | Tam envanter, checksum, yetki, çift-okuma/geçiş ve gerçek restore/rollback kanıtı. Ayrı sağlayıcı ve harcama onayı gerekir. | Dosya silme veya production taşımasını yerel hazırlık sayma. |
| 13 | Mağaza adayı ve yayın | Güncel resmi Apple/Play kuralları, gizlilik/hesap silme/demo, erişilebilirlik, imzalama, beta ve yayın kapıları kanıtlı. Push/deploy/harcama ayrı yetkilidir. | Build sonucunu mağaza kabulü sayma. |

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

Şimdi: native repertuvar sözleşmesi ve katalog yerelde kabul edildi; ortak güvenli dosya erişimi sırada.
010'un eksik ürün yolları ve 004 donanım ölçütleri açık kalır fakat sıradaki iş değildir.
Plan-limit: somut pilot engeli yoksa pilot sonrasında, mağaza öncesinde. Pilot sonrasında: ölçülmüş
dosya sağlayıcısı ve mağaza adayının özellik kapsamı. Yayında: şirket/yayın hesabı
kimliği ve güncel mağaza koşulları. Bu belge bunları verilmiş karar gibi uydurmaz.
