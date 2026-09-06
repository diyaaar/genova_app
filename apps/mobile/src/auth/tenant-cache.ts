/**
 * Seam for per-choir private data caches (repertoire metadata, protected file URLs,
 * offline files). The shell has no such cache yet; later briefs register their cleanup
 * here so that one call clears everything before another choir's data can be read.
 */

export type TenantCacheCleaner = () => void | Promise<void>;

const cleaners = new Set<TenantCacheCleaner>();

export function registerTenantCache(cleaner: TenantCacheCleaner): () => void {
  cleaners.add(cleaner);
  return () => {
    cleaners.delete(cleaner);
  };
}

/** Runs every registered cleaner. One failing cleaner must not stop the others. */
export async function clearTenantCaches(): Promise<void> {
  for (const cleaner of Array.from(cleaners)) {
    try {
      await cleaner();
    } catch {
      // Cache cleanup is best effort; authorization stays server-side.
    }
  }
}

/** Test-only helper: drops registrations so suites cannot leak into each other. */
export function resetTenantCacheRegistry(): void {
  cleaners.clear();
}
