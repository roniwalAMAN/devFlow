/**
 * Project controller
 * Handles project creation and management endpoints
 */

import type { Request, Response } from 'express';
import { MemberRole } from '@devflow/database';
import {
  validateCreateProjectInput,
  validateUpdateProjectInput,
} from '../utils/validation';
import {
  findOrganizationById,
  getOrganizationMember,
} from '../services/organization';
import {
  createProject,
  formatProjectResponse,
  getOrganizationProjects,
  getProjectDetails,
  generateUniqueProjectSlug,
  findProjectByIdAndOrg,
  updateProject,
} from '../services/project';

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

/**
 * GET /api/organizations/:organizationId/projects
 * List all projects for an organization
 */
export async function listProjectsHandler(
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

    // 4. Fetch projects for this organization
    const projects = await getOrganizationProjects(organizationId);

    // 5. Return HTTP 200 response with projects array
    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving projects',
    });
  }
}

/**
 * GET /api/organizations/:organizationId/projects/:projectId
 * Get details of a specific project within an organization
 */
export async function getProjectByIdHandler(
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

    // 4. Fetch project by projectId and organizationId
    const project = await getProjectDetails(organizationId, projectId);

    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found',
      });
      return;
    }

    // 5. Return HTTP 200 response
    res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error('Get project details error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving project details',
    });
  }
}

/**
 * PATCH /api/organizations/:organizationId/projects/:projectId
 * Update an existing project within an organization
 */
export async function updateProjectHandler(
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
    const { name, description } = req.body;
    const validationErrors = validateUpdateProjectInput({ name, description });
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

    // 4. Verify requester is a member with OWNER, ADMIN, or DEVELOPER role
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
        message: 'Forbidden. Only organization owners, admins, and developers can update projects',
      });
      return;
    }

    // 5. Verify project exists within this organization
    const existingProject = await findProjectByIdAndOrg(
      organizationId,
      projectId
    );

    if (!existingProject) {
      res.status(404).json({
        success: false,
        message: 'Project not found',
      });
      return;
    }

    // 6. Handle partial updates and conditional slug regeneration
    const updateData: {
      name?: string;
      description?: string | null;
      slug?: string;
    } = {};

    if (name !== undefined) {
      const trimmedName = (name as string).trim();
      updateData.name = trimmedName;

      // Only regenerate slug if name changed
      if (trimmedName !== existingProject.name) {
        updateData.slug = await generateUniqueProjectSlug(
          organizationId,
          trimmedName,
          existingProject.id
        );
      }
    }

    if (description !== undefined) {
      updateData.description =
        typeof description === 'string' && description.trim() !== ''
          ? description.trim()
          : null;
    }

    // 7. Update project in database
    const updatedProject = await updateProject(existingProject.id, updateData);

    // 8. Return HTTP 200 response
    res.status(200).json({
      success: true,
      data: formatProjectResponse(updatedProject),
    });
  } catch (error: unknown) {
    console.error('Update project error:', error);

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
      message: 'An error occurred while updating the project',
    });
  }
}



