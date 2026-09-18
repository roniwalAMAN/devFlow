/**
 * Socket.IO server initialization, room management, and presence tracking
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HTTPServer } from 'http';
import { prisma } from '@devflow/database';
import { socketAuthMiddleware } from './socketAuth';
import type { DevFlowSocketServer, DevFlowSocket } from './socketTypes';
import {
  findOrganizationById,
  getOrganizationMember,
} from '../services/organization';
import { findProjectByIdAndOrg } from '../services/project';
import { emitPresenceOnline, emitPresenceOffline } from './socketEvents';

let ioInstance: DevFlowSocketServer | null = null;

// In-memory active sockets map: userId -> Set of socket IDs
const activeUserSockets = new Map<string, Set<string>>();

/**
 * Get online user IDs for an organization
 */
export async function getOnlineUserIdsInOrganization(
  organizationId: string
): Promise<string[]> {
  const members = await prisma.organizationMember.findMany({
    where: {
      organizationId,
    },
    select: {
      userId: true,
    },
  });

  return members
    .map((m) => m.userId)
    .filter((userId) => {
      const socketSet = activeUserSockets.get(userId);
      return socketSet && socketSet.size > 0;
    });
}

/**
 * Initialize Socket.IO server attached to the shared HTTP server
 */
export function initializeSocket(httpServer: HTTPServer): DevFlowSocketServer {
  const clientOrigin = process.env.CLIENT_URL || 'http://localhost:3000';

  const io: DevFlowSocketServer = new SocketIOServer(httpServer, {
    cors: {
      origin: clientOrigin,
      credentials: true,
    },
  });

  // Attach authentication middleware
  io.use(socketAuthMiddleware);

  // Socket connection and event registration
  io.on('connection', async (socket: DevFlowSocket) => {
    const userId = socket.data.user?.userId;
    console.log(`Socket connected: id=${socket.id}, userId=${userId}`);

    if (userId) {
      // 1. Auto-join user's private room
      socket.join(`user:${userId}`);

      // 2. Track in-memory presence
      const isFirstSocket =
        !activeUserSockets.has(userId) ||
        activeUserSockets.get(userId)!.size === 0;

      if (!activeUserSockets.has(userId)) {
        activeUserSockets.set(userId, new Set());
      }
      activeUserSockets.get(userId)!.add(socket.id);

      // If user just came online, broadcast presence:online to all their organizations
      if (isFirstSocket) {
        try {
          const userMemberships = await prisma.organizationMember.findMany({
            where: { userId },
            select: { organizationId: true },
          });

          for (const membership of userMemberships) {
            emitPresenceOnline(membership.organizationId, userId);
          }
        } catch (error) {
          console.error('Error broadcasting online presence:', error);
        }
      }
    }

    // Handle joining organization-scoped room
    socket.on('join:organization', async (payload, callback) => {
      try {
        if (
          !payload ||
          typeof payload !== 'object' ||
          !payload.organizationId ||
          typeof payload.organizationId !== 'string' ||
          !payload.organizationId.trim()
        ) {
          callback?.({
            success: false,
            message: 'Organization ID is required',
          });
          return;
        }

        const organizationId = payload.organizationId.trim();
        const authenticatedUserId = socket.data.user?.userId;

        if (!authenticatedUserId) {
          callback?.({
            success: false,
            message: 'Unauthorized',
          });
          return;
        }

        // 1. Verify organization exists
        const organization = await findOrganizationById(organizationId);
        if (!organization) {
          callback?.({
            success: false,
            message: 'Organization not found',
          });
          return;
        }

        // 2. Verify authenticated user is an active member of the organization
        const membership = await getOrganizationMember(
          organizationId,
          authenticatedUserId
        );
        if (!membership) {
          callback?.({
            success: false,
            message: 'Forbidden. You are not a member of this organization',
          });
          return;
        }

        // 3. Join the organization room
        const room = `organization:${organizationId}`;
        socket.join(room);

        // 4. Get current online users in this organization
        const onlineUserIds =
          await getOnlineUserIdsInOrganization(organizationId);

        callback?.({
          success: true,
          organizationId,
          room,
          onlineUserIds,
        });
      } catch (error) {
        console.error('Socket join:organization error:', error);
        callback?.({
          success: false,
          message: 'Internal server error',
        });
      }
    });

    // Handle leaving organization-scoped room
    socket.on('leave:organization', (payload, callback) => {
      try {
        if (
          !payload ||
          typeof payload !== 'object' ||
          !payload.organizationId ||
          typeof payload.organizationId !== 'string' ||
          !payload.organizationId.trim()
        ) {
          callback?.({
            success: false,
            message: 'Organization ID is required',
          });
          return;
        }

        const organizationId = payload.organizationId.trim();
        const room = `organization:${organizationId}`;
        socket.leave(room);

        callback?.({
          success: true,
          organizationId,
          room,
        });
      } catch (error) {
        console.error('Socket leave:organization error:', error);
        callback?.({
          success: false,
          message: 'Internal server error',
        });
      }
    });

    // Handle joining project-scoped room
    socket.on('join:project', async (payload, callback) => {
      try {
        if (
          !payload ||
          typeof payload !== 'object' ||
          !payload.organizationId ||
          !payload.projectId ||
          typeof payload.organizationId !== 'string' ||
          typeof payload.projectId !== 'string' ||
          !payload.organizationId.trim() ||
          !payload.projectId.trim()
        ) {
          callback?.({
            success: false,
            message: 'Organization ID and Project ID are required',
          });
          return;
        }

        const organizationId = payload.organizationId.trim();
        const projectId = payload.projectId.trim();
        const authenticatedUserId = socket.data.user?.userId;

        if (!authenticatedUserId) {
          callback?.({
            success: false,
            message: 'Unauthorized',
          });
          return;
        }

        // 1. Verify user is a member of the organization
        const membership = await getOrganizationMember(
          organizationId,
          authenticatedUserId
        );
        if (!membership) {
          callback?.({
            success: false,
            message: 'Forbidden. You are not a member of this organization',
          });
          return;
        }

        // 2. Verify project exists and belongs to the organization
        const project = await findProjectByIdAndOrg(organizationId, projectId);
        if (!project) {
          callback?.({
            success: false,
            message: 'Project not found in this organization',
          });
          return;
        }

        // 3. Join the project room
        const room = `project:${projectId}`;
        socket.join(room);

        callback?.({
          success: true,
          organizationId,
          projectId,
          room,
        });
      } catch (error) {
        console.error('Socket join:project error:', error);
        callback?.({
          success: false,
          message: 'Internal server error',
        });
      }
    });

    // Handle leaving project-scoped room
    socket.on('leave:project', (payload, callback) => {
      try {
        if (
          !payload ||
          typeof payload !== 'object' ||
          !payload.projectId ||
          typeof payload.projectId !== 'string' ||
          !payload.projectId.trim()
        ) {
          callback?.({
            success: false,
            message: 'Project ID is required',
          });
          return;
        }

        const projectId = payload.projectId.trim();
        const room = `project:${projectId}`;
        socket.leave(room);

        callback?.({
          success: true,
          projectId,
          room,
        });
      } catch (error) {
        console.error('Socket leave:project error:', error);
        callback?.({
          success: false,
          message: 'Internal server error',
        });
      }
    });

    // Handle fetching current presence in an organization
    socket.on('get:presence', async (payload, callback) => {
      try {
        if (
          !payload ||
          typeof payload !== 'object' ||
          !payload.organizationId ||
          typeof payload.organizationId !== 'string' ||
          !payload.organizationId.trim()
        ) {
          callback?.({
            success: false,
            message: 'Organization ID is required',
          });
          return;
        }

        const organizationId = payload.organizationId.trim();
        const authenticatedUserId = socket.data.user?.userId;

        if (!authenticatedUserId) {
          callback?.({
            success: false,
            message: 'Unauthorized',
          });
          return;
        }

        const membership = await getOrganizationMember(
          organizationId,
          authenticatedUserId
        );
        if (!membership) {
          callback?.({
            success: false,
            message: 'Forbidden. You are not a member of this organization',
          });
          return;
        }

        const onlineUserIds =
          await getOnlineUserIdsInOrganization(organizationId);

        callback?.({
          success: true,
          organizationId,
          onlineUserIds,
        });
      } catch (error) {
        console.error('Socket get:presence error:', error);
        callback?.({
          success: false,
          message: 'Internal server error',
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      console.log(
        `Socket disconnected: id=${socket.id}, userId=${userId}, reason=${reason}`
      );

      if (userId && activeUserSockets.has(userId)) {
        const socketSet = activeUserSockets.get(userId)!;
        socketSet.delete(socket.id);

        if (socketSet.size === 0) {
          activeUserSockets.delete(userId);

          // User became offline -> notify user's organizations
          try {
            const userMemberships = await prisma.organizationMember.findMany({
              where: { userId },
              select: { organizationId: true },
            });

            for (const membership of userMemberships) {
              emitPresenceOffline(membership.organizationId, userId);
            }
          } catch (error) {
            console.error('Error broadcasting offline presence:', error);
          }
        }
      }
    });
  });

  ioInstance = io;
  return io;
}

/**
 * Get active Socket.IO server instance
 */
export function getIO(): DevFlowSocketServer {
  if (!ioInstance) {
    throw new Error('Socket.IO server has not been initialized');
  }
  return ioInstance;
}

/**
 * Get optional active Socket.IO server instance (null if not initialized or shutdown)
 */
export function getIOOptional(): DevFlowSocketServer | null {
  return ioInstance;
}

/**
 * Close Socket.IO server instance for graceful shutdown
 */
export async function closeSocket(): Promise<void> {
  if (ioInstance) {
    await new Promise<void>((resolve) => {
      ioInstance!.close(() => {
        ioInstance = null;
        resolve();
      });
    });
  }
}
