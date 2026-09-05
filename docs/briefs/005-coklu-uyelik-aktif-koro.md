# 005 — Çoklu üyelik ve aktif koro sözleşmesi

**Durum / tarih / sorumlu yazıcı:** Yerelde tamamlandı, canlı bekliyor ·
5 Eylül 2026 · ana ajan, tek yazıcı.

**Amaç (tek cümle) ve kullanıcı ihtiyacı:** Bir Auth hesabının birden fazla koroya
üye olabilmesini, web ve gelecekteki native istemcinin o oturum için seçtiği koroyu
veri sızıntısı olmadan kullanmasını sağlamak.

**Başlangıç kanıtı:** `main` temiz ve `origin/main` ile eşitti (`986a5e7`). 003 canlıda
tamamlandı; `choir_members.auth_user_id` hâlâ global unique ve
`current_choir_id()`/istemci/sunucu yolları tek üyelik varsayıyor. Kullanıcı 5 Eylül'de
sonraki adımla devam edilmesini istedi. `supabase-genesinova` bağlantısı başlangıç
kontrolünde yeniden kimlik doğrulama istedi; bu brief canlı işlem yetkisi sayılmaz.

## Ürün ve güvenlik sözleşmesi

- Bir kişi tek Auth hesabıyla birden fazla koroya üye olabilir; her koroda ayrı
  `choir_members` kaydı, profil alanları ve rolleri vardır.
- Aktif koro istemcinin serbestçe belirlediği bir yetki değildir. Seçim, doğrulanmış
  `auth.uid()` ve JWT `session_id` ile oturuma bağlanır; hedef koronun üyeliği
  veritabanında doğrulanmadan kaydedilmez veya kullanılmaz.
- Tek üyeli mevcut kullanıcı otomatik olarak aynı koroda çalışmaya devam eder.
  Birden fazla üyeliği olan kullanıcı için oturum seçimi yoksa `current_choir_id()`
  `NULL` döner; rastgele `LIMIT 1` davranışı yasaktır.
- Koro listesi yalnız oturum sahibinin üyeliklerini döndüren dar bir RPC üzerinden
  okunur. Aktif seçim değişince özel React Query, URL, sohbet, ödev, repertuvar,
  offline PDF ve ses durumu temizlenir; eski koro kanalları yeniden kurulmadan
  yeni koro verisi gösterilmez.
- Next API ve `drive-manager-v2`, service-role sorgusundan önce aktif koroyu
  doğrulanmış kullanıcı oturumuyla çözer. İstek gövdesindeki `choir_id` yetki değildir.
- İlk canlı sıralama: uyumlu DB migration → Edge/web yayınları → doğrulama. Yeni
  çoklu üyelik ancak bu üçü hazır olduktan sonra oluşturulur.

## Geçiş başlangıç kontrolü

- Okunan talimatlar, kararlar ve mevcut kanıtın yolları: `AGENTS.md`, altı
  `memory-bank/*.md`, `docs/ai-calisma-duzeni.md`, `docs/gecis-rehberi.md`,
  `MIGRATION.md`, `KARARLAR.md`, 003 migration/brief/doğrulama kaydı,
  `components/AuthProvider.tsx`, `lib/server/tenant-client.ts`, ilgili API ve Edge kodu.
- Tek ekran / altyapı işi; native / WebView / ortak mantık / backend sınırı:
  ortak Auth/RLS sözleşmesi ve web koro seçimi. RN ürünü kurulmaz; sözleşme RN'in
  ileride aynı RPC'leri kullanabileceği şekilde istemciden bağımsızdır.
- Korunacak mevcut davranış, ortak sözleşme ve web etkisi: tek üyeli kullanıcı
  otomatik giriş yapar; mevcut rol, RLS, Realtime ve kiracı filtreleri daralmaz;
  website'in üç global tablosuna dokunulmaz.
- İzinli dosyalar, tek yazıcı ve bu iş için verilmiş kullanıcı yetkisi: aşağıdaki
  dosyalar; ana ajan tek yazıcı. Kullanıcı yerel uygulamaya devam izni verdi;
  canlı DB/Edge/web kesimi taze yedek ve açık geçiş kontrolü olmadan yapılmaz.
- Gerekli testler, ortamları, geri dönüş ve çözülmemiş çelişkiler: restore edilmiş
  yerel PostgreSQL'de migration/down ve oturum/koro izolasyonu; web birim kapısı ve
  tarayıcı akışı. Canlı MCP oturumu şu an açık değildir. Supabase'in güncel RLS
  rehberi; üyelik helper'larının özel şemada, sabit `search_path` ve dar execute
  yetkisiyle kurulmasını gerektirir.

## İzinli dosyalar / modüller

- `supabase/migrations/` — CLI ile oluşturulan 005 migration; çoklu üyelik,
  oturum seçimi, dar RPC'ler ve mevcut helper uyarlamaları.
- `supabase/tests/`, `supabase/test-support/`, `supabase/rollback/` — izin/red,
  iki oturum/iki koro, roundtrip ve güvenli geri dönüş kanıtı.
- `lib/choir-context.ts`, ilgili test — istemciden bağımsız koro listesi/seçimi ve
  tercih anahtarı sözleşmesi.
- `components/AuthProvider.tsx`, `components/ChoirSelectionGate.tsx`,
  `components/ChoirSwitcher.tsx`, `components/TopBar.tsx`, `app/(main)/layout.tsx`
  — başlangıç kapısı, seçici ve kiracı değişiminde yeniden kurulum.
- `lib/chat-cache.ts`, `lib/notification-cache.ts` ve ilgili testler — koro
  değişiminde tenant türevi tarayıcı verilerini temizleme.
- `lib/server/supabase-auth.ts`, `lib/server/tenant-client.ts`,
  `lib/server/drive-file-access.ts`, bunların testleri ve çağıran `app/api/**`
  yolları — doğrulanmış access token üzerinden aktif koro çözümü.
- `supabase/functions/drive-manager-v2/index.ts` — Edge tarafında aynı aktif koro
  sözleşmesi; Drive sağlayıcısının kendisi değişmez.
- `KARARLAR.md`, `MIGRATION.md`, `memory-bank/activeContext.md`,
  `memory-bank/systemPatterns.md`, `memory-bank/progress.md`, bu brief — karar,
  durum ve kanıt bağlantıları.

## Kaynaklar / mevcut desen

- `supabase/migrations/20260903214901_tenant_schema_003.sql` — 34 tenant tablo,
  restrictive RLS ve `current_choir_id()` başlangıç davranışı.
- `docs/briefs/003-dogrulama.md` — canlı şema, yedek/geri yükleme ve kesim sırası.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
  — allow/deny testi, üyelik helper'ı, sabit `search_path` ve dar yetki deseni.
- [Supabase API güvenliği](https://supabase.com/docs/guides/api/securing-your-api)
  — grants + RLS ayrımı ve istek bağlamı.
- `components/AuthProvider.tsx`, `lib/server/tenant-client.ts`,
  `supabase/functions/drive-manager-v2/index.ts` — bugün tek üyelik seçen üç yol.

## Kapsam dışı

- Koro oluşturma, davet, üyelik yönetim ekranı ve e-posta gönderimi.
- Plan/limit tabloları, ödeme/faturalama ve mağaza kayıtları.
- Railway/Drive/R2 dosya taşıması, DNS veya hosting kesimi.
- RN ürün alanı, native giriş/kabuk ve kalıcı WebView ekranları.
- Canlı DB migration, Edge deploy, web push veya gerçek kullanıcıya ikinci üyelik.
- İlgisiz politika temizliği, advisor borcu veya geniş refactor.

## Risk / yetki / geri dönüş

- DB genesinovachoir sitesiyle ortaktır. Canlı öncesi yeni mantıksal yedek,
  okunabilir arşiv ve izole geri yükleme gerekir; Storage/Drive binary'leri DB
  yedeğinde değildir.
- Kod geri dönüşü commit revert'tir. DB down betiği, aynı `auth_user_id` için birden
  fazla üyelik oluşmuşsa veri silmek yerine durur; Git revert veri geri dönüşü değildir.
- DB migration eski tek üyelik istemcileriyle uyumlu olmalıdır. Çoklu üyelik
  eklenmeden önce web/Edge'in 005 sürümü canlı ve doğrulanmış olmalıdır.
- Aktif seçim bulunamazsa fail-closed davranılır; servis `single()` ile rastgele
  üyelik seçmez ve kullanıcı seçim ekranına yönlendirilir.

## Küçük uygulama adımları

1. 005 migration/down/test dosyalarını CLI ile oluştur; restore edilmiş 003 sonrası
   şemada tek üyelik, çoklu üyelik, iki session, üye olmayan hedef ve tüm tenant
   erişimlerini doğrula.
2. Ortak web Auth bağlamını, Next API ve Edge tenant çözümünü aktif koro RPC'lerine
   bağla; seçim kapısı/değiştirici ve cache temizliğini ekle.
3. Birim, `pnpm check`, uygun Playwright ve yerel DB roundtrip testlerini çalıştır;
   diff/kanıt/hafızayı güncelle ve üretim ile belgeleri ayrı commit'le.
4. Canlı aşamayı taze yedek, geri yükleme, yeniden Supabase yetkisi ve kesim
   kontrolü hazır olduğunda ayrıca yürüt.

## Bitti tanımı

- [x] Tek Auth hesabı iki koroda ayrı üye olabilir; aynı koroda tekrar bağlanamaz.
- [x] Tek üyeli kullanıcı seçim yapmadan eski davranışla çalışır.
- [x] Çok üyeli kullanıcıda seçim yoksa tenant verisi okunmaz/yazılmaz; kendi
  korosu seçilebilir, üye olmadığı koro reddedilir.
- [x] Aynı kullanıcının iki farklı JWT `session_id` oturumu birbirinden bağımsız
  koro seçebilir ve cross-tenant erişemez.
- [x] `current_choir_member_id`, rol/ses grubu helper'ları, Next service client,
  Edge Function ve web Auth aynı aktif koroyu kullanır.
- [x] Koro değişiminde eski koroya ait bellek, URL, offline dosya ve Realtime
  bağlantıları yeni ekrana taşınmaz.
- [x] Restore edilmiş DB'de migration + izolasyon + down roundtrip geçer; down,
  gerçek çoklu üyelik varsa veri kaybetmeden durur.
- [x] Geçiş başlangıç kontrolü ve rehber teslim kontrolleri kanıtlandı.
- [x] Kökten `pnpm check` ve ilgili `pnpm test:e2e` senaryoları geçer.
- [x] Diff yalnız izinli kapsamda; ilgili hafıza/karar/durum bağlantıları güncel.

## Sonuç kaydı

| Tarih | Komut / işlem | Ortam | Sonuç | Kanıt / sınır |
|---|---|---|---|---|
| 5 Eyl 2026 | Başlangıç kaynak/diff kontrolü | yerel `main` | geçti | Ağaç temiz; 003 kanıtı ve tek üyelik yolları okundu. |
| 5 Eyl 2026 | `supabase-genesinova` envanter/advisor isteği | canlı MCP | bekliyor | Bağlantı `Auth required`; canlı okuma/yazma yapılmadı. |
| 5 Eyl 2026 | 003 sonrası 005 migration + izolasyon | izole PostgreSQL 17, 4 Eyl yedeği | geçti | SHA-256 `125a7c2d...a593e`; 38 public tablo, 28 Auth kullanıcısı, 29 mevcut üyelik; 003'ün 34/34 tenant taraması ile iki session/iki koro, rol/ses/RLS ve push sahipliği test edildi. |
| 5 Eyl 2026 | 005 down + roundtrip | aynı izole kopya | geçti | Gerçek çoklu üyelik fixture'ında down durdu; fixture uzlaştırılınca veri/policy/function/trigger/constraint/index birebir eşleşti. Geçici sunucu kapatıldı. |
| 5 Eyl 2026 | `pnpm check` | yerel | geçti | 25 dosyada 126 test; %92,93 statement / %81,77 branch; lint, typecheck, service worker ve production build geçti. |
| 5 Eyl 2026 | `pnpm test:e2e` | yerel Chromium + Pixel profili | geçti | 16/16; çoklu üyelik seçim kapısı, seçim sonrası aktif koro ve ciddi/kritik Axe ihlali olmaması dahil. Gerçek Supabase oturumu değildir. |
| 5 Eyl 2026 | Edge kaynak kontrolü | yerel | sınırlı | `drive-manager-v2` aktif koro RPC'sine bağlandı; Deno kurulu olmadığından ayrı Deno check/deploy yapılmadı. Next build Edge dosyasını doğrulamaz. |
| 5 Eyl 2026 | Üretim/test commit'i | yerel `main` | geçti | `7b86a57`; push, deploy ve canlı DB işlemi yapılmadı. |

**Teslim:** Üretim ve belge commit'leri ayrı tutuldu. Canlıya kadar durum
“yerelde hazır / canlı bekliyor” kalır; sıradaki tek adım yeniden Genesinova Supabase
yetkisi, taze yedek/restore ve koordineli DB → Edge/web kesim ön kontrolüdür.
