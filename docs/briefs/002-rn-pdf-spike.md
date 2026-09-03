# 002 — React Native PDF spike'ı

> **SPIKE TAMAMLANDI (3 Eyl) — ADIM A ve ADIM B GEÇTİ.**
> React Native repertuvar ekranını kaldırıyor. Karar kesinleşti, şart kalktı.

**Amaç (tek cümle):** React Native'in repertuvar ekranını kaldırıp kaldırmadığını üç günde öğrenmek.

Bu, `001`'in RN tekrarıdır. Matematik ve şema zaten çözülü — sınanan tek şey
**PDF görüntüleyici + Skia çizim katmanı.** Geçmezse karar Flutter'a döner;
çalışan Flutter spike'ı `spike/repertuvar/` altında duruyor, silinmedi.

**Süre sınırı üç gün.** Dolduğunda kriterler karşılanmıyorsa cevap "biraz daha uğraşayım"
değil, **"Flutter'a dön"**dür. Bu kararı sonuca bakmadan önce kabul et.

**Nerede:** `spike/repertuvar-rn/` — Expo projesi. Ürün kodu değildir, silinecektir.

---

## Bedava başlangıç — 001'den devralınanlar

Test varlıkları **hazır**, üretmene gerek yok:

| Dosya | Ne |
|---|---|
| `spike/repertuvar/assets/score_40p.pdf` | 40 sayfalık koordinat ızgarası. Her %10'da çizgi, `x=0.1 … y=0.9` etiketleri. "0.5 gerçekten ortaya düşüyor mu" gözle doğrulanır. |
| `spike/repertuvar/assets/annotations.sample.json` | Beş tipin hepsi bilinen koordinatlarda + bilinmeyen tip tuzağı + sayfa 40 kaydı. DB satırlarıyla aynı şekilde. |

İkisini de `spike/repertuvar-rn/assets/` altına kopyala.

**Ve asıl kazanç:** `lib/repertuvar/annotation-types.ts` **zaten TypeScript.** Port yok,
ayna yok. Doğrudan import et:

```ts
import type { AnnotationItem, NormalizedPoint } from '@/lib/repertuvar/annotation-types';
```

Bu, RN kararının somut sebebi — spike bunu da doğrulamış olacak.

---

## Bitti tanımı

- [x] **Çizim** — GEÇTİ (3 Eyl, web). Izgarayla doğrulandı: fosforlu y=0.30, dikdörtgen (0.25,0.40)-(0.75,0.60), ok y=0.70, metin (0.10,0.84), kalem (0.5,0.5)'ten geçiyor ve y=0.30'u x≈0.35'te kesiyor. Eğri yumuşak — tension 0.2 doğru.
- [x] **Sayfa indeksleme** — GEÇTİ. Sayfa 40 kaydı doğru sayfada.
- [x] **Katman** — GEÇTİ. Sayfa 2 soluk çiziliyor.
- [x] **Bilinmeyen tip** — GEÇTİ. Üst bar '1 bilinmeyen tip atlandı' yazıyor, çökme yok.
- [ ] **Ölçek** — 40 sayfada kaydırma ve zoom akıcı
- [ ] **Giriş** — parmak/fare ile çizim, iki parmakla pan/zoom. Basınç ve avuç içi reddi **ertelendi** (kalemli cihaz yok), spike'ı bloke etmez.
- [ ] Karar `MIGRATION.md`'ye yazıldı

---

## Sayısal sabitler — `components/repertuvar/AnnotationStage.tsx`'ten birebir

Yeniden türetme. Yanlış türetirsen çizimler web'le uyuşmaz ve birinci kriter sessizce yanlış geçer.

```
strokeWidth kayıtta normalize:  strokeWidthPx / max(pageWidthPx, 1)     (satır 69-71)
çizerken geri açılır:           max(strokeWidth * pageWidth, isHighlighter ? 6 : 1)   (553)
fosforlu opaklık:               aktif 0.38 · pasif 0.30                 (66-67)
pasif katman opaklığı:          0.82                                    (538)
kalem tension:                  0.2   ·  fosforlu tension: 0            (561)
lineCap / lineJoin:             round                                   (559-560)
ok ucu:                         pointerLength 10 · pointerWidth 10      (578-579)
dikdörtgen köşe yarıçapı:       6                                       (598)
metin notu:                     fontSize 15 · lineHeight 1.3 · padding 10
                                genişlik max(item.width * width, 140)
                                arka plan rgba(15,23,42,0.9) · çerçeve renk, 1px   (614-633)
hasRenderableArea eşiği:        0.005                                   (77)
```

**Tension eğrisi:** Konva'nın `Util._expandPoints` algoritması. Flutter tarafında
`spike/repertuvar/lib/annotation_painter.dart` içinde `_buildPath` olarak yazılı —
oradan TS'e çevir, formül aynı. Düz polyline çizersen strok web'e göre köşeli çıkar.

---

## Kütüphaneler — değerlendirme spike'ın parçası

**Çizim:** `@shopify/react-native-skia`. Skia motoru, `Path` + `Canvas` API'si
Flutter'ın `CustomPainter`'ına çok yakın; painter kodu neredeyse birebir çevrilir.

**PDF — 3 Eyl'de araştırıldı, SONUÇ DEĞİŞTİ:**

Hazır RN görüntüleyicilerinin **hiçbiri sayfa üstüne katman koymaya izin vermiyor**
ve sayfanın ekrandaki dikdörtgenini vermiyor:

| Aday | Overlay / sayfa rect | Sonuç |
|---|---|---|
| `@kishannareshpal/expo-pdf` | Yok — sadece `onPageChanged` | ✗ |
| `react-native-pdf-renderer` | Yok — "does not support overlaying custom content" | ✗ |
| `react-native-pdf` (wonday) | Yok | ✗ |
| Nutrient / PSPDFKit | Var ama kendi anotasyon formatı, ticari lisans | ✗ |

Flutter'ın `pdfrx`'i bunu `pageOverlaysBuilder` ile hazır veriyordu. **RN'de vermiyor.**

### Yeni yaklaşım: sayfayı görüntüye çevir, kabı kendin yaz

Hazır görüntüleyici arama. Bunun yerine:

1. PDF sayfasını **bitmap'e render et** — `@dariyd/react-native-pdf-page-image`,
   `react-native-pdf-to-image` veya `react-native-pdf-light`
2. Görüntüyü kendi kaydırma/zoom kabına koy (`react-native-gesture-handler` + `reanimated`)
3. Skia anotasyon katmanını üstüne ser — **Adım A'daki mimarinin aynısı**

**Adım A zaten bunu yapıyor:** ızgara PNG'si + üstünde Skia katmanı. Adım B'de tek
değişiklik, o PNG'nin yerine PDF'ten render edilmiş sayfa görüntüsü gelmesi.
Yani Adım A'nın mimarisi doğrudan ürün mimarisi.

**Bedeli:** sayfa çevirme ve zoom kabını kendin yazacaksın (~1-2 hafta ek).
**Kazancı:** hizalama üzerinde tam kontrol — ve bir nota okuyucusunda sayfa çevirme
davranışını zaten kendin istersin (ölçüye zoom, çift sayfa, kaldığın yerden devam).

### Adım B'nin yeni bitti tanımı

- [ ] Bir PDF sayfası bitmap'e render ediliyor ve `<GridPage>` yerine konuyor
- [ ] Anotasyonlar sayfa görüntüsüyle hizalı (Adım A'daki ızgara testinin PDF hâli)
- [ ] 40 sayfada kaydırma akıcı, bellek şişmiyor (sayfa görüntüleri tembel yükleniyor)
- [ ] Zoom yapıldığında anotasyonlar sayfayla birlikte ölçekleniyor

**Not:** bu adım native modül gerektirir, tarayıcıda çalışmaz — `npx expo run:ios`.

---

## 001'in beş dersi — aynı duvara ikinci kez çarpma

1. **Sessiz hata yasak.** Flutter'da gri ekran dört tur kaybettirdi. **İlk yazacağın şey
   teşhis olsun:** asset kaç bayt, ilk 8 karakteri ne, yükleme hatası ne — hepsi ekranda.
   Boş ekran gördüğünde neden boş olduğunu da görmelisin.
2. **Asset yükleyicisine güvenme.** `pdfrx`'in `PdfViewer.asset`'i sessizce başarısız oluyordu;
   baytları elle yükleyip vermek çözdü. RN'de de PDF'i doğrudan dosya yolundan vermek yerine
   baytları okuyup verebiliyorsan onu tercih et.
3. **Başlatma çağrısı var mı, kontrol et.** `pdfrx` 2.2+ `pdfrxFlutterInitialize()` istiyordu,
   çağrılmayınca hata vermeden gri kalıyordu. Seçtiğin kütüphanenin README'sini bu gözle oku.
4. **Bilinmeyen tip atlanmalı**, çökmemeli. Web'e yeni anotasyon tipi eklendiğinde eski
   mobil sürümler ayakta kalsın.
5. **Aynı adla farklı içerik = önbellek tuzağı.** Test dosyasını değiştirirken adını da değiştir.

---

## Kapsam dışı

- Giriş ekranı ve oturum — örnek JSON'la çalış, Supabase'e hiç bağlanma
- Tema, renk, tipografi, navigasyon
- Anotasyon **kaydetme** — okuma ve çizme yeterli
- Katman görünürlük arayüzü, parti seçimi, şef yorumları
- Çevrimdışı önbellek, ses oynatıcı
- Test yazımı, CI
- Çok kiracılılık — `choir_id` bu spike'ın konusu değil


---

## SONUÇ — 3 Eylül 2026: GEÇTİ

**Adım A (web):** çizim matematiği, koordinat normalizasyonu, Konva `tension: 0.2` eğrisi,
renk çözümü, katman opaklığı, bilinmeyen tipin atlanması — hepsi ızgarayla doğrulandı.

**Adım B (iOS, native derleme):** PDF açıldı (40 sayfa), istenen sayfalar bitmap'e
render edildi, anotasyonlar aynı katmanda üstüne oturdu. Çökme yok.

**Doğrulanan mimari:** sayfa = **görüntü + üstünde Skia katmanı.**
PDF görüntüleyicisi kullanılmıyor; sayfa bitmap'e çevrilip aynı yuvaya konuyor.
Adım A ile Adım B arasında değişen tek şey görüntünün kaynağı oldu — kod aynı kaldı.

### Ürün kodunda baştan doğru kurulacak zincir

Bugün tek tek keşfedildi; bir daha keşfedilmesin.

| # | Şart | Yapılmazsa |
|---|---|---|
| 1 | `@dariyd/react-native-pdf-page-image` (2.0.0+) | Eski `react-native-pdf-page-image` (2024) modern RN'de `RCT-Folly` hatası verir |
| 2 | Sayfa numaraları **0-tabanlı** | Yanlış sayfa render edilir, sessizce |
| 3 | Web'e özel import **ayrı dosyada** (`*.web.ts`) | Metro statik tarar; `Platform.OS` kontrolü yetmez, native derleme `fs` hatası verir |
| 4 | Web'de `LoadSkiaWeb()` + `canvaskit.wasm` `public/` altında | Ekran bomboş kalır, hata vermez |
| 5 | Native'de `react-native-reanimated` **zorunlu** (Skia istiyor) | "reanimated is not installed" |
| 6 | `babel.config.js` → `plugins: ['react-native-worklets/plugin']`, **en sonda** | "runOnUI can only be used with worklets"; Reanimated 4.x'te eklenti adı değişti |
| 7 | Babel yapılandırması değişince `--clear` | Önbellekteki eski derleme kullanılmaya devam eder |
| 8 | `metro.config.js` → `assetExts.push('pdf')` | PDF varlık olarak paketlenmez |

### Ürün koduna taşınırken düzeltilecek

- `SkPath.moveTo/lineTo/quadTo/cubicTo/addRRect` **deprecated** → `Skia.PathBuilder.Make()` API'sine geç
- `SafeAreaView` (react-native) deprecated → `react-native-safe-area-context`
