import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildOfflineSongVersion,
  buildRuntimeDriveFileVersion,
  clearProtectedDriveFileCaches,
  getOfflineDriveFileUrl,
  getOfflineSongSettings,
  markOfflineSongSynced,
  setOfflineSongEnabled,
} from '@/lib/repertuvar/offline';

describe('repertoire offline state', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps song settings and version information locally', () => {
    setOfflineSongEnabled('song-1', true);
    markOfflineSongSynced('song-1', 'v2', 1_725_000_000_000);

    expect(getOfflineSongSettings('song-1')).toEqual({
      enabled: true,
      version: 'v2',
      lastSyncedAt: 1_725_000_000_000,
    });
  });

  it('generates stable, order-independent file versions and safe offline URLs', () => {
    const files = [
      { drive_file_id: 'b', updated_at: '2026-01-02', file_size_bytes: 2, file_name: 'B.pdf', mime_type: 'application/pdf' },
      { drive_file_id: 'a', updated_at: '2026-01-01', file_size_bytes: 1, file_name: 'A.pdf', mime_type: 'application/pdf' },
    ];

    expect(buildOfflineSongVersion(files)).toBe(buildOfflineSongVersion([...files].reverse()));
    expect(buildRuntimeDriveFileVersion(files[0])).toContain('b|2026-01-02|2|B.pdf|application/pdf');
    expect(getOfflineDriveFileUrl({ drive_file_id: 'a b' }, 'v 2')).toBe('/offline-drive/a%20b?v=v%202');
    expect(getOfflineDriveFileUrl(null)).toBeNull();
  });

  it('removes every protected cache and local sync state during sign-out fallback', async () => {
    const cacheDelete = vi.fn().mockResolvedValue(true);
    Object.defineProperty(window, 'caches', { configurable: true, value: { delete: cacheDelete } });
    markOfflineSongSynced('song-1', 'v2');

    const result = await clearProtectedDriveFileCaches();

    expect(result).toEqual({ removedCount: 4 });
    expect(cacheDelete).toHaveBeenCalledTimes(4);
    expect(getOfflineSongSettings('song-1')).toEqual({ enabled: false, version: null, lastSyncedAt: null });
  });
});
