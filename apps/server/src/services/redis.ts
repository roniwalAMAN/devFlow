/**
 * Redis Client Service
 * Singleton Redis connection with automatic reconnection and graceful degradation
 */

import Redis, { type Redis as RedisClient } from 'ioredis';

let redisInstance: RedisClient | null = null;
let isConnected = false;

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Get or initialize Redis client instance
 */
export function getRedisClient(): RedisClient | null {
  if (redisInstance) {
    return redisInstance;
  }

  try {
    redisInstance = new Redis(REDIS_URL, {
      maxRetriesPerRequest: null, // Compatible with BullMQ
      retryStrategy(times) {
        // Exponential backoff up to 3 seconds
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redisInstance.on('connect', () => {
      isConnected = true;
    });

    redisInstance.on('ready', () => {
      isConnected = true;
    });

    redisInstance.on('error', (err) => {
      isConnected = false;
      // Do not crash process on connection error
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`[Redis] Connection warning: ${err.message}`);
      }
    });

    redisInstance.on('close', () => {
      isConnected = false;
    });

    // Initiate connection asynchronously
    redisInstance.connect().catch((err) => {
      isConnected = false;
      if (process.env.NODE_ENV !== 'test') {
        console.warn(`[Redis] Initial connection deferred: ${err.message}`);
      }
    });

    return redisInstance;
  } catch (err) {
    isConnected = false;
    console.warn('[Redis] Failed to initialize Redis client:', err);
    return null;
  }
}

/**
 * Check if Redis is currently available and ready
 */
export function isRedisAvailable(): boolean {
  return isConnected && redisInstance !== null && redisInstance.status === 'ready';
}

/**
 * Close Redis connection cleanly
 */
export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    try {
      await redisInstance.quit();
    } catch {
      redisInstance.disconnect();
    }
    redisInstance = null;
    isConnected = false;
  }
}
