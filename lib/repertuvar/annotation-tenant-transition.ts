export interface AnnotationTenantQueueBoundary {
  flushOwner: (ownerKey: string) => Promise<void>;
  discardAll: () => void;
  beginOwnerExit: (ownerKey: string) => void;
  cancelOwnerExit: (ownerKey: string) => void;
}

/** Commits a user-requested tenant/session transition only after all local writes flush. */
export async function commitAnnotationTenantTransition<T>(
  queue: AnnotationTenantQueueBoundary,
  ownerKey: string | null,
  transition: () => Promise<T>,
): Promise<T> {
  if (ownerKey) queue.beginOwnerExit(ownerKey);
  try {
    if (ownerKey) await queue.flushOwner(ownerKey);
    const result = await transition();
    queue.discardAll();
    return result;
  } catch (error) {
    if (ownerKey) queue.cancelOwnerExit(ownerKey);
    throw error;
  }
}
