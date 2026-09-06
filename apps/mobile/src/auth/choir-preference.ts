import { choirPreferenceKey, isChoirId } from '@shared/choir-context-core';
import type { ChoirPreferenceStore, SecureKeyValueStore } from './types';

/**
 * Per-user recall hint for the last active choir, using the same key and the same
 * validation as the web client. It is never authorization: the database re-checks the
 * membership on every `set_active_choir` call, and an unreadable preference is ignored.
 */
export function createChoirPreferenceStore(store: SecureKeyValueStore): ChoirPreferenceStore {
  return {
    async get(userId) {
      try {
        const value = await store.getItemAsync(choirPreferenceKey(userId));
        return isChoirId(value) ? value : null;
      } catch {
        return null;
      }
    },

    async set(userId, choirId) {
      if (!isChoirId(choirId)) return;
      try {
        await store.setItemAsync(choirPreferenceKey(userId), choirId);
      } catch {
        // Preference persistence is optional; the database remains authoritative.
      }
    },

    async clear(userId) {
      try {
        await store.deleteItemAsync(choirPreferenceKey(userId));
      } catch {
        // Sign-out and cache cleanup must continue when the keychain refuses.
      }
    },
  };
}
