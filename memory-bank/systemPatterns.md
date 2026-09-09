# Sistem desenleri ve sınırlar

Son karşılaştırma: 5 Eylül 2026. Mimari hedef ile uygulanmış kodu ayır.

- Web: Next.js istemci/sunucu; mevcut API'ler ekran göçüne kadar korunur.
  Native'e taşınan ekranın yeni sunucu mantığı Supabase Edge Function'a gider;
  web de aynı fonksiyona bağlanır. Bu, tüm API'lerin taşındığı anlamına gelmez.
- Ortak anotasyon sözleşmesi [annotation-types.ts](../lib/repertuvar/annotation-types.ts).
  RN ayrı bir Dart aynası tutmaz. Eski mobil sürümler ve bilinmeyen anotasyon
  türleri sözleşme değişikliğinde ayrıca test edilir. 016 ile web ve native okumalar aynı
  savunmacı parser'ı kullanır; bilinmeyen/bozuk/gelecek şema öğeleri yazılabilir veriye
  dönüştürülmeden atlanır ve kullanıcıya uyarı olarak gösterilir.
- Auth/Realtime/DB Supabase'de; public web sitesiyle aynı proje kullanılır.
  İstemcinin gönderdiği koro/rol tek başına yetki değildir. Service-role kullanımı
  uygulamadaki yetki ve kiracı kontrollerini gereksiz kılmaz.
- `003` canlı tenant sınırıdır. `005` ile aktif koro yalnız doğrulanmış `auth.uid()`
  ve JWT `session_id` üzerinden sunucuda çözülür; istemci tercihi yalnız geri çağırma
  ipucudur. Tek üyelik fallback, çok üyelikte seçimsiz fail-closed davranışı korunur.
- `005` canlıdır: DB migration `20260905003154`, Edge v15 ve web `0a2b94c` aynı
  sözleşmededir. Gerçek çoklu üyelik ancak koro/davet ürünü hazır olduğunda eklenir.
- `007` canlı sözleşmesinde koro içi `Şef` global yetki değildir. Yalnız özel,
  varsayılan boş platform-operatörü kaydı; mevcut Auth kullanıcısı için koro,
  varsayılan roller, kurucu üyelik ve kurucu `Şef` eşlemesini atomik RPC ile kurar.
  Edge kullanıcı JWT'sini doğrular ve service-role anahtarı taşımaz. DB migration
  `20260905160539` ve Edge v1 canlıdır; gerçek operatör başarı yolu 8 Eylül'de
  kabul edildi. Test korosu daha sonra temizlendi; tek operator allow-list kaydı
  korundu. Temizlik önceki kabulü geri almaz.
- Toplu Auth kurtarması sabit e-posta/parola listesine dayanmaz: değişmez oluşum
  penceresi ve beklenen sayı birlikte doğrulanır, servis anahtarı yanında ayrı tek
  kullanımlık yürütme anahtarı gerekir, denetim ve etki modları ayrılır. Kısmi
  hatada `app_metadata` ilerleme işareti tekrar çalıştırmayı güvenli kılar; işaret
  yetkilendirme kararı değildir. 006'da etki modu ürün sahibinin risk kabulüyle
  çalıştırılmadı; bu desen ancak gelecekte yeniden açıkça yetkilendirilirse kullanılır.
- Drive'dan nesne deposuna geçiş hedefi dosya kimliği/anotasyon bağını korumalı;
  dosya yolu veya bucket öneki yetkilendirme yerine geçmemelidir.
- UI, iş mantığı, veri erişimi ve dosya sağlayıcısı sorumluluklarını ayır.
  Mevcut sınırları sırf satır sayısı için taşıma veya bütün işleri yöneten tek nesne yaratma.
- Native tenant-cache kayıtları birden çok yaşam-döngüsü sahibi tarafından paylaşılabilir. 017
  ile aynı temizleyici referans sayılır; ekranın unregister işlemi uygulama-sahibi kaydını düşürmez
  ve her koro/kimlik geçişinde temizleyici yalnız bir kez çalışır.
- Native preference storage preserves the shared key's meaning but not its invalid web punctuation:
  Expo SecureStore uses `genova.active-choir.<user-id>` while web localStorage keeps the existing
  colon-delimited key. The preference remains only a hint; server membership is authoritative.
- Local Android HTTP exceptions are acceptance infrastructure, not product policy. The 021 Expo
  config plugin requires an explicit flag plus exact loopback scheme/host/port, scopes the generated
  resource to localhost and actively removes its own manifest/resource changes in ordinary prebuilds.

## Tek doğru kaynak dağılımı

| Konu | Asıl kayıt |
|---|---|
| Ajan davranışı ve proje sınırları | [AGENTS.md](../AGENTS.md) |
| Çalışma/devir yöntemi | [Çalışma düzeni](../docs/ai-calisma-duzeni.md) |
| Ürün ve teknoloji kararı | [KARARLAR.md](../KARARLAR.md) |
| Mobil ekran durumu | [MIGRATION.md](../MIGRATION.md) |
| 003 uygulama/test/yayın kanıtı | [003 doğrulama](../docs/briefs/003-dogrulama.md) |
| 005 çoklu üyelik/aktif koro sözleşmesi | [005 brief ve kanıt](../docs/briefs/005-coklu-uyelik-aktif-koro.md) |
| 006 üyelik yönetimi güvenlik kapısı | [006 brief ve kanıt](../docs/briefs/006-uyelik-yonetimi-guvenlik-kapisi.md) |
| 007 operatör kontrollü koro oluşturma | [007 brief ve kanıt](../docs/briefs/007-operator-kontrollu-koro-olusturma.md) |
| Hosting/dosya sağlayıcısı hazırlığı | [Altyapı kaydı](../docs/altyapi-2026-09-04.md) |

Hafıza bu kayıtların kısa yönlendiricisidir; tüm geçmişi ikinci kez içermez.
Çelişkide ilgili kod/kanıt ve karar tarihi incelenir; tahminle kayıt eşitlenmez.
