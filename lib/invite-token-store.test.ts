import { describe, expect, it } from 'vitest';
import {
  INVITE_TOKEN_KEY,
  INVITE_TOKEN_TTL_MS,
  forgetInviteToken,
  isInviteToken,
  readInviteToken,
  rememberInviteToken,
  type InviteTokenStorage,
} from './invite-token-store';

const TOKEN = 'a'.repeat(64);
const OTHER = 'b'.repeat(64);

function memoryStorage(seed: Record<string, string> = {}) {
  const entries = new Map(Object.entries(seed));
  const storage: InviteTokenStorage & { entries: Map<string, string> } = {
    entries,
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
  };
  return storage;
}

function throwingStorage(): InviteTokenStorage {
  return {
    getItem: () => { throw new Error('storage blocked'); },
    setItem: () => { throw new Error('storage blocked'); },
    removeItem: () => { throw new Error('storage blocked'); },
  };
}

describe('isInviteToken', () => {
  it('accepts exactly 64 lowercase hex characters', () => {
    expect(isInviteToken(TOKEN)).toBe(true);
    expect(isInviteToken(TOKEN.toUpperCase())).toBe(false);
    expect(isInviteToken('a'.repeat(63))).toBe(false);
    expect(isInviteToken('a'.repeat(65))).toBe(false);
    expect(isInviteToken('g'.repeat(64))).toBe(false);
    expect(isInviteToken(undefined)).toBe(false);
  });
});

describe('rememberInviteToken', () => {
  it('stores a valid token and reads it back', () => {
    const storage = memoryStorage();
    expect(rememberInviteToken(storage, TOKEN, 1_000)).toBe(true);
    expect(readInviteToken(storage, 1_000)).toBe(TOKEN);
  });

  it('refuses an invalid token and writes nothing', () => {
    const storage = memoryStorage();
    expect(rememberInviteToken(storage, 'not-a-token')).toBe(false);
    expect(storage.entries.size).toBe(0);
  });

  it('replaces an earlier token rather than keeping both', () => {
    const storage = memoryStorage();
    rememberInviteToken(storage, TOKEN, 0);
    rememberInviteToken(storage, OTHER, 0);
    expect(storage.entries.size).toBe(1);
    expect(readInviteToken(storage, 0)).toBe(OTHER);
  });

  it('reports failure instead of throwing when storage refuses the write', () => {
    expect(rememberInviteToken(throwingStorage(), TOKEN)).toBe(false);
  });
});

describe('readInviteToken', () => {
  it('returns null when nothing was stored', () => {
    expect(readInviteToken(memoryStorage(), 0)).toBeNull();
  });

  it('returns null and clears the entry once it has expired', () => {
    const storage = memoryStorage();
    rememberInviteToken(storage, TOKEN, 0);
    expect(readInviteToken(storage, INVITE_TOKEN_TTL_MS - 1)).toBe(TOKEN);
    expect(readInviteToken(storage, INVITE_TOKEN_TTL_MS)).toBeNull();
    expect(storage.entries.size).toBe(0);
  });

  it('clears a malformed entry so it cannot fail on every visit', () => {
    for (const raw of ['not json', '{}', '[]', 'null', JSON.stringify({ token: 'short', expiresAt: 1 })]) {
      const storage = memoryStorage({ [INVITE_TOKEN_KEY]: raw });
      expect(readInviteToken(storage, 0)).toBeNull();
      expect(storage.entries.size).toBe(0);
    }
  });

  it('rejects an entry whose expiry is not a finite number', () => {
    const storage = memoryStorage({
      [INVITE_TOKEN_KEY]: JSON.stringify({ token: TOKEN, expiresAt: 'later' }),
    });
    expect(readInviteToken(storage, 0)).toBeNull();
  });

  it('returns null when storage is missing or throws', () => {
    expect(readInviteToken(null, 0)).toBeNull();
    expect(readInviteToken(throwingStorage(), 0)).toBeNull();
  });
});

describe('forgetInviteToken', () => {
  it('removes the entry', () => {
    const storage = memoryStorage();
    rememberInviteToken(storage, TOKEN, 0);
    forgetInviteToken(storage);
    expect(readInviteToken(storage, 0)).toBeNull();
  });

  it('tolerates a missing or throwing storage', () => {
    expect(() => forgetInviteToken(null)).not.toThrow();
    expect(() => forgetInviteToken(throwingStorage())).not.toThrow();
  });
});
