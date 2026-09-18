/**
 * BullMQ Queues Configuration
 * Defines background job queues with exponential backoff retries and failure handling
 */

import { Queue, type QueueOptions } from 'bullmq';
import { getRedisClient } from '../services/redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Parse Redis connection options from REDIS_URL or use host/port
function getQueueRedisOptions() {
  try {
    const parsed = new URL(REDIS_URL);
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port || '6379', 10),
      password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    };
  }
}

const defaultQueueOptions: QueueOptions = {
  connection: getQueueRedisOptions(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1s, 2s, 4s
    },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
};

export const QUEUE_NAMES = {
  AI: 'ai',
  NOTIFICATIONS: 'notifications',
  GITHUB: 'github',
  ANALYTICS: 'analytics',
} as const;

export let aiQueue: Queue | null = null;
export let notificationsQueue: Queue | null = null;
export let githubQueue: Queue | null = null;
export let analyticsQueue: Queue | null = null;

try {
  aiQueue = new Queue(QUEUE_NAMES.AI, defaultQueueOptions);
  notificationsQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, defaultQueueOptions);
  githubQueue = new Queue(QUEUE_NAMES.GITHUB, defaultQueueOptions);
  analyticsQueue = new Queue(QUEUE_NAMES.ANALYTICS, defaultQueueOptions);
} catch (err) {
  console.warn('[BullMQ] Queues initialization deferred:', err);
}

/**
 * Close all BullMQ queues for graceful shutdown
 */
export async function closeQueues(): Promise<void> {
  const queues = [aiQueue, notificationsQueue, githubQueue, analyticsQueue];
  for (const q of queues) {
    if (q) {
      try {
        await q.close();
      } catch {
        // Ignore shutdown errors
      }
    }
  }
}
