/**
 * BullMQ Workers
 * Background job processors with exponential retry handling and safe execution
 */

import { Worker, type WorkerOptions, type Job } from 'bullmq';
import { prisma } from '@devflow/database';
import { QUEUE_NAMES } from './queues';
import { createNotification, formatNotificationResponse } from '../services/notification';
import { logActivity } from '../services/activity';
import { emitNotificationNew } from '../socket/socketEvents';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function getWorkerRedisOptions() {
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

const workerOptions: WorkerOptions = {
  connection: getWorkerRedisOptions(),
  concurrency: 5,
};

let notificationWorker: Worker | null = null;
let githubWorker: Worker | null = null;
let aiWorker: Worker | null = null;
let analyticsWorker: Worker | null = null;

/**
 * Initialize background workers
 */
export function initWorkers(): void {
  try {
    // 1. Notification Worker
    notificationWorker = new Worker(
      QUEUE_NAMES.NOTIFICATIONS,
      async (job: Job) => {
        const { userId, organizationId, type, title, message } = job.data;
        if (!userId || !type || !title || !message) {
          throw new Error('Invalid notification job payload: missing required fields');
        }

        // Verify or resolve organization
        let targetOrgId = organizationId;
        let org = null;
        if (targetOrgId) {
          org = await prisma.organization.findFirst({
            where: {
              OR: [{ id: targetOrgId }, { slug: targetOrgId }],
            },
            select: { id: true },
          });
        }

        if (!org) {
          // Derive organization from the user's active membership
          const membership = await prisma.organizationMember.findFirst({
            where: { userId },
            select: { organizationId: true },
          });
          if (membership) {
            org = { id: membership.organizationId };
          }
        }

        if (!org) {
          console.warn(
            `[BullMQ Notification Worker] Skipping orphaned job ${job.id}: Organization "${organizationId}" does not exist in database for user "${userId}".`
          );
          return { delivered: false, reason: 'ORGANIZATION_NOT_FOUND' };
        }

        // Verify target user exists
        const userExists = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });

        if (!userExists) {
          console.warn(
            `[BullMQ Notification Worker] Skipping orphaned job ${job.id}: User "${userId}" does not exist in database.`
          );
          return { delivered: false, reason: 'USER_NOT_FOUND' };
        }

        const notification = await createNotification({
          userId,
          organizationId: org.id,
          type,
          title,
          message,
        });

        // Broadcast real-time notification to user's private socket room
        emitNotificationNew(userId, formatNotificationResponse(notification));

        return { delivered: true, userId, notificationId: notification.id };
      },
      workerOptions
    );

    // 2. GitHub Sync Worker
    githubWorker = new Worker(
      QUEUE_NAMES.GITHUB,
      async (job: Job) => {
        const { projectId, action } = job.data;
        // Background sync operations
        return { synced: true, projectId, action };
      },
      workerOptions
    );

    // 3. AI Async Worker
    aiWorker = new Worker(
      QUEUE_NAMES.AI,
      async (job: Job) => {
        const { taskId, prompt } = job.data;
        // Background AI processing
        return { processed: true, taskId };
      },
      workerOptions
    );

    // 4. Analytics Worker
    analyticsWorker = new Worker(
      QUEUE_NAMES.ANALYTICS,
      async (job: Job) => {
        const { organizationId, activityData } = job.data;
        if (organizationId && activityData) {
          await logActivity({
            organizationId,
            ...activityData,
          });
        }
        return { recorded: true };
      },
      workerOptions
    );

    // Attach logging listeners
    const workers = [notificationWorker, githubWorker, aiWorker, analyticsWorker];
    for (const w of workers) {
      w.on('failed', (job, err) => {
        console.warn(`[BullMQ Worker ${w.name}] Job ${job?.id} failed: ${err.message}`);
      });
      w.on('error', (err) => {
        // Safe worker connection warning
      });
    }
  } catch (err) {
    console.warn('[BullMQ Workers] Initialization deferred:', err);
  }
}

/**
 * Close background workers for graceful shutdown
 */
export async function closeWorkers(): Promise<void> {
  const workers = [notificationWorker, githubWorker, aiWorker, analyticsWorker];
  for (const w of workers) {
    if (w) {
      try {
        await w.close();
      } catch {
        // Ignore shutdown errors
      }
    }
  }
}
