/**
 * Task comment service layer
 * Handles comment creation and retrieval
 */

import { prisma } from '@devflow/database';
import type { TaskComment } from '@devflow/database';

/**
 * TaskComment with author details for safe responses
 */
export type TaskCommentWithAuthor = TaskComment & {
  author: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
};

/**
 * Create a new comment on a task
 */
export async function createTaskComment(data: {
  taskId: string;
  authorId: string;
  content: string;
}): Promise<TaskCommentWithAuthor> {
  return prisma.taskComment.create({
    data: {
      taskId: data.taskId,
      authorId: data.authorId,
      content: data.content.trim(),
    },
    include: {
      author: {
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
 * Get all comments for a task ordered by createdAt asc
 */
export async function getTaskComments(
  taskId: string
): Promise<TaskCommentWithAuthor[]> {
  return prisma.taskComment.findMany({
    where: {
      taskId,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

/**
 * Format comment response object with safe author fields
 */
export function formatCommentResponse(comment: TaskCommentWithAuthor) {
  return {
    id: comment.id,
    taskId: comment.taskId,
    authorId: comment.authorId,
    content: comment.content,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: {
      id: comment.author.id,
      name: comment.author.name,
      email: comment.author.email,
      avatar: comment.author.avatar,
    },
  };
}
