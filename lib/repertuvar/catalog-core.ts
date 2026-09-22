/**
 * Platform-free repertoire catalogue contract shared by web and React Native.
 *
 * This module must not import an initialized client, browser storage, React, Next.js,
 * or React Native. RLS remains the authorization boundary; the filters here only keep
 * both clients' presentation behavior aligned.
 */

export type FileType = 'sheet' | 'midi' | 'audio' | 'other';
export type RepertoireRoleScope = 'chef' | 'leader' | 'chorist';

export interface RepertoireFile {
  id: string;
  song_id: string;
  file_name: string;
  file_type: FileType;
  partition_label: string | null;
  drive_file_id: string;
  drive_web_view_link: string | null;
  drive_download_link: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepertoireTag {
  id: string;
  name: string;
  color: string | null;
  created_by: string | null;
  created_at: string;
}

export interface RepertoireSong {
  id: string;
  title: string;
  composer: string | null;
  drive_folder_id: string | null;
  is_visible: boolean;
  created_at: string;
  files?: RepertoireFile[];
  tags?: RepertoireTag[];
  assigned?: boolean;
}

export interface RepertoireSongRow extends RepertoireSong {
  repertoire_files?: RepertoireFile[] | null;
  repertoire_song_tags?: Array<{
    tag_id: string;
    repertoire_tags?: RepertoireTag | RepertoireTag[] | null;
  }> | null;
}

export interface RepertoireCatalogData {
  version: number | null;
  versionUpdatedAt: string | null;
  cachedAt: number;
  songs: RepertoireSong[];
  tags: RepertoireTag[];
  userParts: Record<string, string>;
  assignedSongIds: string[];
}

export interface RepertoireCatalogViewInput {
  songs: RepertoireSong[];
  assignedSongIds: Iterable<string>;
  roleScope: RepertoireRoleScope;
  search?: string;
  tag?: string | null;
}

export function normalizeRepertoireSong(song: RepertoireSongRow): RepertoireSong {
  const { repertoire_files: joinedFiles, repertoire_song_tags: joinedTags, ...catalogueSong } = song;
  const tagsFromJoin = (joinedTags ?? [])
    .map((row) => {
      if (!row?.repertoire_tags) return null;
      return Array.isArray(row.repertoire_tags)
        ? row.repertoire_tags[0] ?? null
        : row.repertoire_tags;
    })
    .filter((tag): tag is RepertoireTag => Boolean(tag));

  return {
    ...catalogueSong,
    files: Array.isArray(song.files)
      ? song.files
      : Array.isArray(joinedFiles)
        ? joinedFiles
        : [],
    tags: Array.isArray(song.tags) ? song.tags : tagsFromJoin,
  };
}

export function normalizeRepertoireSongs(
  songs: RepertoireSongRow[] | null | undefined,
): RepertoireSong[] {
  return (songs ?? []).map(normalizeRepertoireSong);
}

/** Only inspect rows already authorized by RLS; private provider mappings stay on the server. */
export function isRepertoireSongReady(song: RepertoireSong): boolean {
  return Boolean(song.drive_folder_id) || (song.files?.length ?? 0) > 0;
}

export function normalizeRepertoireRoleName(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ş/gi, 's')
    .replace(/ı/gi, 'i')
    .toLocaleLowerCase('tr-TR')
    .trim();
}

export function getRepertoireRoleScope(isChef: boolean, isSectionLeader: boolean): RepertoireRoleScope {
  if (isChef) return 'chef';
  if (isSectionLeader) return 'leader';
  return 'chorist';
}

export function getRepertoireRoleScopeFromNames(roleNames: Iterable<string>): RepertoireRoleScope {
  const normalized = new Set(Array.from(roleNames, normalizeRepertoireRoleName));
  return getRepertoireRoleScope(normalized.has('sef'), normalized.has('partisyon sefi'));
}

export function getRepertoireCatalogTenantScope(
  choirId: string,
  memberId: string,
  roleScope: RepertoireRoleScope,
): string {
  return `${choirId}:${memberId}:${roleScope}`;
}

/** Presentation filter only. It cannot grant access to rows RLS did not return. */
export function filterRepertoireCatalogSongs({
  songs,
  assignedSongIds,
  roleScope,
  search = '',
  tag = null,
}: RepertoireCatalogViewInput): RepertoireSong[] {
  const assigned = assignedSongIds instanceof Set
    ? assignedSongIds
    : new Set(assignedSongIds);
  const normalizedSearch = search.trim().toLocaleLowerCase('tr-TR');

  return songs.filter((song) => {
    if (roleScope === 'chorist' && (!song.is_visible || !assigned.has(song.id))) {
      return false;
    }

    if (tag && !(song.tags ?? []).some((item) => item.name === tag)) {
      return false;
    }

    if (!normalizedSearch) return true;
    return [song.title, song.composer ?? '', ...(song.tags ?? []).map((item) => item.name)]
      .some((value) => value.toLocaleLowerCase('tr-TR').includes(normalizedSearch));
  });
}
