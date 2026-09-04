# 003 — uygulama, doğrulama ve canlı geçiş kaydı

4 Eylül 2026. **Yerel uygulama hazır; canlı göç yapılmadı, brief kapanmadı.**
Kullanıcı geçişe başlanmasını onayladı. Bu oturumdaki başlangıç ön kontrolü ve
yerel kanıt tamamlandı; GitHub push, web/Edge yayını veya canlı DDL uygulanmadı.

## Canlı envanter ve kapsam

Doğru bağlantı: `supabase-genesinova`, proje `hievmwwctjjlhmssoxsu`.
MCP ile son kontrolde `public.choirs` yok, 168 mevcut public politika var.
37 tablonun 34'ü kiracı kapsamına alındı; bunların 165 politikası korunarak daraltılıyor.
Ek 34 restrictive politika gelecekteki geniş izinlere karşı kiracı sınırını koruyor.

Web sitesinin `collab_inquiries`, `contact_messages`, `subscribers` tabloları global
kalıyor; bu üç tablonun veri/politika yapısı değiştirilmedi. `public_choir_members`
görünümünün mevcut `security_invoker` davranışı korundu. Anon erişiminin mevcut
kısıtlı davranışı bu görevde genişletilmedi. Website çalışma ağacındaki mevcut
değişiklikler bu görev kapsamında düzenlenmedi veya commit edilmedi.

## Yedek

Supabase hesabı Free; panelde/API'de kullanılabilir platform yedeği bulunmadığı için
gerçek mantıksal dışa aktarma alındı. Boş kök `backup_*.sql` dosyaları yedek sayılmıyor.
Yedekler Git dışında, yalnızca kullanıcı erişimi olan klasörde:

`/Users/alidiyarduran/Documents/Backups/genovakorist/2026-09-04/`

| Dosya | Byte | SHA-256 |
|---|---:|---|
| `genova_schema_2026-09-04.sql` | 135100 | `3c97864a86878a2b1afeaa56ee4649671ae2b444efbf0198337d5284c0c58ed0` |
| `genova_data_2026-09-04.sql` | 765872 | `5e6985311b9d58a30ec80d1da40cf2e173b1cb9d6fc28b40a9a9305d61aafc5a` |
| `genova_roles_2026-09-04.sql` | 358 | `4350a72b5ec109888e740c17f3eb4da2fcd95ab73af26499538ed0bf615db543` |
| `genova_public_before_003_2026-09-04.dump` | 382596 | `577233703f6d5dafbd8fb2b954938a30d3ea9d8e5233ddb190e26b9d5805cc95` |
| `genova_public_pre_003_20260904T150155+0300.dump` | 383114 | `03fe777e0c9d8069a7cf2da61fd1dc2d90871f5b71c0ac29dfbd40ded423f84b` |
| `genova_public_auth_pre_003_20260904T150917+0300.dump` | 509757 | `94cb2f188b68197e7d0471a829fa4199b1eaf6dc4f1735fd83d4f3fc87d1a160` |

Public arşivin 467 içindekiler kaydı/37 tablo-veri bölümü okunabildi ve yerel
PostgreSQL 17'ye gerçekten geri yüklendi. Auth yüzeyi yerelde asgari taklit:
bu, tüm Supabase platformunun felaket kurtarma doğrulaması değildir. Storage/Drive
dosyalarının binary içerikleri SQL yedeğine dahil değil.

**4 Eylül güncel yedek kanıtı:** Supabase Free planda panel yedeği olmadığı için
IPv4 session pooler üzerinden yeni mantıksal arşiv alındı. Public-only arşivinin
okunabilirliği doğrulandı; FK bütünlüğü için eşleşen `public + auth` arşivi izole
PostgreSQL 17 ortamına geri yüklendi. Sonuç: 37 `public` tablosu ve 28 `auth.users`
satırı. Test veritabanı ve geçici roller silindi; yerel sunucunun kapalı olduğu
ayrıca doğrulandı. Bu, Auth/DB ilişkileri için geri yükleme kanıtıdır; Storage/Drive
binary verilerinin veya tüm Supabase platformunun felaket kurtarma testi değildir.

Bağlantı hazırlığında DB parolası yenilendi; macOS Anahtar Zinciri'nde
`Genova Supabase Database` hizmeti altında tutuluyor. Parola Git'e veya bu kayda
konulmadı. Bu bağlantıyı kullanan harici yönetim araçları güncel parolayı kullanmalı.

## Uygulama

- `supabase/migrations/20260903214901_tenant_schema_003.sql`: `choirs`, 34 tablo
  için backfill/NOT NULL/FK/indeks/default, tenant bazlı doğal unique anahtarlar.
- Backfill sırasında uygulama tetikleyicileri geçici kapatılıp eski çalışma moduna
  dönüyor; `updated_at`, audit ve cache değerleri gereksiz değişmiyor.
- `current_choir_id()` yalnız doğrulanmış Auth kullanıcısının üyeliğinden çözülüyor.
  Anon, üyesiz kullanıcı veya kullanıcı kimliği taşımayan service-role için NULL;
  tek koro olsa dahi varsayılan üyelik verilmez.
- SECURITY DEFINER RPC'lerde koro sınırı ve parametre kontrolleri; çapraz-koro FK
  bağlantıları/duyuru hedefleri ve satırın koro kimliğini değiştirme engeli.
- Ortak `tenant-fetch.ts`, doğrulanmış üyelikten alınan kimliği servis sorgularına
  ve insert/upsert gövdelerine ekliyor. Bilinmeyen tablolar/RPC'ler kapalı.
  23 Next API route'u ve Drive erişim kontrolü bu istemciye geçirildi.
- `drive-manager-v2` servis sorgu/yazımları aynı sınırı kullanıyor; dış dosya işlemi
  öncesinde ilgili koro kaydı kontrol ediliyor. Fiziksel Drive ayrıştırması yapılmadı.
- `auth_user_id` global unique kalıyor: mevcut bir Auth hesabı/tek koro sözleşmesi
  değişmedi. Birden çok üyelik/davet/yeni koro ürünü sonraki brief kapsamı.
- Storage istekleri ortak HTTP katmanında değiştirilmez; mevcut kullanıcı/dosya-yolu
  kontrolleri geçerli. Sistem push göndericisi yalnız önceden yetkilendirilmiş üye
  UUID listeleriyle çalışmaya devam ediyor. Tam Drive/Storage izolasyonu iddiası yok.

## Test kanıtları

| Katman | Sonuç | Sınır |
|---|---|---|
| `pnpm check` | geçti (4 Eylül, güncel yerel `main`) | lint, typecheck, 22 test dosyasında 114 test, service worker syntax, üretim build |
| Birim kapsama | %92.77 statement, %81.33 branch | seçili dosyalar; tüm uygulamanın kapsamı değil |
| Ortak tenant transport | 22 test; %97.14 statement/branch | gerçek SDK request üretimi, sahte HTTP yanıtları |
| Uygulama Playwright | 14/14 | masaüstü/mobil login, anonim API reddi, PWA, otomatik a11y; gerçek giriş yok |
| Website | 25 birim, build ve 44/44 Playwright | yerel test; canlı form gönderilmedi |
| DB izolasyonu | geçti | yerel public yedeğinde iki sentetik kullanıcı/koro, 34 tablo taraması; tüm tablolarda ayrı write fixture yok |
| DB ek negatif kontroller | geçti | anon/üyesiz erişim, cross-update/delete/insert, RPC, FK, auth kimliği, service-role upsert/duyuru hedefi |
| Veri korunması ve down | geçti | 37 tablonun içerik hash/count, 168 policy, eski function/trigger/constraint tanımları |
| Edge Deno check | geçti | eski `@ts-nocheck` devam ediyor; deploy/gerçek Drive çalışma testi değil |
| Mobil | çalıştırılmadı | brief kapsam dışı; spike üretim web kapılarından çıkarıldı |

Yeniden çalıştırılabilir SQL:

- `supabase/tests/003_tenant_isolation.sql`: migration uygulanmış şemada sentetik
  fixture üretir, sonunda ROLLBACK. Hosted ortamda izinli migration bağlantısı gerekir.
- `supabase/test-support/003_roundtrip.sql`: **yalnız yerel geri yüklenmiş DB**;
  migration ve down dosyasını aynı transaction'da çalıştırır, sonunda ROLLBACK.
- `supabase/test-support/003_local_bootstrap.sql`: **yalnız boş yerel replica** için
  asgari roller/Auth; migration veya production test sırasına konulmamalı.

## 4 Eylül canlı ön kontrol yenilemesi

- Canlı preflight: hedefteki 34 tablonun tamamı var; eksik kiracı tablosu veya
  beklenmeyen tenant-dışı tablo yok. Hedef tablolarda 165, global website
  tablolarında 3 politika var. `public.choirs` ve `current_choir_id()` henüz yok.
- Canlı migration defterinin son kaydı `20260512215239`; `003` uygulanmamış.
- Yerel `main`, `003` SQL'i ile web API/Edge Function uyarlamalarını içeriyor; bu
  değişiklikler henüz `origin/main`e veya üretime taşınmadı.
- Bu nedenle canlı şema eski sürümle karıştırılmadı. Göç ancak aynı sürüm web/Edge
  yayını için açık bir bakım aralığında, tek migration dosyasıyla uygulanabilir.

## Canlıya geçiş kapıları — şu anda bekliyor

**4 Eyl sonraki oturum güncellemesi:** Chrome Genesi Nova profili üzerinden doğru
Vercel projesine erişim doğrulandı; aşağıdaki CLI engeli tarayıcı erişimiyle aşılabiliyor.
Kullanıcı Railway ve Drive'dan çıkış araştırmasını istedi. Yeni durum/konfigürasyon:
`docs/altyapi-2026-09-04.md`. Canlı göç henüz yapılmadı.

1. Genova Vercel erişimi: mevcut CLI kullanıcısı `diyaaar`, görülebilen tek ekip
   `diyaaars-projects`; altı proje içinde Genova yok. `genesinovachoir` scope erişimi
   başarısız. `app.genesinovachoir.com/login` 200/Vercel veriyor; deploy yetkisi kanıtı değil.
2. Supabase MCP proje bağlantısı bilinçli salt okunur. Aynı projeye ait IPv4 session
   pooler, yalnız yedek/geri yükleme kanıtı için kullanıldı; canlı DDL uygulanmadı.
   Başka hesaba veya projeye geçilmemeli.
3. Taze yedek, geri yükleme ve tablo/politika preflight tamamlandı. DDL'den hemen önce
   aynı kontrolü yinele; migration ile yeni web/Edge sürümünü **birlikte**, yönetilen
   kısa bakım aralığında yayınla. Eski web'i yeni şemada ya da yeni web'i eski şemada
   bırakma: eski service-role yazımları NULL default nedeniyle; yeni sürüm eksik
   `choir_id` nedeniyle çalışmaz.
4. Önce yeni web build'ini canlı trafiğe kapalı hazırla; eski web ve Edge sürümlerini
   kaydet. Yalnız `20260903214901_tenant_schema_003.sql` dosyasını aynı projeye ait
   yazma bağlantısıyla transaction içinde uygula; geçmiş tüm repo migration'larını
   körlemesine push etme.
5. Yeni Edge/web'i etkinleştir. İzinli transaction izolasyon testini çalıştır;
   gerçek üye/şef oturumlarıyla repertuvar, chat, duyuru, ödev, profil ve yoklama
   akışlarını doğrula. Website'nin mevcut okuma/form akışlarını da kontrol et.
6. Ardından brief checklist'ini kapat. Şu an yalnız yedek/geri yükleme/preflight alt
   kapısı tamamlandı; push, deploy, canlı DDL, hosted izolasyon testi ve üyeli akışlar
   tamamlandı sayılmaz.

## Geri dönüş

`supabase/rollback/003_tenant_schema_down.sql` tek transaction içinde çalıştırılır.
Başka koro varsa durur: ikinci koro verisini silerek otomatik dönüş yapmaz.
Eski politika/fonksiyon tanımları migration'ın özel `genova_003` şemasında tutulur;
bu şema istemcilere açık değil. Eski web/Edge sürümü de bakım aralığında geri alınmalı.
Git revert tek başına veritabanını geri almaz. Şema dışı dosya işlemlerini down geri
almaz; böyle bir durum ayrıca uzlaştırılır. Ortak DB'nin tüm yedeğini canlı üstüne
yazmak site form verilerini de kaybettirebilir, varsayılan geri dönüş yöntemi değildir.
