/**
 * Task service layer
 * Handles task creation and position calculations
 */

import { prisma, TaskStatus, TaskPriority } from '@devflow/database';
import type { Task } from '@devflow/database';

/**
 * Task with related user details for safe responses
 */
export type TaskWithRelations = Task & {
  assignee: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
};

/**
 * Calculate the next position for a task within a specific project and status
 * Finds current max position and returns max + 1 (or 0 if no task exists)
 */
export async function getNextTaskPosition(
  projectId: string,
  status: TaskStatus
): Promise<number> {
  const latestTask = await prisma.task.findFirst({
    where: {
      projectId,
      status,
    },
    orderBy: {
      position: 'desc',
    },
    select: {
      position: true,
    },
  });

  return latestTask ? latestTask.position + 1 : 0;
}

/**
 * Create a new task within a project
 */
export async function createTask(data: {
  projectId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  assigneeId?: string | null;
  createdById: string;
  dueDate?: Date | null;
}): Promise<TaskWithRelations> {
  return prisma.task.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description ?? null,
      status: data.status,
      priority: data.priority,
      position: data.position,
      assigneeId: data.assigneeId ?? null,
      createdById: data.createdById,
      dueDate: data.dueDate ?? null,
    },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  });
}

/**
 * Kanban status order mapping
 */
export const STATUS_ORDER: Record<TaskStatus, number> = {
  [TaskStatus.TODO]: 0,
  [TaskStatus.IN_PROGRESS]: 1,
  [TaskStatus.IN_REVIEW]: 2,
  [TaskStatus.DONE]: 3,
};

/**
 * Get all tasks for a project ordered by status (Kanban order), position asc, createdAt asc
 */
export async function getProjectTasks(
  projectId: string
): Promise<TaskWithRelations[]> {
  const tasks = await prisma.task.findMany({
    where: {
      projectId,
    },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
    orderBy: [
      {
        status: 'asc',
      },
      {
        position: 'asc',
      },
      {
        createdAt: 'asc',
      },
    ],
  });

  // Guarantee strict Kanban status ordering in runtime as well
  return tasks.sort((a, b) => {
    const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    if (statusDiff !== 0) return statusDiff;
    const posDiff = a.position - b.position;
    if (posDiff !== 0) return posDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}

/**
 * Get task details by taskId and projectId
 * Ensures the task belongs to the specified project
 */
export async function getTaskDetails(
  projectId: string,
  taskId: string
): Promise<TaskWithRelations | null> {
  return prisma.task.findFirst({
    where: {
      id: taskId,
      projectId,
    },
    include: {
      assignee: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  });
}

/**
 * Update task input payload interface
 */
export interface UpdateTaskData {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: Date | null;
}

/**
 * Update an existing task within a project and organization
 * If status changes, moves task to the end of the destination status column
 */
export async function updateTask(
  organizationId: string,
  projectId: string,
  taskId: string,
  data: UpdateTaskData
): Promise<TaskWithRelations | null> {
  return prisma.$transaction(async (tx) => {
    // 1. Verify task exists, belongs to project, and project belongs to organization
    const existingTask = await tx.task.findFirst({
      where: {
        id: taskId,
        projectId,
        project: {
          organizationId,
        },
      },
    });

    if (!existingTask) {
      return null;
    }

    let newPosition = existingTask.position;

    // 2. If status is changing, calculate next position in destination column
    if (data.status !== undefined && data.status !== existingTask.status) {
      const latestTaskInNewStatus = await tx.task.findFirst({
        where: {
          projectId,
          status: data.status,
          id: { not: taskId },
        },
        orderBy: {
          position: 'desc',
        },
        select: {
          position: true,
        },
      });

      newPosition = latestTaskInNewStatus ? latestTaskInNewStatus.position + 1 : 0;
    }

    // 3. Prepare update data
    const updatePayload: {
      title?: string;
      description?: string | null;
      status?: TaskStatus;
      priority?: TaskPriority;
      position?: number;
      assigneeId?: string | null;
      dueDate?: Date | null;
    } = {};

    if (data.title !== undefined) {
      updatePayload.title = data.title;
    }
    if (data.description !== undefined) {
      updatePayload.description = data.description;
    }
    if (data.status !== undefined) {
      updatePayload.status = data.status;
      updatePayload.position = newPosition;
    }
    if (data.priority !== undefined) {
      updatePayload.priority = data.priority;
    }
    if (data.assigneeId !== undefined) {
      updatePayload.assigneeId = data.assigneeId;
    }
    if (data.dueDate !== undefined) {
      updatePayload.dueDate = data.dueDate;
    }

    // 4. Update task
    return tx.task.update({
      where: {
        id: taskId,
      },
      data: updatePayload,
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  });
}

/**
 * Delete a task ensuring it belongs to the specified project and organization
 */
export async function deleteTask(
  organizationId: string,
  projectId: string,
  taskId: string
): Promise<boolean> {
  const result = await prisma.task.deleteMany({
    where: {
      id: taskId,
      projectId,
      project: {
        organizationId,
      },
    },
  });

  return result.count > 0;
}

/**
 * Moved task result type containing updated task and affected task IDs
 */
export type MovedTaskResult = TaskWithRelations & {
  affectedTaskIds: string[];
};

/**
 * Move / reorder a task within same column or across status columns
 */
export async function moveTask(
  organizationId: string,
  projectId: string,
  taskId: string,
  data: {
    status: TaskStatus;
    position: number;
  }
): Promise<MovedTaskResult | null> {
  return prisma.$transaction(async (tx) => {
    // 1. Verify task exists, belongs to project, and project belongs to organization
    const task = await tx.task.findFirst({
      where: {
        id: taskId,
        projectId,
        project: {
          organizationId,
        },
      },
    });

    if (!task) {
      return null;
    }

    const currentStatus = task.status;
    const targetStatus = data.status;
    const requestedPosition = data.position;
    const affectedTaskIds: string[] = [];

    if (currentStatus === targetStatus) {
      // CASE 1: Same status column reordering
      const columnTasks = await tx.task.findMany({
        where: {
          projectId,
          status: currentStatus,
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      });

      // Remove the moving task from list
      const remainingTasks = columnTasks.filter((t) => t.id !== taskId);

      // Clamp position between 0 and remainingTasks.length
      const clampedPosition = Math.min(
        Math.max(0, requestedPosition),
        remainingTasks.length
      );

      // Insert moving task at clampedPosition
      remainingTasks.splice(clampedPosition, 0, task);

      // Update positions to be contiguous 0, 1, 2...
      for (let i = 0; i < remainingTasks.length; i++) {
        const t = remainingTasks[i];
        if (t.position !== i || t.id === taskId) {
          affectedTaskIds.push(t.id);
          await tx.task.update({
            where: { id: t.id },
            data: { position: i },
          });
        }
      }
    } else {
      // CASE 2: Cross-status column move
      // 2a. Re-compact source status column
      const sourceTasks = await tx.task.findMany({
        where: {
          projectId,
          status: currentStatus,
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      });

      const remainingSourceTasks = sourceTasks.filter((t) => t.id !== taskId);
      for (let i = 0; i < remainingSourceTasks.length; i++) {
        const t = remainingSourceTasks[i];
        if (t.position !== i) {
          affectedTaskIds.push(t.id);
          await tx.task.update({
            where: { id: t.id },
            data: { position: i },
          });
        }
      }

      // 2b. Insert into destination status column
      const destTasks = await tx.task.findMany({
        where: {
          projectId,
          status: targetStatus,
          id: { not: taskId },
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      });

      const clampedPosition = Math.min(
        Math.max(0, requestedPosition),
        destTasks.length
      );
      destTasks.splice(clampedPosition, 0, task);

      for (let i = 0; i < destTasks.length; i++) {
        const t = destTasks[i];
        if (t.id === taskId) {
          affectedTaskIds.push(t.id);
          await tx.task.update({
            where: { id: taskId },
            data: {
              status: targetStatus,
              position: i,
            },
          });
        } else if (t.position !== i) {
          affectedTaskIds.push(t.id);
          await tx.task.update({
            where: { id: t.id },
            data: { position: i },
          });
        }
      }
    }

    // 3. Fetch and return updated task with safe relations and affected IDs
    const updatedTask = await tx.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    if (!updatedTask) {
      return null;
    }

    return {
      ...updatedTask,
      affectedTaskIds,
    };
  });
}

/**
 * Format task response object with safe user fields
 */
export function formatTaskResponse(task: TaskWithRelations) {
  return {
    id: task.id,
    projectId: task.projectId,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    position: task.position,
    assigneeId: task.assigneeId,
    createdById: task.createdById,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    assignee: task.assignee
      ? {
          id: task.assignee.id,
          name: task.assignee.name,
          email: task.assignee.email,
          avatar: task.assignee.avatar,
        }
      : null,
    createdBy: task.createdBy
      ? {
          id: task.createdBy.id,
          name: task.createdBy.name,
          email: task.createdBy.email,
          avatar: task.createdBy.avatar,
        }
      : null,
  };
}


