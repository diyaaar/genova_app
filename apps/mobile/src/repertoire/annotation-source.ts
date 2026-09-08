import type { SupabaseClient } from '@supabase/supabase-js';
import {
  makeLayerPageKey,
  parseAnnotationSchemaPayload,
  asVoiceGroup,
  type AnnotationLayerKey,
} from '@shared/repertuvar/annotation-types';
import type { NativeAnnotationReadResult } from './reader-contract';

interface AnnotationRow {
  repertoire_file_id: string;
  page_number: number;
  layer_type: 'personal' | 'shared_voice_group' | 'shared_all';
  target_voice_group: string | null;
  annotations_json: unknown;
  schema_version: number;
}

export interface NativeAnnotationSource {
  load(fileId: string): Promise<NativeAnnotationReadResult>;
}

function layerKeyFor(row: AnnotationRow): AnnotationLayerKey | null {
  if (row.layer_type === 'personal') return 'personal';
  if (row.layer_type === 'shared_all') return 'shared_all';
  const voiceGroup = asVoiceGroup(row.target_voice_group);
  return voiceGroup ? `shared_voice_group:${voiceGroup}` : null;
}

export function createSupabaseAnnotationSource(client: SupabaseClient): NativeAnnotationSource {
  return {
    async load(fileId) {
      // The repository file id narrows the read; existing RLS remains the authorization boundary.
      const { data, error } = await client
        .from('repertoire_pdf_annotations')
        .select('repertoire_file_id, page_number, layer_type, target_voice_group, annotations_json, schema_version, updated_at')
        .eq('repertoire_file_id', fileId)
        .order('page_number', { ascending: true })
        .order('updated_at', { ascending: true });
      if (error) throw new Error(error.message || 'PDF notları yüklenemedi.');

      const byPage: NativeAnnotationReadResult['byPage'] = {};
      let skippedCount = 0;
      for (const row of (data ?? []) as AnnotationRow[]) {
        const key = layerKeyFor(row);
        if (!key || !Number.isInteger(row.page_number) || row.page_number < 1) {
          skippedCount += 1;
          continue;
        }
        // Build the same key as web as an assertion against accidental cross-file grouping.
        makeLayerPageKey({ fileId: row.repertoire_file_id, pageNumber: row.page_number, layerKey: key });
        const parsed = parseAnnotationSchemaPayload(row.annotations_json, row.schema_version);
        skippedCount += parsed.skippedCount;
        const layers = byPage[row.page_number] ?? [];
        layers.push({ layerKey: key, items: parsed.items });
        byPage[row.page_number] = layers;
      }
      return { byPage, skippedCount };
    },
  };
}
