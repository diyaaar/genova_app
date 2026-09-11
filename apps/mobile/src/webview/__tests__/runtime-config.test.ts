import { APP_WEB_ORIGIN } from '@shared/mobile-webview-bridge';
import { createNativeWebViewRuntimeConfig, resolveNativeWebViewOrigin } from '../runtime-config';

describe('native WebView runtime configuration', () => {
  it('always selects production in release and accepts only explicit dev loopback origins', () => {
    expect(resolveNativeWebViewOrigin({
      isDevelopment: false,
      developmentOrigin: 'http://127.0.0.1:3000',
    })).toBe(APP_WEB_ORIGIN);
    expect(resolveNativeWebViewOrigin({
      isDevelopment: true,
      developmentOrigin: 'http://127.0.0.1:3000',
    })).toBe('http://127.0.0.1:3000');
    for (const value of [
      'https://127.0.0.1:3000',
      'http://example.test:3000',
      'http://localhost',
      'http://user@localhost:3000',
      'http://localhost:3000/path',
    ]) {
      expect(() => resolveNativeWebViewOrigin({ isDevelopment: true, developmentOrigin: value })).toThrow();
    }
  });

  it('validates the raw initial route before creating an absolute source', () => {
    expect(createNativeWebViewRuntimeConfig({
      initialPath: '/devamsizlik?date=2026-09-11',
      isDevelopment: false,
    })).toMatchObject({
      appOrigin: APP_WEB_ORIGIN,
      initialUrl: `${APP_WEB_ORIGIN}/devamsizlik?date=2026-09-11`,
      routeFamily: 'attendance',
    });

    for (const path of [
      '/', '/repertuvar', '/chat', '/login', '/unknown', '/%61nnouncements',
      '/devamsizlik?date=bad', '/announcements?x=1', 'https://evil.test/announcements',
    ]) {
      expect(() => createNativeWebViewRuntimeConfig({ initialPath: path, isDevelopment: false })).toThrow('route-not-allowed');
    }
  });
});
