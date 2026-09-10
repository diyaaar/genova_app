import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  embedded: false,
  navigateBack: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  setDirection: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, back: mocks.back }),
}));
vi.mock('@/store/useNavigationStore', () => ({
  useNavigationStore: (selector: (state: { setDirection: typeof mocks.setDirection }) => unknown) => (
    selector({ setDirection: mocks.setDirection })
  ),
}));
vi.mock('@/components/EmbeddedWebBridgeProvider', () => ({
  useEmbeddedWebBridge: () => ({ isEmbedded: mocks.embedded, navigateBack: mocks.navigateBack }),
}));

import { useBackOrHome } from './useBackOrHome';

describe('useBackOrHome bridge boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.embedded = false;
    window.history.replaceState({}, '', '/profil?returnTo=%2Fannouncements');
  });

  it('delegates embedded back to the validated WebView history owner', () => {
    mocks.embedded = true;
    const { result } = renderHook(() => useBackOrHome());

    act(() => result.current());

    expect(mocks.setDirection).toHaveBeenCalledWith('back');
    expect(mocks.navigateBack).toHaveBeenCalledOnce();
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(mocks.back).not.toHaveBeenCalled();
  });

  it('preserves the browser returnTo behavior outside embedded mode', () => {
    const { result } = renderHook(() => useBackOrHome());

    act(() => result.current());

    expect(mocks.replace).toHaveBeenCalledWith('/announcements');
    expect(mocks.navigateBack).not.toHaveBeenCalled();
  });
});
