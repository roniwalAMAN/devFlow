/**
 * Authentication routes
 */

import { Router, type Router as ExpressRouter } from 'express';
import { register, login } from '../controllers/auth';

const router: ExpressRouter = Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

export default router;
