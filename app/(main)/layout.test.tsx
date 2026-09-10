import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  pathname: '/profil',
  embedded: false,
  replace: vi.fn(),
  prefetchQuery: vi.fn(),
  invalidateQueries: vi.fn(),
  removeChannel: vi.fn(),
  auth: {
    authMode: 'browser' as 'browser' | 'embedded',
    isAuthenticated: true,
    member: { id: 'member-a' } as any,
    contextError: null as string | null,
    isLoading: false,
    isAdmin: () => false,
    isSectionLeader: () => false,
    refreshChoirContext: vi.fn(),
  },
  navigateBack: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ prefetchQuery: mocks.prefetchQuery, invalidateQueries: mocks.invalidateQueries }),
}));
vi.mock('motion/react', () => ({ motion: { div: ({ children, ...props }: any) => <div {...props}>{children}</div> } }));
vi.mock('@/components/AuthProvider', () => ({ useAuth: () => mocks.auth }));
vi.mock('@/components/EmbeddedWebBridgeProvider', () => ({
  useEmbeddedWebBridge: () => ({ isEmbedded: mocks.embedded, navigateBack: mocks.navigateBack }),
}));
vi.mock('@/components/TopBar', () => ({ TopBar: () => <div>top bar</div> }));
vi.mock('@/components/BottomNav', () => ({ BottomNav: () => <div>bottom nav</div> }));
vi.mock('@/components/PageTransition', () => ({ PageTransition: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/components/NotificationPrompt', () => ({ NotificationPrompt: () => <div>notification prompt</div> }));
vi.mock('@/components/ProfileChangeRequestNotifier', () => ({ ProfileChangeRequestNotifier: () => <div>profile notifier</div> }));
vi.mock('@/components/FloatingMiniPlayer', () => ({ FloatingMiniPlayer: () => <div>mini player</div> }));
vi.mock('@/components/ChoirSelectionGate', () => ({ ChoirSelectionGate: () => <div>choir selection</div> }));
vi.mock('@/hooks/useTabSwipe', () => ({ useTabSwipe: () => ({ x: 0, handlers: {} }) }));
vi.mock('@/lib/repertuvar/cache', () => ({ getRepertoireRoleScope: () => 'member' }));
vi.mock('@/lib/repertuvar/queries', () => ({
  getRepertoireCatalogQueryKey: () => ['catalog'],
  loadRepertoireCatalog: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel: mocks.removeChannel,
  },
}));
vi.mock('@/lib/realtime', () => ({ createRealtimeTopic: (value: string) => value }));

import MainLayout from './layout';

const PERMANENT_ROUTES = [
  '/announcements',
  '/announcements/11111111-1111-4111-8111-111111111111',
  '/koristler',
  '/koristler/11111111-1111-4111-8111-111111111111',
  '/koristler/davetler',
  '/profil',
  '/profil/duzenle',
  '/profil/degisiklikler',
  '/devamsizlik?date=2030-01-02',
];

describe('MainLayout embedded boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = '/profil';
    mocks.embedded = false;
    Object.assign(mocks.auth, {
      authMode: 'browser',
      isAuthenticated: true,
      member: { id: 'member-a' },
      contextError: null,
      isLoading: false,
    });
  });

  it.each(PERMANENT_ROUTES)('renders the existing child but no duplicate browser shell for %s', (pathname) => {
    mocks.pathname = pathname.split('?')[0];
    mocks.embedded = true;
    Object.assign(mocks.auth, { authMode: 'embedded', isAuthenticated: true });

    render(<MainLayout><p>existing page child</p></MainLayout>);

    expect(screen.getByText('existing page child')).toBeInTheDocument();
    expect(screen.queryByText('top bar')).not.toBeInTheDocument();
    expect(screen.queryByText('bottom nav')).not.toBeInTheDocument();
    expect(screen.queryByText('mini player')).not.toBeInTheDocument();
    expect(screen.queryByText('notification prompt')).not.toBeInTheDocument();
    expect(screen.getByText('profile notifier')).toBeInTheDocument();
    expect(mocks.prefetchQuery).not.toHaveBeenCalled();
  });

  it('preserves the ordinary browser shell and browser-only login redirect', () => {
    const { rerender } = render(<MainLayout><p>browser page</p></MainLayout>);
    expect(screen.getByText('bottom nav')).toBeInTheDocument();
    expect(screen.getByText('mini player')).toBeInTheDocument();
    expect(screen.getByText('notification prompt')).toBeInTheDocument();

    Object.assign(mocks.auth, { isAuthenticated: false, member: null });
    rerender(<MainLayout><p>browser page</p></MainLayout>);
    expect(mocks.replace).toHaveBeenCalledWith('/login');
  });

  it('shows embedded retry/close instead of browser choir selection when member loading fails', () => {
    mocks.embedded = true;
    Object.assign(mocks.auth, {
      authMode: 'embedded',
      isAuthenticated: true,
      member: null,
      contextError: 'Gömülü koro bağlamı doğrulanamadı.',
    });

    render(<MainLayout><p>hidden page</p></MainLayout>);

    expect(screen.getByRole('alert')).toHaveTextContent('Gömülü koro bağlamı doğrulanamadı.');
    expect(screen.queryByText('choir selection')).not.toBeInTheDocument();
    screen.getByRole('button', { name: 'Kapat' }).click();
    expect(mocks.navigateBack).toHaveBeenCalledOnce();
  });
});
