// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ rpc: vi.fn(), access: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), single: vi.fn(), insert: vi.fn(), upload: vi.fn() }));
vi.mock('../supabase', () => ({ supabase: { rpc: mock.rpc, from: mock.from } }));
vi.mock('../web-auth-capability', () => ({ requireCurrentWebAccess: mock.access }));
vi.mock('./upload', () => ({ uploadPrivateRepertoireFile: mock.upload, REPERTOIRE_UPLOAD_MAX_BYTES: 104857600 }));
import { createPrivateRepertoireSong, loadPendingRepertoireSong } from './create-song';

const file = () => new File(['%PDF-1.4\nsynthetic'], 'score.pdf', { type: 'application/pdf' });
let savedRow: { id: string; title: string; choir_id: string; composer: string | null } | null;
beforeEach(() => {
  vi.resetAllMocks(); savedRow = null;
  const values = new Map<string, string>();
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  mock.access.mockResolvedValue({ userId: 'user-a', accessToken: 'token-a' });
  mock.rpc.mockResolvedValue({ data: 'choir-a', error: null });
  mock.from.mockReturnValue({ select: mock.select, insert: mock.insert });
  mock.select.mockReturnValue({ eq: mock.eq }); mock.eq.mockReturnValue({ maybeSingle: mock.single });
  mock.single.mockImplementation(async () => ({ data: savedRow, error: null }));
  mock.insert.mockImplementation(async row => { savedRow = row; return { error: null }; });
  mock.upload.mockResolvedValue({ id: 'file-a' });
});
describe('new song with first private file', () => {
  it('creates a provider-neutral song and clears its draft only after file acceptance', async () => {
    await createPrivateRepertoireSong(' New song ', ' Composer ', file());
    expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({ title: 'New song', composer: 'Composer', choir_id: 'choir-a' }));
    expect(mock.insert.mock.calls[0][0]).not.toHaveProperty('drive_folder_id');
    expect(mock.upload).toHaveBeenCalledWith(expect.objectContaining({ songId: savedRow?.id, fileType: 'sheet' }));
    expect(await loadPendingRepertoireSong()).toBeNull();
  });
  it('preserves row and retry identity after response loss and a reselected File', async () => {
    mock.upload.mockRejectedValueOnce(new Error('Response lost'));
    await expect(createPrivateRepertoireSong('New song', '', file())).rejects.toThrow('Response lost');
    const draft = await loadPendingRepertoireSong(); expect(draft?.fileName).toBe('score.pdf');
    await createPrivateRepertoireSong('New song', '', file());
    expect(mock.insert).toHaveBeenCalledTimes(1);
    expect(mock.upload.mock.calls[1][0].retryKey).toBe(mock.upload.mock.calls[0][0].retryKey);
    expect(await loadPendingRepertoireSong()).toBeNull();
  });
  it('keeps draft state on an ambiguous row insert and does not duplicate it on retry', async () => {
    mock.insert.mockImplementationOnce(async row => { savedRow = row; return { error: { message: 'Response lost' } }; });
    await expect(createPrivateRepertoireSong('New song', '', file())).rejects.toThrow('Şarkı kaydı doğrulanamadı');
    expect(mock.upload).not.toHaveBeenCalled();
    await createPrivateRepertoireSong('New song', '', file());
    expect(mock.insert).toHaveBeenCalledTimes(1);
    expect(mock.upload.mock.calls[0][0].songId).toBe(savedRow?.id);
  });
  it('does not reuse another choir draft and refuses replacing a pending song implicitly', async () => {
    mock.upload.mockRejectedValueOnce(new Error('Uncertain'));
    await expect(createPrivateRepertoireSong('First', '', file())).rejects.toThrow();
    await expect(createPrivateRepertoireSong('Different', '', file())).rejects.toThrow('Önce bekleyen');
    mock.rpc.mockResolvedValue({ data: 'choir-b', error: null });
    expect(await loadPendingRepertoireSong()).toBeNull();
  });
});
