/**
 * Chat service layer
 * Handles team chat message creation and retrieval for organizations
 */

import { prisma } from '@devflow/database';
import type { ChatMessage } from '@devflow/database';

export type ChatMessageWithAuthor = ChatMessage & {
  author: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  };
};

/**
 * Create a new team chat message
 */
export async function createChatMessage(data: {
  organizationId: string;
  authorId: string;
  content: string;
}): Promise<ChatMessageWithAuthor> {
  return prisma.chatMessage.create({
    data: {
      organizationId: data.organizationId,
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
 * Get all chat messages for an organization ordered chronologically (createdAt ascending)
 */
export async function getOrganizationChatMessages(
  organizationId: string
): Promise<ChatMessageWithAuthor[]> {
  return prisma.chatMessage.findMany({
    where: {
      organizationId,
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
 * Format chat message response with safe author fields
 */
export function formatChatMessageResponse(message: ChatMessageWithAuthor) {
  return {
    id: message.id,
    organizationId: message.organizationId,
    authorId: message.authorId,
    content: message.content,
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
    author: {
      id: message.author.id,
      name: message.author.name,
      email: message.author.email,
      avatar: message.author.avatar,
    },
  };
}
