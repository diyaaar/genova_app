// Konva'nın Util._expandPoints karşılığı — kalem çizgisi tension: 0.2 ile yumuşatılıyor.
// Düz polyline çizersen strok web'e göre KÖŞELİ çıkar ve bunu gözle fark etmek zordur.
import { Skia, type SkPath } from '@shopify/react-native-skia';

export type Pt = { x: number; y: number };

export function buildStrokePath(pts: Pt[], tension: number): SkPath {
  const path = Skia.Path.Make();
  if (pts.length === 0) return path;
  path.moveTo(pts[0].x, pts[0].y);

  if (tension === 0 || pts.length < 3) {
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i].x, pts[i].y);
    return path;
  }

  // Kontrol noktaları — Konva ile aynı formül
  const cp: Pt[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
    const d01 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const d12 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const denom = d01 + d12;
    const fa = denom === 0 ? 0 : (tension * d01) / denom;
    const fb = denom === 0 ? 0 : (tension * d12) / denom;
    cp.push({ x: p1.x - fa * (p2.x - p0.x), y: p1.y - fa * (p2.y - p0.y) });
    cp.push({ x: p1.x + fb * (p2.x - p0.x), y: p1.y + fb * (p2.y - p0.y) });
  }

  path.quadTo(cp[0].x, cp[0].y, pts[1].x, pts[1].y);
  for (let i = 1; i <= pts.length - 3; i++) {
    const c1 = cp[2 * i - 1], c2 = cp[2 * i];
    path.cubicTo(c1.x, c1.y, c2.x, c2.y, pts[i + 1].x, pts[i + 1].y);
  }
  const last = cp[cp.length - 1];
  path.quadTo(last.x, last.y, pts[pts.length - 1].x, pts[pts.length - 1].y);
  return path;
}
