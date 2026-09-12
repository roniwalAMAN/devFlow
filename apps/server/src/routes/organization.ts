/**
 * Organization routes
 */

import { Router, type Router as ExpressRouter } from 'express';
import {
  createOrganizationHandler,
  listOrganizationsHandler,
  getOrganizationByIdHandler,
  addOrganizationMemberHandler,
  removeOrganizationMemberHandler,
  updateMemberRoleHandler,
} from '../controllers/organization';
import { authenticate } from '../middleware/auth';
import { requireOrganizationRole } from '../middleware/rbac';

const router: ExpressRouter = Router();

// POST /api/organizations (Protected route)
router.post('/', authenticate, createOrganizationHandler);

// GET /api/organizations (Protected route)
router.get('/', authenticate, listOrganizationsHandler);

// GET /api/organizations/:organizationId (Protected route)
router.get('/:organizationId', authenticate, getOrganizationByIdHandler);

// POST /api/organizations/:organizationId/members (Protected route)
router.post(
  '/:organizationId/members',
  authenticate,
  addOrganizationMemberHandler
);

// DELETE /api/organizations/:organizationId/members/:userId (Protected route)
router.delete(
  '/:organizationId/members/:userId',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN'),
  removeOrganizationMemberHandler
);

// PATCH /api/organizations/:organizationId/members/:userId/role (Protected route)
router.patch(
  '/:organizationId/members/:userId/role',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN'),
  updateMemberRoleHandler
);

export default router;
