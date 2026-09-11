import { createMemoryKeyValueStore } from '../../test/doubles';
import { createNativeThemePreferenceStore, resolveNativeTheme } from '../theme-preference';

describe('native WebView theme preference', () => {
  it('persists only the exact preference and resolves system safely', async () => {
    const storage = createMemoryKeyValueStore();
    const store = createNativeThemePreferenceStore(storage);
    expect(await store.load()).toBe('system');
    await store.save('light');
    expect(await store.load()).toBe('light');
    expect(resolveNativeTheme('system', 'light')).toBe('light');
    expect(resolveNativeTheme('system', null)).toBe('dark');
  });

  it('falls back to system when storage is unavailable or malformed', async () => {
    const unavailable = createNativeThemePreferenceStore(createMemoryKeyValueStore({ throwOnAccess: true }));
    await expect(unavailable.load()).resolves.toBe('system');

    const storage = createMemoryKeyValueStore();
    storage.entries.set('genova.webview-theme', 'sepia');
    await expect(createNativeThemePreferenceStore(storage).load()).resolves.toBe('system');
  });
});
