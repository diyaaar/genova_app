# 008 — Minimum davet ve üyelik

6 Eylül 2026. YEREL PAKET HAZIR; CANLI KABUL BEKLİYOR. Başlangıç: temiz main, 45967a7.
Kullanıcı uygulama istedi; bu tur yerel kod/test, migration ve geri dönüş hazırlığıdır.
Canlı DB/Edge/web kesimi, gerçek hesap/üyelik ve e-posta gönderimi yapılmaz.

## Tek sonuç ve sözleşme

Şef aktif korosuna e-posta, ad/soyad ve ses grubu ile Korist daveti oluşturur;
bağlantıyı kopyalar. Alıcı mevcut hesabıyla giriş yapar veya kendi parolasıyla
Auth kaydı açıp e-postasını doğrular; bağlantıyı yeniden açarak kabul eder.
Yeni hesap kaydı tek başına koro üyeliği vermez. Hesap doğrulama e-postası Auth'a
aittir; bu geliştirme turunda gerçek e-posta tetiklenmez.

- Davet 7 gün geçerli; kriptografik rastgele token yalnız oluşturma yanıtında.
  DB'de yalnız SHA-256 özeti; link fragment'inde taşınır, URL sorgusunda/logda tutulmaz.
- Aynı alıcıya yeniden oluşturma eski bekleyen daveti iptal eder; link geri okunmaz.
- Şef yalnız aktif koroyu yönetir; istek koro kimliği sunucudaki seçime eşit olmalı.
  Partisyon Şefi ve Korist davet yönetemez. Kabul rolü daima Korist.
- Kabulde aktif Auth oturumu, doğrulanmış güncel e-posta, davet süresi/durumu ve
  davet edenin hâlâ aynı koroda aktif Şef olması kontrol edilir.
- Üyelik + rol + davetin tüketimi atomik; eşzamanlı/tekrar kabul, yanlış hesap,
  iptal/süre aşımı reddedilir. Mevcut veya pasif üyelik otomatik yükseltilmez/açılmaz.
- 006 DML kilidi korunur. Gerekli ayrıcalıklı DB işlemi açık yetki kontrolleriyle
  sınırlıdır; istemci/Edge service-role kullanmaz. 003 tetikleyici uyumu test edilir.

## Kaynak ve başlangıç kontrolü

AGENTS, altı hafıza, çalışma döngüsü, geçiş rehberi, mobil teslim planı, kararlar,
005/006/007 sözleşmeleri, AuthProvider, login ve korist listesi kaynakları.
Supabase Auth/signup, Edge authorization ve Postgres yetki/kilit rehberleri.
Yeni Auth hesabı akışı deployment öncesi shared-project Auth ayarlarıyla doğrulanır.

İzinli alanlar: bu brief ve durum/hafıza; 008 migration/down/SQL ve test-support testleri;
supabase/functions/choir-invitations ve config; lib/choir-invitations.ts/test;
components/invitations; app/invite ve app/(main)/koristler davet bağlantısı/sayfası;
tests/e2e ve vitest.config.ts (mevcut React eklentisini JSX testleri için etkinleştirme).
UI, sunucu, DB ayrı sorumluluk taşır. Native, plan-limit, toplu davet, ödeme,
Şef devri, hosting/dosya göçü ve eski hesap kurtarması kapsam dışıdır.

## Kabul

- [x] Oluştur/listele/iptal/kabul; yetkisiz rol/koro, yanlış/doğrulanmamış hesap,
  süre/iptal/tekrar ve atomiklik testleri izole restore üzerinde geçti.
- [x] 003/005/006/007 regresyonları ve 008 down tekrar uygulama geçti.
- [x] Web yönetim ve kabul ekranı, yeni/mevcut kullanıcı akışı, hata/yoğunluk durumu hazır.
- [x] Edge istek/auth/hata sözleşmesi ve web testleri; pnpm check geçti.
- [x] Diff ve devir kaydı; canlı/provider/cihaz doğrulanmayan katmanları açık.

## Yerel kabul kanıtı — 6 Eylül

Plan commit'i `9d91152`; kod/test commit'i `eca1bc7`. Belge kaydı ayrı commit'tir.

- `pnpm check`: 31 dosyada 155 test, lint, TypeScript ve Next üretim derlemesi geçti.
- `pnpm test:e2e`: masaüstü Chromium ve mobil Chrome toplam 20 test geçti.
  Auth kayıt/akış testleri mock kullanır; gerçek sağlayıcı/e-posta teslimi kanıtı değildir.
- 007 öncesi yedeğin ayrı localhost PostgreSQL 17 restore'u üzerinde 007/008 uygulandı;
  003/005/006/007/008 SQL regresyonları geçti. Canlı DB'ye yazılmadı.
- `supabase/test-support/008_concurrency.mjs`: iki eşzamanlı kabulden yalnız biri
  başarılı; gerçek down dosyasından sonra kabul edilmiş üyelik korunuyor. Tekrar
  migration ve 008 SQL testi geçti; test fixture'ları temizlendi.
- Yerel security/performance advisor sonuçlarında 008 bulgusu yok. Mevcut iki
  search_path uyarısı ve diğer eski performans bulguları bu kapsamda değiştirilmedi.
- `git diff --check` geçti. Yeni bağımlılık yok; mevcut React Vite eklentisi
  JSX bileşen testlerini çalıştırmak için etkinleştirildi.

## Canlıya geçmeden açık kapılar

### 6 Eylül — canlı erişim ön kontrolü: bekliyor

Kullanıcının sonraki adımla devam isteği üzerine temiz `main` / `f404877` üzerinde
AGENTS, altı hafıza, geçiş rehberi, çalışma döngüsü, MIGRATION, KARARLAR ve bu brief
okundu. Hedef 008 canlı ön koşullarını doğrulamaktır; eski kullanıcı parolaları,
üyelik değişiklikleri ve başka proje kapsam dışıdır.

Bağlı Supabase MCP proje listesi yalnız `Orbiba Website` döndürdü. Kesin Genova
`hievmwwctjjlhmssoxsu` kimliğiyle proje ayrıntısı isteği de yetki hatası verdi.
Bu oturumda istenen `supabase-genesinova` erişimi doğrulanamadı. Başka projeye
sorgu/yazı yapılmadı; CLI veya başka hesapla alternatif DB erişimine geçilmedi.
Yeni canlı yedek, Auth ayarları, migration/Edge/web yayını ve gerçek kabul testi
çalıştırılmadı. Genova yetkili bağlantısı yenilenince bu kapıdan devam edilir;
önceki yerel test sonuçları yeniden koşulmuş veya canlı kabul edilmiş sayılmaz.

### 6 Eylül — Chrome üzerinden ön kontrol

Kullanıcı Chrome üzerinden işlem veya ilgili yetkilendirmeyi açıkça istedi.
MCP kesin proje isteği tekrar yetki hatası verdi; Chrome Genesi Nova profilinde
`genesinovachoir` organizasyonu ve `hievmwwctjjlhmssoxsu` main PRODUCTION paneli
başarıyla açıldı. Panel erişimi doğrulandı; MCP yetkisi düzeltilmiş değildir.

- Sign In / Providers: yeni kayıt açık, Confirm email açık, anonymous sign-in kapalı.
- Emails / SMTP: custom SMTP anahtarı kapalı; yerleşik e-posta servisi kullanılıyor.
  006 ayrıntılı kanıt tablosu da bunu belirtir; özetlerdeki “SMTP doğrulandı”
  ifadesi özel SMTP veya gerçek e-posta teslimatı kanıtı olarak okunmamalıdır.
- Database / Backups: Free Plan proje yedeklerini içermiyor; panel yükseltme sunuyor.
  Ücretli plan alınmadı, yeni erişim verilmedi, Auth ayarı değiştirilmedi.

Canlı yayın hâlâ bekliyor: güncel dış mantıksal yedek/restore ve üretim e-posta
sağlayıcısı kurulumu/teslim kabulü gerekli. Tarayıcı erişimi bunların yerine geçmez.

### Kalan yayın kapıları

Kesin Genova hesabı/projesi, taze backup ve restore, ortak web sitesi Auth
tetikleyicileri/ayarları ve DB–Edge–web uyumu yeniden kontrol edilir. E-posta
doğrulaması açık olmalı: otomatik doğrulama alıcı sahipliğini kanıtlamaz.
Signup izni, SMTP/redirect ve gerçek doğrulama bağlantısı ardından kontrollü
oturumlu oluştur/kabul/iptal testi gerekir. Hosted Edge/Deno gateway, gerçek
sağlayıcı ve cihaz katmanları bu yerel kabulde çalıştırılmadı. Gerçek üyelik,
e-posta, deploy veya push yapılmadı; kabul edilmiş üyelik rollback ile silinmez.

Sonraki adım: bu canlı kapılar ve 008 kabulü → ayrı minimum plan-limit brief'i → 004.

Geçici restore DB'si düşürüldü ve izole PostgreSQL durduruldu; kalan geçici
cluster klasörü Çöp Sepeti'ne taşındı. Asıl yedeklere dokunulmadı.

Geri dönüş: önce web girişini kaldır, Edge'i geri al, 008 down uygula; kabul edilmiş
üyelikler silinmez. Canlı kesim öncesi taze backup/restore ve iki proje etkisi gerekir.
Sıra: DB → Edge → web; önceki sürümler yeni akışa bağımlı değildir.
