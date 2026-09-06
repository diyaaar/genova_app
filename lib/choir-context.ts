import { choirPreferenceKey, isChoirId } from './choir-context-core';

/**
 * Web binding of the shared 005 active-choir contract.
 *
 * The contract itself lives in `./choir-context-core`, which the React Native
 * product app imports as well. Only the browser preference storage is added here;
 * the public API of this module is unchanged for existing web callers.
 */

export {
  activateChoir,
  findCurrentChoir,
  findPreferredMembership,
  isChoirId,
  loadMyChoirs,
  type ChoirContextClient,
  type ChoirMembershipOption,
} from './choir-context-core';

export function getPreferredChoirId(userId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(choirPreferenceKey(userId));
    return isChoirId(value) ? value : null;
  } catch {
    return null;
  }
}

export function setPreferredChoirId(userId: string, choirId: string) {
  if (typeof window === 'undefined' || !isChoirId(choirId)) return;
  try {
    window.localStorage.setItem(choirPreferenceKey(userId), choirId);
  } catch {
    // Preference persistence is optional; the database remains authoritative.
  }
}

export function clearPreferredChoirId(userId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(choirPreferenceKey(userId));
  } catch {
    // Sign-out and tenant cache cleanup must continue when Storage is blocked.
  }
}
