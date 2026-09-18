import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env.local'), override: true });

import { createServer } from 'http';
import { prisma } from '@devflow/database';
import { createApp } from './app';
import { initializeSocket, closeSocket } from './socket/socket';
import { initWorkers, closeWorkers } from './jobs/workers';
import { closeQueues } from './jobs/queues';
import { closeRedis, getRedisClient } from './services/redis';

const PORT = process.env.PORT || 3001;

// 1. Create Express App
const app = createApp();

// 2. Create shared HTTP Server
const httpServer = createServer(app);

// 3. Initialize Socket.IO attached to HTTP server
const io = initializeSocket(httpServer);

// 4. Initialize Redis and BullMQ background workers
getRedisClient();
initWorkers();

// 5. Start shared HTTP + WebSocket Server
httpServer.listen(PORT, () => {
  console.log(`🚀 DevFlow server running on http://localhost:${PORT}`);
});

// Graceful shutdown handling
let isShuttingDown = false;

async function handleGracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);

  try {
    // 1. Close background workers & queues
    await closeWorkers();
    await closeQueues();
    await closeRedis();
    console.log('Background workers, queues, and Redis closed.');

    // 2. Close Socket.IO server
    await closeSocket();
    console.log('Socket.IO connections closed.');

    // 3. Close HTTP server
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    console.log('HTTP server closed.');

    // 4. Disconnect database
    await prisma.$disconnect();
    console.log('Database disconnected.');

    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

export { app, httpServer, io };
