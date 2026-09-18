'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../../context/AuthContext';
import { useCollaboration } from '../../../../../context/CollaborationContext';
import { Navbar } from '../../../../../components/Navbar';
import { KanbanBoard } from '../../../../../components/KanbanBoard';
import { PresenceList } from '../../../../../components/PresenceList';
import { TeamChatPanel } from '../../../../../components/TeamChatPanel';
import { AIAssistantModal } from '../../../../../components/AIAssistantModal';
import { GitHubIntegrationPanel } from '../../../../../components/GitHubIntegrationPanel';
import { ActivityLogPanel } from '../../../../../components/ActivityLogPanel';
import { api } from '../../../../../lib/api';
import {
  FolderGit2,
  Sparkles,
  RefreshCw,
  ListFilter,
  CheckSquare,
  ArrowLeft,
} from 'lucide-react';
import { Github } from '../../../../../components/Icons';

export default function ProjectKanbanPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    fetchTasks,
    setActiveOrgId,
    setActiveProjectId,
  } = useCollaboration();

  const organizationId = (params?.organizationId as string) || '';
  const projectId = (params?.projectId as string) || '';

  const [project, setProject] = useState<any>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isGitHubOpen, setIsGitHubOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  useEffect(() => {
    if (organizationId && projectId) {
      setActiveOrgId(organizationId);
      setActiveProjectId(projectId);
      fetchTasks();

      // Load project details
      api.getProject(organizationId, projectId).then((res) => {
        if (res.success && res.data) {
          setProject(res.data);
        }
      });
    }
  }, [organizationId, projectId, setActiveOrgId, setActiveProjectId, fetchTasks]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        onOpenChat={() => setIsChatOpen(!isChatOpen)}
        isChatOpen={isChatOpen}
        onOpenAI={() => setIsAIOpen(true)}
        onOpenGitHub={() => setIsGitHubOpen(true)}
        onOpenAudit={() => setIsAuditOpen(true)}
      />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Project Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/organizations/${organizationId}/projects`}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition"
              title="Back to Projects"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20 font-mono">
                  {organizationId} / {project?.slug || projectId}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {project?.name || 'Sprint Kanban Board'}
              </h1>
              {project?.description && (
                <p className="mt-0.5 text-xs text-zinc-400 max-w-xl">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={`/organizations/${organizationId}/projects/${projectId}/tasks`}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition shadow-sm"
            >
              <CheckSquare className="h-4 w-4 text-indigo-400" />
              <span>List View</span>
            </Link>

            <button
              onClick={() => setIsAIOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 transition"
            >
              <Sparkles className="h-4 w-4" />
              <span>AI Coding Assistant</span>
            </button>

            <button
              onClick={() => setIsGitHubOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition shadow-sm"
            >
              <Github className="h-4 w-4" />
              <span>GitHub Repo</span>
            </button>

            <button
              onClick={() => fetchTasks()}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white transition shadow-sm"
              title="Refresh Tasks"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Dashboard Layout: Kanban Board + Presence Sidebar */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Main Kanban Column (Spans 3 cols on large screens) */}
          <div className="lg:col-span-3">
            <KanbanBoard />
          </div>

          {/* Sidebar (Spans 1 col on large screens) */}
          <div className="space-y-6">
            <PresenceList />

            {/* Quick Actions Panel */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 backdrop-blur-xl space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Sprint Shortcuts
              </h4>
              <div className="space-y-2 text-xs">
                <button
                  onClick={() => setIsAIOpen(true)}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-purple-500/40 transition text-zinc-300 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                    <span>Explain / Debug Code</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">Gemini</span>
                </button>

                <button
                  onClick={() => setIsGitHubOpen(true)}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-700 transition text-zinc-300 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <Github className="h-3.5 w-3.5" />
                    <span>Commits & PRs</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">GitHub</span>
                </button>

                <button
                  onClick={() => setIsChatOpen(true)}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-indigo-500/40 transition text-zinc-300 hover:text-white"
                >
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-400" />
                    <span>Open Team Chat</span>
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">Real-Time</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

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
