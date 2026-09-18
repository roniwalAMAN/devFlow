/**
 * Cache Service
 * Redis caching layer with in-memory fallback for graceful degradation
 */

import { getRedisClient, isRedisAvailable } from './redis';

// In-memory fallback cache store
interface MemoryCacheEntry {
  value: string;
  expiresAt: number;
}
const memoryCache = new Map<string, MemoryCacheEntry>();

const DEFAULT_TTL = 300; // 5 minutes

/**
 * Get cached item by key
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();

  if (isRedisAvailable() && redis) {
    try {
      const data = await redis.get(key);
      if (data) {
        return JSON.parse(data) as T;
      }
      return null;
    } catch {
      // Fallback to memory if Redis error
    }
  }

  // Memory fallback
  const entry = memoryCache.get(key);
  if (entry) {
    if (Date.now() < entry.expiresAt) {
      try {
        return JSON.parse(entry.value) as T;
      } catch {
        return null;
      }
    } else {
      memoryCache.delete(key);
    }
  }

  return null;
}

/**
 * Set cached item with TTL in seconds
 */
export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds: number = DEFAULT_TTL
): Promise<void> {
  const serialized = JSON.stringify(value);
  const redis = getRedisClient();

  if (isRedisAvailable() && redis) {
    try {
      await redis.set(key, serialized, 'EX', ttlSeconds);
      return;
    } catch {
      // Fallback to memory
    }
  }

  // Memory fallback
  memoryCache.set(key, {
    value: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Delete a specific key or list of keys from cache
 */
export async function cacheDel(keyOrKeys: string | string[]): Promise<void> {
  const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
  if (keys.length === 0) return;

  const redis = getRedisClient();
  if (isRedisAvailable() && redis) {
    try {
      await redis.del(...keys);
    } catch {
      // Ignore
    }
  }

  // Memory fallback
  for (const k of keys) {
    memoryCache.delete(k);
  }
}

/**
 * Invalidate keys matching a wildcard pattern (e.g. "org:123:*")
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  const redis = getRedisClient();

  if (isRedisAvailable() && redis) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      // Ignore
    }
  }

  // Memory fallback matching
  const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  for (const k of memoryCache.keys()) {
    if (regexPattern.test(k)) {
      memoryCache.delete(k);
    }
  }
}

/**
 * Domain-specific Cache Invalidation Helpers
 */
export async function invalidateOrganizationProjectsCache(
  organizationId: string
): Promise<void> {
  await cacheInvalidatePattern(`org:${organizationId}:projects*`);
}

export async function invalidateProjectTasksCache(
  projectId: string
): Promise<void> {
  await cacheInvalidatePattern(`proj:${projectId}:tasks*`);
}

export async function invalidateTaskCommentsCache(
  taskId: string
): Promise<void> {
  await cacheInvalidatePattern(`task:${taskId}:comments*`);
}

export async function invalidateOrganizationActivityCache(
  organizationId: string
): Promise<void> {
  await cacheInvalidatePattern(`org:${organizationId}:activity*`);
}
