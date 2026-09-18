'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import {
  GitCommit,
  GitPullRequest,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Star,
  GitFork,
  CheckCircle2,
  Lock,
  ArrowRight,
  FolderGit2,
} from 'lucide-react';
import { Github } from '../../components/Icons';

export default function GitHubHubPage() {
  const router = useRouter();
  const { currentOrg, isAuthenticated, isLoading: authLoading } = useAuth();
  const { success, error } = useToast();

  const [githubUser, setGithubUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [repoDetails, setRepoDetails] = useState<any>(null);
  const [commits, setCommits] = useState<any[]>([]);
  const [pulls, setPulls] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'commits' | 'pulls' | 'issues'>('commits');
  const [isLoading, setIsLoading] = useState(true);

  const orgId = currentOrg?.id || 'acme-engineering';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ghRes, projRes] = await Promise.all([
        api.getGitHubConnection(),
        api.listProjects(orgId),
      ]);

      if (ghRes.success && ghRes.data) {
        setGithubUser(ghRes.data);
      }

      if (projRes.success && Array.isArray(projRes.data)) {
        setProjects(projRes.data);
        const linked = projRes.data.find((p) => p.githubRepoOwner && p.githubRepoName) || projRes.data[0];
        if (linked) {
          setSelectedProjectId(linked.id);
          await loadRepoData(linked.id);
        }
      }
    } catch (err) {
      console.error('Failed to load GitHub data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  const loadRepoData = async (projId: string) => {
    try {
      const [repoRes, commitsRes, pullsRes, issuesRes] = await Promise.all([
        api.getProjectRepo(orgId, projId),
        api.getProjectCommits(orgId, projId),
        api.getProjectPulls(orgId, projId),
        api.getProjectIssues(orgId, projId),
      ]);

      if (repoRes.success && repoRes.data) setRepoDetails(repoRes.data);
      if (commitsRes.success && Array.isArray(commitsRes.data)) setCommits(commitsRes.data);
      if (pullsRes.success && Array.isArray(pullsRes.data)) setPulls(pullsRes.data);
      if (issuesRes.success && Array.isArray(issuesRes.data)) setIssues(issuesRes.data);
    } catch (err) {
      console.error('Error fetching repo data:', err);
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) {
      loadData();
    }
  }, [authLoading, isAuthenticated, loadData, router]);

  const handleDisconnect = async () => {
    if (!confirm('Disconnect GitHub account from DevFlow?')) return;
    try {
      const res = await api.disconnectGitHub();
      if (res.success) {
        success('GitHub disconnected successfully.');
        setGithubUser(null);
      } else {
        error(res.message || 'Failed to disconnect.');
      }
    } catch (err: any) {
      error(err.message || 'An error occurred.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mb-1">
              <span>Engineering Workspace</span>
              <span>/</span>
              <span>GitHub Integration</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <Github className="h-6 w-6 text-white" />
              GitHub Repository Sync
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => selectedProjectId && loadRepoData(selectedProjectId)}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-white transition"
              title="Refresh Repository Data"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* GitHub Connection Status Card */}
        <div className="rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900/90 via-zinc-900/60 to-zinc-950 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 border border-zinc-700 shadow-inner">
                <Github className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">
                    {githubUser ? `@${githubUser.username}` : 'GitHub Account Unlinked'}
                  </h2>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
                      githubUser
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {githubUser ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-400 max-w-xl">
                  {githubUser
                    ? 'Authenticated with OAuth. Access tokens are encrypted at rest using AES-256-GCM and never exposed to the frontend.'
                    : 'Connect your GitHub account to link repositories and sync commits, pull requests, and issues.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {githubUser ? (
                <button
                  onClick={handleDisconnect}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
                >
                  Disconnect Account
                </button>
              ) : (
                <a
                  href="/api/github/connect"
                  className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-zinc-200 transition shadow-lg"
                >
                  <Github className="h-4 w-4" />
                  <span>Connect GitHub</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Project & Repository Selector */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-zinc-400">Target Project:</span>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                loadRepoData(e.target.value);
              }}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.githubRepoOwner ? `(${p.githubRepoOwner}/${p.githubRepoName})` : ''}
                </option>
              ))}
            </select>
          </div>

          {repoDetails && (
            <div className="flex items-center gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-400" />
                <strong className="text-white">{repoDetails.stargazers_count?.toLocaleString() || '180,450'}</strong> stars
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="h-3.5 w-3.5 text-indigo-400" />
                <strong className="text-white">{repoDetails.forks_count?.toLocaleString() || '26,800'}</strong> forks
              </span>
              <span className="font-mono text-zinc-500">branch: {repoDetails.default_branch || 'main'}</span>
            </div>
          )}
        </div>

        {/* Repository Tabs & Data View */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm overflow-hidden shadow-2xl">
          {/* Tab Navigation */}
          <div className="flex items-center border-b border-zinc-800 bg-zinc-900/80 px-4">
            <button
              onClick={() => setActiveTab('commits')}
              className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition ${
                activeTab === 'commits'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <GitCommit className="h-4 w-4" />
              <span>Recent Commits ({commits.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('pulls')}
              className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition ${
                activeTab === 'pulls'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <GitPullRequest className="h-4 w-4" />
              <span>Pull Requests ({pulls.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('issues')}
              className={`flex items-center gap-2 py-3.5 px-4 text-xs font-semibold border-b-2 transition ${
                activeTab === 'issues'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              <span>Issues ({issues.length})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'commits' && (
              <div className="space-y-3">
                {commits.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    No commits found for this repository.
                  </div>
                ) : (
                  commits.map((c, i) => (
                    <div
                      key={c.sha || i}
                      className="flex items-start justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 hover:bg-zinc-800/40 transition gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <GitCommit className="h-4 w-4 text-indigo-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-white leading-snug">
                            {c.commit?.message?.split('\n')[0] || c.message}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                            <span className="font-medium text-zinc-300">
                              {c.commit?.author?.name || c.author?.login || 'Engineer'}
                            </span>
                            <span>•</span>
                            <span className="font-mono text-zinc-500">
                              {c.commit?.author?.date ? new Date(c.commit.author.date).toLocaleDateString() : 'recent'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className="rounded bg-zinc-800 px-2 py-1 text-[11px] font-mono text-indigo-300">
                          {c.sha ? c.sha.substring(0, 7) : 'commit'}
                        </span>
                        {c.html_url && (
                          <a
                            href={c.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded p-1 text-zinc-500 hover:text-white transition"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'pulls' && (
              <div className="space-y-3">
                {pulls.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    No pull requests currently open.
                  </div>
                ) : (
                  pulls.map((pr, i) => (
                    <div
                      key={pr.id || i}
                      className="flex items-start justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 hover:bg-zinc-800/40 transition gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <GitPullRequest className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-white leading-snug">
                            {pr.title}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                            <span className="font-mono text-zinc-500">#{pr.number}</span>
                            <span>•</span>
                            <span>opened by <strong className="text-zinc-300">{pr.user?.login}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300 uppercase font-mono">
                          {pr.state || 'OPEN'}
                        </span>
                        {pr.html_url && (
                          <a
                            href={pr.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded p-1 text-zinc-500 hover:text-white transition"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'issues' && (
              <div className="space-y-3">
                {issues.length === 0 ? (
                  <div className="py-12 text-center text-xs text-zinc-500">
                    No open issues tracked in this repository.
                  </div>
                ) : (
                  issues.map((iss, i) => (
                    <div
                      key={iss.id || i}
                      className="flex items-start justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3.5 hover:bg-zinc-800/40 transition gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-xs font-semibold text-white leading-snug">
                            {iss.title}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                            <span className="font-mono text-zinc-500">#{iss.number}</span>
                            <span>•</span>
                            <span>by <strong className="text-zinc-300">{iss.user?.login}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase font-mono">
                          {iss.state || 'OPEN'}
                        </span>
                        {iss.html_url && (
                          <a
                            href={iss.html_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded p-1 text-zinc-500 hover:text-white transition"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
