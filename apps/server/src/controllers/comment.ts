/**
 * Comment controller
 * Handles task comment creation, listing, editing, and deletion endpoints
 */

import type { Request, Response } from 'express';
import { MemberRole } from '@devflow/database';
import {
  validateCreateCommentInput,
  validateUpdateCommentInput,
} from '../utils/validation';
import {
  findOrganizationById,
  getOrganizationMember,
} from '../services/organization';
import { findProjectByIdAndOrg } from '../services/project';
import { getTaskDetails } from '../services/task';
import {
  createTaskComment,
  getTaskComments,
  getCommentDetails,
  updateTaskComment,
  deleteTaskComment,
  formatCommentResponse,
} from '../services/comment';
import {
  emitCommentCreated,
  emitCommentUpdated,
  emitCommentDeleted,
  emitNotificationNew,
} from '../socket/socketEvents';
import {
  createNotification,
  formatNotificationResponse,
  NOTIFICATION_TYPES,
} from '../services/notification';
import { logActivity, ACTIVITY_ACTIONS } from '../services/activity';
import { invalidateTaskCommentsCache } from '../services/cache';

/**
 * POST /api/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments
 * Create a new comment on a task
 */
export async function createCommentHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // 1. Verify user is authenticated
    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const { organizationId, projectId, taskId } = req.params;

    if (!organizationId || !projectId || !taskId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID, Project ID, and Task ID are required',
      });
      return;
    }

    // 2. Validate request body
    const validationErrors = validateCreateCommentInput(req.body);
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors,
      });
      return;
    }

    // 3. Verify organization exists
    const organization = await findOrganizationById(organizationId);
    if (!organization) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // 4. Verify user is an active member of the organization (OWNER, ADMIN, DEVELOPER, VIEWER)
    const requesterMembership = await getOrganizationMember(
      organizationId,
      req.user.userId
    );

    if (!requesterMembership) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You are not a member of this organization',
      });
      return;
    }

    // 5. Verify project exists AND belongs to the specified organization
    const project = await findProjectByIdAndOrg(organizationId, projectId);
    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found in this organization',
      });
      return;
    }

    // 6. Verify task exists AND belongs to the specified project
    const task = await getTaskDetails(projectId, taskId);
    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found in this project',
      });
      return;
    }

    const { content } = req.body;

    // 7. Create comment
    const comment = await createTaskComment({
      taskId,
      authorId: req.user.userId,
      content,
    });

    const formattedComment = formatCommentResponse(comment);

    // 8. Emit comment:created event to organization room
    emitCommentCreated(organizationId, projectId, taskId, formattedComment);

    // 9. Auto-create and emit notification to task assignee & creator if applicable
    if (task.assigneeId && task.assigneeId !== req.user.userId) {
      try {
        const notif = await createNotification({
          userId: task.assigneeId,
          organizationId,
          type: NOTIFICATION_TYPES.TASK_COMMENT_ADDED,
          title: 'New comment on assigned task',
          message: `${req.user.email} commented on "${task.title}": "${content.trim().slice(0, 60)}"`,
        });
        emitNotificationNew(task.assigneeId, formatNotificationResponse(notif));
      } catch (err) {
        console.error('Failed to create assignee comment notification:', err);
      }
    }

    if (
      task.createdById &&
      task.createdById !== req.user.userId &&
      task.createdById !== task.assigneeId
    ) {
      try {
        const notif = await createNotification({
          userId: task.createdById,
          organizationId,
          type: NOTIFICATION_TYPES.TASK_COMMENT_ADDED,
          title: 'New comment on task you created',
          message: `${req.user.email} commented on "${task.title}": "${content.trim().slice(0, 60)}"`,
        });
        emitNotificationNew(task.createdById, formatNotificationResponse(notif));
      } catch (err) {
        console.error('Failed to create creator comment notification:', err);
      }
    }

    // 10. Record Audit Log & Invalidate Cache
    await Promise.all([
      logActivity({
        organizationId,
        userId: req.user.userId,
        action: ACTIVITY_ACTIONS.COMMENT_CREATED,
        entityType: 'COMMENT',
        entityId: comment.id,
        metadata: { taskId, contentLength: comment.content.length },
      }),
      invalidateTaskCommentsCache(taskId),
    ]);

    // 11. Return HTTP 201 with formatted safe comment data
    res.status(201).json({
      success: true,
      data: formattedComment,
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * GET /api/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments
 * List all comments for a task ordered by createdAt ascending
 */
export async function listCommentsHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // 1. Verify user is authenticated
    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const { organizationId, projectId, taskId } = req.params;

    if (!organizationId || !projectId || !taskId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID, Project ID, and Task ID are required',
      });
      return;
    }

    // 2. Verify organization exists
    const organization = await findOrganizationById(organizationId);
    if (!organization) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // 3. Verify user is an active member of the organization
    const requesterMembership = await getOrganizationMember(
      organizationId,
      req.user.userId
    );

    if (!requesterMembership) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You are not a member of this organization',
      });
      return;
    }

    // 4. Verify project exists AND belongs to the specified organization
    const project = await findProjectByIdAndOrg(organizationId, projectId);
    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found in this organization',
      });
      return;
    }

    // 5. Verify task exists AND belongs to the specified project
    const task = await getTaskDetails(projectId, taskId);
    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found in this project',
      });
      return;
    }

    // 6. Fetch comments
    const comments = await getTaskComments(taskId);

    // 7. Return HTTP 200 with formatted safe comments data
    res.status(200).json({
      success: true,
      data: comments.map(formatCommentResponse),
    });
  } catch (error) {
    console.error('List comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * PATCH /api/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments/:commentId
 * Update comment content (Author only)
 */
export async function updateCommentHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // 1. Verify user is authenticated
    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const { organizationId, projectId, taskId, commentId } = req.params;

    if (!organizationId || !projectId || !taskId || !commentId) {
      res.status(400).json({
        success: false,
        message:
          'Organization ID, Project ID, Task ID, and Comment ID are required',
      });
      return;
    }

    // 2. Validate request body
    const validationErrors = validateUpdateCommentInput(req.body);
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors,
      });
      return;
    }

    // 3. Verify organization exists
    const organization = await findOrganizationById(organizationId);
    if (!organization) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // 4. Verify user is an active member of the organization
    const requesterMembership = await getOrganizationMember(
      organizationId,
      req.user.userId
    );

    if (!requesterMembership) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You are not a member of this organization',
      });
      return;
    }

    // 5. Verify project exists AND belongs to the specified organization
    const project = await findProjectByIdAndOrg(organizationId, projectId);
    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found in this organization',
      });
      return;
    }

    // 6. Verify task exists AND belongs to the specified project
    const task = await getTaskDetails(projectId, taskId);
    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found in this project',
      });
      return;
    }

    // 7. Verify comment exists and belongs to the complete hierarchy: org -> project -> task -> comment
    const comment = await getCommentDetails(
      organizationId,
      projectId,
      taskId,
      commentId
    );

    if (!comment) {
      res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
      return;
    }

    // 8. Author check: ONLY comment author can edit
    if (comment.authorId !== req.user.userId) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Only the comment author can edit this comment',
      });
      return;
    }

    const { content } = req.body;

    // 9. Update comment
    const updatedComment = await updateTaskComment(commentId, content);
    const formattedComment = formatCommentResponse(updatedComment);

    // 10. Emit comment:updated event to organization room
    emitCommentUpdated(organizationId, projectId, taskId, formattedComment);

    // 11. Return HTTP 200 with formatted safe comment data
    res.status(200).json({
      success: true,
      data: formattedComment,
    });
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * DELETE /api/organizations/:organizationId/projects/:projectId/tasks/:taskId/comments/:commentId
 * Delete a comment (Author or OWNER/ADMIN)
 */
export async function deleteCommentHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // 1. Verify user is authenticated
    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const { organizationId, projectId, taskId, commentId } = req.params;

    if (!organizationId || !projectId || !taskId || !commentId) {
      res.status(400).json({
        success: false,
        message:
          'Organization ID, Project ID, Task ID, and Comment ID are required',
      });
      return;
    }

    // 2. Verify organization exists
    const organization = await findOrganizationById(organizationId);
    if (!organization) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // 3. Verify user is an active member of the organization
    const requesterMembership = await getOrganizationMember(
      organizationId,
      req.user.userId
    );

    if (!requesterMembership) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You are not a member of this organization',
      });
      return;
    }

    // 4. Verify project exists AND belongs to the specified organization
    const project = await findProjectByIdAndOrg(organizationId, projectId);
    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found in this organization',
      });
      return;
    }

    // 5. Verify task exists AND belongs to the specified project
    const task = await getTaskDetails(projectId, taskId);
    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found in this project',
      });
      return;
    }

    // 6. Verify comment exists and belongs to the complete hierarchy: org -> project -> task -> comment
    const comment = await getCommentDetails(
      organizationId,
      projectId,
      taskId,
      commentId
    );

    if (!comment) {
      res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
      return;
    }

    // 7. Author or OWNER/ADMIN authorization
    const isAuthor = comment.authorId === req.user.userId;
    const isOwnerOrAdmin =
      requesterMembership.role === MemberRole.OWNER ||
      requesterMembership.role === MemberRole.ADMIN;

    if (!isAuthor && !isOwnerOrAdmin) {
      res.status(403).json({
        success: false,
        message:
          'Forbidden. You do not have permission to delete this comment',
      });
      return;
    }

    // 8. Delete comment
    await deleteTaskComment(commentId);

    // 9. Emit comment:deleted event to organization room
    emitCommentDeleted(organizationId, projectId, taskId, commentId);

    // 10. Record Audit Log & Invalidate Cache
    await Promise.all([
      logActivity({
        organizationId,
        userId: req.user.userId,
        action: ACTIVITY_ACTIONS.COMMENT_DELETED,
        entityType: 'COMMENT',
        entityId: commentId,
        metadata: { taskId },
      }),
      invalidateTaskCommentsCache(taskId),
    ]);

    // 11. Return HTTP 200 with success message
    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
