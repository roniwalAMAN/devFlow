'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import {
  Activity,
  Filter,
  RefreshCw,
  Shield,
  Clock,
  User,
  CheckCircle2,
  FolderGit2,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Github } from '../../components/Icons';

export default function ActivityLogPage() {
  const router = useRouter();
  const { currentOrg, currentRole, isAuthenticated, isLoading: authLoading } = useAuth();

  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(25);
  const [offset, setOffset] = useState(0);
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const orgId = currentOrg?.id || 'acme-engineering';

  const loadActivity = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);

    try {
      const res = await api.listActivity(orgId, limit, offset);
      if (res.success && res.data) {
        setActivityLogs(res.data.activityLogs || []);
        setTotalCount(res.data.pagination?.total || res.data.activityLogs?.length || 0);
      }
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, limit, offset]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) {
      loadActivity();
    }
  }, [authLoading, isAuthenticated, loadActivity, router]);

  const filteredLogs = activityLogs.filter((log) => {
    if (selectedAction === 'ALL') return true;
    return log.action === selectedAction;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATED')) return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
    if (action.includes('UPDATED') || action.includes('MOVED')) return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
    if (action.includes('DELETED') || action.includes('REVOKED')) return 'bg-rose-500/10 text-rose-300 border-rose-500/20';
    if (action.includes('GITHUB')) return 'bg-purple-500/10 text-purple-300 border-purple-500/20';
    return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mb-1">
              <span>Organization</span>
              <span>/</span>
              <span>Audit Trail</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Activity className="h-6 w-6 text-indigo-400" />
              Organization Activity & Audit Log
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => loadActivity()}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
              title="Refresh Activity Log"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Audit Policy & Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-zinc-500" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Event Actions</option>
              <option value="PROJECT_CREATED">Project Created</option>
              <option value="PROJECT_UPDATED">Project Updated</option>
              <option value="PROJECT_DELETED">Project Deleted</option>
              <option value="TASK_CREATED">Task Created</option>
              <option value="TASK_UPDATED">Task Updated</option>
              <option value="TASK_MOVED">Task Moved</option>
              <option value="TASK_DELETED">Task Deleted</option>
              <option value="COMMENT_CREATED">Comment Created</option>
              <option value="GITHUB_REPO_LINKED">GitHub Repo Linked</option>
              <option value="ORGANIZATION_CREATED">Organization Created</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span>Sensitive tokens, passwords, and API keys automatically redacted at rest</span>
          </div>
        </div>

        {/* Activity Timeline List */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm p-6 shadow-2xl">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 rounded-xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center text-xs text-zinc-500">
              No audit logs recorded for this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 hover:bg-zinc-800/30 transition gap-4"
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    {log.user?.avatar ? (
                      <img src={log.user.avatar} alt={log.user.name} className="h-8 w-8 rounded-full object-cover shrink-0 mt-0.5" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600/30 border border-indigo-500/30 text-xs font-bold text-indigo-300 shrink-0 mt-0.5">
                        {log.user?.name ? log.user.name[0].toUpperCase() : 'U'}
                      </div>
                    )}

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-xs text-white">{log.user?.name || 'Automated System'}</span>
                        <span
                          className={`rounded border px-2 py-0.2 text-[10px] font-mono uppercase font-semibold ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                        <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-400 font-mono">
                          {log.entityType}
                        </span>
                      </div>

                      {log.metadata && (
                        <div className="text-[11px] text-zinc-400 font-mono bg-zinc-950/70 rounded-lg px-2 py-1 max-w-xl truncate">
                          {JSON.stringify(log.metadata)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono shrink-0">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalCount > limit && (
            <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <span>
                Showing {offset + 1} to {Math.min(offset + limit, totalCount)} of {totalCount} events
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
                  disabled={offset === 0}
                  className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40 hover:bg-zinc-800"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Previous
                </button>
                <button
                  onClick={() => setOffset((prev) => prev + limit)}
                  disabled={offset + limit >= totalCount}
                  className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40 hover:bg-zinc-800"
                >
                  Next
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
