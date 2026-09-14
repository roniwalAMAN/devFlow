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
  createOrganizationInviteHandler,
  listOrganizationInvitesHandler,
  revokeOrganizationInviteHandler,
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

// POST /api/organizations/:organizationId/invites (Protected route)
router.post(
  '/:organizationId/invites',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN'),
  createOrganizationInviteHandler
);

// GET /api/organizations/:organizationId/invites (Protected route)
router.get(
  '/:organizationId/invites',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN'),
  listOrganizationInvitesHandler
);

// DELETE /api/organizations/:organizationId/invites/:inviteId (Protected route)
router.delete(
  '/:organizationId/invites/:inviteId',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN'),
  revokeOrganizationInviteHandler
);

export default router;
