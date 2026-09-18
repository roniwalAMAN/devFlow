/**
 * Express Application Configuration
 */

import express, { type Express } from 'express';
import cors from 'cors';
import { checkDatabaseConnection } from './services/db';
import { isRedisAvailable } from './services/redis';
import authRoutes from './routes/auth';
import organizationRoutes from './routes/organization';
import inviteRoutes from './routes/invite';
import notificationRoutes from './routes/notification';
import githubRoutes from './routes/github';
import aiRoutes from './routes/ai';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  // Middleware
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  app.use(
    cors({
      origin: [clientUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-refresh-token'],
    })
  );
  app.use(express.json());

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/organizations', organizationRoutes);
  app.use('/api/invites', inviteRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/github', githubRoutes);
  app.use('/api/ai', aiRoutes);

  // Health check endpoint - API only
  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      status: 'ok',
      message: 'DevFlow API is running',
      timestamp: new Date().toISOString(),
    });
  });

  // Database health check endpoint
  app.get('/api/health/db', async (_req, res) => {
    try {
      const isConnected = await checkDatabaseConnection();

      if (isConnected) {
        res.status(200).json({
          success: true,
          status: 'ok',
          service: 'database',
          message: 'Database connection is healthy',
        });
      } else {
        res.status(500).json({
          success: false,
          status: 'error',
          service: 'database',
          message: 'Database connection failed',
        });
      }
    } catch {
      res.status(500).json({
        success: false,
        status: 'error',
        service: 'database',
        message: 'Database health check error',
      });
    }
  });

  // Redis health check endpoint
  app.get('/api/health/redis', (_req, res) => {
    const available = isRedisAvailable();
    res.status(available ? 200 : 503).json({
      success: available,
      status: available ? 'ok' : 'degraded',
      service: 'redis',
      message: available ? 'Redis connection is healthy' : 'Redis is offline or unavailable',
    });
  });

  // Full composite health check endpoint
  app.get('/api/health/full', async (_req, res) => {
    try {
      const dbConnected = await checkDatabaseConnection();
      const redisConnected = isRedisAvailable();

      const isHealthy = dbConnected; // DB is primary, Redis can degrade gracefully
      const status = isHealthy ? (redisConnected ? 'healthy' : 'degraded') : 'unhealthy';

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          api: { status: 'healthy' },
          database: { status: dbConnected ? 'healthy' : 'unhealthy' },
          redis: { status: redisConnected ? 'healthy' : 'degraded' },
        },
      });
    } catch {
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        message: 'Composite health check error',
      });
    }
  });

  return app;
}

