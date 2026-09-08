import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ANNOTATION_STROKE_WIDTH_PX,
  MAX_ANNOTATION_STROKE_WIDTH_PX,
  MIN_ANNOTATION_STROKE_WIDTH_PX,
  clampAnnotationStrokeWidthPx,
  parseAnnotationItems,
  parseAnnotationSchemaPayload,
  resolveAnnotationColor,
} from '@/lib/repertuvar/annotation-types';

describe('resolveAnnotationColor', () => {
  it('resolves legacy annotation colors', () => {
    expect(resolveAnnotationColor('red')).toBe('#ef4444');
    expect(resolveAnnotationColor('black')).toBe('#111111');
    expect(resolveAnnotationColor('white')).toBe('#f8fafc');
  });

  it('keeps valid custom hex colors and falls back for invalid values', () => {
    expect(resolveAnnotationColor('#12ABef')).toBe('#12ABef');
    expect(resolveAnnotationColor('#bad')).toBe('#ef4444');
    expect(resolveAnnotationColor('rgb(0,0,0)')).toBe('#ef4444');
  });
});

describe('parseAnnotationItems', () => {
  it('accepts every known shape and clamps normalized points', () => {
    const result = parseAnnotationItems([
      { id: 'p', type: 'pen', color: 'red', strokeWidth: 0.01, points: [{ x: -1, y: 2 }] },
      { id: 'h', type: 'highlighter', color: '#facc15', strokeWidth: 0.02, points: [{ x: 0.2, y: 0.3 }] },
      { id: 'a', type: 'arrow', color: 'black', strokeWidth: 0.01, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
      { id: 'r', type: 'rectangle', color: 'white', strokeWidth: 0.01, start: { x: 0.2, y: 0.3 }, end: { x: 0.8, y: 0.9 } },
      { id: 't', type: 'text', color: '#12ABef', position: { x: 0.4, y: 0.5 }, text: 'Nota', width: 0.25 },
    ]);

    expect(result.skippedCount).toBe(0);
    expect(result.items).toHaveLength(5);
    expect(result.items[0]).toMatchObject({ points: [{ x: 0, y: 1 }] });
  });

  it('skips unknown and unsafe shapes without throwing', () => {
    const result = parseAnnotationItems([
      null,
      { id: '', type: 'pen', color: 'red', strokeWidth: 1, points: [{ x: 0, y: 0 }] },
      { id: 'bad-color', type: 'pen', color: 'rgb(0,0,0)', strokeWidth: 1, points: [{ x: 0, y: 0 }] },
      { id: 'bad-point', type: 'pen', color: 'red', strokeWidth: 1, points: [{ x: Number.NaN, y: 0 }] },
      { id: 'bad-width', type: 'rectangle', color: 'red', strokeWidth: 0, start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
      { id: 'future', type: 'ellipse', color: 'red' },
    ]);

    expect(result).toEqual({ items: [], skippedCount: 6 });
    expect(parseAnnotationItems({})).toEqual({ items: [], skippedCount: 1 });
  });

  it('bounds normalized render widths', () => {
    const parsed = parseAnnotationItems([
      { id: 'wide-stroke', type: 'pen', color: 'red', strokeWidth: 99, points: [{ x: 0, y: 0 }] },
      { id: 'wide-text', type: 'text', color: 'red', position: { x: 0, y: 0 }, text: 'safe', width: 99 },
    ]);
    expect(parsed.items[0]).toMatchObject({ strokeWidth: 1 });
    expect(parsed.items[1]).toMatchObject({ width: 1 });
  });

  it('skips future schema payloads as a visible count', () => {
    expect(parseAnnotationSchemaPayload([
      { id: 'future-a' },
      { id: 'future-b' },
    ], 2)).toEqual({ items: [], skippedCount: 2 });
    expect(parseAnnotationSchemaPayload([], 2)).toEqual({ items: [], skippedCount: 1 });
  });
});

describe('clampAnnotationStrokeWidthPx', () => {
  it('clamps and rounds stroke width values', () => {
    expect(clampAnnotationStrokeWidthPx(0)).toBe(MIN_ANNOTATION_STROKE_WIDTH_PX);
    expect(clampAnnotationStrokeWidthPx(6.6)).toBe(7);
    expect(clampAnnotationStrokeWidthPx(99)).toBe(MAX_ANNOTATION_STROKE_WIDTH_PX);
    expect(clampAnnotationStrokeWidthPx(Number.NaN)).toBe(DEFAULT_ANNOTATION_STROKE_WIDTH_PX);
  });
});
