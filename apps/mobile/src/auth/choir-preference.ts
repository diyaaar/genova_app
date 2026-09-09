import { choirPreferenceKey, isChoirId } from '@shared/choir-context-core';
import type { ChoirPreferenceStore, SecureKeyValueStore } from './types';

/** Expo SecureStore rejects `:` even though web localStorage accepts the shared key unchanged. */
export function nativeChoirPreferenceKey(userId: string): string {
  return choirPreferenceKey(userId).replaceAll(':', '.');
}

/**
 * Per-user recall hint for the last active choir, using the shared key's meaning with a
 * SecureStore-safe encoding and the same validation as web. It is never authorization:
 * the database re-checks membership on every `set_active_choir` call.
 */
export function createChoirPreferenceStore(store: SecureKeyValueStore): ChoirPreferenceStore {
  return {
    async get(userId) {
      try {
        const value = await store.getItemAsync(nativeChoirPreferenceKey(userId));
        return isChoirId(value) ? value : null;
      } catch {
        return null;
      }
    },

    async set(userId, choirId) {
      if (!isChoirId(choirId)) return;
      try {
        await store.setItemAsync(nativeChoirPreferenceKey(userId), choirId);
      } catch {
        // Preference persistence is optional; the database remains authoritative.
      }
    },

    async clear(userId) {
      try {
        await store.deleteItemAsync(nativeChoirPreferenceKey(userId));
      } catch {
        // Sign-out and cache cleanup must continue when the keychain refuses.
      }
    },
  };
}
