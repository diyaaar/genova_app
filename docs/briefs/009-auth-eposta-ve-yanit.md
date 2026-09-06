# 009 — Auth e-postası ve değiştirilebilir yanıt hedefi

6 Eylül 2026. Durum: canlı yönlendirme kabulü geçti; eski anahtar temizliği bekliyor.
Ana ajan tek yazıcı.
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
- Canlı Site URL başlangıçta `http://localhost:3000` idi; panelde
  `https://app.genesinovachoir.com` olarak düzeltildi. Kesin recovery URL'si korundu.
- MCP Genova isteği yetkisiz; mevcut CLI hesabı canlı API'den doğru proje ve
  organizasyonu listeledi. Auth ayarları doğrulanmış Chrome panelinden, Edge
  deployment/secret işlemleri yalnız kesin proje ref'iyle CLI'den yapılabilir.
- Masaüstündeki Resend anahtarı yalnız göndermeye yetkiliydi; gelen içerik okumaya
  yetmedi. Kullanıcı onayıyla ayrı Full access anahtar oluşturuldu. Panelin
  erişilebilirlik çıktısında ilk anahtar açık göründüğü için Supabase'e kaydedilmeden
  bırakıldı; yerine ikinci anahtar üretildi. İlk anahtar silinmeyi bekler.
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

- [x] SMTP, Verified domain, tracking ve kesin Auth dönüş ayarları doğrulandı.
- [x] İmza, yanlış alıcı, tekrar, otomatik yanıt/döngü ve sağlayıcı hata testleri geçti.
- [x] `pnpm check`, ilgili Edge kontrolü ve `git diff --check` geçti.
- [x] Canlı imzasız istek reddi ve test yanıtının hedefe teslimi doğrulandı.
- [x] Gerçek Auth doğrulama/kurtarma e-posta katmanı, çalıştırılmayan sınırlar açık.
- [x] Hedef değiştirme/geri dönüş belgeli; hafıza güncel; kod/belge ayrı commit.

## Resmi kaynaklar

- [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend receiving](https://resend.com/docs/dashboard/receiving/introduction)
- [Yönlendirme](https://resend.com/docs/dashboard/receiving/forward-emails)
- [İmza doğrulama](https://resend.com/docs/webhooks/verify-webhooks-requests)

## Kanıt

6 Eylül 2026:

- Resend domain `mail.genesinovachoir.com`: `verified`, `eu-west-1`; open/click
  tracking kapalı. Alt alan MX'i Resend'e, kök alan MX'i Google'a yöneliyor.
- Supabase custom SMTP açık: `Genova Team <team@mail.genesinovachoir.com>`.
  Auth e-posta onayı açık; Site URL production'a düzeltildi. Yetkili operatör
  adresine recovery isteği HTTP 200 döndü; adresin Auth kullanıcısı olduğu ve gerçek
  recovery teslimi kanıtlanmadığı için bu katman yalnız yapılandırma kabulüdür.
- `resend-inbound` Edge v3 `ACTIVE`; JWT kapısı yerine ham gövde Svix HMAC ve beş
  dakikalık zaman penceresi var. İmzasız POST `401`, GET `405` döndü.
- 35 hedefli test; tam `pnpm check`: 32 dosya / 190 test, lint, typecheck,
  coverage, service worker ve production build geçti. Deno check geçti.
- İlk canlı test Resend'in gerçek ham-ileti hostunun `cdn.resend.app` olduğunu
  gösterdi; sınır kontrollü biçimde genişletilip regresyon testi eklendi.
- İkinci test iletisi alındı, sabit hedef `genesinova.choir@gmail.com` için
  oluşturulan yönlendirme Resend'de `delivered` oldu. Aynı olayın imzalı tekrarı
  HTTP 200 döndü ve konuya ait gönderim sayısı bir kaldı.

## İşletim

- Hedef değiştirme: Supabase Edge Secrets içindeki `GENOVA_REPLY_FORWARD_TO`
  değerini tek geçerli harici posta kutusuyla güncelle; kod/deploy gerekmez.
- Anahtar yenileme: Resend'de yeni Full access anahtar oluştur,
  `GENOVA_RESEND_INBOUND_KEY` değerini değiştir, testten sonra eski anahtarı sil.
- Webhook yenileme: yeni imza sırrını `GENOVA_RESEND_WEBHOOK_SECRET` değerine yaz.
- Geri dönüş: Resend webhook'unu devre dışı bırak; SMTP/DNS ve mevcut e-postaları
  silme. Edge'i kaldırmak ayrı ve geri döndürmesi daha zor bir işlemdir.
- Sınır: Gmail'den `team@...` adına cevap göndermek için ayrıca Gmail/SMTP
  “Farklı gönder” kurulumu gerekir; bu iş yalnız gelen yanıtları aktarır.
