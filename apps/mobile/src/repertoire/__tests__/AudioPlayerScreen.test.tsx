import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { RepertoireFile } from '@shared/repertuvar/catalog-core';
import { clearTenantCaches } from '../../auth/tenant-cache';
import { AudioPlayerScreen } from '../AudioPlayerScreen';
import type { NativeAudioTrack } from '../audio-contract';
import type { NativeAudioSourceGateway } from '../audio-source-gateway';

const audioMock = jest.requireMock('expo-audio') as {
  useAudioPlayer: jest.Mock;
  __mockPlayer: {
    play: jest.Mock;
    pause: jest.Mock;
    replace: jest.Mock;
    seekTo: jest.Mock;
    setPlaybackRate: jest.Mock;
  };
  __mockStatus: {
    currentTime: number;
    duration: number;
    playing: boolean;
    isBuffering: boolean;
    isLoaded: boolean;
    playbackRate: number;
    error: string | null;
  };
};

function file(id: string, fileName: string): RepertoireFile {
  return {
    id,
    song_id: 'song-a',
    file_name: fileName,
    file_type: 'audio',
    partition_label: '',
    drive_file_id: 'provider-id',
    drive_web_view_link: null,
    drive_download_link: null,
    mime_type: fileName.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg',
    file_size_bytes: 1_000,
    uploaded_by: null,
    created_at: '2026-09-10T10:00:00Z',
    updated_at: '2026-09-10T10:00:00Z',
  };
}

const tracks: NativeAudioTrack[] = [
  { file: file('11111111-1111-4111-8111-111111111111', 'soprano.mp3'), label: 'Soprano', supported: true },
  { file: file('22222222-2222-4222-8222-222222222222', 'alto.wav'), label: 'Alto', supported: true },
  { file: file('33333333-3333-4333-8333-333333333333', 'tenor.ogg'), label: 'Tenor', supported: false },
];

function gateway(open: NativeAudioSourceGateway['open']): NativeAudioSourceGateway & {
  open: jest.Mock;
  clear: jest.Mock;
} {
  return { open: jest.fn(open), clear: jest.fn() };
}

describe('AudioPlayerScreen', () => {
  beforeEach(() => {
    Object.assign(audioMock.__mockStatus, {
      currentTime: 0,
      duration: 0,
      playing: false,
      isBuffering: false,
      isLoaded: false,
      playbackRate: 1,
      error: null,
    });
    for (const method of Object.values(audioMock.__mockPlayer)) method.mockClear();
    audioMock.useAudioPlayer.mockClear();
  });

  it('loads a protected source and exposes play, seek, rate and track controls', async () => {
    const source = gateway(async (fileId) => ({
      url: `https://project.invalid/audio?fileId=${fileId}`,
      expiresAt: 9_999_999_999_999,
    }));
    const props = { songTitle: 'Mavi Nota', tracks, gateway: source, onBack: jest.fn() };
    const view = await render(<AudioPlayerScreen {...props} />);

    await waitFor(() => expect(audioMock.useAudioPlayer).toHaveBeenLastCalledWith({
      uri: expect.stringContaining(tracks[0]!.file.id),
      name: 'Soprano',
    }, { updateInterval: 250 }));
    Object.assign(audioMock.__mockStatus, { isLoaded: true, duration: 90, currentTime: 20 });
    await view.rerender(<AudioPlayerScreen {...props} />);

    await fireEvent.press(screen.getByTestId('audio-play-pause'));
    expect(audioMock.__mockPlayer.play).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('audio-forward-10'));
    expect(audioMock.__mockPlayer.seekTo).toHaveBeenCalledWith(30);
    await fireEvent(screen.getByTestId('audio-seek'), 'accessibilityAction', {
      nativeEvent: { actionName: 'decrement' },
    });
    expect(audioMock.__mockPlayer.seekTo).toHaveBeenCalledWith(10);
    await fireEvent.press(screen.getByTestId('audio-speed'));
    expect(audioMock.__mockPlayer.setPlaybackRate).toHaveBeenLastCalledWith(1.25);

    await fireEvent.press(screen.getByTestId(`audio-track-${tracks[1]!.file.id}`));
    await waitFor(() => expect(source.open).toHaveBeenLastCalledWith(tracks[1]!.file.id));
    await waitFor(() => expect(audioMock.useAudioPlayer).toHaveBeenLastCalledWith({
      uri: expect.stringContaining(tracks[1]!.file.id),
      name: 'Alto',
    }, { updateInterval: 250 }));
    expect(audioMock.__mockPlayer.replace).not.toHaveBeenCalled();
  });

  it('shows denied and unsupported errors and retries with a fresh ticket', async () => {
    const source = gateway(jest.fn()
      .mockRejectedValueOnce(new Error('Bu dosyaya erişim yetkiniz yok.'))
      .mockResolvedValueOnce({ url: 'https://project.invalid/fresh', expiresAt: 9_999_999_999_999 }));
    await render(<AudioPlayerScreen songTitle="Mavi Nota" tracks={tracks} gateway={source} onBack={jest.fn()} />);

    expect(await screen.findByText('Bu dosyaya erişim yetkiniz yok.')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('audio-retry'));
    await waitFor(() => expect(audioMock.useAudioPlayer).toHaveBeenLastCalledWith({
      uri: 'https://project.invalid/fresh',
      name: 'Soprano',
    }, { updateInterval: 250 }));
    expect(source.open).toHaveBeenCalledTimes(2);

    await fireEvent.press(screen.getByTestId(`audio-track-${tracks[2]!.file.id}`));
    expect(await screen.findByText('Bu ses biçimi mobil oynatıcıda desteklenmiyor.')).toBeTruthy();
    expect(screen.queryByTestId('audio-retry')).toBeNull();
    expect(audioMock.useAudioPlayer).toHaveBeenLastCalledWith(null, { updateInterval: 250 });
    expect(source.open).toHaveBeenCalledTimes(2);
  });

  it('renews an expired ticket before play and clears playback at the tenant boundary', async () => {
    const source = gateway(jest.fn()
      .mockResolvedValueOnce({ url: 'https://project.invalid/expired', expiresAt: 1 })
      .mockResolvedValueOnce({ url: 'https://project.invalid/renewed', expiresAt: 9_999_999_999_999 }));
    const props = { songTitle: 'Mavi Nota', tracks, gateway: source, onBack: jest.fn() };
    const view = await render(<AudioPlayerScreen {...props} />);
    await waitFor(() => expect(source.open).toHaveBeenCalledTimes(1));
    Object.assign(audioMock.__mockStatus, { isLoaded: true, duration: 90, currentTime: 35 });
    await view.rerender(<AudioPlayerScreen {...props} />);

    await fireEvent.press(screen.getByTestId('audio-play-pause'));
    await waitFor(() => expect(source.open).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(audioMock.__mockPlayer.seekTo).toHaveBeenCalledWith(35));
    expect(audioMock.__mockPlayer.play).toHaveBeenCalledTimes(1);

    await act(async () => { await clearTenantCaches(); });
    expect(source.clear).toHaveBeenCalledTimes(1);
    expect(audioMock.__mockPlayer.pause).toHaveBeenCalled();
    expect(audioMock.useAudioPlayer).toHaveBeenLastCalledWith(null, { updateInterval: 250 });
    expect(audioMock.__mockPlayer.replace).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByTestId('audio-play-pause').props.accessibilityState.disabled).toBe(true));
    expect(screen.getByTestId('audio-seek').props.accessibilityValue.text).toBe('0:00 / 0:00');
    expect(screen.getByTestId('audio-back-10').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('audio-forward-10').props.accessibilityState.disabled).toBe(true);
    expect(screen.getByTestId('audio-speed').props.accessibilityState.disabled).toBe(true);
  });

  it('surfaces native media errors with a bounded retry action', async () => {
    const source = gateway(async () => ({ url: 'https://project.invalid/corrupt', expiresAt: 9_999_999_999_999 }));
    const props = { songTitle: 'Mavi Nota', tracks, gateway: source, onBack: jest.fn() };
    const view = await render(<AudioPlayerScreen {...props} />);
    await waitFor(() => expect(source.open).toHaveBeenCalled());
    Object.assign(audioMock.__mockStatus, { error: 'decoder failed', isLoaded: false });
    await view.rerender(<AudioPlayerScreen {...props} />);
    expect(await screen.findByText('Ses dosyası oynatılamadı. Yeniden deneyin.')).toBeTruthy();
    expect(screen.getByLabelText('Ses dosyasını yeniden yükle')).toBeTruthy();
  });

  it('turns a missing native error event into a bounded visible load failure', async () => {
    jest.useFakeTimers();
    try {
      const source = gateway(async () => ({ url: 'https://project.invalid/corrupt', expiresAt: 9_999_999_999_999 }));
      await render(<AudioPlayerScreen songTitle="Mavi Nota" tracks={tracks} gateway={source} onBack={jest.fn()} />);
      await waitFor(() => expect(source.open).toHaveBeenCalled());

      await fireEvent.press(screen.getByTestId('audio-play-pause'));
      await act(async () => { jest.advanceTimersByTime(8_000); });

      expect(await screen.findByText('Ses dosyası oynatılamadı. Yeniden deneyin.')).toBeTruthy();
      expect(audioMock.__mockPlayer.pause).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
