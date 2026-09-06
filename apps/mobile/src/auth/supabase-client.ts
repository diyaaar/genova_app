import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { createChunkedSecureStorage } from './secure-storage';
import type { SecureKeyValueStore, SessionStorage } from './types';

/**
 * Native Supabase client.
 *
 * Only the public project URL and the anon key are read, from Expo's public env
 * variables; no service-role key or other secret is ever bundled into the app.
 * Sessions are persisted in the device keychain/keystore rather than in plain storage,
 * and URL-based session detection stays off because this client has no browser redirect.
 */

export const secureKeyValueStore: SecureKeyValueStore = {
  getItemAsync: (key) => SecureStore.getItemAsync(key),
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value),
  deleteItemAsync: (key) => SecureStore.deleteItemAsync(key),
};

export interface GenovaClientConfig {
  url: string;
  anonKey: string;
  storage: SessionStorage;
}

export function createGenovaClient(config: GenovaClientConfig): SupabaseClient {
  return createClient(config.url, config.anonKey, {
    auth: {
      storage: config.storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export function readClientConfigFromEnv(env: Record<string, string | undefined>): { url: string; anonKey: string } {
  const url = env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_ANON_KEY tanımlı değil. apps/mobile/.env dosyasını oluşturun.',
    );
  }
  return { url, anonKey };
}

let cachedClient: SupabaseClient | null = null;

/** Lazily built so that importing this module never throws in tests or tooling. */
export function getGenovaClient(): SupabaseClient {
  if (!cachedClient) {
    const { url, anonKey } = readClientConfigFromEnv(process.env);
    cachedClient = createGenovaClient({
      url,
      anonKey,
      storage: createChunkedSecureStorage(secureKeyValueStore),
    });
  }
  return cachedClient;
}
