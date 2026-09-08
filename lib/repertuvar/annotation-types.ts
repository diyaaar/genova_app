export const VOICE_GROUPS = ['Soprano', 'Alto', 'Tenor', 'Bass'] as const;

export type VoiceGroup = (typeof VOICE_GROUPS)[number];
export type PreviewVoiceGroup = VoiceGroup | 'ALL';
export type AnnotationTool = 'pen' | 'highlighter' | 'arrow' | 'rectangle' | 'text' | 'eraser' | null;
export type LegacyAnnotationColor = 'black' | 'red' | 'white';
export type HexAnnotationColor = `#${string}`;
export type AnnotationColor = LegacyAnnotationColor | HexAnnotationColor;
export type AnnotationLayerType = 'personal' | 'shared_voice_group' | 'shared_all';
export type AnnotationLayerKey = 'personal' | 'shared_all' | `shared_voice_group:${VoiceGroup}`;
export type AnnotationSaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface NormalizedPoint {
  x: number;
  y: number;
}

export interface AnnotationBase {
  id: string;
  type: 'pen' | 'highlighter' | 'arrow' | 'rectangle' | 'text';
  color: AnnotationColor;
}

export interface PenStroke extends AnnotationBase {
  type: 'pen';
  points: NormalizedPoint[];
  strokeWidth: number;
}

export interface HighlighterStroke extends AnnotationBase {
  type: 'highlighter';
  points: NormalizedPoint[];
  strokeWidth: number;
}

export interface ArrowShape extends AnnotationBase {
  type: 'arrow';
  start: NormalizedPoint;
  end: NormalizedPoint;
  strokeWidth: number;
}

export interface RectangleShape extends AnnotationBase {
  type: 'rectangle';
  start: NormalizedPoint;
  end: NormalizedPoint;
  strokeWidth: number;
}

export interface TextNote extends AnnotationBase {
  type: 'text';
  position: NormalizedPoint;
  text: string;
  width: number;
}

export type AnnotationItem = PenStroke | HighlighterStroke | ArrowShape | RectangleShape | TextNote;

export interface AnnotationParseResult {
  items: AnnotationItem[];
  skippedCount: number;
}

export interface AnnotationContextDescriptor {
  fileId: string;
  pageNumber: number;
  layerKey: AnnotationLayerKey;
}

export interface LayerVisibility {
  personal: boolean;
  shared: boolean;
}

export const DEFAULT_ANNOTATION_COLOR: LegacyAnnotationColor = 'red';
export const DEFAULT_HIGHLIGHTER_COLOR: HexAnnotationColor = '#facc15';
export const DEFAULT_ANNOTATION_STROKE_WIDTH_PX = 3;
export const DEFAULT_HIGHLIGHTER_STROKE_WIDTH_PX = 10;
export const MIN_ANNOTATION_STROKE_WIDTH_PX = 1;
export const MAX_ANNOTATION_STROKE_WIDTH_PX = 14;
export const LEGACY_ANNOTATION_COLORS: LegacyAnnotationColor[] = ['black', 'red', 'white'];

export const ANNOTATION_COLOR_SWATCHES: Record<LegacyAnnotationColor, string> = {
  black: '#111111',
  red: '#ef4444',
  white: '#f8fafc',
};

export const ANNOTATION_COLOR_PRESETS: Array<{ color: AnnotationColor; label: string }> = [
  { color: 'black', label: 'Siyah' },
  { color: 'red', label: 'Kırmızı' },
  { color: 'white', label: 'Beyaz' },
  { color: DEFAULT_HIGHLIGHTER_COLOR, label: 'Sarı' },
  { color: '#22c55e', label: 'Yeşil' },
  { color: '#38bdf8', label: 'Mavi' },
  { color: '#f97316', label: 'Turuncu' },
];

const HEX_ANNOTATION_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;
const MAX_PARSED_ANNOTATION_ITEMS = 5_000;
const MAX_STROKE_POINTS = 10_000;
const MAX_TEXT_LENGTH = 10_000;

export function isHexAnnotationColor(value: string): value is HexAnnotationColor {
  return HEX_ANNOTATION_COLOR_PATTERN.test(value);
}

export function resolveAnnotationColor(color: AnnotationColor | string | null | undefined): string {
  if (color === 'black' || color === 'red' || color === 'white') {
    return ANNOTATION_COLOR_SWATCHES[color];
  }

  if (color && isHexAnnotationColor(color)) {
    return color;
  }

  return ANNOTATION_COLOR_SWATCHES[DEFAULT_ANNOTATION_COLOR];
}

export function clampAnnotationStrokeWidthPx(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_ANNOTATION_STROKE_WIDTH_PX;
  }

  return Math.min(
    MAX_ANNOTATION_STROKE_WIDTH_PX,
    Math.max(MIN_ANNOTATION_STROKE_WIDTH_PX, Math.round(value)),
  );
}

export function asVoiceGroup(value: string | null | undefined): VoiceGroup | null {
  if (!value) return null;
  return VOICE_GROUPS.includes(value as VoiceGroup) ? (value as VoiceGroup) : null;
}

export function makeSharedVoiceGroupLayerKey(voiceGroup: VoiceGroup): AnnotationLayerKey {
  return `shared_voice_group:${voiceGroup}`;
}

export function parseLayerKey(layerKey: AnnotationLayerKey): {
  layerType: AnnotationLayerType;
  targetVoiceGroup: VoiceGroup | null;
} {
  if (layerKey === 'personal') {
    return { layerType: 'personal', targetVoiceGroup: null };
  }

  if (layerKey === 'shared_all') {
    return { layerType: 'shared_all', targetVoiceGroup: null };
  }

  return {
    layerType: 'shared_voice_group',
    targetVoiceGroup: layerKey.replace('shared_voice_group:', '') as VoiceGroup,
  };
}

export function getLayerLabel(layerKey: AnnotationLayerKey): string {
  if (layerKey === 'personal') return 'SİZ';
  if (layerKey === 'shared_all') return 'Ortak';
  const group = layerKey.replace('shared_voice_group:', '');
  if (group === 'Soprano') return 'SOP';
  if (group === 'Alto') return 'ALT';
  if (group === 'Tenor') return 'TEN';
  if (group === 'Bass') return 'BAS';
  return group;
}

export function getPreviewVoiceGroupLabel(value: PreviewVoiceGroup): string {
  if (value === 'ALL') return 'Tüm Partisyonlar';
  if (value === 'Soprano') return 'SOP';
  if (value === 'Alto') return 'ALT';
  if (value === 'Tenor') return 'TEN';
  if (value === 'Bass') return 'BAS';
  return value;
}

export function makeLayerPageKey({ fileId, pageNumber, layerKey }: AnnotationContextDescriptor): string {
  return `${fileId}::${pageNumber}::${layerKey}`;
}

export function parseLayerPageKey(layerPageKey: string): AnnotationContextDescriptor {
  const [fileId, pageNumber, ...layerParts] = layerPageKey.split('::');

  return {
    fileId: fileId ?? '',
    pageNumber: Number(pageNumber),
    layerKey: layerParts.join('::') as AnnotationLayerKey,
  };
}

export function clampNormalizedPoint(point: NormalizedPoint): NormalizedPoint {
  return {
    x: Math.max(0, Math.min(1, point.x)),
    y: Math.max(0, Math.min(1, point.y)),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parsePoint(value: unknown): NormalizedPoint | null {
  if (!isRecord(value) || typeof value.x !== 'number' || typeof value.y !== 'number') {
    return null;
  }
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) return null;
  return clampNormalizedPoint({ x: value.x, y: value.y });
}

function parseColor(value: unknown): AnnotationColor | null {
  if (value === 'black' || value === 'red' || value === 'white') return value;
  return typeof value === 'string' && isHexAnnotationColor(value) ? value : null;
}

function parseBase(value: Record<string, unknown>) {
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const color = parseColor(value.color);
  if (!id || id.length > 256 || !color) return null;
  return { id, color };
}

function parsePositiveNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.min(1, value)
    : null;
}

/**
 * Defensive compatibility boundary shared by web and native readers.
 *
 * Unknown or malformed items are deliberately skipped so a future web schema cannot crash an
 * older client. Normalized points are clamped at this boundary before any renderer sees them.
 */
export function parseAnnotationItems(value: unknown): AnnotationParseResult {
  if (!Array.isArray(value)) return { items: [], skippedCount: 1 };

  const items: AnnotationItem[] = [];
  let skippedCount = 0;

  const limited = value.slice(0, MAX_PARSED_ANNOTATION_ITEMS);
  skippedCount += Math.max(0, value.length - limited.length);
  for (const raw of limited) {
    if (!isRecord(raw)) {
      skippedCount += 1;
      continue;
    }
    const base = parseBase(raw);
    if (!base) {
      skippedCount += 1;
      continue;
    }

    if (raw.type === 'pen' || raw.type === 'highlighter') {
      const strokeWidth = parsePositiveNumber(raw.strokeWidth);
      const points = Array.isArray(raw.points) && raw.points.length <= MAX_STROKE_POINTS
        ? raw.points.map(parsePoint)
        : [];
      if (!strokeWidth || points.length === 0 || points.some((point) => point === null)) {
        skippedCount += 1;
        continue;
      }
      items.push({
        ...base,
        type: raw.type,
        points: points as NormalizedPoint[],
        strokeWidth,
      });
      continue;
    }

    if (raw.type === 'arrow' || raw.type === 'rectangle') {
      const start = parsePoint(raw.start);
      const end = parsePoint(raw.end);
      const strokeWidth = parsePositiveNumber(raw.strokeWidth);
      if (!start || !end || !strokeWidth) {
        skippedCount += 1;
        continue;
      }
      items.push({ ...base, type: raw.type, start, end, strokeWidth });
      continue;
    }

    if (raw.type === 'text') {
      const position = parsePoint(raw.position);
      const width = parsePositiveNumber(raw.width);
      if (!position || !width || typeof raw.text !== 'string' || raw.text.length > MAX_TEXT_LENGTH) {
        skippedCount += 1;
        continue;
      }
      items.push({ ...base, type: 'text', position, text: raw.text, width });
      continue;
    }

    skippedCount += 1;
  }

  return { items, skippedCount };
}

export function parseAnnotationSchemaPayload(
  value: unknown,
  schemaVersion: number,
): AnnotationParseResult {
  if (schemaVersion !== 1) {
    return {
      items: [],
      skippedCount: Array.isArray(value) ? Math.max(1, value.length) : 1,
    };
  }
  return parseAnnotationItems(value);
}

export function normalizePoint(x: number, y: number, width: number, height: number): NormalizedPoint {
  return clampNormalizedPoint({
    x: width > 0 ? x / width : 0,
    y: height > 0 ? y / height : 0,
  });
}

export function denormalizePoint(point: NormalizedPoint, width: number, height: number): { x: number; y: number } {
  return {
    x: point.x * width,
    y: point.y * height,
  };
}

export function createAnnotationId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `annotation_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function cloneAnnotationItem(item: AnnotationItem): AnnotationItem {
  switch (item.type) {
    case 'pen':
    case 'highlighter':
      return {
        ...item,
        points: item.points.map((point) => ({ ...point })),
      };
    case 'arrow':
    case 'rectangle':
      return {
        ...item,
        start: { ...item.start },
        end: { ...item.end },
      };
    case 'text':
      return {
        ...item,
        position: { ...item.position },
      };
  }
}

export function cloneAnnotationItems(items: AnnotationItem[]): AnnotationItem[] {
  return items.map(cloneAnnotationItem);
}
