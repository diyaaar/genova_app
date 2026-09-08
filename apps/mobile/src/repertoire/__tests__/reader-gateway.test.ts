import type { RepertoireFile } from '@shared/repertuvar/catalog-core';
import { createNativeScoreReaderGateway } from '../reader-gateway';

const CHOIR = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const FILE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function score(overrides: Partial<RepertoireFile> = {}): RepertoireFile {
  return {
    id: FILE_ID,
    song_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    file_name: 'score.pdf',
    file_type: 'sheet',
    partition_label: null,
    drive_file_id: 'must-not-be-used',
    drive_web_view_link: 'https://provider.example/view',
    drive_download_link: 'https://provider.example/download',
    mime_type: 'application/pdf',
    file_size_bytes: 10,
    uploaded_by: null,
    created_at: '2026-09-08T00:00:00Z',
    updated_at: '2026-09-08T00:00:00Z',
    ...overrides,
  };
}

function build(options: {
  pageCount?: number;
  token?: string | null;
  downloadError?: Error;
  annotationError?: Error;
  annotationPromise?: Promise<{ byPage: {}; skippedCount: number }>;
} = {}) {
  const files = {
    download: jest.fn(async () => {
      if (options.downloadError) throw options.downloadError;
      return { uri: 'file:///private/score.pdf', size: 64000 };
    }),
    remove: jest.fn(async () => {}),
    clear: jest.fn(async () => {}),
  };
  const pdf = {
    open: jest.fn(async () => ({ pageCount: options.pageCount ?? 40 })),
    generate: jest.fn(async (_uri: string, page: number) => ({ uri: `file:///page-${page}.jpg`, width: 595, height: 842 })),
    close: jest.fn(async () => {}),
  };
  const annotations = {
    load: jest.fn(async () => {
      if (options.annotationError) throw options.annotationError;
      if (options.annotationPromise) return options.annotationPromise;
      return { byPage: {}, skippedCount: 0 };
    }),
  };
  const requestTicket = jest.fn(async () => ({
    url: `https://example.test/functions/v1/repertoire-file?fileId=${FILE_ID}&ticket=signed`,
    expiresAt: Date.now() + 60_000,
  }));
  const gateway = createNativeScoreReaderGateway({
    endpoint: 'https://example.test/functions/v1/repertoire-file',
    session: { getAccessToken: jest.fn(async () => options.token === undefined ? 'access-token' : options.token) },
    annotations,
    files,
    pdf,
    requestTicket,
  });
  return { gateway, files, pdf, annotations, requestTicket };
}

describe('native score reader gateway', () => {
  it('uses only the repository UUID ticket and opens the synthetic 40-page document', async () => {
    const { gateway, files, requestTicket } = build();
    const document = await gateway.open({ choirId: CHOIR, file: score() });
    expect(document.pageCount).toBe(40);
    expect(requestTicket).toHaveBeenCalledWith(expect.objectContaining({ fileId: FILE_ID, accessToken: 'access-token' }));
    expect(files.download).toHaveBeenCalledWith(expect.objectContaining({
      choirId: CHOIR,
      fileId: FILE_ID,
      url: expect.stringContaining('ticket=signed'),
    }));
    expect(JSON.stringify(requestTicket.mock.calls)).not.toContain('provider.example');
  });

  it('renders only the bounded window with exact zero-based indices and releases old native images', async () => {
    const { gateway, pdf } = build();
    const document = await gateway.open({ choirId: CHOIR, file: score() });
    const first = await gateway.renderWindow(document, 1);
    expect(Object.keys(first.pages)).toEqual(['1', '2']);
    expect(pdf.generate.mock.calls.map((call) => call[1])).toEqual([0, 1]);

    pdf.generate.mockClear();
    const last = await gateway.renderWindow(document, 40);
    expect(Object.keys(last.pages)).toEqual(['39', '40']);
    expect(pdf.close).toHaveBeenCalledWith(document.uri);
    expect(pdf.open).toHaveBeenCalledTimes(2);
    expect(pdf.generate.mock.calls.map((call) => call[1])).toEqual([38, 39]);
  });

  it('fails closed for missing sessions, corrupt/empty PDFs and interrupted downloads', async () => {
    await expect(build({ token: null }).gateway.open({ choirId: CHOIR, file: score() })).rejects.toThrow('Oturum bulunamadı');

    const corrupt = build({ pageCount: 0 });
    await expect(corrupt.gateway.open({ choirId: CHOIR, file: score() })).rejects.toThrow('okunabilir sayfa');
    expect(corrupt.files.remove).toHaveBeenCalledWith('file:///private/score.pdf');

    const interrupted = build({ downloadError: new Error('network interrupted') });
    await expect(interrupted.gateway.open({ choirId: CHOIR, file: score() })).rejects.toThrow('network interrupted');
    expect(interrupted.pdf.open).not.toHaveBeenCalled();
  });

  it('rejects oversized metadata before requesting a ticket or downloading', async () => {
    const prepared = build();
    await expect(prepared.gateway.open({
      choirId: CHOIR,
      file: score({ file_size_bytes: 100 * 1024 * 1024 + 1 }),
    })).rejects.toThrow('100 MB');
    expect(prepared.requestTicket).not.toHaveBeenCalled();
    expect(prepared.files.download).not.toHaveBeenCalled();
  });

  it('cleans the private file and renderer on close and tenant clear', async () => {
    const first = build();
    const document = await first.gateway.open({ choirId: CHOIR, file: score() });
    await first.gateway.close(document.uri);
    expect(first.pdf.close).toHaveBeenCalledWith(document.uri);
    expect(first.files.remove).toHaveBeenCalledWith(document.uri);

    const second = build();
    await second.gateway.open({ choirId: CHOIR, file: score() });
    await second.gateway.clear();
    expect(second.files.clear).toHaveBeenCalled();
  });

  it('does not return a document after tenant cleanup invalidates an in-flight open', async () => {
    let releaseAnnotations!: (value: { byPage: {}; skippedCount: number }) => void;
    const annotationPromise = new Promise<{ byPage: {}; skippedCount: number }>((resolve) => {
      releaseAnnotations = resolve;
    });
    const prepared = build({ annotationPromise });
    const opening = prepared.gateway.open({ choirId: CHOIR, file: score() });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(prepared.annotations.load).toHaveBeenCalled();
    await prepared.gateway.clear();
    releaseAnnotations({ byPage: {}, skippedCount: 0 });

    await expect(opening).rejects.toThrow('artık geçerli değil');
    expect(prepared.files.clear).toHaveBeenCalled();
  });
});
