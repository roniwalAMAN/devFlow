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
  deleteProjectHandler,
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
  updateCommentHandler,
  deleteCommentHandler,
} from '../controllers/comment';
import {
  sendChatMessageHandler,
  listChatMessagesHandler,
} from '../controllers/chat';
import { listOrganizationActivityHandler } from '../controllers/activity';
import {
  linkProjectRepoHandler,
  unlinkProjectRepoHandler,
  getProjectRepoDetailsHandler,
  getProjectCommitsHandler,
  getProjectPullsHandler,
  getProjectIssuesHandler,
} from '../controllers/projectGithub';
import { authenticate } from '../middleware/auth';
import { requireOrganizationRole } from '../middleware/rbac';
import { githubRateLimiter } from '../middleware/rateLimit';

const router: ExpressRouter = Router();

// POST /api/organizations (Protected route)
router.post('/', authenticate, createOrganizationHandler);

// GET /api/organizations (Protected route)
router.get('/', authenticate, listOrganizationsHandler);

// GET /api/organizations/:organizationId (Protected route)
router.get('/:organizationId', authenticate, getOrganizationByIdHandler);

// GET /api/organizations/:organizationId/activity (Protected route - OWNER, ADMIN only)
router.get(
  '/:organizationId/activity',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN'),
  listOrganizationActivityHandler
);

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

// DELETE /api/organizations/:organizationId/projects/:projectId (Protected route - OWNER, ADMIN only)
router.delete(
  '/:organizationId/projects/:projectId',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN'),
  deleteProjectHandler
);

// POST /api/organizations/:organizationId/projects/:projectId/github/repository (OWNER, ADMIN only)
router.post(
  '/:organizationId/projects/:projectId/github/repository',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN'),
  githubRateLimiter,
  linkProjectRepoHandler
);

// DELETE /api/organizations/:organizationId/projects/:projectId/github/repository (OWNER, ADMIN only)
router.delete(
  '/:organizationId/projects/:projectId/github/repository',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN'),
  unlinkProjectRepoHandler
);

// GET /api/organizations/:organizationId/projects/:projectId/github/repository (All members)
router.get(
  '/:organizationId/projects/:projectId/github/repository',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'),
  getProjectRepoDetailsHandler
);

// GET /api/organizations/:organizationId/projects/:projectId/github/commits (All members)
router.get(
  '/:organizationId/projects/:projectId/github/commits',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'),
  githubRateLimiter,
  getProjectCommitsHandler
);

// GET /api/organizations/:organizationId/projects/:projectId/github/pulls (All members)
router.get(
  '/:organizationId/projects/:projectId/github/pulls',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'),
  githubRateLimiter,
  getProjectPullsHandler
);

// GET /api/organizations/:organizationId/projects/:projectId/github/issues (All members)
router.get(
  '/:organizationId/projects/:projectId/github/issues',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'),
  githubRateLimiter,
  getProjectIssuesHandler
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

// PATCH /api/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments/:commentId (Protected route)
router.patch(
  '/:organizationId/projects/:projectId/tasks/:taskId/comments/:commentId',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'),
  updateCommentHandler
);

// DELETE /api/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments/:commentId (Protected route)
router.delete(
  '/:organizationId/projects/:projectId/tasks/:taskId/comments/:commentId',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'),
  deleteCommentHandler
);

// POST /api/organizations/:organizationId/chat/messages (Protected route)
router.post(
  '/:organizationId/chat/messages',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'),
  sendChatMessageHandler
);

// GET /api/organizations/:organizationId/chat/messages (Protected route)
router.get(
  '/:organizationId/chat/messages',
  authenticate,
  requireOrganizationRole('OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'),
  listChatMessagesHandler
);

export default router;
