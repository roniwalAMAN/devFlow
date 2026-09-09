/**
 * Authentication routes
 */

import { Router, type Router as ExpressRouter } from 'express';
import { register, login, refresh, logout, getMe } from '../controllers/auth';
import { authenticate } from '../middleware/auth';

const router: ExpressRouter = Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me (Protected route)
router.get('/me', authenticate, getMe);

export default router;
