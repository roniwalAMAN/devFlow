/**
 * GitHub User Connection Routes
 */

import { Router, type Router as ExpressRouter } from 'express';
import {
  connectGitHubHandler,
  callbackGitHubHandler,
  getMeGitHubHandler,
  disconnectGitHubHandler,
} from '../controllers/github';
import { authenticate } from '../middleware/auth';
import { githubRateLimiter } from '../middleware/rateLimit';

const router: ExpressRouter = Router();

// GET /api/github/connect
router.get('/connect', authenticate, githubRateLimiter, connectGitHubHandler);

// GET /api/github/callback
router.get('/callback', githubRateLimiter, callbackGitHubHandler);

// GET /api/github/me
router.get('/me', authenticate, getMeGitHubHandler);

// DELETE /api/github/disconnect
router.delete('/disconnect', authenticate, disconnectGitHubHandler);

export default router;
