// Genova — anotasyon çizim sabitleri
// Hepsi components/repertuvar/AnnotationStage.tsx'ten BİREBİR alındı (satır no yorumda).
// Yeniden türetme: yanlış türetirsen çizimler web'le uyuşmaz ve hata sessiz kalır.

export const HIGHLIGHTER_OPACITY_ACTIVE = 0.38;   // :66
export const HIGHLIGHTER_OPACITY_INACTIVE = 0.30; // :67
export const INACTIVE_LAYER_OPACITY = 0.82;       // :538
export const PEN_TENSION = 0.2;                   // :561
export const HIGHLIGHTER_TENSION = 0;             // :561
export const MIN_PEN_WIDTH_PX = 1;                // :553
export const MIN_HIGHLIGHTER_WIDTH_PX = 6;        // :553
export const ARROW_POINTER_LENGTH = 10;           // :578
export const ARROW_POINTER_WIDTH = 10;            // :579
export const RECT_CORNER_RADIUS = 6;              // :598
export const TEXT_FONT_SIZE = 15;                 // :629
export const TEXT_LINE_HEIGHT = 1.3;              // :630
export const TEXT_PADDING = 10;                   // :631
export const TEXT_MIN_WIDTH_PX = 140;             // :627
export const TEXT_TAG_RADIUS = 8;                 // :623
export const TEXT_TAG_FILL = 'rgba(15, 23, 42, 0.9)'; // :620
export const RENDERABLE_AREA_EPSILON = 0.005;     // :77

// annotation-types.ts → ANNOTATION_COLOR_SWATCHES
const LEGACY: Record<string, string> = {
  black: '#111111',
  red: '#ef4444',
  white: '#f8fafc',
};
const FALLBACK = '#ef4444'; // DEFAULT_ANNOTATION_COLOR

/** Legacy isimler ('black'|'red'|'white') hâlâ kayıtlarda var — önce onlara bak. */
export function resolveColor(raw?: string | null): string {
  if (!raw) return FALLBACK;
  return LEGACY[raw] ?? (raw.startsWith('#') ? raw : FALLBACK);
}

/** strokeWidth kayıtta normalize (px / sayfa genişliği); çizerken geri açılır. */
export function denormalizeWidth(n: number, pageWidth: number, minPx: number): number {
  return Math.max(n * pageWidth, minPx);
}
