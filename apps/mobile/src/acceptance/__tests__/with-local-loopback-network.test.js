const {
  requireGuardedLoopbackEnvironment,
} = require('../with-local-loopback-network');

describe('021 Android loopback network guard', () => {
  it('is inert unless the explicit acceptance flag is enabled', () => {
    expect(requireGuardedLoopbackEnvironment({})).toBe(false);
  });

  it.each([
    ['https://127.0.0.1:54321'],
    ['http://127.0.0.1:54322'],
    ['http://example.com:54321'],
  ])('refuses unsafe endpoint %s', (supabaseUrl) => {
    expect(() => requireGuardedLoopbackEnvironment({
      GENOVA_021_ANDROID_LOOPBACK: '1',
      EXPO_PUBLIC_SUPABASE_URL: supabaseUrl,
    })).toThrow();
  });

  it('accepts only the disposable loopback endpoint', () => {
    expect(requireGuardedLoopbackEnvironment({
      GENOVA_021_ANDROID_LOOPBACK: '1',
      EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    })).toBe(true);
  });
});
