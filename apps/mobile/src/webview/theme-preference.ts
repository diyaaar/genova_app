import { Appearance, type ColorSchemeName } from 'react-native';
import type { SecureKeyValueStore } from '../auth/types';

export type NativeThemePreference = 'light' | 'dark' | 'system';
export type ResolvedNativeTheme = 'light' | 'dark';

const THEME_KEY = 'genova.webview-theme';

export interface NativeThemeState {
  preference: NativeThemePreference;
  resolved: ResolvedNativeTheme;
}

function isPreference(value: string | null): value is NativeThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function resolveNativeTheme(preference: NativeThemePreference, system: ColorSchemeName | null | undefined): ResolvedNativeTheme {
  if (preference !== 'system') return preference;
  return system === 'light' ? 'light' : 'dark';
}

export function createNativeThemePreferenceStore(storage: SecureKeyValueStore) {
  return {
    async load(): Promise<NativeThemePreference> {
      try {
        const stored = await storage.getItemAsync(THEME_KEY);
        return isPreference(stored) ? stored : 'system';
      } catch {
        return 'system';
      }
    },
    async save(preference: NativeThemePreference): Promise<void> {
      await storage.setItemAsync(THEME_KEY, preference);
    },
  };
}

export function currentNativeTheme(preference: NativeThemePreference): NativeThemeState {
  return { preference, resolved: resolveNativeTheme(preference, Appearance.getColorScheme()) };
}
