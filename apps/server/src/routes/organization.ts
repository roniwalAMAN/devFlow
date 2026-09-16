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
  resendOrganizationInviteHandler,
} from '../controllers/organization';
import {
  createProjectHandler,
  listProjectsHandler,
  getProjectByIdHandler,
  updateProjectHandler,
} from '../controllers/project';
import {
  createTaskHandler,
  listTasksHandler,
  getTaskByIdHandler,
  updateTaskHandler,
  deleteTaskHandler,
  moveTaskHandler,
} from '../controllers/task';
import {
  createCommentHandler,
  listCommentsHandler,
} from '../controllers/comment';
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

// POST /api/organizations/:organizationId/invites/:inviteId/resend (Protected route)
router.post(
  '/:organizationId/invites/:inviteId/resend',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN'),
  resendOrganizationInviteHandler
);

// POST /api/organizations/:organizationId/projects (Protected route)
router.post(
  '/:organizationId/projects',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER'),
  createProjectHandler
);

// GET /api/organizations/:organizationId/projects (Protected route)
router.get(
  '/:organizationId/projects',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'),
  listProjectsHandler
);

// GET /api/organizations/:organizationId/projects/:projectId (Protected route)
router.get(
  '/:organizationId/projects/:projectId',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'),
  getProjectByIdHandler
);

// PATCH /api/organizations/:organizationId/projects/:projectId (Protected route)
router.patch(
  '/:organizationId/projects/:projectId',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER'),
  updateProjectHandler
);

// POST /api/organizations/:organizationId/projects/:projectId/tasks (Protected route)
router.post(
  '/:organizationId/projects/:projectId/tasks',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER'),
  createTaskHandler
);

// GET /api/organizations/:organizationId/projects/:projectId/tasks (Protected route)
router.get(
  '/:organizationId/projects/:projectId/tasks',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'),
  listTasksHandler
);

// GET /api/organizations/:organizationId/projects/:projectId/tasks/:taskId (Protected route)
router.get(
  '/:organizationId/projects/:projectId/tasks/:taskId',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'),
  getTaskByIdHandler
);

// PATCH /api/organizations/:organizationId/projects/:projectId/tasks/:taskId (Protected route)
router.patch(
  '/:organizationId/projects/:projectId/tasks/:taskId',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER'),
  updateTaskHandler
);

// PATCH /api/organizations/:organizationId/projects/:projectId/tasks/:taskId/move (Protected route)
router.patch(
  '/:organizationId/projects/:projectId/tasks/:taskId/move',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER'),
  moveTaskHandler
);

// DELETE /api/organizations/:organizationId/projects/:projectId/tasks/:taskId (Protected route)
router.delete(
  '/:organizationId/projects/:projectId/tasks/:taskId',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN'),
  deleteTaskHandler
);

// POST /api/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments (Protected route)
router.post(
  '/:organizationId/projects/:projectId/tasks/:taskId/comments',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'),
  createCommentHandler
);

// GET /api/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments (Protected route)
router.get(
  '/:organizationId/projects/:projectId/tasks/:taskId/comments',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'),
  listCommentsHandler
);

export default router;





