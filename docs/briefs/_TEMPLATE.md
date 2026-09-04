# NNN — <görev adı>

**Durum / tarih / sorumlu yazıcı:**

**Amaç (tek cümle) ve kullanıcı ihtiyacı:**

**Başlangıç kanıtı:** çalışma ağacı, ilgili kod/karar, sorun veya ihtiyaç.
Varsayım, doğrulanmış durum ve açık kullanıcı kararı ayrı yazılır.

**İzinli dosyalar / modüller:**

- <yol ve sorumluluk>

**Kaynaklar / mevcut desen:**

- <dosya veya sabit kaynak bağlantısı — ne için okunacak>

**Kapsam dışı** — bu görevde kesinlikle yapılmayacaklar:

- <özellikle canlı işlem, diğer modüller veya refactor sınırı>

**Risk / yetki / geri dönüş:**

- <kullanıcı/rol/veri etkisi; gerekiyorsa yedek ve geri yükleme kanıtı>
- <kod, DB, dış dosya veya yayın için ayrı geri dönüş; güvenli durma koşulu>

**Küçük uygulama adımları:**

1. <kanıt/önkoşul>
2. <değişiklik>
3. <doğrulama/devir>

**Bitti tanımı** — hepsi kanıtlanmadan görev kapanmaz:

- [ ] <gözlenebilir davranış / belge kabulü>
- [ ] <ilgili başarısızlık/sınır senaryosu>
- [ ] Proje kapısı: <gerçek komut + çalışma dizini>
- [ ] Diff incelendi; kapsam dışı değişiklik yok; ilgili hafıza ve kanıt bağlantıları güncel.

Genova: web kapısı kökten `pnpm check`. RN ürün alanı kurulduktan sonra o dizinde
`npx tsc --noEmit && npm test`; UI/DB/Edge/native/yayın katmanları ayrıca seçilir.
Başka projeye taşırken bu paragrafı o projenin doğrulanmış kapılarıyla değiştir.

**Opsiyonel alt görev:** [devir sözleşmesi](../templates/ajan-devir.md).
Bağımsız alt iş yoksa tek ajan; gereksiz devir yaratma.

**Sonuç kaydı:**

| Tarih | Komut / işlem | Ortam | Sonuç | Kanıt / sınır |
|---|---|---|---|---|
| <tarih> | <kontrol> | <yerel/test/canlı> | <geçti/kaldı/çalıştırılmadı> | <kanıt> |

**Teslim:** commit(ler), kalan risk, geri dönüş ve sıradaki tek adım.
Bir kayıt önceki testten aktarılıyorsa tarihsel olduğunu belirt; yeni sonuç gibi yazma.
