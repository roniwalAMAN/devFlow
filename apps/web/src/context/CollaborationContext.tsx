'use client';

/**
 * Collaboration Context
 * Real-time state management for tasks, comments, team chat, notifications, and presence
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import type { Socket } from 'socket.io-client';
import { getSocket, SOCKET_URL } from '../lib/socket';
import { tokenStorage } from '../lib/api';
import { useAuth } from './AuthContext';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  position: number;
  assigneeId: string | null;
  createdById: string;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: SafeUser | null;
  createdBy: SafeUser | null;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: SafeUser;
}

export interface ChatMessage {
  id: string;
  organizationId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: SafeUser;
}

export interface NotificationItem {
  id: string;
  userId: string;
  organizationId: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

interface CollaborationContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  currentUser: SafeUser | null;
  setCurrentUser: (user: SafeUser | null) => void;
  isConnected: boolean;
  activeOrgId: string;
  setActiveOrgId: (id: string) => void;
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  comments: Record<string, Comment[]>;
  chatMessages: ChatMessage[];
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  onlineUserIds: string[];
  // Actions
  fetchTasks: (targetOrgId?: string, targetProjId?: string) => Promise<void>;
  createTask: (data: Partial<Task>, targetOrgId?: string, targetProjId?: string) => Promise<Task | null>;
  updateTask: (taskId: string, data: Partial<Task>, targetOrgId?: string, targetProjId?: string) => Promise<Task | null>;
  moveTask: (taskId: string, status: Task['status'], position: number, targetOrgId?: string, targetProjId?: string) => Promise<void>;
  deleteTask: (taskId: string, targetOrgId?: string, targetProjId?: string) => Promise<boolean>;
  fetchComments: (taskId: string) => Promise<void>;
  addComment: (taskId: string, content: string) => Promise<Comment | null>;
  updateComment: (taskId: string, commentId: string, content: string) => Promise<Comment | null>;
  deleteComment: (taskId: string, commentId: string) => Promise<boolean>;
  fetchChatMessages: () => Promise<void>;
  sendChatMessage: (content: string) => Promise<ChatMessage | null>;
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (notificationId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

export function CollaborationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return tokenStorage.getAccessToken();
    }
    return null;
  });
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('devflow_current_org') || '';
    }
    return '';
  });
  const [activeProjectId, setActiveProjectId] = useState<string>('');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const activeOrgIdRef = useRef<string>(activeOrgId);
  const activeProjectIdRef = useRef<string>(activeProjectId);

  // Keep refs in sync to avoid stale closures in socket event handlers
  useEffect(() => {
    activeOrgIdRef.current = activeOrgId;
  }, [activeOrgId]);

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId;
  }, [activeProjectId]);

  const fetchNotifications = useCallback(async () => {
    const authToken = tokenStorage.getAccessToken() || token;
    if (!authToken) return;
    try {
      const res = await fetch(`${SOCKET_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [token]);

  // Sync current authenticated user
  useEffect(() => {
    if (user) {
      setCurrentUser({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
      });
      const savedToken = tokenStorage.getAccessToken();
      if (savedToken) {
        setToken(savedToken);
      }
      fetchNotifications();
    } else {
      setCurrentUser(null);
      setNotifications([]);
    }
  }, [user, fetchNotifications]);

  // Fetch initial notifications on mount if token is present
  useEffect(() => {
    const savedToken = tokenStorage.getAccessToken();
    if (savedToken) {
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // Initialize socket when token changes
  useEffect(() => {
    const effectiveToken = token || tokenStorage.getAccessToken();
    if (!effectiveToken) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = getSocket(effectiveToken);
    socketRef.current = socket;
    socket.connect();

    socket.on('connect', () => {
      setIsConnected(true);
      fetchNotifications();
      // Join active organization room
      const currentOrg = activeOrgIdRef.current;
      if (currentOrg) {
        socket.emit('join:organization', { organizationId: currentOrg }, (res: any) => {
          if (res?.success && Array.isArray(res.onlineUserIds)) {
            setOnlineUserIds(res.onlineUserIds);
          }
        });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Real-time task events
    socket.on('task:created', (payload: { organizationId: string; projectId: string; task: Task }) => {
      if (payload.projectId === activeProjectIdRef.current) {
        setTasks((prev) => {
          if (prev.some((t) => t.id === payload.task.id)) return prev;
          return [...prev, payload.task];
        });
      }
    });

    socket.on('task:updated', (payload: { organizationId: string; projectId: string; task: Task }) => {
      if (payload.projectId === activeProjectIdRef.current) {
        setTasks((prev) =>
          prev.map((t) => (t.id === payload.task.id ? payload.task : t))
        );
      }
    });

    socket.on('task:moved', (payload: { organizationId: string; projectId: string; task: Task; affectedTaskIds?: string[] }) => {
      if (payload.projectId === activeProjectIdRef.current) {
        setTasks((prev) =>
          prev.map((t) => (t.id === payload.task.id ? { ...t, status: payload.task.status, position: payload.task.position } : t))
        );
      }
    });

    socket.on('task:deleted', (payload: { organizationId: string; projectId: string; taskId: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== payload.taskId));
    });

    // Real-time comment events
    socket.on('comment:created', (payload: { taskId: string; comment: Comment }) => {
      setComments((prev) => ({
        ...prev,
        [payload.taskId]: [...(prev[payload.taskId] || []), payload.comment],
      }));
    });

    socket.on('comment:updated', (payload: { taskId: string; comment: Comment }) => {
      setComments((prev) => ({
        ...prev,
        [payload.taskId]: (prev[payload.taskId] || []).map((c) =>
          c.id === payload.comment.id ? payload.comment : c
        ),
      }));
    });

    socket.on('comment:deleted', (payload: { taskId: string; commentId: string }) => {
      setComments((prev) => ({
        ...prev,
        [payload.taskId]: (prev[payload.taskId] || []).filter((c) => c.id !== payload.commentId),
      }));
    });

    // Real-time team chat
    socket.on('chat:message', (payload: { organizationId: string; message: ChatMessage }) => {
      if (payload.organizationId === activeOrgIdRef.current) {
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });
      }
    });

    // Real-time notifications
    socket.on('notification:new', (payload: { notification: NotificationItem }) => {
      setNotifications((prev) => [
        payload.notification,
        ...prev.filter((n) => n.id !== payload.notification.id),
      ]);
    });

    socket.on('notification:read', (payload: { notificationId: string; readAt: string }) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === payload.notificationId ? { ...n, readAt: payload.readAt } : n))
      );
    });

    socket.on('notification:read-all', (payload: { readAt: string }) => {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: payload.readAt }))
      );
    });

    // Real-time presence
    socket.on('presence:online', (payload: { userId: string; organizationId: string }) => {
      if (payload.organizationId === activeOrgIdRef.current) {
        setOnlineUserIds((prev) => Array.from(new Set([...prev, payload.userId])));
      }
    });

    socket.on('presence:offline', (payload: { userId: string; organizationId: string }) => {
      if (payload.organizationId === activeOrgIdRef.current) {
        setOnlineUserIds((prev) => prev.filter((id) => id !== payload.userId));
      }
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:moved');
      socket.off('task:deleted');
      socket.off('comment:created');
      socket.off('comment:updated');
      socket.off('comment:deleted');
      socket.off('chat:message');
      socket.off('notification:new');
      socket.off('notification:read');
      socket.off('notification:read-all');
      socket.off('presence:online');
      socket.off('presence:offline');
    };
  }, [token]);

  // Re-join org room if activeOrgId changes
  useEffect(() => {
    if (socketRef.current && isConnected && activeOrgId) {
      socketRef.current.emit('join:organization', { organizationId: activeOrgId }, (res: any) => {
        if (res?.success && Array.isArray(res.onlineUserIds)) {
          setOnlineUserIds(res.onlineUserIds);
        }
      });
    }
  }, [activeOrgId, isConnected]);

  // REST API Helpers
  const fetchTasks = useCallback(async (targetOrgId?: string, targetProjId?: string) => {
    const orgId = targetOrgId || activeOrgIdRef.current;
    const projId = targetProjId || activeProjectIdRef.current;
    const authToken = tokenStorage.getAccessToken() || token;
    if (!authToken || !orgId || !projId) return;
    try {
      const res = await fetch(
        `${SOCKET_URL}/api/organizations/${orgId}/projects/${projId}/tasks`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setTasks(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, [token]);

  const createTask = useCallback(
    async (taskData: Partial<Task>, targetOrgId?: string, targetProjId?: string): Promise<Task | null> => {
      const orgId = targetOrgId || activeOrgIdRef.current;
      const projId = targetProjId || activeProjectIdRef.current;
      const authToken = tokenStorage.getAccessToken() || token;
      if (!authToken || !orgId || !projId) return null;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${orgId}/projects/${projId}/tasks`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(taskData),
          }
        );
        const data = await res.json();
        if (data.success && data.data) {
          setTasks((prev) => {
            if (prev.some((t) => t.id === data.data.id)) return prev;
            return [...prev, data.data];
          });
          return data.data;
        }
      } catch (err) {
        console.error('Failed to create task:', err);
      }
      return null;
    },
    [token]
  );

  const updateTask = useCallback(
    async (taskId: string, updateData: Partial<Task>, targetOrgId?: string, targetProjId?: string): Promise<Task | null> => {
      const orgId = targetOrgId || activeOrgIdRef.current;
      const projId = targetProjId || activeProjectIdRef.current;
      const authToken = tokenStorage.getAccessToken() || token;
      if (!authToken || !orgId || !projId) return null;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${orgId}/projects/${projId}/tasks/${taskId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify(updateData),
          }
        );
        const data = await res.json();
        if (data.success && data.data) {
          setTasks((prev) =>
            prev.map((t) => (t.id === data.data.id ? data.data : t))
          );
          return data.data;
        }
      } catch (err) {
        console.error('Failed to update task:', err);
      }
      return null;
    },
    [token]
  );

  const moveTask = useCallback(
    async (taskId: string, status: Task['status'], position: number, targetOrgId?: string, targetProjId?: string): Promise<void> => {
      const orgId = targetOrgId || activeOrgIdRef.current;
      const projId = targetProjId || activeProjectIdRef.current;
      const authToken = tokenStorage.getAccessToken() || token;
      if (!authToken || !orgId || !projId) return;
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status, position } : t))
      );
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${orgId}/projects/${projId}/tasks/${taskId}/move`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ status, position }),
          }
        );
        const data = await res.json();
        if (data.success && data.data) {
          setTasks((prev) =>
            prev.map((t) => (t.id === data.data.id ? data.data : t))
          );
        }
      } catch (err) {
        console.error('Failed to move task:', err);
      }
    },
    [token]
  );

  const deleteTask = useCallback(
    async (taskId: string, targetOrgId?: string, targetProjId?: string): Promise<boolean> => {
      const orgId = targetOrgId || activeOrgIdRef.current;
      const projId = targetProjId || activeProjectIdRef.current;
      const authToken = tokenStorage.getAccessToken() || token;
      if (!authToken || !orgId || !projId) return false;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${orgId}/projects/${projId}/tasks/${taskId}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        const data = await res.json();
        if (data.success) {
          setTasks((prev) => prev.filter((t) => t.id !== taskId));
          return true;
        }
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
      return false;
    },
    [token]
  );

  const fetchComments = useCallback(
    async (taskId: string) => {
      const orgId = activeOrgIdRef.current;
      const projId = activeProjectIdRef.current;
      const authToken = tokenStorage.getAccessToken() || token;
      if (!authToken || !orgId || !projId) return;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${orgId}/projects/${projId}/tasks/${taskId}/comments`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        const data = await res.json();
        if (data.success) {
          setComments((prev) => ({ ...prev, [taskId]: data.data }));
        }
      } catch (err) {
        console.error('Failed to fetch comments:', err);
      }
    },
    [token]
  );

  const addComment = useCallback(
    async (taskId: string, content: string): Promise<Comment | null> => {
      const orgId = activeOrgIdRef.current;
      const projId = activeProjectIdRef.current;
      const authToken = tokenStorage.getAccessToken() || token;
      if (!authToken || !orgId || !projId) return null;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${orgId}/projects/${projId}/tasks/${taskId}/comments`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ content }),
          }
        );
        const data = await res.json();
        if (data.success && data.data) {
          setComments((prev) => ({
            ...prev,
            [taskId]: [...(prev[taskId] || []), data.data],
          }));
          return data.data;
        }
      } catch (err) {
        console.error('Failed to add comment:', err);
      }
      return null;
    },
    [token]
  );

  const updateComment = useCallback(
    async (taskId: string, commentId: string, content: string): Promise<Comment | null> => {
      const orgId = activeOrgIdRef.current;
      const projId = activeProjectIdRef.current;
      const authToken = tokenStorage.getAccessToken() || token;
      if (!authToken || !orgId || !projId) return null;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${orgId}/projects/${projId}/tasks/${taskId}/comments/${commentId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ content }),
          }
        );
        const data = await res.json();
        if (data.success && data.data) {
          setComments((prev) => ({
            ...prev,
            [taskId]: (prev[taskId] || []).map((c) => (c.id === commentId ? data.data : c)),
          }));
          return data.data;
        }
      } catch (err) {
        console.error('Failed to update comment:', err);
      }
      return null;
    },
    [token]
  );

  const deleteComment = useCallback(
    async (taskId: string, commentId: string): Promise<boolean> => {
      const orgId = activeOrgIdRef.current;
      const projId = activeProjectIdRef.current;
      const authToken = tokenStorage.getAccessToken() || token;
      if (!authToken || !orgId || !projId) return false;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${orgId}/projects/${projId}/tasks/${taskId}/comments/${commentId}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${authToken}` },
          }
        );
        const data = await res.json();
        if (data.success) {
          setComments((prev) => ({
            ...prev,
            [taskId]: (prev[taskId] || []).filter((c) => c.id !== commentId),
          }));
          return true;
        }
      } catch (err) {
        console.error('Failed to delete comment:', err);
      }
      return false;
    },
    [token]
  );

  const fetchChatMessages = useCallback(async () => {
    const orgId = activeOrgIdRef.current;
    const authToken = tokenStorage.getAccessToken() || token;
    if (!authToken || !orgId) return;
    try {
      const res = await fetch(
        `${SOCKET_URL}/api/organizations/${orgId}/chat/messages`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setChatMessages(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch chat messages:', err);
    }
  }, [token]);

  const sendChatMessage = useCallback(
    async (content: string): Promise<ChatMessage | null> => {
      const orgId = activeOrgIdRef.current;
      const authToken = tokenStorage.getAccessToken() || token;
      if (!authToken || !orgId) return null;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${orgId}/chat/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ content }),
          }
        );
        const data = await res.json();
        if (data.success && data.data) {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === data.data.id)) return prev;
            return [...prev, data.data];
          });
          return data.data;
        }
      } catch (err) {
        console.error('Failed to send chat message:', err);
      }
      return null;
    },
    [token]
  );

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      const authToken = tokenStorage.getAccessToken() || token;
      if (!authToken) return;
      try {
        await fetch(`${SOCKET_URL}/api/notifications/${notificationId}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${authToken}` },
        });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n))
        );
      } catch (err) {
        console.error('Failed to mark notification read:', err);
      }
    },
    [token]
  );

  const markAllNotificationsAsRead = useCallback(async () => {
    const authToken = tokenStorage.getAccessToken() || token;
    if (!authToken) return;
    try {
      await fetch(`${SOCKET_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, readAt: new Date().toISOString() }))
      );
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  }, [token]);

  const unreadNotificationsCount = notifications.filter((n) => !n.readAt).length;

  return (
    <CollaborationContext.Provider
      value={{
        token,
        setToken,
        currentUser,
        setCurrentUser,
        isConnected,
        activeOrgId,
        setActiveOrgId,
        activeProjectId,
        setActiveProjectId,
        tasks,
        setTasks,
        comments,
        chatMessages,
        notifications,
        unreadNotificationsCount,
        onlineUserIds,
        fetchTasks,
        createTask,
        updateTask,
        moveTask,
        deleteTask,
        fetchComments,
        addComment,
        updateComment,
        deleteComment,
        fetchChatMessages,
        sendChatMessage,
        fetchNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
      }}
    >
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within a CollaborationProvider');
  }
  return context;
}
