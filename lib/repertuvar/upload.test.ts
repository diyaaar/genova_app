// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ rpc: vi.fn(), access: vi.fn(), fetch: vi.fn() }));
vi.mock('../supabase', () => ({ supabase: { rpc: mock.rpc } }));
vi.mock('../web-auth-capability', () => ({ requireCurrentWebAccess: mock.access, authenticatedWebFetch: mock.fetch }));
import { uploadPrivateRepertoireFile } from './upload';

const songId = '50000000-0000-4000-8000-000000000054';
const pdf = '%PDF-1.4\nsynthetic\n%%EOF';
function input() { return { songId, file: new File([pdf], 'score.pdf', { type: 'application/pdf' }), fileType: 'sheet' as const, mimeType: 'application/pdf' }; }
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  mock.access.mockResolvedValue({ userId: 'user-a', accessToken: 'token-a' });
  mock.rpc.mockResolvedValue({ data: 'choir-a', error: null });
  mock.fetch.mockImplementation(async () => new Response(JSON.stringify({ file: { id: 'file-a', song_id: songId } }), { status: 201 }));
});
describe('private repertoire web upload', () => {
  it('sends the original binary File with verified digest and no provider location', async () => {
    const value = input();
    await uploadPrivateRepertoireFile(value);
    const [url, init] = mock.fetch.mock.calls[0];
    expect(url).toBe('https://example.supabase.co/functions/v1/repertoire-upload');
    expect(init.body).toBe(value.file);
    const meta = JSON.parse(decodeURIComponent(init.headers['X-Upload-Metadata']));
    expect(meta).toEqual({ songId, fileName: 'score.pdf', fileType: 'sheet', mimeType: 'application/pdf',
      size: value.file.size, partitionLabel: null });
  });
  it('reuses the same key after a lost response and honors an explicit draft retry key', async () => {
    const value = input();
    mock.fetch.mockRejectedValueOnce(new Error('Network failed'));
    await expect(uploadPrivateRepertoireFile(value)).rejects.toThrow('Network failed');
    await uploadPrivateRepertoireFile(value);
    expect(mock.fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe(mock.fetch.mock.calls[1][1].headers['Idempotency-Key']);
    await uploadPrivateRepertoireFile({ ...input(), retryKey: 'draft-key' });
    expect(mock.fetch.mock.calls[2][1].headers['Idempotency-Key']).toBe('draft-key');
  });
  it('refuses a choir or session change immediately before sending bytes', async () => {
    mock.rpc.mockResolvedValueOnce({ data: 'choir-a', error: null }).mockResolvedValueOnce({ data: 'choir-b', error: null });
    await expect(uploadPrivateRepertoireFile(input())).rejects.toThrow('Oturum veya koro değişti');
    expect(mock.fetch).not.toHaveBeenCalled();
  });
  it('reports pending/reconciliation in Turkish and never falls back to Drive', async () => {
    mock.fetch.mockResolvedValue(new Response(JSON.stringify({ error: 'upload-reconciliation-required' }), { status: 503 }));
    await expect(uploadPrivateRepertoireFile(input())).rejects.toThrow('Dosyayı tekrar eklemeyin');
    expect(mock.fetch).toHaveBeenCalledTimes(1);
  });
  it('sends the exact private cover contract without provider metadata', async () => {
    const file=new File([new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])],'cover.png',{type:'image/png'});
    await uploadPrivateRepertoireFile({songId,file,fileType:'other',mimeType:'image/png',partitionLabel:'__cover__'});
    const metadata=JSON.parse(decodeURIComponent(mock.fetch.mock.calls[0][1].headers['X-Upload-Metadata']));
    expect(metadata).toEqual({songId,fileName:'cover.png',fileType:'other',mimeType:'image/png',size:file.size,partitionLabel:'__cover__'});
    expect(JSON.stringify(metadata)).not.toContain('bucket');
  });
});
