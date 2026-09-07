# 007 — Operatör kontrollü koro oluşturma

**Durum / tarih / sorumlu yazıcı:** CANLI ALTYAPI HAZIR; ALLOW-LIST BOŞ,
GERÇEK KORO YOK — 5 Eylül 2026; ana ajan tek yazıcı.

**Amaç (tek cümle) ve kullanıcı ihtiyacı:** Manuel faturalama döneminde yalnız
ayrıca tanımlanmış platform operatörünün, mevcut bir Auth kullanıcısı için yeni
koro, kurucu üyelik ve kurucu `Şef` rolünü tek atomik sunucu işleminde oluşturması.

**Başlangıç kanıtı:** `main` temiz ve `36e4e19` ile 006 kapalıydı. Salt okunur
canlı şema kontrolünde `public.choirs`, `roles`, `choir_members` ve
`choir_member_roles` tabloları; koro içi `Korist`, `Partisyon Şefi`, `Şef` rolleri;
003 tenant sınırı, 005 aktif-koro sözleşmesi ve 006 authenticated DML kilidi
doğrulandı. `choirs` üzerinde authenticated koro oluşturma politikası yok.
Supabase proje erişimi MCP üzerinden reddedildi; aynı kesin bağlı proje
`hievmwwctjjlhmssoxsu` salt okunur CLI sorgusuyla doğrulandı. Canlı yazı yapılmadı.

**İzinli dosyalar / modüller:**

- `docs/briefs/007-operator-kontrollu-koro-olusturma.md` — görev ve kanıt kaydı.
- `supabase/migrations/*_operator_controlled_choir_creation_007.sql` — özel
  operatör/audit kayıtları ve atomik oluşturma RPC'si.
- `supabase/rollback/007_operator_controlled_choir_creation_down.sql` — 007
  arayüzünü ve özel şemayı kaldıran geri dönüş; oluşturulmuş ürün verisini silmez.
- `supabase/tests/007_operator_controlled_choir_creation.sql` ve
  `supabase/test-support/007_roundtrip.sql` — yetki, atomiklik, tenant uyumu ve
  geri dönüş kanıtı.
- `supabase/functions/create-choir/` ve `supabase/config.toml` — doğrulanmış
  kullanıcı JWT'sini koruyan ince Edge giriş noktası.
- `MIGRATION.md`, `KARARLAR.md`, `memory-bank/activeContext.md`,
  `memory-bank/progress.md`, `memory-bank/systemPatterns.md` — yalnız sonuç ve
  sözleşme bağlantıları.

**Kaynaklar / mevcut desen:**

- `AGENTS.md`, `docs/gecis-rehberi.md`, `docs/ai-calisma-duzeni.md` — kapsam,
  yetki ve teslim kapıları.
- [006](006-uyelik-yonetimi-guvenlik-kapisi.md), [005](005-coklu-uyelik-aktif-koro.md)
  ve ilgili migration/testler — kilitli DML, aktif koro ve transaction test deseni.
- `supabase/functions/drive-manager-v2/index.ts` ve
  `supabase/functions/_shared/tenant-fetch.ts` — istek JWT'si doğrulama deseni.
- [Supabase Edge Auth](https://supabase.com/docs/guides/functions/auth-legacy-jwt),
  [Auth headers](https://supabase.com/docs/guides/functions/auth-headers) ve
  [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) —
  kullanıcı JWT'si, istek kapsamlı istemci ve en az yetki sözleşmesi.

**Geçiş başlangıç kontrolü** — [geçiş rehberi](../gecis-rehberi.md).

- Okunan talimatlar ve kanıt: `AGENTS.md`, altı `memory-bank` dosyası,
  `MIGRATION.md`, `KARARLAR.md`, çalışma döngüsü, rehber, 005/006 brief ve
  migration/testleri, güncel resmi Supabase belgeleri ve canlı şemanın salt
  okunur envanteri.
- Tek altyapı işi: koro oluşturma backend sözleşmesi. Native/WebView/UI işi yok;
  008 davet/üyelik ve plan-limit ayrı kalır.
- Korunacak davranış: mevcut web istemcisi, 003 tenant izolasyonu, 005 çoklu
  üyelik/aktif koro ve 006 doğrudan DML reddi değişmeden çalışır.
- İzinli dosyalar yukarıda; aynı ağaçta ana ajan tek yazıcıdır. Kullanıcının
  “continue” onayı taze yedek/restore, canlı migration, Edge deploy ve hosted
  testleri kapsadı. Operatör atama ve gerçek koro kaydı bu yetkinin dışındadır.
- Testler: restore edilmiş DB'de operatör/operatör olmayan/anon/service-role
  yürütme izinleri, tam kayıt seti, duplicate/invalid girişte atomiklik,
  003/005/006 regresyonu, down roundtrip, Edge çekirdek testleri ve `pnpm check`.

**Kapsam dışı** — bu kesimde kesinlikle yapılmayanlar:

- Canlı operatör kaydı veya gerçek koro/üyelik oluşturma.
- Yeni Auth kullanıcısı oluşturma, davet/e-posta, üyelik yönetimi UI'ı; bunlar 008.
- Herkese açık self-servis koro açma, ödeme, abonelik veya plan-limit mantığı.
- RN ekranı, mevcut web UI'ını mobile benzetme, Drive/storage veya hosting taşıması.

**Risk / yetki / geri dönüş:**

- Koro içi `Şef`, platform operatörü değildir. Ayrı özel kayıt varsayılan boş
  başlar; gerçek kullanıcı eklemek ayrıca yetkilendirilmiş canlı veri işlemidir.
- RPC yalnız authenticated rolüne açılır, fakat içeride `auth.uid()` ile özel
  operatör kaydı zorunlu tutulur. Edge Function service-role anahtarı kullanmaz.
- Kurucu mevcut `auth.users` satırı olmalıdır. E-posta Auth kaydından alınır;
  çağıranın gönderdiği e-postaya güvenilmez.
- Migration geri alınırken RPC ve 007 özel şeması kaldırılır; önceden oluşturulan
  korolar/üyelikler sessizce silinmez. Canlı geri dönüş gerekiyorsa ürün verisi
  ayrı ve açık kararla ele alınır. Git revert DB geri dönüşü değildir.
- Canlı uygulama öncesi kesin proje, taze yedek/restore, web–Edge sürüm sırası ve
  bakım penceresi yeniden doğrulanır; farklı proje veya eksik kanıtta durulur.

**Küçük uygulama adımları:**

1. Özel operatör/audit tablolarını ve yalnız authenticated + yetkili operatörün
   çağırabildiği atomik RPC'yi yaz.
2. JWT'yi doğrulayan, girdiyi sınırlayan ve RPC dışında ayrı veri yazmayan Edge
   Function ile birim testlerini ekle.
3. Taze restore üzerinde 007 izin/atomiklik/roundtrip ve 003/005/006 regresyonunu;
   ardından `pnpm check` ve diff incelemesini çalıştır.
4. Yerel teslimi ayrı kod/belge commit'leriyle kaydet; açık canlı yetkisinden
   sonra taze yedek/restore, kesin migration, Edge deploy ve hosted testleri yap.
   Gerçek operatör/kurucu bilgilerini ayrı yetki gelene kadar kullanma.

**Bitti tanımı** — hepsi kanıtlanmadan görev kapanmaz:

- [x] Yalnız özel kaydı olan authenticated operatör koro + üç varsayılan rol +
  kurucu üyelik + kurucu `Şef` eşlemesini tek transaction'da oluşturabiliyor.
- [x] Koro içi `Şef`, operatör olmayan kullanıcı, anon ve service-role doğrudan
  RPC çağrısı reddediliyor; geçersiz/tekrarlı giriş kısmi veri bırakmıyor.
- [ ] Edge Function kullanıcı JWT'sini doğruluyor, service-role kullanmıyor ve
  DB hata sınıflarını kişisel veri sızdırmadan güvenli yanıta çeviriyor. Kod ve
  beş çekirdek testi ile hosted 401/CORS/handler başlangıç kontrolleri geçti;
  allow-list boş tutulduğu için gerçek authenticated operatör başarı yolu
  çalıştırılmadı.
- [x] 007 down roundtrip ile 003/005/006 regresyonları restore edilmiş DB'de geçti.
- [x] Geçiş rehberinin teslim kontrolleri ve kökten `pnpm check` geçti; canlı
  DB/Edge/Auth/gerçek cihaz/yayın katmanları ayrı ve doğru biçimde raporlandı.
- [x] Diff incelendi; kapsam dışı değişiklik yok; ilgili hafıza ve kanıt
  bağlantıları güncel.

**Opsiyonel alt görev:** Bağımsız alt iş yok; DB yetki tasarımı ve kabul ana ajanda.

**Sonuç kaydı:**

| Tarih | Komut / işlem | Ortam | Sonuç | Kanıt / sınır |
|---|---|---|---|---|
| 5 Eyl 2026 | Başlangıç repo/şema/talimat kontrolü | yerel + canlı salt okunur | geçti | Kesin proje `hievmwwctjjlhmssoxsu`; 005/006 durumu ve dört hedef tablonun mevcut sözleşmesi doğrulandı. MCP erişimi reddedildi; CLI ile yalnız okuma yapıldı. |
| 5 Eyl 2026 | Güncel Supabase Auth/Edge/RLS belge kontrolü | resmi kaynak | geçti | Kullanıcı JWT'si istek bağlamında doğrulanacak; service-role Edge'e eklenmeyecek; DB yetkisi varsayılan kapalı kalacak. |
| 5 Eyl 2026 | İlk 007 DB kabul testi | izole PostgreSQL 17 restore | beklenen mimari çakışmayı buldu | 003 tetikleyicisi operatörün başka Auth kimliğini kurucu atamasını reddetti. 003 gevşetilmedi; yetkili definer işleminde yalnız kurucu insert'i sırasında JWT bağlamı temizlenip hata/başarı yolunda geri yüklendi. |
| 5 Eyl 2026 | 007 migration + izin/atomiklik + down roundtrip | izole PostgreSQL 17 restore | geçti | Operatör tam kayıt setini oluşturdu; koro içi Şef/anon/service-role reddedildi; duplicate ve geçersiz giriş kısmi veri bırakmadı; migration varsayılan boş allow-list ile geldi ve down ürün verisini değiştirmedi. |
| 5 Eyl 2026 | 003/005/006 regresyonları | aynı izole restore, transaction + `ROLLBACK` | geçti | Tenant izolasyonu, aktif koro ve authenticated DML kilidi 007 uygulanmış durumda geçti. Gerçek kullanıcı veya canlı veri yazılmadı. |
| 5 Eyl 2026 | Edge çekirdek testi | yerel Vitest | geçti | Beş test: publishable-key/legacy-key seçimi, giriş normalizasyonu/red, hata sınıfları ve RPC sonuç sözleşmesi. |
| 5 Eyl 2026 | `pnpm check` | yerel | geçti | 28 dosyada 141 test; lint, typecheck, coverage, service worker ve production build geçti. Edge Deno ve canlı kabul değildir. |
| 5 Eyl 2026 | Supabase DB lint denemesi | izole PostgreSQL 17 | çalıştırılamadı | Yerel sunucuda `pgsql_check` eklentisi yoktu; migration gerçek restore üzerinde doğrudan uygulanıp SQL kabul testleriyle doğrulandı. |
| 5 Eyl 2026 | Taze schema + data yedeği ve geri yükleme | canlı kaynak → izole PostgreSQL 17 | geçti | `genova_pre_007_live_20260905T230753+0300_{schema,data}.sql`; SHA-256 sırasıyla `8a55378fdeb38c56008dcaa14c819f31c85721f4862e079437aafc49efad3901` ve `9473e4b7e6830e831f95a1e7bd86b400244472ca4a899575597ae70dfce3c5e1`. Restore sayıları 1 koro, 28 Auth kullanıcısı, 29 üyelik, 3 rol ve 28 rol eşlemesiydi. Storage/Drive geri yüklemesi değildir. |
| 5 Eyl 2026 | 007 kesin migration + migration geçmişi | canlı `hievmwwctjjlhmssoxsu` | geçti | Yalnız `20260905160539_operator_controlled_choir_creation_007.sql` uygulandı ve geçmişe işlendi; toplu `db push` kullanılmadı. RPC yalnız `authenticated`; anon ve service-role yürütme yetkisi yok. |
| 5 Eyl 2026 | `create-choir` Edge deploy | canlı | geçti | ACTIVE v1, `verify_jwt=true`, SHA `2e05c26d52ba6d660e50d9aa3cdf91825a10241fab8f00352b152820ad8e3561`. Yetkisiz istek 401, anon JWT handler'da güvenli 401, CORS preflight 200 verdi. Gerçek operatör başarı çağrısı yapılmadı. |
| 5 Eyl 2026 | Hosted 003/005/006/007 SQL kabul testleri | canlı, transaction + `ROLLBACK` | geçti | Dört dosya sıfır çıkışla tamamlandı. Sonrasında 1 koro, 29 üyelik, 0 operatör ve 0 audit kaydı yeniden doğrulandı. |
| 5 Eyl 2026 | DB advisor | canlı salt okunur | kapsam sınırıyla geçti | 007'ye özgü security: iki `RLS enabled/no policy` INFO; tablolar doğrudan erişime kapalı olduğu için beklenen. Performance: yeni/boş tablolarda üç unused-index INFO. Kalan 55 security WARN ve 120 performance WARN paylaşımlı mevcut şemaya ait, bu brief'te değiştirilmedi. |

**Teslim:** Planlama `39171c1`, üretim kodu `22889f8`, yerel kanıt
`77a22ef`, publishable-key uyumu `58d171b`. Kod commit'leri `main` dalına
gönderildi; canlı DB migration ve Edge v1 aktiftir. Allow-list boş bırakıldı,
gerçek operatör atanmadı ve gerçek koro oluşturulmadı. İlk gerçek işlemden önce
operatör kimliği ayrıca seçilip yetkilendirilmeli ve authenticated başarı yolu
kontrollü kabul kaydıyla tamamlanmalıdır.

## İlk platform operatörü atandı — 7 Eylül 2026

Ürün sahibi kendi hesabını operatör olarak seçti ve işlemi açıkça yetkilendirdi. Atama canlı
projede `hievmwwctjjlhmssoxsu` üzerinde yapıldı; öncesinde aynı gün alınmış yedek ve
[geri yükleme kanıtı](010-008-canli-yayin-ve-kabul.md#adım-2-sonucu--yedek-ve-geri-yükleme-kanıtlandı-7-eylül-2026) vardı.

| Öğe | Değer |
|---|---|
| İşlem | `insert into genova_007.platform_operators (auth_user_id, granted_by) … on conflict do nothing` |
| Operatör | `alidiyarduran35@gmail.com`, `auth.users.id = 70a75f7c-ca85-4cab-9a8a-b92bbc79677b`, e-postası doğrulanmış, hesap 16 Nisan 2026'da açılmış |
| `granted_by` | Aynı kimlik. İlk operatör olduğu için kendinden başka verecek kimse yoktu; bu bir öz-atamadır ve öyle kaydedilmiştir |
| Sonuç | Allow-list'te **tek satır**. Doğrulama aynı sorguda `auth.users` ile join edilerek yapıldı |
| Şema etkisi | Yok. Yalnız veri satırı; DDL çalıştırılmadı |
| Geri alma | `delete from genova_007.platform_operators where auth_user_id = '70a75f7c-…';` Tek satır, yan etkisiz |

**Bu neyi kapatır, neyi kapatmaz.** Brief'in "allow-list boş, gerçek operatör ataması yok"
maddesi kapandı. **Authenticated başarı yolu hâlâ açık:** `public.create_operator_choir`
`auth.uid()` üzerinden çalışır, yani gerçek bir kullanıcı JWT'si ister. MCP/SQL bağlantısı
service rolüyle çalıştığı için `auth.uid()` boştur ve fonksiyon `insufficient_privilege`
verir — bu doğru davranıştır. Gerçek koro oluşturma, operatör hesabıyla giriş yapılıp
uygulama veya `create-choir` Edge fonksiyonu üzerinden denendiğinde kabul edilebilir.

Koro içi `Şef` rolünün global yetki olmadığı sözleşmesi değişmedi; bu atama yalnız bu tek
hesaba koro oluşturma yetkisi verir.
