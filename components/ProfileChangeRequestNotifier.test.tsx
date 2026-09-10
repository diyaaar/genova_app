import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  embedded: false,
  info: vi.fn(),
  removeChannel: vi.fn(),
  changeHandler: null as null | ((payload: unknown) => void),
  notification: vi.fn(),
}));

vi.mock('@/components/AuthProvider', () => ({
  useAuth: () => ({ member: { id: 'member-a' }, isChorist: () => true }),
}));
vi.mock('@/components/EmbeddedWebBridgeProvider', () => ({
  useEmbeddedWebBridge: () => ({ isEmbedded: mocks.embedded }),
}));
vi.mock('@/components/ToastProvider', () => ({
  useToast: () => ({ info: mocks.info }),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    channel: () => {
      const channel = {
        on: vi.fn((_event, _filter, handler) => {
          mocks.changeHandler = handler;
          return channel;
        }),
        subscribe: vi.fn(() => channel),
      };
      return channel;
    },
    removeChannel: mocks.removeChannel,
  },
}));

import { ProfileChangeRequestNotifier } from './ProfileChangeRequestNotifier';

const updatePayload = {
  old: { id: 'request-a', status: 'pending', reject_reason: null, reviewed_at: null },
  new: { id: 'request-a', status: 'approved', reject_reason: null, reviewed_at: '2030-01-01T00:00:00Z' },
};

describe('ProfileChangeRequestNotifier platform ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.embedded = false;
    mocks.changeHandler = null;
    const NotificationDouble = Object.assign(mocks.notification, { permission: 'granted' });
    vi.stubGlobal('Notification', NotificationDouble);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps the existing browser toast and foreground notification behavior', () => {
    render(<ProfileChangeRequestNotifier />);

    act(() => mocks.changeHandler?.(updatePayload));

    expect(mocks.info).toHaveBeenCalledWith('Profil değişiklik talebin onaylandı.', 'Profil Talebi');
    expect(mocks.notification).toHaveBeenCalledOnce();
  });

  it('keeps the in-page toast but leaves operating-system notifications to native while embedded', () => {
    mocks.embedded = true;
    render(<ProfileChangeRequestNotifier />);

    act(() => mocks.changeHandler?.(updatePayload));

    expect(mocks.info).toHaveBeenCalledOnce();
    expect(mocks.notification).not.toHaveBeenCalled();
  });
});
