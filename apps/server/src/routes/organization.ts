/**
 * Organization routes
 */

import { Router, type Router as ExpressRouter } from 'express';
import { createOrganizationHandler } from '../controllers/organization';
import { authenticate } from '../middleware/auth';

const router: ExpressRouter = Router();

// POST /api/organizations (Protected route)
router.post('/', authenticate, createOrganizationHandler);

export default router;
