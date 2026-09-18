/**
 * Project GitHub Repository Controllers
 */

import { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { findProjectByIdAndOrg } from '../services/project';
import {
  linkProjectGitHubRepository,
  unlinkProjectGitHubRepository,
  getProjectGitHubDetails,
  getProjectCommits,
  getProjectPullRequests,
  getProjectIssues,
} from '../services/github';
import { logActivity, ACTIVITY_ACTIONS } from '../services/activity';
import { invalidateOrganizationProjectsCache } from '../services/cache';

/**
 * POST /api/organizations/:organizationId/projects/:projectId/github/repository
 * Link GitHub repository to project (OWNER/ADMIN only)
 */
export async function linkProjectRepoHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { organizationId, projectId } = req.params;
  const { owner, repo } = req.body;
  const userId = req.user?.userId;

  if (!owner || !repo || typeof owner !== 'string' || typeof repo !== 'string') {
    res.status(400).json({
      success: false,
      message: 'GitHub repository owner and name are required',
    });
    return;
  }

  try {
    const project = await findProjectByIdAndOrg(organizationId, projectId);
    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found in this organization',
      });
      return;
    }

    const updated = await linkProjectGitHubRepository(
      projectId,
      organizationId,
      userId!,
      owner.trim(),
      repo.trim()
    );

    // Audit log & Cache invalidation
    await Promise.all([
      logActivity({
        organizationId,
        userId,
        action: ACTIVITY_ACTIONS.GITHUB_REPO_LINKED,
        entityType: 'PROJECT',
        entityId: projectId,
        metadata: { owner: owner.trim(), repo: repo.trim() },
      }),
      invalidateOrganizationProjectsCache(organizationId),
    ]);

    res.status(200).json({
      success: true,
      message: 'GitHub repository linked successfully',
      data: {
        id: updated.id,
        githubRepoOwner: updated.githubRepoOwner,
        githubRepoName: updated.githubRepoName,
        githubRepoId: updated.githubRepoId,
      },
    });
  } catch (error: any) {
    console.error('Error linking GitHub repository:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to link GitHub repository',
    });
  }
}

/**
 * DELETE /api/organizations/:organizationId/projects/:projectId/github/repository
 * Unlink GitHub repository from project (OWNER/ADMIN only)
 */
export async function unlinkProjectRepoHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { organizationId, projectId } = req.params;
  const userId = req.user?.userId;

  try {
    const project = await findProjectByIdAndOrg(organizationId, projectId);
    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found in this organization',
      });
      return;
    }

    const updated = await unlinkProjectGitHubRepository(projectId, organizationId);

    // Audit log & Cache invalidation
    await Promise.all([
      logActivity({
        organizationId,
        userId,
        action: ACTIVITY_ACTIONS.GITHUB_REPO_UNLINKED,
        entityType: 'PROJECT',
        entityId: projectId,
      }),
      invalidateOrganizationProjectsCache(organizationId),
    ]);

    res.status(200).json({
      success: true,
      message: 'GitHub repository unlinked successfully',
      data: {
        id: updated.id,
        githubRepoOwner: null,
        githubRepoName: null,
        githubRepoId: null,
      },
    });
  } catch (error) {
    console.error('Error unlinking GitHub repository:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * GET /api/organizations/:organizationId/projects/:projectId/github/repository
 * Get linked repository information
 */
export async function getProjectRepoDetailsHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { organizationId, projectId } = req.params;
  const userId = req.user?.userId;

  try {
    const project = await findProjectByIdAndOrg(organizationId, projectId);
    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found in this organization',
      });
      return;
    }

    if (!project.githubRepoOwner || !project.githubRepoName) {
      res.status(200).json({
        success: true,
        data: null,
        message: 'No GitHub repository linked to this project',
      });
      return;
    }

    const details = await getProjectGitHubDetails(project, userId!);

    res.status(200).json({
      success: true,
      data: details,
    });
  } catch (error) {
    console.error('Error fetching GitHub repo details:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * GET /api/organizations/:organizationId/projects/:projectId/github/commits
 * Get recent commits for project repo
 */
export async function getProjectCommitsHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { organizationId, projectId } = req.params;
  const userId = req.user?.userId;

  try {
    const project = await findProjectByIdAndOrg(organizationId, projectId);
    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found in this organization',
      });
      return;
    }

    const commits = await getProjectCommits(project, userId!);
    res.status(200).json({
      success: true,
      data: commits,
    });
  } catch (error) {
    console.error('Error fetching project commits:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * GET /api/organizations/:organizationId/projects/:projectId/github/pulls
 * Get pull requests for project repo
 */
export async function getProjectPullsHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { organizationId, projectId } = req.params;
  const userId = req.user?.userId;

  try {
    const project = await findProjectByIdAndOrg(organizationId, projectId);
    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found in this organization',
      });
      return;
    }

    const pulls = await getProjectPullRequests(project, userId!);
    res.status(200).json({
      success: true,
      data: pulls,
    });
  } catch (error) {
    console.error('Error fetching project PRs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * GET /api/organizations/:organizationId/projects/:projectId/github/issues
 * Get issues for project repo
 */
export async function getProjectIssuesHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { organizationId, projectId } = req.params;
  const userId = req.user?.userId;

  try {
    const project = await findProjectByIdAndOrg(organizationId, projectId);
    if (!project) {
      res.status(404).json({
        success: false,
        message: 'Project not found in this organization',
      });
      return;
    }

    const issues = await getProjectIssues(project, userId!);
    res.status(200).json({
      success: true,
      data: issues,
    });
  } catch (error) {
    console.error('Error fetching project issues:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
