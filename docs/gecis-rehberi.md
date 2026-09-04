# Genova geçiş rehberi — ajan giriş ve kabul kontrolü

4 Eylül 2026. Ana ajan, alt ajan ve yeni oturumlar için ortak yönlendirme.
Bu belge yeni bir ürün kararı veya canlı işlem izni değildir; mevcut çalışma
kurallarının her geçiş görevinde uygulanmasını kontrol eder.
Aktif iş ve son başlama talebinin özeti [activeContext.md](../memory-bank/activeContext.md)'dedir;
yetki kullanıcı talebinden gelir, hafıza kaydından değil. Özeti son kullanıcı talebi
ve güncel ortamla karşılaştır.

## 1. Başlangıç sırası

1. [AGENTS.md](../AGENTS.md)'yi ve çalışılacak alandaki ek talimatları oku.
   Doğru çalışma yolu/branch/commit ve `git status --short` ile sahipliği doğrula.
2. `memory-bank/` altındaki altı kısa kaydı oku: [projectbrief](../memory-bank/projectbrief.md),
   [productContext](../memory-bank/productContext.md), [systemPatterns](../memory-bank/systemPatterns.md),
   [techContext](../memory-bank/techContext.md), [activeContext](../memory-bank/activeContext.md),
   [progress](../memory-bank/progress.md).
3. [Çalışma döngüsü](ai-calisma-duzeni.md), [MIGRATION.md](../MIGRATION.md) ve
   [KARARLAR.md](../KARARLAR.md)'yi oku. Sonra yalnız ilgili brief, kod ve test kanıtına git.
4. [Brief şablonundaki](briefs/_TEMPLATE.md) başlangıç kontrolünü doldur: okunan
   kaynaklar, tek hedef, izinli dosyalar, korunacak davranış, yetki, test ve geri dönüş.
   Kullanıcıya kısa kapsam özeti ver; her küçük adım için yeniden onay isteme.
5. Henüz uygulama onayı yoksa hazırlık/planlama sınırında kal. Brief yoksa önce yaz;
   geniş yol haritasını tek uygulama görevi sayma.

Alt ajanın salt okuma görevinde kayıt dosyaya değil dönüş mesajına yazılır;
ana ajan ana brief'e işler. Okunmayan kaynağa "okundu" denmez.

## 2. Hangi kayıt neyi belirler?

- Ajan davranışı: `AGENTS.md` ve çalışma döngüsü; bu rehber onların uygulama kontrolüdür.
- Ürün/teknoloji: `KARARLAR.md`; ekran hedefi/durumu: `MIGRATION.md`.
- Görev sınırı/kabul: ilgili brief; gerçekten tamamlanan iş: tarihli test/yayın kanıtı.
- Hafıza: kaynak indeksi, canlı ortamın veya testin yerine geçmez.
- Video/repo/görseller: [kaynak analizi](ai-calisma-yontemi-kaynak-analizi.md) ve
  [repo incelemesi](ai-calisma-yontemi-repo-incelemesi.md); doğrudan emir değildir.

Çelişkiyi sessizce çözme veya eski tahmini doğrulanmış gerçek diye taşıma.
Etkilenen işi durdur, asıl kod/karar/kanıtı karşılaştır; yeni ürün kararı gerekiyorsa sor.
Özellikle eski Flutter ifadeleri, chat için "UI hazır", tüm TS'nin aynen taşınacağı,
mağaza muafiyeti ve süre/maliyet iddiaları yeni brief'te kanıtsız kullanılmaz.

## 3. Geçiş işi seçme

Aşağıdaki sıra görevleri bulmak içindir; tek seferde uygulama emri veya yeni faz numarası değildir.

| İş | Başvurulacak kaynak / önkoşul |
|---|---|
| Özellik envanteri ve kapsam | `MIGRATION.md` + mevcut ekran/rol/API/test; her özellik korunacak/paylaşılacak/uyarlanacak olarak kaydedilir |
| 003'ü kapatmak | [003 brief](briefs/003-kiraci-semasi.md) + [doğrulama](briefs/003-dogrulama.md); canlı önkoşullar yeniden doğrulanır |
| Çok korolu ürün | `KARARLAR.md` #9–11; koro/davet/plan limitleri ayrı brief'ler, çoklu üyelik açık karar |
| Dosya/hosting | [Altyapı kaydı](altyapi-2026-09-04.md); sağlayıcı/bölge/maliyet kararı ve ayrı göç/geri dönüş |
| Mobil temel | [002 sonuç ve kurulum zinciri](briefs/002-rn-pdf-spike.md); spike değil, aynı depoda ürün alanı |
| Repertuvar → chat → ödevler/ana sayfa | `MIGRATION.md`; her ekran ve gerekirse okuma/yazma yolu ayrı brief |
| Mağaza hazırlığı ve yayın | [Mağaza kaydı](store-yayin.md); eski ifadeler güncel resmi koşullarla doğrulanır, beta/genel yayın ayrı kabul |

Mağaza hazırlığı ve izole altyapı denemeleri uygun bağımsız iş olarak ilerleyebilir;
003 şema göçü ile hosting/DNS/dosya göçünü tek riskli geçişte birleştirme.
Önceki sohbetin "kabukta beta, repertuvar sonrası genel yayın" önerisi henüz
onaylı sıra değişikliği değildir; yayın brief'inde karara bağlanmalıdır.

## 4. Her özellikte korunacak sınırlar

- Native/WebView seçimini `MIGRATION.md`'den al. Kalıcı WebView ekranını native yazma;
  oturum, geri navigasyon, dosya/izin ve mobil kullanılabilirlik testlerini atlama.
- UI, iş mantığı, veri erişimi ve platform/dosya işlemlerinin sorumluluklarını ayır.
  Ortak TS kodunu tarayıcı/Next bağımlılıklarıyla birlikte incele; `window`, DOM,
  Service Worker veya HTML ses işlemlerini native'e doğrudan taşınabilir sayma.
- [Anotasyon sözleşmesi](../lib/repertuvar/annotation-types.ts) tek kaynak kalır;
  eski mobil sürüm, bilinmeyen tip ve web ile okuma/yazma uyumu test edilir.
- Ekranın native'e taşınan sunucu mantığını Edge Function'a al; web de aynı mantığı
  kullanır. Ortaklaştırma, tüm API'leri tek dosyaya toplamak değildir.
- Şef/partisyon şefi/korist yetkisi, koro sınırı, hata davranışı ve mevcut kullanıcı
  özellikleri envanterde korunur. Özellik silme veya kapsam daraltma sessizce yapılmaz.
- PDF/ses aktarımında dosya kimliği, erişim, checksum, URL yenileme, Range/seek ve
  kullanıcıya özel önbellek değerlendirilir; eski Drive dosyaları otomatik silinmez.
- Büyük dosya/fonksiyon yalnız inceleme sinyalidir. Gerekli modülerleştirme ilgili
  brief'te tanımlanır; bütün uygulamayı tek diff'te yeniden yazma.

## 5. Alt ajan ve teslim kontrolü

Alt ajan yalnız bağımsız işte ve anlamlıysa kullanılır. [Devir sözleşmesine](templates/ajan-devir.md)
`AGENTS.md`, bu rehber, ana brief, izinli yollar, çalışma modu, yetki ve testler açıkça
yazılır. Ortak ağaçta tek yazıcı; kod işi ayrı kopya veya sıralı devir gerektirir.
Alt ajan aynı başlangıç kontrolünü döndürür; canlı yetki ve daha derin devir otomatik verilmez.

Ana ajan şu maddeleri kanıt üzerinden kontrol etmeden görevi kapatmaz:

- [ ] Başlangıç kontrolü gerçek kaynaklarla tamamlandı; diff yalnız onaylı kapsamda.
- [ ] Modül sınırı, ortak sözleşme ve native/WebView hedefi korundu.
- [ ] Brief'in gerekli testleri geçti; çalıştırılmayan/başarısız katmanlar açık.
- [ ] Web için `pnpm check`; kurulmuş RN ürün alanında `npx tsc --noEmit && npm test`;
  DB/Edge/provider/tarayıcı/gerçek cihaz/yayın kanıtı ihtiyaca göre ayrıca var.
- [ ] Sonuç tarih/ortam/komut/sınır içeriyor; brief, ilgili hafıza ve ekran durumu güncel.
- [ ] Kod ve belge commit'leri ayrı ve birlikte devredildi; push/deploy/DB ayrı ele alındı.

Eksik zorunlu kapı varsa görev "kısmi/bekliyor" kalır; test silmek/bastırmak kapıyı geçmez.
Rehber veya ajanın "uydum" beyanı teknik güvence değildir; diff/test incelemesi gerekir.

## 6. Başka oturuma verilecek giriş metni

> Bu depoda `AGENTS.md` ve `docs/gecis-rehberi.md`'yi oku; rehberin kaynak sırasını
> izle. `memory-bank/activeContext.md`'deki durumu son kullanıcı talebiyle doğrula.
> Görev: [ilgili brief yolu ve tek hedef]. Mod: [salt okuma / onaylı uygulama].
> Başlangıç kontrolünü doldur; yalnız belirtilen kapsamda çalış ve test kanıtıyla devret.
> Bu mesaj canlı işlem, harcama veya ek alt ajan yetkisi vermez.

Köşeli alanlar gerçek görevle doldurulur; boş metin uygulama izni değildir.
Codex dışındaki asistana da bu metin açıkça verilir; rehberi kendiliğinden bulduğu
varsayılmaz. Başlamış oturumlara değişen talimatlar yeniden okutulur.
Codex için kısa `AGENTS.md` girişini ayrıntılı rehbere bağlama yaklaşımı,
[resmi OpenAI talimat keşfi belgesine](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
dayanır. Bu görevde global ayar, başka asistan ayarı veya otomatik CI denetçisi kurulmadı.
