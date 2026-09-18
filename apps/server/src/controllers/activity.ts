/**
 * Activity Log Controller
 * Handles HTTP requests for organization activity logs
 */

import { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { getOrganizationActivityLogs } from '../services/activity';

/**
 * List activity logs for an organization (OWNER and ADMIN only)
 * GET /api/organizations/:organizationId/activity
 */
export async function listOrganizationActivityHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { organizationId } = req.params;

  if (!organizationId) {
    res.status(400).json({
      success: false,
      message: 'Organization ID is required',
    });
    return;
  }

  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

  try {
    const { logs, total } = await getOrganizationActivityLogs(organizationId, {
      limit: isNaN(limit) ? 50 : limit,
      offset: isNaN(offset) ? 0 : offset,
    });

    res.status(200).json({
      success: true,
      data: logs,
      meta: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error fetching organization activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
