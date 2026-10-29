/**
 * Database service module
 * Provides a clean interface to the shared Prisma Client
 */

import { prisma } from '@devflow/database';

export interface DatabaseHealthStatus {
  connected: boolean;
  migrated: boolean;
  missingTables: string[];
}

const REQUIRED_TABLES = [
  'User',
  'RefreshToken',
  'Organization',
  'OrganizationMember',
  'OrganizationInvite',
  'Project',
  'Task',
  'TaskComment',
  'ChatMessage',
  'Notification',
  'GitHubConnection',
  'ActivityLog',
] as const;

/**
 * Check database connectivity and migration status
 * @returns Promise<DatabaseHealthStatus>
 */
export async function getDatabaseHealth(): Promise<DatabaseHealthStatus> {
  try {
    // 1. Verify basic connection and authentication
    await prisma.$queryRaw`SELECT 1`;

    // 2. Verify that every table required by the Prisma schema exists
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'User', 'RefreshToken', 'Organization', 'OrganizationMember',
          'OrganizationInvite', 'Project', 'Task', 'TaskComment',
          'ChatMessage', 'Notification', 'GitHubConnection', 'ActivityLog'
        )
    `;
    const existingTables = new Set(tables.map(({ table_name }) => table_name));
    const missingTables = REQUIRED_TABLES.filter((table) => !existingTables.has(table));

    return {
      connected: true,
      migrated: missingTables.length === 0,
      missingTables,
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      connected: false,
      migrated: false,
      missingTables: [...REQUIRED_TABLES],
    };
  }
}

/**
 * Check database connectivity and schema readiness
 * @returns Promise<boolean> - true if database is reachable and schema is migrated
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  const health = await getDatabaseHealth();
  return health.connected && health.migrated;
}

/**
 * Export Prisma Client for use throughout the application
 */
export { prisma };
