import { describe, expect, it } from 'vitest';

import {
  buildStableSlugEntries,
  createSlugLookup,
  getAssignmentPath,
  getLastPageLabel,
  getRepertoirePath,
  isUuidLike,
  normalizeInternalPath,
  slugifyPathSegment,
} from '@/lib/internalPageLinks';

describe('internal page links', () => {
  it('creates URL-safe Turkish slugs and a fallback', () => {
    expect(slugifyPathSegment('  Şu Çılgın Türküler!  ')).toBe('su-cilgin-turkuler');
    expect(slugifyPathSegment('***', 'sarki')).toBe('sarki');
  });

  it('accepts only normalized same-origin paths', () => {
    expect(normalizeInternalPath('/Repertuvar//ŞARKI?tab=nota')).toBeNull();
    expect(normalizeInternalPath('/Repertuvar//sarki?tab=nota')).toBe('/repertuvar/sarki');
    expect(normalizeInternalPath('//evil.example/path')).toBeNull();
    expect(normalizeInternalPath('https://example.com')).toBeNull();
  });

  it('recognizes RFC-compatible UUID shapes', () => {
    expect(isUuidLike('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
    expect(isUuidLike('not-a-uuid')).toBe(false);
  });

  it('assigns deterministic suffixes to duplicate titles', () => {
    const items = [
      { id: 'b', title: 'Aynı Şarkı', created_at: '2026-02-01' },
      { id: 'a', title: 'Aynı Şarkı', created_at: '2026-01-01' },
      { id: 'c', title: 'Başka Şarkı', created_at: '2026-01-01' },
    ];

    expect(buildStableSlugEntries(items).map(({ item, slug }) => [item.id, slug])).toEqual([
      ['a', 'ayni-sarki'],
      ['b', 'ayni-sarki-2'],
      ['c', 'baska-sarki'],
    ]);
  });

  it('builds reversible lookup maps and route labels', () => {
    const item = { id: 'song-1', title: 'Güzel Günler' };
    const lookup = createSlugLookup([item]);

    expect(lookup.slugById.get(item.id)).toBe('guzel-gunler');
    expect(lookup.itemBySlug.get('guzel-gunler')).toBe(item);
    expect(getRepertoirePath(item, lookup.slugById)).toBe('/repertuvar/guzel-gunler');
    expect(getAssignmentPath({ id: 'a', title: null })).toBe('/odevler/odev');
    expect(getLastPageLabel('/repertuvar/guzel-gunler')).toBe('Guzel Gunler');
    expect(getLastPageLabel('/')).toBe('Ana Sayfa');
  });
});
