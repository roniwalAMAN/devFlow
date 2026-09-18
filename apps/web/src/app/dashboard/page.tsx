'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useCollaboration, Task } from '../../context/CollaborationContext';
import { Navbar } from '../../components/Navbar';
import { TeamChatPanel } from '../../components/TeamChatPanel';
import { AIAssistantModal } from '../../components/AIAssistantModal';
import { GitHubIntegrationPanel } from '../../components/GitHubIntegrationPanel';
import { ActivityLogPanel } from '../../components/ActivityLogPanel';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import {
  Layers,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Building,
  ArrowRight,
  Plus,
  Users,
  Radio,
  TrendingUp,
  FolderGit2,
} from 'lucide-react';
import { Github } from '../../components/Icons';

export default function DashboardPage() {
  const router = useRouter();
  const { user, currentOrg, organizations, isAuthenticated, isLoading: authLoading } = useAuth();
  const { onlineUserIds } = useCollaboration();
  const { success, error } = useToast();

  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Modals
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isGitHubOpen, setIsGitHubOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isCreateProjOpen, setIsCreateProjOpen] = useState(false);

  // New Project Form State
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [isCreatingProj, setIsCreatingProj] = useState(false);

  const orgId = currentOrg?.id || 'acme-engineering';

  const loadDashboardData = useCallback(async () => {
    if (!orgId) return;
    setIsLoadingData(true);

    try {
      const [projRes, actRes] = await Promise.all([
        api.listProjects(orgId),
        api.listActivity(orgId, 6, 0),
      ]);

      if (projRes.success && Array.isArray(projRes.data)) {
        setProjects(projRes.data);

        // Load tasks from first project
        if (projRes.data.length > 0) {
          const firstProjId = projRes.data[0].id;
          const tasksRes = await api.listTasks(orgId, firstProjId);
          if (tasksRes.success && Array.isArray(tasksRes.data)) {
            setTasks(tasksRes.data);
          }
        }
      }

      if (actRes.success && Array.isArray(actRes.data?.activityLogs)) {
        setActivity(actRes.data.activityLogs);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [authLoading, isAuthenticated, loadDashboardData, router]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    setIsCreatingProj(true);
    try {
      const res = await api.createProject(orgId, {
        name: newProjName.trim(),
        description: newProjDesc.trim() || undefined,
      });

      if (res.success && res.data) {
        success(`Project "${res.data.name}" created successfully!`, 'Project Created');
        setNewProjName('');
        setNewProjDesc('');
        setIsCreateProjOpen(false);
        await loadDashboardData();
      } else {
        error(res.message || 'Failed to create project.', 'Error');
      }
    } catch (err: any) {
      error(err.message || 'An error occurred.', 'Error');
    } finally {
      setIsCreatingProj(false);
    }
  };

  // Metrics calculation
  const totalTasksCount = tasks.length;
  const todoCount = tasks.filter((t) => t.status === 'TODO').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const inReviewCount = tasks.filter((t) => t.status === 'IN_REVIEW').length;
  const doneCount = tasks.filter((t) => t.status === 'DONE').length;
  const assignedToMe = tasks.filter((t) => t.assigneeId === user?.id);

  const completionRate = totalTasksCount > 0 ? Math.round((doneCount / totalTasksCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Navigation */}
      <Navbar
        onOpenChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        onOpenAI={() => setIsAIOpen(true)}
        onOpenGitHub={() => setIsGitHubOpen(true)}
        onOpenAudit={() => setIsAuditOpen(true)}
      />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Welcome Banner */}
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-zinc-900/60 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-md bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20 font-mono">
                  {currentOrg?.name || 'Acme Engineering'}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync Active
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Welcome back, {user?.name?.split(' ')[0] || 'Engineer'}
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-zinc-400 max-w-2xl">
                Real-time sprint metrics, active engineering projects, AI coding assistant, and audited workspace operations.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsCreateProjOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
              >
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </button>

              <button
                onClick={() => setIsAIOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3.5 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Ask AI Copilot</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Active Projects</span>
              <Building className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white">{projects.length}</div>
            <div className="mt-1 text-[11px] text-zinc-500">Across {organizations.length} workspaces</div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Sprint Velocity</span>
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">{completionRate}%</div>
            <div className="mt-1 text-[11px] text-zinc-500">{doneCount} of {totalTasksCount} tasks completed</div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">In Progress Tasks</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">{inProgressCount}</div>
            <div className="mt-1 text-[11px] text-zinc-500">{inReviewCount} pending code review</div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Online Engineers</span>
              <Users className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">{onlineUserIds.length || 1}</div>
            <div className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Socket.IO Connected
            </div>
          </div>
        </div>

        {/* Middle Section: Projects & Task Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects Overview (Spans 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                <h2 className="text-base font-bold text-white">Active Projects</h2>
              </div>
              <Link
                href={`/organizations/${orgId}/projects`}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                View all projects <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {isLoadingData ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-36 rounded-2xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center">
                <FolderGit2 className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400">No projects in this organization yet.</p>
                <button
                  onClick={() => setIsCreateProjOpen(true)}
                  className="mt-3 inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
                >
                  Create First Project
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {projects.map((proj) => (
                  <Link
                    key={proj.id}
                    href={`/organizations/${orgId}/projects/${proj.id}`}
                    className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-indigo-500/50 hover:bg-zinc-900/70 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-semibold text-sm text-white group-hover:text-indigo-300 transition truncate">
                          {proj.name}
                        </span>
                        {proj.githubRepoOwner && (
                          <span className="rounded-full bg-zinc-800 border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300 flex items-center gap-1 shrink-0">
                            <Github className="h-3 w-3" />
                            {proj.githubRepoOwner}/{proj.githubRepoName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                        {proj.description || 'Sprint project for engineering team.'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
                      <span className="font-mono">{proj.slug}</span>
                      <span className="text-indigo-400 group-hover:translate-x-0.5 transition flex items-center gap-1 font-semibold">
                        Kanban Board →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Assigned to You */}
            <div className="pt-4 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Assigned to You ({assignedToMe.length})
              </h3>
              {assignedToMe.length === 0 ? (
                <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/30 p-4 text-xs text-zinc-500 text-center">
                  You have no pending tasks assigned in this workspace.
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedToMe.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`h-2 w-2 rounded-full shrink-0 ${
                            t.status === 'DONE'
                              ? 'bg-emerald-400'
                              : t.status === 'IN_PROGRESS'
                              ? 'bg-amber-400'
                              : 'bg-indigo-400'
                          }`}
                        />
                        <span className="text-xs text-zinc-200 font-medium truncate">{t.title}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 font-mono">
                          {t.status}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            t.priority === 'URGENT'
                              ? 'bg-rose-500/20 text-rose-300'
                              : t.priority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Task Status & Recent Activity */}
          <div className="space-y-6">
            {/* Task Status Breakdown */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-sm space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center justify-between">
                <span>Task Distribution</span>
                <span className="text-xs text-zinc-500 font-normal">{totalTasksCount} Total</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between text-zinc-300 mb-1 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-zinc-400" />
                      TODO
                    </span>
                    <span>{todoCount}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-zinc-400 rounded-full"
                      style={{ width: `${totalTasksCount ? (todoCount / totalTasksCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-300 mb-1 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      In Progress
                    </span>
                    <span>{inProgressCount}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${totalTasksCount ? (inProgressCount / totalTasksCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-300 mb-1 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-purple-400" />
                      In Review
                    </span>
                    <span>{inReviewCount}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full"
                      style={{ width: `${totalTasksCount ? (inReviewCount / totalTasksCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-zinc-300 mb-1 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      Completed
                    </span>
                    <span>{doneCount}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${totalTasksCount ? (doneCount / totalTasksCount) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Organization Activity */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Recent Activity</h3>
                <button
                  onClick={() => setIsAuditOpen(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  Full Log →
                </button>
              </div>

              {activity.length === 0 ? (
                <div className="text-xs text-zinc-500 py-4 text-center">No recent activity.</div>
              ) : (
                <div className="space-y-3">
                  {activity.map((act) => (
                    <div key={act.id} className="text-xs flex items-start gap-2.5">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-zinc-300">
                          <span className="font-semibold text-white">{act.user?.name || 'User'}</span>{' '}
                          <span className="font-mono text-[11px] text-indigo-400 lowercase">{act.action.replace('_', ' ')}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create Project Modal */}
      {isCreateProjOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Create New Project</h3>
            <p className="text-xs text-zinc-400 mb-4">Initialize a new engineering sprint project.</p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Project Name</label>
                <input
                  type="text"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="e.g. Infrastructure Modernization"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Description (Optional)</label>
                <textarea
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Goals, deliverables, and engineering scope..."
                  rows={3}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateProjOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingProj}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  {isCreatingProj ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Team Chat Drawer */}
      <TeamChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />

      {/* AI Assistant Modal */}
      <AIAssistantModal isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />

      {/* GitHub Integration Modal */}
      <GitHubIntegrationPanel isOpen={isGitHubOpen} onClose={() => setIsGitHubOpen(false)} />

      {/* Activity Log Modal */}
      <ActivityLogPanel isOpen={isAuditOpen} onClose={() => setIsAuditOpen(false)} />
    </div>
  );
}
