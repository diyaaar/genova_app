import { act, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BRIDGE_CHANNEL, BRIDGE_VERSION } from '@/lib/mobile-webview-bridge';
import type { EmbeddedBootstrapEnvironment } from '@/lib/embedded-web-runtime';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CHOIR_ID = '22222222-2222-4222-8222-222222222222';
const MEMBER_ID = '33333333-3333-4333-8333-333333333333';
const INSTANCE_ID = 'instance_1234567890';
const ACCESS_TOKEN = 'header.payload.signature';

const mocks = vi.hoisted(() => ({
  browserGetSession: vi.fn(),
  browserOnAuth: vi.fn(),
  browserSignIn: vi.fn(),
  browserSignOut: vi.fn(),
  memberships: [] as any[],
  memberActive: true,
  setPreferred: vi.fn(),
  clearPreferred: vi.fn(),
  activate: vi.fn(),
  enter: vi.fn(),
  install: vi.fn().mockResolvedValue(undefined),
  clearEmbedded: vi.fn().mockResolvedValue(undefined),
  beginRenewal: vi.fn().mockReturnValue(true),
}));

vi.mock('@/lib/supabase', () => {
  function dataQuery(table: string) {
    const result = table === 'choir_members'
      ? {
          data: {
            id: '33333333-3333-4333-8333-333333333333',
            choir_id: '22222222-2222-4222-8222-222222222222',
            first_name: 'Ada',
            last_name: 'Lovelace',
            voice_group: 'Soprano',
            sub_voice_group: null,
            auth_user_id: '11111111-1111-4111-8111-111111111111',
            email: 'ada@example.invalid',
            phone: null,
            is_active: mocks.memberActive,
            photo_url: null,
            birth_date: null,
            join_date: null,
            school_id: null,
            department_id: null,
            favorite_song_id: null,
            about_text: null,
            linkedin_url: null,
            instagram_url: null,
            youtube_url: null,
            spotify_url: null,
            tiktok_url: null,
            x_url: null,
            schools: null,
            departments: null,
            repertoire: null,
          },
          error: null,
        }
      : { data: [{ roles: { name: 'Korist' } }], error: null };
    const query: any = {
      select: vi.fn(() => query),
      eq: vi.fn(() => query),
      maybeSingle: vi.fn(async () => result),
      then: (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) => Promise.resolve(result).then(resolve, reject),
    };
    return query;
  }
  const dataClient = {
    from: vi.fn((table: string) => dataQuery(table)),
    channel: vi.fn(() => {
      const channel: any = { on: vi.fn(() => channel), subscribe: vi.fn(() => channel) };
      return channel;
    }),
    removeChannel: vi.fn().mockResolvedValue(undefined),
  };
  return {
  supabase: dataClient,
  browserSupabase: {
    auth: {
      getSession: mocks.browserGetSession,
      onAuthStateChange: mocks.browserOnAuth,
      signInWithPassword: mocks.browserSignIn,
      signOut: mocks.browserSignOut,
    },
  },
  enterEmbeddedSupabaseMode: mocks.enter,
  installEmbeddedLease: mocks.install,
  clearEmbeddedSupabaseContext: mocks.clearEmbedded,
  beginEmbeddedLeaseRenewal: mocks.beginRenewal,
  setEmbeddedUnauthorizedHandler: vi.fn(() => vi.fn()),
  verifyEmbeddedSupabaseContext: vi.fn(),
  };
});
vi.mock('@/lib/choir-context', () => ({
  loadMyChoirs: vi.fn(async () => mocks.memberships),
  findCurrentChoir: (memberships: any[]) => {
    const current = memberships.filter((membership) => membership.is_current);
    return current.length === 1 ? current[0] : null;
  },
  findPreferredMembership: vi.fn(() => null),
  getPreferredChoirId: vi.fn(() => null),
  setPreferredChoirId: mocks.setPreferred,
  clearPreferredChoirId: mocks.clearPreferred,
  activateChoir: mocks.activate,
}));
vi.mock('next-themes', () => ({ useTheme: () => ({ setTheme: vi.fn() }) }));
vi.mock('@/components/ToastProvider', () => ({ useToast: () => ({ error: vi.fn() }) }));
vi.mock('@/lib/assignment-cache', () => ({ clearAssignmentCaches: vi.fn() }));
vi.mock('@/lib/chat-cache', () => ({ clearChatCaches: vi.fn() }));
vi.mock('@/lib/notification-cache', () => ({ clearMainNotificationCaches: vi.fn() }));
vi.mock('@/lib/repertuvar/cache', () => ({ clearRepertoireMetadataCaches: vi.fn() }));
vi.mock('@/lib/repertuvar/offline', () => ({ clearProtectedDriveFileCaches: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/drive-file-url', () => ({ clearProtectedDriveFileUrlCache: vi.fn() }));
vi.mock('@/lib/repertuvar/annotation-save-runtime', () => ({ annotationSaveQueue: { discardAll: vi.fn() } }));
vi.mock('@/lib/repertuvar/annotation-tenant-transition', () => ({ commitAnnotationTenantTransition: vi.fn() }));
vi.mock('@/lib/realtime', () => ({ createRealtimeTopic: (value: string) => value }));

import { EmbeddedWebBridgeProvider } from './EmbeddedWebBridgeProvider';
import { AuthProvider, useAuth } from './AuthProvider';

function Probe() {
  const auth = useAuth();
  return (
    <p>
      {auth.authMode}:{String(auth.isAuthenticated)}:{auth.user?.id ?? 'no-user'}:
      {auth.member?.id ?? 'no-member'}:{auth.activeChoir?.choir_id ?? 'no-choir'}
    </p>
  );
}

function mount(environment: EmbeddedBootstrapEnvironment, verifyContext?: (candidate: any) => Promise<any>) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <EmbeddedWebBridgeProvider environment={environment} verifyContext={verifyContext as any}>
        <AuthProvider><Probe /></AuthProvider>
      </EmbeddedWebBridgeProvider>
    </QueryClientProvider>,
  );
}

function incoming(type: string, payload: unknown, id: string) {
  return JSON.stringify({
    channel: BRIDGE_CHANNEL,
    version: BRIDGE_VERSION,
    id,
    instanceId: INSTANCE_ID,
    tenantEpoch: 2,
    type,
    payload,
  });
}

describe('AuthProvider embedded split', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.memberships = [{
      choir_id: CHOIR_ID,
      member_id: MEMBER_ID,
      choir_name: 'Genova',
      choir_slug: 'genova',
      member_is_active: true,
      is_current: true,
    }];
    mocks.memberActive = true;
    mocks.browserOnAuth.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mocks.browserGetSession.mockResolvedValue({
      data: { session: { user: { id: USER_ID }, access_token: 'browser-token' } },
      error: null,
    });
  });

  it('preserves ordinary browser Auth and preferred-choir behavior', async () => {
    mount({ href: 'https://app.genesinovachoir.com/profil', isTopFrame: true });

    expect(await screen.findByText(`browser:true:${USER_ID}:${MEMBER_ID}:${CHOIR_ID}`)).toBeInTheDocument();
    expect(mocks.browserGetSession).toHaveBeenCalledOnce();
    expect(mocks.browserOnAuth).toHaveBeenCalledOnce();
    expect(mocks.setPreferred).toHaveBeenCalledWith(USER_ID, CHOIR_ID);
    expect(mocks.enter).not.toHaveBeenCalled();
  });

  it('adopts only the proved embedded identity and never reads browser Auth or preferences', async () => {
    const postMessage = vi.fn();
    const environment: EmbeddedBootstrapEnvironment = {
      href: 'https://app.genesinovachoir.com/profil',
      isTopFrame: true,
      bridge: {
        injectedObjectJson: () => JSON.stringify({
          channel: BRIDGE_CHANNEL,
          instanceId: INSTANCE_ID,
          tenantEpoch: 2,
        }),
        postMessage,
      },
    };
    const verifyContext = vi.fn(async (value) => ({ ok: true, value }));
    mount(environment, verifyContext);
    await waitFor(() => expect(postMessage).toHaveBeenCalled());

    act(() => window.dispatchEvent(new MessageEvent('message', {
      data: incoming('bridge.challenge', { nonce: 'nonce_1234567890123456' }, 'challenge_1234567890'),
    })));
    act(() => window.dispatchEvent(new MessageEvent('message', {
      data: incoming('context.apply', {
        accessToken: ACCESS_TOKEN,
        expiresAt: Math.floor(Date.now() / 1000) + 600,
        userId: USER_ID,
        choirId: CHOIR_ID,
        memberId: MEMBER_ID,
      }, 'context_123456789012'),
    })));

    expect(await screen.findByText(`embedded:true:${USER_ID}:${MEMBER_ID}:${CHOIR_ID}`)).toBeInTheDocument();
    expect(mocks.browserGetSession).not.toHaveBeenCalled();
    expect(mocks.browserOnAuth).not.toHaveBeenCalled();
    expect(mocks.setPreferred).not.toHaveBeenCalled();
    expect(mocks.activate).not.toHaveBeenCalled();
  });

  it('does not recover or render a mismatched embedded membership', async () => {
    mocks.memberships = [{
      choir_id: '44444444-4444-4444-8444-444444444444',
      member_id: MEMBER_ID,
      choir_name: 'Other',
      choir_slug: 'other',
      member_is_active: true,
      is_current: true,
    }];
    const postMessage = vi.fn();
    mount({
      href: 'https://app.genesinovachoir.com/profil',
      isTopFrame: true,
      bridge: {
        injectedObjectJson: () => JSON.stringify({ channel: BRIDGE_CHANNEL, instanceId: INSTANCE_ID, tenantEpoch: 2 }),
        postMessage,
      },
    }, vi.fn(async (value) => ({ ok: true, value })));
    await waitFor(() => expect(postMessage).toHaveBeenCalled());
    act(() => window.dispatchEvent(new MessageEvent('message', {
      data: incoming('bridge.challenge', { nonce: 'nonce_1234567890123456' }, 'challenge_mismatch1'),
    })));
    act(() => window.dispatchEvent(new MessageEvent('message', {
      data: incoming('context.apply', {
        accessToken: ACCESS_TOKEN,
        expiresAt: Math.floor(Date.now() / 1000) + 600,
        userId: USER_ID,
        choirId: CHOIR_ID,
        memberId: MEMBER_ID,
      }, 'context_mismatch12'),
    })));

    expect(await screen.findByRole('alert')).toHaveTextContent('Koro oturumu değişti.');
    expect(screen.queryByText(/embedded:true/)).not.toBeInTheDocument();
    expect(postMessage.mock.calls.map(([raw]) => JSON.parse(raw).type)).toContain('bridge.error');
    expect(mocks.activate).not.toHaveBeenCalled();
    expect(mocks.setPreferred).not.toHaveBeenCalled();
  });

  it('invalidates the embedded lease when the exact member becomes inactive during detail loading', async () => {
    mocks.memberActive = false;
    const postMessage = vi.fn();
    mount({
      href: 'https://app.genesinovachoir.com/profil',
      isTopFrame: true,
      bridge: {
        injectedObjectJson: () => JSON.stringify({ channel: BRIDGE_CHANNEL, instanceId: INSTANCE_ID, tenantEpoch: 2 }),
        postMessage,
      },
    }, vi.fn(async (value) => ({ ok: true, value })));
    await waitFor(() => expect(postMessage).toHaveBeenCalled());
    act(() => window.dispatchEvent(new MessageEvent('message', {
      data: incoming('bridge.challenge', { nonce: 'nonce_1234567890123456' }, 'challenge_inactive1'),
    })));
    act(() => window.dispatchEvent(new MessageEvent('message', {
      data: incoming('context.apply', {
        accessToken: ACCESS_TOKEN,
        expiresAt: Math.floor(Date.now() / 1000) + 600,
        userId: USER_ID,
        choirId: CHOIR_ID,
        memberId: MEMBER_ID,
      }, 'context_inactive12'),
    })));

    expect(await screen.findByRole('alert')).toHaveTextContent('Koro oturumu değişti.');
    expect(screen.queryByText(/embedded:true/)).not.toBeInTheDocument();
  });
});
