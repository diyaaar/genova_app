// Genova — anotasyon çizici (Dart / CustomPainter)
//
// Sayısal sabitlerin tamamı components/repertuvar/AnnotationStage.tsx'ten birebir alındı.
// HİÇBİRİNİ yeniden türetme — yanlış türetirsen çizimler web'le uyuşmaz ve
// spike'ın birinci kriteri sessizce yanlış geçer. Satır referansları yorumlarda.

import 'dart:math' as math;
import 'package:flutter/rendering.dart';
import 'annotation_model.dart';

// AnnotationStage.tsx:66-67
const _highlighterOpacityActive = 0.38;
const _highlighterOpacityInactive = 0.30;
// AnnotationStage.tsx:538
const _inactiveLayerOpacity = 0.82;
// AnnotationStage.tsx:561 — Konva Line tension
const _penTension = 0.2;
const _highlighterTension = 0.0;
// AnnotationStage.tsx:553
const _minPenWidthPx = 1.0;
const _minHighlighterWidthPx = 6.0;
// AnnotationStage.tsx:578-579
const _arrowPointerLength = 10.0;
const _arrowPointerWidth = 10.0;
// AnnotationStage.tsx:598 (Rect cornerRadius)
const _rectCornerRadius = 6.0;
// AnnotationStage.tsx:614-633 (Label > Tag + Text)
const _textFontSize = 15.0;
const _textLineHeight = 1.3;
const _textPadding = 10.0;
const _textMinWidthPx = 140.0;
const _textTagCornerRadius = 8.0;
const _textTagFill = Color(0xE60F172A); // rgba(15, 23, 42, 0.9)

class AnnotationPainter extends CustomPainter {
  final List<AnnotationItem> items;

  /// Aktif katman tam opak çizilir, pasif katman soluk (0.82).
  final bool isActiveLayer;

  /// Metin notlarının yeniden ölçülmesini engellemek için dışarıdan verilebilir.
  final TextDirection textDirection;

  const AnnotationPainter({
    required this.items,
    this.isActiveLayer = true,
    this.textDirection = TextDirection.ltr,
  });

  @override
  void paint(Canvas canvas, Size size) {
    for (final item in items) {
      switch (item) {
        case PenStroke i:
          _drawStroke(canvas, size, i.points, i.color, i.strokeWidth,
              tension: _penTension,
              minWidthPx: _minPenWidthPx,
              opacity: isActiveLayer ? 1.0 : _inactiveLayerOpacity);
        case HighlighterStroke i:
          _drawStroke(canvas, size, i.points, i.color, i.strokeWidth,
              tension: _highlighterTension,
              minWidthPx: _minHighlighterWidthPx,
              opacity: isActiveLayer
                  ? _highlighterOpacityActive
                  : _highlighterOpacityInactive);
        case ArrowShape i:
          _drawArrow(canvas, size, i);
        case RectangleShape i:
          _drawRect(canvas, size, i);
        case TextNote i:
          _drawText(canvas, size, i);
      }
    }
  }

  double _opacity() => isActiveLayer ? 1.0 : _inactiveLayerOpacity;

  /// strokeWidth kayıtta normalize: strokeWidthPx / pageWidthPx  (AnnotationStage.tsx:69-71)
  /// çizerken geri açılır: max(strokeWidth * pageWidth, min)      (AnnotationStage.tsx:553)
  double _denormalizeWidth(double normalized, Size size, double minPx) =>
      math.max(normalized * size.width, minPx);

  void _drawStroke(
    Canvas canvas,
    Size size,
    List<NormalizedPoint> points,
    Color color,
    double strokeWidth, {
    required double tension,
    required double minWidthPx,
    required double opacity,
  }) {
    if (points.isEmpty) return;
    final pts = points.map((p) => p.denormalize(size)).toList(growable: false);

    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..color = color.withValues(alpha: color.a * opacity)
      ..strokeWidth = _denormalizeWidth(strokeWidth, size, minWidthPx)
      ..strokeCap = StrokeCap.round // AnnotationStage.tsx:559
      ..strokeJoin = StrokeJoin.round // AnnotationStage.tsx:560
      ..isAntiAlias = true;

    if (pts.length == 1) {
      canvas.drawCircle(
        pts.first,
        paint.strokeWidth / 2,
        Paint()
          ..color = paint.color
          ..isAntiAlias = true,
      );
      return;
    }
    canvas.drawPath(_buildPath(pts, tension), paint);
  }

  /// Konva `tension` karşılığı. Kontrol noktası formülü Konva Util._expandPoints
  /// ile aynıdır; Konva uç segmentlerde quadratic kullanır, burada da öyle.
  Path _buildPath(List<Offset> p, double tension) {
    final path = Path()..moveTo(p.first.dx, p.first.dy);
    if (tension == 0 || p.length < 3) {
      for (var i = 1; i < p.length; i++) {
        path.lineTo(p[i].dx, p[i].dy);
      }
      return path;
    }

    final cp = <Offset>[];
    for (var i = 1; i < p.length - 1; i++) {
      final p0 = p[i - 1], p1 = p[i], p2 = p[i + 1];
      final d01 = (p1 - p0).distance;
      final d12 = (p2 - p1).distance;
      final denom = d01 + d12;
      final fa = denom == 0 ? 0.0 : tension * d01 / denom;
      final fb = denom == 0 ? 0.0 : tension * d12 / denom;
      cp.add(Offset(p1.dx - fa * (p2.dx - p0.dx), p1.dy - fa * (p2.dy - p0.dy)));
      cp.add(Offset(p1.dx + fb * (p2.dx - p0.dx), p1.dy + fb * (p2.dy - p0.dy)));
    }

    path.quadraticBezierTo(cp[0].dx, cp[0].dy, p[1].dx, p[1].dy);
    for (var i = 1; i <= p.length - 3; i++) {
      final c1 = cp[2 * i - 1];
      final c2 = cp[2 * i];
      path.cubicTo(c1.dx, c1.dy, c2.dx, c2.dy, p[i + 1].dx, p[i + 1].dy);
    }
    path.quadraticBezierTo(cp.last.dx, cp.last.dy, p.last.dx, p.last.dy);
    return path;
  }

  void _drawArrow(Canvas canvas, Size size, ArrowShape a) {
    if (!hasRenderableArea(a.start, a.end)) return;
    final start = a.start.denormalize(size);
    final end = a.end.denormalize(size);
    final opacity = _opacity();
    final color = a.color.withValues(alpha: a.color.a * opacity);
    final width = _denormalizeWidth(a.strokeWidth, size, _minPenWidthPx);

    canvas.drawLine(
      start,
      end,
      Paint()
        ..color = color
        ..strokeWidth = width
        ..strokeCap = StrokeCap.round
        ..isAntiAlias = true,
    );

    final angle = math.atan2(end.dy - start.dy, end.dx - start.dx);
    final half = _arrowPointerWidth / 2;
    final base = Offset(
      end.dx - _arrowPointerLength * math.cos(angle),
      end.dy - _arrowPointerLength * math.sin(angle),
    );
    final head = Path()
      ..moveTo(end.dx, end.dy)
      ..lineTo(base.dx + half * math.sin(angle), base.dy - half * math.cos(angle))
      ..lineTo(base.dx - half * math.sin(angle), base.dy + half * math.cos(angle))
      ..close();
    canvas.drawPath(head, Paint()..color = color..isAntiAlias = true);
  }

  void _drawRect(Canvas canvas, Size size, RectangleShape r) {
    if (!hasRenderableArea(r.start, r.end)) return;
    final a = r.start.denormalize(size);
    final b = r.end.denormalize(size);
    final rect = Rect.fromLTRB(
      math.min(a.dx, b.dx),
      math.min(a.dy, b.dy),
      math.max(a.dx, b.dx),
      math.max(a.dy, b.dy),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(_rectCornerRadius)),
      Paint()
        ..style = PaintingStyle.stroke
        ..color = r.color.withValues(alpha: r.color.a * _opacity())
        ..strokeWidth = _denormalizeWidth(r.strokeWidth, size, _minPenWidthPx)
        ..isAntiAlias = true,
    );
  }

  void _drawText(Canvas canvas, Size size, TextNote t) {
    if (t.text.isEmpty) return;
    final opacity = _opacity();
    final origin = t.position.denormalize(size);
    // AnnotationStage.tsx:627 — width={Math.max(item.width * width, 140)}
    final boxWidth = math.max(t.width * size.width, _textMinWidthPx);

    final painter = TextPainter(
      text: TextSpan(
        text: t.text,
        style: TextStyle(
          color: t.color.withValues(alpha: t.color.a * opacity),
          fontSize: _textFontSize,
          height: _textLineHeight,
        ),
      ),
      textDirection: textDirection,
    )..layout(maxWidth: boxWidth - _textPadding * 2);

    final tag = Rect.fromLTWH(
      origin.dx,
      origin.dy,
      boxWidth,
      painter.height + _textPadding * 2,
    );
    final rrect =
        RRect.fromRectAndRadius(tag, const Radius.circular(_textTagCornerRadius));

    canvas.drawRRect(
      rrect,
      Paint()..color = _textTagFill.withValues(alpha: _textTagFill.a * opacity),
    );
    canvas.drawRRect(
      rrect,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = t.color.withValues(alpha: t.color.a * opacity),
    );
    painter.paint(canvas, origin + const Offset(_textPadding, _textPadding));
  }

  @override
  bool shouldRepaint(covariant AnnotationPainter old) =>
      old.items != items || old.isActiveLayer != isActiveLayer;
}
