// Tipler web ile ORTAK — port yok, ayna yok.
// tsconfig.json'daki "@genova/*" yolu ../../lib/* dizinine bakıyor.
// `import type` derleme anında silinir, Metro'yu ilgilendirmez.
import type {
  AnnotationItem,
  NormalizedPoint,
} from '@genova/repertuvar/annotation-types';

export type { AnnotationItem, NormalizedPoint };

export type LayerRow = {
  page_number: number;
  layer_type: 'personal' | 'shared_voice_group' | 'shared_all';
  annotations_json: unknown[];
};

const KNOWN = ['pen', 'highlighter', 'arrow', 'rectangle', 'text'];

/** Bilinmeyen tip ATLANIR, çökmez — web'e yeni tip eklenirse eski mobil ayakta kalır. */
export function parseAnnotations(raw: unknown[]): AnnotationItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (i): i is AnnotationItem =>
      !!i && typeof i === 'object' && KNOWN.includes((i as any).type),
  );
}

export function hasRenderableArea(a: NormalizedPoint, b: NormalizedPoint, eps: number) {
  return Math.abs(a.x - b.x) > eps || Math.abs(a.y - b.y) > eps;
}
