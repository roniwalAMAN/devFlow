/**
 * Project controller
 * Handles project creation and management endpoints
 */

import type { Request, Response } from 'express';
import { MemberRole } from '@devflow/database';
import { validateCreateProjectInput } from '../utils/validation';
import {
  findOrganizationById,
  getOrganizationMember,
} from '../services/organization';
import { createProject, formatProjectResponse } from '../services/project';

/**
 * POST /api/organizations/:organizationId/projects
 * Create a new project within an organization
 */
export async function createProjectHandler(
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

    // 2. Validate input
    const { name, description } = req.body;
    const validationErrors = validateCreateProjectInput({ name, description });
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
        message: 'Forbidden. Only organization owners, admins, and developers can create projects',
      });
      return;
    }

    // 5. Create project
    const trimmedName = (name as string).trim();
    const trimmedDescription =
      typeof description === 'string' && description.trim() !== ''
        ? description.trim()
        : null;

    const project = await createProject({
      organizationId,
      name: trimmedName,
      description: trimmedDescription,
      createdById: req.user.userId,
    });

    // 6. Return HTTP 201 response
    res.status(201).json({
      success: true,
      data: formatProjectResponse(project),
    });
  } catch (error: unknown) {
    console.error('Create project error:', error);

    // Handle Prisma unique constraint violation (P2002) for slug collision
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      res.status(409).json({
        success: false,
        message: 'Project slug conflict within this organization',
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: 'An error occurred while creating the project',
    });
  }
}
