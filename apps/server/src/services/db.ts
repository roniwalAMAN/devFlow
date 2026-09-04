/**
 * Database service module
 * Provides a clean interface to the shared Prisma Client
 */

import { prisma } from '@devflow/database';

/**
 * Check database connectivity
 * @returns Promise<boolean> - true if database is reachable, false otherwise
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    // Execute a simple query to verify database connection
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
}

/**
 * Export Prisma Client for use throughout the application
 */
export { prisma };
