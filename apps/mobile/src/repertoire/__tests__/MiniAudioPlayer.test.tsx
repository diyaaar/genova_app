import { useEffect } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import type { RepertoireFile } from '@shared/repertuvar/catalog-core';
import { clearTenantCaches } from '../../auth/tenant-cache';
import { AudioPlaybackProvider, useAudioPlayback } from '../AudioPlaybackProvider';
import { MiniAudioPlayer } from '../MiniAudioPlayer';
import type { NativeAudioSession } from '../audio-contract';
import type { NativeAudioSourceGateway } from '../audio-source-gateway';

const file: RepertoireFile = {
  id: '11111111-1111-4111-8111-111111111111',
  song_id: 'song-a',
  file_name: 'alto.mp3',
  file_type: 'audio',
  partition_label: 'Çok uzun alto çalışma kaydı adı',
  drive_file_id: 'provider-id',
  drive_web_view_link: null,
  drive_download_link: null,
  mime_type: 'audio/mpeg',
  file_size_bytes: 1_000,
  uploaded_by: null,
  created_at: '2026-09-10T00:00:00Z',
  updated_at: '2026-09-10T00:00:00Z',
};

const session: NativeAudioSession = {
  songId: 'song-a',
  songTitle: 'Çok uzun eser başlığı küçük alanda kesilmelidir',
  tracks: [{ file, label: file.partition_label!, supported: true }],
};

function Harness() {
  const playback = useAudioPlayback();
  useEffect(() => { void playback.openSession(session); }, [playback.openSession]);
  return <MiniAudioPlayer onOpen={jest.fn()} />;
}

function renderMini(gateway: NativeAudioSourceGateway) {
  return render(
    <AudioPlaybackProvider gateway={gateway}>
      <Harness />
    </AudioPlaybackProvider>,
  );
}

describe('MiniAudioPlayer', () => {
  it('shows a bounded loading state and removes the private session on tenant clear', async () => {
    const gateway: NativeAudioSourceGateway = {
      open: jest.fn(() => new Promise(() => {})),
      clear: jest.fn(),
    };
    await renderMini(gateway);

    expect(await screen.findByTestId('audio-mini-player')).toBeTruthy();
    expect(screen.getByTestId('audio-mini-state')).toHaveTextContent(/Erişim hazırlanıyor/u);
    expect(screen.getByTestId('audio-mini-play-pause').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByText(session.songTitle).props.numberOfLines).toBe(1);

    await act(async () => { await clearTenantCaches(); });
    expect(gateway.clear).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('audio-mini-player')).toBeNull();
  });

  it('mirrors a protected-source error without enabling playback', async () => {
    const gateway: NativeAudioSourceGateway = {
      open: jest.fn(async () => { throw new Error('Bu dosyaya erişim yetkiniz yok.'); }),
      clear: jest.fn(),
    };
    await renderMini(gateway);

    await waitFor(() => expect(screen.getByTestId('audio-mini-state')).toHaveTextContent(/erişim yetkiniz yok/u));
    expect(screen.getByTestId('audio-mini-play-pause').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByLabelText(`${session.songTitle}, tam ses oynatıcıyı aç`)).toBeTruthy();
  });
});
