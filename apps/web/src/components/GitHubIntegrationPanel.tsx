'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useCollaboration } from '../context/CollaborationContext';
import { SOCKET_URL } from '../lib/socket';

interface GitHubRepoDetails {
  owner: string;
  repo: string;
  name: string;
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  openIssues: number;
  defaultBranch: string;
  htmlUrl: string;
}

interface CommitItem {
  sha: string;
  shortSha: string;
  message: string;
  authorName: string;
  authorEmail: string;
  authorAvatar: string | null;
  date: string;
  url: string;
}

interface PullRequestItem {
  id: number;
  number: number;
  title: string;
  state: string;
  draft: boolean;
  user: {
    login: string;
    avatarUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
  url: string;
}

interface IssueItem {
  id: number;
  number: number;
  title: string;
  state: string;
  user: {
    login: string;
    avatarUrl: string | null;
  };
  labels: { name: string; color: string }[];
  commentsCount: number;
  createdAt: string;
  url: string;
}

interface GitHubIntegrationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GitHubIntegrationPanel({ isOpen, onClose }: GitHubIntegrationPanelProps) {
  const { token, activeOrgId, activeProjectId } = useCollaboration();

  const [githubUser, setGithubUser] = useState<{ connected: boolean; username?: string } | null>(null);
  const [repoDetails, setRepoDetails] = useState<GitHubRepoDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'commits' | 'pulls' | 'issues'>('overview');

  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [pulls, setPulls] = useState<PullRequestItem[]>([]);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Link repo form state
  const [repoOwnerInput, setRepoOwnerInput] = useState('');
  const [repoNameInput, setRepoNameInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const fetchConnectionStatus = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${SOCKET_URL}/api/github/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setGithubUser(data.data);
      }
    } catch {
      // Ignore
    }
  }, [token]);

  const fetchRepoData = useCallback(async () => {
    if (!token || !activeOrgId || !activeProjectId) return;
    setIsLoading(true);
    try {
      // 1. Details
      const detailsRes = await fetch(
        `${SOCKET_URL}/api/organizations/${activeOrgId}/projects/${activeProjectId}/github/repository`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const detailsJson = await detailsRes.json();
      if (detailsJson.success && detailsJson.data) {
        setRepoDetails(detailsJson.data);
      } else {
        setRepoDetails(null);
      }

      // 2. Commits
      const commitsRes = await fetch(
        `${SOCKET_URL}/api/organizations/${activeOrgId}/projects/${activeProjectId}/github/commits`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const commitsJson = await commitsRes.json();
      if (commitsJson.success) setCommits(commitsJson.data || []);

      // 3. PRs
      const pullsRes = await fetch(
        `${SOCKET_URL}/api/organizations/${activeOrgId}/projects/${activeProjectId}/github/pulls`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const pullsJson = await pullsRes.json();
      if (pullsJson.success) setPulls(pullsJson.data || []);

      // 4. Issues
      const issuesRes = await fetch(
        `${SOCKET_URL}/api/organizations/${activeOrgId}/projects/${activeProjectId}/github/issues`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const issuesJson = await issuesRes.json();
      if (issuesJson.success) setIssues(issuesJson.data || []);
    } finally {
      setIsLoading(false);
    }
  }, [token, activeOrgId, activeProjectId]);

  useEffect(() => {
    if (isOpen) {
      fetchConnectionStatus();
      fetchRepoData();
    }
  }, [isOpen, fetchConnectionStatus, fetchRepoData]);

  if (!isOpen) return null;

  const handleConnectGitHub = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${SOCKET_URL}/api/github/connect`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.open(data.data.url, '_blank');
      }
    } catch {
      // Ignore
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!token) return;
    if (confirm('Disconnect your GitHub account?')) {
      await fetch(`${SOCKET_URL}/api/github/disconnect`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setGithubUser({ connected: false });
    }
  };

  const handleLinkRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoOwnerInput.trim() || !repoNameInput.trim() || !token) return;

    setIsLinking(true);
    try {
      const res = await fetch(
        `${SOCKET_URL}/api/organizations/${activeOrgId}/projects/${activeProjectId}/github/repository`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            owner: repoOwnerInput.trim(),
            repo: repoNameInput.trim(),
          }),
        }
      );
      const data = await res.json();
      if (data.success) {
        fetchRepoData();
        setRepoOwnerInput('');
        setRepoNameInput('');
      } else {
        alert(data.message || 'Failed to link repository');
      }
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkRepo = async () => {
    if (!token) return;
    if (confirm('Unlink GitHub repository from this project?')) {
      await fetch(
        `${SOCKET_URL}/api/organizations/${activeOrgId}/projects/${activeProjectId}/github/repository`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRepoDetails(null);
      setCommits([]);
      setPulls([]);
      setIssues([]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative flex h-[85vh] w-full max-w-4xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-md">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">GitHub Repository Sync</h2>
              <p className="text-xs text-zinc-400">
                Link repository, view commits, pull requests, and open issues.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User Account Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                githubUser?.connected ? 'bg-emerald-400' : 'bg-zinc-500'
              }`}
            />
            <span className="text-xs font-medium text-zinc-300">
              {githubUser?.connected
                ? `Connected to GitHub as @${githubUser.username}`
                : 'No GitHub account connected'}
            </span>
          </div>

          <div>
            {githubUser?.connected ? (
              <button
                onClick={handleDisconnectGitHub}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnectGitHub}
                className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 shadow transition"
              >
                Connect GitHub Account
              </button>
            )}
          </div>
        </div>

        {/* Repo Link / Info Header */}
        <div className="mt-4">
          {repoDetails ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <a
                    href={repoDetails.htmlUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold text-indigo-400 hover:underline"
                  >
                    {repoDetails.fullName}
                  </a>
                  <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                    {repoDetails.defaultBranch}
                  </span>
                </div>
                {repoDetails.description && (
                  <p className="mt-1 text-xs text-zinc-400">{repoDetails.description}</p>
                )}
                <div className="mt-2 flex items-center gap-4 text-xs text-zinc-400">
                  <span>★ {repoDetails.stars} stars</span>
                  <span>⑂ {repoDetails.forks} forks</span>
                  <span>☉ {repoDetails.openIssues} open issues</span>
                </div>
              </div>

              <button
                onClick={handleUnlinkRepo}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/20 transition"
              >
                Unlink Repository
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleLinkRepo}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <span className="text-xs font-medium text-zinc-300">Link Repository:</span>
              <input
                type="text"
                value={repoOwnerInput}
                onChange={(e) => setRepoOwnerInput(e.target.value)}
                placeholder="Owner (e.g. facebook)"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
              />
              <span className="text-zinc-500">/</span>
              <input
                type="text"
                value={repoNameInput}
                onChange={(e) => setRepoNameInput(e.target.value)}
                placeholder="Repository (e.g. react)"
                className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLinking || !repoOwnerInput.trim() || !repoNameInput.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow hover:bg-indigo-500 disabled:opacity-50"
              >
                {isLinking ? 'Linking...' : 'Link Repo'}
              </button>
            </form>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mt-4 flex border-b border-zinc-800">
          {(['overview', 'commits', 'pulls', 'issues'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-medium capitalize transition border-b-2 ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-400 font-semibold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab} {tab === 'commits' ? `(${commits.length})` : tab === 'pulls' ? `(${pulls.length})` : tab === 'issues' ? `(${issues.length})` : ''}
            </button>
          ))}
        </div>

        {/* Tab Content Feed */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-zinc-500 animate-pulse">
              Fetching GitHub data...
            </div>
          ) : activeTab === 'commits' ? (
            <div className="space-y-2">
              {commits.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">No commits found</div>
              ) : (
                commits.map((c) => (
                  <div
                    key={c.sha}
                    className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 hover:bg-zinc-900/80 transition"
                  >
                    <div>
                      <p className="text-xs font-medium text-zinc-200">{c.message}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        {c.authorName} • {new Date(c.date).toLocaleString()}
                      </p>
                    </div>
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-indigo-400 hover:underline"
                    >
                      {c.shortSha}
                    </a>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'pulls' ? (
            <div className="space-y-2">
              {pulls.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">No pull requests found</div>
              ) : (
                pulls.map((pr) => (
                  <div
                    key={pr.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 hover:bg-zinc-900/80 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          pr.state === 'open'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {pr.state}
                      </span>
                      <div>
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-zinc-200 hover:text-indigo-400 hover:underline"
                        >
                          #{pr.number} {pr.title}
                        </a>
                        <p className="text-[11px] text-zinc-500">
                          opened by @{pr.user.login} on {new Date(pr.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'issues' ? (
            <div className="space-y-2">
              {issues.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">No issues found</div>
              ) : (
                issues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3 hover:bg-zinc-900/80 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <a
                          href={issue.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-zinc-200 hover:text-indigo-400 hover:underline"
                        >
                          #{issue.number} {issue.title}
                        </a>
                        {issue.labels.map((l) => (
                          <span
                            key={l.name}
                            className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-400"
                          >
                            {l.name}
                          </span>
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-500">
                        opened by @{issue.user.login} • {issue.commentsCount} comments
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-xs text-zinc-400">
              <p>GitHub Integration connects your code repository with sprint tasks and discussions.</p>
              <p className="mt-2 text-zinc-500">
                Select Commits, Pull Requests, or Issues above to inspect project source artifacts.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
