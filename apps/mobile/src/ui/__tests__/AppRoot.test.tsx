import { render, screen, waitFor, fireEvent } from '@testing-library/react-native';
import { AuthProvider } from '../../auth/AuthProvider';
import { AuthStore } from '../../auth/auth-store';
import { AppRoot } from '../AppRoot';
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

  await render(
    <AuthProvider store={store}>
      <AppRoot repertoireGateway={options.repertoireGateway} />
    </AuthProvider>,
  );
  return { store, gateway };
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

    fireEvent.press(screen.getByTestId('shell-open-repertoire'));
    expect(await screen.findByTestId('repertoire-screen')).toBeTruthy();
    expect(await screen.findByTestId('repertoire-empty')).toBeTruthy();

    fireEvent.press(screen.getByTestId('repertoire-back'));
    expect(await screen.findByTestId('shell-screen')).toBeTruthy();
  });
});
