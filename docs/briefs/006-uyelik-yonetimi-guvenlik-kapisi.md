# 006 — Üyelik yönetimi güvenlik kapısı

**Durum / tarih / sorumlu yazıcı:** Canlı erişim ve DB güvenlik kesimi tamam;
5 Eylül 2026; ana ajan tek yazıcı. Kurtarma ekranı ve geçici iki anahtarlı yönetici
işlevi yerelde hazır; canlı parola/oturum/e-posta etkisi ayrı açık onay bekler.

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
- `supabase/tests/003_tenant_isolation.sql` — stronger RLS reddinin hata veya
  sıfır-etkilenen-satır biçimlerinin ikisini de kabul eden tenant regresyonu.
- `app/auth/recovery/page.tsx`, `lib/auth-recovery.ts` ve ilgili test — kurtarma
  bağlantısından açılan, yalnız oturum sahibinin yeni parolasını belirleyen tek
  ekran ve doğrulama sözleşmesi.
- `supabase/functions/account-recovery-006/` ve `supabase/config.toml` — yalnız
  bu olay için hazırlanan,
  iki ayrı yönetici anahtarı isteyen, önce salt denetim yapan ve yeniden
  çalıştırmada tamamlanan hesapları atlayan geçici kurtarma işlevi/testleri.
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
  Buradaki tek istisna, 006 güvenlik olayını kapatmak için gereken parola kurtarma
  ekranıdır; genel “şifremi unuttum” ürünü bu brief'e dahil değildir.
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
5. Kurtarma ekranını ve geçici yönetici işlevini yerelde test et. Canlı işlevi
   önce yalnız denetim modunda çalıştır; tam 27 hesap, SMTP bağlantısı ve yönlendirme
   doğrulanmadan parola değiştirme. Ayrı etki onayı sonrası parolaları rastgeleleştir,
   kurtarma bağlantılarını gönder, eski oturumların geçersizliğini doğrula ve geçici
   işlevi/tek kullanımlık anahtarı canlıdan kaldır.

**Bitti tanımı** — hepsi kanıtlanmadan görev kapanmaz:

- [x] `create-choir-users` canlıda çağrı kabul etmiyor ve sabit parola içeren
  kaynak artık aktif fonksiyon olarak bulunmuyor.
- [x] Authenticated Korist ve Şef doğrudan beş ana tabloda insert/update/delete
  yapamıyor; mevcut okuma ve yetkili service-role yolları çalışıyor.
- [ ] Etkilenen hesapların aktif oturum/parola riski onaylı yöntemle giderildi;
  kurtarma teslimatı veya kullanıcıya verilecek güvenli yol kanıtlandı.
- [x] Restore edilmiş DB'de 006 izin/red, down roundtrip ve 003/005 regresyonu geçti.
- [ ] Geçiş başlangıç kontrolü ve rehberin teslim kontrolleri kanıtlandı.
- [x] Kökten `pnpm check` geçti; DB/Edge/Auth/canlı katmanları ayrı raporlandı.
- [x] Yerel diff incelendi; kapsam dışı değişiklik yok; ilgili hafıza ve kanıt
  bağlantıları güncel.

**Opsiyonel alt görev:** Bağımsız alt iş yok; güvenlik ve canlı yetki ana ajanda.

**Sonuç kaydı:**

| Tarih | Komut / işlem | Ortam | Sonuç | Kanıt / sınır |
|---|---|---|---|---|
| 5 Eyl 2026 | Başlangıç kaynak/diff kontrolü | yerel `main` + canlı metadata | geçti | Ağaç temiz; eski fonksiyon v9 ACTIVE/`verify_jwt=false`, kaynakta sabit kimlik bilgileri var; fonksiyon çağrılmadı. |
| 5 Eyl 2026 | Mevcut RLS ve çağrı envanteri | 005 öncesi taze şema yedeği + güncel repo | geçti, açık bulundu | Beş tabloda authenticated DML rol ayrımı olmadan açık; depoda gerekli doğrudan istemci yazısı veya eski fonksiyon çağrısı yok. |
| 5 Eyl 2026 | Supabase changelog ve Auth/Edge/RLS resmi belgeleri | güncel resmî kaynak | geçti | Admin API sunucu-only; service-role istemciye açılmaz; kullanıcı Edge çağrısı doğrulanmış JWT ister. |
| 5 Eyl 2026 | `pnpm check` | yerel | geçti | 25 dosyada 126 test; lint, typecheck, coverage, service worker ve production build geçti. DB/Edge/Auth canlı kabulü değildir. |
| 5 Eyl 2026 | 006 migration + down roundtrip + 006/005/003 DB testleri | PostgreSQL 17'ye geri yüklenmiş canlı öncesi yedek | geçti | Authenticated doğrudan DML reddedildi, service-role yazısı çalıştı, 006 geri al/yeniden uygula veri kaybı olmadan geçti. Canlı DB sonucu değildir. |
| 5 Eyl 2026 | Edge invocation görünümü | canlı panel, son 5 gün | sonuç yok | Panel verisinin yenilenmesi 24 saate kadar sürebilir; eski kullanım veya hiç çağrılmama kanıtı değildir. |
| 5 Eyl 2026 | Auth e-posta yapılandırması | canlı panel, salt okunur | üretim kapısı açık | Custom SMTP yok; proje yerleşik e-posta hizmetini kullanıyor ve panel bunu production için uygun değil olarak işaretliyor. Toplu kurtarma e-postası gönderilmedi. |
| 5 Eyl 2026 | Taze mantıksal yedek + gerçek restore | canlı kaynak → izole PostgreSQL 17 | geçti | `public + auth + private + genova_003 + genova_005`; 651140 byte, 109 ACL kaydı, SHA-256 `4c6efe22413a1f6d78b09e1272371f4cb5bad216d14e1c83524ea68db211df06`. 38 public tablo, 28 Auth kullanıcısı ve 29 üyelik geri yüklendi; 006 roundtrip ile 003/005/006 testleri geçti. Storage/Drive dosya içerikleri kapsam dışı. |
| 5 Eyl 2026 | `create-choir-users` kaldırma | canlı `hievmwwctjjlhmssoxsu` | geçti | Edge Function envanterinden silindi; güvenli `OPTIONS` kontrolü 404 döndü. Başka fonksiyona dokunulmadı. |
| 5 Eyl 2026 | `20260905102806` migration | canlı `hievmwwctjjlhmssoxsu` | geçti | Tek transaction; 15 restrictive authenticated politika ve migration geçmişi doğrulandı. Beş hedef tablonun satır sayıları `29,28,3,15,4` olarak değişmeden kaldı. |
| 5 Eyl 2026 | Hosted 006 + 005 + 003 testleri | canlı DB, transaction + `ROLLBACK` | geçti | 006 doğrudan DML reddi/service-role, 005 aktif koro ve 003 tenant izolasyonu geçti. 003'te bakım bağlantısının `RESET ROLE` davranışı nedeniyle başarısız ilk koşu veri yazmadan durdu; aynı kaynak test bakım rolünü koruyan mekanik uyarlamayla geçti. |
| 5 Eyl 2026 | Kurtarma ekranı + geçici `account-recovery-006` hazırlığı | yerel | geçti | Tam 27 hesap, email sağlayıcısı, iki bağımsız anahtar, açık execute ifadesi, HTTPS yönlendirme, güçlü rastgele parola ve yeniden çalıştırma işaretleri 10 çekirdek testle doğrulandı. `pnpm check`: 27 dosyada 136 test, lint, typecheck, coverage, service worker ve build geçti. Mobil boyutta geçersiz bağlantı ekranı tarayıcı hatası olmadan doğrulandı. Edge Deno/SMTP/Auth canlı entegrasyonu çalıştırılmadı; işlev canlı envanterinde yok. |

**Teslim:** Eski canlı yazma yolu ve doğrudan authenticated DML kapatıldı. Yerel
kurtarma yolu, parolayı e-postaya koymadan tek kullanımlık bağlantı üretir; kısmi
hatada tamamlanan hesabı yeniden döndürmez. 006, canlı denetim ve açık etki onaylı
27 hesap kurtarması tamamlanıp geçici işlev/anahtar kaldırılana kadar kapanmaz;
ardından `007` koro ve `008` davet/üyelik brief'leri gelir.
