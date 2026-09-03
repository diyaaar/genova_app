// Anotasyon çizim katmanı — Skia.
// Şekiller Skia'da, metin notları üstte normal RN View'ları olarak (spike'ta font yüklemeye girmiyoruz).
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas, Path, Group, Skia } from '@shopify/react-native-skia';
import { buildStrokePath, type Pt } from './tension';
import { parseAnnotations, hasRenderableArea, type AnnotationItem } from './model';
import * as C from './constants';

type Props = { items: AnnotationItem[]; isActiveLayer: boolean; width: number; height: number };

export function AnnotationLayer({ items, isActiveLayer, width, height }: Props) {
  const denorm = (p: { x: number; y: number }): Pt => ({ x: p.x * width, y: p.y * height });
  const layerOpacity = isActiveLayer ? 1 : C.INACTIVE_LAYER_OPACITY;
  const texts = items.filter((i: any) => i.type === 'text');

  return (
    <>
      <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
        {items.map((raw: any) => {
          const color = C.resolveColor(raw.color);
          switch (raw.type) {
            case 'pen':
            case 'highlighter': {
              const hl = raw.type === 'highlighter';
              const pts = (raw.points ?? []).map(denorm);
              if (pts.length === 0) return null;
              return (
                <Path
                  key={raw.id}
                  path={buildStrokePath(pts, hl ? C.HIGHLIGHTER_TENSION : C.PEN_TENSION)}
                  color={color}
                  style="stroke"
                  strokeWidth={C.denormalizeWidth(
                    raw.strokeWidth, width,
                    hl ? C.MIN_HIGHLIGHTER_WIDTH_PX : C.MIN_PEN_WIDTH_PX,
                  )}
                  strokeCap="round"
                  strokeJoin="round"
                  opacity={hl
                    ? (isActiveLayer ? C.HIGHLIGHTER_OPACITY_ACTIVE : C.HIGHLIGHTER_OPACITY_INACTIVE)
                    : layerOpacity}
                />
              );
            }
            case 'arrow': {
              if (!hasRenderableArea(raw.start, raw.end, C.RENDERABLE_AREA_EPSILON)) return null;
              const s = denorm(raw.start), e = denorm(raw.end);
              const w = C.denormalizeWidth(raw.strokeWidth, width, C.MIN_PEN_WIDTH_PX);
              const ang = Math.atan2(e.y - s.y, e.x - s.x);
              const half = C.ARROW_POINTER_WIDTH / 2;
              const bx = e.x - C.ARROW_POINTER_LENGTH * Math.cos(ang);
              const by = e.y - C.ARROW_POINTER_LENGTH * Math.sin(ang);
              const line = buildStrokePath([s, e], 0);
              const head = buildStrokePath(
                [
                  { x: e.x, y: e.y },
                  { x: bx + half * Math.sin(ang), y: by - half * Math.cos(ang) },
                  { x: bx - half * Math.sin(ang), y: by + half * Math.cos(ang) },
                  { x: e.x, y: e.y },
                ], 0,
              );
              return (
                <Group key={raw.id} opacity={layerOpacity}>
                  <Path path={line} color={color} style="stroke" strokeWidth={w} strokeCap="round" />
                  <Path path={head} color={color} style="fill" />
                </Group>
              );
            }
            case 'rectangle': {
              if (!hasRenderableArea(raw.start, raw.end, C.RENDERABLE_AREA_EPSILON)) return null;
              const a = denorm(raw.start), b = denorm(raw.end);
              const p = Skia_roundRect(
                Math.min(a.x, b.x), Math.min(a.y, b.y),
                Math.abs(a.x - b.x), Math.abs(a.y - b.y),
              );
              return (
                <Path key={raw.id} path={p} color={color} style="stroke" opacity={layerOpacity}
                  strokeWidth={C.denormalizeWidth(raw.strokeWidth, width, C.MIN_PEN_WIDTH_PX)} />
              );
            }
            default:
              return null; // metin notları aşağıda, bilinmeyen tipler zaten ayıklandı
          }
        })}
      </Canvas>

      {texts.map((t: any) => {
        const boxW = Math.max(t.width * width, C.TEXT_MIN_WIDTH_PX);
        return (
          <View
            key={t.id}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: t.position.x * width,
              top: t.position.y * height,
              width: boxW,
              padding: C.TEXT_PADDING,
              borderRadius: C.TEXT_TAG_RADIUS,
              backgroundColor: C.TEXT_TAG_FILL,
              borderWidth: 1,
              borderColor: C.resolveColor(t.color),
              opacity: layerOpacity,
            }}
          >
            <Text style={{
              color: C.resolveColor(t.color),
              fontSize: C.TEXT_FONT_SIZE,
              lineHeight: C.TEXT_FONT_SIZE * C.TEXT_LINE_HEIGHT,
            }}>{t.text}</Text>
          </View>
        );
      })}
    </>
  );
}

// Skia.Path ile yuvarlak köşeli dikdörtgen
function Skia_roundRect(x: number, y: number, w: number, h: number) {
  const p = Skia.Path.Make();
  p.addRRect({ rect: { x, y, width: w, height: h },
    rx: C.RECT_CORNER_RADIUS, ry: C.RECT_CORNER_RADIUS });
  return p;
}

export { parseAnnotations };
