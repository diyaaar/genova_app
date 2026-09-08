import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseAnnotationItems } from '@shared/repertuvar/annotation-types';
import type { RepertoireFile, RepertoireSong } from '@shared/repertuvar/catalog-core';
import { AuthProvider } from '../../auth/AuthProvider';
import { AuthStore } from '../../auth/auth-store';
import { resetTenantCacheRegistry } from '../../auth/tenant-cache';
import type { NativeRepertoireCatalog, NativeRepertoireGateway } from '../../repertoire/catalog-gateway';
import type { NativeScoreReaderGateway } from '../../repertoire/reader-contract';
import {
  CHOIR_A,
  CHOIR_B,
  createClientDouble,
  createGatewayDouble,
  createPreferenceDouble,
  membership,
  sessionFor,
} from '../../test/doubles';
import { AppRoot } from '../AppRoot';

const FILE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const scoreFile: RepertoireFile = {
  id: FILE_ID,
  song_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  file_name: 'sentetik-40-sayfa.pdf',
  file_type: 'sheet',
  partition_label: 'Alto',
  drive_file_id: 'provider-id-must-not-be-used',
  drive_web_view_link: 'https://provider.invalid/view',
  drive_download_link: 'https://provider.invalid/download',
  mime_type: 'application/pdf',
  file_size_bytes: 65_905,
  uploaded_by: null,
  created_at: '2026-09-08T00:00:00Z',
  updated_at: '2026-09-08T00:00:00Z',
};

function catalogueForA(): NativeRepertoireCatalog {
  const song: RepertoireSong = {
    id: scoreFile.song_id,
    title: 'Koro A Sentetik Eseri',
    composer: 'Test Bestecisi',
    drive_folder_id: null,
    is_visible: true,
    created_at: '2026-09-08T00:00:00Z',
    files: [scoreFile],
    tags: [],
  };
  return {
    version: 1,
    versionUpdatedAt: '2026-09-08T00:00:00Z',
    cachedAt: 1,
    songs: [song],
    tags: [],
    userParts: { [song.id]: 'Alto' },
    assignedSongIds: [song.id],
    roleScope: 'chorist',
    scopeKey: `${CHOIR_A}:33333333-3333-4333-8333-333333333333:chorist`,
  };
}

function catalogueForB(): NativeRepertoireCatalog {
  return {
    version: 1,
    versionUpdatedAt: '2026-09-08T00:00:00Z',
    cachedAt: 2,
    songs: [],
    tags: [],
    userParts: {},
    assignedSongIds: [],
    roleScope: 'chorist',
    scopeKey: `${CHOIR_B}:44444444-4444-4444-8444-444444444444:chorist`,
  };
}

describe('017 non-hardware native read flow', () => {
  beforeEach(() => resetTenantCacheRegistry());

  it('crosses sign-in, choir selection, catalogue, recovered PDF read, tenant switch and sign-out', async () => {
    const calls: string[] = [];
    const memberships = [
      membership(),
      membership({
        choir_id: CHOIR_B,
        member_id: '44444444-4444-4444-8444-444444444444',
        choir_name: 'Genova B',
        choir_slug: 'genova-b',
      }),
    ];
    const client = createClientDouble({ memberships, activeChoirId: null, calls });
    const auth = createGatewayDouble({ initialSession: null });
    const store = new AuthStore({
      client: client.client,
      auth: auth.gateway,
      preferences: createPreferenceDouble(),
    });

    const repertoireGateway: NativeRepertoireGateway = {
      load: jest.fn(async ({ choirId }) => {
        calls.push(`catalogue:load:${choirId}`);
        return choirId === CHOIR_A ? catalogueForA() : catalogueForB();
      }),
      clear: jest.fn(async () => { calls.push('catalogue:clear'); }),
    };

    const fixtureRows = JSON.parse(readFileSync(
      join(__dirname, '../../repertoire/__fixtures__/annotations.sample.json'),
      'utf8',
    )) as Array<{ page_number: number; annotations_json: unknown }>;
    const pageOne = parseAnnotationItems(fixtureRows[0]?.annotations_json);
    const readerGateway: NativeScoreReaderGateway = {
      open: jest.fn()
        .mockRejectedValueOnce(new Error('Sentetik indirme kesildi.'))
        .mockImplementation(async ({ choirId, file }: { choirId: string; file: RepertoireFile }) => {
          calls.push(`reader:open:${choirId}:${file.id}`);
          return {
            choirId,
            fileId: file.id,
            fileName: file.file_name,
            uri: `file:///private/${choirId}/${file.id}.pdf`,
            pageCount: 40,
            annotations: {
              byPage: { 1: [{ layerKey: 'personal' as const, items: pageOne.items }] },
              skippedCount: pageOne.skippedCount,
            },
          };
        }),
      renderWindow: jest.fn(async (document, pageNumber) => ({
        currentPage: pageNumber,
        pages: {
          [pageNumber]: {
            uri: `file:///rendered/${document.fileId}-${pageNumber}.jpg`,
            width: 595,
            height: 842,
          },
        },
      })),
      close: jest.fn(async (uri) => { calls.push(`reader:close:${uri}`); }),
      clear: jest.fn(async () => { calls.push('reader:clear'); }),
    };

    await render(
      <AuthProvider store={store}>
        <AppRoot repertoireGateway={repertoireGateway} readerGateway={readerGateway} />
      </AuthProvider>,
    );

    expect(await screen.findByTestId('sign-in-screen')).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('sign-in-email'), 'synthetic@example.test');
    await fireEvent.changeText(screen.getByTestId('sign-in-password'), 'local-only');
    await fireEvent.press(screen.getByTestId('sign-in-submit'));
    await waitFor(() => expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'synthetic@example.test',
      password: 'local-only',
    }));
    expect(screen.getByTestId('sign-in-screen')).toBeTruthy();

    await act(async () => { auth.emit(sessionFor()); });
    expect(await screen.findByTestId('choir-select-screen')).toBeTruthy();
    expect(screen.queryByTestId('shell-screen')).toBeNull();

    await fireEvent.press(screen.getByTestId(`choir-option-${CHOIR_A}`));
    expect(await screen.findByTestId('shell-active-choir')).toHaveTextContent('Genova A');
    await fireEvent.press(screen.getByTestId('shell-open-repertoire'));
    expect(await screen.findByText('Koro A Sentetik Eseri')).toBeTruthy();
    await fireEvent.press(screen.getByTestId(`repertoire-open-score-${FILE_ID}`));

    expect(await screen.findByText('Sentetik indirme kesildi.')).toBeTruthy();
    expect(screen.queryByTestId('score-reader-page-1')).toBeNull();
    await fireEvent.press(screen.getByTestId('score-reader-open-retry'));
    expect(await screen.findByTestId('score-reader-page-1')).toBeTruthy();
    expect(screen.getByTestId('score-reader-counter')).toHaveTextContent('1 / 40');
    expect(screen.getByText(/Metin notu/)).toBeTruthy();
    expect(screen.queryByText('Kalem')).toBeNull();
    expect((readerGateway as NativeScoreReaderGateway & { save?: unknown }).save).toBeUndefined();

    await fireEvent.press(screen.getByTestId('score-reader-back'));
    expect(await screen.findByTestId('repertoire-screen')).toBeTruthy();
    await waitFor(() => expect(readerGateway.close).toHaveBeenCalled());
    await fireEvent.press(screen.getByTestId('repertoire-back'));
    await fireEvent.press(screen.getByTestId('shell-switch-choir'));
    expect(await screen.findByTestId('choir-select-screen')).toBeTruthy();

    const switchStart = calls.length;
    await fireEvent.press(screen.getByTestId(`choir-option-${CHOIR_B}`));
    expect(await screen.findByTestId('shell-active-choir')).toHaveTextContent('Genova B');
    const switchCalls = calls.slice(switchStart);
    expect(switchCalls.filter((call) => call === 'catalogue:clear')).toHaveLength(1);
    expect(switchCalls.filter((call) => call === 'reader:clear')).toHaveLength(1);
    expect(switchCalls.indexOf('catalogue:clear')).toBeGreaterThanOrEqual(0);
    expect(switchCalls.indexOf('reader:clear')).toBeGreaterThanOrEqual(0);
    expect(switchCalls.indexOf('catalogue:clear')).toBeLessThan(switchCalls.indexOf('rpc:set_active_choir'));
    expect(switchCalls.indexOf('reader:clear')).toBeLessThan(switchCalls.indexOf('rpc:set_active_choir'));

    await fireEvent.press(screen.getByTestId('shell-open-repertoire'));
    expect(await screen.findByTestId('repertoire-empty')).toBeTruthy();
    expect(screen.queryByText('Koro A Sentetik Eseri')).toBeNull();
    expect(calls.indexOf(`rpc:set_active_choir`)).toBeLessThan(calls.lastIndexOf(`catalogue:load:${CHOIR_B}`));

    const signOutStart = calls.length;
    await fireEvent.press(screen.getByTestId('repertoire-sign-out'));
    expect(await screen.findByTestId('sign-in-screen')).toBeTruthy();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
    const signOutCalls = calls.slice(signOutStart);
    expect(signOutCalls.filter((call) => call === 'catalogue:clear')).toHaveLength(1);
    expect(signOutCalls.filter((call) => call === 'reader:clear')).toHaveLength(1);
  });
});
