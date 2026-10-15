/**
 * Invite routes
 */

import { Router, type Router as ExpressRouter } from 'express';
import { acceptInviteHandler } from '../controllers/invite';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimit';

const router: ExpressRouter = Router();

// POST /api/invites/:token/accept (Protected route)
router.post('/:token/accept', authenticate, authRateLimiter, acceptInviteHandler);

export default router;
