/**
 * Comment controller
 * Handles task comment creation and listing endpoints
 */

import type { Request, Response } from 'express';
import { validateCreateCommentInput } from '../utils/validation';
import {
  findOrganizationById,
  getOrganizationMember,
} from '../services/organization';
import { findProjectByIdAndOrg } from '../services/project';
import { getTaskDetails } from '../services/task';
import {
  createTaskComment,
  getTaskComments,
  formatCommentResponse,
} from '../services/comment';

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

    // 8. Return HTTP 201 with formatted safe comment data
    res.status(201).json({
      success: true,
      data: formatCommentResponse(comment),
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
