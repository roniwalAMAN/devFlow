/**
 * Organization controller
 * Handles organization management endpoints
 */

import crypto from 'crypto';
import type { Request, Response } from 'express';
import { MemberRole } from '@devflow/database';
import {
  validateCreateOrganizationInput,
  validateAddMemberInput,
  validateUpdateMemberRoleInput,
  validateCreateInviteInput,
} from '../utils/validation';
import {
  createOrganization,
  formatOrganizationResponse,
  getUserOrganizations,
  getOrganizationDetails,
  findOrganizationById,
  getOrganizationMember,
  getOrganizationMemberByEmail,
  addOrganizationMember,
  removeOrganizationMember,
  updateOrganizationMemberRole,
  findPendingInvite,
  createOrganizationInvite,
  listPendingInvites,
  findInviteById,
  deleteOrganizationInvite,
  resendOrganizationInvite,
} from '../services/organization';
import { findUserByEmail } from '../services/user';

/**
 * POST /api/organizations
 * Create a new organization/workspace for the authenticated user
 */
export async function createOrganizationHandler(
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

    const { name } = req.body;

    // 2. Validate input
    const validationErrors = validateCreateOrganizationInput({ name });
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors,
      });
      return;
    }

    // 3. Create organization (ownerId strictly from authenticated user)
    const organization = await createOrganization(
      req.user.userId,
      name as string
    );

    // 4. Return safe HTTP 201 response
    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: formatOrganizationResponse(organization),
    });
  } catch (error: unknown) {
    console.error('Create organization error:', error);

    // Check for Prisma unique constraint violation (P2002)
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({
        success: false,
        message: 'Organization slug conflict',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred while creating the organization',
    });
  }
}

/**
 * GET /api/organizations
 * List all organizations where the authenticated user is a member
 */
export async function listOrganizationsHandler(
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

    // 2. Fetch organizations where user is a member
    const organizations = await getUserOrganizations(req.user.userId);

    // 3. Return HTTP 200 with organizations list (empty array if user has no organizations)
    res.status(200).json({
      success: true,
      data: organizations,
    });
  } catch (error) {
    console.error('List organizations error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving organizations',
    });
  }
}

/**
 * GET /api/organizations/:organizationId
 * Get details of a specific organization if the authenticated user is a member
 */
export async function getOrganizationByIdHandler(
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

    const { organizationId } = req.params;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID is required',
      });
      return;
    }

    // 2. Fetch organization details
    const organization = await getOrganizationDetails(organizationId);

    // 3. Check if organization exists (404 if not found)
    if (!organization) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // 4. Verify user is a member of the organization (403 if not a member)
    const isMember = organization.members.some(
      (member) => member.user.id === req.user!.userId
    );

    if (!isMember) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. You are not a member of this organization',
      });
      return;
    }

    // 5. Return HTTP 200 with organization details
    res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error('Get organization details error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving organization details',
    });
  }
}

/**
 * POST /api/organizations/:organizationId/members
 * Add an existing registered user as a member of the organization
 */
export async function addOrganizationMemberHandler(
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

    const { organizationId } = req.params;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID is required',
      });
      return;
    }

    // 2. Validate request body
    const { email, role } = req.body;
    const validationErrors = validateAddMemberInput({ email, role });
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

    // 4. Verify authenticated user is a member of the organization
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

    // 5. Only allow OWNER and ADMIN to add members
    if (
      requesterMembership.role !== MemberRole.OWNER &&
      requesterMembership.role !== MemberRole.ADMIN
    ) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Only organization owners and admins can add members',
      });
      return;
    }

    // 6. Find target user by email (do NOT create a new user)
    const normalizedEmail = (email as string).trim().toLowerCase();
    let targetUser = await findUserByEmail(normalizedEmail);
    if (!targetUser) {
      targetUser = await findUserByEmail((email as string).trim());
    }

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    // 7. Check whether target user is already a member
    const existingMembership = await getOrganizationMember(
      organizationId,
      targetUser.id
    );

    if (existingMembership) {
      res.status(409).json({
        success: false,
        message: 'User is already a member of this organization',
      });
      return;
    }

    // 8. Role safety: ADMIN cannot create OWNER; only OWNER can assign OWNER
    const targetRole = (role as string).trim().toUpperCase() as MemberRole;

    if (
      targetRole === MemberRole.OWNER &&
      requesterMembership.role !== MemberRole.OWNER
    ) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Only organization owners can assign the OWNER role',
      });
      return;
    }

    // 9. Create OrganizationMember
    const newMember = await addOrganizationMember({
      organizationId,
      userId: targetUser.id,
      role: targetRole,
    });

    // 10. Return HTTP 201 with safe member and user info
    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      data: newMember,
    });
  } catch (error) {
    console.error('Add organization member error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while adding the member',
    });
  }
}

/**
 * DELETE /api/organizations/:organizationId/members/:userId
 * Remove a member from an organization
 */
export async function removeOrganizationMemberHandler(
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

    const { organizationId, userId: targetUserId } = req.params;

    if (!organizationId || !targetUserId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID and User ID are required',
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

    // 3. Verify requester is a member of the organization
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

    // 4. Only allow OWNER and ADMIN to remove members
    if (
      requesterMembership.role !== MemberRole.OWNER &&
      requesterMembership.role !== MemberRole.ADMIN
    ) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Only organization owners and admins can remove members',
      });
      return;
    }

    // 5. Verify target user is a member of the organization
    const targetMembership = await getOrganizationMember(
      organizationId,
      targetUserId
    );

    if (!targetMembership) {
      res.status(404).json({
        success: false,
        message: 'Member not found in this organization',
      });
      return;
    }

    // 6. Organization OWNER cannot be removed
    if (targetMembership.role === MemberRole.OWNER) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Organization owner cannot be removed',
      });
      return;
    }

    // 7. ADMIN cannot remove another ADMIN (only OWNER can remove an ADMIN)
    if (
      targetMembership.role === MemberRole.ADMIN &&
      requesterMembership.role !== MemberRole.OWNER
    ) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Admins cannot remove other admins',
      });
      return;
    }

    // 8. Delete only the OrganizationMember record
    await removeOrganizationMember(organizationId, targetUserId);

    // 9. Return HTTP 200 success
    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error) {
    console.error('Remove organization member error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while removing the member',
    });
  }
}

/**
 * PATCH /api/organizations/:organizationId/members/:userId/role
 * Change the role of an organization member
 */
export async function updateMemberRoleHandler(
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

    const { organizationId, userId: targetUserId } = req.params;

    if (!organizationId || !targetUserId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID and User ID are required',
      });
      return;
    }

    // 2. Validate request body
    const { role } = req.body;
    const validationErrors = validateUpdateMemberRoleInput({ role });
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

    // 4. Verify requester is a member of the organization
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

    // 5. DEVELOPER / VIEWER cannot change roles
    if (
      requesterMembership.role !== MemberRole.OWNER &&
      requesterMembership.role !== MemberRole.ADMIN
    ) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Insufficient permissions to change member roles',
      });
      return;
    }

    // 6. Verify target user is a member of the organization
    const targetMembership = await getOrganizationMember(
      organizationId,
      targetUserId
    );

    if (!targetMembership) {
      res.status(404).json({
        success: false,
        message: 'Member not found in this organization',
      });
      return;
    }

    // 7. Cannot change the organization's OWNER role through this endpoint
    if (targetMembership.role === MemberRole.OWNER) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Cannot modify the role of the organization owner',
      });
      return;
    }

    const newRole = (role as string).trim().toUpperCase() as MemberRole;

    // 8. Do not allow creating a second OWNER / assigning OWNER role
    if (newRole === MemberRole.OWNER) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Cannot assign OWNER role. Organization can only have one owner',
      });
      return;
    }

    // 9. ADMIN permission rules:
    // - Cannot modify another ADMIN
    // - Cannot assign ADMIN role
    // - Can only change DEVELOPER <-> VIEWER
    if (requesterMembership.role === MemberRole.ADMIN) {
      if (targetMembership.role === MemberRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Forbidden. Admins cannot modify the role of other admins',
        });
        return;
      }

      if (newRole === MemberRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Forbidden. Admins cannot assign the ADMIN role',
        });
        return;
      }
    }

    // 10. Update OrganizationMember role in database
    const updatedMember = await updateOrganizationMemberRole(
      organizationId,
      targetUserId,
      newRole
    );

    // 11. Return HTTP 200 with updated member info
    res.status(200).json({
      success: true,
      message: 'Member role updated successfully',
      data: updatedMember,
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while updating the member role',
    });
  }
}

/**
 * POST /api/organizations/:organizationId/invites
 * Create an organization invitation for an email address
 */
export async function createOrganizationInviteHandler(
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

    const { organizationId } = req.params;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID is required',
      });
      return;
    }

    // 2. Validate request body
    const { email, role } = req.body;
    const validationErrors = validateCreateInviteInput({ email, role });
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors,
      });
      return;
    }

    // 3. Normalize email and parse role
    const normalizedEmail = (email as string).trim().toLowerCase();
    const targetRole = (role as string).trim().toUpperCase() as MemberRole;

    // 4. Role assignment rule: OWNER role must never be created through invite API
    if (targetRole === MemberRole.OWNER) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Cannot invite a member with the OWNER role',
      });
      return;
    }

    // 5. Verify organization exists
    const organization = await findOrganizationById(organizationId);
    if (!organization) {
      res.status(404).json({
        success: false,
        message: 'Organization not found',
      });
      return;
    }

    // 6. Verify requester is a member of the organization with OWNER or ADMIN role
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

    if (
      requesterMembership.role !== MemberRole.OWNER &&
      requesterMembership.role !== MemberRole.ADMIN
    ) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Only organization owners and admins can create invites',
      });
      return;
    }

    // 7. Check if the email belongs to a user who is already a member of this organization
    const existingMemberWithEmail = await getOrganizationMemberByEmail(
      organizationId,
      normalizedEmail
    );

    if (existingMemberWithEmail) {
      res.status(409).json({
        success: false,
        message: 'User with this email is already a member of this organization',
      });
      return;
    }

    // 8. Check if a pending invite already exists for this email in this organization
    const existingPendingInvite = await findPendingInvite(
      organizationId,
      normalizedEmail
    );

    if (existingPendingInvite) {
      res.status(409).json({
        success: false,
        message: 'A pending invite already exists for this email in this organization',
      });
      return;
    }

    // 9. Generate cryptographically secure random invite token
    const token = crypto.randomBytes(32).toString('hex');

    // 10. Expiration: 7 days from now
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 11. Create OrganizationInvite record
    const invite = await createOrganizationInvite({
      organizationId,
      email: normalizedEmail,
      role: targetRole,
      token,
      expiresAt,
    });

    // 12. Return HTTP 201 with safe invite info
    res.status(201).json({
      success: true,
      data: invite,
    });
  } catch (error) {
    console.error('Create organization invite error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating the organization invite',
    });
  }
}

/**
 * GET /api/organizations/:organizationId/invites
 * List all pending invitations for an organization (accessible to OWNER and ADMIN)
 */
export async function listOrganizationInvitesHandler(
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

    const { organizationId } = req.params;

    if (!organizationId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID is required',
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

    // 3. Verify requester is a member of the organization
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

    // 4. Only OWNER and ADMIN can view organization invites
    if (
      requesterMembership.role !== MemberRole.OWNER &&
      requesterMembership.role !== MemberRole.ADMIN
    ) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Only organization owners and admins can view invites',
      });
      return;
    }

    // 5. Fetch pending invites (acceptedAt is null, expiresAt in the future, sorted desc, token excluded)
    const pendingInvites = await listPendingInvites(organizationId);

    // 6. Return HTTP 200 with pending invites list
    res.status(200).json({
      success: true,
      data: pendingInvites,
    });
  } catch (error) {
    console.error('List organization invites error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving organization invites',
    });
  }
}

/**
 * DELETE /api/organizations/:organizationId/invites/:inviteId
 * Revoke a pending organization invitation
 */
export async function revokeOrganizationInviteHandler(
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

    const { organizationId, inviteId } = req.params;

    if (!organizationId || !inviteId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID and Invite ID are required',
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

    // 3. Verify requester is a member of the organization
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

    // 4. Only OWNER and ADMIN can revoke invites
    if (
      requesterMembership.role !== MemberRole.OWNER &&
      requesterMembership.role !== MemberRole.ADMIN
    ) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Only organization owners and admins can revoke invites',
      });
      return;
    }

    // 5. Find invite and verify it belongs to this organization
    const invite = await findInviteById(inviteId);
    if (!invite || invite.organizationId !== organizationId) {
      res.status(404).json({
        success: false,
        message: 'Invitation not found',
      });
      return;
    }

    // 6. Only pending invites can be revoked (acceptedAt must be null)
    if (invite.acceptedAt !== null) {
      res.status(409).json({
        success: false,
        message: 'Cannot revoke an already accepted invitation',
      });
      return;
    }

    // 7. Delete the OrganizationInvite record
    await deleteOrganizationInvite(inviteId);

    // 8. Return HTTP 200 success response
    res.status(200).json({
      success: true,
      message: 'Invitation revoked successfully',
    });
  } catch (error) {
    console.error('Revoke organization invite error:', error);
    if (error instanceof Error) {
      if (error.message === 'INVITE_NOT_FOUND') {
        res.status(404).json({
          success: false,
          message: 'Invitation not found',
        });
        return;
      }
      if (error.message === 'INVITE_ALREADY_ACCEPTED') {
        res.status(409).json({
          success: false,
          message: 'Cannot revoke an already accepted invitation',
        });
        return;
      }
    }
    res.status(500).json({
      success: false,
      message: 'An error occurred while revoking the organization invite',
    });
  }
}

/**
 * POST /api/organizations/:organizationId/invites/:inviteId/resend
 * Resend an organization invitation by updating the token and expiration
 */
export async function resendOrganizationInviteHandler(
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

    const { organizationId, inviteId } = req.params;

    if (!organizationId || !inviteId) {
      res.status(400).json({
        success: false,
        message: 'Organization ID and Invite ID are required',
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

    // 3. Verify requester is a member of the organization
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

    // 4. Only OWNER and ADMIN can resend invites
    if (
      requesterMembership.role !== MemberRole.OWNER &&
      requesterMembership.role !== MemberRole.ADMIN
    ) {
      res.status(403).json({
        success: false,
        message: 'Forbidden. Only organization owners and admins can resend invites',
      });
      return;
    }

    // 5. Find invite and verify it belongs to this organization
    const invite = await findInviteById(inviteId);
    if (!invite || invite.organizationId !== organizationId) {
      res.status(404).json({
        success: false,
        message: 'Invitation not found',
      });
      return;
    }

    // 6. Only pending invites can be resent (acceptedAt must be null)
    if (invite.acceptedAt !== null) {
      res.status(409).json({
        success: false,
        message: 'Cannot resend an already accepted invitation',
      });
      return;
    }

    // 7. Generate a new cryptographically secure random token using crypto
    const newToken = crypto.randomBytes(32).toString('hex');

    // 8. Set expiresAt to 7 days from the current time
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // 9. Update the existing OrganizationInvite record
    const updatedInvite = await resendOrganizationInvite(
      inviteId,
      newToken,
      newExpiresAt
    );

    // 10. Return HTTP 200 success response
    res.status(200).json({
      success: true,
      message: 'Invitation resent successfully',
      data: updatedInvite,
    });
  } catch (error) {
    console.error('Resend organization invite error:', error);
    if (error instanceof Error) {
      if (error.message === 'INVITE_NOT_FOUND') {
        res.status(404).json({
          success: false,
          message: 'Invitation not found',
        });
        return;
      }
      if (error.message === 'INVITE_ALREADY_ACCEPTED') {
        res.status(409).json({
          success: false,
          message: 'Cannot resend an already accepted invitation',
        });
        return;
      }
    }
    res.status(500).json({
      success: false,
      message: 'An error occurred while resending the organization invite',
    });
  }
}






