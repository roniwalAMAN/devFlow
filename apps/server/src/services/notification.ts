/**
 * Notification service layer
 * Handles user notification creation, retrieval, and status updates
 */

import { prisma } from '@devflow/database';
import type { Notification } from '@devflow/database';

export const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_REASSIGNED: 'TASK_REASSIGNED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_COMMENT_ADDED: 'TASK_COMMENT_ADDED',
} as const;

export interface CreateNotificationInput {
  userId: string;
  organizationId: string;
  type: string;
  title: string;
  message: string;
}

/**
 * Create a new notification for a user
 * Safely resolves organizationId by ID/slug or user membership to guarantee FK integrity
 */
export async function createNotification(
  data: CreateNotificationInput
): Promise<Notification> {
  // 1. Resolve organization by ID or slug
  let resolvedOrgId = data.organizationId;
  const org = await prisma.organization.findFirst({
    where: {
      OR: [{ id: data.organizationId }, { slug: data.organizationId }],
    },
    select: { id: true },
  });

  if (org) {
    resolvedOrgId = org.id;
  } else {
    // Try deriving organization from the user's active membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: data.userId },
      select: { organizationId: true },
    });

    if (membership) {
      resolvedOrgId = membership.organizationId;
    } else {
      throw new Error(
        `Cannot create notification: Organization "${data.organizationId}" not found in database for user "${data.userId}"`
      );
    }
  }

  // 2. Verify target user exists
  const userExists = await prisma.user.findUnique({
    where: { id: data.userId },
    select: { id: true },
  });

  if (!userExists) {
    throw new Error(
      `Cannot create notification: User "${data.userId}" not found in database`
    );
  }

  return prisma.notification.create({
    data: {
      userId: data.userId,
      organizationId: resolvedOrgId,
      type: data.type,
      title: data.title,
      message: data.message,
    },
  });
}

/**
 * Get all notifications for a user ordered by createdAt descending
 */
export async function getUserNotifications(
  userId: string
): Promise<Notification[]> {
  return prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Mark a single notification as read (owned by user)
 */
export async function markNotificationAsRead(
  userId: string,
  notificationId: string
): Promise<Notification | null> {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },
  });

  if (!notification) {
    return null;
  }

  return prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      readAt: new Date(),
    },
  });
}

/**
 * Mark all notifications for a user as read
 */
export async function markAllNotificationsAsRead(
  userId: string
): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  return result.count;
}

/**
 * Format notification response object
 */
export function formatNotificationResponse(notification: Notification) {
  return {
    id: notification.id,
    userId: notification.userId,
    organizationId: notification.organizationId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}
