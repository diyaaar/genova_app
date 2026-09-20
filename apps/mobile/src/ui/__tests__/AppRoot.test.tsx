import { act, render, screen, waitFor, fireEvent } from '@testing-library/react-native';
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
import type { NativeNotificationGateway, NativeNotificationResponse } from '../../notifications/notification-gateway';
import type { NativeChatReadGateway } from '../../chat/chat-read-gateway';
import type { NativeChatSendGateway } from '../../chat/chat-send-gateway';
import type { NativeChatMessageActionGateway } from '../../chat/chat-message-action-gateway';
import { clearTenantCaches } from '../../auth/tenant-cache';

async function renderWithStore(options: {
  memberships?: ReturnType<typeof membership>[];
  activeChoirId?: string | null;
  initialSession?: ReturnType<typeof sessionFor> | null;
  signInError?: { message: string } | null;
  sessionReadFailsOnce?: boolean;
  repertoireGateway?: NativeRepertoireGateway;
  audioGateway?: NativeAudioSourceGateway;
  notificationGateway?: NativeNotificationGateway;
  chatGateway?: NativeChatReadGateway;
  chatSendGateway?: NativeChatSendGateway;
  chatActionGateway?: NativeChatMessageActionGateway;
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
  if (options.sessionReadFailsOnce) {
    jest.spyOn(gateway.gateway, 'getSession').mockRejectedValueOnce(new Error('private storage error'));
  }

  const root = (
    <AuthProvider store={store}>
      <AppRoot
        repertoireGateway={options.repertoireGateway}
        audioGateway={options.audioGateway}
        notificationGateway={options.notificationGateway}
        chatGateway={options.chatGateway}
        chatSendGateway={options.chatSendGateway ?? {
          prepare: jest.fn(async () => { throw new Error('unexpected chat send'); }),
          transmit: jest.fn(async () => { throw new Error('unexpected chat send'); }),
          restore: jest.fn(async () => []),
          reconcile: jest.fn(async () => []),
          cancel: jest.fn(async () => []),
          clear: jest.fn(async () => {}),
        }}
        chatActionGateway={options.chatActionGateway ?? {
          copy: jest.fn(async () => {}),
          edit: jest.fn(async (_scope, message, content) => ({ messageId: message.id, content })),
          deleteForEveryone: jest.fn(async (_scope, message) => ({ messageId: message.id })),
          hideForSelf: jest.fn(async (_scope, message) => ({ messageId: message.id, hiddenId: message.id })),
          clear: jest.fn(async () => {}),
        }}
      />
    </AuthProvider>
  );
  const view = await render(root);
  return { store, gateway, view, root };
}

describe('shell routing', () => {
  function preparedNotificationGateway(initial: NativeNotificationResponse | null): NativeNotificationGateway & {
    clearInitialResponse: jest.Mock;
    requestPermission: jest.Mock;
    unsubscribe: jest.Mock;
    emit(response: NativeNotificationResponse): void;
  } {
    let listener: ((response: NativeNotificationResponse) => void) | null = null;
    const unsubscribe = jest.fn();
    return {
      getPermissionState: jest.fn(async () => 'undetermined' as const),
      requestPermission: jest.fn(async () => 'denied' as const),
      getInitialResponse: jest.fn(() => initial),
      clearInitialResponse: jest.fn(),
      subscribeToResponses: jest.fn((next) => {
        listener = next;
        return unsubscribe;
      }),
      unsubscribe,
      emit(response) {
        listener?.(response);
      },
    };
  }

  it('shows a safe startup error and retries before opening tenant content', async () => {
    await renderWithStore({ sessionReadFailsOnce: true, activeChoirId: CHOIR_A });
    expect(await screen.findByTestId('context-error-screen')).toBeTruthy();
    expect(screen.getByText('Oturum açılamadı')).toBeTruthy();
    expect(screen.queryByText('private storage error')).toBeNull();
    expect(screen.queryByTestId('shell-screen')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Tekrar dene' }));
    expect(await screen.findByTestId('shell-active-choir')).toHaveTextContent('Genova A');
  });

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

  it('opens the native chat list from the ready shell and returns without a web route', async () => {
    const chatGateway: NativeChatReadGateway = {
      loadRooms: jest.fn(async () => []),
      loadMessages: jest.fn(async () => { throw new Error('unexpected room load'); }),
      markRoomRead: jest.fn(async () => {}),
      watchRoomList: jest.fn(() => jest.fn()),
      watchRoom: jest.fn(() => jest.fn()),
      clear: jest.fn(),
    };
    await renderWithStore({ chatGateway });
    await screen.findByTestId('shell-screen');

    await fireEvent.press(screen.getByTestId('shell-open-chat'));
    expect(await screen.findByTestId('chat-list-screen')).toBeTruthy();
    expect(await screen.findByTestId('chat-rooms-empty')).toBeTruthy();
    expect(screen.queryByTestId('native-webview-screen')).toBeNull();

    await fireEvent.press(screen.getByTestId('chat-back'));
    expect(await screen.findByTestId('shell-screen')).toBeTruthy();
  });

  it('registers an injected protected chat send queue for tenant cleanup', async () => {
    const chatSendGateway: NativeChatSendGateway = {
      prepare: jest.fn(async () => { throw new Error('unexpected chat send'); }),
      transmit: jest.fn(async () => { throw new Error('unexpected chat send'); }),
      restore: jest.fn(async () => []),
      reconcile: jest.fn(async () => []),
      cancel: jest.fn(async () => []),
      clear: jest.fn(async () => {}),
    };
    const chatActionGateway: NativeChatMessageActionGateway = {
      copy: jest.fn(async () => {}),
      edit: jest.fn(async (_scope, message, content) => ({ messageId: message.id, content })),
      deleteForEveryone: jest.fn(async (_scope, message) => ({ messageId: message.id })),
      hideForSelf: jest.fn(async (_scope, message) => ({ messageId: message.id, hiddenId: message.id })),
      clear: jest.fn(async () => {}),
    };
    await renderWithStore({ chatSendGateway, chatActionGateway });
    await screen.findByTestId('shell-screen');

    await clearTenantCaches();

    expect(chatSendGateway.clear).toHaveBeenCalledTimes(1);
    expect(chatActionGateway.clear).toHaveBeenCalledTimes(1);
  });

  it('consumes a cold notification only after auth and opens the exact accessible repertoire song', async () => {
    const songId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
    const notificationGateway = preparedNotificationGateway({
      data: {
        type: 'repertoire_assignment_created',
        songId,
        partName: 'Alto',
        notificationId: '123e4567-e89b-42d3-a456-426614174000',
        at: '2026-09-19T08:00:00Z',
      },
    });
    const repertoireGateway: NativeRepertoireGateway = {
      load: jest.fn(async (): Promise<import('../../repertoire/catalog-gateway').NativeRepertoireCatalog> => ({
        version: 1,
        versionUpdatedAt: null,
        cachedAt: 1,
        songs: [{
          id: songId,
          title: 'Bildirim Eseri',
          composer: null,
          drive_folder_id: null,
          is_visible: true,
          created_at: '2026-09-19T00:00:00Z',
          files: [],
          tags: [],
        }],
        tags: [],
        userParts: { [songId]: 'Alto' },
        assignedSongIds: [songId],
        roleScope: 'chorist',
        scopeKey: `${CHOIR_A}:33333333-3333-4333-8333-333333333333:chorist`,
      })),
      clear: jest.fn(),
    };

    await renderWithStore({ repertoireGateway, notificationGateway });
    expect(await screen.findByTestId('repertoire-notification-target')).toBeTruthy();
    expect(screen.getByTestId(`repertoire-song-${songId}`)).toBeTruthy();
    expect(notificationGateway.clearInitialResponse).toHaveBeenCalledTimes(1);
  });

  it('requests permission only after the signed-in user presses the shell control', async () => {
    const notificationGateway = preparedNotificationGateway(null);
    await renderWithStore({ notificationGateway });
    expect(await screen.findByTestId('shell-notification-card')).toBeTruthy();
    expect(notificationGateway.requestPermission).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('shell-request-notification-permission'));
    await waitFor(() => expect(notificationGateway.requestPermission).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('shell-notification-message'))
      .toHaveTextContent(/Bildirim izni verilmedi/u);
  });

  it('keeps a permission adapter failure visible and retryable', async () => {
    const notificationGateway = preparedNotificationGateway(null);
    notificationGateway.requestPermission.mockRejectedValueOnce(new Error('native unavailable'));
    await renderWithStore({ notificationGateway });
    await screen.findByTestId('shell-notification-card');

    await fireEvent.press(screen.getByTestId('shell-request-notification-permission'));
    expect(await screen.findByTestId('shell-notification-message'))
      .toHaveTextContent(/Bildirim izni kontrol edilemedi/u);
    expect(screen.getByTestId('shell-request-notification-permission')).toBeTruthy();
  });

  it('routes a live response and removes its listener when sign-out unmounts the ready shell', async () => {
    const announcementId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
    const notificationGateway = preparedNotificationGateway(null);
    const { store } = await renderWithStore({ notificationGateway });
    await screen.findByTestId('shell-screen');

    await act(async () => notificationGateway.emit({
      data: {
        type: 'announcement_published',
        announcementId,
        notificationId: '123e4567-e89b-42d3-a456-426614174000',
        at: '2026-09-19T08:00:00Z',
      },
    }));
    expect(await screen.findByTestId('native-webview-screen')).toBeTruthy();

    const webViewMock = jest.requireMock('react-native-webview') as {
      __getLatestProps(): { source?: { uri?: string } } | null;
    };
    expect(webViewMock.__getLatestProps()?.source?.uri)
      .toBe(`https://app.genesinovachoir.com/announcements/${announcementId}`);

    await act(async () => store.signOut());
    await waitFor(() => expect(notificationGateway.unsubscribe).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('sign-in-screen')).toBeTruthy();
  });

  it('opens a permanent web-owned destination behind the native locked shell', async () => {
    await renderWithStore({});
    await screen.findByTestId('shell-screen');

    await fireEvent.press(screen.getByTestId('shell-open-web-announcements'));

    expect(await screen.findByTestId('native-webview-screen')).toBeTruthy();
    expect(screen.getByTestId('permanent-webview')).toBeTruthy();
    expect(screen.getByTestId('webview-locked')).toBeTruthy();
    expect(screen.queryByTestId('shell-screen')).toBeNull();
  });

  it('routes a cold web notification to its canonical permanent WebView path', async () => {
    const announcementId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
    const notificationGateway = preparedNotificationGateway({
      data: {
        type: 'announcement_published',
        announcementId,
        notificationId: '123e4567-e89b-42d3-a456-426614174000',
        at: '2026-09-19T08:00:00Z',
      },
    });

    await renderWithStore({ notificationGateway });
    expect(await screen.findByTestId('native-webview-screen')).toBeTruthy();
    const webViewMock = jest.requireMock('react-native-webview') as {
      __getLatestProps(): { source?: { uri?: string } } | null;
    };
    expect(webViewMock.__getLatestProps()?.source?.uri)
      .toBe(`https://app.genesinovachoir.com/announcements/${announcementId}`);
  });

  it('fails visibly instead of falling back for an unavailable assignment notification', async () => {
    const notificationGateway = preparedNotificationGateway({
      data: {
        type: 'assignment_created',
        assignmentId: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
        notificationId: '123e4567-e89b-42d3-a456-426614174000',
        at: '2026-09-19T08:00:00Z',
      },
    });

    await renderWithStore({ notificationGateway });
    expect(await screen.findByTestId('notification-route-error')).toBeTruthy();
    expect(screen.getByText('Bu bildirim hedefi mobil uygulamada henüz kullanılamıyor.')).toBeTruthy();
    expect(screen.queryByTestId('shell-screen')).toBeNull();
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
