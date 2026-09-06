# 009 — Auth e-postası ve değiştirilebilir yanıt hedefi

6 Eylül 2026. Durum: uygulama sürüyor. Ana ajan tek yazıcı.
Başlangıç: temiz `main`, `f365216`. Kullanıcı kalan Resend/Supabase ayarlarını
tamamlama ve masaüstündeki Resend anahtarını kullanma yetkisini verdi;
yanıt hedefini `genesinova.choir@gmail.com` olarak seçti.

## Tek sonuç / teslim odağı

008'in doğrulama e-postası engelini kaldır: Auth e-postaları
`Genova Team <team@mail.genesinovachoir.com>` göndereniyle iletilsin;
bu adrese gelen yanıtlar sonradan değiştirilebilir tek hedefe yönlendirilsin.

## Başlangıç kontrolü ve kapsam

- Okunan kaynaklar: AGENTS, altı memory-bank dosyası, çalışma düzeni,
  geçiş rehberi, MIGRATION, KARARLAR, mobil teslim planı ve 008 brief'i.
- Auth giriş/kurtarma kodu ve ortak web sitesi Auth kullanımı kontrol edilir.
- Kullanıcıya ait SMTP entegrasyonu açık; Resend alan adı Verified.
  DNS: `mail` MX Resend Ireland; kök MX Google. SMTP gönderici kullanıcı seçimidir.
- Canlı Site URL hâlâ `http://localhost:3000`; recovery URL'si listede mevcut.
- MCP Genova isteği yetkisiz; mevcut CLI hesabı canlı API'den doğru proje ve
  organizasyonu listeledi. Auth ayarları doğrulanmış Chrome panelinden, Edge
  deployment/secret işlemleri yalnız kesin proje ref'iyle CLI'den yapılabilir.
- Masaüstündeki Resend anahtarı yalnız göndermeye yetkili; gelen içerik okumaya
  yetmez. Sır değerleri repo, log veya kullanıcı çıktısına yazılmaz.
- İzinli alanlar: bu brief, 008 kanıt bağlantısı, activeContext/progress;
  `supabase/functions/resend-inbound/`, ilgili testler ve config bölümü;
  gerekirse `scripts/` altında bu işe özgü işletim aracı. Kod ve belge ayrı commit.
- Yetki: mevcut Auth gönderimini yapılandırma, tek yanıt hedefi, bu akış için
  gerekli Edge deployment ve yalnız işletmeci/test adreslerine kontrollü test.

## Sözleşme / risk / geri dönüş

- Yeni üyelik/DB şeması, eski hesap parolaları, 008 deploy, web push, hosting,
  ücretli plan ve pazarlama bu işin dışında. Gönderim/yanıt testi ürün göçü değildir.
- Auth doğrulaması açık kalır. Site URL production'a alınır; gerekli kesin dönüş
  yolları korunur/eklenir. Production için geniş `/**` önerisi uygulanmaz.
- Inbound yalnız imzalı `email.received` olaylarını ve tam `team@mail...` alıcısını
  kabul eder. Yanıt hedefi sunucu ayarıdır; webhook'tan seçilemez.
- Döngü/otomatik yanıt koruması, sağlayıcı tekrarlarında idempotency, ek ve boyut
  sınırı gerekir. E-posta içeriği/loglara sırlar yazılmaz. DB erişimi gerekmez.
- Hedef ayarı değişikliği yeni mobil/web sürümü gerektirmez; açık işletim adımları
  bu brief'e eklenir. Yönlendirme, Gmail'den Genova adına cevap göndermeyi kurmaz.
- Geri dönüş: webhook devre dışı; yeni Edge durdurulabilir. SMTP/DNS kullanıcı
  kurulumu silinmez. Auth ayarlarının önceki değerleri bu kayıtta tutulur.

## Kabul

- [ ] SMTP, Verified domain, tracking ve kesin Auth dönüş ayarları doğrulandı.
- [ ] İmza, yanlış alıcı, tekrar, otomatik yanıt/döngü ve sağlayıcı hata testleri geçti.
- [ ] `pnpm check`, ilgili Edge kontrolü ve `git diff --check` geçti.
- [ ] Canlı imzasız istek reddi ve test yanıtının hedefe teslimi doğrulandı.
- [ ] Gerçek Auth doğrulama/kurtarma e-posta katmanı, çalıştırılmayan sınırlar açık.
- [ ] Hedef değiştirme/geri dönüş belgeli; hafıza güncel; kod/belge ayrı commit.

## Resmi kaynaklar

- [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend receiving](https://resend.com/docs/dashboard/receiving/introduction)
- [Yönlendirme](https://resend.com/docs/dashboard/receiving/forward-emails)
- [İmza doğrulama](https://resend.com/docs/webhooks/verify-webhooks-requests)

## Kanıt

İş ilerledikçe tarihli yerel/canlı sonuçlar; sır ve e-posta gövdesi olmadan kaydedilir.
