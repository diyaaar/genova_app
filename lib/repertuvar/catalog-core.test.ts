import { describe, expect, it } from 'vitest';
import {
  filterRepertoireCatalogSongs,
  getRepertoireCatalogTenantScope,
  getRepertoireRoleScopeFromNames,
  normalizeRepertoireSong,
  isRepertoireSongReady,
  type RepertoireFile,
  type RepertoireSong,
  type RepertoireTag,
} from '@/lib/repertuvar/catalog-core';

const tag = (id: string, name: string): RepertoireTag => ({
  id,
  name,
  color: null,
  created_by: null,
  created_at: '2026-09-08T00:00:00Z',
});

const file = (id: string): RepertoireFile => ({
  id,
  song_id: 'song-a',
  file_name: `${id}.pdf`,
  file_type: 'sheet',
  partition_label: null,
  drive_file_id: `drive-${id}`,
  drive_web_view_link: null,
  drive_download_link: null,
  mime_type: 'application/pdf',
  file_size_bytes: 100,
  uploaded_by: null,
  created_at: '2026-09-08T00:00:00Z',
  updated_at: '2026-09-08T00:00:00Z',
});

const song = (overrides: Partial<RepertoireSong> = {}): RepertoireSong => ({
  id: 'song-a',
  title: 'Mavi Nota',
  composer: 'Ada Besteci',
  drive_folder_id: 'folder-a',
  is_visible: true,
  created_at: '2026-09-08T00:00:00Z',
  files: [file('file-a')],
  tags: [tag('tag-a', 'Konser')],
  ...overrides,
});

describe('repertoire catalogue core', () => {
  it('shows legacy and R2-only songs but hides empty unprovisioned songs', () => {
    expect(isRepertoireSongReady(song({ files: [] }))).toBe(true);
    expect(isRepertoireSongReady(song({ drive_folder_id: null }))).toBe(true);
    expect(isRepertoireSongReady(song({ drive_folder_id: null, files: [] }))).toBe(false);
    expect(isRepertoireSongReady(song({ drive_folder_id: null, files: undefined }))).toBe(false);
  });
  it('normalizes Supabase joins without keeping transport-only fields as the public source', () => {
    const normalized = normalizeRepertoireSong({
      ...song({ files: undefined, tags: undefined }),
      repertoire_files: [file('joined')],
      repertoire_song_tags: [
        { tag_id: 'tag-a', repertoire_tags: tag('tag-a', 'Konser') },
        { tag_id: 'tag-b', repertoire_tags: [tag('tag-b', 'Yeni')] },
        { tag_id: 'missing', repertoire_tags: null },
      ],
    });

    expect(normalized.files?.map((item) => item.id)).toEqual(['joined']);
    expect(normalized.tags?.map((item) => item.name)).toEqual(['Konser', 'Yeni']);
    expect(normalized).not.toHaveProperty('repertoire_files');
    expect(normalized).not.toHaveProperty('repertoire_song_tags');
  });

  it('resolves Turkish role names without changing the chef-before-leader precedence', () => {
    expect(getRepertoireRoleScopeFromNames(['Korist'])).toBe('chorist');
    expect(getRepertoireRoleScopeFromNames(['Partisyon Şefi'])).toBe('leader');
    expect(getRepertoireRoleScopeFromNames(['Partisyon Şefi', 'Şef'])).toBe('chef');
  });

  it('keeps chorists on visible assigned rows while privileged scopes keep RLS-returned rows', () => {
    const songs = [
      song(),
      song({ id: 'song-b', title: 'Gizli', is_visible: false }),
      song({ id: 'song-c', title: 'Atanmamış' }),
    ];

    expect(filterRepertoireCatalogSongs({
      songs,
      assignedSongIds: ['song-a', 'song-b'],
      roleScope: 'chorist',
    }).map((item) => item.id)).toEqual(['song-a']);

    expect(filterRepertoireCatalogSongs({
      songs,
      assignedSongIds: [],
      roleScope: 'leader',
    }).map((item) => item.id)).toEqual(['song-a', 'song-b', 'song-c']);
  });

  it('applies search and tag as narrowing presentation filters', () => {
    const songs = [
      song(),
      song({ id: 'song-b', title: 'Kırmızı', composer: 'Başka', tags: [tag('tag-b', 'Prova')] }),
    ];

    expect(filterRepertoireCatalogSongs({
      songs,
      assignedSongIds: ['song-a', 'song-b'],
      roleScope: 'chorist',
      search: 'ada',
      tag: 'Konser',
    }).map((item) => item.id)).toEqual(['song-a']);
  });

  it('separates cache identities by choir, member and role scope', () => {
    expect(getRepertoireCatalogTenantScope('choir-a', 'member-a', 'chorist')).not.toBe(
      getRepertoireCatalogTenantScope('choir-b', 'member-a', 'chorist'),
    );
    expect(getRepertoireCatalogTenantScope('choir-a', 'member-a', 'chorist')).not.toBe(
      getRepertoireCatalogTenantScope('choir-a', 'member-a', 'chef'),
    );
  });
});
