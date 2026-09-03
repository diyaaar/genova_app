import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearRepertoireMetadataCaches,
  getRepertoireCatalogCacheScope,
  getRepertoireRoleScope,
  readRepertoireCatalogCache,
  updateRepertoireCatalogCache,
  writeRepertoireCatalogCache,
  type RepertoireCatalogData,
} from '@/lib/repertuvar/cache';

const catalog: RepertoireCatalogData = {
  version: 4,
  versionUpdatedAt: '2026-02-01T00:00:00.000Z',
  cachedAt: 1_725_000_000_000,
  songs: [],
  tags: [],
  userParts: {},
  assignedSongIds: [],
};

describe('repertoire catalog cache', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('derives privilege-aware, member-scoped cache keys', () => {
    expect(getRepertoireRoleScope(true, false)).toBe('chef');
    expect(getRepertoireRoleScope(false, true)).toBe('leader');
    expect(getRepertoireRoleScope(false, false)).toBe('chorist');
    expect(getRepertoireCatalogCacheScope('member-1', 'leader')).toBe('member-1:leader');
    expect(getRepertoireCatalogCacheScope(null, 'chorist')).toBe('anonymous:chorist');
  });

  it('round-trips only structurally valid catalog data', () => {
    writeRepertoireCatalogCache('member-1:chorist', catalog);
    expect(readRepertoireCatalogCache('member-1:chorist')).toEqual(catalog);

    window.localStorage.setItem('genova.repertoire.catalog.v2:bad', JSON.stringify({ songs: 'not-an-array' }));
    expect(readRepertoireCatalogCache('bad')).toBeNull();
  });

  it('updates a cached catalog atomically through its updater', () => {
    writeRepertoireCatalogCache('member-1:chorist', catalog);
    const result = updateRepertoireCatalogCache('member-1:chorist', (current) => ({
      ...current!,
      version: 5,
      assignedSongIds: ['song-1'],
    }));

    expect(result?.version).toBe(5);
    expect(readRepertoireCatalogCache('member-1:chorist')?.assignedSongIds).toEqual(['song-1']);
  });

  it('clears current and legacy repertoire metadata without touching unrelated data', () => {
    writeRepertoireCatalogCache('member-1:chorist', catalog);
    window.localStorage.setItem('genova.repertoire.catalog.v1:member-1', JSON.stringify(catalog));
    window.localStorage.setItem('unrelated', 'keep');

    clearRepertoireMetadataCaches();

    expect(readRepertoireCatalogCache('member-1:chorist')).toBeNull();
    expect(window.localStorage.getItem('genova.repertoire.catalog.v1:member-1')).toBeNull();
    expect(window.localStorage.getItem('unrelated')).toBe('keep');
  });
});
