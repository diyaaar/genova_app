# NNN — <görev adı>

**Durum / tarih / sorumlu yazıcı:**

**Amaç (tek cümle) ve kullanıcı ihtiyacı:**

**Teslim odağı:** Hangi kullanıcı akışı / plan adımı ilerler? Hangi somut engel
kapanır? En küçük kabul ve bu brief'te ertelenen geliştirmeler nelerdir?

**Başlangıç kanıtı:** çalışma ağacı, ilgili kod/karar, sorun veya ihtiyaç.
Varsayım, doğrulanmış durum ve açık kullanıcı kararı ayrı yazılır.

**Current work card:** one observable result; at most three next actions; exact exit check.
For a large existing brief, update this card without expanding its acceptance scope.
Record each failed approach, new causal evidence and the next progress-review time.

**Resources:** available disk; existing owned usage; estimated additional peak; exact
paths/profiles/devices, purpose and removal point. Apply the delivery plan's
[resource controls](../mobil-teslim-plani.md#bounded-execution-and-resource-controls).
Use N/A for a document-only task that creates no runtime; do not invent an environment.

**İzinli dosyalar / modüller:**

- <yol ve sorumluluk>

**Kaynaklar / mevcut desen:**

- <dosya veya sabit kaynak bağlantısı — ne için okunacak>

**Geçiş başlangıç kontrolü** — Genova geçiş görevlerinde zorunlu;
[geçiş rehberi](../gecis-rehberi.md). Başka projede o projenin rehberine uyarlanır.

- Okunan talimatlar, kararlar ve mevcut kanıtın yolları:
- Tek doğrulanabilir sonuç; native / WebView / ortak mantık / backend sınırı:
- Korunacak mevcut davranış, ortak sözleşme ve web etkisi:
- İzinli dosyalar, tek yazıcı ve bu iş için verilmiş kullanıcı yetkisi:
- Gerekli testler, ortamları, geri dönüş ve çözülmemiş çelişkiler:

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
- [ ] Geçiş işiyse başlangıç kontrolü ve rehberin teslim kontrolleri kanıtlandı.
- [ ] Proje kapısı: <gerçek komut + çalışma dizini>
- [ ] Diff incelendi; kapsam dışı değişiklik yok; ilgili hafıza ve kanıt bağlantıları güncel.

Genova: salt belge için bağlantı/tutarlılık/diff; web/ortak kod kapısı kökten
`pnpm check`. RN değişiminde ürün alanı kurulduktan sonra o dizinde
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
Include cleanup/free-space evidence, any deliberately retained resource with reason/expiry,
and unfinished dirty-path ownership. Keep the detailed result here; other indexes link here.

## Mandatory acceptance evidence

Fill before implementation; update with actual results. Include required checks
even when they cannot run. Use one row per criterion, including relevant failure cases.

| Criterion / expected behavior | Required? / N/A reason | Status: PASS / FAIL / NOT RUN / N/A | Date, revision, environment, command or scenario | Evidence and limits |
|---|---|---|---|---|
| <observable criterion> | <yes, or justified N/A> | NOT RUN | <actual execution details when run> | <result reference; historical evidence labeled> |

Review the diff against the brief after testing and record findings/fixes. State
whether the review was self-review or an actually performed independent review.
Required FAIL or NOT RUN means partial/pending, not complete. Never weaken a test
or remove a failed acceptance item just to close the task. Optional progress counts
passed required criteria divided by all required criteria; this is not a quality score.
For document-only work, links, consistency and diff review suffice. Do not force
irrelevant product tests or create placeholder tests that merely mirror implementation.
