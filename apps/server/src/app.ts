/**
 * Express Application Configuration
 */

import express, { type Express } from 'express';
import cors from 'cors';
import { checkDatabaseConnection, getDatabaseHealth } from './services/db';
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

/**
 * Normalize an origin URL by stripping surrounding quotes, whitespace, and trailing slashes
 */
export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/^["']|["']$/g, '').replace(/\/+$/, '');
}

/**
 * Resolve allowed origins from CLIENT_URL (supports comma-separated list) plus defaults
 */
export function getAllowedOrigins(): string[] {
  const envOrigins = (process.env.CLIENT_URL || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);

  const defaults = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://dev-flow-jet-nine.vercel.app',
  ];

  return Array.from(new Set([...envOrigins, ...defaults]));
}

export function createApp(): Express {
  const app = express();

  // 1. Disable Express fingerprinting and trust first proxy hop (Render / Cloudflare)
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // 2. Production Security Headers
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '0');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // 3. CORS Configuration
  const corsOptions: cors.CorsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server, Render health checks)
      if (!origin) return callback(null, true);

      const allowedOrigins = getAllowedOrigins();
      const normalizedOrigin = normalizeOrigin(origin);

      if (allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-refresh-token',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Content-Type', 'Authorization', 'x-refresh-token'],
    maxAge: 86400,
    optionsSuccessStatus: 204,
  };

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  // 4. Request Body Parsing
  app.use(express.json());

  // 5. Application Routes
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
      const dbHealth = await getDatabaseHealth();

      if (!dbHealth.connected) {
        res.status(503).json({
          success: false,
          status: 'error',
          service: 'database',
          message: 'Database connection failed',
        });
        return;
      }

      if (!dbHealth.migrated) {
        res.status(503).json({
          success: false,
          status: 'unmigrated',
          service: 'database',
          message:
            `Database connection is healthy, but required tables are missing: ${dbHealth.missingTables.join(', ')}. Please run database migrations (pnpm prisma:migrate).`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        status: 'ok',
        service: 'database',
        message: 'Database connection is healthy and schema is migrated',
      });
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

  // 6. Unknown API Route 404 Handler
  app.use('/api/*', (_req, res) => {
    res.status(404).json({
      success: false,
      message: 'Endpoint not found',
    });
  });

  // 7. Global Production Error Handler
  app.use(
    (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (err?.message?.includes('CORS origin not allowed')) {
        res.status(403).json({
          success: false,
          message: 'Forbidden. Cross-Origin request not permitted from this origin.',
        });
        return;
      }

      console.error('Unhandled application error:', err);
      const isProd = process.env.NODE_ENV === 'production';
      res.status(err.status || 500).json({
        success: false,
        message: isProd ? 'Internal server error' : err.message || 'Internal server error',
      });
    }
  );

  return app;
}
