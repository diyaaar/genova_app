import type { SecureKeyValueStore, SessionStorage } from './types';

/**
 * expo-secure-store rejects large values, and a Supabase session with a long JWT can
 * exceed that limit. Values are therefore split into fixed-size chunks behind a marker
 * record. A partially written or partially wiped entry is treated as no session at all,
 * so a damaged keychain signs the user out instead of restoring half a token.
 */

export const SECURE_CHUNK_SIZE = 1536;
const CHUNK_MARKER_PREFIX = 'genova.chunks:';

function chunkKey(key: string, index: number) {
  return `${key}.${index}`;
}

function splitValue(value: string, chunkSize: number): string[] {
  if (value.length === 0) return [''];
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += chunkSize) {
    chunks.push(value.slice(index, index + chunkSize));
  }
  return chunks;
}

function readChunkCount(marker: string | null): number | null {
  if (!marker || !marker.startsWith(CHUNK_MARKER_PREFIX)) return null;
  const count = Number.parseInt(marker.slice(CHUNK_MARKER_PREFIX.length), 10);
  return Number.isInteger(count) && count >= 0 ? count : null;
}

export function createChunkedSecureStorage(
  store: SecureKeyValueStore,
  chunkSize: number = SECURE_CHUNK_SIZE,
): SessionStorage {
  async function removeChunks(key: string, count: number) {
    for (let index = 0; index < count; index += 1) {
      await store.deleteItemAsync(chunkKey(key, index));
    }
  }

  async function removeItem(key: string) {
    const count = readChunkCount(await store.getItemAsync(key));
    if (count !== null) await removeChunks(key, count);
    await store.deleteItemAsync(key);
  }

  return {
    async getItem(key) {
      const marker = await store.getItemAsync(key);
      if (marker === null) return null;

      const count = readChunkCount(marker);
      // A value written before chunking existed is still readable.
      if (count === null) return marker;

      const parts: string[] = [];
      for (let index = 0; index < count; index += 1) {
        const part = await store.getItemAsync(chunkKey(key, index));
        if (part === null) {
          await removeItem(key);
          return null;
        }
        parts.push(part);
      }
      return parts.join('');
    },

    async setItem(key, value) {
      const previousCount = readChunkCount(await store.getItemAsync(key));
      const chunks = splitValue(value, chunkSize);

      for (let index = 0; index < chunks.length; index += 1) {
        await store.setItemAsync(chunkKey(key, index), chunks[index] as string);
      }
      // Stale trailing chunks from a longer previous session must not survive.
      for (let index = chunks.length; index < (previousCount ?? 0); index += 1) {
        await store.deleteItemAsync(chunkKey(key, index));
      }
      await store.setItemAsync(key, `${CHUNK_MARKER_PREFIX}${chunks.length}`);
    },

    removeItem,
  };
}
