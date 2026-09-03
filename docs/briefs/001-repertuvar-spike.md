# 001 — Repertuvar spike'ı

**Amaç (tek cümle):** Flutter'ın repertuvar ekranını karşılayıp karşılamadığını bir haftada öğrenmek.

Bu bir ürün görevi **değildir**. Kod atılacaktır; değerli olan çıkan karardır.
Süre dolduğunda kriterler karşılanmıyorsa cevap "biraz daha uğraşayım" değil,
**"Capacitor'da kal"**dır. Bu kararı sonuca bakmadan önce kabul et.

**Nerede:** `spike/repertuvar/` — bağımsız bir Flutter projesi. `flutter/` klasörü bu spike'tan
sonra açılacak; buradaki koddan ürüne hiçbir şey kopyalanmaz.

---

## Bitti tanımı

- [x] **Çizim** — GEÇTİ (2 Eyl, macOS). Koordinat ızgarasıyla doğrulandı: fosforlu y=0.30, dikdörtgen (0.25,0.40)-(0.75,0.60), kalem (0.5,0.5)'ten geçiyor ve y=0.30'u x≈0.36'da kesiyor, tension 0.2 eğrisi doğru, legacy renkler çözülüyor, bilinmeyen tip çökmeden atlanıyor. Ok ve metin notu ekran altında — kaydırarak teyit edilecek.
- [~] **Giriş** — kalemli cihaz yok, **ertelendi**. Parmak/fare çizimi ve pan/zoom test edilebilir; basınç ve avuç içi reddi ölçülemiyor. Bu iki madde kalemli bir cihaz bulunana kadar açık kalır ve spike'ı bloke ETMEZ.
- [ ] **Gecikme** — telefonda ölç: mevcut webview sürümüyle yan yana, parmakla çiz. macOS/fare temsili değil.
- [~] **Tur** — gerçek Supabase kaydıyla test edilmedi (şifre gerektiriyor). Şema birebir yansıtıldığı ve okuma yolu doğrulandığı için düşük risk; Faz 2'de kapanır.
- [x] **Ölçek** — 40 sayfalık belge sorunsuz açılıyor, anotasyonlar sayfa 1/2/40'ta doğru yerde. Kaydırma akıcılığı macOS'ta temsili değil, cihazda tekrar bakılacak.
- [x] Karar `MIGRATION.md`'ye yazıldı

---

## Veri

Tablo `supabase-genesinova` MCP ile bulunur (migration: `supabase/migrations/20260416_repertoire_pdf_annotations.sql`).
Şemayı **varsayma, sorgula.** Gerçek bir kayıt çek ve onunla çalış — test verisi üretme.

## Şema → Dart eşlemesi

Tek doğru kaynak: `lib/repertuvar/annotation-types.ts` (238 satır). Birebir yansıt, yorumlama:

```
AnnotationItem = PenStroke | HighlighterStroke | ArrowShape | RectangleShape | TextNote

PenStroke        { id, type:'pen',         color, points: NormalizedPoint[], strokeWidth }
HighlighterStroke{ id, type:'highlighter', color, points: NormalizedPoint[], strokeWidth }
ArrowShape       { id, type:'arrow',       color, start, end, strokeWidth }
RectangleShape   { id, type:'rectangle',   color, start, end, strokeWidth }
TextNote         { id, type:'text',        color, position, text, width }

NormalizedPoint  { x, y }              // 0..1, sayfaya göre
AnnotationColor  'black'|'red'|'white' | '#rrggbb'   // legacy isimler HÂLÂ kullanımda
AnnotationLayerKey  'personal' | 'shared_all' | 'shared_voice_group:<Soprano|Alto|Tenor|Bass>'
```

## Koordinat kuralları — `AnnotationStage.tsx`'ten birebir

```
strokeWidth kayıtta normalize:  strokeWidthPx / max(pageWidthPx, 1)
çizerken geri açılır:           max(strokeWidth * pageWidth, isHighlighter ? 6 : 1)
pasif katman opaklığı:          0.82
metin notu uzunluğu:            en fazla 140 karakter
```

Bu kuralları yeniden türetme — yanlış türetirsen çizimler web'le uyuşmaz ve spike'ın
birinci kriteri sessizce yanlış geçer.

## Kütüphaneler

- `pdfrx` — MIT, PDFium tabanlı. `pageOverlaysBuilder` ve `pagePaintCallbacks` ile sayfa üstüne kendi katmanın
- `CustomPainter` — anotasyon çizimi
- `Listener` — `PointerEvent.pressure`, `PointerEvent.kind == PointerDeviceKind.stylus` (avuç içi reddi buradan)
- `supabase_flutter` — veriyi çekmek için

---

## Kapsam dışı

Bunların hiçbiri bu spike'ta yapılmaz. Yapılırsa spike süresi taşar ve karar gecikir:

- Giriş ekranı ve oturum akışı — servis anahtarını elle göm, tek kullanıcıyla çalış
- Tema, renk, tipografi — Material varsayılanı yeterli
- Navigasyon, alt menü, başka ekran
- Anotasyon **kaydetme** — okuma ve çizme yeterli, "tur" kriteri için tek kayıt elle yazılabilir
- Katman görünürlük arayüzü, parti seçimi, şef yorumları
- Çevrimdışı önbellek, senkronizasyon, çakışma çözümü
- Ses oynatıcı
- Test yazımı, CI, lint disiplini

---

## Notlar

- Dosya seçici yapma; PDF'in `drive_file_id`'sini koda göm.
- Karşılaştırmayı aynı cihazda yap: solda mevcut webview sürümü, sağda spike.
- Basınç verisi simülatörde gelmez — gerçek cihaz + stylus gerekir.
- 40 sayfalık PDF'te `pdfrx`'in sayfa önbelleğini kapatma; bellek davranışını varsayılan ayarla ölç.


---

## SONUÇ — 2 Eylül 2026: GEÇTİ

Flutter repertuvar ekranını kaldırıyor. Geçiş devam ediyor.

**Öğrenilenler (ürün koduna taşınacak):**
1. `pdfrxFlutterInitialize()` zorunlu — çağrılmazsa görüntüleyici sessizce gri kalır.
2. **`PdfViewer.asset` kullanma.** Baytları `rootBundle`/ağdan kendin yükle, `PdfViewer.data(bytes, sourceName: ...)` ver. Asset yolu sessizce başarısız oluyor. Üretimde PDF'ler zaten Supabase/Drive'dan gelecek, yani bu yol hiç kullanılmayacak.
3. Konva `tension: 0.2` eğrisi Flutter'da birebir üretilebiliyor — düz polyline çizilirse strok web'e göre köşeli çıkar.
4. Bilinmeyen anotasyon tipi `null` dönüp atlanmalı; web'e yeni tip eklendiğinde eski Flutter sürümleri çökmez.
5. Teşhis edilemeyen sessiz hatalar en büyük zaman kaybıydı — ürün kodunda PDF yükleme yolu **her zaman** görünür hata göstermeli.
