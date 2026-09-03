// Genova — anotasyon veri modeli (Dart)
//
// TEK DOĞRU KAYNAK: ../../../lib/repertuvar/annotation-types.ts
// Bu dosya onun birebir yansımasıdır. Şema değişirse İKİ İSTEMCİ BİRLİKTE değişir.
// Tek taraflı alan ekleme/çıkarma yapma.

import 'dart:ui' show Color, Offset, Size;

class NormalizedPoint {
  final double x; // 0..1, sayfa genişliğine göre
  final double y; // 0..1, sayfa yüksekliğine göre
  const NormalizedPoint(this.x, this.y);

  factory NormalizedPoint.fromJson(Map<String, dynamic> j) =>
      NormalizedPoint((j['x'] as num).toDouble(), (j['y'] as num).toDouble());

  Map<String, dynamic> toJson() => {'x': x, 'y': y};

  Offset denormalize(Size size) => Offset(x * size.width, y * size.height);
}

// annotation-types.ts → ANNOTATION_COLOR_SWATCHES
const _legacySwatches = <String, int>{
  'black': 0xFF111111,
  'red': 0xFFEF4444,
  'white': 0xFFF8FAFC,
};

const _fallbackColor = Color(0xFFEF4444); // DEFAULT_ANNOTATION_COLOR = 'red'

/// Legacy isimler ('black'|'red'|'white') hâlâ kayıtlarda var — önce onlara bak.
Color parseAnnotationColor(String? raw) {
  if (raw == null || raw.isEmpty) return _fallbackColor;
  final legacy = _legacySwatches[raw];
  if (legacy != null) return Color(legacy);

  var hex = raw.startsWith('#') ? raw.substring(1) : raw;
  if (hex.length == 3) {
    hex = hex.split('').map((c) => '$c$c').join();
  }
  if (hex.length == 6) hex = 'FF$hex';
  final value = int.tryParse(hex, radix: 16);
  return value == null ? _fallbackColor : Color(value);
}

sealed class AnnotationItem {
  final String id;
  final Color color;
  const AnnotationItem({required this.id, required this.color});

  /// Bilinmeyen `type` için null döner — ileride web'e yeni bir tip eklenirse
  /// Flutter çökmez, sadece o öğeyi çizmez.
  static AnnotationItem? fromJson(Map<String, dynamic> j) {
    final id = j['id'] as String? ?? '';
    final color = parseAnnotationColor(j['color'] as String?);
    List<NormalizedPoint> points() => ((j['points'] as List?) ?? const [])
        .map((e) => NormalizedPoint.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList(growable: false);
    NormalizedPoint point(String key) =>
        NormalizedPoint.fromJson(Map<String, dynamic>.from(j[key] as Map));
    double sw() => (j['strokeWidth'] as num?)?.toDouble() ?? 0;

    return switch (j['type']) {
      'pen' => PenStroke(id: id, color: color, points: points(), strokeWidth: sw()),
      'highlighter' =>
        HighlighterStroke(id: id, color: color, points: points(), strokeWidth: sw()),
      'arrow' => ArrowShape(
          id: id, color: color, start: point('start'), end: point('end'), strokeWidth: sw()),
      'rectangle' => RectangleShape(
          id: id, color: color, start: point('start'), end: point('end'), strokeWidth: sw()),
      'text' => TextNote(
          id: id,
          color: color,
          position: point('position'),
          text: (j['text'] as String? ?? ''),
          width: (j['width'] as num?)?.toDouble() ?? 0.2),
      _ => null,
    };
  }
}

final class PenStroke extends AnnotationItem {
  final List<NormalizedPoint> points;
  final double strokeWidth; // normalize: strokeWidthPx / pageWidthPx
  const PenStroke(
      {required super.id,
      required super.color,
      required this.points,
      required this.strokeWidth});
}

final class HighlighterStroke extends AnnotationItem {
  final List<NormalizedPoint> points;
  final double strokeWidth;
  const HighlighterStroke(
      {required super.id,
      required super.color,
      required this.points,
      required this.strokeWidth});
}

final class ArrowShape extends AnnotationItem {
  final NormalizedPoint start;
  final NormalizedPoint end;
  final double strokeWidth;
  const ArrowShape(
      {required super.id,
      required super.color,
      required this.start,
      required this.end,
      required this.strokeWidth});
}

final class RectangleShape extends AnnotationItem {
  final NormalizedPoint start;
  final NormalizedPoint end;
  final double strokeWidth;
  const RectangleShape(
      {required super.id,
      required super.color,
      required this.start,
      required this.end,
      required this.strokeWidth});
}

final class TextNote extends AnnotationItem {
  final NormalizedPoint position;
  final String text; // en fazla 140 karakter
  final double width; // normalize
  const TextNote(
      {required super.id,
      required super.color,
      required this.position,
      required this.text,
      required this.width});
}

/// Değerler: `personal`, `shared_all`, `shared_voice_group:Soprano` (Alto/Tenor/Bass).
class AnnotationLayerKey {
  final String raw;
  const AnnotationLayerKey(this.raw);

  bool get isPersonal => raw == 'personal';
  bool get isShared => !isPersonal;
  String? get voiceGroup =>
      raw.startsWith('shared_voice_group:') ? raw.split(':').last : null;
}

/// hasRenderableArea — AnnotationStage.tsx:77
bool hasRenderableArea(NormalizedPoint a, NormalizedPoint b) =>
    (a.x - b.x).abs() > 0.005 || (a.y - b.y).abs() > 0.005;

List<AnnotationItem> parseAnnotationsJson(List<dynamic> raw) => raw
    .map((e) => AnnotationItem.fromJson(Map<String, dynamic>.from(e as Map)))
    .whereType<AnnotationItem>()
    .toList(growable: false);
