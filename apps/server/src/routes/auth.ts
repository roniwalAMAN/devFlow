/**
 * Authentication routes
 */

import { Router, type Router as ExpressRouter } from 'express';
import { register, login, getMe } from '../controllers/auth';
import { authenticate } from '../middleware/auth';

const router: ExpressRouter = Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me (Protected route)
router.get('/me', authenticate, getMe);

export default router;
