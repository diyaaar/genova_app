# 010 — 008 canlı yayın ve kontrollü kabul

6 Eylül 2026. Durum: planlandı; canlı 008 işlemi başlatılmadı. Ana ajan tek yazıcı.

## Tek sonuç

Yerelde hazır olan 008 davet/üyelik akışını paylaşımlı Genova production ortamına
DB → Edge → web sırasıyla yayımla; gerçek Auth e-postası ve kontrollü test
kimlikleriyle oluşturma, iptal ve atomik kabulü uçtan uca kanıtla.

## Doğrulanmış başlangıç

- Planlama öncesinde `main`, `origin/main` önünde dokuz commit; bu brief ayrı bir
  plan commit'i olarak eklenecek. Üretim `app.genesinovachoir.com`
  Vercel'de; `main` push'u yayın tetikleyebilir ve sıradan Git senkronu sayılmaz.
- 008 yerel migration'ı `20260905210953_choir_invitations_008.sql`; down, SQL,
  concurrency, Edge ve web testleri hazır. Canlı DB migration ve `choir-invitations`
  Edge deploy yok.
- 009 tamamlandı: custom SMTP, production Site URL, imzalı yanıt yönlendirme ve
  Gmail teslimi canlı kabul edildi. Gerçek Supabase Auth doğrulama teslimi 008'de yapılır.
- Kesin proje `hievmwwctjjlhmssoxsu`. MCP yetkisiz kalıyor; CLI proje erişimi doğru.
  Doğrudan DB hostuna son salt-okunur migration-list isteği IPv6/5432 timeout verdi;
  bu nedenle yazmadan önce desteklenen IPv4 session-pooler bağlantısı doğrulanmalı.
- Free plan panel yedeği yok. Şema değişiminden önce yeni mantıksal schema + data
  yedeği, hash ve ayrı PostgreSQL 17 restore kanıtı zorunlu.

## İzinli alan ve durma noktaları

İzinli yayın paketi: kesin 008 migration/down/testleri, `choir-invitations` Edge,
008 web commit'leri ve buna bağlı 009/planlama commit'leri. Bulguyu düzeltmek için
gereken en küçük 008 değişikliği ayrı test ve commit ister. Plan-limit, RN, hosting,
Drive, 27 eski hesap, gerçek koro yönetimi ve toplu üyelik kapsam dışıdır.

Canlı kabulten önce kullanıcı şu geçici veriyi açıkça seçer/onaylar: yalnız test
için adlandırılmış bir koro/Şef ve işletmeciye ait davet alıcısı; test sonunda hangi
Auth/üyelik/koro kayıtlarının silineceği. Mevcut üretim korosu veya 27 hesap sessizce
kullanılmaz. Test verisi silme ayrı, hedefleri listelenmiş onaylı işlemdir.

## Uygulama sırası

1. **Salt okunur preflight:** kesin proje/organizasyon, aktif migration ve Edge
   sürümleri, live şema varsayımları, Vercel-Git bağlantısı ve temiz ağaç doğrulanır.
   Pooler bağlantısı kurulamazsa canlı iş durur.
2. **Geri dönüş kanıtı:** canlı schema/data mantıksal yedeği alınır; SHA-256 ve
   güvenli konumu kaydedilir. Taze yerel PostgreSQL 17'ye restore edilir; tablo ve
   kritik kayıt sayıları kaynakla eşleştirilir.
3. **Taze restore kabulü:** yalnız 008 migration uygulanır; 003/005/006/007/008,
   concurrency ve gerçek down roundtrip yeniden geçer. Kabul edilmiş üyeliğin down
   ile silinmediği korunur.
4. **Canlı DB:** toplu `db push` yok; yalnız kesin 008 SQL uygulanır ve migration
   geçmişi işlenir. Hosted testler transaction + `ROLLBACK` ile çalıştırılır;
   davet tablosu/RPC yetkileri ve mevcut kayıt sayıları yeniden okunur.
5. **Edge:** `choir-invitations` `verify_jwt=true` ile deploy edilir. CORS,
   imzasız/anon/yanlış koro ve güvenli hata yolları canlı kontrol edilir.
6. **Web:** DB ve Edge hazır olduktan sonra doğrulanmış 008/009 ve plan commit'leri
   `origin/main`a gönderilir.
   GitHub CI, Vercel production deployment ve canlı domain ayrı ayrı doğrulanır;
   commit/push/deploy birbirinin kanıtı sayılmaz.
7. **Kontrollü ürün kabulü:** test Şefi davet oluşturur/listeler/iptal eder; yeni
   alıcı kendi parolasıyla kayıt olur, gerçek Auth e-postasını doğrular ve daveti
   yeniden açıp kabul eder. Yanlış hesap, kullanılmış/iptal link ve tekrar kabul
   reddedilir; doğru koro/rol görünür. Masaüstü ve mobil viewport kontrol edilir.
8. **Temizlik ve kapanış:** önceden listelenmiş test kayıtları onaylı sırayla
   temizlenir; production kayıt sayıları ve davet endpoint'i tekrar kontrol edilir.
   Kanıtlar 008/010 ve kısa hafıza özetine yazılır.

## Geri dönüş

Web önce önceki Vercel deployment'a alınır; Edge önceki sürüme döndürülür/devre dışı
bırakılır; sonra 008 down uygulanır. Down kabul edilmiş üyelikleri silmez. Canlı
ürün verisi etkilenirse otomatik silme yok; restore kararı kapsam ve kullanıcı
onayıyla alınır. 009 SMTP/yönlendirme bu geri dönüşte değiştirilmez.

## Kabul

- [ ] Taze schema/data yedeği, hash, restore ve kaynak sayım eşleşmesi geçti.
- [ ] Taze restore 003–008, concurrency ve down roundtrip geçti.
- [ ] Kesin 008 canlı migration, hosted rollback testleri ve DB yetkileri geçti.
- [ ] Edge canlı güvenlik/CORS kontrolleri geçti.
- [ ] GitHub CI, Vercel deployment ve canlı domain aynı commit'i gösterdi.
- [ ] Gerçek Auth doğrulaması ile oluştur/iptal/kabul ve olumsuz yollar geçti.
- [ ] Onaylı test verisi temizlendi; kapsam dışı üretim verisi değişmedi.

## Sonraki tek adım

6 Eylül, karar #21: 010 kabulünden sonra 004 Expo ürün alanı kurulur; ardından
repertuvar/PDF ve cihaz pilotu gelir. Plan-limit mağaza öncesinde tamamlanır; yalnız
ölçülmüş pilot engeli gerekli en küçük parçayı öne alabilir. 010 dış erişim/yetki
nedeniyle beklerse bağımsız, onaylı 004 yerel işleri ilerleyebilir; 010 kapanmış sayılmaz.
