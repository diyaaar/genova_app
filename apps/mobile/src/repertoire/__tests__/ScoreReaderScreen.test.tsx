import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { RepertoireFile } from '@shared/repertuvar/catalog-core';
import { ScoreReaderScreen } from '../ScoreReaderScreen';
import type { NativeScoreDocument, NativeScoreReaderGateway } from '../reader-contract';

const file: RepertoireFile = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  song_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  file_name: 'synthetic-40p.pdf',
  file_type: 'sheet',
  partition_label: 'Tümü',
  drive_file_id: 'provider-id',
  drive_web_view_link: null,
  drive_download_link: null,
  mime_type: 'application/pdf',
  file_size_bytes: 64000,
  uploaded_by: null,
  created_at: '2026-09-08T00:00:00Z',
  updated_at: '2026-09-08T00:00:00Z',
};

const document: NativeScoreDocument = {
  choirId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  fileId: file.id,
  fileName: file.file_name,
  uri: 'file:///private/synthetic-40p.pdf',
  pageCount: 40,
  annotations: {
    skippedCount: 2,
    byPage: {
      1: [{
        layerKey: 'personal',
        items: [{ id: 'text', type: 'text', color: 'red', position: { x: 0.1, y: 0.2 }, text: 'Piano', width: 0.2 }],
      }],
    },
  },
};

function gateway(options: { openError?: Error; renderError?: Error } = {}): NativeScoreReaderGateway & {
  open: jest.Mock;
  renderWindow: jest.Mock;
  close: jest.Mock;
  clear: jest.Mock;
} {
  const open = options.openError
    ? jest.fn().mockRejectedValueOnce(options.openError).mockResolvedValue(document)
    : jest.fn().mockResolvedValue(document);
  const renderWindow = options.renderError
    ? jest.fn().mockRejectedValueOnce(options.renderError).mockImplementation(async (_document, page: number) => ({
      currentPage: page,
      pages: { [page]: { uri: `file:///page-${page}.jpg`, width: 595, height: 842 } },
    }))
    : jest.fn(async (_document, page: number) => ({
      currentPage: page,
      pages: { [page]: { uri: `file:///page-${page}.jpg`, width: 595, height: 842 } },
    }));
  return { open, renderWindow, close: jest.fn(async () => {}), clear: jest.fn(async () => {}) };
}

async function reader(prepared: NativeScoreReaderGateway, onBack = jest.fn()) {
  return await render(
    <ScoreReaderScreen
      choirId={document.choirId}
      file={file}
      gateway={prepared}
      onBack={onBack}
    />,
  );
}

describe('ScoreReaderScreen', () => {
  it('shows download/render progress, page bitmap, read-only annotations and skipped-content warning', async () => {
    const prepared = gateway();
    const view = await reader(prepared);
    expect(await screen.findByTestId('score-reader-page-1')).toBeTruthy();
    expect(screen.getByTestId('annotation-overlay')).toBeTruthy();
    expect(screen.getByText('Piano')).toBeTruthy();
    expect(screen.getByText(/2 desteklenmeyen/)).toBeTruthy();
    expect(screen.getByTestId('score-reader-counter')).toHaveTextContent('1 / 40');
    expect(screen.getByTestId('score-reader-vertical-scroll')).toBeTruthy();
    expect(screen.getByTestId('score-reader-horizontal-scroll')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('score-reader-zoom-in'));
    expect(screen.getByTestId('score-reader-zoom-reset')).toHaveTextContent('125%');
    await fireEvent.press(screen.getByTestId('score-reader-zoom-reset'));
    expect(screen.getByTestId('score-reader-zoom-reset')).toHaveTextContent('100%');

    await fireEvent.press(screen.getByTestId('score-reader-next'));
    expect(await screen.findByTestId('score-reader-page-2')).toBeTruthy();
    expect(prepared.renderWindow).toHaveBeenLastCalledWith(document, 2);

    await view.unmount();
    await waitFor(() => expect(prepared.close).toHaveBeenCalledWith(document.uri));
  });

  it('exposes and retries authorization/download failures', async () => {
    const prepared = gateway({ openError: new Error('Bağlantının süresi doldu.') });
    await reader(prepared);
    expect(await screen.findByText(/süresi doldu/)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('score-reader-open-retry'));
    expect(await screen.findByTestId('score-reader-page-1')).toBeTruthy();
    expect(prepared.open).toHaveBeenCalledTimes(2);
  });

  it('never treats a render failure as a blank success and retries the page', async () => {
    const prepared = gateway({ renderError: new Error('corrupt page') });
    await reader(prepared);
    expect(await screen.findByText('corrupt page')).toBeTruthy();
    expect(screen.queryByTestId('score-reader-page-1')).toBeNull();
    await fireEvent.press(screen.getByTestId('score-reader-render-retry'));
    expect(await screen.findByTestId('score-reader-page-1')).toBeTruthy();
  });

  it('returns to the catalogue on request', async () => {
    const onBack = jest.fn();
    await reader(gateway(), onBack);
    await screen.findByTestId('score-reader-page-1');
    await fireEvent.press(screen.getByTestId('score-reader-back'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
