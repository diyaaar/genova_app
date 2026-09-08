import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseRepertoireSource } from '../supabase-source';

function response(data: unknown, error: { message: string } | null = null) {
  return Promise.resolve({ data, error });
}

function clientWith(responses: Record<string, { data: unknown; error: { message: string } | null }>) {
  const from = jest.fn((table: string) => ({
    select: jest.fn(() => ({
      eq: jest.fn((_column: string, _value: string) => {
        if (table === 'repertoire_cache_versions') {
          return { maybeSingle: jest.fn(() => response(responses[table]?.data, responses[table]?.error ?? null)) };
        }
        return response(responses[table]?.data, responses[table]?.error ?? null);
      }),
      order: jest.fn(() => response(responses[table]?.data, responses[table]?.error ?? null)),
    })),
  }));
  return { client: { from } as unknown as SupabaseClient, from };
}

describe('Supabase repertoire source', () => {
  it('maps nested roles and each catalogue table without a client-supplied choir filter', async () => {
    const { client, from } = clientWith({
      choir_member_roles: { data: [{ roles: { name: 'Şef' } }, { roles: [{ name: 'Korist' }] }], error: null },
      repertoire_cache_versions: { data: { version: 7, updated_at: null }, error: null },
      repertoire: { data: [{ id: 'song-a' }], error: null },
      repertoire_tags: { data: [{ id: 'tag-a' }], error: null },
      song_assignments: { data: [{ song_id: 'song-a', part_name: 'Alto' }], error: null },
    });
    const source = createSupabaseRepertoireSource(client);

    await expect(source.loadRoleNames('member-a')).resolves.toEqual(['Şef', 'Korist']);
    await expect(source.loadVersion()).resolves.toEqual({ version: 7, updated_at: null });
    await expect(source.loadSongs()).resolves.toEqual([{ id: 'song-a' }]);
    await expect(source.loadTags()).resolves.toEqual([{ id: 'tag-a' }]);
    await expect(source.loadAssignments('member-a')).resolves.toEqual([{ song_id: 'song-a', part_name: 'Alto' }]);
    expect(from).toHaveBeenCalledWith('repertoire');
  });

  it('keeps the web-compatible optional version/tag fallback but fails required song reads', async () => {
    const { client } = clientWith({
      repertoire_cache_versions: { data: null, error: { message: 'missing version table' } },
      repertoire_tags: { data: null, error: { message: 'tag read failed' } },
      repertoire: { data: null, error: { message: 'catalogue denied' } },
    });
    const source = createSupabaseRepertoireSource(client);

    await expect(source.loadVersion()).resolves.toBeNull();
    await expect(source.loadTags()).resolves.toEqual([]);
    await expect(source.loadSongs()).rejects.toThrow('catalogue denied');
  });
});
