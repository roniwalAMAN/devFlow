/**
 * DevFlow Frontend API Client
 * Features:
 * - Automatic JWT authorization header injection
 * - Automatic token refresh on 401 Unauthorized responses
 * - Strongly typed response wrappers
 * - Safe error parsing
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field?: string; message: string }>;
}

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('devflow_access_token');
  },
  getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('devflow_refresh_token');
  },
  setTokens(accessToken: string, refreshToken?: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('devflow_access_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('devflow_refresh_token', refreshToken);
    }
  },
  clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('devflow_access_token');
    localStorage.removeItem('devflow_refresh_token');
    localStorage.removeItem('devflow_current_org');
  },
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = tokenStorage.getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - Attempt Refresh
    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        tokenStorage.clearTokens();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return { success: false, message: 'Session expired. Please log in again.' };
      }

      if (isRefreshing) {
        return new Promise<ApiResponse<T>>((resolve, reject) => {
          failedQueue.push({
            resolve: async (newToken: string) => {
              options.headers = {
                ...options.headers,
                Authorization: `Bearer ${newToken}`,
              };
              try {
                const retryRes = await apiRequest<T>(endpoint, options);
                resolve(retryRes);
              } catch (err) {
                reject(err);
              }
            },
            reject: (err: any) => reject(err),
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        const refreshData = await refreshResponse.json();

        if (refreshData.success && refreshData.data?.accessToken) {
          tokenStorage.setTokens(refreshData.data.accessToken, refreshData.data.refreshToken);
          processQueue(null, refreshData.data.accessToken);

          // Retry initial request
          headers['Authorization'] = `Bearer ${refreshData.data.accessToken}`;
          const retryResponse = await fetch(url, { ...options, headers });
          const retryData = await retryResponse.json();
          return retryData;
        } else {
          processQueue(new Error('Refresh failed'), null);
          tokenStorage.clearTokens();
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
          return { success: false, message: 'Session expired. Please log in again.' };
        }
      } catch (err) {
        processQueue(err, null);
        tokenStorage.clearTokens();
        return { success: false, message: 'Failed to refresh authentication session.' };
      } finally {
        isRefreshing = false;
      }
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Network error occurred. Please check your connection.',
    };
  }
}

// API Module Helpers
export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (payload: { name: string; email: string; password: string }) =>
    apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  me: () => apiRequest('/api/auth/me'),
  logout: () => {
    const refreshToken = tokenStorage.getRefreshToken();
    return apiRequest('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  },

  // Organizations
  listOrganizations: () => apiRequest('/api/organizations'),
  getOrganization: (orgId: string) => apiRequest(`/api/organizations/${orgId}`),
  createOrganization: (data: { name: string }) =>
    apiRequest('/api/organizations', { method: 'POST', body: JSON.stringify(data) }),
  addMember: (orgId: string, email: string, role?: string) =>
    apiRequest(`/api/organizations/${orgId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  removeMember: (orgId: string, userId: string) =>
    apiRequest(`/api/organizations/${orgId}/members/${userId}`, { method: 'DELETE' }),
  updateMemberRole: (orgId: string, userId: string, role: string) =>
    apiRequest(`/api/organizations/${orgId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  // Invites
  listInvites: (orgId: string) => apiRequest(`/api/organizations/${orgId}/invites`),
  createInvite: (orgId: string, email: string, role?: string) =>
    apiRequest(`/api/organizations/${orgId}/invites`, {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  revokeInvite: (orgId: string, inviteId: string) =>
    apiRequest(`/api/organizations/${orgId}/invites/${inviteId}`, { method: 'DELETE' }),
  resendInvite: (orgId: string, inviteId: string) =>
    apiRequest(`/api/organizations/${orgId}/invites/${inviteId}/resend`, { method: 'POST' }),
  acceptInvite: (token: string) =>
    apiRequest(`/api/invites/${token}/accept`, { method: 'POST' }),

  // Projects
  listProjects: (orgId: string) => apiRequest(`/api/organizations/${orgId}/projects`),
  getProject: (orgId: string, projectId: string) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}`),
  createProject: (orgId: string, data: { name: string; description?: string }) =>
    apiRequest(`/api/organizations/${orgId}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateProject: (orgId: string, projectId: string, data: { name?: string; description?: string }) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteProject: (orgId: string, projectId: string) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}`, { method: 'DELETE' }),

  // Tasks
  listTasks: (orgId: string, projectId: string) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}/tasks`),
  getTask: (orgId: string, projectId: string, taskId: string) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`),
  createTask: (orgId: string, projectId: string, data: any) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTask: (orgId: string, projectId: string, taskId: string, data: any) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  moveTask: (orgId: string, projectId: string, taskId: string, data: { status: string; position: number }) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/move`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteTask: (orgId: string, projectId: string, taskId: string) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
    }),

  // Comments
  listComments: (orgId: string, projectId: string, taskId: string) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/comments`),
  createComment: (orgId: string, projectId: string, taskId: string, content: string) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  updateComment: (orgId: string, projectId: string, taskId: string, commentId: string, content: string) =>
    apiRequest(
      `/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
      { method: 'PATCH', body: JSON.stringify({ content }) }
    ),
  deleteComment: (orgId: string, projectId: string, taskId: string, commentId: string) =>
    apiRequest(
      `/api/organizations/${orgId}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`,
      { method: 'DELETE' }
    ),

  // Team Chat
  listChatMessages: (orgId: string) => apiRequest(`/api/organizations/${orgId}/chat/messages`),
  sendChatMessage: (orgId: string, content: string) =>
    apiRequest(`/api/organizations/${orgId}/chat/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Notifications
  listNotifications: () => apiRequest('/api/notifications'),
  markNotificationRead: (id: string) =>
    apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    apiRequest('/api/notifications/read-all', { method: 'PATCH' }),

  // GitHub
  getGitHubConnection: () => apiRequest('/api/github/me'),
  disconnectGitHub: () => apiRequest('/api/github/disconnect', { method: 'DELETE' }),
  linkProjectRepo: (orgId: string, projectId: string, repo: { repoOwner: string; repoName: string }) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}/github/repository`, {
      method: 'POST',
      body: JSON.stringify(repo),
    }),
  unlinkProjectRepo: (orgId: string, projectId: string) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}/github/repository`, {
      method: 'DELETE',
    }),
  getProjectRepo: (orgId: string, projectId: string) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}/github/repository`),
  getProjectCommits: (orgId: string, projectId: string) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}/github/commits`),
  getProjectPulls: (orgId: string, projectId: string) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}/github/pulls`),
  getProjectIssues: (orgId: string, projectId: string) =>
    apiRequest(`/api/organizations/${orgId}/projects/${projectId}/github/issues`),

  // AI Assistant
  askAssistant: (payload: { prompt: string; context?: any }) =>
    apiRequest('/api/ai/assistant', { method: 'POST', body: JSON.stringify(payload) }),

  // Activity Log
  listActivity: (orgId: string, limit = 50, offset = 0) =>
    apiRequest(`/api/organizations/${orgId}/activity?limit=${limit}&offset=${offset}`),

  // Health
  getHealth: () => apiRequest('/api/health'),
  getFullHealth: () => apiRequest('/api/health/full'),
};
