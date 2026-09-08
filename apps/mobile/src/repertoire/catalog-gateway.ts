import {
  getRepertoireCatalogTenantScope,
  getRepertoireRoleScopeFromNames,
  normalizeRepertoireSongs,
  type RepertoireCatalogData,
  type RepertoireRoleScope,
  type RepertoireSongRow,
  type RepertoireTag,
} from '@shared/repertuvar/catalog-core';

export interface RepertoireAssignmentRow {
  song_id: string;
  part_name: string | null;
}

export interface RepertoireVersionRow {
  version: number | string;
  updated_at: string | null;
}

/** Structural read surface so catalogue behavior is testable without Supabase or a network. */
export interface RepertoireCatalogSource {
  loadRoleNames(memberId: string): Promise<string[]>;
  loadVersion(): Promise<RepertoireVersionRow | null>;
  loadSongs(): Promise<RepertoireSongRow[]>;
  loadTags(): Promise<RepertoireTag[]>;
  loadAssignments(memberId: string): Promise<RepertoireAssignmentRow[]>;
}

export interface NativeRepertoireCatalog extends RepertoireCatalogData {
  roleScope: RepertoireRoleScope;
  scopeKey: string;
}

export interface LoadNativeCatalogueInput {
  choirId: string;
  memberId: string;
  force?: boolean;
}

export interface NativeRepertoireGateway {
  load(input: LoadNativeCatalogueInput): Promise<NativeRepertoireCatalog>;
  clear(): void;
}

function parseVersion(row: RepertoireVersionRow | null) {
  const value = typeof row?.version === 'string' ? Number(row.version) : row?.version;
  return Number.isFinite(value) ? value as number : null;
}

export function createNativeRepertoireGateway(
  source: RepertoireCatalogSource,
  now: () => number = Date.now,
): NativeRepertoireGateway {
  const cache = new Map<string, NativeRepertoireCatalog>();

  return {
    async load({ choirId, memberId, force = false }) {
      const [roleNames, versionRow] = await Promise.all([
        source.loadRoleNames(memberId),
        source.loadVersion(),
      ]);
      const roleScope = getRepertoireRoleScopeFromNames(roleNames);
      const scopeKey = getRepertoireCatalogTenantScope(choirId, memberId, roleScope);
      const serverVersion = parseVersion(versionRow);
      if (!force) {
        const cached = cache.get(scopeKey);
        if (cached && serverVersion !== null && cached.version === serverVersion) return cached;
      }

      const [songRows, tags, assignments] = await Promise.all([
        source.loadSongs(),
        source.loadTags(),
        source.loadAssignments(memberId),
      ]);
      const userParts: Record<string, string> = {};
      for (const assignment of assignments) {
        if (assignment.part_name) userParts[assignment.song_id] = assignment.part_name;
      }

      const catalogue: NativeRepertoireCatalog = {
        version: serverVersion,
        versionUpdatedAt: versionRow?.updated_at ?? null,
        cachedAt: now(),
        songs: normalizeRepertoireSongs(songRows).filter((song) => Boolean(song.drive_folder_id)),
        tags,
        userParts,
        assignedSongIds: Array.from(new Set(assignments.map((row) => row.song_id))),
        roleScope,
        scopeKey,
      };
      cache.set(scopeKey, catalogue);
      return catalogue;
    },
    clear() {
      cache.clear();
    },
  };
}
