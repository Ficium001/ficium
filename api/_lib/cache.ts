/**
 * api/_lib/cache.ts
 * ─────────────────────────────────────────────────────────────
 * In-process TTL cache for server-side API routes.
 *
 * At low scale: works as-is (per-instance memory cache).
 * At high scale: swap the store implementation for Redis/Upstash
 *   by changing only this file — all consumers stay the same.
 *
 * Usage:
 *   const result = await ServerCache.get("intelligence", 300, fetchFn);
 */

type CacheEntry<T> = { data: T; expiresAt: number };

class InProcessCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /**
   * Get from cache or fetch fresh.
   * @param key      Cache key
   * @param ttlSecs  Time-to-live in seconds
   * @param fetcher  Async function to populate cache on miss
   */
  async get<T>(key: string, ttlSecs: number, fetcher: () => Promise<T>): Promise<T> {
    const entry = this.store.get(key);
    if (entry && Date.now() < entry.expiresAt) {
      return entry.data as T;
    }

    const data = await fetcher();
    this.store.set(key, { data, expiresAt: Date.now() + ttlSecs * 1000 });
    return data;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateAll(): void {
    this.store.clear();
  }
}

/**
 * Singleton cache instance per serverless function invocation.
 * To upgrade to Redis: replace InProcessCache with a RedisCache
 * that implements the same interface. Zero consumer changes needed.
 */
export const ServerCache = new InProcessCache();

/** Cache key constants — prevents typo bugs across routes */
export const CacheKeys = {
  INTELLIGENCE:   "ficium:intelligence:v1",
  MARKET_RATES:   "ficium:market-rates:v1",
  PRODUCTS:       "ficium:products:v1",
} as const;
