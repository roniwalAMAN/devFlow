/**
 * BullMQ Job Producers
 * Helper functions to enqueue asynchronous tasks with graceful inline fallback
 */

import { notificationsQueue, githubQueue, aiQueue, analyticsQueue } from './queues';
import { createNotification, CreateNotificationInput } from '../services/notification';

/**
 * Enqueue notification delivery job
 */
export async function enqueueNotificationJob(
  data: CreateNotificationInput
): Promise<void> {
  try {
    if (notificationsQueue) {
      await notificationsQueue.add('send-notification', data);
      return;
    }
  } catch (err) {
    // Fallback to inline execution if queue is unavailable
  }

  // Inline fallback
  try {
    await createNotification(data);
  } catch (err) {
    console.error('[Notification Producer] Failed inline fallback delivery:', err);
  }
}

/**
 * Enqueue GitHub repository sync job
 */
export async function enqueueGitHubSyncJob(data: {
  projectId: string;
  organizationId: string;
  action: string;
}): Promise<void> {
  try {
    if (githubQueue) {
      await githubQueue.add('sync-repo', data);
    }
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Enqueue AI asynchronous task job
 */
export async function enqueueAIJob(data: {
  taskId: string;
  prompt: string;
  context?: any;
}): Promise<void> {
  try {
    if (aiQueue) {
      await aiQueue.add('process-ai', data);
    }
  } catch (err) {
    // Non-blocking
  }
}

/**
 * Enqueue Analytics aggregation job
 */
export async function enqueueAnalyticsJob(data: {
  organizationId: string;
  activityData: any;
}): Promise<void> {
  try {
    if (analyticsQueue) {
      await analyticsQueue.add('record-activity', data);
    }
  } catch (err) {
    // Non-blocking
  }
}
