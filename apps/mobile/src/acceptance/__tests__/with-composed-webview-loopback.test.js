const { requireGuardedComposedLoopback } = require('../with-composed-webview-loopback');

const valid = {
  GENOVA_033_ANDROID_LOOPBACK: '1',
  EXPO_PUBLIC_GENOVA_033_ACCEPTANCE: '1',
  EXPO_PUBLIC_GENOVA_033_APP_ORIGIN: 'http://127.0.0.1:18033',
  EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
};

describe('033 Android loopback plugin guard', () => {
  it('stays dormant without its native build flag', () => {
    expect(requireGuardedComposedLoopback({})).toBe(false);
  });

  it('accepts only the complete exact 033 environment', () => {
    expect(requireGuardedComposedLoopback(valid)).toBe(true);
    for (const override of [
      { EXPO_PUBLIC_GENOVA_033_ACCEPTANCE: undefined },
      { EXPO_PUBLIC_GENOVA_033_APP_ORIGIN: 'http://localhost:18033' },
      { EXPO_PUBLIC_GENOVA_033_APP_ORIGIN: 'http://127.0.0.1:18034' },
      { EXPO_PUBLIC_SUPABASE_URL: 'https://127.0.0.1:54321' },
      { EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54322' },
    ]) {
      expect(() => requireGuardedComposedLoopback({ ...valid, ...override })).toThrow();
    }
  });
});
