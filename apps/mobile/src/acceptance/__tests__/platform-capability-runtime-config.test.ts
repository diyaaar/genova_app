import { readPlatformCapabilityRuntimeConfig } from '../platform-capability-runtime-config';

describe('032 platform capability runtime config', () => {
  it('accepts only the exact guarded loopback target', () => {
    expect(readPlatformCapabilityRuntimeConfig({
      EXPO_PUBLIC_GENOVA_032_ACCEPTANCE: '1',
      EXPO_PUBLIC_GENOVA_032_BASE_URL: 'http://127.0.0.1:18032/',
    })).toEqual({ baseUrl: 'http://127.0.0.1:18032' });
  });

  it.each([
    {},
    { EXPO_PUBLIC_GENOVA_032_ACCEPTANCE: '1', EXPO_PUBLIC_GENOVA_032_BASE_URL: 'https://127.0.0.1:18032/' },
    { EXPO_PUBLIC_GENOVA_032_ACCEPTANCE: '1', EXPO_PUBLIC_GENOVA_032_BASE_URL: 'http://localhost:18032/' },
    { EXPO_PUBLIC_GENOVA_032_ACCEPTANCE: '1', EXPO_PUBLIC_GENOVA_032_BASE_URL: 'http://127.0.0.1:9999/' },
    { EXPO_PUBLIC_GENOVA_032_ACCEPTANCE: '1', EXPO_PUBLIC_GENOVA_032_BASE_URL: 'http://127.0.0.1:18032/path' },
  ])('rejects unguarded or non-exact input %#', (environment) => {
    expect(() => readPlatformCapabilityRuntimeConfig(environment)).toThrow();
  });
});
