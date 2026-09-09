# Mobil Geçiş — Durum Defteri

> Bu dosya geçişin tek doğru kaynağıdır. Yeni bir oturum önce burayı okur.
> Durum değişikliği, koddan ayrı ama birlikte devredilen belge commit'ine işlenir.
> Güncel teslim sırası: [mobil teslim planı](docs/mobil-teslim-plani.md), karar #21.

**Ajan başlangıcı:** [Geçiş rehberini](docs/gecis-rehberi.md) oku; kapsam, kaynak,
yetki ve test kapılarını ilgili brief'te kaydet. Bu yönlendirme ürün geçişini başlatmaz.

**Şu an:** RN spike **TAMAMLANDI ve GEÇTİ** (3 Eyl). Karar kesin: React Native + Expo.
**Faz 1 — kiracı şeması (`choir_id`): TAMAMLANDI ve CANLIDA (4 Eyl).**
34 kiracı tablosu, 165 mevcut politika + 34 restrictive sınır, web/Edge uyarlaması,
hosted izolasyon ve oturumlu duman testi geçti. Kanıt: `docs/briefs/003-dogrulama.md`.
**005 — çoklu üyelik ve aktif koro: TAMAMLANDI ve CANLIDA (5 Eyl).**
Auth oturumuna bağlı seçim, web/Next/Edge uyarlaması, cache ayrımı ve güvenli down
taze yedek kopyasında geçti; canlı DB migration, hosted test, Edge v15 ve web yayını doğrulandı.
Kanıt: `docs/briefs/005-coklu-uyelik-aktif-koro.md`.
**007 — operatör kontrollü koro oluşturma: TAMAMLANDI ve CANLIDA (8 Eyl kabul).**
DB `20260905160539`, `create-choir` Edge v1 ve hosted 003/005/006/007 testleri
geçti. Kimliği doğrulanmış gerçek operatör başarı yolu canlıda kabul edildi; test korosu
ve ilgili fikstür daha sonra kontrollü temizlikte kaldırıldı. Tek operator allow-list
kaydı korundu.
Kanıt: `docs/briefs/007-operator-kontrollu-koro-olusturma.md`.
**004 — Expo ürün alanı, native giriş ve koro seçimi: KISMÎ, 25/27 (8 Eyl).**
`apps/mobile/` kuruldu (Expo SDK 57, kendi npm lockfile'ı ve test kapısı). Giriş, güvenli
oturum saklama, sıfır/tek/çok üyelik çözümü, sunucu doğrulamalı koro seçimi, koro
değişiminde cache temizliği ve çıkış izole testlerle geçti: `npx tsc --noEmit && npm test`
(4 paket / 35 test). 005 sözleşmesi `lib/choir-context-core.ts` ile iki istemcide ortak;
web davranışı değişmedi. Kapılar 6 Eylül'de ürün sahibinin Mac'inde de doğrulandı:
temiz `npm ci` sonrası 35 native test ve `pnpm check` uçtan uca (190 test + `next build`).
Kendi iOS derlememiz `expo run:ios` ile simülatörde çalıştı; giriş/koro/yeniden açma/çıkış
akışı orada elle doğrulandı.
7 September update: own Android debug build and API 36 ARM64 emulator launch passed at
`6d64d16`; signed-out UI and empty-form validation only, using synthetic settings.
Remote CI and live 010 acceptance passed. Hardware keychain/keystore and the real-phone
real-account flow remain NOT RUN and were postponed by the owner; do not make either the next action.
Evidence: [Android build](docs/briefs/004-android-build-2026-09-07.md).
Kanıt ve sınırlar: `docs/briefs/004-rn-kabuk-ve-giris.md`.
**008/010 — davet ve üyelik: CANLIDA KABUL EDİLDİ; 010 KISMÎ, 6/7.**
Oluşturma, kabul ve tek kullanımlık ret ürün üzerinde geçti; iptal edilmiş bağlantı ve yanlış
hesap retleri ürün üzerinden NOT RUN kaldı. Fikstür temizlendi; bu iki yolu tamamlamak yeni bir
canlı test fikstürü ve açık ürün sahibi yetkisi gerektirir.
**011 — davet dönüşü ve şifre sıfırlama: TAMAMLANDI ve CANLIDA, 13/13.**
**012 — çoklu üyelik seçim kilidi: TAMAMLANDI, 10/10.** Canlı düzeltme ve ürün kabulüne ek
olarak SQL regresyonu 8 Eylül'de izole PostgreSQL 17.11 kopyasında sabit gövdede geçti,
down-migration sonrası beklenen iki null satırla kaldı ve düzeltme geri konunca yeniden geçti.
**Hedef:** ~%80 native (React Native + Expo), ~%20 kalıcı WebView. Bu bir ara durum değil, bitiş noktasıdır.

---

## Ekranlar

Satır sayıları yaklaşıktır (ilgili sayfa + bileşen + lib dosyaları).

| Ekran | ≈ satır | Hedef | Durum | Faz |
|---|---:|---|---|---|
| Giriş | 164 | native | yerel uygulandı (004); cihaz kabulü yok | 1 |
| Kabuk (nav, tema, push, mini player) | ~1.000 | native | en küçük kabuk + koro seçimi var (004); nav/tema/push/player bekliyor | 1 |
| Repertuvar | 9.885 | **native** | katalog (014), ortak güvenli dosya yolu (015), PDF/salt okunur anotasyon (016), non-hardware akış (017) ve gerçek yerel servis runtime'ı (018) kabul edildi; gerçek native render, yazma/ses ve canlı pilot bekliyor | 2 |
| Chat | 8.552 | **native** (RN UI ve veri uyarlaması bekliyor) | bekliyor | 3 |
| Ödevler | 5.557 | native | bekliyor | 4 |
| Ana sayfa | ~800 | native | bekliyor | 4 |
| Duyurular | 977 | **WebView — kalıcı** | — | — |
| Koristler | 2.511 | **WebView — kalıcı** | — | — |
| Profil + değişiklik talepleri | 2.038 | **WebView — kalıcı** | — | — |
| Devamsızlık | 1.461 | **WebView — kalıcı** | — | — |

Kalıcı WebView ekranları native yeniden yazılmaz. Oturum, geri navigasyon,
erişilebilirlik ve dosya etkileşimleri cihazda doğrulanır; kayıpsızlık varsayılmaz.

---

## Backend

| Parça | Durum |
|---|---|
| Supabase (auth, realtime, storage) | 003, 005, 007, 008 ve 012 canlı; aktif koro Auth `session_id` ile sunucuda çözülüyor; kabul fikstürü temizlendi, tek operator allow-list kaydı korundu |
| `supabase/functions/drive-manager-v2` | v15 canlı; 005 aktif-koro sözleşmesi, `verify_jwt=true` |
| `supabase/functions/create-choir` | v1 canlı; `verify_jwt=true`; gerçek operatör başarı yolu kabul edildi, test fikstürü daha sonra temizlendi |
| `supabase/functions/choir-invitations` | canlı; `verify_jwt=true`; 008 kabul edildi, 010'un iptal edilmiş bağlantı ve yanlış hesap ürün yolları açık kaldı |
| `supabase/functions/repertoire-file` | yerel kabul edildi (015), **canlıya alınmadı**; bilet üretimi JWT + aktif koro RLS, içerik GET/HEAD kısa ömürlü imzalı bilet kullanır |
| `supabase/functions/link-preview` | canlı |
| `app/api/*` — 27 route, ~5.600 satır | Next.js'te. Ekran native olduğunda o route Edge Function'a taşınır, web de aynı fonksiyona bağlanır. |
| Push (VAPID → FCM/APNs) | Faz 1'de ikinci kanal eklenecek |

---

## Orbiba (masaüstü) — chat kaynağı

`~/Desktop/Orbiba_eco_app/Orbiba_app/mobile` · 208 dart dosyası / 59.454 satır, ayrı bir ürün.
Genova'ya girecek olan `lib/features/dm/` (conversation, dm_message, chat_screen, conversations_screen).

| Katman | Orbiba'da | Genova'da olması gereken |
|---|---|---|
| Chat UI | `flutter_chat_ui` (Dart) | **KULLANILAMAZ** — RN seçildi. Arayüz sıfırdan yazılacak. |
| Taşıma | **Socket.IO + REST (dio)** | **Supabase realtime** — yeniden yazılacak |
| State | `provider` (Dart) | Geçersiz — RN tarafında ayrıca kararlaştırılacak |
| Push | `firebase_messaging` zaten kurulu | Yapılandırma örneği olarak değerli (FCM/APNs kurulumu), kod değil |

**Sonuç (3 Eyl, RN kararından sonra güncellendi):** Orbiba Dart olduğu için **chat arayüzü
kullanılamıyor** — bu, RN kararının bilinen bedeli (`KARARLAR.md` #7). Buna karşılık
`lib/chat.ts`'teki TypeScript iş mantığı paylaşım adayıdır; DOM/Next bağımlılıkları
uyarlama brief'inde ayrılır. Flutter'da o mantık da
yeniden yazılacaktı. Orbiba'dan kalan değer: FCM/APNs kurulum örneği ve mimari referans.
**Faz 3 tahmini 4–5 haftaya çıktı** (önceki 2–3 hafta, hazır UI varsayımıyla hesaplanmıştı).

## KARAR — istemci teknolojisi: React Native + Expo

Karar 2 Eyl'de verildi, 3 Eyl'de spike ile doğrulandı. Karşılaştırma kayıt için burada:

Bu tarihsel karşılaştırmadaki satır sayıları, aynen taşınabilirlik, araç kolaylığı
ve süre ifadeleri güncel garanti değildir. Gerçek platform bağımlılığı ve kabul
ilgili brief'te doğrulanır; güncel teslim sırası karar #21'dir.

| | React Native + Expo | Flutter |
|---|---|---|
| Taşınan iş mantığı | **4.342 satır saf TS aynen gider** (`chat.ts` 1641, `korist-performance` 906, `repertuvar/*` 1067 …) + 12 test dosyası | Hepsi Dart'a yeniden yazılır, testler dahil |
| Anotasyon şeması | `annotation-types.ts` **ortak paket** olur — web ve mobil tek kaynak | Dart aynası tutulur, sürekli senkron riski |
| Supabase SDK | `supabase-js`, birebir aynı | `supabase_flutter`, port |
| Mağaza derlemesi | **EAS Build/Submit** — Xcode'a girmeden iOS derleyip iki mağazaya gönderir | Xcode + fastlane elle |
| Chat | UI sıfırdan (Orbiba'daki UI değersizleşir), veri katmanı `chat.ts`'ten gelir | Orbiba UI'ı kullanılır, veri katmanı yine yazılır |
| PDF görüntüleyici | Zayıf nokta — `react-native-pdf` ekosistemi `pdfrx` kadar olgun değil, **doğrulanmalı** | `pdfrx` denendi, çalışıyor |
| Çizim | `react-native-skia` (Skia motoru) — spike'taki matematik aynen geçerli | `CustomPainter`, spike geçti |
| Geliştirici hızı | React biliyor | Orbiba'yı yazmış |

**Karar (2 Eyl): React Native + Expo.** Belirleyici olan, çok kiracılı ürünün mağazadan
önce gelmesi: önümüzdeki 6–8 hafta neredeyse tamamen TypeScript backend/iş mantığı işi.
O mantığın Dart ikizini sürekli güncel tutmak, Orbiba'nın chat UI'ından vazgeçmekten pahalı.
EAS Build/Submit ayrıca Xcode sürtünmesini kaldırıyor — mağaza çıkışı asıl hedef olduğu için ağır bastı.

**KESİNLEŞTİ (3 Eyl):** `docs/briefs/002-rn-pdf-spike.md` geçti. Adım A çizim matematiğini
web'de, Adım B PDF→görüntü+katman mimarisini iOS'ta doğruladı. Şart kalktı.
Flutter spike'ı referans olarak `spike/repertuvar/` altında korunuyor.

## Çok koroluluk — sıralama kararı

Kullanıcı çok korolu mimariyi mağazadan **önce** istiyor. Doğru içgüdü ama ikiye ayrılmalı:

- **Kiracı-farkındalıklı şema** (`choir_id` + RLS): **şimdi**, mobil istemciden önce. ~1 hafta,
  sadece backend, web'e de faydası var. Sonraya kalırsa istemciyi de baştan elden geçirmek gerekir.
- **Çok kiracılı ürün** (koro kaydı, üye daveti, plan tablosu, katman limitleri):
  kullanıcı kararı — **mağazadan önce**. v1 satılabilir çıkıyor.
- **Otomatik faturalama: v1'de YOK.** İlk korolara elle fatura kesilir, plan bayrağı elle çevrilir.
  Mağaza uygunluğu bu tercihten otomatik çıkmaz; yayın brief'inde güncel koşullar doğrulanır.

Güncel sıra (#21): **minimum davet/üyelik kabulü → native giriş/koro seçimi →
repertuvar/PDF okuma → cihaz pilotu → plan-limit ve yayın için gereken diğer akışlar → mağaza.**
Limitler yalnız kanıtlanmış pilot engelinde öne alınır. 010 dış erişim/yetkiyle
beklerse bağımsız, yetkili 004 yerel çalışması ilerleyebilir; canlı kabul açık kalır.
Önceki 6–8 hafta / 4–5 ay tahminleri tarihsel; güncel teslim taahhüdü değildir.

## Ürün yönü ve maliyet

**`docs/urun-ve-maliyet.md`** tarihsel varsayım kaydıdır; güncel fiyat veya kapasite
kanıtı değildir. Railway tercihi korunur; hazırlık, production taşıması değildir.
Sağlayıcı geçişi [teslim planında](docs/mobil-teslim-plani.md) ayrı iş olarak izlenir.

## Mağaza yayını

Ayrı bir hat: **`docs/store-yayin.md`**. Bir kısmı mobil geliştirmeyi beklemez (hesap silme,
gizlilik politikası, demo hesap, hesaba uygulanabilir kapalı test şartları) ve mobile
olduğu gibi taşınır. Sona bırakılırsa Faz 1 biter ama yayınlanamaz.

## Sıradaki iş

**Sıradaki iş:** [013](docs/briefs/013-native-repertoire-contract.md) native repertuvar
sözleşmesini böldü; [014](docs/briefs/014-native-repertoire-catalogue.md) ortak saf katalog
çekirdeğini ve native katalog UI'ını yerelde kabul etti. [015](docs/briefs/015-shared-protected-repertoire-file.md)
ortak güvenli dosya Edge yolunu ve web uyarlamasını yerelde kabul etti; deploy ve canlı ürün
NOT RUN. [016](docs/briefs/016-native-pdf-readonly-annotations.md) native PDF indirme/görüntüleme,
temel zoom/kaydırma ve salt okunur anotasyonu yerelde kabul etti. [017](docs/briefs/017-non-hardware-read-flow-acceptance.md)
sentetik uçtan uca akışı yerelde kabul edip pilot devrini hazırladı; gerçek pilot NOT RUN. Cihaz
pilotu ertelendi.

WF-006'nın ilk yerel paketi [018](docs/briefs/018-protected-file-runtime-acceptance.md), gerçek
izole servis runtime kabulünü 9 Eylül'de `0b3df6e` üzerinde tamamladı. Sıradaki yerel paket,
[canonical plan](docs/mobil-teslim-plani.md) A2'deki gerçek native PDF/Skia render kabulüdür;
ardından web uyumluluğu gelir. Annotation writes follow those local integration gates.
010 6/7 kalır;
yeni canlı fikstür kurulmaz. 004'ün iki cihaz ölçütü ertelendi ve sıradaki eylem değildir.

**007 koro oluşturma: TAMAMLANDI ve CANLIDA KABUL EDİLDİ.** İlk sürüm herkese açık
self-servis olmayacak: manuel
faturalama kararı nedeniyle yalnız platform operatörünün yetkilendirdiği akış yeni
koro, kurucu üyelik ve kurucu Şef rolünü tek transaction'da oluşturacak. Mevcut
koro içi Şef rolü başka koro açma yetkisi vermeyecek. Migration, geri dönüş,
Edge giriş noktası ve restore edilmiş DB kabul testleri
[007 brief'inde](docs/briefs/007-operator-kontrollu-koro-olusturma.md) hazırlandı,
canlıya uygulandı ve gerçek operatör JWT'siyle başarı yolu kabul edildi. Test korosu
010 temizliğinde kaldırıldı; kabul geçerli, tek operator allow-list kaydı korundu.

**006 üyelik yönetimi güvenlik kapısı: KAPALI.** 5 Eylül canlı envanterinde eski
`create-choir-users` fonksiyonunun kimlik doğrulaması kapalı ve sabit başlangıç
parolalarıyla service-role yazısı yaptığı; üyelik/rol ana tablolarında authenticated
doğrudan DML'in rol ayrımı olmadan açık olduğu doğrulandı. Fonksiyon çağrılmadı.
[006](docs/briefs/006-uyelik-yonetimi-guvenlik-kapisi.md) önce bu yolları kapatır;
eski canlı Edge Function silindi, restrictive DB kilidi canlıya uygulandı ve
003/005/006 regresyonları geçti. Kurtarma ekranı canlı; salt Edge denetimi tam 27
hesabı ve mevcut SMTP bağlantısını doğruladı. Auth redirect listesine yalnız kesin
production recovery URL'si eklendi ve tekrar okundu. Hesap parola/oturum kurtarması
başlatılmadı. Ürün sahibi 27 hesabın kalan riskini açıkça kabul ederek bu adımı
kapsamdan çıkardı; bu karar parolaların güvenli hâle getirildiği anlamına gelmez.

Davet/üyelik (`008`) ve canlı temel kabul tamamlandı; 010'un ürün üzerindeki iki negatif
yolu açık kalır. Yeni gerçek ikinci üyelik veya platform operatörü işlemi ayrı açık yetki
gerektirir. `004` RN kabuk brief'i 25/27'dir; kalan iki cihaz kriteri ertelendi. Şirket
adının henüz kesinleşmemesi gelecekteki teknik işi engellemez.

**Tamamlanan:** `001` (Flutter spike) ve `002` (RN spike) — ikisi de geçti.
`002`'nin sonundaki 8 maddelik kurulum zinciri ürün projesinde baştan uygulanacak.

**Tamamlanan ve canlı:** `005` çoklu üyelik ve Auth oturumuna bağlı aktif koro.
DB migration `20260905003154`, Edge v15 ve web `0a2b94c`; hosted izolasyon, oturumlu
salt-okunur duman testi, 16/16 Playwright, 126 birim testi ve izole DB roundtrip geçti.

Paralel ve teknoloji kararından bağımsız (bkz. `docs/store-yayin.md`):
Apple/Play geliştirici hesapları, hesaba uygulanabilir güncel test şartları, hesap silme ve gizlilik politikası.

**Tamamlanan:** `docs/briefs/001-repertuvar-spike.md` — GEÇTİ. Öğrenilenler brief'in sonunda.

---

## Kararlar

| # | Karar | Gerekçe |
|---|---|---|
| 1 | Kolaydan zora değil, **değerden** sıralanır | WebView'ın gerçekten kötü olduğu ekranlar önce. Duyuruları native yapmak kullanıcıya hiçbir şey kazandırmıyor. |
| 2 | Piksel eşitliği hedef değil | Tek tema dosyası yeterli. Token çıkarıcı, className derleyicisi ve golden test altyapısı **iptal**. |
| 3 | Mobil kod **aynı repoda** | Ajan `AnnotationStage.tsx`'i okurken mobil karşılığını yazabilsin. Ayrı repo bu köprüyü koparır. RN'de ayrıca tipler doğrudan paylaşılıyor. |
| 4 | Anotasyon JSON şeması ortak sözleşme | Web ve mobil aynı kayıtları okur/yazar. RN'de `annotation-types.ts` **ortak dosya** — ayna tutulmuyor, sürüklenme riski yok. |
| 5 | Repertuvar en sona değil, **en başa** | Geçişin gerekçesi o ekran. Kullanım doğrulandı (2 Eyl): **şef kalemli tablette anotasyon yazıyor, koristler telefonda okuyor.** İki ayrı kazanç: şef için stylus basıncı ve avuç içi reddi, koristler için çizim akıcılığı ve kaydırma performansı. |
| 7 | Faz 2 iki ayaklı planlanır | Şef = *yazma* yolu (tek kullanıcı, bugün webview'da en sancılı olan). Koristler = *okuma* yolu (çok kullanıcı, hacim burada). Sıra: önce okuma yolu çalışsın, yazma yolu kalemli cihaz bulunduğunda doğrulansın. |
| 6 | Faz 4'te durmak meşru | %80 native yeterli bir bitiş. Faz 5 isteğe bağlı. |

---

## Bitti sayılma kuralı

Bir görev, kapısı geçmeden bitmiş sayılmaz:
- Web: `pnpm check`
- Mobil (RN): `npx tsc --noEmit && npm test`
