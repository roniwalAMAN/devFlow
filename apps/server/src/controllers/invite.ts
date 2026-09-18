/**
 * Invite controller
 * Handles invitation acceptance and membership creation
 */

import type { Request, Response } from 'express';
import { findUserById } from '../services/user';
import {
  findInviteByToken,
  getOrganizationMember,
  acceptOrganizationInvite,
} from '../services/organization';
import { logActivity, ACTIVITY_ACTIONS } from '../services/activity';

/**
 * POST /api/invites/:token/accept
 * Allow an authenticated user to accept an organization invitation and become a member
 */
export async function acceptInviteHandler(
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

    // 2. Get token from route params
    const { token } = req.params;

    if (!token || typeof token !== 'string' || token.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Invitation token is required',
      });
      return;
    }

    const trimmedToken = token.trim();

    // 3. Find the OrganizationInvite by token
    const invite = await findInviteByToken(trimmedToken);

    if (!invite) {
      res.status(404).json({
        success: false,
        message: 'Invitation not found',
      });
      return;
    }

    // 4. Validate invite state
    if (invite.acceptedAt !== null) {
      res.status(409).json({
        success: false,
        message: 'Invitation has already been accepted',
      });
      return;
    }

    if (new Date(invite.expiresAt) <= new Date()) {
      res.status(410).json({
        success: false,
        message: 'Invitation has expired',
      });
      return;
    }

    // 5. Email security check: fetch authenticated user from DB
    const user = await findUserById(req.user.userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    const userEmail = user.email.trim().toLowerCase();
    const inviteEmail = invite.email.trim().toLowerCase();

    if (userEmail !== inviteEmail) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Invitation was issued for a different email address',
      });
      return;
    }

    // 6. Check whether the authenticated user is already a member
    const existingMembership = await getOrganizationMember(
      invite.organizationId,
      user.id
    );

    if (existingMembership) {
      res.status(409).json({
        success: false,
        message: 'User is already a member of this organization',
      });
      return;
    }

    // 7. Accept invite atomically via Prisma transaction
    const result = await acceptOrganizationInvite(
      invite.id,
      user.id,
      invite.organizationId,
      invite.role
    );

    // 8. Record Audit Log
    await logActivity({
      organizationId: result.organizationId,
      userId: user.id,
      action: ACTIVITY_ACTIONS.INVITE_ACCEPTED,
      entityType: 'INVITE',
      entityId: invite.id,
      metadata: { email: userEmail, role: result.role },
    });

    // 9. Return HTTP 200 success response (without exposing invite token or sensitive data)
    res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        organizationId: result.organizationId,
        role: result.role,
      },
    });
  } catch (error: unknown) {
    console.error('Accept invite error:', error);

    // Handle known transaction error conditions
    if (error instanceof Error) {
      if (error.message === 'INVITE_NOT_FOUND') {
        res.status(404).json({
          success: false,
          message: 'Invitation not found',
        });
        return;
      }
      if (error.message === 'USER_NOT_FOUND') {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }
      if (error.message === 'EMAIL_MISMATCH') {
        res.status(403).json({
          success: false,
          message: 'Forbidden. Invitation was issued for a different email address',
        });
        return;
      }
      if (error.message === 'INVITE_ALREADY_ACCEPTED') {
        res.status(409).json({
          success: false,
          message: 'Invitation has already been accepted',
        });
        return;
      }
      if (error.message === 'INVITE_EXPIRED') {
        res.status(410).json({
          success: false,
          message: 'Invitation has expired',
        });
        return;
      }
      if (error.message === 'ALREADY_MEMBER') {
        res.status(409).json({
          success: false,
          message: 'User is already a member of this organization',
        });
        return;
      }
    }

    // Handle Prisma unique constraint violation (P2002) for membership
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({
        success: false,
        message: 'User is already a member of this organization',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred while accepting the invitation',
    });
  }
}
