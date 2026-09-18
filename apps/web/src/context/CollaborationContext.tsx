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
  fetchTasks: () => Promise<void>;
  createTask: (data: Partial<Task>) => Promise<Task | null>;
  updateTask: (taskId: string, data: Partial<Task>) => Promise<Task | null>;
  moveTask: (taskId: string, status: Task['status'], position: number) => Promise<void>;
  deleteTask: (taskId: string) => Promise<boolean>;
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
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeOrgId, setActiveOrgId] = useState<string>('org-default');
  const [activeProjectId, setActiveProjectId] = useState<string>('proj-default');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);

  const socketRef = useRef<Socket | null>(null);

  // Initialize stored token on client mount
  useEffect(() => {
    const savedToken = tokenStorage.getAccessToken();
    if (savedToken) {
      setToken(savedToken);
    }
    const savedOrg = typeof window !== 'undefined' ? localStorage.getItem('devflow_current_org') : null;
    if (savedOrg) {
      setActiveOrgId(savedOrg);
    }
  }, []);

  // Initialize socket when token changes
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    const socket = getSocket(token);
    socketRef.current = socket;
    socket.connect();

    socket.on('connect', () => {
      setIsConnected(true);
      // Join active organization room
      if (activeOrgId) {
        socket.emit('join:organization', { organizationId: activeOrgId }, (res: any) => {
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
      if (payload.projectId === activeProjectId) {
        setTasks((prev) => {
          if (prev.some((t) => t.id === payload.task.id)) return prev;
          return [...prev, payload.task];
        });
      }
    });

    socket.on('task:updated', (payload: { organizationId: string; projectId: string; task: Task }) => {
      if (payload.projectId === activeProjectId) {
        setTasks((prev) =>
          prev.map((t) => (t.id === payload.task.id ? payload.task : t))
        );
      }
    });

    socket.on('task:moved', (payload: { organizationId: string; projectId: string; task: Task; affectedTaskIds?: string[] }) => {
      if (payload.projectId === activeProjectId) {
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
      if (payload.organizationId === activeOrgId) {
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === payload.message.id)) return prev;
          return [...prev, payload.message];
        });
      }
    });

    // Real-time notifications
    socket.on('notification:new', (payload: { notification: NotificationItem }) => {
      setNotifications((prev) => [payload.notification, ...prev]);
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
      if (payload.organizationId === activeOrgId) {
        setOnlineUserIds((prev) => Array.from(new Set([...prev, payload.userId])));
      }
    });

    socket.on('presence:offline', (payload: { userId: string; organizationId: string }) => {
      if (payload.organizationId === activeOrgId) {
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
  }, [token, activeOrgId, activeProjectId]);

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
  const fetchTasks = useCallback(async () => {
    if (!token || !activeOrgId || !activeProjectId) return;
    try {
      const res = await fetch(
        `${SOCKET_URL}/api/organizations/${activeOrgId}/projects/${activeProjectId}/tasks`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setTasks(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, [token, activeOrgId, activeProjectId]);

  const createTask = useCallback(
    async (taskData: Partial<Task>): Promise<Task | null> => {
      if (!token || !activeOrgId || !activeProjectId) return null;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${activeOrgId}/projects/${activeProjectId}/tasks`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(taskData),
          }
        );
        const data = await res.json();
        if (data.success) {
          return data.data;
        }
      } catch (err) {
        console.error('Failed to create task:', err);
      }
      return null;
    },
    [token, activeOrgId, activeProjectId]
  );

  const updateTask = useCallback(
    async (taskId: string, updateData: Partial<Task>): Promise<Task | null> => {
      if (!token || !activeOrgId || !activeProjectId) return null;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${activeOrgId}/projects/${activeProjectId}/tasks/${taskId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(updateData),
          }
        );
        const data = await res.json();
        if (data.success) {
          return data.data;
        }
      } catch (err) {
        console.error('Failed to update task:', err);
      }
      return null;
    },
    [token, activeOrgId, activeProjectId]
  );

  const moveTask = useCallback(
    async (taskId: string, status: Task['status'], position: number): Promise<void> => {
      if (!token || !activeOrgId || !activeProjectId) return;
      try {
        await fetch(
          `${SOCKET_URL}/api/organizations/${activeOrgId}/projects/${activeProjectId}/tasks/${taskId}/move`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ status, position }),
          }
        );
      } catch (err) {
        console.error('Failed to move task:', err);
      }
    },
    [token, activeOrgId, activeProjectId]
  );

  const deleteTask = useCallback(
    async (taskId: string): Promise<boolean> => {
      if (!token || !activeOrgId || !activeProjectId) return false;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${activeOrgId}/projects/${activeProjectId}/tasks/${taskId}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        return !!data.success;
      } catch (err) {
        console.error('Failed to delete task:', err);
        return false;
      }
    },
    [token, activeOrgId, activeProjectId]
  );

  const fetchComments = useCallback(
    async (taskId: string) => {
      if (!token || !activeOrgId || !activeProjectId) return;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${activeOrgId}/projects/${activeProjectId}/tasks/${taskId}/comments`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (data.success) {
          setComments((prev) => ({ ...prev, [taskId]: data.data }));
        }
      } catch (err) {
        console.error('Failed to fetch comments:', err);
      }
    },
    [token, activeOrgId, activeProjectId]
  );

  const addComment = useCallback(
    async (taskId: string, content: string): Promise<Comment | null> => {
      if (!token || !activeOrgId || !activeProjectId) return null;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${activeOrgId}/projects/${activeProjectId}/tasks/${taskId}/comments`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content }),
          }
        );
        const data = await res.json();
        if (data.success) {
          return data.data;
        }
      } catch (err) {
        console.error('Failed to add comment:', err);
      }
      return null;
    },
    [token, activeOrgId, activeProjectId]
  );

  const updateComment = useCallback(
    async (taskId: string, commentId: string, content: string): Promise<Comment | null> => {
      if (!token || !activeOrgId || !activeProjectId) return null;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${activeOrgId}/projects/${activeProjectId}/tasks/${taskId}/comments/${commentId}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content }),
          }
        );
        const data = await res.json();
        if (data.success) {
          return data.data;
        }
      } catch (err) {
        console.error('Failed to update comment:', err);
      }
      return null;
    },
    [token, activeOrgId, activeProjectId]
  );

  const deleteComment = useCallback(
    async (taskId: string, commentId: string): Promise<boolean> => {
      if (!token || !activeOrgId || !activeProjectId) return false;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${activeOrgId}/projects/${activeProjectId}/tasks/${taskId}/comments/${commentId}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        return !!data.success;
      } catch (err) {
        console.error('Failed to delete comment:', err);
        return false;
      }
    },
    [token, activeOrgId, activeProjectId]
  );

  const fetchChatMessages = useCallback(async () => {
    if (!token || !activeOrgId) return;
    try {
      const res = await fetch(
        `${SOCKET_URL}/api/organizations/${activeOrgId}/chat/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setChatMessages(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch chat messages:', err);
    }
  }, [token, activeOrgId]);

  const sendChatMessage = useCallback(
    async (content: string): Promise<ChatMessage | null> => {
      if (!token || !activeOrgId) return null;
      try {
        const res = await fetch(
          `${SOCKET_URL}/api/organizations/${activeOrgId}/chat/messages`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ content }),
          }
        );
        const data = await res.json();
        if (data.success) {
          return data.data;
        }
      } catch (err) {
        console.error('Failed to send chat message:', err);
      }
      return null;
    },
    [token, activeOrgId]
  );

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${SOCKET_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  }, [token]);

  const markNotificationAsRead = useCallback(
    async (notificationId: string) => {
      if (!token) return;
      try {
        await fetch(`${SOCKET_URL}/api/notifications/${notificationId}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error('Failed to mark notification read:', err);
      }
    },
    [token]
  );

  const markAllNotificationsAsRead = useCallback(async () => {
    if (!token) return;
    try {
      await fetch(`${SOCKET_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
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
