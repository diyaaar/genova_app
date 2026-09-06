import { createChunkedSecureStorage } from '../secure-storage';
import { createMemoryKeyValueStore } from '../../test/doubles';

describe('chunked secure session storage', () => {
  it('round-trips a value longer than one keychain chunk', async () => {
    const store = createMemoryKeyValueStore();
    const storage = createChunkedSecureStorage(store, 8);
    const value = 'a'.repeat(37);

    await storage.setItem('sb-auth-token', value);

    expect(await storage.getItem('sb-auth-token')).toBe(value);
    expect(store.entries.get('sb-auth-token')).toBe('genova.chunks:5');
  });

  it('drops stale trailing chunks when the new session is shorter', async () => {
    const store = createMemoryKeyValueStore();
    const storage = createChunkedSecureStorage(store, 4);

    await storage.setItem('key', 'x'.repeat(20));
    await storage.setItem('key', 'y'.repeat(4));

    expect(await storage.getItem('key')).toBe('yyyy');
    expect(store.entries.has('key.1')).toBe(false);
  });

  it('fails closed and wipes the entry when a chunk is missing', async () => {
    const store = createMemoryKeyValueStore();
    const storage = createChunkedSecureStorage(store, 4);
    await storage.setItem('key', 'z'.repeat(12));

    store.entries.delete('key.1');

    expect(await storage.getItem('key')).toBeNull();
    expect(store.entries.size).toBe(0);
  });

  it('still reads a value written before chunking existed', async () => {
    const store = createMemoryKeyValueStore();
    store.entries.set('key', 'legacy-token');

    expect(await createChunkedSecureStorage(store, 4).getItem('key')).toBe('legacy-token');
  });

  it('removes the marker and every chunk on sign-out', async () => {
    const store = createMemoryKeyValueStore();
    const storage = createChunkedSecureStorage(store, 4);
    await storage.setItem('key', 'q'.repeat(10));

    await storage.removeItem('key');

    expect(store.entries.size).toBe(0);
    expect(await storage.getItem('key')).toBeNull();
  });

  it('returns null for a key that was never written', async () => {
    const storage = createChunkedSecureStorage(createMemoryKeyValueStore());
    expect(await storage.getItem('absent')).toBeNull();
  });
});
