import type { AnnotationItem } from '@/lib/repertuvar/annotation-types';

/** Maps a display page to the one-based PDF page stored by annotations. */
export function getStoredPdfPageNumber(
  displayPage: number,
  hasCoverPage: boolean,
  hasSelectedPdf: boolean,
): number | null {
  if (!hasSelectedPdf || !Number.isInteger(displayPage) || displayPage <= 0) return null;
  if (hasCoverPage && displayPage === 1) return null;
  return hasCoverPage ? displayPage - 1 : displayPage;
}

/** Keeps the newest browser-memory snapshot visible while its server retry is pending. */
export function mergeLoadedAndPendingAnnotationLayers(
  loadedLayers: Record<string, AnnotationItem[]>,
  pendingLayers: Record<string, AnnotationItem[]>,
): Record<string, AnnotationItem[]> {
  return { ...loadedLayers, ...pendingLayers };
}

export function getAnnotationCompatibilityWarning(
  skippedCount: number,
  blockedLayerCount: number,
): string | null {
  const messages: string[] = [];
  if (skippedCount > 0) {
    messages.push(`${skippedCount} desteklenmeyen veya bozuk not öğesi atlandı.`);
  }
  if (blockedLayerCount > 0) {
    messages.push(
      `${blockedLayerCount} not katmanı kayıpsız düzenlenemediği için salt okunur açıldı.`,
    );
  }
  return messages.length > 0 ? messages.join(' ') : null;
}

interface AnnotationBeforeUnloadEvent {
  preventDefault: () => void;
  returnValue: string;
}

/** Applies the browser leave guard only while a save or retry remains unresolved. */
export function applyAnnotationBeforeUnloadGuard(
  event: AnnotationBeforeUnloadEvent,
  hasUnresolvedWork: boolean,
): boolean {
  if (!hasUnresolvedWork) return false;
  event.preventDefault();
  event.returnValue = '';
  return true;
}
