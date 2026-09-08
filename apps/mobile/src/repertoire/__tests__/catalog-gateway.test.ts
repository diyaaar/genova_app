import type { RepertoireSongRow, RepertoireTag } from '@shared/repertuvar/catalog-core';
import {
  createNativeRepertoireGateway,
  type RepertoireCatalogSource,
} from '../catalog-gateway';
import { clearTenantCaches, resetTenantCacheRegistry } from '../../auth/tenant-cache';
import { registerRepertoireGatewayCache } from '../cache-registration';

const tag: RepertoireTag = {
  id: 'tag-a',
  name: 'Konser',
  color: null,
  created_by: null,
  created_at: '2026-09-08T00:00:00Z',
};

const song: RepertoireSongRow = {
  id: 'song-a',
  title: 'Mavi Nota',
  composer: null,
  drive_folder_id: 'folder-a',
  is_visible: true,
  created_at: '2026-09-08T00:00:00Z',
  repertoire_files: [],
  repertoire_song_tags: [{ tag_id: tag.id, repertoire_tags: tag }],
};

function makeSource(overrides: Partial<RepertoireCatalogSource> = {}) {
  const source: RepertoireCatalogSource = {
    loadRoleNames: jest.fn(async () => ['Korist']),
    loadVersion: jest.fn(async () => ({ version: '4', updated_at: '2026-09-08T00:00:00Z' })),
    loadSongs: jest.fn(async () => [song]),
    loadTags: jest.fn(async () => [tag]),
    loadAssignments: jest.fn(async () => [
      { song_id: 'song-a', part_name: 'Alto' },
      { song_id: 'song-a', part_name: 'Alto' },
    ]),
    ...overrides,
  };
  return source;
}

describe('native repertoire gateway', () => {
  beforeEach(() => resetTenantCacheRegistry());
  it('maps roles, normalized joins, parts and a tenant-specific scope', async () => {
    const source = makeSource();
    const gateway = createNativeRepertoireGateway(source, () => 1234);

    const result = await gateway.load({ choirId: 'choir-a', memberId: 'member-a' });

    expect(result.roleScope).toBe('chorist');
    expect(result.scopeKey).toBe('choir-a:member-a:chorist');
    expect(result.version).toBe(4);
    expect(result.cachedAt).toBe(1234);
    expect(result.songs[0]?.tags?.[0]?.name).toBe('Konser');
    expect(result.userParts).toEqual({ 'song-a': 'Alto' });
    expect(result.assignedSongIds).toEqual(['song-a']);
  });

  it('uses a cache hit, supports forced refresh and separates choir keys', async () => {
    const source = makeSource();
    const gateway = createNativeRepertoireGateway(source);

    await gateway.load({ choirId: 'choir-a', memberId: 'member-a' });
    await gateway.load({ choirId: 'choir-a', memberId: 'member-a' });
    expect(source.loadSongs).toHaveBeenCalledTimes(1);

    await gateway.load({ choirId: 'choir-a', memberId: 'member-a', force: true });
    expect(source.loadSongs).toHaveBeenCalledTimes(2);

    await gateway.load({ choirId: 'choir-b', memberId: 'member-a' });
    expect(source.loadSongs).toHaveBeenCalledTimes(3);
  });

  it('reloads cached metadata when the server catalogue version changes', async () => {
    let version = 1;
    const source = makeSource({
      loadVersion: jest.fn(async () => ({ version, updated_at: null })),
    });
    const gateway = createNativeRepertoireGateway(source);

    await gateway.load({ choirId: 'choir-a', memberId: 'member-a' });
    version = 2;
    const refreshed = await gateway.load({ choirId: 'choir-a', memberId: 'member-a' });

    expect(source.loadSongs).toHaveBeenCalledTimes(2);
    expect(refreshed.version).toBe(2);
  });

  it('does not reuse a cache entry after the member role scope changes', async () => {
    let roles = ['Korist'];
    const source = makeSource({
      loadRoleNames: jest.fn(async () => roles),
    });
    const gateway = createNativeRepertoireGateway(source);

    const chorist = await gateway.load({ choirId: 'choir-a', memberId: 'member-a' });
    roles = ['Şef'];
    const chef = await gateway.load({ choirId: 'choir-a', memberId: 'member-a' });

    expect(chorist.scopeKey).toBe('choir-a:member-a:chorist');
    expect(chef.scopeKey).toBe('choir-a:member-a:chef');
    expect(source.loadSongs).toHaveBeenCalledTimes(2);
  });

  it('clears every cached tenant and never turns a source failure into stale data', async () => {
    let rejects = false;
    const source = makeSource({
      loadSongs: jest.fn(async () => {
        if (rejects) throw new Error('network down');
        return [song];
      }),
    });
    const gateway = createNativeRepertoireGateway(source);

    await gateway.load({ choirId: 'choir-a', memberId: 'member-a' });
    gateway.clear();
    rejects = true;

    await expect(gateway.load({ choirId: 'choir-a', memberId: 'member-a' }))
      .rejects.toThrow('network down');
  });

  it('drops catalogue rows without a usable folder like the web query', async () => {
    const source = makeSource({
      loadSongs: jest.fn(async () => [{ ...song, drive_folder_id: null }]),
      loadVersion: jest.fn(async () => ({ version: 'not-a-number', updated_at: null })),
    });
    const result = await createNativeRepertoireGateway(source)
      .load({ choirId: 'choir-a', memberId: 'member-a' });

    expect(result.songs).toEqual([]);
    expect(result.version).toBeNull();
  });

  it('clears a process-owned gateway through the auth tenant boundary', async () => {
    const prepared = createNativeRepertoireGateway(makeSource());
    const clear = jest.spyOn(prepared, 'clear');
    registerRepertoireGatewayCache(prepared);

    await clearTenantCaches();

    expect(clear).toHaveBeenCalledTimes(1);
  });
});
