/**
 * Carries a pending invitation token across the email-verification round trip.
 *
 * A newly registered chorister leaves the app to confirm their address and comes
 * back through a link the auth provider builds, which cannot carry the invitation
 * token: the confirmation redirect appends its own URL fragment, and moving the
 * token into the query string would leak it into referrers and server access logs.
 * The token therefore waits in the recipient's own browser instead.
 *
 * `localStorage` rather than `sessionStorage`, because the confirmation link
 * usually opens a fresh browsing context that shares no session storage. The
 * entry is short lived, is bound to the same origin, and is removed as soon as
 * the invitation is accepted. This module is DOM-free so it can be tested
 * without a browser; the caller supplies the storage.
 */

/** Raw invitation tokens are 64 lowercase hex characters. Single source of truth. */
export const INVITE_TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export const INVITE_TOKEN_KEY = 'genova.invite.pending';

/** Well below the seven-day invitation validity: the round trip takes minutes. */
export const INVITE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/** The slice of the Web Storage API this module needs. */
export interface InviteTokenStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function isInviteToken(value: unknown): value is string {
  return typeof value === 'string' && INVITE_TOKEN_PATTERN.test(value);
}

/**
 * The browser's storage, or null when it is unavailable. Reading `localStorage`
 * throws outright in some privacy modes, so the failure is handled here and the
 * caller simply loses the convenience.
 */
export function browserInviteTokenStorage(): InviteTokenStorage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

interface StoredEntry {
  token: string;
  expiresAt: number;
}

function parseEntry(raw: string | null): StoredEntry | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const { token, expiresAt } = parsed as Record<string, unknown>;
    if (!isInviteToken(token)) return null;
    if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) return null;
    return { token, expiresAt };
  } catch {
    return null;
  }
}

/** Stores the token. Returns false when it was rejected or storage refused it. */
export function rememberInviteToken(
  storage: InviteTokenStorage | null,
  token: string,
  now: number = Date.now(),
): boolean {
  if (!storage || !isInviteToken(token)) return false;
  try {
    const entry: StoredEntry = { token, expiresAt: now + INVITE_TOKEN_TTL_MS };
    storage.setItem(INVITE_TOKEN_KEY, JSON.stringify(entry));
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the stored token, or null. An entry that is expired, malformed or
 * holds an invalid token is removed rather than returned, so a broken value
 * cannot keep failing acceptance on every visit.
 */
export function readInviteToken(
  storage: InviteTokenStorage | null,
  now: number = Date.now(),
): string | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(INVITE_TOKEN_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  const entry = parseEntry(raw);
  if (!entry || entry.expiresAt <= now) {
    forgetInviteToken(storage);
    return null;
  }
  return entry.token;
}

export function forgetInviteToken(storage: InviteTokenStorage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(INVITE_TOKEN_KEY);
  } catch {
    // Nothing to do: the entry expires on its own.
  }
}
