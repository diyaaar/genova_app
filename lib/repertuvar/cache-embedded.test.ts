import { describe, expect, it } from 'vitest';

import { activateEmbeddedRuntime } from '@/lib/embedded-web-runtime';
import { readRepertoireCatalogCache, writeRepertoireCatalogCache } from '@/lib/repertuvar/cache';
import type { RepertoireCatalogData } from '@/lib/repertuvar/catalog-core';

const catalog: RepertoireCatalogData = {
  version: 1,
  versionUpdatedAt: null,
  cachedAt: 1,
  songs: [],
  tags: [],
  userParts: {},
  assignedSongIds: [],
};

describe('embedded repertoire metadata isolation', () => {
  it('refuses persistent catalog reads and writes after embedded mode is detected', () => {
    writeRepertoireCatalogCache('member:chorist', catalog);
    expect(readRepertoireCatalogCache('member:chorist')).toEqual(catalog);

    activateEmbeddedRuntime();
    writeRepertoireCatalogCache('other:chorist', catalog);

    expect(readRepertoireCatalogCache('member:chorist')).toBeNull();
    expect(window.localStorage.getItem('genova.repertoire.catalog.v2:other:chorist')).toBeNull();
  });
});
