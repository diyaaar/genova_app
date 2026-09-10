import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { AuthProvider } from '../../auth/AuthProvider';
import { AuthStore } from '../../auth/auth-store';
import { AppRoot } from '../AppRoot';
import type { NativeAudioSourceGateway } from '../../repertoire/audio-source-gateway';
import {
  CHOIR_A,
  CHOIR_B,
  createClientDouble,
  createGatewayDouble,
  createPreferenceDouble,
  membership,
  sessionFor,
} from '../../test/doubles';
import type { NativeRepertoireGateway } from '../../repertoire/catalog-gateway';

async function renderWithStore(options: {
  memberships?: ReturnType<typeof membership>[];
  activeChoirId?: string | null;
  initialSession?: ReturnType<typeof sessionFor> | null;
  signInError?: { message: string } | null;
  repertoireGateway?: NativeRepertoireGateway;
  audioGateway?: NativeAudioSourceGateway;
}) {
  const clientDouble = createClientDouble({
    memberships: options.memberships ?? [membership()],
    activeChoirId: options.activeChoirId ?? null,
  });
  const gateway = createGatewayDouble({
    initialSession: options.initialSession === undefined ? sessionFor() : options.initialSession,
    signInError: options.signInError ?? null,
  });
  const store = new AuthStore({
    client: clientDouble.client,
    auth: gateway.gateway,
    preferences: createPreferenceDouble(),
    clearCaches: async () => {},
  });

  const root = (
    <AuthProvider store={store}>
      <AppRoot repertoireGateway={options.repertoireGateway} audioGateway={options.audioGateway} />
    </AuthProvider>
  );
  const view = await render(root);
  return { store, gateway, view, root };
}

describe('shell routing', () => {
  it('asks for credentials when there is no session', async () => {
    await renderWithStore({ initialSession: null });

    expect(await screen.findByTestId('sign-in-screen')).toBeTruthy();
    expect(screen.queryByTestId('shell-screen')).toBeNull();
  });

  it('shows the reason when sign-in is rejected', async () => {
    await renderWithStore({ initialSession: null, signInError: { message: 'Invalid login credentials' } });
    await screen.findByTestId('sign-in-screen');

    await fireEvent.changeText(screen.getByTestId('sign-in-email'), 'a@b.test');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'wrong');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));

    expect(await screen.findByTestId('sign-in-error')).toHaveTextContent('Invalid login credentials');
    expect(screen.queryByTestId('shell-screen')).toBeNull();
  });

  it('explains a missing membership instead of opening a data screen', async () => {
    await renderWithStore({ memberships: [] });

    expect(await screen.findByTestId('no-membership-screen')).toBeTruthy();
    expect(screen.queryByTestId('shell-screen')).toBeNull();
  });

  it('requires a choice for multiple memberships before any data screen', async () => {
    await renderWithStore({
      memberships: [membership(), membership({ choir_id: CHOIR_B, choir_name: 'Genova B' })],
    });

    expect(await screen.findByTestId('choir-select-screen')).toBeTruthy();
    expect(screen.getByTestId(`choir-option-${CHOIR_A}`)).toBeTruthy();
    expect(screen.queryByTestId('shell-screen')).toBeNull();
  });

  it('opens the shell with the server-confirmed choir and can switch back to the picker', async () => {
    await renderWithStore({
      memberships: [membership(), membership({ choir_id: CHOIR_B, choir_name: 'Genova B' })],
      activeChoirId: CHOIR_A,
    });

    expect(await screen.findByTestId('shell-active-choir')).toHaveTextContent('Genova A');

    await fireEvent.press(screen.getByTestId('shell-switch-choir'));

    await waitFor(() => expect(screen.getByTestId('choir-select-screen')).toBeTruthy());
  });

  it('opens the isolated repertoire catalogue and returns to the active-choir shell', async () => {
    const repertoireGateway: NativeRepertoireGateway = {
      load: jest.fn(async (): Promise<import('../../repertoire/catalog-gateway').NativeRepertoireCatalog> => ({
        version: 1,
        versionUpdatedAt: null,
        cachedAt: 1,
        songs: [],
        tags: [],
        userParts: {},
        assignedSongIds: [],
        roleScope: 'chorist',
        scopeKey: `${CHOIR_A}:33333333-3333-4333-8333-333333333333:chorist`,
      })),
      clear: jest.fn(),
    };
    await renderWithStore({ repertoireGateway });
    await screen.findByTestId('shell-screen');

    await fireEvent.press(screen.getByTestId('shell-open-repertoire'));
    expect(await screen.findByTestId('repertoire-screen')).toBeTruthy();
    expect(await screen.findByTestId('repertoire-empty')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('repertoire-back'));
    expect(await screen.findByTestId('shell-screen')).toBeTruthy();
  });

  it('keeps one audio session through full player, repertoire and home mini-player navigation', async () => {
    const audioFile: import('@shared/repertuvar/catalog-core').RepertoireFile = {
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
      created_at: '2026-09-10T00:00:00Z',
      updated_at: '2026-09-10T00:00:00Z',
    };
    const repertoireGateway: NativeRepertoireGateway = {
      load: jest.fn(async (): Promise<import('../../repertoire/catalog-gateway').NativeRepertoireCatalog> => ({
        version: 1,
        versionUpdatedAt: null,
        cachedAt: 1,
        songs: [{
          id: 'song-a', title: 'Mavi Nota', composer: 'Ada Besteci', drive_folder_id: null,
          is_visible: true, created_at: '2026-09-10T00:00:00Z', files: [audioFile], tags: [],
        }],
        tags: [],
        userParts: {},
        assignedSongIds: ['song-a'],
        roleScope: 'chorist',
        scopeKey: `${CHOIR_A}:33333333-3333-4333-8333-333333333333:chorist`,
      })),
      clear: jest.fn(),
    };
    const audioGateway: NativeAudioSourceGateway = {
      open: jest.fn(async () => ({ url: 'https://project.invalid/audio', expiresAt: 9_999_999_999_999 })),
      clear: jest.fn(),
    };
    const audioMock = jest.requireMock('expo-audio') as {
      __mockPlayer: { pause: jest.Mock };
      __mockStatus: { currentTime: number; duration: number; playing: boolean; isLoaded: boolean };
    };
    Object.assign(audioMock.__mockStatus, { currentTime: 12, duration: 90, playing: true, isLoaded: true });
    audioMock.__mockPlayer.pause.mockClear();

    await renderWithStore({ repertoireGateway, audioGateway });
    await screen.findByTestId('shell-screen');
    await fireEvent.press(screen.getByTestId('shell-open-repertoire'));
    await screen.findByTestId('repertoire-list');
    await fireEvent.press(screen.getByTestId('repertoire-open-audio-song-a'));
    expect(await screen.findByTestId('audio-player-screen')).toBeTruthy();
    expect(audioGateway.open).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('audio-player-back'));
    expect(await screen.findByTestId('audio-mini-player')).toBeTruthy();
    expect(screen.getByTestId('audio-mini-state')).toHaveTextContent(/0:12 \/ 1:30/u);
    await fireEvent.press(screen.getByTestId('repertoire-back'));
    expect(await screen.findByTestId('shell-screen')).toBeTruthy();
    expect(screen.getByTestId('audio-mini-player')).toBeTruthy();
    expect(audioGateway.open).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('audio-mini-play-pause'));
    expect(audioMock.__mockPlayer.pause).toHaveBeenCalled();
    await fireEvent.press(screen.getByTestId('audio-mini-open'));
    expect(await screen.findByTestId('audio-player-screen')).toBeTruthy();
    expect(audioGateway.open).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByTestId('audio-player-back'));
    await fireEvent.press(screen.getByTestId('repertoire-back'));
    await fireEvent.press(screen.getByTestId('audio-mini-close'));
    expect(screen.queryByTestId('audio-mini-player')).toBeNull();
    expect(audioGateway.clear).toHaveBeenCalledTimes(1);
  });
});
