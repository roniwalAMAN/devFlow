import { PrismaClient, MemberRole, TaskStatus, TaskPriority } from '@prisma/client';

export { PrismaClient, MemberRole, TaskStatus, TaskPriority };
export type {
  User,
  Organization,
  OrganizationMember,
  RefreshToken,
  OrganizationInvite,
  Project,
  Task,
  TaskComment,
  ChatMessage,
  Notification,
  GitHubConnection,
  ActivityLog,
} from '@prisma/client';
export type OrganizationRole = MemberRole;
export const OrganizationRole = MemberRole;

// Export a singleton instance

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

