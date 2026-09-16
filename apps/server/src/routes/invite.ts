/**
 * Invite routes
 */

import { Router, type Router as ExpressRouter } from 'express';
import { acceptInviteHandler } from '../controllers/invite';
import { authenticate } from '../middleware/auth';

const router: ExpressRouter = Router();

// POST /api/invites/:token/accept (Protected route)
router.post('/:token/accept', authenticate, acceptInviteHandler);

export default router;
