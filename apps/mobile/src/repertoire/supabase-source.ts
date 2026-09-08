import type { SupabaseClient } from '@supabase/supabase-js';
import type { RepertoireSongRow, RepertoireTag } from '@shared/repertuvar/catalog-core';
import type {
  RepertoireAssignmentRow,
  RepertoireCatalogSource,
  RepertoireVersionRow,
} from './catalog-gateway';

function requireData<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('Repertuvar yanıtı boş döndü.');
  return data;
}

export function createSupabaseRepertoireSource(client: SupabaseClient): RepertoireCatalogSource {
  return {
    async loadRoleNames(memberId) {
      const { data, error } = await client
        .from('choir_member_roles')
        .select('roles(name)')
        .eq('member_id', memberId);
      const rows = requireData(data, error) as Array<{
        roles?: { name?: string } | Array<{ name?: string }> | null;
      }>;
      return rows.flatMap((row) => {
        const roles = Array.isArray(row.roles) ? row.roles : row.roles ? [row.roles] : [];
        return roles.flatMap((role) => typeof role.name === 'string' ? [role.name] : []);
      });
    },
    async loadVersion() {
      const { data, error } = await client
        .from('repertoire_cache_versions')
        .select('version, updated_at')
        .eq('scope', 'catalog')
        .maybeSingle();
      if (error) return null;
      return data as RepertoireVersionRow | null;
    },
    async loadSongs() {
      const { data, error } = await client
        .from('repertoire')
        .select(`
          id, title, composer, drive_folder_id, is_visible, created_at,
          repertoire_files (
            id, song_id, file_name, file_type, partition_label, drive_file_id,
            drive_web_view_link, drive_download_link, mime_type, file_size_bytes,
            created_at, updated_at, uploaded_by
          ),
          repertoire_song_tags (
            tag_id,
            repertoire_tags ( id, name, color, created_by, created_at )
          )
        `)
        .order('title');
      return requireData(data, error) as unknown as RepertoireSongRow[];
    },
    async loadTags() {
      const { data, error } = await client
        .from('repertoire_tags')
        .select('id, name, color, created_by, created_at')
        .order('created_at');
      if (error) return [];
      return (data ?? []) as RepertoireTag[];
    },
    async loadAssignments(memberId) {
      const { data, error } = await client
        .from('song_assignments')
        .select('song_id, part_name')
        .eq('member_id', memberId);
      return requireData(data, error) as RepertoireAssignmentRow[];
    },
  };
}
