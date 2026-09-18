/**
 * AI Assistant Routes
 */

import { Router, type Router as ExpressRouter } from 'express';
import { askAIAssistantHandler } from '../controllers/ai';
import { authenticate } from '../middleware/auth';
import { aiRateLimiter } from '../middleware/rateLimit';

const router: ExpressRouter = Router();

// POST /api/ai/assistant
router.post('/assistant', authenticate, aiRateLimiter, askAIAssistantHandler);

export default router;
