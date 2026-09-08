import type { RepertoireFile } from '@shared/repertuvar/catalog-core';
import {
  getRenderWindowPages,
  getScorePdfFiles,
  hasPdfHeader,
  assertAllowedScoreFileSize,
  isScorePdf,
  toNativePdfPageIndex,
} from '../reader-contract';

function file(overrides: Partial<RepertoireFile> = {}): RepertoireFile {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    song_id: '22222222-2222-4222-8222-222222222222',
    file_name: 'nota.pdf',
    file_type: 'sheet',
    partition_label: null,
    drive_file_id: 'provider-id',
    drive_web_view_link: null,
    drive_download_link: null,
    mime_type: 'application/pdf',
    file_size_bytes: 10,
    uploaded_by: null,
    created_at: '2026-09-08T00:00:00Z',
    updated_at: '2026-09-08T00:00:00Z',
    ...overrides,
  };
}

describe('native score contract', () => {
  it('selects only sheet PDFs and rejects covers/provider metadata shortcuts', () => {
    expect(isScorePdf(file())).toBe(true);
    expect(isScorePdf(file({ mime_type: null, file_name: 'NOTA.PDF' }))).toBe(true);
    expect(isScorePdf(file({ file_type: 'other' }))).toBe(false);
    expect(isScorePdf(file({ partition_label: '__cover__', file_type: 'sheet' }))).toBe(false);
    expect(isScorePdf(file({ mime_type: 'image/png', file_name: 'nota.png' }))).toBe(false);
    const newer = file({ id: '33333333-3333-4333-8333-333333333333', created_at: '2026-09-09T00:00:00Z' });
    expect(getScorePdfFiles([file(), newer]).map((item) => item.id)).toEqual([newer.id, file().id]);
  });

  it('owns the exact one-based to zero-based boundary and a three-page window', () => {
    expect(toNativePdfPageIndex(1)).toBe(0);
    expect(toNativePdfPageIndex(40)).toBe(39);
    expect(() => toNativePdfPageIndex(0)).toThrow('geçersiz');
    expect(() => toNativePdfPageIndex(1.5)).toThrow('geçersiz');
    expect(getRenderWindowPages(1, 40)).toEqual([1, 2]);
    expect(getRenderWindowPages(20, 40)).toEqual([19, 20, 21]);
    expect(getRenderWindowPages(40, 40)).toEqual([39, 40]);
  });

  it('recognizes PDF magic without loading an entire large file', () => {
    expect(hasPdfHeader(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(true);
    expect(hasPdfHeader(new Uint8Array())).toBe(false);
    expect(hasPdfHeader(new TextEncoder().encode('<html>'))).toBe(false);
  });

  it('makes empty and oversized score files explicit', () => {
    expect(() => assertAllowedScoreFileSize(0)).toThrow('boş veya eksik');
    expect(() => assertAllowedScoreFileSize(100 * 1024 * 1024 + 1)).toThrow('100 MB');
    expect(() => assertAllowedScoreFileSize(null)).not.toThrow();
  });
});
