const {
  requireGuardedPlatformCapabilityLoopback,
} = require('../with-platform-capability-loopback');

describe('032 Android loopback network guard', () => {
  it('is inert unless the explicit acceptance flag is enabled', () => {
    expect(requireGuardedPlatformCapabilityLoopback({})).toBe(false);
  });

  it.each([
    ['https://127.0.0.1:18032'],
    ['http://127.0.0.1:18033'],
    ['http://localhost:18032'],
    ['http://example.com:18032'],
    ['http://127.0.0.1:18032/path'],
  ])('refuses unsafe endpoint %s', (baseUrl) => {
    expect(() => requireGuardedPlatformCapabilityLoopback({
      GENOVA_032_ANDROID_LOOPBACK: '1',
      EXPO_PUBLIC_GENOVA_032_BASE_URL: baseUrl,
    })).toThrow();
  });

  it('accepts only the disposable loopback endpoint', () => {
    expect(requireGuardedPlatformCapabilityLoopback({
      GENOVA_032_ANDROID_LOOPBACK: '1',
      EXPO_PUBLIC_GENOVA_032_BASE_URL: 'http://127.0.0.1:18032',
    })).toBe(true);
  });
});
