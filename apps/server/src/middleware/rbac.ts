/**
 * Organization Role-Based Access Control (RBAC) middleware
 * Ensures the authenticated user is a member of the organization with the required role(s)
 */

import type { Request, Response, NextFunction } from 'express';
import { MemberRole } from '@devflow/database';
import {
  getOrganizationMember,
  findOrganizationById,
} from '../services/organization';

/**
 * Middleware factory to enforce organization-level roles
 * Usage examples:
 *   requireOrganizationRole('OWNER')
 *   requireOrganizationRole('OWNER', 'ADMIN')
 *   requireOrganizationRole(MemberRole.OWNER, MemberRole.ADMIN)
 */
export function requireOrganizationRole(
  ...allowedRoles: (MemberRole | 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER')[]
) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // 1. Verify user is authenticated
      if (!req.user || !req.user.userId) {
        res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
        return;
      }

      // 2. Get organizationId from route parameters
      const { organizationId } = req.params;
      if (!organizationId) {
        res.status(400).json({
          success: false,
          message: 'Organization ID is required',
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

      // 4. Find user's OrganizationMember record
      const membership = await getOrganizationMember(
        organizationId,
        req.user.userId
      );

      // 5. If not a member, return 403
      if (!membership) {
        res.status(403).json({
          success: false,
          message: 'Forbidden. You are not a member of this organization',
        });
        return;
      }

      // 6. Check if member's role is in allowed roles
      if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(membership.role as MemberRole)
      ) {
        res.status(403).json({
          success: false,
          message: 'Forbidden. Insufficient permissions for this organization',
        });
        return;
      }

      // 7. Attach safe organization membership details to request object
      req.organizationMembership = {
        organizationId: membership.organizationId,
        userId: membership.userId,
        role: membership.role,
      };

      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while verifying organization permissions',
      });
    }
  };
}
