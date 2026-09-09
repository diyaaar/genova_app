import { describe, expect, it, vi } from 'vitest';

import type { AnnotationItem } from '@/lib/repertuvar/annotation-types';
import {
  applyAnnotationBeforeUnloadGuard,
  getAnnotationCompatibilityWarning,
  getStoredPdfPageNumber,
  mergeLoadedAndPendingAnnotationLayers,
} from '@/lib/repertuvar/annotation-workspace-lifecycle';

const item = (id: string): AnnotationItem => ({
  id,
  type: 'text',
  color: 'red',
  position: { x: 0.2, y: 0.3 },
  text: id,
  width: 0.4,
});

describe('getStoredPdfPageNumber', () => {
  it('keeps one-based page identity when there is no cover', () => {
    expect(getStoredPdfPageNumber(1, false, true)).toBe(1);
    expect(getStoredPdfPageNumber(40, false, true)).toBe(40);
  });

  it('refuses the cover and removes only its display offset', () => {
    expect(getStoredPdfPageNumber(1, true, true)).toBeNull();
    expect(getStoredPdfPageNumber(2, true, true)).toBe(1);
    expect(getStoredPdfPageNumber(41, true, true)).toBe(40);
  });

  it('refuses missing PDFs and invalid display pages', () => {
    expect(getStoredPdfPageNumber(1, false, false)).toBeNull();
    expect(getStoredPdfPageNumber(0, false, true)).toBeNull();
    expect(getStoredPdfPageNumber(1.5, false, true)).toBeNull();
  });
});

describe('annotation workspace load lifecycle', () => {
  it('keeps a retryable browser snapshot newer than a reloaded server layer', () => {
    expect(mergeLoadedAndPendingAnnotationLayers(
      { 'file-a::1::personal': [item('server')], 'file-a::2::personal': [item('other')] },
      { 'file-a::1::personal': [item('pending')] },
    )).toEqual({
      'file-a::1::personal': [item('pending')],
      'file-a::2::personal': [item('other')],
    });
  });

  it('reports future-schema read-only layers even when no item was skipped', () => {
    expect(getAnnotationCompatibilityWarning(0, 2)).toBe(
      '2 not katmanı kayıpsız düzenlenemediği için salt okunur açıldı.',
    );
    expect(getAnnotationCompatibilityWarning(1, 1)).toContain('1 desteklenmeyen');
    expect(getAnnotationCompatibilityWarning(1, 1)).toContain('1 not katmanı');
    expect(getAnnotationCompatibilityWarning(0, 0)).toBeNull();
  });

  it('warns before browser unload only while work remains unresolved', () => {
    const cleanEvent = { preventDefault: vi.fn(), returnValue: 'unchanged' };
    expect(applyAnnotationBeforeUnloadGuard(cleanEvent, false)).toBe(false);
    expect(cleanEvent).toEqual({ preventDefault: expect.any(Function), returnValue: 'unchanged' });
    expect(cleanEvent.preventDefault).not.toHaveBeenCalled();

    const pendingEvent = { preventDefault: vi.fn(), returnValue: 'unchanged' };
    expect(applyAnnotationBeforeUnloadGuard(pendingEvent, true)).toBe(true);
    expect(pendingEvent.preventDefault).toHaveBeenCalledOnce();
    expect(pendingEvent.returnValue).toBe('');
  });
});
