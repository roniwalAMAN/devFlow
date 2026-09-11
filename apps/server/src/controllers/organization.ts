/**
 * Organization controller
 * Handles organization management endpoints
 */

import type { Request, Response } from 'express';
import { validateCreateOrganizationInput } from '../utils/validation';
import {
  createOrganization,
  formatOrganizationResponse,
} from '../services/organization';

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
