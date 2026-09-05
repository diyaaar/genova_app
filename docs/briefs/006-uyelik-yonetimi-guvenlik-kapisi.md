# 006 — Üyelik yönetimi güvenlik kapısı

**Durum / tarih / sorumlu yazıcı:** Planlandı; 5 Eylül 2026; ana ajan tek yazıcı.
Canlı kapatma, parola/oturum işlemleri ve DB göçü ayrı açık yetki bekler.

**Amaç (tek cümle) ve kullanıcı ihtiyacı:** Yeni koro ve davet akışını kurmadan
önce eski toplu kullanıcı bootstrap yolunu erişilemez kılmak ve üyelik/rol ana
verisinin yalnız yetkisi doğrulanmış sunucu akışından değişmesini sağlamak.

**Başlangıç kanıtı:** Temiz `main` üzerinde canlı `hievmwwctjjlhmssoxsu`
fonksiyon envanteri okundu. `create-choir-users` v9 ACTIVE ve `verify_jwt=false`;
çağrılınca service-role istemcisiyle Auth ve üyelik yazıyor, kaynakta 27 kullanıcı
için sabit başlangıç parolası bulunuyor. İşlev çağrılmadı ve kaynak geçici kopyası
kalıcılaştırılmadan silindi. Depoda bu fonksiyonu çağıran kod veya kaynak geçmişi
yok. Aynı tarihli taze şema kanıtında `choir_members`, `choir_member_roles`,
`roles`, `departments` ve `schools` için authenticated rolüne tenant içindeki
insert/update/delete işlemlerini rol ayrımı olmadan açan politikalar var; mevcut
istemci kodunda bu tablolara gerekli doğrudan yazma yolu bulunmadı.

Supabase'in güncel resmi sözleşmesine göre admin kullanıcı API'leri yalnız sunucuda
ve service-role anahtarı istemciye açılmadan kullanılmalı; kullanıcı çağrılı Edge
Function varsayılan olarak doğrulanmış kullanıcı JWT'si istemelidir:

- [Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Edge Function güvenliği](https://supabase.com/docs/guides/functions/auth)
- [Function yapılandırması](https://supabase.com/docs/guides/functions/function-configuration)

**İzinli dosyalar / modüller:**

- `docs/briefs/006-uyelik-yonetimi-guvenlik-kapisi.md` — görev ve kanıt kaydı.
- `supabase/migrations/*_membership_admin_lockdown_006.sql` — beş ana veri
  tablosunda authenticated doğrudan yazmayı restrictive politikalarla kapatma.
- `supabase/rollback/006_membership_admin_lockdown_down.sql` — yalnız 006'nın
  eklediği restrictive politikaları kaldıran DB geri dönüşü.
- `supabase/tests/006_membership_admin_lockdown.sql` ve gerekirse
  `supabase/test-support/006_roundtrip.sql` — izin/red ve kayıpsız geri dönüş kanıtı.
- `MIGRATION.md`, `KARARLAR.md`, `memory-bank/activeContext.md`,
  `memory-bank/progress.md`, `memory-bank/systemPatterns.md` — yalnız bu işin
  kısa durum/karar bağlantıları.
- Canlı Supabase'de yalnız `create-choir-users` fonksiyonunun devre dışı
  bırakılması/silinmesi, etkilenen hesap oturumlarının kapatılması ve kontrollü
  parola kurtarma işlemi; her biri ayrıca kayda alınır.

**Kaynaklar / mevcut desen:**

- `AGENTS.md`, `docs/gecis-rehberi.md`, `docs/ai-calisma-duzeni.md` — çalışma,
  canlı yetki ve kabul kapıları.
- `docs/briefs/005-coklu-uyelik-aktif-koro.md` ve
  `supabase/migrations/20260905003154_multi_membership_active_choir_005.sql` —
  aktif koro, `auth.uid()` ve JWT `session_id` sözleşmesi.
- `supabase/migrations/20260424_db_auth_rls_hardening.sql` — API-only tablolarda
  authenticated doğrudan yazmayı restrictive politika ile kapatma deseni.
- `app/api/profile-change-requests/review/route.ts` — mevcut üye profili
  değişikliğinin yetkili sunucu yolu; yeni public üyelik API'si değildir.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
  ve proje içi Postgres güvenlik/least-privilege kuralları.

**Geçiş başlangıç kontrolü** — [geçiş rehberi](../gecis-rehberi.md).

- Okunan talimatlar, kararlar ve kanıt: `AGENTS.md`, altı `memory-bank` dosyası,
  `MIGRATION.md`, `KARARLAR.md`, çalışma döngüsü, rehber, 005 brief/migration,
  mevcut RLS şeması ve canlı Edge metadata/kaynağı.
- Tek altyapı işi: üyelik yönetimi için güvenlik kapısı. Native/WebView ekranı
  veya koro/davet ürün arayüzü bu brief'te yapılmaz.
- Korunacak davranış: mevcut kullanıcılar giriş yapıp kendi aktif korolarını
  okuyabilir; 005 tenant/oturum izolasyonu ve yetkili Next servis yolları sürer.
- İzinli dosyalar yukarıda; aynı ağaçta ana ajan tek yazıcıdır. Kullanıcının
  “devam edelim” talebi yerel plan/hazırlığı kapsar; canlı erişim kesme, toplu
  oturum kapatma ve kullanıcıya e-posta gönderme etkileri ayrıca açıkça onaylanır.
- Testler: restore edilmiş DB'de Korist ve Şef JWT bağlamıyla doğrudan DML reddi,
  service-role işlemi ve rollback; 003/005 regresyonu; `pnpm check`; canlıda
  fonksiyonun erişilemediği salt güvenlik kontrolü. SMTP ve parola kurtarma yolu
  doğrulanmadan toplu e-posta gönderilmez.

**Kapsam dışı** — bu görevde kesinlikle yapılmayacaklar:

- Koro oluşturma, davet kabulü, üyelik yönetimi UI'ı, plan/limit veya RN kabuk.
- Yeni gerçek koro/üyelik, deneme kullanıcısı veya ikinci üyelik oluşturma.
- Sabit parolaları belgeye, Git'e, loga, hafızaya ya da devir mesajına kopyalama.
- `send-email` veya başka Edge Function'ları bu bulgu gerekçesiyle sessizce
  değiştirme; ayrı kanıt ve brief olmadan kapsam genişletme.
- Varsayılan Supabase SMTP ile gerçek kullanıcılara toplu ileti gönderme.

**Risk / yetki / geri dönüş:**

- Eski fonksiyonun kapatılması çağrı yapan bilinmeyen bir haricî otomasyonu
  durdurabilir; depoda çağıran bulunmadı. Güvenli olmayan davranış geri açılmaz;
  ilerideki davet servisi yeni, kaynak kontrollü ve yetkili bir fonksiyon olur.
- Auth parolası/oturum değişimi kullanıcıları dışarı atar ve e-posta iletişimi
  gerektirebilir. Etkilenen 27 hesap için yöntem, SMTP teslimatı ve destek mesajı
  doğrulanmadan uygulanmaz; ayrıntılı kullanıcı verisi brief'e yazılmaz.
- DB migration yalnız restrictive politikalar ekler. Geri dönüş bu politikaları
  kaldırır; veri satırı değiştirmez. Canlıdan önce taze yedek/restore ve 003/005
  uyumu zorunludur; Git revert canlı veritabanını geri döndürmez.
- Canlı hedef proje kimliği `hievmwwctjjlhmssoxsu` dışında bir proje görülürse
  veya yedek/geri yükleme kanıtı yoksa durulur.

**Küçük uygulama adımları:**

1. Fonksiyon metadata/kullanım kanıtını ve beş tablonun canlı politika setini
   yeniden doğrula; eski fonksiyonu asla çağırma.
2. Restrictive DML kilidini, testini ve yalnız 006'yı geri alan down SQL'ini yaz;
   taze restore üzerinde 003/005 regresyonu ve roundtrip çalıştır.
3. `pnpm check` ve diff incelemesi sonrası production kod commit'ini oluştur;
   canlı işlemleri kullanıcı yetkisi, taze yedek ve kesim kontrolüyle ayrı yürüt.
4. Canlı fonksiyonu erişilemez kıl, anonim ve kullanıcı JWT'siyle salt durum
   kontrolü yap; ardından onaylı parola/oturum kurtarma planını uygula ve teslimatı
   kişisel veriyi ifşa etmeden kaydet.

**Bitti tanımı** — hepsi kanıtlanmadan görev kapanmaz:

- [ ] `create-choir-users` canlıda çağrı kabul etmiyor ve sabit parola içeren
  kaynak artık aktif fonksiyon olarak bulunmuyor.
- [ ] Authenticated Korist ve Şef doğrudan beş ana tabloda insert/update/delete
  yapamıyor; mevcut okuma ve yetkili service-role yolları çalışıyor.
- [ ] Etkilenen hesapların aktif oturum/parola riski onaylı yöntemle giderildi;
  kurtarma teslimatı veya kullanıcıya verilecek güvenli yol kanıtlandı.
- [ ] Restore edilmiş DB'de 006 izin/red, down roundtrip ve 003/005 regresyonu geçti.
- [ ] Geçiş başlangıç kontrolü ve rehberin teslim kontrolleri kanıtlandı.
- [ ] Kökten `pnpm check` geçti; DB/Edge/Auth/canlı katmanları ayrı raporlandı.
- [ ] Diff incelendi; kapsam dışı değişiklik yok; ilgili hafıza ve kanıt
  bağlantıları güncel.

**Opsiyonel alt görev:** Bağımsız alt iş yok; güvenlik ve canlı yetki ana ajanda.

**Sonuç kaydı:**

| Tarih | Komut / işlem | Ortam | Sonuç | Kanıt / sınır |
|---|---|---|---|---|
| 5 Eyl 2026 | Başlangıç kaynak/diff kontrolü | yerel `main` + canlı metadata | geçti | Ağaç temiz; eski fonksiyon v9 ACTIVE/`verify_jwt=false`, kaynakta sabit kimlik bilgileri var; fonksiyon çağrılmadı. |
| 5 Eyl 2026 | Mevcut RLS ve çağrı envanteri | 005 öncesi taze şema yedeği + güncel repo | geçti, açık bulundu | Beş tabloda authenticated DML rol ayrımı olmadan açık; depoda gerekli doğrudan istemci yazısı veya eski fonksiyon çağrısı yok. |
| 5 Eyl 2026 | Supabase changelog ve Auth/Edge/RLS resmi belgeleri | güncel resmî kaynak | geçti | Admin API sunucu-only; service-role istemciye açılmaz; kullanıcı Edge çağrısı doğrulanmış JWT ister. |
| 5 Eyl 2026 | `pnpm check` | yerel | geçti | 25 dosyada 126 test; lint, typecheck, coverage, service worker ve production build geçti. DB/Edge/Auth canlı kabulü değildir. |

**Teslim:** Önce yerel migration/test; sonra açık canlı güvenlik yetkisi. Bu kapı
kapanınca `007` koro oluşturma, ardından `008` davet/üyelik ayrı brief olur.
