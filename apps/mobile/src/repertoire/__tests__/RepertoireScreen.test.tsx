import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { RepertoireFile, RepertoireSong, RepertoireTag } from '@shared/repertuvar/catalog-core';
import { clearTenantCaches, resetTenantCacheRegistry } from '../../auth/tenant-cache';
import { RepertoireScreen } from '../RepertoireScreen';
import type { NativeAudioSession } from '../audio-contract';
import type { NativeRepertoireCatalog, NativeRepertoireGateway } from '../catalog-gateway';
import type { NativeScoreReaderGateway } from '../reader-contract';

const concertTag: RepertoireTag = {
  id: 'tag-concert',
  name: 'Konser',
  color: null,
  created_by: null,
  created_at: '2026-09-08T00:00:00Z',
};

function song(overrides: Partial<RepertoireSong> = {}): RepertoireSong {
  return {
    id: 'song-a',
    title: 'Mavi Nota',
    composer: 'Ada Besteci',
    drive_folder_id: 'folder-a',
    is_visible: true,
    created_at: '2026-09-08T00:00:00Z',
    files: [],
    tags: [concertTag],
    ...overrides,
  };
}

function catalogue(overrides: Partial<NativeRepertoireCatalog> = {}): NativeRepertoireCatalog {
  return {
    version: 1,
    versionUpdatedAt: '2026-09-08T00:00:00Z',
    cachedAt: 1,
    songs: [song(), song({ id: 'song-b', title: 'Kırmızı Şarkı', composer: 'Başka', tags: [] })],
    tags: [concertTag],
    userParts: { 'song-a': 'Alto' },
    assignedSongIds: ['song-a', 'song-b'],
    roleScope: 'chorist',
    scopeKey: 'choir-a:member-a:chorist',
    ...overrides,
  };
}

function gateway(load: NativeRepertoireGateway['load']): NativeRepertoireGateway & {
  load: jest.Mock;
  clear: jest.Mock;
} {
  return { load: jest.fn(load), clear: jest.fn() };
}

async function renderScreen(
  preparedGateway: NativeRepertoireGateway,
  readerGateway?: NativeScoreReaderGateway,
  onOpenAudio: (session: NativeAudioSession) => void = jest.fn(),
  initialSongId: string | null = null,
) {
  return await render(
    <RepertoireScreen
      choirId="choir-a"
      memberId="member-a"
      choirName="Genova A"
      gateway={preparedGateway}
      readerGateway={readerGateway}
      initialSongId={initialSongId}
      onOpenAudio={onOpenAudio}
      canSwitchChoir
      onBack={jest.fn()}
      onSwitchChoir={jest.fn()}
      onSignOut={jest.fn()}
    />,
  );
}

describe('RepertoireScreen', () => {
  beforeEach(() => resetTenantCacheRegistry());

  it('shows loading, then the filtered catalogue, assignment part, search and tag states', async () => {
    let resolve!: (value: NativeRepertoireCatalog) => void;
    const preparedGateway = gateway(() => new Promise((done) => { resolve = done; }));
    await renderScreen(preparedGateway);

    expect(screen.getByTestId('repertoire-loading')).toBeTruthy();
    resolve(catalogue());

    expect(await screen.findByTestId('repertoire-song-song-a')).toBeTruthy();
    expect(screen.getByText('Alto')).toBeTruthy();
    expect(screen.getByTestId('repertoire-song-song-b')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('repertoire-search'), 'ada');
    expect(screen.getByTestId('repertoire-song-song-a')).toBeTruthy();
    expect(screen.queryByTestId('repertoire-song-song-b')).toBeNull();

    await fireEvent.changeText(screen.getByTestId('repertoire-search'), '');
    await fireEvent.press(screen.getByTestId('repertoire-tag-Konser'));
    expect(screen.getByTestId('repertoire-song-song-a')).toBeTruthy();
    expect(screen.queryByTestId('repertoire-song-song-b')).toBeNull();
  });

  it('distinguishes an empty accessible catalogue from a search with no matches', async () => {
    const emptyGateway = gateway(async () => catalogue({ songs: [], assignedSongIds: [] }));
    const first = await renderScreen(emptyGateway);
    expect(await screen.findByTestId('repertoire-empty')).toBeTruthy();
    await first.unmount();

    const filledGateway = gateway(async () => catalogue());
    await renderScreen(filledGateway);
    await screen.findByTestId('repertoire-list');
    await fireEvent.changeText(screen.getByTestId('repertoire-search'), 'bulunmaz');
    expect(screen.getByTestId('repertoire-no-results')).toBeTruthy();
  });

  it('opens only the accessible song targeted by a notification and can return to all songs', async () => {
    const targetId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
    const preparedGateway = gateway(async () => catalogue({
      songs: [song(), song({ id: targetId, title: 'Bildirim Eseri' })],
      assignedSongIds: ['song-a', targetId],
    }));
    await renderScreen(preparedGateway, undefined, jest.fn(), targetId);

    expect(await screen.findByTestId('repertoire-notification-target')).toBeTruthy();
    expect(screen.getByTestId(`repertoire-song-${targetId}`)).toBeTruthy();
    expect(screen.queryByTestId('repertoire-song-song-a')).toBeNull();

    await fireEvent.press(screen.getByTestId('repertoire-show-all-after-notification'));
    expect(screen.getByTestId('repertoire-song-song-a')).toBeTruthy();
  });

  it('does not reveal an inaccessible notification song', async () => {
    const preparedGateway = gateway(async () => catalogue());
    await renderScreen(
      preparedGateway,
      undefined,
      jest.fn(),
      '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
    );

    expect(await screen.findByTestId('repertoire-notification-target-unavailable')).toBeTruthy();
    expect(screen.queryByTestId('repertoire-list')).toBeNull();
  });

  it('shows source errors and retries with a forced refresh', async () => {
    const preparedGateway = gateway(jest.fn()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(catalogue()));
    await renderScreen(preparedGateway);

    expect(await screen.findByText('network down')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('repertoire-retry'));

    expect(await screen.findByTestId('repertoire-song-song-a')).toBeTruthy();
    expect(preparedGateway.load).toHaveBeenLastCalledWith({
      choirId: 'choir-a',
      memberId: 'member-a',
      force: true,
    });
  });

  it('refreshes an already loaded catalogue with a forced source read', async () => {
    const preparedGateway = gateway(async () => catalogue());
    await renderScreen(preparedGateway);
    await screen.findByTestId('repertoire-list');

    await fireEvent.press(screen.getByTestId('repertoire-refresh'));

    await waitFor(() => expect(preparedGateway.load).toHaveBeenLastCalledWith({
      choirId: 'choir-a',
      memberId: 'member-a',
      force: true,
    }));
  });

  it('registers its cache with the tenant cleanup boundary', async () => {
    const preparedGateway = gateway(async () => catalogue());
    await renderScreen(preparedGateway);
    await screen.findByTestId('repertoire-list');

    await clearTenantCaches();
    await waitFor(() => expect(preparedGateway.clear).toHaveBeenCalledTimes(1));
  });

  it('opens an eligible repository score through the protected reader and returns', async () => {
    const scoreFile: RepertoireFile = {
      id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      song_id: 'song-a',
      file_name: 'alto.pdf',
      file_type: 'sheet',
      partition_label: 'Alto',
      drive_file_id: 'provider-id',
      drive_web_view_link: 'https://provider.invalid/view',
      drive_download_link: 'https://provider.invalid/download',
      mime_type: 'application/pdf',
      file_size_bytes: 64000,
      uploaded_by: null,
      created_at: '2026-09-08T00:00:00Z',
      updated_at: '2026-09-08T00:00:00Z',
    };
    const readerGateway: NativeScoreReaderGateway = {
      open: jest.fn(async ({ choirId, file }) => ({
        choirId,
        fileId: file.id,
        fileName: file.file_name,
        uri: 'file:///private/alto.pdf',
        pageCount: 1,
        annotations: { byPage: {}, skippedCount: 0 },
      })),
      renderWindow: jest.fn(async (_document, pageNumber) => ({
        currentPage: pageNumber,
        pages: { 1: { uri: 'file:///page-1.jpg', width: 595, height: 842 } },
      })),
      close: jest.fn(async () => {}),
      clear: jest.fn(async () => {}),
    };
    const preparedGateway = gateway(async () => catalogue({ songs: [song({ files: [scoreFile] })] }));
    await renderScreen(preparedGateway, readerGateway);
    await screen.findByTestId('repertoire-list');

    await fireEvent.press(screen.getByTestId(`repertoire-open-score-${scoreFile.id}`));
    expect(await screen.findByTestId('score-reader-page-1')).toBeTruthy();
    expect(readerGateway.open).toHaveBeenCalledWith({ choirId: 'choir-a', file: scoreFile });

    await fireEvent.press(screen.getByTestId('score-reader-back'));
    expect(await screen.findByTestId('repertoire-list')).toBeTruthy();
  });

  it('opens accessible native audio without changing the score route', async () => {
    const audioFile: RepertoireFile = {
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      song_id: 'song-a',
      file_name: 'alto.mp3',
      file_type: 'audio',
      partition_label: 'Alto çalışma',
      drive_file_id: 'provider-id',
      drive_web_view_link: null,
      drive_download_link: null,
      mime_type: 'audio/mpeg',
      file_size_bytes: 64_000,
      uploaded_by: null,
      created_at: '2026-09-08T00:00:00Z',
      updated_at: '2026-09-08T00:00:00Z',
    };
    const onOpenAudio = jest.fn();
    const preparedGateway = gateway(async () => catalogue({ songs: [song({ files: [audioFile] })] }));
    await renderScreen(preparedGateway, undefined, onOpenAudio);
    await screen.findByTestId('repertoire-list');

    await fireEvent.press(screen.getByTestId('repertoire-open-audio-song-a'));
    expect(onOpenAudio).toHaveBeenCalledWith({
      songId: 'song-a',
      songTitle: 'Mavi Nota',
      tracks: [{ file: audioFile, label: 'Alto çalışma', supported: true }],
    });
    expect(screen.getByTestId('repertoire-list')).toBeTruthy();
  });
});
