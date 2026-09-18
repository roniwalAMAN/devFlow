/**
 * GitHub Integration Service
 * Manages OAuth connections, token encryption, and read-only repository synchronization
 */

import { prisma, type GitHubConnection, type Project } from '@devflow/database';
import { encryptToken, decryptToken } from '../utils/crypto';

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || '';
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || '';
const GITHUB_CALLBACK_URL =
  process.env.GITHUB_CALLBACK_URL || 'http://localhost:3001/api/github/callback';

export interface SafeGitHubConnection {
  connected: boolean;
  username?: string;
  githubUserId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Format GitHub connection for public/client consumption (NEVER exposes accessToken)
 */
export function formatGitHubConnection(
  conn: GitHubConnection | null
): SafeGitHubConnection {
  if (!conn) {
    return { connected: false };
  }

  return {
    connected: true,
    username: conn.username,
    githubUserId: conn.githubUserId,
    createdAt: conn.createdAt,
    updatedAt: conn.updatedAt,
  };
}

/**
 * Generate GitHub OAuth Authorization URL
 */
export function getGitHubAuthUrl(state: string): string {
  const scope = 'read:user user:email repo';
  return `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(
    GITHUB_CALLBACK_URL
  )}&scope=${encodeURIComponent(scope)}&state=${encodeURIComponent(state)}`;
}

/**
 * Exchange OAuth authorization code for GitHub access token
 */
export async function exchangeGitHubCodeForToken(code: string): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_CALLBACK_URL,
    }),
  });

  const data = (await response.json()) as any;

  if (data.error || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Failed to exchange GitHub code');
  }

  return data.access_token as string;
}

/**
 * Fetch GitHub user profile using access token
 */
export async function fetchGitHubUserProfile(
  accessToken: string
): Promise<{ id: string; login: string; avatar_url: string; email?: string }> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'User-Agent': 'DevFlow-App',
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const data = (await response.json()) as any;
  return {
    id: String(data.id),
    login: data.login,
    avatar_url: data.avatar_url,
    email: data.email,
  };
}

/**
 * Get user's active GitHub connection
 */
export async function getUserGitHubConnection(
  userId: string
): Promise<GitHubConnection | null> {
  return prisma.gitHubConnection.findUnique({
    where: { userId },
  });
}

/**
 * Save or update user's encrypted GitHub connection
 */
export async function saveUserGitHubConnection(
  userId: string,
  githubUserId: string,
  username: string,
  rawAccessToken: string
): Promise<GitHubConnection> {
  const encryptedToken = encryptToken(rawAccessToken);

  return prisma.gitHubConnection.upsert({
    where: { userId },
    update: {
      githubUserId,
      username,
      accessToken: encryptedToken,
    },
    create: {
      userId,
      githubUserId,
      username,
      accessToken: encryptedToken,
    },
  });
}

/**
 * Disconnect user's GitHub connection
 */
export async function deleteUserGitHubConnection(userId: string): Promise<boolean> {
  try {
    await prisma.gitHubConnection.delete({
      where: { userId },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper to get user's decrypted GitHub access token
 */
export async function getUserDecryptedToken(userId: string): Promise<string | null> {
  const conn = await getUserGitHubConnection(userId);
  if (!conn || !conn.accessToken) return null;

  try {
    return decryptToken(conn.accessToken);
  } catch (err) {
    console.error('Failed to decrypt GitHub token:', err);
    return null;
  }
}

/**
 * Connect Project to GitHub Repository
 */
export async function linkProjectGitHubRepository(
  projectId: string,
  organizationId: string,
  userId: string,
  owner: string,
  repo: string
): Promise<Project> {
  const token = await getUserDecryptedToken(userId);

  let githubRepoId = 'gh-' + Date.now();

  // If token is available, verify repository on GitHub
  if (token) {
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'User-Agent': 'DevFlow-App',
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (res.ok) {
        const repoData = (await res.json()) as any;
        githubRepoId = String(repoData.id);
      }
    } catch (err) {
      console.warn('GitHub repository verification skipped:', err);
    }
  }

  const updated = await prisma.project.update({
    where: { id: projectId, organizationId },
    data: {
      githubRepoOwner: owner,
      githubRepoName: repo,
      githubRepoId,
    },
  });

  return updated;
}

/**
 * Unlink Project GitHub Repository
 */
export async function unlinkProjectGitHubRepository(
  projectId: string,
  organizationId: string
): Promise<Project> {
  return prisma.project.update({
    where: { id: projectId, organizationId },
    data: {
      githubRepoOwner: null,
      githubRepoName: null,
      githubRepoId: null,
    },
  });
}

/**
 * Fetch Project GitHub Repository Details
 */
export async function getProjectGitHubDetails(
  project: Project,
  userId: string
): Promise<any> {
  if (!project.githubRepoOwner || !project.githubRepoName) {
    return null;
  }

  const { githubRepoOwner: owner, githubRepoName: repo } = project;
  const token = await getUserDecryptedToken(userId);

  const headers: Record<string, string> = {
    'User-Agent': 'DevFlow-App',
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!res.ok) {
      return {
        owner,
        repo,
        name: repo,
        fullName: `${owner}/${repo}`,
        description: 'Connected GitHub Repository',
        stars: 0,
        forks: 0,
        openIssues: 0,
        defaultBranch: 'main',
        htmlUrl: `https://github.com/${owner}/${repo}`,
      };
    }

    const data = (await res.json()) as any;
    return {
      owner: data.owner?.login || owner,
      repo: data.name || repo,
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      defaultBranch: data.default_branch,
      htmlUrl: data.html_url,
    };
  } catch {
    return {
      owner,
      repo,
      name: repo,
      fullName: `${owner}/${repo}`,
      description: 'Connected GitHub Repository',
      stars: 0,
      forks: 0,
      openIssues: 0,
      defaultBranch: 'main',
      htmlUrl: `https://github.com/${owner}/${repo}`,
    };
  }
}

/**
 * Fetch Recent Commits for linked project
 */
export async function getProjectCommits(
  project: Project,
  userId: string
): Promise<any[]> {
  if (!project.githubRepoOwner || !project.githubRepoName) {
    return [];
  }

  const { githubRepoOwner: owner, githubRepoName: repo } = project;
  const token = await getUserDecryptedToken(userId);

  const headers: Record<string, string> = {
    'User-Agent': 'DevFlow-App',
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=15`,
      { headers }
    );
    if (!res.ok) return [];

    const data = (await res.json()) as any[];
    if (!Array.isArray(data)) return [];

    return data.map((c) => ({
      sha: c.sha,
      shortSha: c.sha.substring(0, 7),
      message: c.commit?.message || '',
      authorName: c.commit?.author?.name || c.author?.login || 'Unknown',
      authorEmail: c.commit?.author?.email || '',
      authorAvatar: c.author?.avatar_url || null,
      date: c.commit?.author?.date || new Date().toISOString(),
      url: c.html_url,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch Pull Requests for linked project
 */
export async function getProjectPullRequests(
  project: Project,
  userId: string
): Promise<any[]> {
  if (!project.githubRepoOwner || !project.githubRepoName) {
    return [];
  }

  const { githubRepoOwner: owner, githubRepoName: repo } = project;
  const token = await getUserDecryptedToken(userId);

  const headers: Record<string, string> = {
    'User-Agent': 'DevFlow-App',
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=15`,
      { headers }
    );
    if (!res.ok) return [];

    const data = (await res.json()) as any[];
    if (!Array.isArray(data)) return [];

    return data.map((pr) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      draft: !!pr.draft,
      user: {
        login: pr.user?.login || 'user',
        avatarUrl: pr.user?.avatar_url || null,
      },
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      mergedAt: pr.merged_at,
      url: pr.html_url,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch Issues for linked project
 */
export async function getProjectIssues(
  project: Project,
  userId: string
): Promise<any[]> {
  if (!project.githubRepoOwner || !project.githubRepoName) {
    return [];
  }

  const { githubRepoOwner: owner, githubRepoName: repo } = project;
  const token = await getUserDecryptedToken(userId);

  const headers: Record<string, string> = {
    'User-Agent': 'DevFlow-App',
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=15`,
      { headers }
    );
    if (!res.ok) return [];

    const data = (await res.json()) as any[];
    if (!Array.isArray(data)) return [];

    // Filter out pull requests which GitHub includes in issues API
    return data
      .filter((item) => !item.pull_request)
      .map((issue) => ({
        id: issue.id,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        user: {
          login: issue.user?.login || 'user',
          avatarUrl: issue.user?.avatar_url || null,
        },
        labels: (issue.labels || []).map((l: any) => ({
          name: l.name,
          color: l.color,
        })),
        commentsCount: issue.comments || 0,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        url: issue.html_url,
      }));
  } catch {
    return [];
  }
}
