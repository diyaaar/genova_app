import { describe, expect, it } from 'vitest';

import { activateEmbeddedRuntime } from '@/lib/embedded-web-runtime';
import { isRepertoireOfflineSupported, isRepertoireRuntimeCacheSupported } from '@/lib/repertuvar/offline';

describe('embedded repertoire cache isolation', () => {
  it('disables service-worker and Cache Storage paths after embedded mode is detected', () => {
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register: () => undefined },
    });
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: {},
    });

    expect(isRepertoireOfflineSupported()).toBe(true);
    expect(isRepertoireRuntimeCacheSupported()).toBe(true);

    activateEmbeddedRuntime();

    expect(isRepertoireOfflineSupported()).toBe(false);
    expect(isRepertoireRuntimeCacheSupported()).toBe(false);
  });
});
