import { readComposedWebViewRuntimeConfig } from '../composed-webview-runtime-config';

const LOCAL_ANON_KEY = [
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
  'eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24ifQ',
  'local-signature',
].join('.');

function validEnvironment(overrides: Record<string, string | undefined> = {}) {
  return {
    EXPO_PUBLIC_GENOVA_033_ACCEPTANCE: '1',
    EXPO_PUBLIC_GENOVA_033_APP_ORIGIN: 'http://127.0.0.1:18033',
    EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
    EXPO_PUBLIC_SUPABASE_ANON_KEY: LOCAL_ANON_KEY,
    EXPO_PUBLIC_GENOVA_033_EMAIL: '033-composed-test@example.invalid',
    EXPO_PUBLIC_GENOVA_033_PASSWORD: 'synthetic-only',
    EXPO_PUBLIC_GENOVA_033_CHORIST_EMAIL: '033-chorist-test@example.invalid',
    EXPO_PUBLIC_GENOVA_033_CHORIST_PASSWORD: 'synthetic-chorist-only',
    EXPO_PUBLIC_GENOVA_033_CHOIR_A: '11111111-1111-4111-8111-111111111111',
    EXPO_PUBLIC_GENOVA_033_CHOIR_B: '22222222-2222-4222-8222-222222222222',
    EXPO_PUBLIC_GENOVA_033_MEMBER_A: '33333333-3333-4333-8333-333333333333',
    EXPO_PUBLIC_GENOVA_033_TARGET_MEMBER: '44444444-4444-4444-8444-444444444444',
    EXPO_PUBLIC_GENOVA_033_ANNOUNCEMENT_ID: '55555555-5555-4555-8555-555555555555',
    ...overrides,
  };
}

describe('033 composed WebView runtime config', () => {
  it('creates an exact local WebView runtime only under the guarded synthetic environment', () => {
    expect(readComposedWebViewRuntimeConfig(validEnvironment())).toMatchObject({
      appOrigin: 'http://127.0.0.1:18033',
      supabaseUrl: 'http://127.0.0.1:54321',
      email: '033-composed-test@example.invalid',
      choristEmail: '033-chorist-test@example.invalid',
      targetMember: '44444444-4444-4444-8444-444444444444',
      announcementId: '55555555-5555-4555-8555-555555555555',
      webView: {
        initialUrl: 'http://127.0.0.1:18033/announcements',
        routeFamily: 'announcements',
        routePolicy: {
          protectedFileOrigins: ['http://127.0.0.1:54321'],
        },
      },
    });
  });

  it.each([
    ['missing flag', { EXPO_PUBLIC_GENOVA_033_ACCEPTANCE: undefined }],
    ['hosted app', { EXPO_PUBLIC_GENOVA_033_APP_ORIGIN: 'https://app.genesinovachoir.com' }],
    ['wrong app port', { EXPO_PUBLIC_GENOVA_033_APP_ORIGIN: 'http://127.0.0.1:18034' }],
    ['hosted service', { EXPO_PUBLIC_SUPABASE_URL: 'https://example.supabase.co' }],
    ['wrong service port', { EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54322' }],
    ['non-local JWT', { EXPO_PUBLIC_SUPABASE_ANON_KEY: 'a.eyJpc3MiOiJob3N0ZWQiLCJyb2xlIjoiYW5vbiJ9.c' }],
    ['real-looking account', { EXPO_PUBLIC_GENOVA_033_EMAIL: 'person@example.com' }],
    ['real-looking chorist', { EXPO_PUBLIC_GENOVA_033_CHORIST_EMAIL: 'person@example.com' }],
    ['invalid fixture', { EXPO_PUBLIC_GENOVA_033_CHOIR_A: 'not-a-uuid' }],
    ['same choirs', { EXPO_PUBLIC_GENOVA_033_CHOIR_B: '11111111-1111-4111-8111-111111111111' }],
  ])('refuses %s before returning a runtime', (_label, override) => {
    expect(() => readComposedWebViewRuntimeConfig(validEnvironment(override))).toThrow();
  });
});
