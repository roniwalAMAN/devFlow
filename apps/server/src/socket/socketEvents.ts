/**
 * Socket.IO event emission helper module
 * Handles broadcasting domain events to organization rooms and private user rooms
 */

import { getIOOptional } from './socket';
import type {
  ServerToClientEvents,
  TaskEventData,
  TaskCreatedPayload,
  TaskUpdatedPayload,
  TaskMovedPayload,
  TaskDeletedPayload,
  CommentEventData,
  CommentCreatedPayload,
  CommentUpdatedPayload,
  CommentDeletedPayload,
  ChatMessageEventData,
  ChatMessagePayload,
  NotificationEventData,
  NotificationNewPayload,
  NotificationReadPayload,
  NotificationReadAllPayload,
  PresenceOnlinePayload,
  PresenceOfflinePayload,
} from './socketTypes';

export const SOCKET_EVENTS = {
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  TASK_MOVED: 'task:moved',
  TASK_DELETED: 'task:deleted',
  COMMENT_CREATED: 'comment:created',
  COMMENT_UPDATED: 'comment:updated',
  COMMENT_DELETED: 'comment:deleted',
  CHAT_MESSAGE: 'chat:message',
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_READ_ALL: 'notification:read-all',
  PRESENCE_ONLINE: 'presence:online',
  PRESENCE_OFFLINE: 'presence:offline',
} as const;

/**
 * Emit an event to all sockets in an organization room
 */
export function emitOrganizationEvent<K extends keyof ServerToClientEvents>(
  organizationId: string,
  event: K,
  payload: Parameters<ServerToClientEvents[K]>[0]
): void {
  try {
    const io = getIOOptional();
    if (!io) return;
    const room = `organization:${organizationId}`;
    (io.to(room).emit as any)(event, payload);
  } catch (error) {
    console.error(
      `Failed to emit socket event '${event}' to organization '${organizationId}':`,
      error
    );
  }
}

/**
 * Emit an event to a user's private room (user:<userId>)
 */
export function emitUserEvent<K extends keyof ServerToClientEvents>(
  userId: string,
  event: K,
  payload: Parameters<ServerToClientEvents[K]>[0]
): void {
  try {
    const io = getIOOptional();
    if (!io) return;
    const room = `user:${userId}`;
    (io.to(room).emit as any)(event, payload);
  } catch (error) {
    console.error(
      `Failed to emit socket event '${event}' to user '${userId}':`,
      error
    );
  }
}

/**
 * Broadcast task:created event
 */
export function emitTaskCreated(
  organizationId: string,
  projectId: string,
  task: TaskEventData
): void {
  const payload: TaskCreatedPayload = {
    organizationId,
    projectId,
    task,
  };
  emitOrganizationEvent(organizationId, SOCKET_EVENTS.TASK_CREATED, payload);
}

/**
 * Broadcast task:updated event
 */
export function emitTaskUpdated(
  organizationId: string,
  projectId: string,
  task: TaskEventData
): void {
  const payload: TaskUpdatedPayload = {
    organizationId,
    projectId,
    task,
  };
  emitOrganizationEvent(organizationId, SOCKET_EVENTS.TASK_UPDATED, payload);
}

/**
 * Broadcast task:moved event
 */
export function emitTaskMoved(
  organizationId: string,
  projectId: string,
  task: TaskEventData,
  affectedTaskIds: string[]
): void {
  const payload: TaskMovedPayload = {
    organizationId,
    projectId,
    task,
    affectedTaskIds,
  };
  emitOrganizationEvent(organizationId, SOCKET_EVENTS.TASK_MOVED, payload);
}

/**
 * Broadcast task:deleted event
 */
export function emitTaskDeleted(
  organizationId: string,
  projectId: string,
  taskId: string
): void {
  const payload: TaskDeletedPayload = {
    organizationId,
    projectId,
    taskId,
  };
  emitOrganizationEvent(organizationId, SOCKET_EVENTS.TASK_DELETED, payload);
}

/**
 * Broadcast comment:created event
 */
export function emitCommentCreated(
  organizationId: string,
  projectId: string,
  taskId: string,
  comment: CommentEventData
): void {
  const payload: CommentCreatedPayload = {
    organizationId,
    projectId,
    taskId,
    comment,
  };
  emitOrganizationEvent(organizationId, SOCKET_EVENTS.COMMENT_CREATED, payload);
}

/**
 * Broadcast comment:updated event
 */
export function emitCommentUpdated(
  organizationId: string,
  projectId: string,
  taskId: string,
  comment: CommentEventData
): void {
  const payload: CommentUpdatedPayload = {
    organizationId,
    projectId,
    taskId,
    comment,
  };
  emitOrganizationEvent(organizationId, SOCKET_EVENTS.COMMENT_UPDATED, payload);
}

/**
 * Broadcast comment:deleted event
 */
export function emitCommentDeleted(
  organizationId: string,
  projectId: string,
  taskId: string,
  commentId: string
): void {
  const payload: CommentDeletedPayload = {
    organizationId,
    projectId,
    taskId,
    commentId,
  };
  emitOrganizationEvent(organizationId, SOCKET_EVENTS.COMMENT_DELETED, payload);
}

/**
 * Broadcast chat:message event
 */
export function emitChatMessage(
  organizationId: string,
  message: ChatMessageEventData
): void {
  const payload: ChatMessagePayload = {
    organizationId,
    message,
  };
  emitOrganizationEvent(organizationId, SOCKET_EVENTS.CHAT_MESSAGE, payload);
}

/**
 * Broadcast notification:new to private user room
 */
export function emitNotificationNew(
  userId: string,
  notification: NotificationEventData
): void {
  const payload: NotificationNewPayload = {
    notification,
  };
  emitUserEvent(userId, SOCKET_EVENTS.NOTIFICATION_NEW, payload);
}

/**
 * Broadcast notification:read to private user room
 */
export function emitNotificationRead(
  userId: string,
  notificationId: string,
  readAt: Date | string
): void {
  const payload: NotificationReadPayload = {
    notificationId,
    readAt,
  };
  emitUserEvent(userId, SOCKET_EVENTS.NOTIFICATION_READ, payload);
}

/**
 * Broadcast notification:read-all to private user room
 */
export function emitNotificationReadAll(
  userId: string,
  readAt: Date | string
): void {
  const payload: NotificationReadAllPayload = {
    readAt,
  };
  emitUserEvent(userId, SOCKET_EVENTS.NOTIFICATION_READ_ALL, payload);
}

/**
 * Broadcast presence:online event to organization room
 */
export function emitPresenceOnline(
  organizationId: string,
  userId: string
): void {
  const payload: PresenceOnlinePayload = {
    userId,
    organizationId,
  };
  emitOrganizationEvent(organizationId, SOCKET_EVENTS.PRESENCE_ONLINE, payload);
}

/**
 * Broadcast presence:offline event to organization room
 */
export function emitPresenceOffline(
  organizationId: string,
  userId: string
): void {
  const payload: PresenceOfflinePayload = {
    userId,
    organizationId,
  };
  emitOrganizationEvent(organizationId, SOCKET_EVENTS.PRESENCE_OFFLINE, payload);
}
