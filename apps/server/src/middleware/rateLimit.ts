/**
 * Rate Limiting Middleware
 * Redis-backed rate limiting with memory fallback for graceful degradation
 */

import { Request, Response, NextFunction } from 'express';
import { getRedisClient, isRedisAvailable } from '../services/redis';
import type { AuthenticatedRequest } from './auth';

interface RateLimitOptions {
  windowSeconds: number;
  maxRequests: number;
  keyPrefix?: string;
  message?: string;
}

// Memory fallback store for rate limits
interface MemoryRateLimitRecord {
  count: number;
  resetTime: number;
}
const memoryRateLimits = new Map<string, MemoryRateLimitRecord>();

/**
 * Create a rate limiting middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowSeconds,
    maxRequests,
    keyPrefix = 'rl',
    message = 'Too many requests. Please try again later.',
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Determine unique identifier for client (user ID if authenticated, else IP)
    const authReq = req as AuthenticatedRequest;
    const identifier = authReq.user?.userId || req.ip || req.socket.remoteAddress || 'anonymous';
    const rateLimitKey = `ratelimit:${keyPrefix}:${identifier}`;

    const redis = getRedisClient();

    if (isRedisAvailable() && redis) {
      try {
        const currentCount = await redis.incr(rateLimitKey);
        if (currentCount === 1) {
          await redis.expire(rateLimitKey, windowSeconds);
        }

        const ttl = await redis.ttl(rateLimitKey);
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - currentCount));
        res.setHeader('X-RateLimit-Reset', Date.now() + ttl * 1000);

        if (currentCount > maxRequests) {
          res.status(429).json({
            success: false,
            message,
          });
          return;
        }

        next();
        return;
      } catch {
        // Fallback to memory
      }
    }

    // Memory Fallback
    const now = Date.now();
    const record = memoryRateLimits.get(rateLimitKey);

    if (!record || now > record.resetTime) {
      memoryRateLimits.set(rateLimitKey, {
        count: 1,
        resetTime: now + windowSeconds * 1000,
      });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      next();
      return;
    }

    record.count++;
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', record.resetTime);

    if (record.count > maxRequests) {
      res.status(429).json({
        success: false,
        message,
      });
      return;
    }

    next();
  };
}

/**
 * Pre-configured rate limiters for different application surfaces
 */
export const authRateLimiter = createRateLimiter({
  windowSeconds: 900, // 15 minutes
  maxRequests: 30,
  keyPrefix: 'auth',
  message: 'Too many authentication attempts. Please try again in a few minutes.',
});

export const aiRateLimiter = createRateLimiter({
  windowSeconds: 60, // 1 minute
  maxRequests: 15,
  keyPrefix: 'ai',
  message: 'AI request limit reached. Please wait before asking another question.',
});

export const githubRateLimiter = createRateLimiter({
  windowSeconds: 60, // 1 minute
  maxRequests: 30,
  keyPrefix: 'github',
  message: 'GitHub API rate limit reached. Please try again shortly.',
});
