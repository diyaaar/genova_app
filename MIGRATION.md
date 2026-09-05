# Mobil Geçiş — Durum Defteri

> Bu dosya geçişin tek doğru kaynağıdır. Yeni bir oturum önce burayı okur.
> Bir ekranın durumu değiştiğinde **aynı commit'te** burası da güncellenir.

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
**Hedef:** ~%80 native (React Native + Expo), ~%20 kalıcı WebView. Bu bir ara durum değil, bitiş noktasıdır.

---

## Ekranlar

Satır sayıları yaklaşıktır (ilgili sayfa + bileşen + lib dosyaları).

| Ekran | ≈ satır | Hedef | Durum | Faz |
|---|---:|---|---|---|
| Giriş | 164 | native | bekliyor | 1 |
| Kabuk (nav, tema, push, mini player) | ~1.000 | native | bekliyor | 1 |
| Repertuvar | 9.885 | **native** | bekliyor | 2 |
| Chat | 8.552 | **native** (UI hazır, veri katmanı yazılacak) | bekliyor | 3 |
| Ödevler | 5.557 | native | bekliyor | 4 |
| Ana sayfa | ~800 | native | bekliyor | 4 |
| Duyurular | 977 | **WebView — kalıcı** | — | — |
| Koristler | 2.511 | **WebView — kalıcı** | — | — |
| Profil + değişiklik talepleri | 2.038 | **WebView — kalıcı** | — | — |
| Devamsızlık | 1.461 | **WebView — kalıcı** | — | — |

**WebView'da kalanlara mobil tarafta dokunulmaz.** Hepsi liste, form ve metin ekranı;
WebView bu işlerde ölçülebilir hiçbir şey kaybettirmiyor. Native yapmanın tek gerekçesi
Next.js bağımlılığını tamamen kaldırmak istemek olur — bugün öyle bir gerekçe yok.

---

## Backend

| Parça | Durum |
|---|---|
| Supabase (auth, realtime, storage) | 003 ve 005 canlı; aktif koro Auth `session_id` ile sunucuda çözülüyor |
| `supabase/functions/drive-manager-v2` | v15 canlı; 005 aktif-koro sözleşmesi, `verify_jwt=true` |
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
`lib/chat.ts`'teki 1.641 satır TypeScript iş mantığı aynen taşınıyor; Flutter'da o da
yeniden yazılacaktı. Orbiba'dan kalan değer: FCM/APNs kurulum örneği ve mimari referans.
**Faz 3 tahmini 4–5 haftaya çıktı** (önceki 2–3 hafta, hazır UI varsayımıyla hesaplanmıştı).

## KARAR — istemci teknolojisi: React Native + Expo

Karar 2 Eyl'de verildi, 3 Eyl'de spike ile doğrulandı. Karşılaştırma kayıt için burada:

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
  Bu, Apple'ın uygulama içi satın alma zorunluluğunu tamamen devre dışı bırakır.

Yeni sıra: **RN spike → Kiracı şeması → Çok kiracılı ürün → Mobil kabuk + mağaza → Repertuvar → (dur)**
Mağaza çıkışı ~6–8 hafta ötelendi; toplam ~4–5 ay.

## Ürün yönü ve maliyet

**`docs/urun-ve-maliyet.md`** — sunucu gerekmiyor (mimari sunucusuz), maliyet ~$8/ay
bugün / ~$35–55/ay ticari. Katmanlı ürün düşünülüyorsa **`choir_id` Faz 1'den önce
şemaya girmeli**; sonradan eklemek acı verici bir göç.

## Mağaza yayını

Ayrı bir hat: **`docs/store-yayin.md`**. Bir kısmı mobil geliştirmeyi beklemez (hesap silme,
gizlilik politikası, demo hesap, Play'in 14 günlük kapalı test saati) ve mobile
olduğu gibi taşınır. Sona bırakılırsa Faz 1 biter ama yayınlanamaz.

## Sıradaki iş

**006 üyelik yönetimi güvenlik kapısı.** 5 Eylül canlı envanterinde eski
`create-choir-users` fonksiyonunun kimlik doğrulaması kapalı ve sabit başlangıç
parolalarıyla service-role yazısı yaptığı; üyelik/rol ana tablolarında authenticated
doğrudan DML'in rol ayrımı olmadan açık olduğu doğrulandı. Fonksiyon çağrılmadı.
[006](docs/briefs/006-uyelik-yonetimi-guvenlik-kapisi.md) önce bu yolları kapatır;
eski canlı Edge Function silindi, restrictive DB kilidi canlıya uygulandı ve
003/005/006 regresyonları geçti. Kurtarma ekranı canlı; salt Edge denetimi tam 27
hesabı ve mevcut SMTP bağlantısını doğruladı. Auth redirect listesi boş olduğu için
hesap parola/oturum kurtarması başlatılmadı; önce güvenli recovery URL'si izin
listesine eklenmeli, ardından ayrı açık etki onayı alınmalıdır.

Ardından koro oluşturma (`007`), davet/üyelik (`008`) ve plan-limit işleri ayrı
brief'lere bölünür; gerçek ikinci üyelik bu akış ve kabul testleri hazır olmadan
eklenmez. `004` RN kabuk brief'i bu zincirin ardından uygulanır. Şirket adının
henüz kesinleşmemesi bu teknik işi engellemez.

**Tamamlanan:** `001` (Flutter spike) ve `002` (RN spike) — ikisi de geçti.
`002`'nin sonundaki 8 maddelik kurulum zinciri ürün projesinde baştan uygulanacak.

**Tamamlanan ve canlı:** `005` çoklu üyelik ve Auth oturumuna bağlı aktif koro.
DB migration `20260905003154`, Edge v15 ve web `0a2b94c`; hosted izolasyon, oturumlu
salt-okunur duman testi, 16/16 Playwright, 126 birim testi ve izole DB roundtrip geçti.

Paralel ve teknoloji kararından bağımsız (bkz. `docs/store-yayin.md`):
Apple/Play geliştirici hesapları, Play'in 14 günlük kapalı test saati, hesap silme, gizlilik politikası.

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
