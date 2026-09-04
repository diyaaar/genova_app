# 003 — uygulama, doğrulama ve canlı geçiş kaydı

4 Eylül 2026. **Canlı göç tamamlandı; brief kapandı.** Kullanıcı 003 canlı
geçişini açıkça yetkilendirdi. Web, Edge Function ve DB şeması aynı bakım
aralığında yayınlandı; hosted izolasyon ve oturumlu temel akış kontrolleri geçti.

## Canlı envanter ve kapsam

Doğru bağlantı: `supabase-genesinova`, proje `hievmwwctjjlhmssoxsu`.
Göç öncesinde `public.choirs` yok ve 168 public politika vardı. 37 tablonun 34'ü
kiracı kapsamına alındı; bunların 165 politikası korunarak daraltıldı. Ek 34
restrictive politika gelecekteki geniş izinlere karşı kiracı sınırını koruyor.

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
| `genova_public_auth_pre_003_live_20260904T154916+0300.dump` | 509790 | `125a7c2d3b489405e087c3995ed734b095cbea5a20ef34e4859f8c1b918a593e` |

Public arşivin 467 içindekiler kaydı/37 tablo-veri bölümü okunabildi ve yerel
PostgreSQL 17'ye gerçekten geri yüklendi. Auth yüzeyi yerelde asgari taklit:
bu, tüm Supabase platformunun felaket kurtarma doğrulaması değildir. Storage/Drive
dosyalarının binary içerikleri SQL yedeğine dahil değil.

Canlı DDL'den hemen önce alınan son arşivin içerik listesi `pg_restore --list`
ile doğrulandı. Bu son dosya ayrıca tam geri yüklenmedi; aynı gün alınan eşleşen
`public + auth` arşivinin izole PostgreSQL 17 geri yüklemesi aşağıdaki geri dönüş
kanıtıdır. Bu iki kanıt birbirinin yerine geçirilmez.

**4 Eylül güncel yedek kanıtı:** Supabase Free planda panel yedeği olmadığı için
IPv4 session pooler üzerinden yeni mantıksal arşiv alındı. Public-only arşivinin
okunabilirliği doğrulandı; FK bütünlüğü için eşleşen `public + auth` arşivi izole
PostgreSQL 17 ortamına geri yüklendi. Sonuç: 37 `public` tablosu ve 28 `auth.users`
satırı. Test veritabanı ve geçici roller silindi; yerel sunucunun kapalı olduğu
ayrıca doğrulandı. Bu, Auth/DB ilişkileri için geri yükleme kanıtıdır; Storage/Drive
binary verilerinin veya tüm Supabase platformunun felaket kurtarma testi değildir.

Aynı taze arşivde `003_roundtrip.sql` migration ve down betiklerini aynı transaction
içinde çalıştırdı: 37 tablonun mevcut verisi ile 168 politika, 11 tetikleyici, 8 ilgili
fonksiyon ve kısıtlar roundtrip sonunda eşleşti. Ayrı geçici kopyada migration kalıcı
olarak uygulanıp `003_tenant_isolation.sql` çalıştırıldı; 34 tablo/165 politika için
izolasyon geçti. Sonraki down betiği `choirs` ve tüm `choir_id` kolonlarının kalktığını
doğruladı. Bunların hiçbiri hosted DB veya gerçek üye oturumu kanıtı değildir.

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
| DB izolasyonu | geçti: yerel kopya + hosted production transaction | iki sentetik kullanıcı/koro, 34 tablo taraması; hosted fixture sonunda ROLLBACK |
| DB ek negatif kontroller | geçti | anon/üyesiz erişim, cross-update/delete/insert, RPC, FK, auth kimliği, service-role upsert/duyuru hedefi |
| Veri korunması ve down | geçti (4 Eylül, taze arşiv) | 37 tablonun içerik hash/count, 168 policy, 11 trigger, 8 ilgili function ve constraint roundtrip'i |
| Edge Function | `drive-manager-v2` v14 ACTIVE; JWT'siz istek 401 | authenticated yazma yapılmadı; gerçek kullanıcı verisi değiştirilmedi |
| Canlı web | Vercel Production `3878e1d` Ready; girişli şef üyeliğiyle ana sayfa, repertuvar/PDF, chat, duyuru, ödev, profil ve devamlılık açıldı | salt-okunur duman testi; ayrı korist hesabı ve canlı write/delete denenmedi |
| Ortak website | ana sayfa ve `/tr/contact` 200; üç global tablo/politika korunuyor | canlı form gönderilmedi |
| Edge Deno check | önceki yerel kontrolde geçti | bu kesimde yerel Deno kurulu değildi; server-side deploy derlemesi geçti |
| Mobil | çalıştırılmadı | brief kapsam dışı; spike üretim web kapılarından çıkarıldı |

Yeniden çalıştırılabilir SQL:

- `supabase/tests/003_tenant_isolation.sql`: migration uygulanmış şemada sentetik
  fixture üretir, sonunda ROLLBACK. Hosted ortamda izinli migration bağlantısı gerekir.
- `supabase/test-support/003_roundtrip.sql`: **yalnız yerel geri yüklenmiş DB**;
  migration ve down dosyasını aynı transaction'da çalıştırır, sonunda ROLLBACK.
- `supabase/test-support/003_local_bootstrap.sql`: **yalnız boş yerel replica** için
  asgari roller/Auth; migration veya production test sırasına konulmamalı.

## 4 Eylül canlı geçişi

- `3878e1d`, `origin/main`e gönderildi ve Vercel deployment
  `BLR3gss854haXZdLutioEjnizEP5` Production/Ready oldu.
- Yalnız `20260903214901_tenant_schema_003.sql`, doğru project-ref'in session
  pooler bağlantısında tek transaction ile uygulandı. Eski migration yığını push edilmedi.
- Migration defterine `20260903214901 / tenant_schema_003` kaydı işlendi.
- Canlıda bir `Genesi Nova` koro satırı; 34/34 NOT NULL kolon, default, FK, indeks ve
  restrictive tenant politikası doğrulandı. Toplam public politika 203 oldu.
- `drive-manager-v2` v13 kaynağı yedeklendi; yeni v14 ACTIVE ve `verify_jwt=true`.
- Hosted `003_tenant_isolation.sql` iki sentetik kullanıcı/koro ile geçti ve ROLLBACK yaptı.
- Kesim sonrası gözlem aralığında Supabase Edge 5xx veya Postgres ERROR görülmedi.
- Supabase advisor borcu sürüyor: security 58 WARN; performance 120 WARN + 72 INFO.
  `missing_rls`/ERROR raporlanmadı; bu genel borç 003 kapsamı dışında tutuldu.

## Kalan doğrulama sınırları

- Canlı write/delete testi gerçek kullanıcı verisini değiştirmemek için yapılmadı;
  write izolasyonu hosted transaction içindeki sentetik fixture ile kanıtlandı.
- Ayrı korist hesabıyla UI duman testi yapılmadı. Kullanılan gerçek oturum hem koro
  üyesi hem ŞEF rolündeydi; SQL testi iki ayrı authenticated tenant kimliğini kapsadı.
- Website formu gönderilmedi. Global tabloların şeması/politika sayısı ile iki canlı
  sayfanın HTTP 200 durumu kontrol edildi.
- Storage/Drive binary yedeği ve fiziksel tenant ayrıştırması 003 kapsamı değildir.

## Geri dönüş

`supabase/rollback/003_tenant_schema_down.sql` tek transaction içinde çalıştırılır.
Başka koro varsa durur: ikinci koro verisini silerek otomatik dönüş yapmaz.
Eski politika/fonksiyon tanımları migration'ın özel `genova_003` şemasında tutulur;
bu şema istemcilere açık değil. Eski web/Edge sürümü de bakım aralığında geri alınmalı.
Git revert tek başına veritabanını geri almaz. Şema dışı dosya işlemlerini down geri
almaz; böyle bir durum ayrıca uzlaştırılır. Ortak DB'nin tüm yedeğini canlı üstüne
yazmak site form verilerini de kaybettirebilir, varsayılan geri dönüş yöntemi değildir.
