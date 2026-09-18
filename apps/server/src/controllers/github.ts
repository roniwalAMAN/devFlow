/**
 * GitHub User Connection Controllers
 */

import { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import {
  getGitHubAuthUrl,
  exchangeGitHubCodeForToken,
  fetchGitHubUserProfile,
  getUserGitHubConnection,
  saveUserGitHubConnection,
  deleteUserGitHubConnection,
  formatGitHubConnection,
} from '../services/github';

/**
 * GET /api/github/connect
 * Initiate GitHub OAuth flow
 */
export async function connectGitHubHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const state = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64');
  const authUrl = getGitHubAuthUrl(state);

  res.status(200).json({
    success: true,
    data: {
      url: authUrl,
      state,
    },
  });
}

/**
 * GET /api/github/callback
 * GitHub OAuth callback handler
 */
export async function callbackGitHubHandler(
  req: Request,
  res: Response
): Promise<void> {
  const { code, state } = req.query;

  if (!code || typeof code !== 'string') {
    res.status(400).json({
      success: false,
      message: 'Authorization code is required',
    });
    return;
  }

  try {
    let userId: string | null = null;
    if (state && typeof state === 'string') {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
        userId = decoded.userId;
      } catch {
        // Ignore state decode error
      }
    }

    // Fallback to authenticated user if session/bearer present
    const authReq = req as AuthenticatedRequest;
    if (!userId && authReq.user?.userId) {
      userId = authReq.user.userId;
    }

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'Unable to correlate GitHub OAuth state with user session',
      });
      return;
    }

    const accessToken = await exchangeGitHubCodeForToken(code);
    const profile = await fetchGitHubUserProfile(accessToken);

    const connection = await saveUserGitHubConnection(
      userId,
      profile.id,
      profile.login,
      accessToken
    );

    res.status(200).json({
      success: true,
      message: 'GitHub connected successfully',
      data: formatGitHubConnection(connection),
    });
  } catch (error: any) {
    console.error('GitHub callback failed:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete GitHub authentication',
    });
  }
}

/**
 * GET /api/github/me
 * Get current user GitHub connection status
 */
export async function getMeGitHubHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  try {
    const connection = await getUserGitHubConnection(userId);
    res.status(200).json({
      success: true,
      data: formatGitHubConnection(connection),
    });
  } catch (error) {
    console.error('Error fetching GitHub connection:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * DELETE /api/github/disconnect
 * Disconnect current user GitHub connection
 */
export async function disconnectGitHubHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  try {
    await deleteUserGitHubConnection(userId);
    res.status(200).json({
      success: true,
      message: 'GitHub disconnected successfully',
    });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
