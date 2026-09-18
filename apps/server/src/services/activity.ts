/**
 * Activity & Audit Logging Service
 * Records audit logs for organization actions with automatic credential redaction
 */

import { prisma, type ActivityLog, type User } from '@devflow/database';

export const ACTIVITY_ACTIONS = {
  ORGANIZATION_CREATED: 'ORGANIZATION_CREATED',
  MEMBER_ADDED: 'MEMBER_ADDED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
  MEMBER_ROLE_UPDATED: 'MEMBER_ROLE_UPDATED',
  INVITE_CREATED: 'INVITE_CREATED',
  INVITE_REVOKED: 'INVITE_REVOKED',
  INVITE_ACCEPTED: 'INVITE_ACCEPTED',
  PROJECT_CREATED: 'PROJECT_CREATED',
  PROJECT_UPDATED: 'PROJECT_UPDATED',
  PROJECT_DELETED: 'PROJECT_DELETED',
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_MOVED: 'TASK_MOVED',
  TASK_DELETED: 'TASK_DELETED',
  COMMENT_CREATED: 'COMMENT_CREATED',
  COMMENT_DELETED: 'COMMENT_DELETED',
  GITHUB_REPO_LINKED: 'GITHUB_REPO_LINKED',
  GITHUB_REPO_UNLINKED: 'GITHUB_REPO_UNLINKED',
} as const;

export type ActivityAction =
  (typeof ACTIVITY_ACTIONS)[keyof typeof ACTIVITY_ACTIONS] | string;

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'jwt',
  'secret',
  'apikey',
  'authorization',
];

/**
 * Recursively sanitize metadata to remove sensitive credentials
 */
export function sanitizeMetadata(data: any): any {
  if (!data || typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeMetadata);
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
      clean[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitizeMetadata(value);
    } else {
      clean[key] = value;
    }
  }

  return clean;
}

export interface LogActivityParams {
  organizationId: string;
  userId?: string | null;
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, any> | null;
}

/**
 * Record an activity audit log
 */
export async function logActivity(params: LogActivityParams): Promise<ActivityLog | null> {
  const { organizationId, userId, action, entityType, entityId, metadata } = params;

  try {
    const cleanMeta = metadata ? sanitizeMetadata(metadata) : undefined;

    const log = await prisma.activityLog.create({
      data: {
        organizationId,
        userId: userId || null,
        action,
        entityType,
        entityId: entityId || null,
        metadata: cleanMeta,
      },
    });

    return log;
  } catch (error) {
    // Audit logging should never crash the main request flow
    console.error('[ActivityLog] Failed to record activity log:', error);
    return null;
  }
}

export interface FormattedActivityLog {
  id: string;
  organizationId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: any;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
}

/**
 * Format activity log response
 */
export function formatActivityLog(
  log: ActivityLog & { user?: User | null }
): FormattedActivityLog {
  return {
    id: log.id,
    organizationId: log.organizationId,
    userId: log.userId,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    metadata: log.metadata,
    createdAt: log.createdAt,
    user: log.user
      ? {
          id: log.user.id,
          name: log.user.name,
          email: log.user.email,
          avatar: log.user.avatar,
        }
      : null,
  };
}

/**
 * Get organization activity logs with pagination
 */
export async function getOrganizationActivityLogs(
  organizationId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{ logs: FormattedActivityLog[]; total: number }> {
  const limit = Math.min(Math.max(1, options.limit || 50), 100);
  const offset = Math.max(0, options.offset || 0);

  const [logs, total] = await Promise.all([
    prisma.activityLog.findMany({
      where: { organizationId },
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.activityLog.count({
      where: { organizationId },
    }),
  ]);

  return {
    logs: logs.map(formatActivityLog),
    total,
  };
}
