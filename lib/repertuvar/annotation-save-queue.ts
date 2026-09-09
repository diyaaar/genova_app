import type { AnnotationItem, AnnotationLayerKey } from '@/lib/repertuvar/annotation-types';
import type {
  AnnotationSaveResult,
  SafeSaveLayerSnapshotInput,
} from '@/lib/repertuvar/annotations';

export interface AnnotationSaveQueuePayload {
  ownerKey: string;
  contextKey: string;
  fileId: string;
  pageNumber: number;
  layerKey: AnnotationLayerKey;
  items: AnnotationItem[];
}

export interface AnnotationSaveQueueBase {
  revision: number | null;
  writableWithoutLoss: boolean;
  hadStoredRow: boolean;
}

export interface AnnotationSaveQueueContextSnapshot extends AnnotationSaveQueueBase {
  ownerKey: string;
  contextKey: string;
  phase: 'idle' | 'saving' | 'saved' | 'error';
  error: string | null;
  pendingItems: AnnotationItem[] | null;
}

export interface AnnotationSaveQueueOwnerStatus {
  phase: 'idle' | 'saving' | 'saved' | 'error';
  error: string | null;
  unresolvedCount: number;
}

type SafeSave = (input: SafeSaveLayerSnapshotInput) => Promise<AnnotationSaveResult>;
type Listener = () => void;

interface QueueEntry extends AnnotationSaveQueueBase {
  ownerKey: string;
  contextKey: string;
  pending: AnnotationSaveQueuePayload | null;
  inFlightPayload: AnnotationSaveQueuePayload | null;
  timer: ReturnType<typeof setTimeout> | null;
  drainPromise: Promise<void> | null;
  error: string | null;
  saved: boolean;
  discarded: boolean;
}

const STORED_DELETE_BLOCKED_MESSAGE =
  'Kayıtlı not katmanını tamamen silme kararı henüz verilmedi. Sunucudaki katman değiştirilmedi.';
const LOSSY_LAYER_BLOCKED_MESSAGE =
  'Bu not katmanı kayıpsız düzenlenemiyor. Sunucudaki içerik değiştirilmedi.';

function cloneItems(items: AnnotationItem[]): AnnotationItem[] {
  return items.map((item) => {
    if (item.type === 'pen' || item.type === 'highlighter') {
      return { ...item, points: item.points.map((point) => ({ ...point })) };
    }
    if (item.type === 'arrow' || item.type === 'rectangle') {
      return { ...item, start: { ...item.start }, end: { ...item.end } };
    }
    return { ...item, position: { ...item.position } };
  });
}

function clonePayload(payload: AnnotationSaveQueuePayload): AnnotationSaveQueuePayload {
  return { ...payload, items: cloneItems(payload.items) };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'PDF notu kaydedilemedi.';
}

export class AnnotationSaveQueue {
  private readonly entries = new Map<string, QueueEntry>();
  private readonly listeners = new Set<Listener>();
  private readonly exitingOwners = new Set<string>();

  constructor(
    private readonly save: SafeSave,
    private readonly debounceMs = 500,
  ) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }

  registerContext(
    ownerKey: string,
    contextKey: string,
    base: AnnotationSaveQueueBase,
  ) {
    const existing = this.entries.get(contextKey);
    if (existing && (existing.pending || existing.inFlightPayload || existing.drainPromise)) {
      if (existing.ownerKey !== ownerKey) {
        throw new Error('Not kuyruğu başka bir üyelik bağlamına ait.');
      }
      return;
    }

    this.entries.set(contextKey, {
      ownerKey,
      contextKey,
      ...base,
      pending: null,
      inFlightPayload: null,
      timer: null,
      drainPromise: null,
      error: null,
      saved: false,
      discarded: false,
    });
    this.emit();
  }

  enqueue(payload: AnnotationSaveQueuePayload) {
    if (this.exitingOwners.has(payload.ownerKey)) {
      throw new Error('Koro veya oturum değişirken yeni not eklenemez.');
    }
    const existing = this.entries.get(payload.contextKey);
    const entry = existing ?? {
      ownerKey: payload.ownerKey,
      contextKey: payload.contextKey,
      revision: null,
      writableWithoutLoss: true,
      hadStoredRow: false,
      pending: null,
      inFlightPayload: null,
      timer: null,
      drainPromise: null,
      error: null,
      saved: false,
      discarded: false,
    };

    if (entry.ownerKey !== payload.ownerKey || entry.discarded) {
      throw new Error('Not kuyruğu aktif üyelik bağlamıyla eşleşmiyor.');
    }

    entry.pending = clonePayload(payload);
    entry.error = null;
    entry.saved = false;
    this.entries.set(payload.contextKey, entry);
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }

    if (!entry.writableWithoutLoss) {
      entry.error = LOSSY_LAYER_BLOCKED_MESSAGE;
      this.emit();
      return;
    }

    if (entry.hadStoredRow && payload.items.length === 0) {
      entry.error = STORED_DELETE_BLOCKED_MESSAGE;
      this.emit();
      return;
    }

    if (!entry.hadStoredRow && entry.revision === null && payload.items.length === 0) {
      entry.pending = null;
      this.emit();
      return;
    }

    entry.timer = setTimeout(() => {
      entry.timer = null;
      void this.flushContext(entry.contextKey).catch(() => {
        // The context snapshot owns the visible, retryable error.
      });
    }, this.debounceMs);
    this.emit();
  }

  private async drain(entry: QueueEntry): Promise<void> {
    while (entry.pending && !entry.discarded) {
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = null;
      }
      if (!entry.writableWithoutLoss) {
        entry.error = LOSSY_LAYER_BLOCKED_MESSAGE;
        throw new Error(entry.error);
      }
      if (entry.hadStoredRow && entry.pending.items.length === 0) {
        entry.error = STORED_DELETE_BLOCKED_MESSAGE;
        throw new Error(entry.error);
      }

      const payload = entry.pending;
      entry.pending = null;
      entry.inFlightPayload = payload;
      entry.error = null;
      this.emit();

      try {
        const result = await this.save({
          repertoireFileId: payload.fileId,
          pageNumber: payload.pageNumber,
          layerKey: payload.layerKey,
          annotations: cloneItems(payload.items),
          expectedRevision: entry.revision,
          writableWithoutLoss: entry.writableWithoutLoss,
        });

        if (entry.discarded) return;
        entry.revision = result.revision;
        entry.hadStoredRow = !result.deleted;
        entry.saved = true;
      } catch (error) {
        if (!entry.discarded && !entry.pending) entry.pending = payload;
        if (!entry.discarded) entry.error = errorMessage(error);
        throw error;
      } finally {
        entry.inFlightPayload = null;
        this.emit();
      }
    }
  }

  flushContext(contextKey: string): Promise<void> {
    const entry = this.entries.get(contextKey);
    if (!entry || entry.discarded) return Promise.resolve();
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    if (entry.drainPromise) return entry.drainPromise;
    if (!entry.pending) return Promise.resolve();

    entry.drainPromise = this.drain(entry).finally(() => {
      entry.drainPromise = null;
      this.emit();
    });
    this.emit();
    return entry.drainPromise;
  }

  async flushOwner(ownerKey: string): Promise<void> {
    const keys = Array.from(this.entries.values())
      .filter((entry) => entry.ownerKey === ownerKey && !entry.discarded)
      .map((entry) => entry.contextKey);
    const results = await Promise.allSettled(keys.map((key) => this.flushContext(key)));
    const failure = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    if (failure) throw failure.reason;
  }

  getContextSnapshot(contextKey: string): AnnotationSaveQueueContextSnapshot | null {
    const entry = this.entries.get(contextKey);
    if (!entry || entry.discarded) return null;
    const pendingPayload = entry.pending ?? entry.inFlightPayload;
    const phase = entry.error
      ? 'error'
      : entry.pending || entry.inFlightPayload || entry.drainPromise || entry.timer
        ? 'saving'
        : entry.saved
          ? 'saved'
          : 'idle';
    return {
      ownerKey: entry.ownerKey,
      contextKey: entry.contextKey,
      revision: entry.revision,
      writableWithoutLoss: entry.writableWithoutLoss,
      hadStoredRow: entry.hadStoredRow,
      phase,
      error: entry.error,
      pendingItems: pendingPayload ? cloneItems(pendingPayload.items) : null,
    };
  }

  getPendingSnapshots(ownerKey: string, fileId?: string): Record<string, AnnotationItem[]> {
    const snapshots: Record<string, AnnotationItem[]> = {};
    this.entries.forEach((entry) => {
      if (entry.ownerKey !== ownerKey || entry.discarded) return;
      const payload = entry.pending ?? entry.inFlightPayload;
      if (!payload || (fileId && payload.fileId !== fileId)) return;
      snapshots[entry.contextKey] = cloneItems(payload.items);
    });
    return snapshots;
  }

  hasUnresolved(ownerKey?: string): boolean {
    if (ownerKey ? this.exitingOwners.has(ownerKey) : this.exitingOwners.size > 0) return true;
    return Array.from(this.entries.values()).some((entry) =>
      !entry.discarded &&
      (!ownerKey || entry.ownerKey === ownerKey) &&
      Boolean(entry.pending || entry.inFlightPayload || entry.drainPromise || entry.timer || entry.error),
    );
  }

  getOwnerStatus(ownerKey: string): AnnotationSaveQueueOwnerStatus {
    const entries = Array.from(this.entries.values())
      .filter((entry) => entry.ownerKey === ownerKey && !entry.discarded);
    const error = entries.find((entry) => entry.error)?.error ?? null;
    const unresolvedCount = entries.filter((entry) =>
      Boolean(entry.pending || entry.inFlightPayload || entry.drainPromise || entry.timer || entry.error),
    ).length + (this.exitingOwners.has(ownerKey) ? 1 : 0);
    return {
      phase: error
        ? 'error'
        : unresolvedCount > 0
          ? 'saving'
          : entries.some((entry) => entry.saved)
            ? 'saved'
            : 'idle',
      error,
      unresolvedCount,
    };
  }

  beginOwnerExit(ownerKey: string) {
    if (this.exitingOwners.has(ownerKey)) {
      throw new Error('Koro veya oturum değişikliği zaten devam ediyor.');
    }
    this.exitingOwners.add(ownerKey);
    this.emit();
  }

  cancelOwnerExit(ownerKey: string) {
    this.exitingOwners.delete(ownerKey);
    this.emit();
  }

  isOwnerExiting(ownerKey: string): boolean {
    return this.exitingOwners.has(ownerKey);
  }

  discardOwner(ownerKey: string) {
    this.exitingOwners.delete(ownerKey);
    this.entries.forEach((entry, key) => {
      if (entry.ownerKey !== ownerKey) return;
      entry.discarded = true;
      entry.pending = null;
      if (entry.timer) clearTimeout(entry.timer);
      entry.timer = null;
      this.entries.delete(key);
    });
    this.emit();
  }

  discardAll() {
    Array.from(new Set(Array.from(this.entries.values()).map((entry) => entry.ownerKey)))
      .forEach((ownerKey) => this.discardOwner(ownerKey));
    this.exitingOwners.clear();
    this.emit();
  }

  pruneSettled(ownerKey: string) {
    this.entries.forEach((entry, key) => {
      if (
        entry.ownerKey === ownerKey &&
        !entry.pending &&
        !entry.inFlightPayload &&
        !entry.drainPromise &&
        !entry.timer &&
        !entry.error
      ) {
        this.entries.delete(key);
      }
    });
    this.emit();
  }
}
