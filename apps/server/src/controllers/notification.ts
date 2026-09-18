/**
 * Notification controller
 * Handles user notification endpoints and real-time read events
 */

import type { Request, Response } from 'express';
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  formatNotificationResponse,
} from '../services/notification';
import {
  emitNotificationRead,
  emitNotificationReadAll,
} from '../socket/socketEvents';

/**
 * GET /api/notifications
 * List notifications for the authenticated user
 */
export async function listNotificationsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const notifications = await getUserNotifications(req.user.userId);
    const unreadCount = notifications.filter((n) => !n.readAt).length;

    res.status(200).json({
      success: true,
      data: notifications.map(formatNotificationResponse),
      unreadCount,
    });
  } catch (error) {
    console.error('List notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * PATCH /api/notifications/:notificationId/read
 * Mark a single notification as read
 */
export async function markNotificationReadHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const { notificationId } = req.params;

    if (!notificationId) {
      res.status(400).json({
        success: false,
        message: 'Notification ID is required',
      });
      return;
    }

    const notification = await markNotificationAsRead(
      req.user.userId,
      notificationId
    );

    if (!notification) {
      res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
      return;
    }

    const formatted = formatNotificationResponse(notification);

    // Emit real-time notification:read event to user's private room
    emitNotificationRead(req.user.userId, notificationId, notification.readAt!);

    res.status(200).json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications for the authenticated user as read
 */
export async function markAllNotificationsReadHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const count = await markAllNotificationsAsRead(req.user.userId);
    const readAt = new Date();

    // Emit real-time notification:read-all event to user's private room
    emitNotificationReadAll(req.user.userId, readAt);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      count,
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
