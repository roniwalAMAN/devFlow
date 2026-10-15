/**
 * Standalone BullMQ Worker Entrypoint
 * Used when running background processing as a dedicated Render Background Worker service
 */

import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local'), override: true });

import { prisma } from '@devflow/database';
import { initWorkers, closeWorkers } from './jobs/workers';
import { closeQueues } from './jobs/queues';
import { closeRedis, getRedisClient } from './services/redis';

console.log('🔄 Starting DevFlow Standalone Background Worker...');

// Initialize Redis and start worker processors
getRedisClient();
initWorkers();

console.log('✅ DevFlow Background Worker is actively listening for jobs (notifications, github, ai, analytics)');

// Graceful shutdown handling
let isShuttingDown = false;

async function handleGracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\nReceived ${signal}. Shutting down worker gracefully...`);

  try {
    await closeWorkers();
    await closeQueues();
    await closeRedis();
    await prisma.$disconnect();
    console.log('Worker connections closed. Exiting.');
    process.exit(0);
  } catch (error) {
    console.error('Error during worker shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
