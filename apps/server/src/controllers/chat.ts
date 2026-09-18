/**
 * Chat controller
 * Handles team chat messages for organizations
 */

import type { Request, Response } from 'express';
import { validateSendChatMessageInput } from '../utils/validation';
import {
  findOrganizationById,
  getOrganizationMember,
} from '../services/organization';
import {
  createChatMessage,
  getOrganizationChatMessages,
  formatChatMessageResponse,
} from '../services/chat';
import { emitChatMessage } from '../socket/socketEvents';

/**
 * POST /api/organizations/:organizationId/chat/messages
 * Send a message in organization team chat
 */
export async function sendChatMessageHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const { organizationId } = req.params;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID is required',
      });
      return;
    }

    // 1. Validate request body
    const validationErrors = validateSendChatMessageInput(req.body);
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors,
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

    // 3. Verify user is an active member of the organization (all roles: OWNER, ADMIN, DEVELOPER, VIEWER)
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

    const { content } = req.body;

    // 4. Create chat message in DB
    const message = await createChatMessage({
      organizationId,
      authorId: req.user.userId,
      content,
    });

    const formattedMessage = formatChatMessageResponse(message);

    // 5. Emit chat:message event to organization room
    emitChatMessage(organizationId, formattedMessage);

    // 6. Return HTTP 201
    res.status(201).json({
      success: true,
      data: formattedMessage,
    });
  } catch (error) {
    console.error('Send chat message error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * GET /api/organizations/:organizationId/chat/messages
 * List all messages in organization team chat (chronological order)
 */
export async function listChatMessagesHandler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    const { organizationId } = req.params;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID is required',
      });
      return;
    }

    // 1. Verify organization exists
    const organization = await findOrganizationById(organizationId);
    if (!organization) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // 2. Verify user is an active member of the organization
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

    // 3. Get messages
    const messages = await getOrganizationChatMessages(organizationId);

    // 4. Return HTTP 200
    res.status(200).json({
      success: true,
      data: messages.map(formatChatMessageResponse),
    });
  } catch (error) {
    console.error('List chat messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
