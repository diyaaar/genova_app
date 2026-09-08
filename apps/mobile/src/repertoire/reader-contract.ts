import type { AnnotationItem, AnnotationLayerKey } from '@shared/repertuvar/annotation-types';
import type { RepertoireFile } from '@shared/repertuvar/catalog-core';

const COVER_PARTITION = '__cover__';
export const MAX_SCORE_FILE_BYTES = 100 * 1024 * 1024;

export interface NativeAnnotationLayer {
  layerKey: AnnotationLayerKey;
  items: AnnotationItem[];
}

export interface NativeAnnotationReadResult {
  byPage: Record<number, NativeAnnotationLayer[]>;
  skippedCount: number;
}

export interface NativePageImage {
  uri: string;
  width: number;
  height: number;
}

export interface NativeScoreDocument {
  choirId: string;
  fileId: string;
  fileName: string;
  uri: string;
  pageCount: number;
  annotations: NativeAnnotationReadResult;
}

export interface NativeRenderedPageWindow {
  currentPage: number;
  pages: Record<number, NativePageImage>;
}

export interface NativeScoreReaderGateway {
  open(input: { choirId: string; file: RepertoireFile }): Promise<NativeScoreDocument>;
  renderWindow(document: NativeScoreDocument, pageNumber: number): Promise<NativeRenderedPageWindow>;
  close(uri: string): Promise<void>;
  clear(): Promise<void>;
}

export function isScorePdf(file: RepertoireFile): boolean {
  if (file.file_type !== 'sheet') return false;
  if ((file.partition_label ?? '').trim().toLowerCase() === COVER_PARTITION) return false;
  const mime = (file.mime_type ?? '').trim().toLowerCase();
  const name = file.file_name.trim().toLowerCase();
  return mime === 'application/pdf' || mime.endsWith('+pdf') || name.endsWith('.pdf');
}

export function getScorePdfFiles(files: RepertoireFile[] | null | undefined): RepertoireFile[] {
  return (files ?? []).filter(isScorePdf).sort((a, b) => {
    const aTime = Date.parse(a.created_at) || 0;
    const bTime = Date.parse(b.created_at) || 0;
    return bTime - aTime;
  });
}

/** The one named boundary between database/UI pages and the native renderer. */
export function toNativePdfPageIndex(pageNumber: number): number {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new Error('PDF sayfa numarası geçersiz.');
  }
  return pageNumber - 1;
}

export function getRenderWindowPages(pageNumber: number, pageCount: number): number[] {
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageNumber > pageCount) {
    throw new Error('PDF sayfa aralığı geçersiz.');
  }
  toNativePdfPageIndex(pageNumber);
  return [pageNumber - 1, pageNumber, pageNumber + 1]
    .filter((value) => value >= 1 && value <= pageCount);
}

export function hasPdfHeader(bytes: ArrayLike<number>): boolean {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 &&
    bytes[3] === 0x46 && bytes[4] === 0x2d;
}

export function assertAllowedScoreFileSize(size: number | null | undefined): void {
  if (size === null || size === undefined) return;
  if (!Number.isFinite(size) || size <= 0) throw new Error('PDF dosyası boş veya eksik.');
  if (size > MAX_SCORE_FILE_BYTES) throw new Error('PDF dosyası 100 MB sınırını aşıyor.');
}
