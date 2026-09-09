import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AnnotationItem } from '@/lib/repertuvar/annotation-types';
import {
  AnnotationSaveQueue,
  type AnnotationSaveQueuePayload,
} from '@/lib/repertuvar/annotation-save-queue';

const item = (id: string): AnnotationItem => ({
  id,
  type: 'text',
  color: 'red',
  position: { x: 0.2, y: 0.3 },
  text: id,
  width: 0.4,
});

const payload = (
  contextKey: string,
  id: string,
  ownerKey = 'member-a',
): AnnotationSaveQueuePayload => ({
  ownerKey,
  contextKey,
  fileId: contextKey.split('::')[0],
  pageNumber: Number(contextKey.split('::')[1]),
  layerKey: 'personal',
  items: [item(id)],
});

function saved(revision: number) {
  return {
    rowId: '11111111-1111-4111-8111-111111111111',
    revision,
    deleted: false,
    updatedAt: '2026-09-09T21:00:00.000Z',
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('AnnotationSaveQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('collapses only a not-yet-started same-key debounce to the latest snapshot', async () => {
    const save = vi.fn().mockResolvedValue(saved(4));
    const queue = new AnnotationSaveQueue(save, 500);
    const key = 'file-a::1::personal';
    queue.registerContext('member-a', key, {
      revision: 3,
      writableWithoutLoss: true,
      hadStoredRow: true,
    });

    queue.enqueue(payload(key, 'first'));
    queue.enqueue(payload(key, 'latest'));
    await queue.flushOwner('member-a');

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      annotations: [item('latest')],
      expectedRevision: 3,
    }));
    expect(queue.getContextSnapshot(key)).toMatchObject({
      revision: 4,
      phase: 'saved',
      error: null,
    });
  });

  it('keeps an in-flight successor and sends it with the returned revision', async () => {
    const first = deferred<ReturnType<typeof saved>>();
    const save = vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(saved(3));
    const queue = new AnnotationSaveQueue(save, 500);
    const key = 'file-a::2::personal';
    queue.registerContext('member-a', key, {
      revision: 1,
      writableWithoutLoss: true,
      hadStoredRow: true,
    });

    queue.enqueue(payload(key, 'in-flight'));
    const flushing = queue.flushContext(key);
    expect(save).toHaveBeenCalledTimes(1);
    queue.enqueue(payload(key, 'successor'));
    first.resolve(saved(2));
    await flushing;

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0]).toMatchObject({
      annotations: [item('successor')],
      expectedRevision: 2,
    });
    expect(queue.getContextSnapshot(key)).toMatchObject({ revision: 3, phase: 'saved' });
  });

  it('retains one key failure while another key succeeds', async () => {
    const save = vi.fn().mockImplementation(async (input) => {
      if (input.pageNumber === 1) throw new Error('çatışma');
      return saved(2);
    });
    const queue = new AnnotationSaveQueue(save, 500);
    const failedKey = 'file-a::1::personal';
    const savedKey = 'file-a::2::personal';
    queue.registerContext('member-a', failedKey, {
      revision: 1,
      writableWithoutLoss: true,
      hadStoredRow: true,
    });
    queue.registerContext('member-a', savedKey, {
      revision: 1,
      writableWithoutLoss: true,
      hadStoredRow: true,
    });
    queue.enqueue(payload(failedKey, 'failed'));
    queue.enqueue(payload(savedKey, 'saved'));

    await expect(queue.flushOwner('member-a')).rejects.toThrow('çatışma');

    expect(queue.getContextSnapshot(failedKey)).toMatchObject({
      phase: 'error',
      error: 'çatışma',
      pendingItems: [item('failed')],
    });
    expect(queue.getContextSnapshot(savedKey)).toMatchObject({
      phase: 'saved',
      error: null,
      pendingItems: null,
    });
    expect(queue.getOwnerStatus('member-a')).toEqual({
      phase: 'error',
      error: 'çatışma',
      unresolvedCount: 1,
    });
  });

  it('keeps a failed latest snapshot retryable at the same revision', async () => {
    const save = vi.fn()
      .mockRejectedValueOnce(new Error('ağ yok'))
      .mockResolvedValueOnce(saved(6));
    const queue = new AnnotationSaveQueue(save, 500);
    const key = 'file-a::5::personal';
    queue.registerContext('member-a', key, {
      revision: 5,
      writableWithoutLoss: true,
      hadStoredRow: true,
    });
    queue.enqueue(payload(key, 'retry'));

    await expect(queue.flushContext(key)).rejects.toThrow('ağ yok');
    expect(queue.getPendingSnapshots('member-a')).toEqual({ [key]: [item('retry')] });
    await expect(queue.flushContext(key)).resolves.toBeUndefined();

    expect(save.mock.calls[0][0].expectedRevision).toBe(5);
    expect(save.mock.calls[1][0].expectedRevision).toBe(5);
    expect(queue.getContextSnapshot(key)).toMatchObject({ revision: 6, phase: 'saved' });
  });

  it('refuses stored-row deletion but treats empty absence as a no-op', async () => {
    const save = vi.fn();
    const queue = new AnnotationSaveQueue(save, 500);
    const storedKey = 'file-a::1::personal';
    const absentKey = 'file-a::2::personal';
    queue.registerContext('member-a', storedKey, {
      revision: 2,
      writableWithoutLoss: true,
      hadStoredRow: true,
    });
    queue.registerContext('member-a', absentKey, {
      revision: null,
      writableWithoutLoss: true,
      hadStoredRow: false,
    });

    queue.enqueue({ ...payload(storedKey, 'unused'), items: [] });
    queue.enqueue({ ...payload(absentKey, 'unused'), items: [] });

    await expect(queue.flushContext(storedKey)).rejects.toThrow('tamamen silme kararı');
    await expect(queue.flushContext(absentKey)).resolves.toBeUndefined();
    expect(save).not.toHaveBeenCalled();
    expect(queue.getContextSnapshot(storedKey)).toMatchObject({
      phase: 'error',
      pendingItems: [],
    });
    expect(queue.getContextSnapshot(absentKey)).toMatchObject({
      phase: 'idle',
      pendingItems: null,
    });
  });

  it('refuses a non-lossless context without calling the adapter', async () => {
    const save = vi.fn();
    const queue = new AnnotationSaveQueue(save, 500);
    const key = 'file-a::3::personal';
    queue.registerContext('member-a', key, {
      revision: 1,
      writableWithoutLoss: false,
      hadStoredRow: true,
    });
    queue.enqueue(payload(key, 'blocked'));

    await expect(queue.flushContext(key)).rejects.toThrow('kayıpsız düzenlenemiyor');
    expect(save).not.toHaveBeenCalled();
    expect(queue.getPendingSnapshots('member-a')).toEqual({ [key]: [item('blocked')] });
  });

  it('discards private memory without replaying a successor after session loss', async () => {
    const first = deferred<ReturnType<typeof saved>>();
    const save = vi.fn().mockReturnValue(first.promise);
    const queue = new AnnotationSaveQueue(save, 500);
    const key = 'file-a::4::personal';
    queue.registerContext('member-a', key, {
      revision: 1,
      writableWithoutLoss: true,
      hadStoredRow: true,
    });
    queue.enqueue(payload(key, 'in-flight'));
    const flushing = queue.flushContext(key);
    expect(save).toHaveBeenCalledTimes(1);
    queue.enqueue(payload(key, 'must-not-replay'));

    queue.discardOwner('member-a');
    first.resolve(saved(2));
    await flushing;

    expect(save).toHaveBeenCalledTimes(1);
    expect(queue.getContextSnapshot(key)).toBeNull();
    expect(queue.hasUnresolved('member-a')).toBe(false);
  });

  it('blocks new mutations while an owner transition is committed and reopens on cancellation', () => {
    const queue = new AnnotationSaveQueue(vi.fn(), 500);
    const key = 'file-a::6::personal';

    queue.beginOwnerExit('member-a');
    expect(queue.isOwnerExiting('member-a')).toBe(true);
    expect(queue.hasUnresolved('member-a')).toBe(true);
    expect(queue.getOwnerStatus('member-a')).toMatchObject({
      phase: 'saving',
      unresolvedCount: 1,
    });
    expect(() => queue.enqueue(payload(key, 'blocked'))).toThrow('oturum değişirken');
    expect(() => queue.beginOwnerExit('member-a')).toThrow('zaten devam ediyor');

    queue.cancelOwnerExit('member-a');
    expect(queue.isOwnerExiting('member-a')).toBe(false);
    expect(() => queue.enqueue(payload(key, 'accepted'))).not.toThrow();
  });
});
