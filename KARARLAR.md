# Kararlar

Verilmiş kararlar ve gerekçeleri. Kanıtsız tekrar tartışma; yeni kullanıcı yönü veya
somut çelişkide etkiyi değerlendir. Değişen kararın önceki hâlini tarihsel tut,
yeni karara açıkça bağla. Eski tahminler güncel doğrulama değildir.

## Android-first delivery and commercial scope — 20 September 2026

| # | Decision | Rationale / boundary | Date |
|---|---|---|---|
| 28 | **Deliver the same product Android-first; preserve the complete roadmap and two-store destination** | Owner accepted a usable intermediate release if the final product cannot be ready within a few days. A few days is a delivery target, not a verified completion estimate. The first usable build and final store candidate have separate exits in the delivery plan. No throwaway demo, silent feature deletion or automatic native/WebView reassignment. This refines #21's execution order; 004/010 gaps remain. | 20 Sep 2026 |
| 29 | **Retain Supabase DB/Auth/Realtime/Edge; replace production Drive file dependency using private object storage** | Owner accepted retaining Supabase and a separate storage solution. Adopt the proposed Cloudflare R2 Standard target for preparation; provider activation, region, credentials, copy/cutover and spending remain separately gated. No Railway database/hosting migration is on the current delivery path. Prefer total recurring infrastructure at or below $5/month; higher cost needs an explicit choice. This is a budget target, not a guaranteed bill. | 20 Sep 2026 |
| 30 | **First release sells choir plans only: first five members free, additional members billable; individual sales deferred** | Owner accepted both recommendations. The free tier is member-limited, not an approved time-limited trial. Price, billing interval and billable-member lifecycle still need definition before enforcement. Optional choir feature entitlements may be added when specified; do not invent tiers or remove existing functionality. Preserve #10's manual invoicing for v1 unless a checkout is separately selected. | 20 Sep 2026 |
| 31 | **Web onboarding and commercial administration; mobile accesses the choir service** | Owner prefers web acceptance of terms and web payments. Mobile still exposes privacy/terms and an account-deletion entry; store disclosures and review remain required. No generic external-payment exemption is claimed. Region/business-model assessment precedes purchase links or individual digital sales. | 20 Sep 2026 |

| # | Karar | Gerekçe | Tarih |
|---|---|---|---|
| 1 | Sıralama **değere** göre, kolaydan zora değil | WebView'ın gerçekten kötü olduğu ekranlar önce. Duyuruları native yapmak kullanıcıya hiçbir şey kazandırmıyor. | 2 Eyl |
| 2 | **Piksel eşitliği hedef değil** | Tek tema dosyası yeterli. Token çıkarıcı, className derleyicisi ve golden test altyapısı **iptal**. | 2 Eyl |
| 3 | Mobil kod **aynı depoda** | Ajan web karşılığını okurken mobil kodu yazabilsin. Ayrı depo bu köprüyü koparır. | 2 Eyl |
| 4 | Anotasyon JSON şeması **ortak sözleşme** | Web ve mobil aynı kayıtları okur/yazar. Geçiş boyunca repertuvar ikiye bölünmez. | 2 Eyl |
| 5 | Repertuvar **en başa** | Geçişin gerekçesi o ekran. Şef kalemli tablette yazıyor, koristler telefonda okuyor — iki ayrı kazanç. | 2 Eyl |
| 6 | Faz 4'ten sonra **durmak meşru** | ~%80 native yeterli bir bitiş. Kalan ekranlar kalıcı olarak WebView'da kalabilir. | 2 Eyl |
| 7 | **İstemci: React Native + Expo** | `lib/` altındaki 4.342 satır TS + 12 test aynen taşınıyor; anotasyon tipleri web'le ortak (ayna yok); EAS Build Xcode'a girmeden iki mağazaya gönderiyor. Çok kiracılı ürünün önce gelmesi bu kararı kesinleştirdi — önümüzdeki haftalar ağırlıklı TypeScript backend işi. | 2 Eyl |
| 8 | RN kararı **KESİNLEŞTİ** | `002` spike'ı 3 Eyl'de geçti: çizim matematiği web'de, PDF→görüntü+katman iOS'ta doğrulandı. Şart kalktı. Flutter spike'ı referans olarak `spike/repertuvar/` altında kalıyor. | 3 Eyl |
| 9 | **Çok kiracılı ürün mağazadan önce**; mobil başlangıç sırası #21 ile güncellendi | Mağaza önkoşulu korunur. Eski takvim tahmini geçersizdir; tüm ticari yönetim ilk cihaz denemesinin önkoşulu değildir. | 2 Eyl; 6 Eyl güncelleme |
| 10 | **Otomatik faturalama v1'de yok** | İlk korolara elle fatura, plan elle atanır. Önceki kesin mağaza muafiyeti gerekçesi iptal edildi; uygunluk yayın brief'inde doğrulanır. | 2 Eyl; 5 Eyl düzeltme |
| 11 | Katman limitleri **Postgres'te**, koda gömülü değil | İstemcide kontrol edilen limit dakikalar içinde aşılır. Plan tablosundan okunan veri olmalı ki fiyat değişimi yeni sürüm gerektirmesin. | 2 Eyl |
| 12 | Ajan çalışması **brief'le** | Ajan 45k satırı keşfetmek yerine 50 satır okur. Keşif maliyeti bir kez ödenir. | 2 Eyl |

| 13 | PDF ekranı: **hazır görüntüleyici yok, kap kendimiz yazılacak** | 3 Eyl araştırması: RN'in hiçbir PDF görüntüleyicisi sayfa üstüne katman koymaya izin vermiyor (Flutter'ın `pdfrx`'i veriyordu). Çözüm: sayfayı bitmap'e render et, kendi kaydırma/zoom kabına koy, Skia katmanını üstüne ser. **Bedeli ~1-2 hafta ek, Faz 4'te.** RN kararı bu maliyete rağmen korunuyor: 4.342 satır TS, ortak şema ve EAS avantajı sürekli, bu maliyet tek seferlik ve tek ekranda. | 3 Eyl |

| 14 | **MusicXML aktif içerik filtresine takılıyor** | 3 Eyl güvenlik sertleştirmesi (`lib/server/drive-file-content.ts`) `.xml`/`.xsl` uzantılarını ve `+xml` ile biten tüm MIME türlerini reddediyor. MusicXML tam olarak bu: `.xml`/`.musicxml`, `application/vnd.recordare.musicxml+xml`. Planlanan "Pro'da XML yükleme" özelliği bugünkü kodda **yüklemede de indirmede de bloke.** Filtre kaldırılmayacak (stored-XSS koruması doğru); çözüm ya sunucuda ayrıştırıp güvenli temsile çevirmek ya da yalnızca `Content-Disposition: attachment` + `application/octet-stream` + `nosniff` ile indirme olarak servis edip asla satır içi açmamak. Faz 2'de karara bağlanacak. | 3 Eyl |

## Çok koroluluk kararı

| # | Karar | Gerekçe | Tarih |
|---|---|---|---|
| 16 | **Aktif koro sunucuda ve Auth oturumuna bağlı çözülür** | Bir Auth hesabı birden fazla koroda ayrı üyelik taşıyabilir. Seçim JWT `session_id` ve `auth.uid()` ile doğrulanır; istemci tercihi yetki değildir. Tek üyelik geriye uyumlu seçilir, çok üyelikte seçim yoksa tenant `NULL` olur ve erişim kapalı kalır. Uygulama/kanıt: [005](docs/briefs/005-coklu-uyelik-aktif-koro.md). | 5 Eyl 2026 |
| 18 | **Yeni koroyu yalnız ayrı platform operatörü atomik olarak kurar** | Koro içi `Şef` global yetki değildir. Manuel faturalama döneminde varsayılan boş özel allow-list'teki operatör; mevcut Auth kullanıcısı için koro, üç varsayılan rol, kurucu üyelik ve kurucu `Şef` eşlemesini tek DB transaction'ında oluşturur. Davet/yeni Auth kullanıcısı 008'de kalır. Uygulama/kanıt: [007](docs/briefs/007-operator-kontrollu-koro-olusturma.md). | 5 Eyl 2026 |

## Çalışma düzeni kararı

| # | Karar | Gerekçe | Tarih |
|---|---|---|---|
| 15 | **Kısa proje hafızası + brief + kanıtlı devir; aynı ağaçta tek yazıcı** | Kullanıcının video/repo/görsellerle istediği yöntem Genova'ya uyarlanır. Altı hafıza dosyası mevcut karar/durum/test kayıtlarına bağlanır. Bağımsız düşük riskli iş kontrollü alt ajana verilebilir; model seçimi riskle yapılır, ana ajan son kabul sahibidir. Eski eşzamanlı tek-ajan kuralı bu kontrollü devir düzeniyle değiştirilir; eşzamanlı ortak-ağaç yazımı yine yasaktır. Teknoloji/mobil kapsamı değişmez. Uygulama ve sınırları: [WF-001](docs/briefs/WF-001-ai-calisma-duzeni.md). | 4 Eyl 2026 |

## Execution resources — 15 September 2026

| # | Decision | Rationale | Date |
|---|---|---|---|
| 27 | **Keep roughly 10 GB free; prioritize owned cleanup and bounded product progress** | The owner clarified that disk pressure motivated cleanup and requested revised agent instructions/goal after the long run. The plan implements a conservative 10 GiB floor, one active result and bounded retries. Product scope and prior approval/evidence boundaries remain. [WF-007](docs/briefs/WF-007-bounded-execution-and-disk-budget.md) records implementation; numeric controls live in the delivery plan. | 15 Sep 2026 |

## Hesap güvenliği kararı

| # | Karar | Gerekçe | Tarih |
|---|---|---|---|
| 17 | **27 eski hesabın parola/oturum riski kabul edilerek 006 kapatıldı** | Ürün sahibi mevcut parolaların aynı kalmasını, toplu parola/oturum düzeltmesinin ve 27 kurtarma e-postasının atlanmasını açıkça seçti. Eski public bootstrap ve yetkisiz ana-veri yazısı kapalı kalır; risk giderilmiş sayılmaz. Gelecekte düzeltme yeni açık yetki ve güncel adres denetimi ister. | 5 Eyl 2026 |

## Spike'lardan çıkan teknik kararlar

| Konu | Karar |
|---|---|
| PDF yükleme | Kütüphanenin asset yükleyicisine güvenme; baytları elle oku, öyle ver. (`pdfrx`'in `PdfViewer.asset`'i sessizce başarısız oluyordu.) |
| Sessiz hata | PDF/çizim yolunda hata **her zaman ekranda görünür olmalı.** Gri ekran dört tur kaybettirdi. |
| Bilinmeyen anotasyon tipi | Atlanır, çökmez. Web'e yeni tip eklendiğinde eski mobil sürümler ayakta kalır. |
| Kalem eğrisi | Konva `tension: 0.2` birebir uygulanır. Düz polyline çizilirse strok web'e göre köşeli çıkar. |
| Test dosyası | İçerik değişince **dosya adı da değişmeli** — önbellek tuzağı. |
| Skia (web) | `LoadSkiaWeb()` çağrılmadan hiçbir Skia API'si kullanılamaz; `canvaskit.wasm` `public/` altında servis edilmeli. Çağrılmazsa ekran bomboş kalır. |
| react-native-web Image | `StyleSheet.absoluteFill` + `resizeMode` görseli kutuya SIĞDIRMIYOR, doğal boyutunda açıyor. Genişlik/yükseklik açıkça verilmeli. |
| Sayfa mimarisi | Sayfa = **görüntü** + üstünde Skia katmanı. PDF görüntüleyicisine gerek yok; sayfa bitmap'e render edilip aynı yere konur. **iOS'ta doğrulandı.** |
| Kurulum zinciri | 8 maddelik liste `docs/briefs/002-rn-pdf-spike.md` sonunda. Ürün projesi kurulurken baştan uygulanacak — bugün tek tek keşfedildi, bir daha edilmesin. |

## Mobil teslim odağı — 5 Eylül 2026

| # | Karar | Gerekçe | Tarih |
|---|---|---|---|
| 19 | **Minimum davet/limit → giriş/koro seçimi → repertuvar/PDF → cihaz pilotu → mağaza adayı** | Kullanıcı bu yönü onayladı. Çok koroluluk mağazadan önce kalır; gelişmiş yönetim veya hosting göçü ilk mobil akışı geciktirmez. Kapsam/kabul: [teslim planı](docs/mobil-teslim-plani.md). | 5 Eyl 2026 |
| 20 | **Kaynak kuralların amacı korunur; uyum yüzdesi yerine çalışan akış ölçülür** | Tek sonuçlu brief, riske uygun test, kısa hafıza ve tek yazıcı. Gereksiz katman, belge tekrarı ve kapsam içi teknik adımda tekrar onay önlenir. İnceleme: [WF-003](docs/briefs/WF-003-mobil-teslim-odagi.md). | 5 Eyl 2026 |

## Pilot-first handoff — 6 September 2026

| # | Decision | Rationale | Date |
|---|---|---|---|
| 21 | **Invitation acceptance → 004 native sign-in/choir selection → repertoire/PDF → device pilot; limits before store release** | User approved the handoff and revised pilot priority. Supersedes only #19's automatic pre-native limit dependency; multi-choir/store scope remains. Bring limits forward only for a measured pilot blocker. If 010 is externally blocked, independent authorized 004 local work may proceed without claiming live acceptance. | 6 Sep 2026 |
| 22 | **English agent handoffs and acceptance records; Turkish user updates; evidence instead of subjective scores** | Reuse existing sources and require dated evidence per acceptance item. Mandatory failures/unrun checks prevent closure. Model change does not grant live authority or guarantee equal reasoning. Implementation: [WF-004](docs/briefs/WF-004-english-agent-handoff.md). | 6 Sep 2026 |

## Live release and acceptance — 8 September 2026

| # | Decision | Rationale | Date |
|---|---|---|---|
| 23 | **008 was released live in DB → Edge → web order and accepted on the live product** | The owner authorised each step of [010](docs/briefs/010-008-canli-yayin-ve-kabul.md) as it came. Fresh backup and a proven restore came first; the restore acceptance run failed and exposed that `pg_dump` carries no role attributes, which was fixed before the live migration. Acceptance used purpose-made test identities and never touched `Genesi Nova`. | 8 Sep 2026 |
| 24 | **A null `is_current` was fixed in the database, not by loosening the client contract** | The shared 005 contract rejects a non-boolean and fails closed. That is what surfaced [012](docs/briefs/012-coklu-uyelik-secim-kilidi.md); treating null as false in the client would have hidden a fault that locked a multi-choir member out of the choir picker. A column declared `boolean` must not return null, so `list_my_choirs` compares with `is not distinct from`. Fail-closed parsing stays. | 8 Sep 2026 |
| 25 | **[011](docs/briefs/011-davet-donusu-ve-sifre-sifirlama.md) was released; the profile form keeps its current-password requirement** | Supabase's own API does not ask for the old password, so that field is the app's only defence against someone with a hijacked session taking the account. Rather than remove it, the app gained the self-service reset it never had: `/auth/recovery` now sends the link and the recovery session sets the new password. Two `redirect_to` addresses must stay in the Auth allow-list or the flow silently falls back to the site root. | 8 Sep 2026 |
| 26 | **The acceptance fixture was deleted, accepting that 010's sixth criterion can no longer be finished as it stands** | The owner confirmed cleanup after verifying sign-in. The revoked-link and wrong-account refusals were never exercised through the live product, and the choir and invitation that would exercise them are gone. They stay recorded as NOT RUN rather than argued closed; finishing them means standing up a new test choir. Every deleted row was snapshotted first. | 8 Sep 2026 |
