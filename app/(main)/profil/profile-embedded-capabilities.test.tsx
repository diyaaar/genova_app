import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  embedded: false,
  signOut: vi.fn(),
  requestTheme: vi.fn(),
  requestPassword: vi.fn(),
  setTheme: vi.fn(),
  routerPush: vi.fn(),
  member: {
    id: 'member-a',
    first_name: 'Ada',
    last_name: 'Lovelace',
    email: 'ada@example.invalid',
    voice_group: 'Soprano',
    sub_voice_group: null,
    about_text: null,
    join_date: null,
    photo_url: null,
  },
}));

vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('next/link', () => ({ default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a> }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.routerPush }) }));
vi.mock('next-themes', () => ({ useTheme: () => ({ resolvedTheme: 'dark', setTheme: mocks.setTheme }) }));
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, initial: _initial, animate: _animate, transition: _transition, ...props }: any) => <div {...props}>{children}</div>,
    form: ({ children, initial: _initial, animate: _animate, transition: _transition, ...props }: any) => <form {...props}>{children}</form>,
    section: ({ children, initial: _initial, animate: _animate, transition: _transition, ...props }: any) => <section {...props}>{children}</section>,
  },
}));
vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({
    member: mocks.member,
    user: { id: 'user-a' },
    roles: ['Korist'],
    signOut: mocks.signOut,
    isLoading: false,
  }),
}));
vi.mock('@/components/EmbeddedWebBridgeProvider', () => ({
  useEmbeddedWebBridge: () => ({
    isEmbedded: mocks.embedded,
    requestTheme: mocks.requestTheme,
    requestPasswordChange: mocks.requestPassword,
  }),
}));
vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));
vi.mock('@/components/SwipeBack', () => ({ SwipeBack: ({ children }: any) => <>{children}</> }));
vi.mock('@/lib/supabase', () => {
  const query: any = {
    select: vi.fn(() => query),
    order: vi.fn(async () => ({ data: [], error: null })),
  };
  return {
    supabase: { from: vi.fn(() => query) },
    browserSupabase: {
      auth: { signInWithPassword: vi.fn(), updateUser: vi.fn() },
    },
  };
});
vi.mock('@/lib/web-auth-capability', () => ({
  requireCurrentWebAccess: vi.fn().mockResolvedValue({ accessToken: 'token', userId: 'user-a' }),
}));

import ProfilePage from './page';
import ProfileEditPage from './duzenle/page';

describe('profile embedded capabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.embedded = false;
  });

  it('keeps ordinary browser theme behavior on the profile menu', () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Profil menüsünü aç' }));
    fireEvent.click(screen.getByRole('button', { name: /Tema/ }));

    expect(mocks.setTheme).toHaveBeenCalledWith('light');
    expect(mocks.requestTheme).not.toHaveBeenCalled();
  });

  it('delegates profile theme to native while embedded', () => {
    mocks.embedded = true;
    render(<ProfilePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Profil menüsünü aç' }));
    fireEvent.click(screen.getByRole('button', { name: /Tema/ }));

    expect(mocks.requestTheme).toHaveBeenCalledWith('light');
    expect(mocks.setTheme).not.toHaveBeenCalled();
  });

  it('preserves all three browser password fields', () => {
    render(<ProfileEditPage />);

    expect(screen.getByPlaceholderText('Mevcut şifreniz')).toHaveAttribute('type', 'password');
    expect(screen.getByPlaceholderText('En az 8 karakter')).toHaveAttribute('type', 'password');
    expect(screen.getByPlaceholderText('Yeni şifreyi tekrar girin')).toHaveAttribute('type', 'password');
    expect(screen.queryByRole('button', { name: 'Güvenli şifre ekranını aç' })).not.toBeInTheDocument();
  });

  it('renders no password fields and requests the native secure sheet while embedded', () => {
    mocks.embedded = true;
    render(<ProfileEditPage />);

    expect(document.querySelectorAll('input[type="password"]')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: 'Güvenli şifre ekranını aç' }));
    expect(mocks.requestPassword).toHaveBeenCalledOnce();
  });
});
