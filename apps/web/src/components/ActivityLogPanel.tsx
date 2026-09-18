'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCollaboration } from '../context/CollaborationContext';
import { SOCKET_URL } from '../lib/socket';

interface ActivityLogItem {
  id: string;
  organizationId: string;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: any;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
  } | null;
}

interface ActivityLogPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityLogPanel({ isOpen, onClose }: ActivityLogPanelProps) {
  const { token, activeOrgId } = useCollaboration();

  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);

  const fetchActivityLogs = useCallback(async () => {
    if (!token || !activeOrgId) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `${SOCKET_URL}/api/organizations/${activeOrgId}/activity?limit=50`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setLogs(data.data);
        setTotal(data.meta?.total || data.data.length);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, [token, activeOrgId]);

  useEffect(() => {
    if (isOpen) {
      fetchActivityLogs();
    }
  }, [isOpen, fetchActivityLogs]);

  if (!isOpen) return null;

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATED') || action.includes('ADDED') || action.includes('ACCEPTED')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    }
    if (action.includes('DELETED') || action.includes('REMOVED') || action.includes('REVOKED')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    }
    if (action.includes('UPDATED') || action.includes('MOVED') || action.includes('LINKED')) {
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
    return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative flex h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 shadow">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-100">Organization Audit Logs</h2>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                  {total} Events Recorded
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Audited timeline of task, project, member, and repository mutations.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchActivityLogs()}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-white transition"
              title="Refresh logs"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Audit Timeline Feed */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-zinc-500 animate-pulse">
              Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-500">
              No audit logs recorded for this organization yet.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-3.5 hover:bg-zinc-900/80 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold text-zinc-300 shrink-0">
                    {log.user?.name ? log.user.name.charAt(0).toUpperCase() : 'S'}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-zinc-200">
                        {log.user?.name || log.user?.email || 'System'}
                      </span>
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase border ${getActionBadgeColor(
                          log.action
                        )}`}
                      >
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {log.entityType} {log.entityId ? `#${log.entityId.slice(-6)}` : ''}
                      </span>
                    </div>

                    {log.metadata && (
                      <div className="mt-1 text-[11px] text-zinc-400">
                        {typeof log.metadata === 'object'
                          ? Object.entries(log.metadata)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' • ')
                          : String(log.metadata)}
                      </div>
                    )}
                  </div>
                </div>

                <span className="text-[10px] text-zinc-500 whitespace-nowrap ml-2">
                  {new Date(log.createdAt).toLocaleString([], {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
