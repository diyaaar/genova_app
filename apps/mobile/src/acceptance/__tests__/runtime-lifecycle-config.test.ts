import { readRuntimeLifecycleConfig } from '../runtime-lifecycle-config';

const valid = {
  EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'local-public-key',
  EXPO_PUBLIC_GENOVA_021_EMAIL: '021-mobile-run@example.invalid',
  EXPO_PUBLIC_GENOVA_021_PASSWORD: 'local-only-password',
  EXPO_PUBLIC_GENOVA_021_CHOIR_A: '11111111-1111-4111-8111-111111111111',
  EXPO_PUBLIC_GENOVA_021_CHOIR_B: '22222222-2222-4222-8222-222222222222',
  EXPO_PUBLIC_GENOVA_021_FILE_ID: '33333333-3333-4333-8333-333333333333',
};

describe('021 runtime lifecycle config guard', () => {
  it('accepts only the exact loopback runtime and synthetic fixture shape', () => {
    expect(readRuntimeLifecycleConfig(valid)).toMatchObject({
      supabaseUrl: 'http://127.0.0.1:54321',
      email: '021-mobile-run@example.invalid',
    });
  });

  it.each([
    ['hosted URL', { EXPO_PUBLIC_SUPABASE_URL: 'https://hievmwwctjjlhmssoxsu.supabase.co' }],
    ['non-loopback HTTP', { EXPO_PUBLIC_SUPABASE_URL: 'http://192.168.1.10:54321' }],
    ['real-looking email', { EXPO_PUBLIC_GENOVA_021_EMAIL: 'person@example.com' }],
    ['same choir', { EXPO_PUBLIC_GENOVA_021_CHOIR_B: valid.EXPO_PUBLIC_GENOVA_021_CHOIR_A }],
    ['invalid file id', { EXPO_PUBLIC_GENOVA_021_FILE_ID: 'not-a-uuid' }],
  ])('refuses %s', (_label, change) => {
    expect(() => readRuntimeLifecycleConfig({ ...valid, ...change })).toThrow();
  });
});
