/**
 * Express Request augmentation for authenticated user and organization membership
 */

import type { JwtUserPayload } from '../utils/jwt';
import type { MemberRole } from '@devflow/database';

export interface OrganizationMembershipPayload {
  organizationId: string;
  userId: string;
  role: MemberRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
      organizationMembership?: OrganizationMembershipPayload;
    }
  }
}

export {};

