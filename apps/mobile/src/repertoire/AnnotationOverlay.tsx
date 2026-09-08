import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { StyleSheet, Text, View } from 'react-native';
import {
  denormalizePoint,
  resolveAnnotationColor,
  type AnnotationItem,
  type NormalizedPoint,
} from '@shared/repertuvar/annotation-types';
import type { NativeAnnotationLayer } from './reader-contract';

const INACTIVE_LAYER_OPACITY = 0.82;
const HIGHLIGHTER_OPACITY_ACTIVE = 0.38;
const HIGHLIGHTER_OPACITY_INACTIVE = 0.30;
const PEN_TENSION = 0.2;
const MIN_PEN_WIDTH = 1;
const MIN_HIGHLIGHTER_WIDTH = 6;
const ARROW_LENGTH = 10;
const ARROW_WIDTH = 10;
const TEXT_MIN_WIDTH = 140;

type Point = { x: number; y: number };

function strokePath(points: Point[], tension: number) {
  const builder = Skia.PathBuilder.Make();
  if (points.length === 0) return builder.detach();
  const first = points[0];
  if (!first) return builder.detach();
  builder.moveTo(first.x, first.y);
  if (tension === 0 || points.length < 3) {
    points.slice(1).forEach((point) => builder.lineTo(point.x, point.y));
    return builder.detach();
  }

  const controls: Point[] = [];
  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];
    if (!previous || !current || !next) continue;
    const before = Math.hypot(current.x - previous.x, current.y - previous.y);
    const after = Math.hypot(next.x - current.x, next.y - current.y);
    const total = before + after;
    const left = total === 0 ? 0 : (tension * before) / total;
    const right = total === 0 ? 0 : (tension * after) / total;
    controls.push({
      x: current.x - left * (next.x - previous.x),
      y: current.y - left * (next.y - previous.y),
    });
    controls.push({
      x: current.x + right * (next.x - previous.x),
      y: current.y + right * (next.y - previous.y),
    });
  }
  const firstControl = controls[0];
  const secondPoint = points[1];
  if (!firstControl || !secondPoint) return builder.detach();
  builder.quadTo(firstControl.x, firstControl.y, secondPoint.x, secondPoint.y);
  for (let index = 1; index <= points.length - 3; index += 1) {
    const one = controls[2 * index - 1];
    const two = controls[2 * index];
    const point = points[index + 1];
    if (one && two && point) builder.cubicTo(one.x, one.y, two.x, two.y, point.x, point.y);
  }
  const last = controls[controls.length - 1];
  const end = points[points.length - 1];
  if (last && end) builder.quadTo(last.x, last.y, end.x, end.y);
  return builder.detach();
}

function pointsToPixels(points: NormalizedPoint[], width: number, height: number) {
  return points.map((point) => denormalizePoint(point, width, height));
}

function renderShape(item: Exclude<AnnotationItem, { type: 'text' }>, width: number, height: number, opacity: number) {
  const color = resolveAnnotationColor(item.color);
  const strokeWidth = Math.max(item.strokeWidth * width, item.type === 'highlighter' ? MIN_HIGHLIGHTER_WIDTH : MIN_PEN_WIDTH);
  if (item.type === 'pen' || item.type === 'highlighter') {
    return (
      <Path
        key={item.id}
        path={strokePath(pointsToPixels(item.points, width, height), item.type === 'pen' ? PEN_TENSION : 0)}
        color={color}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        strokeJoin="round"
        opacity={item.type === 'highlighter' ? (opacity === 1 ? HIGHLIGHTER_OPACITY_ACTIVE : HIGHLIGHTER_OPACITY_INACTIVE) : opacity}
      />
    );
  }
  const start = denormalizePoint(item.start, width, height);
  const end = denormalizePoint(item.end, width, height);
  if (item.type === 'rectangle') {
    const builder = Skia.PathBuilder.Make();
    builder.addRRect({
      rect: {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        width: Math.abs(end.x - start.x),
        height: Math.abs(end.y - start.y),
      },
      rx: 6,
      ry: 6,
    });
    return <Path key={item.id} path={builder.detach()} color={color} style="stroke" strokeWidth={strokeWidth} opacity={opacity} />;
  }
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const baseX = end.x - ARROW_LENGTH * Math.cos(angle);
  const baseY = end.y - ARROW_LENGTH * Math.sin(angle);
  const half = ARROW_WIDTH / 2;
  const head = Skia.PathBuilder.Make();
  head.moveTo(end.x, end.y)
    .lineTo(baseX + half * Math.sin(angle), baseY - half * Math.cos(angle))
    .lineTo(baseX - half * Math.sin(angle), baseY + half * Math.cos(angle))
    .close();
  return (
    <Group key={item.id} opacity={opacity}>
      <Path path={strokePath([start, end], 0)} color={color} style="stroke" strokeWidth={strokeWidth} strokeCap="round" />
      <Path path={head.detach()} color={color} style="fill" />
    </Group>
  );
}

export function AnnotationOverlay({ layers, width, height }: {
  layers: NativeAnnotationLayer[];
  width: number;
  height: number;
}) {
  const shapes = layers.flatMap((layer) => layer.items
    .filter((item): item is Exclude<AnnotationItem, { type: 'text' }> => item.type !== 'text')
    .map((item) => renderShape(item, width, height, layer.layerKey === 'personal' ? 1 : INACTIVE_LAYER_OPACITY)));
  const texts = layers.flatMap((layer) => layer.items
    .filter((item): item is Extract<AnnotationItem, { type: 'text' }> => item.type === 'text')
    .map((item) => ({ item, opacity: layer.layerKey === 'personal' ? 1 : INACTIVE_LAYER_OPACITY })));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="annotation-overlay">
      <Canvas style={StyleSheet.absoluteFill}>{shapes}</Canvas>
      {texts.map(({ item, opacity }) => (
        <View key={item.id} style={[
          styles.textNote,
          {
            left: item.position.x * width,
            top: item.position.y * height,
            width: Math.max(item.width * width, TEXT_MIN_WIDTH),
            borderColor: resolveAnnotationColor(item.color),
            opacity,
          },
        ]}>
          <Text style={[styles.text, { color: resolveAnnotationColor(item.color) }]}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  textNote: {
    position: 'absolute',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(15,23,42,0.9)',
  },
  text: { fontSize: 15, lineHeight: 19.5 },
});
