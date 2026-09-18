/**
 * Socket.IO TypeScript type definitions for DevFlow
 */

import type { Server, Socket } from 'socket.io';

export interface SocketUser {
  userId: string;
  email: string;
}

export interface SocketData {
  user: SocketUser;
}

export interface JoinOrganizationPayload {
  organizationId: string;
}

export interface LeaveOrganizationPayload {
  organizationId: string;
}

export interface JoinProjectPayload {
  organizationId: string;
  projectId: string;
}

export interface LeaveProjectPayload {
  organizationId: string;
  projectId: string;
}

export interface GetPresencePayload {
  organizationId: string;
}

export interface SocketSuccessResponse {
  success: true;
  organizationId?: string;
  projectId?: string;
  room?: string;
  onlineUserIds?: string[];
}

export interface SocketErrorResponse {
  success: false;
  message: string;
}

export type SocketResponse = SocketSuccessResponse | SocketErrorResponse;

export interface ClientToServerEvents {
  'join:organization': (
    payload: JoinOrganizationPayload,
    callback?: (response: SocketResponse) => void
  ) => void;
  'leave:organization': (
    payload: LeaveOrganizationPayload,
    callback?: (response: SocketResponse) => void
  ) => void;
  'join:project': (
    payload: JoinProjectPayload,
    callback?: (response: SocketResponse) => void
  ) => void;
  'leave:project': (
    payload: LeaveProjectPayload,
    callback?: (response: SocketResponse) => void
  ) => void;
  'get:presence': (
    payload: GetPresencePayload,
    callback?: (response: SocketResponse) => void
  ) => void;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface TaskEventData {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  position: number;
  assigneeId: string | null;
  createdById: string;
  dueDate: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  assignee: SafeUser | null;
  createdBy: SafeUser | null;
}

export interface TaskCreatedPayload {
  organizationId: string;
  projectId: string;
  task: TaskEventData;
}

export interface TaskUpdatedPayload {
  organizationId: string;
  projectId: string;
  task: TaskEventData;
}

export interface TaskMovedPayload {
  organizationId: string;
  projectId: string;
  task: TaskEventData;
  affectedTaskIds: string[];
}

export interface TaskDeletedPayload {
  organizationId: string;
  projectId: string;
  taskId: string;
}

export interface CommentEventData {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  author: SafeUser;
}

export interface CommentCreatedPayload {
  organizationId: string;
  projectId: string;
  taskId: string;
  comment: CommentEventData;
}

export interface CommentUpdatedPayload {
  organizationId: string;
  projectId: string;
  taskId: string;
  comment: CommentEventData;
}

export interface CommentDeletedPayload {
  organizationId: string;
  projectId: string;
  taskId: string;
  commentId: string;
}

export interface ChatMessageEventData {
  id: string;
  organizationId: string;
  authorId: string;
  content: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  author: SafeUser;
}

export interface ChatMessagePayload {
  organizationId: string;
  message: ChatMessageEventData;
}

export interface NotificationEventData {
  id: string;
  userId: string;
  organizationId: string;
  type: string;
  title: string;
  message: string;
  readAt: Date | string | null;
  createdAt: Date | string;
}

export interface NotificationNewPayload {
  notification: NotificationEventData;
}

export interface NotificationReadPayload {
  notificationId: string;
  readAt: Date | string;
}

export interface NotificationReadAllPayload {
  readAt: Date | string;
}

export interface PresenceOnlinePayload {
  userId: string;
  organizationId: string;
}

export interface PresenceOfflinePayload {
  userId: string;
  organizationId: string;
}

export interface ServerToClientEvents {
  'task:created': (payload: TaskCreatedPayload) => void;
  'task:updated': (payload: TaskUpdatedPayload) => void;
  'task:moved': (payload: TaskMovedPayload) => void;
  'task:deleted': (payload: TaskDeletedPayload) => void;
  'comment:created': (payload: CommentCreatedPayload) => void;
  'comment:updated': (payload: CommentUpdatedPayload) => void;
  'comment:deleted': (payload: CommentDeletedPayload) => void;
  'chat:message': (payload: ChatMessagePayload) => void;
  'notification:new': (payload: NotificationNewPayload) => void;
  'notification:read': (payload: NotificationReadPayload) => void;
  'notification:read-all': (payload: NotificationReadAllPayload) => void;
  'presence:online': (payload: PresenceOnlinePayload) => void;
  'presence:offline': (payload: PresenceOfflinePayload) => void;
}

export interface InterServerEvents {
  // Reserved for future multi-node / adapter events
}

export type DevFlowSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export type DevFlowSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
