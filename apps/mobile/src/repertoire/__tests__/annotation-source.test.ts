import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseAnnotationSource } from '../annotation-source';

function clientWith(data: unknown, error: { message: string } | null = null) {
  const finalOrder = jest.fn(() => Promise.resolve({ data, error }));
  const firstOrder = jest.fn(() => ({ order: finalOrder }));
  const eq = jest.fn(() => ({ order: firstOrder }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  return { client: { from } as unknown as SupabaseClient, from, select, eq };
}

describe('read-only annotation source', () => {
  it('groups only RLS-returned schema-v1 rows and reports unknown, malformed and future content', async () => {
    const fileId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const { client, from, eq } = clientWith([
      {
        repertoire_file_id: fileId,
        page_number: 1,
        layer_type: 'personal',
        target_voice_group: null,
        schema_version: 1,
        annotations_json: [
          { id: 'known', type: 'text', color: 'red', position: { x: 0.5, y: 0.5 }, text: 'Dinamik', width: 0.2 },
          { id: 'unknown', type: 'ellipse', color: 'red' },
        ],
      },
      {
        repertoire_file_id: fileId,
        page_number: 2,
        layer_type: 'shared_all',
        target_voice_group: null,
        schema_version: 2,
        annotations_json: [{ id: 'future' }],
      },
      {
        repertoire_file_id: fileId,
        page_number: 3,
        layer_type: 'shared_voice_group',
        target_voice_group: 'not-a-voice',
        schema_version: 1,
        annotations_json: [],
      },
    ]);

    const result = await createSupabaseAnnotationSource(client).load(fileId);
    expect(from).toHaveBeenCalledWith('repertoire_pdf_annotations');
    expect(eq).toHaveBeenCalledWith('repertoire_file_id', fileId);
    expect(result.byPage[1]?.[0]?.items).toHaveLength(1);
    expect(result.byPage[2]?.[0]?.items).toEqual([]);
    expect(result.byPage[3]).toBeUndefined();
    expect(result.skippedCount).toBe(3);
  });

  it('surfaces Data API/RLS read failures and has no mutation method', async () => {
    const { client } = clientWith(null, { message: 'RLS denied' });
    const source = createSupabaseAnnotationSource(client);
    await expect(source.load('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')).rejects.toThrow('RLS denied');
    expect(Object.keys(source)).toEqual(['load']);
  });
});
