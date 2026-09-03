import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearAssignmentCaches,
  getAssignmentCacheKey,
  readAssignmentCache,
  writeAssignmentCache,
} from '@/lib/assignment-cache';

describe('assignment cache', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('builds a stable, namespaced key', () => {
    expect(getAssignmentCacheKey('member-1', null, undefined, 'open'))
      .toBe('genova.assignments.v1:member-1:none:none:open');
  });

  it('round-trips cached data in an envelope', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_725_000_000_000);
    const key = getAssignmentCacheKey('member-1');

    writeAssignmentCache(key, { total: 3 });

    expect(JSON.parse(window.localStorage.getItem(key) ?? '{}')).toEqual({
      cachedAt: 1_725_000_000_000,
      data: { total: 3 },
    });
    expect(readAssignmentCache<{ total: number }>(key)).toEqual({ total: 3 });
  });

  it('fails closed for corrupt or malformed entries', () => {
    const corruptKey = getAssignmentCacheKey('corrupt');
    const malformedKey = getAssignmentCacheKey('malformed');
    window.localStorage.setItem(corruptKey, '{');
    window.localStorage.setItem(malformedKey, JSON.stringify({ data: [] }));

    expect(readAssignmentCache(corruptKey)).toBeNull();
    expect(readAssignmentCache(malformedKey)).toBeNull();
  });

  it('clears only assignment cache entries', () => {
    window.localStorage.setItem(getAssignmentCacheKey('one'), '{}');
    window.localStorage.setItem(getAssignmentCacheKey('two'), '{}');
    window.localStorage.setItem('unrelated', 'keep');

    clearAssignmentCaches();

    expect(window.localStorage.getItem(getAssignmentCacheKey('one'))).toBeNull();
    expect(window.localStorage.getItem(getAssignmentCacheKey('two'))).toBeNull();
    expect(window.localStorage.getItem('unrelated')).toBe('keep');
  });
});
