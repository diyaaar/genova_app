import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AnnotationItem } from '@/lib/repertuvar/annotation-types';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: mocks,
}));

import {
  loadAnnotationReadResultForFile,
  saveLayerSnapshotSafely,
} from '@/lib/repertuvar/annotations';

const validTextItem: AnnotationItem = {
  id: 'note-1',
  type: 'text',
  color: 'red',
  position: { x: 0.25, y: 0.5 },
  text: 'Nota',
  width: 0.4,
};

function annotationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    song_id: '22222222-2222-4222-8222-222222222222',
    repertoire_file_id: '33333333-3333-4333-8333-333333333333',
    page_number: 1,
    layer_type: 'personal',
    owner_member_id: '44444444-4444-4444-8444-444444444444',
    target_voice_group: null,
    annotations_json: [validTextItem],
    schema_version: 1,
    revision: 3,
    created_by: '44444444-4444-4444-8444-444444444444',
    updated_by: '44444444-4444-4444-8444-444444444444',
    created_at: '2026-09-09T20:00:00.000Z',
    updated_at: '2026-09-09T20:01:00.000Z',
    ...overrides,
  };
}

function mockAnnotationLoad(data: unknown[], error: unknown = null) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValueOnce(query).mockResolvedValueOnce({ data, error });
  mocks.from.mockReturnValue(query);
  return query;
}

describe('annotation read write-safety metadata', () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.rpc.mockReset();
  });

  it('exposes revision and a writable marker for an exact schema-v1 row', async () => {
    mockAnnotationLoad([annotationRow()]);

    const result = await loadAnnotationReadResultForFile('33333333-3333-4333-8333-333333333333');
    const contextKey = '33333333-3333-4333-8333-333333333333::1::personal';

    expect(result.layers[contextKey]).toEqual([validTextItem]);
    expect(result.writeMetadata[contextKey]).toEqual({
      rowId: '11111111-1111-4111-8111-111111111111',
      revision: 3,
      writableWithoutLoss: true,
    });
    expect(result).toMatchObject({ skippedCount: 0, blockedLayerCount: 0 });
  });

  it('keeps defensive display items but blocks mixed, future-field and invalid-revision rows', async () => {
    const mixed = annotationRow({
      annotations_json: [validTextItem, { id: 'future', type: 'ellipse', color: 'red' }],
    });
    const futureField = annotationRow({
      id: '55555555-5555-4555-8555-555555555555',
      page_number: 2,
      annotations_json: [{ ...validTextItem, futureField: true }],
    });
    const invalidRevision = annotationRow({
      id: '66666666-6666-4666-8666-666666666666',
      page_number: 3,
      revision: 0,
    });
    mockAnnotationLoad([mixed, futureField, invalidRevision]);

    const result = await loadAnnotationReadResultForFile('33333333-3333-4333-8333-333333333333');

    expect(result.layers['33333333-3333-4333-8333-333333333333::1::personal']).toEqual([validTextItem]);
    expect(result.writeMetadata['33333333-3333-4333-8333-333333333333::1::personal'].writableWithoutLoss).toBe(false);
    expect(result.writeMetadata['33333333-3333-4333-8333-333333333333::2::personal'].writableWithoutLoss).toBe(false);
    expect(result.writeMetadata['33333333-3333-4333-8333-333333333333::3::personal']).toMatchObject({
      revision: 0,
      writableWithoutLoss: false,
    });
    expect(result).toMatchObject({ skippedCount: 1, blockedLayerCount: 3 });
  });
});

describe('saveLayerSnapshotSafely', () => {
  beforeEach(() => {
    mocks.from.mockReset();
    mocks.rpc.mockReset();
  });

  it('sends only file/layer/content/revision inputs and parses the next revision', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        annotation_id: '77777777-7777-4777-8777-777777777777',
        next_revision: 4,
        deleted: false,
        updated_at: '2026-09-09T20:02:00.000Z',
      }],
      error: null,
    });

    await expect(saveLayerSnapshotSafely({
      repertoireFileId: '33333333-3333-4333-8333-333333333333',
      pageNumber: 1,
      layerKey: 'personal',
      annotations: [validTextItem],
      expectedRevision: 3,
      writableWithoutLoss: true,
    })).resolves.toEqual({
      rowId: '77777777-7777-4777-8777-777777777777',
      revision: 4,
      deleted: false,
      updatedAt: '2026-09-09T20:02:00.000Z',
    });

    expect(mocks.rpc).toHaveBeenCalledWith('save_repertoire_pdf_annotation_snapshot', {
      p_repertoire_file_id: '33333333-3333-4333-8333-333333333333',
      p_page_number: 1,
      p_layer_type: 'personal',
      p_target_voice_group: null,
      p_schema_version: 1,
      p_annotations_json: [validTextItem],
      p_expected_revision: 3,
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('returns a deleted result for exact-revision deletion', async () => {
    mocks.rpc.mockResolvedValue({
      data: [{
        annotation_id: '77777777-7777-4777-8777-777777777777',
        next_revision: null,
        deleted: true,
        updated_at: null,
      }],
      error: null,
    });

    await expect(saveLayerSnapshotSafely({
      repertoireFileId: '33333333-3333-4333-8333-333333333333',
      pageNumber: 1,
      layerKey: 'shared_voice_group:Alto',
      annotations: [],
      expectedRevision: 3,
      writableWithoutLoss: true,
    })).resolves.toEqual({
      rowId: '77777777-7777-4777-8777-777777777777',
      revision: null,
      deleted: true,
      updatedAt: null,
    });
  });

  it('refuses lossy or invalid local input before calling the RPC', async () => {
    await expect(saveLayerSnapshotSafely({
      repertoireFileId: '33333333-3333-4333-8333-333333333333',
      pageNumber: 1,
      layerKey: 'personal',
      annotations: [validTextItem],
      expectedRevision: 3,
      writableWithoutLoss: false,
    })).rejects.toThrow('kayıpsız düzenlenemiyor');

    await expect(saveLayerSnapshotSafely({
      repertoireFileId: '33333333-3333-4333-8333-333333333333',
      pageNumber: 1,
      layerKey: 'personal',
      annotations: [{ ...validTextItem, futureField: true } as AnnotationItem],
      expectedRevision: 3,
      writableWithoutLoss: true,
    })).rejects.toThrow('kayıpsız doğrulanamadı');

    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('maps stale conflicts and rejects malformed success payloads', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: '40001', message: 'ANNOTATION_CONFLICT: stale row' },
    });

    const input = {
      repertoireFileId: '33333333-3333-4333-8333-333333333333',
      pageNumber: 1,
      layerKey: 'personal' as const,
      annotations: [validTextItem],
      expectedRevision: 3,
      writableWithoutLoss: true,
    };

    await expect(saveLayerSnapshotSafely(input)).rejects.toThrow('başka bir oturumda değişti');

    mocks.rpc.mockResolvedValueOnce({ data: [{ deleted: false }], error: null });
    await expect(saveLayerSnapshotSafely(input)).rejects.toThrow('yanıtı doğrulanamadı');
  });

  it('maps permission, invalid-input and missing-contract server errors', async () => {
    const input = {
      repertoireFileId: '33333333-3333-4333-8333-333333333333',
      pageNumber: 1,
      layerKey: 'personal' as const,
      annotations: [validTextItem],
      expectedRevision: 3,
      writableWithoutLoss: true,
    };

    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'ANNOTATION_FORBIDDEN' },
    });
    await expect(saveLayerSnapshotSafely(input)).rejects.toThrow('yetkisi doğrulanamadı');

    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: '22023', message: 'ANNOTATION_INVALID' },
    });
    await expect(saveLayerSnapshotSafely(input)).rejects.toThrow('isteği geçersiz bulundu');

    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find save_repertoire_pdf_annotation_snapshot' },
    });
    await expect(saveLayerSnapshotSafely(input)).rejects.toThrow('sözleşmesi sunucuda hazır değil');
  });
});
