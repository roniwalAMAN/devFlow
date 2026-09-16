/**
 * Task controller
 * Handles task creation and management endpoints
 */

import type { Request, Response } from 'express';
import { MemberRole, TaskStatus, TaskPriority } from '@devflow/database';
import {
  validateCreateTaskInput,
  validateUpdateTaskInput,
  validateMoveTaskInput,
} from '../utils/validation';
import {
  findOrganizationById,
  getOrganizationMember,
} from '../services/organization';
import { findUserById } from '../services/user';
import { findProjectByIdAndOrg } from '../services/project';
import {
  createTask,
  formatTaskResponse,
  getNextTaskPosition,
  getProjectTasks,
  getTaskDetails,
  updateTask,
  deleteTask,
  moveTask,
  type UpdateTaskData,
} from '../services/task';

/**
 * POST /api/organizations/:organizationId/projects/:projectId/tasks
 * Create a new task within a project
 */
export async function createTaskHandler(
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

    const { organizationId, projectId } = req.params;

    if (!organizationId || !projectId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID and Project ID are required',
      });
      return;
    }

    // 2. Validate input
    const validationErrors = validateCreateTaskInput(req.body);
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

    // 4. Verify user is a member with OWNER, ADMIN, or DEVELOPER role
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

    const allowedRoles: MemberRole[] = [
      MemberRole.OWNER,
      MemberRole.ADMIN,
      MemberRole.DEVELOPER,
    ];

    if (!allowedRoles.includes(requesterMembership.role)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Only organization owners, admins, and developers can create tasks',
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

    const { title, description, status, priority, assigneeId, dueDate } = req.body;

    // 6. Validate assignee if provided
    let validatedAssigneeId: string | null = null;
    if (assigneeId !== undefined && assigneeId !== null && assigneeId !== '') {
      // 6a. Verify user exists
      const assigneeUser = await findUserById(assigneeId);
      if (!assigneeUser) {
        res.status(404).json({
          success: false,
          message: 'Assignee not found',
        });
        return;
      }

      // 6b. Verify user is an active member of the same organization
      const assigneeMembership = await getOrganizationMember(
        organizationId,
        assigneeId
      );
      if (!assigneeMembership) {
        res.status(403).json({
          success: false,
          message: 'Forbidden. Assignee must be a member of the organization',
        });
        return;
      }

      validatedAssigneeId = assigneeId;
    }

    // 7. Resolve status, priority, and calculate next position scoped to project + status
    const taskStatus = (status as TaskStatus) || TaskStatus.TODO;
    const taskPriority = (priority as TaskPriority) || TaskPriority.MEDIUM;
    const position = await getNextTaskPosition(projectId, taskStatus);

    // 8. Parse dueDate if provided
    let parsedDueDate: Date | null = null;
    if (dueDate !== undefined && dueDate !== null && dueDate !== '') {
      parsedDueDate = new Date(dueDate);
    }

    // 9. Create task in database
    const task = await createTask({
      projectId,
      title: title.trim(),
      description:
        description !== undefined && description !== null
          ? typeof description === 'string'
            ? description.trim()
            : null
          : null,
      status: taskStatus,
      priority: taskPriority,
      position,
      assigneeId: validatedAssigneeId,
      createdById: req.user.userId,
      dueDate: parsedDueDate,
    });

    // 10. Return HTTP 201
    res.status(201).json({
      success: true,
      data: formatTaskResponse(task),
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * GET /api/organizations/:organizationId/projects/:projectId/tasks
 * Get all tasks for a project
 */
export async function listTasksHandler(
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

    const { organizationId, projectId } = req.params;

    if (!organizationId || !projectId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID and Project ID are required',
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

    // 5. Fetch tasks for the project
    const tasks = await getProjectTasks(projectId);

    // 6. Return HTTP 200 with formatted tasks
    res.status(200).json({
      success: true,
      data: tasks.map(formatTaskResponse),
    });
  } catch (error) {
    console.error('List tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * GET /api/organizations/:organizationId/projects/:projectId/tasks/:taskId
 * Get task details by taskId within a project and organization
 */
export async function getTaskByIdHandler(
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

    // 5. Query task strictly by taskId and projectId
    const task = await getTaskDetails(projectId, taskId);
    if (!task) {
      res.status(404).json({
        success: false,
        message: 'Task not found in this project',
      });
      return;
    }

    // 6. Return HTTP 200 with formatted safe task data
    res.status(200).json({
      success: true,
      data: formatTaskResponse(task),
    });
  } catch (error) {
    console.error('Get task details error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * PATCH /api/organizations/:organizationId/projects/:projectId/tasks/:taskId
 * Partially update an existing task
 */
export async function updateTaskHandler(
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
    const validationErrors = validateUpdateTaskInput(req.body);
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

    // 4. Verify user is a member with OWNER, ADMIN, or DEVELOPER role
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

    const allowedRoles: MemberRole[] = [
      MemberRole.OWNER,
      MemberRole.ADMIN,
      MemberRole.DEVELOPER,
    ];

    if (!allowedRoles.includes(requesterMembership.role)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Only organization owners, admins, and developers can update tasks',
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
    const existingTask = await getTaskDetails(projectId, taskId);
    if (!existingTask) {
      res.status(404).json({
        success: false,
        message: 'Task not found in this project',
      });
      return;
    }

    const { title, description, status, priority, assigneeId, dueDate } = req.body;

    // 7. Validate assignee if provided
    let validatedAssigneeId: string | null | undefined = undefined;
    if (assigneeId !== undefined) {
      if (assigneeId === null || assigneeId === '') {
        validatedAssigneeId = null;
      } else {
        // 7a. Verify user exists
        const assigneeUser = await findUserById(assigneeId);
        if (!assigneeUser) {
          res.status(404).json({
            success: false,
            message: 'Assignee not found',
          });
          return;
        }

        // 7b. Verify user is an active member of the same organization
        const assigneeMembership = await getOrganizationMember(
          organizationId,
          assigneeId
        );
        if (!assigneeMembership) {
          res.status(403).json({
            success: false,
            message: 'Forbidden. Assignee must be a member of the organization',
          });
          return;
        }

        validatedAssigneeId = assigneeId;
      }
    }

    // 8. Prepare update data
    const updateData: UpdateTaskData = {};

    if (title !== undefined) {
      updateData.title = title.trim();
    }
    if (description !== undefined) {
      updateData.description =
        description === null
          ? null
          : typeof description === 'string'
            ? description.trim()
            : null;
    }
    if (status !== undefined) {
      updateData.status = status as TaskStatus;
    }
    if (priority !== undefined) {
      updateData.priority = priority as TaskPriority;
    }
    if (validatedAssigneeId !== undefined) {
      updateData.assigneeId = validatedAssigneeId;
    }
    if (dueDate !== undefined) {
      updateData.dueDate =
        dueDate === null || dueDate === '' ? null : new Date(dueDate);
    }

    // 9. Update task via service
    const updatedTask = await updateTask(
      organizationId,
      projectId,
      taskId,
      updateData
    );

    if (!updatedTask) {
      res.status(404).json({
        success: false,
        message: 'Task not found in this project',
      });
      return;
    }

    // 10. Return HTTP 200 with formatted safe task data
    res.status(200).json({
      success: true,
      data: formatTaskResponse(updatedTask),
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * DELETE /api/organizations/:organizationId/projects/:projectId/tasks/:taskId
 * Delete a task within a project
 */
export async function deleteTaskHandler(
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

    // 3. Verify user is a member with OWNER or ADMIN role
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

    const allowedRoles: MemberRole[] = [
      MemberRole.OWNER,
      MemberRole.ADMIN,
    ];

    if (!allowedRoles.includes(requesterMembership.role)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Only organization owners and admins can delete tasks',
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
    const existingTask = await getTaskDetails(projectId, taskId);
    if (!existingTask) {
      res.status(404).json({
        success: false,
        message: 'Task not found in this project',
      });
      return;
    }

    // 6. Delete task ensuring scoping
    const deleted = await deleteTask(organizationId, projectId, taskId);
    if (!deleted) {
      res.status(404).json({
        success: false,
        message: 'Task not found in this project',
      });
      return;
    }

    // 7. Return HTTP 200
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * PATCH /api/organizations/:organizationId/projects/:projectId/tasks/:taskId/move
 * Move / reorder a task within same column or across status columns
 */
export async function moveTaskHandler(
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
    const validationErrors = validateMoveTaskInput(req.body);
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

    // 4. Verify user is a member with OWNER, ADMIN, or DEVELOPER role
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

    const allowedRoles: MemberRole[] = [
      MemberRole.OWNER,
      MemberRole.ADMIN,
      MemberRole.DEVELOPER,
    ];

    if (!allowedRoles.includes(requesterMembership.role)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Only organization owners, admins, and developers can move tasks',
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
    const existingTask = await getTaskDetails(projectId, taskId);
    if (!existingTask) {
      res.status(404).json({
        success: false,
        message: 'Task not found in this project',
      });
      return;
    }

    const { status, position } = req.body;

    // 7. Move task via service
    const movedTask = await moveTask(organizationId, projectId, taskId, {
      status: status as TaskStatus,
      position: position as number,
    });

    if (!movedTask) {
      res.status(404).json({
        success: false,
        message: 'Task not found in this project',
      });
      return;
    }

    // 8. Return HTTP 200 with formatted safe task data
    res.status(200).json({
      success: true,
      data: formatTaskResponse(movedTask),
    });
  } catch (error) {
    console.error('Move task error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}





