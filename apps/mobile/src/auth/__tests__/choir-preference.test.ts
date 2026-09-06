import { choirPreferenceKey } from '@shared/choir-context-core';
import { createChoirPreferenceStore } from '../choir-preference';
import { CHOIR_A, USER_ID, createMemoryKeyValueStore } from '../../test/doubles';

describe('active-choir preference hint', () => {
  it('stores a validated choir id under the same key as the web client', async () => {
    const store = createMemoryKeyValueStore();
    const preferences = createChoirPreferenceStore(store);

    await preferences.set(USER_ID, CHOIR_A);

    expect(store.entries.get(choirPreferenceKey(USER_ID))).toBe(CHOIR_A);
    expect(await preferences.get(USER_ID)).toBe(CHOIR_A);
  });

  it('refuses to store a value that is not a choir id', async () => {
    const store = createMemoryKeyValueStore();
    const preferences = createChoirPreferenceStore(store);

    await preferences.set(USER_ID, 'not-a-uuid');

    expect(store.entries.size).toBe(0);
  });

  it('ignores a corrupted stored value instead of returning it', async () => {
    const store = createMemoryKeyValueStore();
    store.entries.set(choirPreferenceKey(USER_ID), 'tampered');

    expect(await createChoirPreferenceStore(store).get(USER_ID)).toBeNull();
  });

  it('clears the hint for one user only', async () => {
    const store = createMemoryKeyValueStore();
    const preferences = createChoirPreferenceStore(store);
    await preferences.set(USER_ID, CHOIR_A);

    await preferences.clear(USER_ID);

    expect(store.entries.size).toBe(0);
  });

  it('degrades quietly when the keychain is unavailable', async () => {
    const preferences = createChoirPreferenceStore(createMemoryKeyValueStore({ throwOnAccess: true }));

    await expect(preferences.set(USER_ID, CHOIR_A)).resolves.toBeUndefined();
    await expect(preferences.get(USER_ID)).resolves.toBeNull();
    await expect(preferences.clear(USER_ID)).resolves.toBeUndefined();
  });
});
