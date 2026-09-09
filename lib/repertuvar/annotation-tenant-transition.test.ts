import { describe, expect, it, vi } from 'vitest';

import { commitAnnotationTenantTransition } from '@/lib/repertuvar/annotation-tenant-transition';

describe('commitAnnotationTenantTransition', () => {
  it('flushes before the transition and discards old private memory only after success', async () => {
    const order: string[] = [];
    const queue = {
      flushOwner: vi.fn(async () => { order.push('flush'); }),
      discardAll: vi.fn(() => { order.push('discard'); }),
      beginOwnerExit: vi.fn(() => { order.push('lock'); }),
      cancelOwnerExit: vi.fn(() => { order.push('unlock'); }),
    };

    await expect(commitAnnotationTenantTransition(queue, 'member-a', async () => {
      order.push('transition');
      return 'done';
    })).resolves.toBe('done');

    expect(order).toEqual(['lock', 'flush', 'transition', 'discard']);
  });

  it('refuses the transition and preserves private memory when flush fails', async () => {
    const transition = vi.fn(async () => undefined);
    const queue = {
      flushOwner: vi.fn(async () => { throw new Error('çatışma'); }),
      discardAll: vi.fn(),
      beginOwnerExit: vi.fn(),
      cancelOwnerExit: vi.fn(),
    };

    await expect(
      commitAnnotationTenantTransition(queue, 'member-a', transition),
    ).rejects.toThrow('çatışma');
    expect(transition).not.toHaveBeenCalled();
    expect(queue.discardAll).not.toHaveBeenCalled();
    expect(queue.cancelOwnerExit).toHaveBeenCalledWith('member-a');
  });

  it('preserves private memory when the requested external transition fails', async () => {
    const queue = {
      flushOwner: vi.fn(async () => undefined),
      discardAll: vi.fn(),
      beginOwnerExit: vi.fn(),
      cancelOwnerExit: vi.fn(),
    };

    await expect(commitAnnotationTenantTransition(queue, 'member-a', async () => {
      throw new Error('oturum kapatılamadı');
    })).rejects.toThrow('oturum kapatılamadı');
    expect(queue.discardAll).not.toHaveBeenCalled();
    expect(queue.cancelOwnerExit).toHaveBeenCalledWith('member-a');
  });
});
