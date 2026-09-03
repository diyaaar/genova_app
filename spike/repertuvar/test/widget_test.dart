// Spike'ta test kapsam dışı; bu dosya yalnızca `flutter test` kapısının
// yeşil kalması için var. Gerçek testler ürün kodunda (flutter/) yazılacak.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:genova_spike/annotation_model.dart';
import 'package:genova_spike/annotation_painter.dart';

void main() {
  test('legacy renk isimleri çözülüyor', () {
    expect(parseAnnotationColor('red'), const Color(0xFFEF4444));
    expect(parseAnnotationColor('#facc15'), const Color(0xFFFACC15));
    expect(parseAnnotationColor(null), const Color(0xFFEF4444));
  });

  test('bilinmeyen tip çökme yerine atlanıyor', () {
    final items = parseAnnotationsJson([
      {'id': 'a', 'type': 'pen', 'color': 'red', 'strokeWidth': 0.01, 'points': [
        {'x': 0.1, 'y': 0.1},
        {'x': 0.2, 'y': 0.2},
      ]},
      {'id': 'b', 'type': 'gelecekte_eklenen_tip', 'color': 'red'},
    ]);
    expect(items.length, 1);
    expect(items.first, isA<PenStroke>());
  });

  test('painter kurulabiliyor', () {
    expect(
      const AnnotationPainter(items: [], isActiveLayer: false),
      isA<CustomPainter>(),
    );
  });
}
