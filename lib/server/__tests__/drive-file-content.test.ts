import { describe, expect, it } from 'vitest';

import {
  hasActiveContentFileExtension,
  isActiveContentMimeType,
  isActiveDriveFileContent,
  normalizeMimeType,
} from '@/lib/server/drive-file-content';

describe('drive file active-content policy', () => {
  it('normalizes MIME parameters before checking them', () => {
    expect(normalizeMimeType(' Text/HTML; charset=utf-8 ')).toBe('text/html');
    expect(normalizeMimeType(null)).toBe('');
  });

  it.each([
    'text/html',
    'application/xhtml+xml',
    'image/svg+xml',
    'application/javascript',
    'application/custom+xml',
  ])('rejects active MIME type %s', (mimeType) => {
    expect(isActiveContentMimeType(mimeType)).toBe(true);
  });

  it.each(['deneme.html', 'deneme.svg?download=1', 'deneme.XML#preview', 'script.mjs'])
  ('rejects active file extension %s', (fileName) => {
    expect(hasActiveContentFileExtension(fileName)).toBe(true);
  });

  it('allows ordinary document and media formats', () => {
    expect(isActiveDriveFileContent({ fileName: 'partisyon.pdf', mimeType: 'application/pdf' })).toBe(false);
    expect(isActiveDriveFileContent({ fileName: 'prova.mp3', mimeType: 'audio/mpeg' })).toBe(false);
  });

  it('fails closed when either the trusted MIME or file name is active content', () => {
    expect(isActiveDriveFileContent({ fileName: 'partisyon.pdf', mimeType: 'text/html' })).toBe(true);
    expect(isActiveDriveFileContent({ fileName: 'zararsiz.svg', mimeType: 'application/octet-stream' })).toBe(true);
  });
});
