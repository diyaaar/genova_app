# spike/repertuvar — atılacak deneme

Brief: `docs/briefs/001-repertuvar-spike.md`. Bu klasör **ürün kodu değildir**;
karar verildikten sonra silinir. Buradan `flutter/` altına kod kopyalanmaz —
`annotation_model.dart` ve `annotation_painter.dart` yeniden yazılır (öğrenilenlerle).

## Kurulum

```bash
cd spike/repertuvar
flutter create . --project-name genova_spike --platforms=ios,android
flutter pub add pdfrx supabase_flutter
flutter pub get
flutter run --release          # basınç ve gecikme ölçümü SADECE gerçek cihazda
```

`lib/annotation_model.dart` ve `lib/annotation_painter.dart` `flutter create`
tarafından ezilmez — üzerine `main.dart` yazılır, o kadar.

## Hazır gelenler

| Dosya | Ne |
|---|---|
| `lib/annotation_model.dart` | `lib/repertuvar/annotation-types.ts`'in Dart karşılığı + JSON ayrıştırma |
| `lib/annotation_painter.dart` | Web'le birebir aynı sayısal sabitlerle `CustomPainter` |

Sabitler (tension 0.2, fosforlu opaklık 0.38/0.30, pasif katman 0.82, ok ucu 10px,
metin fontSize 15 / padding 10 / tag `rgba(15,23,42,0.9)`) `AnnotationStage.tsx`'ten
satır referanslarıyla alındı. **Değiştirme.**

## Çalıştırma

```bash
bash run.sh -d macos
```

Kurulum, şifre, PDF aramak yok — `assets/score.pdf` (koordinat ızgarası) ve
`assets/annotations.sample.json` gömülü geliyor.

**Sayfa 1'de görmen gerekenler** (ızgara etiketleriyle doğrula):
| Öğe | Nerede olmalı |
|---|---|
| kırmızı kalem çizgisi | (0.10, 0.10) → (0.90, 0.90), ortadan geçer, köşeli değil yumuşak |
| sarı fosforlu | y=0.30 çizgisi boyunca yatay, kalın ve yarı saydam |
| siyah ok | (0.20, 0.70) → (0.80, 0.70), ucu sağda |
| yeşil dikdörtgen | sol üst (0.25, 0.40), sağ alt (0.75, 0.60) |
| mavi metin kutusu | sol üst köşesi tam (0.10, 0.84) |

Bir de `gelecekte_eklenen_tip` diye bilinmeyen bir öğe var — **çizilmemeli ve
uygulama çökmemeli.** İleride web'e yeni bir anotasyon tipi eklenirse Flutter'ın
ne yapacağını burada görüyorsun.

**Sayfa 2** paylaşılan katman: aynı çizimler ama soluk (0.82 / fosforlu 0.30).

Ekrana parmakla/fareyle çiz — üst barda `kind` ve `pressure` canlı görünür.
Basınç yalnızca gerçek cihazda + kalemle 0'dan farklı gelir.

## Gerçek veriyle

```bash
SPIKE_EMAIL=... SPIKE_PASSWORD=... SPIKE_FILE_ID=... bash run.sh -d macos
```

`SPIKE_FILE_ID` = anotasyonu olan bir `repertoire_files.id`. Şifre koda girmez,
yalnızca çalışma anında ortam değişkeni olarak geçer.

## Uyarı

Bu iki dosya derlenmedi — Flutter bu makinede yok. İlk `flutter analyze`
birkaç düzeltme isteyebilir. `withValues` Flutter 3.27+ gerektirir; daha eski
sürümdeysen `withOpacity` kullan.
