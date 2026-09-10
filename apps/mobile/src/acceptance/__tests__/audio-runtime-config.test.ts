import { readAudioRuntimeAcceptanceConfig } from '../audio-runtime-config';

describe('026 audio runtime config', () => {
  it('accepts only the exact guarded loopback target', () => {
    expect(readAudioRuntimeAcceptanceConfig({
      EXPO_PUBLIC_GENOVA_026_ACCEPTANCE: '1',
      EXPO_PUBLIC_GENOVA_026_AUDIO_URL: 'http://127.0.0.1:18026/',
    })).toEqual({ baseUrl: 'http://127.0.0.1:18026' });
  });

  it.each([
    {},
    { EXPO_PUBLIC_GENOVA_026_ACCEPTANCE: '1', EXPO_PUBLIC_GENOVA_026_AUDIO_URL: 'https://example.com/' },
    { EXPO_PUBLIC_GENOVA_026_ACCEPTANCE: '1', EXPO_PUBLIC_GENOVA_026_AUDIO_URL: 'http://localhost:18026/' },
    { EXPO_PUBLIC_GENOVA_026_ACCEPTANCE: '1', EXPO_PUBLIC_GENOVA_026_AUDIO_URL: 'http://127.0.0.1:9999/' },
  ])('rejects unguarded or non-exact input %#', (environment) => {
    expect(() => readAudioRuntimeAcceptanceConfig(environment)).toThrow();
  });
});
