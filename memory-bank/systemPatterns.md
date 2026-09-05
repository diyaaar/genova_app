# Sistem desenleri ve sınırlar

Son karşılaştırma: 5 Eylül 2026. Mimari hedef ile uygulanmış kodu ayır.

- Web: Next.js istemci/sunucu; mevcut API'ler ekran göçüne kadar korunur.
  Native'e taşınan ekranın yeni sunucu mantığı Supabase Edge Function'a gider;
  web de aynı fonksiyona bağlanır. Bu, tüm API'lerin taşındığı anlamına gelmez.
- Ortak anotasyon sözleşmesi [annotation-types.ts](../lib/repertuvar/annotation-types.ts).
  RN ayrı bir Dart aynası tutmaz. Eski mobil sürümler ve bilinmeyen anotasyon
  türleri sözleşme değişikliğinde ayrıca test edilir.
- Auth/Realtime/DB Supabase'de; public web sitesiyle aynı proje kullanılır.
  İstemcinin gönderdiği koro/rol tek başına yetki değildir. Service-role kullanımı
  uygulamadaki yetki ve kiracı kontrollerini gereksiz kılmaz.
- `003` canlı tenant sınırıdır. `005` ile aktif koro yalnız doğrulanmış `auth.uid()`
  ve JWT `session_id` üzerinden sunucuda çözülür; istemci tercihi yalnız geri çağırma
  ipucudur. Tek üyelik fallback, çok üyelikte seçimsiz fail-closed davranışı korunur.
- `005` canlıdır: DB migration `20260905003154`, Edge v15 ve web `0a2b94c` aynı
  sözleşmededir. Gerçek çoklu üyelik ancak koro/davet ürünü hazır olduğunda eklenir.
- Drive'dan nesne deposuna geçiş hedefi dosya kimliği/anotasyon bağını korumalı;
  dosya yolu veya bucket öneki yetkilendirme yerine geçmemelidir.
- UI, iş mantığı, veri erişimi ve dosya sağlayıcısı sorumluluklarını ayır.
  Mevcut sınırları sırf satır sayısı için taşıma veya bütün işleri yöneten tek nesne yaratma.

## Tek doğru kaynak dağılımı

| Konu | Asıl kayıt |
|---|---|
| Ajan davranışı ve proje sınırları | [AGENTS.md](../AGENTS.md) |
| Çalışma/devir yöntemi | [Çalışma düzeni](../docs/ai-calisma-duzeni.md) |
| Ürün ve teknoloji kararı | [KARARLAR.md](../KARARLAR.md) |
| Mobil ekran durumu | [MIGRATION.md](../MIGRATION.md) |
| 003 uygulama/test/yayın kanıtı | [003 doğrulama](../docs/briefs/003-dogrulama.md) |
| 005 çoklu üyelik/aktif koro sözleşmesi | [005 brief ve kanıt](../docs/briefs/005-coklu-uyelik-aktif-koro.md) |
| Hosting/dosya sağlayıcısı hazırlığı | [Altyapı kaydı](../docs/altyapi-2026-09-04.md) |

Hafıza bu kayıtların kısa yönlendiricisidir; tüm geçmişi ikinci kez içermez.
Çelişkide ilgili kod/kanıt ve karar tarihi incelenir; tahminle kayıt eşitlenmez.
